"use server";

// ─── Config ────────────────────────────────────────────────────────────────
const FMP_KEY  = "LU2KvGFffEm1ChIVE6iFBZTGLzxUp6Jm";
const FMP_BASE = "https://financialmodelingprep.com/api/v3";

// ─── Types ─────────────────────────────────────────────────────────────────

export type Period = "annual" | "quarter";

export type StockQuote = {
  symbol: string;
  price: number;
  changesPercentage: number;
  companyName?: string;
  name?: string;
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
  rateLimited?: boolean;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const n = (val: any): number => { if (val === null || val === undefined || val === "" || val === "N/A") return 0; const num = Number(val); return isNaN(num) ? 0 : num; };
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function fmpSafe(path: string, params: Record<string, string>): Promise<any[]> {
  try {
    const qs = new URLSearchParams({ ...params, apikey: FMP_KEY });
    const url = `${FMP_BASE}${path}?${qs}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  } catch (e) {
    console.error(`[FMP] Error fetching ${path}:`, e);
    return [];
  }
}

function rowLabel(row: any, period: Period): string {
  const year = row.fiscalYear ? String(row.fiscalYear) : (row.calendarYear ? String(row.calendarYear) : (row.date ?? "").substring(0, 4));
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
  const ticker = symbol.toUpperCase().trim();
  const limit  = "5";
  const stmtP  = { symbol: ticker, period, limit };

  try {
    // 1. Sequential fetching with 2000ms delay to avoid 429
    const incomeArr  = await fmpSafe("/income-statement",        stmtP); await sleep(2000);
    const balanceArr = await fmpSafe("/balance-sheet-statement", stmtP); await sleep(2000);
    const cashArr    = await fmpSafe("/cash-flow-statement",     stmtP); await sleep(2000);
    const quoteArr   = await fmpSafe("/quote", { symbol: ticker });
    
    const fmpQuote = quoteArr[0] || {};
    if (incomeArr.length === 0 && quoteArr.length === 0) return null;

    // 2. Map Statements
    const yearMap = new Map<string, FinancialYearData>();
    const ensure = (label: string): FinancialYearData => {
      if (!yearMap.has(label)) yearMap.set(label, {
        year: label, revenue: 0, grossProfit: 0, operatingIncome: 0, netIncome: 0, researchAndDevelopment: 0,
        totalAssets: 0, totalLiabilities: 0, totalEquity: 0, cash: 0, debt: 0, freeCashFlow: 0, operatingCashFlow: 0, retainedEarnings: 0,
      });
      return yearMap.get(label)!;
    };

    for (const row of incomeArr) {
      const lbl = rowLabel(row, period);
      const e = ensure(lbl);
      e.revenue = n(row.revenue);
      e.grossProfit = n(row.grossProfit) || (n(row.revenue) - n(row.costOfRevenue));
      e.operatingIncome = n(row.operatingIncome) || n(row.ebit);
      e.netIncome = n(row.netIncome);
      e.researchAndDevelopment = n(row.researchAndDevelopmentExpenses);
    }
    for (const row of balanceArr) {
      const lbl = rowLabel(row, period);
      const e = ensure(lbl);
      e.totalAssets = n(row.totalAssets);
      e.totalLiabilities = n(row.totalLiabilities);
      e.totalEquity = n(row.totalStockholdersEquity) || n(row.totalEquity);
      e.cash = n(row.cashAndCashEquivalents) || n(row.cashAndShortTermInvestments);
      e.debt = n(row.totalDebt) || (n(row.shortTermDebt) + n(row.longTermDebt));
      e.retainedEarnings = n(row.retainedEarnings);
    }
    for (const row of cashArr) {
      const lbl = rowLabel(row, period);
      const e = ensure(lbl);
      e.operatingCashFlow = n(row.operatingCashFlow) || n(row.netCashProvidedByOperatingActivities);
      e.freeCashFlow = n(row.freeCashFlow) || (n(row.operatingCashFlow) + n(row.capitalExpenditure));
    }

    const financials = Array.from(yearMap.values()).sort((a, b) => {
      if (period === "quarter") {
        const pq = (s: string) => { const m = s.match(/^Q(\d)\s+(\d{4})$/); return m ? +m[2] * 10 + +m[1] : 0; };
        return pq(a.year) - pq(b.year);
      }
      return parseInt(a.year) - parseInt(b.year);
    });

    // 3. Manual Calculations for Margins and ROE
    const i0 = incomeArr[0] || {};
    const b0 = balanceArr[0] || {};
    const c0 = cashArr[0] || {};

    const calcMargin = (num: any, den: any): number | null => {
      const nNum = n(num);
      const nDen = n(den);
      if (nDen === 0) return null;
      const res = (nNum / nDen) * 100;
      return (res > 100 || res < -100) ? null : res;
    };

    const grossMarginDerived = calcMargin(i0.grossProfit, i0.revenue);
    const operatingMarginDerived = calcMargin(i0.operatingIncome, i0.revenue);
    const profitMarginDerived = calcMargin(i0.netIncome, i0.revenue);
    const fcfMarginDerived = calcMargin(c0.freeCashFlow, i0.revenue);

    let roeDerived = null;
    const tEq = n(b0.totalStockholdersEquity);
    if (tEq !== 0) {
      const roe = (n(i0.netIncome) / tEq) * 100;
      roeDerived = (roe > 100 || roe < -100) ? null : roe;
    }

    return {
      quote: {
        symbol: fmpQuote.symbol || ticker,
        price: n(fmpQuote.price),
        changesPercentage: n(fmpQuote.changesPercentage),
        companyName: fmpQuote.name || ticker,
        name: fmpQuote.name || ticker,
      },
      fundamentals: {
        trailingPE: n(fmpQuote.pe) || null,
        forwardPE: null,
        priceToCashFlow: (n(fmpQuote.marketCap) > 0 && n(c0.freeCashFlow) > 0) ? n(fmpQuote.marketCap) / n(c0.freeCashFlow) : null,
        pegRatio: null,
        grossMargin: grossMarginDerived,
        operatingMargin: operatingMarginDerived,
        profitMargin: profitMarginDerived,
        fcfMargin: fcfMarginDerived,
        roe: roeDerived,
        dividendYield: null,
        beta: null,
        marketCap: n(fmpQuote.marketCap) || null,
        totalDebt: financials.length > 0 ? financials[financials.length - 1].debt : null,
        totalCash: financials.length > 0 ? financials[financials.length - 1].cash : null,
        financials,
      }
    };
  } catch (e) {
    console.error(`[getStockData] Error for ${ticker}:`, e);
    return null;
  }
}

export async function getFinancialData(
  symbol: string,
  period: Period = "annual"
): Promise<YahooFundamentals | null> {
  const data = await getStockData(symbol, period);
  return data?.fundamentals || null;
}
