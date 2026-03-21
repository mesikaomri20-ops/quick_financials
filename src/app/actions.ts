"use server";

// ─── Config ────────────────────────────────────────────────────────────────
const FMP_KEY  = "LU2KvGFffEm1ChIVE6iFBZTGLzxUp6Jm";
const FMP_BASE = "https://financialmodelingprep.com/stable";

// ─── Module-level result cache (lives in warm serverless instance) ─────────
// Key: `${ticker}:${period}` — TTL: 5 minutes
const _cache = new Map<string, { data: StockData; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// ─── Types ─────────────────────────────────────────────────────────────────

export type Period = "annual" | "quarter";

export type StockQuote = {
  symbol: string;
  price: number;
  changesPercentage: number;
  companyName?: string;
  image?: string;
};

export type FinancialYearData = {
  year: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  researchAndDevelopment: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cash: number;
  debt: number;
  freeCashFlow: number;
  operatingCashFlow: number;
  retainedEarnings: number;
};

export type YahooFundamentals = {
  trailingPE: number | null;
  forwardPE: number | null;
  priceToCashFlow: number | null;
  pegRatio: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  profitMargin: number | null;
  fcfMargin: number | null;
  roe: number | null;
  dividendYield: number | null;
  beta: number | null;
  marketCap: number | null;
  totalDebt: number | null;
  totalCash: number | null;
  financials: FinancialYearData[];
};

export type StockData = {
  quote: StockQuote | null;
  fundamentals: YahooFundamentals | null;
  quoteRateLimited?: boolean;
  rateLimited?: boolean;   // true when FMP returned 429
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const n       = (val: any): number => { if (val === null || val === undefined || val === "" || val === "N/A") return 0; const num = Number(val); return isNaN(num) ? 0 : num; };
const nOrNull = (val: any): number | null => { const v = n(val); return v === 0 ? null : v; };
const pct     = (num: number, den: number): number | null => den > 0 ? num / den : null;
const sleep   = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ─── FMP Fetch ─────────────────────────────────────────────────────────────

/**
 * Single FMP request. Throws on any non-2xx, including 429.
 * The caller should catch 429s and degrade gracefully.
 */
async function fmpGet(path: string, params: Record<string, string>): Promise<any[]> {
  const qs  = new URLSearchParams({ ...params, apikey: FMP_KEY });
  const url = `${FMP_BASE}${path}?${qs}`;
  console.log(`[FMP] ${path}?${new URLSearchParams({ ...params, apikey: "***" })}`);
  const res = await fetch(url, { 
    next: { revalidate: 600 } 
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${path} — ${body.slice(0, 150)}`);
  }
  const json = await res.json();
  if (!Array.isArray(json)) {
    const msg  = (json as any)?.["Error Message"] ?? JSON.stringify(json).slice(0, 150);
    throw new Error(`Non-array — ${path}: ${msg}`);
  }
  return json;
}

/** Try fmpGet; return [] on failure. Sets is429 flag if HTTP 429. */
async function fmpSafe(
  path: string,
  params: Record<string, string>,
  is429: { value: boolean }
): Promise<any[]> {
  try { return await fmpGet(path, params); }
  catch (e: any) {
    if (e.message?.includes("429")) is429.value = true;
    console.warn(`[FMP] ${path} failed:`, e.message);
    return [];
  }
}

/** Yahoo /chart for price — no auth, not blocked. */
async function yahooChartPrice(ticker: string): Promise<{ price: number; changePercent: number } | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: any = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return { price: meta.regularMarketPrice ?? 0, changePercent: meta.regularMarketChangePercent ?? 0 };
  } catch (e: any) {
    console.warn(`[YAHOO] Chart price failed: ${e.message}`);
    return null;
  }
}

// ─── Row-label Helper ──────────────────────────────────────────────────────

function rowLabel(row: any, period: Period): string {
  const year = row.fiscalYear
    ? String(row.fiscalYear)
    : (row.calendarYear ? String(row.calendarYear) : (row.date ?? "").substring(0, 4));
  if (period === "quarter") {
    const q = String(row.period ?? "");
    return q.startsWith("Q") && year.length === 4 ? `${q} ${year}` : year;
  }
  return year;
}

// ─── Main Export (Server-side fetching disabled) ───────────────────────────

/**
 * Server-side fetching is disabled to bypass Vercel IP throttling.
 * Fetching now happens on the Client-Side (src/app/page.tsx).
 */
export async function getStockData(
  symbol: string,
  period: Period = "annual"
): Promise<StockData | null> {
  console.warn(`[getStockData] Server-side fetch called for ${symbol}. This is deprecated.`);
  return null;
}

export async function getFinancialData(
  symbol: string,
  period: Period = "annual"
): Promise<YahooFundamentals | null> {
  return null;
}

