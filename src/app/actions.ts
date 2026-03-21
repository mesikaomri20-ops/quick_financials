"use server";

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

    // ── Fully sequential with 2000 ms between calls to avoid 429 bursts ─────
    // Each call waits for the previous one before firing.
    const incomeArr  = await fmpSafe("/income-statement",        stmtP, is429); await sleep(2000);
    const balanceArr = await fmpSafe("/balance-sheet-statement", stmtP, is429); await sleep(2000);
    const cashArr    = await fmpSafe("/cash-flow-statement",     stmtP, is429); await sleep(2000);
    
    // Try to get company name from /quote to save hitting /profile
    const fmpQuoteArr = await fmpSafe("/quote", { symbol: ticker }, is429); await sleep(2000);
    const fmpQuote = fmpQuoteArr[0] ?? {};
    
    let profile: Record<string, any> = {};
    if (!fmpQuote.name && !is429.value) {
      profile = (await fmpSafe("/profile", { symbol: ticker }, is429))[0] ?? {};
    }

    // Removed the abort on 429 so the UI still shows whatever data succeeded (if any).

    // ── Map statements to FinancialYearData ────────────────────────────────
    const yearMap = new Map<string, FinancialYearData>();
    const ensure  = (label: string): FinancialYearData => {
      if (!yearMap.has(label)) yearMap.set(label, {
        year: label,
        revenue: 0, grossProfit: 0, operatingIncome: 0, netIncome: 0, researchAndDevelopment: 0,
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
      e.researchAndDevelopment = n(row.researchAndDevelopmentExpenses);
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

    let quote: StockQuote | null = null;
    if (n(fmpQuote.price) > 0 || n(profile.price) > 0) {
      quote = { 
        symbol: fmpQuote.symbol ?? profile.symbol ?? ticker, 
        price: n(fmpQuote.price) || n(profile.price), 
        changesPercentage: n(fmpQuote.changesPercentage) || n(profile.changePercentage),
        companyName: fmpQuote.name || profile.companyName,
        image: profile.image // only available if we hit profile
      };
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
    const mktCap = n(fmpQuote.marketCap) || n(profile.marketCap);

    // Margins — derived
    // ... no changes to derived definitions
    const grossMarginDerived     = (n(i0.revenue) > 0) ? (n(i0.grossProfit) / n(i0.revenue)) * 100 : null;
    const operatingMarginDerived = (n(i0.revenue) > 0) ? (n(i0.operatingIncome) / n(i0.revenue)) * 100 : null;
    const profitMarginDerived    = (n(i0.revenue) > 0) ? (n(i0.netIncome) / n(i0.revenue)) * 100 : null;
    const fcfMarginDerived       = (n(i0.revenue) > 0) ? (n(c0.freeCashFlow) / n(i0.revenue)) * 100 : null;

    // Derived ROE
    const tEq       = n(b0.totalStockholdersEquity) || n(b0.totalEquity);
    const roeDerived = (tEq > 0) ? (n(i0.netIncome) / tEq) * 100 : null;

    // Derived PE: price / epsDiluted (from income statement)
    const price = n(fmpQuote.price) || n(profile.price);
    const epsDiluted    = n(i0.epsDiluted) || n(i0.eps);
    const trailingPEDerived = n(i0.epsdiluted) > 0 ? price / n(i0.epsdiluted) : null;

    // Derived P/FCF: marketCap / annual FCF (from balance + cash)
    const annualFCF     = n(c0.freeCashFlow);
    const pfcfDerived   = (mktCap > 0 && annualFCF > 0) ? mktCap / annualFCF : null;

    // Dividend yield: profile.lastDividend / price
    const lastDiv       = n(profile.lastDividend);
    const divYieldDerived = price > 0 ? (lastDiv / price) * 100 : null;

    // Forward PE
    const epsGrowth = incomeArr.length >= 2
      ? ((n(incomeArr[0].epsdiluted) - n(incomeArr[1].epsdiluted)) / Math.abs(n(incomeArr[1].epsdiluted)))
      : 0;
    const forwardPEDerived = null;

    // PEG = trailingPE / epsGrowthPct (growth as percentage, e.g. 15 for 15%)
    const pegDerived = (trailingPEDerived && epsGrowth > 0)
      ? trailingPEDerived / (epsGrowth * 100)
      : null;

    // Use only derived metrics to save API calls
    const fundamentals: YahooFundamentals = {
      trailingPE:      trailingPEDerived,
      forwardPE:       forwardPEDerived,
      priceToCashFlow: pfcfDerived,
      pegRatio:        pegDerived,

      grossMargin:     grossMarginDerived,
      operatingMargin: operatingMarginDerived,
      profitMargin:    profitMarginDerived,
      fcfMargin:       fcfMarginDerived,

      roe:           roeDerived,
      dividendYield: divYieldDerived,
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

