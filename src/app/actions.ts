"use server";

// ─── FMP Configuration ─────────────────────────────────────────────────────
const FMP_KEY  = "ME2f8HjzG4nnr47PKp0GAll7TkYrazJ7";
const FMP_BASE = "https://financialmodelingprep.com/stable";

// ─── Types ─────────────────────────────────────────────────────────────────

export type Period = 'annual' | 'quarter';

export type StockQuote = {
  symbol: string;
  price: number;
  changesPercentage: number;
};

export type FinancialYearData = {
  year: string;          // "2024" for annual, "Q1 2024" for quarterly
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
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const n = (val: any): number => {
  if (val === null || val === undefined || val === "" || val === "N/A") return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const nOrNull = (val: any): number | null => {
  const num = n(val);
  return num === 0 ? null : num;
};

// ─── FMP Fetch ─────────────────────────────────────────────────────────────

async function fmpGet(path: string, params: Record<string, string> = {}): Promise<any[]> {
  const query = new URLSearchParams({ ...params, apikey: FMP_KEY });
  const url = `${FMP_BASE}${path}?${query.toString()}`;
  console.log(`[FMP] GET ${url.replace(FMP_KEY, "***")}`);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[FMP] HTTP ${res.status} — ${path} — ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  if (!Array.isArray(json)) {
    const msg = (json as any)?.["Error Message"] ?? (json as any)?.message ?? JSON.stringify(json).slice(0, 200);
    throw new Error(`[FMP] Non-array: ${msg}`);
  }
  return json;
}

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
    console.warn(`[YAHOO_CHART] Failed for ${ticker}: ${e.message}`);
    return null;
  }
}

// ─── Row Label ─────────────────────────────────────────────────────────────

/**
 * Build the chart X-axis label from an FMP row.
 * Annual:    "2024"
 * Quarterly: "Q1 2024"  (from row.period + row.fiscalYear)
 */
function rowLabel(row: any, period: Period): string {
  const fiscalYear = row.fiscalYear ? String(row.fiscalYear) : (row.date ?? "").substring(0, 4);
  if (period === 'quarter') {
    const q = row.period ?? "";          // "Q1", "Q2", "Q3", "Q4"
    return q ? `${q} ${fiscalYear}` : fiscalYear;
  }
  return fiscalYear;
}

// ─── Main Export ───────────────────────────────────────────────────────────

export async function getStockData(
  symbol: string,
  period: Period = 'annual'
): Promise<StockData | null> {
  const ticker = symbol.toUpperCase().trim();
  console.log(`[getStockData] ${ticker} period=${period}`);

  try {
    const limit = period === 'quarter' ? '8' : '5';

    const stmtParams = (extra: Record<string, string> = {}) => ({
      symbol: ticker,
      period,           // FMP: "annual" | "quarter"
      limit,
      ...extra,
    });

    const [incomeRaw, balanceRaw, cashRaw, profileRaw, ratiosRaw, keyMetricsRaw] =
      await Promise.allSettled([
        fmpGet("/income-statement",        stmtParams()),
        fmpGet("/balance-sheet-statement", stmtParams()),
        fmpGet("/cash-flow-statement",     stmtParams()),
        fmpGet("/profile",                 { symbol: ticker }),
        fmpGet("/ratios-ttm",              { symbol: ticker }),
        fmpGet("/key-metrics-ttm",         { symbol: ticker }),
      ]);

    const incomeArr:  any[] = incomeRaw.status     === "fulfilled" ? incomeRaw.value          : [];
    const balanceArr: any[] = balanceRaw.status    === "fulfilled" ? balanceRaw.value         : [];
    const cashArr:    any[] = cashRaw.status       === "fulfilled" ? cashRaw.value            : [];
    const profile:    any   = profileRaw.status    === "fulfilled" ? (profileRaw.value[0]    ?? {}) : {};
    const ratios:     any   = ratiosRaw.status     === "fulfilled" ? (ratiosRaw.value[0]     ?? {}) : {};
    const keyMetrics: any   = keyMetricsRaw.status === "fulfilled" ? (keyMetricsRaw.value[0] ?? {}) : {};

    if (incomeRaw.status     === "rejected") console.error("[FMP] income failed:",      (incomeRaw     as any).reason?.message);
    if (balanceRaw.status    === "rejected") console.error("[FMP] balance failed:",     (balanceRaw    as any).reason?.message);
    if (cashRaw.status       === "rejected") console.error("[FMP] cashflow failed:",    (cashRaw       as any).reason?.message);
    if (ratiosRaw.status     === "rejected") console.error("[FMP] ratios failed:",      (ratiosRaw     as any).reason?.message);
    if (keyMetricsRaw.status === "rejected") console.error("[FMP] key-metrics failed:", (keyMetricsRaw as any).reason?.message);

    if (incomeArr.length > 0) console.log(`[FMP] ${ticker} income[0]:`, JSON.stringify(incomeArr[0]));

    // ── Map financials ────────────────────────────────────────────────────
    const yearMap = new Map<string, FinancialYearData>();

    const ensureLabel = (label: string): FinancialYearData => {
      if (!yearMap.has(label)) {
        yearMap.set(label, {
          year: label,
          revenue: 0, grossProfit: 0, operatingIncome: 0, netIncome: 0,
          totalAssets: 0, totalLiabilities: 0, totalEquity: 0,
          cash: 0, debt: 0, freeCashFlow: 0, operatingCashFlow: 0, retainedEarnings: 0,
        });
      }
      return yearMap.get(label)!;
    };

    for (const row of incomeArr) {
      const label = rowLabel(row, period);
      if (label.length < 4) continue;
      const e = ensureLabel(label);
      e.revenue         = n(row.revenue);
      e.grossProfit     = n(row.grossProfit) || (n(row.revenue) - n(row.costOfRevenue));
      e.operatingIncome = n(row.operatingIncome) || n(row.ebit);
      e.netIncome       = n(row.netIncome);
    }

    for (const row of balanceArr) {
      const label = rowLabel(row, period);
      if (label.length < 4) continue;
      const e = ensureLabel(label);
      e.totalAssets      = n(row.totalAssets);
      e.totalLiabilities = n(row.totalLiabilities);
      e.totalEquity      = n(row.totalStockholdersEquity) || n(row.totalEquity);
      e.cash             = n(row.cashAndCashEquivalents)  || n(row.cashAndShortTermInvestments);
      e.debt             = n(row.totalDebt) || (n(row.shortTermDebt) + n(row.longTermDebt));
      e.retainedEarnings = n(row.retainedEarnings);
    }

    for (const row of cashArr) {
      const label = rowLabel(row, period);
      if (label.length < 4) continue;
      const e = ensureLabel(label);
      e.operatingCashFlow = n(row.operatingCashFlow) || n(row.netCashProvidedByOperatingActivities);
      e.freeCashFlow      = n(row.freeCashFlow) || (n(row.operatingCashFlow) + n(row.capitalExpenditure));
    }

    // Sort by chronological order
    // Annual: "2021" < "2022" — simple string/int sort
    // Quarterly: "Q1 2024" — sort by year then quarter
    const financials = Array.from(yearMap.values()).sort((a, b) => {
      if (period === 'quarter') {
        const parseQ = (s: string) => {
          const m = s.match(/^Q(\d)\s+(\d{4})$/);
          return m ? parseInt(m[2]) * 10 + parseInt(m[1]) : 0;
        };
        return parseQ(a.year) - parseQ(b.year);
      }
      return parseInt(a.year) - parseInt(b.year);
    });

    console.log(`[FMP] ${ticker} (${period}) — ${financials.length} rows:`, financials.map(f => f.year).join(", "));

    // ── Quote ─────────────────────────────────────────────────────────────
    let quote: StockQuote | null = null;

    if (n(profile.price) > 0) {
      quote = {
        symbol: profile.symbol ?? ticker,
        price: n(profile.price),
        changesPercentage: n(profile.changePercentage),
      };
    } else {
      const yp = await yahooChartPrice(ticker);
      if (yp) {
        quote = {
          symbol: ticker,
          price: yp.price,
          changesPercentage: Math.abs(yp.changePercent) < 5 ? yp.changePercent * 100 : yp.changePercent,
        };
      }
    }

    // ── Fundamentals (always TTM — not period-dependent) ──────────────────
    const lastCash = cashArr[0];

    const fcfMarginCalc = (): number | null => {
      const fcf = n(lastCash?.freeCashFlow);
      const rev = n(incomeArr[0]?.revenue);
      if (fcf !== 0 && rev > 0) return fcf / rev;
      return null;
    };

    const computeForwardPE = (): number | null => {
      const price = n(profile.price);
      if (price <= 0) return null;
      const earningsYield = n(keyMetrics.earningsYieldTTM);
      if (earningsYield <= 0) {
        const trailingPE = n(ratios.priceToEarningsRatioTTM);
        if (trailingPE <= 0) return null;
        const rev0 = n(incomeArr[0]?.revenue);
        const rev1 = n(incomeArr[1]?.revenue);
        if (rev0 <= 0 || rev1 <= 0) return null;
        const growthRate = (rev0 - rev1) / rev1;
        if (growthRate <= 0) return null;
        return trailingPE / (1 + growthRate);
      }
      const epsTTM = price * earningsYield;
      const rev0 = n(incomeArr[0]?.revenue);
      const rev1 = n(incomeArr[1]?.revenue);
      const growthRate = (rev1 > 0 && rev0 > rev1) ? (rev0 - rev1) / rev1 : 0;
      const epsForward = epsTTM * (1 + growthRate);
      if (epsForward <= 0) return null;
      return price / epsForward;
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

      roe:           nOrNull(keyMetrics.returnOnEquityTTM),
      dividendYield: nOrNull(ratios.dividendYieldTTM),
      beta:          nOrNull(profile.beta),
      marketCap:     nOrNull(profile.marketCap),
      totalDebt:     financials.length > 0 ? nOrNull(financials[financials.length - 1].debt) : null,
      totalCash:     financials.length > 0 ? nOrNull(financials[financials.length - 1].cash) : null,

      financials,
    };

    if (!quote && financials.length === 0) return null;

    return { quote, fundamentals, quoteRateLimited: false };
  } catch (error: any) {
    console.error(`[getStockData] Exception for ${ticker}:`, error.message);
    return null;
  }
}

export async function getFinancialData(
  symbol: string,
  period: Period = 'annual'
): Promise<YahooFundamentals | null> {
  const data = await getStockData(symbol, period);
  return data?.fundamentals ?? null;
}
