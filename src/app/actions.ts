"use server";

// ─── FMP Configuration ────────────────────────────────────────────────────────
// Financial Modeling Prep replaces Yahoo Finance for all statement data.
// Yahoo's /chart API is kept as a price-only fallback (it does not require auth).
const FMP_KEY = "ME2f8HjzG4nnr47PKp0GAll7TkYrazJ7";
const FMP_BASE = "https://financialmodelingprep.com/api/v3";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── FMP Fetch Helpers ────────────────────────────────────────────────────────

/** Generic FMP GET — returns parsed JSON array or throws. */
async function fmpGet(path: string): Promise<any[]> {
  const url = `${FMP_BASE}${path}${path.includes("?") ? "&" : "?"}apikey=${FMP_KEY}`;
  console.log(`[FMP] GET ${url}`);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`[FMP] HTTP ${res.status} ${res.statusText} — ${path}`);
  }
  const json = await res.json();
  // FMP returns an object with an "Error Message" key on bad API key / unknown symbol
  if (!Array.isArray(json)) {
    const msg = (json as any)?.["Error Message"] ?? JSON.stringify(json);
    throw new Error(`[FMP] Non-array response: ${msg}`);
  }
  return json;
}

/**
 * Yahoo Finance /chart API — used ONLY for a live price snapshot.
 * Does not require authentication and is not blocked by Yahoo at this endpoint.
 */
async function yahooChartPrice(ticker: string): Promise<{ price: number; changePercent: number } | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) throw new Error(`Yahoo chart HTTP ${res.status}`);
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract a plain number from FMP's already-numeric fields (no {raw,fmt} wrapping). */
const n = (val: any): number => {
  if (val === null || val === undefined || val === "" || val === "N/A") return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

/** Extract the 4-digit year from an ISO date string like "2023-01-29". */
const yearFrom = (date: string): string => {
  if (!date) return "N/A";
  const match = date.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "N/A";
};

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function getStockData(symbol: string): Promise<StockData | null> {
  const ticker = symbol.toUpperCase().trim();
  console.log(`[getStockData] Fetching ${ticker} via FMP...`);

  try {
    // ── 1. Fetch all financial statements in parallel ─────────────────────────
    const [incomeRaw, balanceRaw, cashRaw, profileRaw, ratiosTTMRaw, keyMetricsTTMRaw] =
      await Promise.allSettled([
        fmpGet(`/income-statement/${ticker}?limit=5`),
        fmpGet(`/balance-sheet-statement/${ticker}?limit=5`),
        fmpGet(`/cash-flow-statement/${ticker}?limit=5`),
        fmpGet(`/profile/${ticker}`),
        fmpGet(`/ratios-ttm/${ticker}`),
        fmpGet(`/key-metrics-ttm/${ticker}`),
      ]);

    const incomeArr: any[] = incomeRaw.status === "fulfilled" ? incomeRaw.value : [];
    const balanceArr: any[] = balanceRaw.status === "fulfilled" ? balanceRaw.value : [];
    const cashArr: any[] = cashRaw.status === "fulfilled" ? cashRaw.value : [];
    const profile: any = profileRaw.status === "fulfilled" ? (profileRaw.value[0] ?? {}) : {};
    const ratiosTTM: any = ratiosTTMRaw.status === "fulfilled" ? (ratiosTTMRaw.value[0] ?? {}) : {};
    const keyMetricsTTM: any = keyMetricsTTMRaw.status === "fulfilled" ? (keyMetricsTTMRaw.value[0] ?? {}) : {};

    if (incomeRaw.status === "rejected") console.error("[FMP] income-statement failed:", (incomeRaw as any).reason?.message);
    if (balanceRaw.status === "rejected") console.error("[FMP] balance-sheet failed:", (balanceRaw as any).reason?.message);
    if (cashRaw.status === "rejected") console.error("[FMP] cash-flow failed:", (cashRaw as any).reason?.message);

    // ── 2. Build FinancialYearData — sync by year across all three statements ─
    const yearMap = new Map<string, FinancialYearData>();

    const ensureYear = (year: string): FinancialYearData => {
      if (!yearMap.has(year)) {
        yearMap.set(year, {
          year, revenue: 0, grossProfit: 0, operatingIncome: 0, netIncome: 0,
          totalAssets: 0, totalLiabilities: 0, totalEquity: 0,
          cash: 0, debt: 0, freeCashFlow: 0, operatingCashFlow: 0, retainedEarnings: 0,
        });
      }
      return yearMap.get(year)!;
    };

    // FMP income statement fields (already plain numbers — no {raw,fmt} wrapping)
    for (const row of incomeArr) {
      const year = yearFrom(row.date ?? row.fillingDate ?? "");
      if (year === "N/A") continue;
      const e = ensureYear(year);
      e.revenue        = n(row.revenue);
      e.grossProfit    = n(row.grossProfit) || (n(row.revenue) - n(row.costOfRevenue));
      e.operatingIncome = n(row.operatingIncome);
      e.netIncome      = n(row.netIncome);
    }

    // FMP balance sheet fields
    for (const row of balanceArr) {
      const year = yearFrom(row.date ?? row.fillingDate ?? "");
      if (year === "N/A") continue;
      const e = ensureYear(year);
      e.totalAssets      = n(row.totalAssets);
      e.totalLiabilities = n(row.totalLiabilities);
      e.totalEquity      = n(row.totalStockholdersEquity) || n(row.stockholdersEquity);
      e.cash             = n(row.cashAndCashEquivalents) || n(row.cashAndShortTermInvestments);
      e.debt             = n(row.totalDebt) || (n(row.shortTermDebt) + n(row.longTermDebt));
      e.retainedEarnings = n(row.retainedEarnings);
    }

    // FMP cash flow fields
    for (const row of cashArr) {
      const year = yearFrom(row.date ?? row.fillingDate ?? "");
      if (year === "N/A") continue;
      const e = ensureYear(year);
      e.operatingCashFlow = n(row.operatingCashFlow);
      e.freeCashFlow      = n(row.freeCashFlow) || (n(row.operatingCashFlow) + n(row.capitalExpenditure));
    }

    const financials = Array.from(yearMap.values())
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));

    console.log(`[FMP] ${ticker} — ${financials.length} years of financial data mapped`);
    if (financials.length === 0) {
      console.error(`[FMP] MAPPING FAILED: zero years extracted for ${ticker}`);
    }

    // ── 3. Build quote — FMP profile first, Yahoo chart as fallback ───────────
    let quote: StockQuote | null = null;

    if (profile.price) {
      quote = {
        symbol: profile.symbol ?? ticker,
        price: n(profile.price),
        changesPercentage: n(profile.changes), // FMP: already a percent value like 2.5
      };
      console.log(`[FMP] Quote from profile: $${quote.price}`);
    } else {
      // FMP profile missing price — try Yahoo chart API
      const yPrice = await yahooChartPrice(ticker);
      if (yPrice) {
        quote = {
          symbol: ticker,
          price: yPrice.price,
          // Yahoo chart returns a fraction (0.025 = 2.5%) — convert to percent
          changesPercentage: Math.abs(yPrice.changePercent) < 2
            ? yPrice.changePercent * 100
            : yPrice.changePercent,
        };
        console.log(`[YAHOO_CHART] Quote fallback used: $${quote.price}`);
      }
    }

    // ── 4. Build fundamentals from FMP ratios-ttm + key-metrics-ttm + profile ─
    const lastIncomeRow = incomeArr[0] ?? {};  // most recent year for TTM margins fallback
    const totalRevTTM = n(lastIncomeRow.revenue) || 1;
    const fcfTTM      = n(keyMetricsTTM.freeCashFlowPerShare) * n(profile.sharesOutstanding ?? keyMetricsTTM.sharesOutstanding ?? 0);

    const fundamentals: YahooFundamentals = {
      // Valuation
      trailingPE:      n(ratiosTTM.peRatioTTM)             || n(profile.pe)           || null,
      forwardPE:       n(keyMetricsTTM.forwardPE)           || null,
      priceToCashFlow: n(ratiosTTM.priceToFreeCashFlowsTTM) || n(keyMetricsTTM.priceToOperatingCashFlowsTTM) || null,
      pegRatio:        n(ratiosTTM.pegRatioTTM)             || null,

      // Margins (FMP: returned as fractions 0.65 = 65%)
      grossMargin:     n(ratiosTTM.grossProfitMarginTTM)    || null,
      operatingMargin: n(ratiosTTM.operatingProfitMarginTTM) || null,
      profitMargin:    n(ratiosTTM.netProfitMarginTTM)      || null,
      fcfMargin:       fcfTTM && n(lastIncomeRow.revenue)
                         ? fcfTTM / n(lastIncomeRow.revenue)
                         : (n(keyMetricsTTM.freeCashFlowPerShareTTM) > 0 ? n(keyMetricsTTM.freeCashFlowPerShareTTM) / Math.max(n(profile.price), 1) : null),

      // Health
      roe:           n(ratiosTTM.returnOnEquityTTM)         || null,
      dividendYield: n(profile.lastDiv) > 0 && n(profile.price) > 0
                       ? n(profile.lastDiv) / n(profile.price)
                       : (n(ratiosTTM.dividendYieldTTM)     || null),
      beta:          n(profile.beta)                        || null,
      marketCap:     n(profile.mktCap)                      || null,
      totalDebt:     n(keyMetricsTTM.netDebtTTM) > 0
                       ? n(keyMetricsTTM.netDebtTTM)
                       : (financials.length > 0 ? financials[financials.length - 1].debt : null),
      totalCash:     financials.length > 0 ? financials[financials.length - 1].cash : null,

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
