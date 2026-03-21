"use server";

// ─── FMP Configuration ────────────────────────────────────────────────────────
// All endpoints use the modern /stable/ base (replaces the legacy /api/v3/).
// Symbol is passed as a query param: ?symbol=NVDA
const FMP_KEY  = "ME2f8HjzG4nnr47PKp0GAll7TkYrazJ7";
const FMP_BASE = "https://financialmodelingprep.com/stable";

// ─── Types ───────────────────────────────────────────────────────────────────

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
  // Valuation
  trailingPE: number | null;
  forwardPE: number | null;
  priceToCashFlow: number | null;
  pegRatio: number | null;
  // Margins
  grossMargin: number | null;
  operatingMargin: number | null;
  profitMargin: number | null;
  fcfMargin: number | null;
  // Profitability & Health
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
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Coerce any value to a safe number (0 for null/undefined/NaN). */
const n = (val: any): number => {
  if (val === null || val === undefined || val === "" || val === "N/A") return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

/** Return null if value is 0 or falsy, otherwise the number. */
const nOrNull = (val: any): number | null => {
  const num = n(val);
  return num === 0 ? null : num;
};

// ─── FMP Fetch ───────────────────────────────────────────────────────────────

/**
 * Fetch from the FMP /stable/ API.
 * Endpoints verified against live API 2025-03-21:
 *   /stable/income-statement?symbol={ticker}&limit=5
 *   /stable/balance-sheet-statement?symbol={ticker}&limit=5
 *   /stable/cash-flow-statement?symbol={ticker}&limit=5
 *   /stable/profile?symbol={ticker}
 *   /stable/ratios-ttm?symbol={ticker}
 */
async function fmpGet(path: string, params: Record<string, string> = {}): Promise<any[]> {
  const query = new URLSearchParams({ symbol: "", ...params, apikey: FMP_KEY });
  // path already starts with /
  const url = `${FMP_BASE}${path}?${query.toString()}`;
  console.log(`[FMP] GET ${url.replace(FMP_KEY, "***")}`);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[FMP] HTTP ${res.status} ${res.statusText} — ${path} — ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  if (!Array.isArray(json)) {
    const msg = (json as any)?.["Error Message"] ?? (json as any)?.message ?? JSON.stringify(json).slice(0, 200);
    throw new Error(`[FMP] Non-array response for ${path}: ${msg}`);
  }
  return json;
}

/**
 * Yahoo Finance /chart API — price snapshot only.
 * Does not require auth and is not blocked at this endpoint.
 */
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
    return {
      price: meta.regularMarketPrice ?? 0,
      changePercent: meta.regularMarketChangePercent ?? 0,
    };
  } catch (e: any) {
    console.warn(`[YAHOO_CHART] Failed for ${ticker}: ${e.message}`);
    return null;
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function getStockData(symbol: string): Promise<StockData | null> {
  const ticker = symbol.toUpperCase().trim();
  console.log(`[getStockData] Fetching ${ticker} via FMP stable API...`);

  try {
    // ── 1. Parallel fetch of all FMP endpoints ────────────────────────────────
    // Verified field names from live /stable/ responses (2025-03-21):
    //   income:      fiscalYear, revenue, grossProfit, operatingIncome, netIncome
    //   balance:     fiscalYear, totalAssets, totalLiabilities, totalStockholdersEquity,
    //                cashAndCashEquivalents, totalDebt, retainedEarnings
    //   cash:        fiscalYear, operatingCashFlow, freeCashFlow, capitalExpenditure
    //   profile:     price, changePercentage, marketCap, beta
    //   ratios-ttm:  priceToEarningsRatioTTM, priceToFreeCashFlowRatioTTM,
    //                priceToEarningsGrowthRatioTTM, grossProfitMarginTTM,
    //                operatingProfitMarginTTM, netProfitMarginTTM, dividendYieldTTM,
    //                earningsYieldTTM
    //   key-metrics: returnOnEquityTTM  ← ROE lives here, not in ratios-ttm
    const params = (limit = 5) => ({ symbol: ticker, limit: String(limit) });

    const [incomeRaw, balanceRaw, cashRaw, profileRaw, ratiosRaw, keyMetricsRaw] =
      await Promise.allSettled([
        fmpGet("/income-statement",        params()),
        fmpGet("/balance-sheet-statement", params()),
        fmpGet("/cash-flow-statement",     params()),
        fmpGet("/profile",                 { symbol: ticker }),
        fmpGet("/ratios-ttm",              { symbol: ticker }),
        fmpGet("/key-metrics-ttm",         { symbol: ticker }),
      ]);

    const incomeArr:   any[] = incomeRaw.status     === "fulfilled" ? incomeRaw.value          : [];
    const balanceArr:  any[] = balanceRaw.status    === "fulfilled" ? balanceRaw.value         : [];
    const cashArr:     any[] = cashRaw.status       === "fulfilled" ? cashRaw.value            : [];
    const profile:     any   = profileRaw.status    === "fulfilled" ? (profileRaw.value[0]    ?? {}) : {};
    const ratios:      any   = ratiosRaw.status     === "fulfilled" ? (ratiosRaw.value[0]     ?? {}) : {};
    const keyMetrics:  any   = keyMetricsRaw.status === "fulfilled" ? (keyMetricsRaw.value[0] ?? {}) : {};

    // Log failures and first-row samples for debugging
    if (incomeRaw.status     === "rejected") console.error("[FMP] income-statement failed:",  (incomeRaw     as any).reason?.message);
    if (balanceRaw.status    === "rejected") console.error("[FMP] balance-sheet failed:",      (balanceRaw    as any).reason?.message);
    if (cashRaw.status       === "rejected") console.error("[FMP] cash-flow failed:",          (cashRaw       as any).reason?.message);
    if (profileRaw.status    === "rejected") console.error("[FMP] profile failed:",            (profileRaw    as any).reason?.message);
    if (ratiosRaw.status     === "rejected") console.error("[FMP] ratios-ttm failed:",         (ratiosRaw     as any).reason?.message);
    if (keyMetricsRaw.status === "rejected") console.error("[FMP] key-metrics-ttm failed:",    (keyMetricsRaw as any).reason?.message);

    if (incomeArr.length  > 0) console.log("[FMP] Income sample:",  JSON.stringify(incomeArr[0]));
    if (balanceArr.length > 0) console.log("[FMP] Balance sample:", JSON.stringify(balanceArr[0]));
    if (cashArr.length    > 0) console.log("[FMP] Cash sample:",    JSON.stringify(cashArr[0]));

    // ── 2. Map to FinancialYearData — keyed by fiscalYear ────────────────────
    // /stable/ always provides fiscalYear as a plain string ("2024").
    // Falling back to first 4 chars of `date` only if fiscalYear is absent.
    const yearMap = new Map<string, FinancialYearData>();

    const ensureYear = (year: string): FinancialYearData => {
      if (!yearMap.has(year)) {
        yearMap.set(year, {
          year,
          revenue: 0, grossProfit: 0, operatingIncome: 0, netIncome: 0,
          totalAssets: 0, totalLiabilities: 0, totalEquity: 0,
          cash: 0, debt: 0, freeCashFlow: 0, operatingCashFlow: 0, retainedEarnings: 0,
        });
      }
      return yearMap.get(year)!;
    };

    const getYear = (row: any): string =>
      row.fiscalYear ? String(row.fiscalYear) : (row.date ?? "").substring(0, 4);

    for (const row of incomeArr) {
      const year = getYear(row);
      if (year.length < 4) continue;
      const e = ensureYear(year);
      e.revenue         = n(row.revenue);
      e.grossProfit     = n(row.grossProfit) || (n(row.revenue) - n(row.costOfRevenue));
      e.operatingIncome = n(row.operatingIncome) || n(row.ebit);
      e.netIncome       = n(row.netIncome);
    }

    for (const row of balanceArr) {
      const year = getYear(row);
      if (year.length < 4) continue;
      const e = ensureYear(year);
      e.totalAssets      = n(row.totalAssets);
      e.totalLiabilities = n(row.totalLiabilities);
      e.totalEquity      = n(row.totalStockholdersEquity) || n(row.totalEquity);
      e.cash             = n(row.cashAndCashEquivalents)  || n(row.cashAndShortTermInvestments);
      e.debt             = n(row.totalDebt) || (n(row.shortTermDebt) + n(row.longTermDebt));
      e.retainedEarnings = n(row.retainedEarnings);
    }

    for (const row of cashArr) {
      const year = getYear(row);
      if (year.length < 4) continue;
      const e = ensureYear(year);
      e.operatingCashFlow = n(row.operatingCashFlow) || n(row.netCashProvidedByOperatingActivities);
      // FMP freeCashFlow = operatingCashFlow + capitalExpenditure (capex is already negative)
      e.freeCashFlow      = n(row.freeCashFlow) || (n(row.operatingCashFlow) + n(row.capitalExpenditure));
    }

    const financials = Array.from(yearMap.values())
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));

    console.log(`[FMP] ${ticker} — ${financials.length} years mapped:`, financials.map(f => f.year).join(", "));
    if (financials.length === 0) {
      console.error(`[FMP] MAPPING FAILED: zero years for ${ticker}. incomeArr.length=${incomeArr.length}`);
    }

    // ── 3. Quote — FMP profile (has live price), Yahoo chart as fallback ─────
    let quote: StockQuote | null = null;

    if (n(profile.price) > 0) {
      quote = {
        symbol: profile.symbol ?? ticker,
        price: n(profile.price),
        // /stable/profile changePercentage is already a percent (e.g. -0.39 means -0.39%)
        changesPercentage: n(profile.changePercentage),
      };
      console.log(`[FMP] Quote from profile: $${quote.price} (${quote.changesPercentage}%)`);
    } else {
      const yp = await yahooChartPrice(ticker);
      if (yp) {
        quote = {
          symbol: ticker,
          price: yp.price,
          // Yahoo /chart returns fraction (0.025 = 2.5%) — convert if needed
          changesPercentage: Math.abs(yp.changePercent) < 5
            ? yp.changePercent * 100
            : yp.changePercent,
        };
        console.log(`[YAHOO_CHART] Price fallback: $${quote.price}`);
      }
    }

    // ── 4. Fundamentals from FMP ratios-ttm + key-metrics-ttm + profile ────────
    // ROE:        key-metrics-ttm → returnOnEquityTTM  (ratios-ttm does NOT have it)
    // Forward PE: derived — price ÷ (TTM EPS × (1 + YoY revenue growth))
    //             TTM EPS  = price × earningsYieldTTM  (from ratios-ttm)
    //             growthRate = (revenue_yr0 - revenue_yr1) / revenue_yr1  (from income)
    const lastCash = cashArr[0];

    const fcfMarginCalc = (): number | null => {
      const fcf = n(lastCash?.freeCashFlow);
      const rev = n(incomeArr[0]?.revenue);
      if (fcf !== 0 && rev > 0) return fcf / rev;
      return null;
    };

    const computeForwardPE = (): number | null => {
      const price        = n(profile.price);
      const earningsYield = n(ratios.earningsYieldTTM); // EPS_TTM / price
      if (price <= 0 || earningsYield <= 0) return null;
      const epsTTM = price * earningsYield;
      // Estimate next-year EPS using YoY revenue growth as a proxy for earnings growth
      const rev0 = n(incomeArr[0]?.revenue);
      const rev1 = n(incomeArr[1]?.revenue);
      const growthRate = (rev1 > 0 && rev0 > rev1) ? (rev0 - rev1) / rev1 : 0;
      const epsForward = epsTTM * (1 + growthRate);
      if (epsForward <= 0) return null;
      const fwdPE = price / epsForward;
      console.log(`[FMP] Forward PE for ${ticker}: price=${price} epsTTM=${epsTTM.toFixed(2)} growth=${(growthRate*100).toFixed(1)}% fwdPE=${fwdPE.toFixed(1)}`);
      return fwdPE;
    };

    const fundamentals: YahooFundamentals = {
      trailingPE:      nOrNull(ratios.priceToEarningsRatioTTM),
      forwardPE:       computeForwardPE(),
      priceToCashFlow: nOrNull(ratios.priceToFreeCashFlowRatioTTM) ?? nOrNull(ratios.priceToOperatingCashFlowRatioTTM),
      pegRatio:        nOrNull(ratios.priceToEarningsGrowthRatioTTM),

      grossMargin:     nOrNull(ratios.grossProfitMarginTTM),
      operatingMargin: nOrNull(ratios.operatingProfitMarginTTM),
      profitMargin:    nOrNull(ratios.netProfitMarginTTM),
      fcfMargin:       fcfMarginCalc(),

      // ROE comes from key-metrics-ttm, NOT ratios-ttm
      roe:           nOrNull(keyMetrics.returnOnEquityTTM),
      dividendYield: nOrNull(ratios.dividendYieldTTM),
      beta:          nOrNull(profile.beta),
      marketCap:     nOrNull(profile.marketCap),
      totalDebt:     financials.length > 0 ? nOrNull(financials[financials.length - 1].debt) : null,
      totalCash:     financials.length > 0 ? nOrNull(financials[financials.length - 1].cash) : null,

      financials,
    };

    if (!quote && financials.length === 0) {
      console.error(`[getStockData] No data at all for ${ticker} — returning null`);
      return null;
    }

    return { quote, fundamentals, quoteRateLimited: false };
  } catch (error: any) {
    console.error(`[getStockData] Unhandled exception for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Named alias kept for backwards-compatibility.
 * Returns the fundamentals portion of the stock data.
 */
export async function getFinancialData(symbol: string): Promise<YahooFundamentals | null> {
  const data = await getStockData(symbol);
  return data?.fundamentals ?? null;
}
