"use server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Config ────────────────────────────────────────────────────────────────
const FMP_KEY  = "ME2f8HjzG4nnr47PKp0GAll7TkYrazJ7";
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
};

export type FinancialYearData = {
  year: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
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
  const res = await fetch(url, { cache: "no-store" });
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

// ─── Main Export ───────────────────────────────────────────────────────────

export async function getStockData(
  symbol: string,
  period: Period = "annual"
): Promise<StockData | null> {
  const ticker   = symbol.toUpperCase().trim();
  const cacheKey = `${ticker}:${period}`;

  // ── Cache hit ───────────────────────────────────────────────────────────
  const hit = _cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    console.log(`[CACHE] Hit for ${cacheKey}`);
    return hit.data;
  }

  console.log(`[getStockData] Fetching ${ticker} (${period})…`);

  try {
    const limit  = "5"; // FMP free tier: max 5 records per endpoint
    const minLen = period === "quarter" ? 7 : 4;
    const stmtP  = { symbol: ticker, period, limit };
    const is429  = { value: false }; // shared 429 sentinel

    // ── Fully sequential with 500 ms between calls to avoid 429 bursts ─────
    // Each call waits for the previous one before firing.
    const incomeArr  = await fmpSafe("/income-statement",        stmtP, is429); await sleep(500);
    const balanceArr = await fmpSafe("/balance-sheet-statement", stmtP, is429); await sleep(500);
    const cashArr    = await fmpSafe("/cash-flow-statement",     stmtP, is429); await sleep(500);
    const profile    = (await fmpSafe("/profile", { symbol: ticker }, is429))[0] ?? {};   await sleep(500);
    const ratios     = (await fmpSafe("/ratios-ttm",      { symbol: ticker }, is429))[0] ?? {}; await sleep(300);
    const keyMetrics = (await fmpSafe("/key-metrics-ttm", { symbol: ticker }, is429))[0] ?? {};

    // If ALL core calls returned nothing and we got 429s — tell the UI
    if (is429.value && incomeArr.length === 0 && balanceArr.length === 0) {
      console.error(`[FMP] Rate-limited for ${ticker} — returning rateLimited sentinel`);
      return { quote: null, fundamentals: null, rateLimited: true };
    }

    // ── Map statements to FinancialYearData ────────────────────────────────
    const yearMap = new Map<string, FinancialYearData>();
    const ensure  = (label: string): FinancialYearData => {
      if (!yearMap.has(label)) yearMap.set(label, {
        year: label,
        revenue: 0, grossProfit: 0, operatingIncome: 0, netIncome: 0,
        totalAssets: 0, totalLiabilities: 0, totalEquity: 0,
        cash: 0, debt: 0, freeCashFlow: 0, operatingCashFlow: 0, retainedEarnings: 0,
      });
      return yearMap.get(label)!;
    };

    for (const row of incomeArr) {
      const lbl = rowLabel(row, period);
      if (lbl.length < minLen) continue;
      const e = ensure(lbl);
      e.revenue         = n(row.revenue);
      e.grossProfit     = n(row.grossProfit) || (n(row.revenue) - n(row.costOfRevenue));
      e.operatingIncome = n(row.operatingIncome) || n(row.ebit);
      e.netIncome       = n(row.netIncome);
    }
    for (const row of balanceArr) {
      const lbl = rowLabel(row, period);
      if (lbl.length < minLen) continue;
      const e = ensure(lbl);
      e.totalAssets      = n(row.totalAssets);
      e.totalLiabilities = n(row.totalLiabilities);
      e.totalEquity      = n(row.totalStockholdersEquity) || n(row.totalEquity);
      e.cash             = n(row.cashAndCashEquivalents)  || n(row.cashAndShortTermInvestments);
      e.debt             = n(row.totalDebt) || (n(row.shortTermDebt) + n(row.longTermDebt));
      e.retainedEarnings = n(row.retainedEarnings);
    }
    for (const row of cashArr) {
      const lbl = rowLabel(row, period);
      if (lbl.length < minLen) continue;
      const e = ensure(lbl);
      e.operatingCashFlow = n(row.operatingCashFlow) || n(row.netCashProvidedByOperatingActivities);
      e.freeCashFlow      = n(row.freeCashFlow) || (n(row.operatingCashFlow) + n(row.capitalExpenditure));
    }

    const financials = Array.from(yearMap.values()).sort((a, b) => {
      if (period === "quarter") {
        const pq = (s: string) => { const m = s.match(/^Q(\d)\s+(\d{4})$/); return m ? +m[2] * 10 + +m[1] : 0; };
        return pq(a.year) - pq(b.year);
      }
      return parseInt(a.year) - parseInt(b.year);
    });

    console.log(`[FMP] ${ticker} (${period}) — ${financials.length} rows:`, financials.map(f => f.year).join(", "));

    // ── Quote ──────────────────────────────────────────────────────────────
    let quote: StockQuote | null = null;
    if (n(profile.price) > 0) {
      quote = { symbol: profile.symbol ?? ticker, price: n(profile.price), changesPercentage: n(profile.changePercentage) };
    } else {
      const yp = await yahooChartPrice(ticker);
      if (yp) {
        quote = { symbol: ticker, price: yp.price, changesPercentage: Math.abs(yp.changePercent) < 5 ? yp.changePercent * 100 : yp.changePercent };
      }
    }

    // ── Fundamentals: derive from statements first, enrich from Tier 2 ─────
    //
    // All margin/profitability fields are computed directly from incomeArr[0],
    // balanceArr[0], cashArr[0] — no extra API call needed:
    //   grossMargin     = grossProfit / revenue
    //   operatingMargin = operatingIncome / revenue
    //   profitMargin    = netIncome / revenue
    //   fcfMargin       = freeCashFlow / revenue
    //   ROE             = netIncome / totalEquity
    //   trailingPE      = price / epsDiluted  (epsDiluted is in income statement)
    //   P/FCF           = marketCap / annualFCF
    //   dividendYield   = lastDividend / price  (profile.lastDividend)
    //   PEG             = trailingPE / (epsGrowthRate * 100)
    //   forwardPE       = price / (epsTTM * (1 + revenueGrowth))
    //
    // Ratios-ttm and key-metrics-ttm are used as *overrides* when available.

    const i0   = incomeArr[0]  ?? {};   // Most recent income row
    const b0   = balanceArr[0] ?? {};   // Most recent balance row
    const c0   = cashArr[0]    ?? {};   // Most recent cashflow row
    const price = n(profile.price);
    const mktCap = n(profile.marketCap);

    // Margins — derived
    const grossMarginDerived     = pct(n(i0.grossProfit),    n(i0.revenue));
    const operatingMarginDerived = pct(n(i0.operatingIncome) || n(i0.ebit), n(i0.revenue));
    const profitMarginDerived    = pct(n(i0.netIncome),      n(i0.revenue));
    const fcfMarginDerived       = pct(n(c0.freeCashFlow),   n(i0.revenue));
    const roeDerived             = pct(n(i0.netIncome), n(b0.totalStockholdersEquity) || n(b0.totalEquity));

    // Derived PE: price / epsDiluted (from income statement)
    const epsDiluted    = n(i0.epsDiluted) || n(i0.eps);
    const trailingPEDerived = (price > 0 && epsDiluted > 0) ? price / epsDiluted : null;

    // Derived P/FCF: marketCap / annual FCF (from balance + cash)
    const annualFCF     = n(c0.freeCashFlow);
    const pfcfDerived   = (mktCap > 0 && annualFCF > 0) ? mktCap / annualFCF : null;

    // Dividend yield: profile.lastDividend / price
    const lastDiv       = n(profile.lastDividend);
    const divYieldDerived = (price > 0 && lastDiv > 0) ? lastDiv / price : null;

    // Forward PE
    const eps0 = epsDiluted;
    const eps1 = n(incomeArr[1]?.epsDiluted) || n(incomeArr[1]?.eps);
    const epsGrowth = (eps0 > 0 && eps1 > 0 && eps0 > eps1) ? (eps0 - eps1) / eps1 : 0;
    const forwardPEDerived = (price > 0 && eps0 > 0)
      ? price / (eps0 * (1 + epsGrowth))
      : null;

    // PEG = trailingPE / epsGrowthPct (growth as percentage, e.g. 15 for 15%)
    const pegDerived = (trailingPEDerived && epsGrowth > 0)
      ? trailingPEDerived / (epsGrowth * 100)
      : null;

    // Prefer TTM values from ratios/key-metrics if they came through (may be null/empty)
    const fundamentals: YahooFundamentals = {
      trailingPE:      nOrNull(ratios.priceToEarningsRatioTTM)             ?? trailingPEDerived,
      forwardPE:       forwardPEDerived,
      priceToCashFlow: nOrNull(ratios.priceToFreeCashFlowRatioTTM)         ?? pfcfDerived,
      pegRatio:        nOrNull(ratios.priceToEarningsGrowthRatioTTM)       ?? pegDerived,

      grossMargin:     nOrNull(ratios.grossProfitMarginTTM)                ?? grossMarginDerived,
      operatingMargin: nOrNull(ratios.operatingProfitMarginTTM)            ?? operatingMarginDerived,
      profitMargin:    nOrNull(ratios.netProfitMarginTTM)                  ?? profitMarginDerived,
      fcfMargin:       fcfMarginDerived,

      roe:           nOrNull(keyMetrics.returnOnEquityTTM)                ?? roeDerived,
      dividendYield: nOrNull(ratios.dividendYieldTTM)                     ?? divYieldDerived,
      beta:          nOrNull(profile.beta),
      marketCap:     nOrNull(mktCap),
      totalDebt:     financials.length > 0 ? nOrNull(financials[financials.length - 1].debt) : null,
      totalCash:     financials.length > 0 ? nOrNull(financials[financials.length - 1].cash) : null,

      financials,
    };

    if (!quote && financials.length === 0) {
      console.error(`[getStockData] No data at all for ${ticker}`);
      return null;
    }

    const result: StockData = { quote, fundamentals, quoteRateLimited: false };

    // Cache result
    _cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;

  } catch (error: any) {
    console.error(`[getStockData] Unhandled for ${ticker}:`, error.message);
    return null;
  }
}

export async function getFinancialData(
  symbol: string,
  period: Period = "annual"
): Promise<YahooFundamentals | null> {
  const data = await getStockData(symbol, period);
  return data?.fundamentals ?? null;
}

// ─── Gemini AI Analysis ──────────────────────────────────────────────────

const GEMINI_API_KEY = "AIzaSyDANuA5lLyvPspRPTEso5IzWPiH2OphWZI";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function analyzeStock(data: StockData): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Format a concise JSON payload to save tokens
    const payload = {
      symbol: data.quote?.symbol,
      price: data.quote?.price,
      fundamentals: {
        trailingPE: data.fundamentals?.trailingPE,
        forwardPE: data.fundamentals?.forwardPE,
        roe: data.fundamentals?.roe,
        grossMargin: data.fundamentals?.grossMargin,
        profitMargin: data.fundamentals?.profitMargin,
        totalDebt: data.fundamentals?.totalDebt,
        totalCash: data.fundamentals?.totalCash,
      },
      // Keep only key metrics for trend analysis
      financialHistory: data.fundamentals?.financials.map(f => ({
        year: f.year,
        revenue: f.revenue,
        netIncome: f.netIncome,
        freeCashFlow: f.freeCashFlow,
        debt: f.debt,
        grossProfit: f.grossProfit
      }))
    };

    const prompt = `Act as a senior investment analyst at a top tier hedge fund. 
I am providing you with the 5-year financial data for ${payload.symbol || "the company"}.
Analyze the 5-year trends of Revenue, Margins, Debt, and ROE.

Here is the data:
${JSON.stringify(payload, null, 2)}

Provide a concise, professional analysis in **Hebrew**. Use bullet points. Focus purely on assessing the financial health, growth trajectory, risks (e.g., debt levels), and overall quality of the business based strictly on the provided numbers. Do not give financial advice, just the hard analysis.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error("[analyzeStock] Failed:", error.message);
    return "שגיאה ביצירת הניתוח. אנא נסה שוב מאוחר יותר.";
  }
}

