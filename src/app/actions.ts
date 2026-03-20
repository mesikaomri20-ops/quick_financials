"use server";
import yahooFinance from 'yahoo-finance2';

// ─── Shared browser-spoof headers ────────────────────────────────────────────
const YF_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

/**
 * Direct raw fetch to Yahoo Finance query2 API — bypasses yahoo-finance2
 * library entirely.  Used as the primary fallback when the library's internal
 * environment validation fails on Vercel's serverless runtime.
 *
 * Endpoint structure:
 *   quoteSummary.result[0].incomeStatementHistory.incomeStatementHistory[]
 *   quoteSummary.result[0].balanceSheetHistory.balanceSheetStatements[]
 *   quoteSummary.result[0].cashflowStatementHistory.cashflowStatements[]
 */
async function rawYahooFetch(ticker: string, modules: string[]): Promise<any> {
  const modParam = modules.join(',');
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modParam}&corsDomain=finance.yahoo.com&formatted=true`;
  console.log(`[RAW] Fetching ${url}`);
  const res = await fetch(url, {
    method: 'GET',
    headers: YF_HEADERS,
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`[RAW] HTTP ${res.status} ${res.statusText} for ${ticker}`);
  }
  const json: any = await res.json();
  const result = json?.quoteSummary?.result?.[0];
  if (!result) {
    const errMsg = json?.quoteSummary?.error?.description ?? 'No result in response';
    throw new Error(`[RAW] Empty result for ${ticker}: ${errMsg}`);
  }
  return result;
}

/**
 * Raw fetch to Yahoo v8 quote endpoint for a single price snapshot.
 * Used as a last resort when all financial-data paths fail.
 */
async function rawYahooQuote(ticker: string): Promise<any> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  console.log(`[RAW] Quote fetch ${url}`);
  const res = await fetch(url, { method: 'GET', headers: YF_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`[RAW] Quote HTTP ${res.status} for ${ticker}`);
  const json: any = await res.json();
  return json?.chart?.result?.[0]?.meta ?? null;
}

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

export async function getStockData(symbol: string): Promise<StockData | null> {
  console.log(`Fetching data from Yahoo Finance for ${symbol}...`);

  try {
    const ext = (val: any) => {
      if (val === null || val === undefined) return 0;
      return val.raw !== undefined ? val.raw : (Number(val) || 0);
    };

    const extractYear = (d: any) => {
      if (!d) return "N/A";
      try {
        if (d instanceof Date) return d.getFullYear().toString();
        if (d.fmt) return String(d.fmt).substring(0, 4);
        const dateObj = new Date(d.raw !== undefined ? d.raw * 1000 : typeof d === 'number' && d > 3000 ? d * 1000 : d);
        if (!isNaN(dateObj.getTime())) return dateObj.getFullYear().toString();
        if (typeof d === 'string') {
          const strMatch = d.match(/\b(19|20)\d{2}\b/);
          if (strMatch) return strMatch[0];
        }
      } catch (e) { }
      return "N/A";
    };

    let quote: StockQuote | null = null;
    let fundamentals: YahooFundamentals | null = null;

    // ── TIER 1: yahoo-finance2 library (full data, validates/coerces response) ──
    let yahooData: any = null;
    let usedRawFallback = false;
    try {
      yahooData = await yahooFinance.quoteSummary(
        symbol,
        { modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics', 'incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory', 'earningsTrend', 'price'] } as any,
        { fetchOptions: { headers: YF_HEADERS } } as any
      );
      console.log(`[TIER1] Library succeeded for ${symbol}`);
    } catch (libErr: any) {
      console.error(`[TIER1] Library failed for ${symbol}: ${libErr.message}`);

      // ── TIER 2: raw fetch to Yahoo query2 — bypasses the library ────────────
      try {
        console.log(`[TIER2] Attempting raw fetch for ${symbol}...`);
        const rawData = await rawYahooFetch(symbol, [
          'summaryDetail', 'financialData', 'defaultKeyStatistics',
          'incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory',
          'earningsTrend', 'price',
        ]);
        // Normalize: raw fetch with formatted=true wraps numbers as { raw, fmt }
        // which is the same shape the library returns — existing mapping code works.
        yahooData = rawData;
        usedRawFallback = true;
        console.log(`[TIER2] Raw fetch succeeded for ${symbol}`);
      } catch (rawErr: any) {
        console.error(`[TIER2] Raw fetch failed for ${symbol}: ${rawErr.message}`);

        // ── TIER 3: price-only via Yahoo chart API ───────────────────────────
        try {
          console.log(`[TIER3] Attempting price-only fetch for ${symbol}...`);
          const meta = await rawYahooQuote(symbol);
          if (meta) {
            quote = {
              symbol: meta.symbol || symbol,
              price: meta.regularMarketPrice || 0,
              changesPercentage: meta.regularMarketChangePercent || 0,
            };
          }
          console.log(`[TIER3] Price-only fetch ${quote ? 'succeeded' : 'returned empty'} for ${symbol}`);
        } catch (quoteErr: any) {
          console.error(`[TIER3] All fetch tiers failed for ${symbol}: ${quoteErr.message}`);
        }
      }
    }

    if (yahooData && !yahooData.isFallback) {
      const priceInfo = yahooData.price || {};
      quote = {
        symbol: priceInfo.symbol || symbol,
        price: ext(priceInfo.regularMarketPrice) || ext(yahooData.summaryDetail?.previousClose) || 0,
        // library returns a fraction (0.02 = 2%), raw API may return the same; multiply only if < 1
        changesPercentage: (() => {
          const raw = ext(priceInfo.regularMarketChangePercent);
          return Math.abs(raw) < 2 ? raw * 100 : raw; // fraction → percent
        })(),
      };

      const summary: any = yahooData.summaryDetail || {};
      const financial: any = yahooData.financialData || {};
      const stats: any = yahooData.defaultKeyStatistics || {};

      const price = quote.price || 1;
      const shares = ext(stats.sharesOutstanding) || 1;
      const operatingCF = ext(financial.operatingCashflow) || 0;

      let priceToCashFlow = null;
      if (operatingCF > 0 && shares > 0) {
        priceToCashFlow = price / (operatingCF / shares);
      }

      let fcfMargin = null;
      const freeCashflow = ext(financial.freeCashflow) || 0;
      const totalRevenue = ext(financial.totalRevenue) || 0;
      if (totalRevenue > 0) {
        fcfMargin = freeCashflow / totalRevenue;
      }

      let pegRatioRaw = stats.pegRatio || stats.priceToEarningsGrowth || summary.pegRatio || summary.priceToEarningsGrowth;
      let pegRatio = ext(pegRatioRaw);

      if (!pegRatio) {
        try {
          const trends = yahooData.earningsTrend?.trend || [];
          const fiveYearTrend = trends.find((t: any) => t.period === '+5y' || t.period === '5y');

          let growthRate = ext(fiveYearTrend?.growth);
          let forwardPeValue = ext(summary.forwardPE);

          if (growthRate && forwardPeValue) {
            pegRatio = forwardPeValue / (growthRate * 100);
          } else if (financial.earningsGrowth) {
            let eg = ext(financial.earningsGrowth);
            if (eg && forwardPeValue) {
              pegRatio = forwardPeValue / (eg * 100);
            }
          }
        } catch (e) { }
      }

      // BRUTE FORCE ALIASING HELPER
      const getVal = (obj: any, aliases: string[]): number => {
        if (!obj) return 0;
        for (const alias of aliases) {
          if (obj[alias] !== undefined && obj[alias] !== null) {
            const val = obj[alias];
            if (typeof val === 'object' && val.raw !== undefined) return val.raw;
            if (typeof val === 'number') return val;
          }
        }
        return 0; // Fallback missing values completely to 0
      };

      const incomeArr = yahooData.incomeStatementHistory?.incomeStatementHistory || [];
      const balanceArr = yahooData.balanceSheetHistory?.balanceSheetStatements || [];
      const cashArr = yahooData.cashflowStatementHistory?.cashflowStatements || [];

      console.log(`[${symbol}] Income rows: ${incomeArr.length}, Balance rows: ${balanceArr.length}, CashFlow rows: ${cashArr.length}`);
      if (incomeArr.length > 0) console.log(`[${symbol}] First income row keys:`, Object.keys(incomeArr[0]));
      if (balanceArr.length > 0) console.log(`[${symbol}] First balance row keys:`, Object.keys(balanceArr[0]));

      const yearMap = new Map<string, FinancialYearData>();

      const ensureYear = (year: string) => {
        if (!yearMap.has(year)) {
          yearMap.set(year, {
            year, revenue: 0, grossProfit: 0, operatingIncome: 0, netIncome: 0,
            totalAssets: 0, totalLiabilities: 0, totalEquity: 0, cash: 0, debt: 0,
            freeCashFlow: 0, operatingCashFlow: 0, retainedEarnings: 0
          });
        }
        return yearMap.get(year)!;
      };

      // Sync By Year - Map Income Statement
      for (const row of incomeArr) {
        const year = extractYear(row.endDate || row.date || row.asOfDate);
        if (year === "N/A") continue;
        const entry = ensureYear(year);

        entry.revenue = getVal(row, ['totalRevenue', 'revenue', 'total_revenue', 'operatingRevenue']);
        const cost = getVal(row, ['costOfRevenue', 'cost_of_revenue']);
        let gross = getVal(row, ['grossProfit', 'gross_profit']);
        if (gross === 0) gross = entry.revenue - cost;
        entry.grossProfit = gross;

        entry.operatingIncome = getVal(row, ['operatingIncome', 'operating_income', 'ebit']);
        entry.netIncome = getVal(row, ['netIncome', 'net_income', 'netIncomeCommonStockholders']);
      }

      // Sync By Year - Map Balance Sheet
      for (const row of balanceArr) {
        const year = extractYear(row.endDate || row.date || row.asOfDate);
        if (year === "N/A") continue;
        const entry = ensureYear(year);

        entry.totalAssets = getVal(row, ['totalAssets', 'assets', 'total_assets']);
        entry.totalLiabilities = getVal(row, ['totalLiabilitiesNetMinorityInterest', 'totalLiabilities', 'liabilities']);
        entry.totalEquity = getVal(row, ['totalStockholderEquity', 'equity', 'total_equity', 'stockholdersEquity']);
        entry.cash = getVal(row, ['cashAndCashEquivalents', 'cash', 'totalCash', 'cashAndShortTermInvestments', 'totalCashAndShortTermInvestments']);

        let dbt = getVal(row, ['totalDebt', 'debt', 'shortLongTermDebtTotal']);
        if (dbt === 0) {
          dbt = getVal(row, ['shortLongTermDebt']) + getVal(row, ['longTermDebt']);
        }
        entry.debt = dbt;
        entry.retainedEarnings = getVal(row, ['retainedEarnings', 'retained_earnings']);
      }

      // Sync By Year - Map Cash Flow
      for (const row of cashArr) {
        const year = extractYear(row.endDate || row.date || row.asOfDate);
        if (year === "N/A") continue;
        const entry = ensureYear(year);

        entry.freeCashFlow = getVal(row, ['freeCashflow', 'freeCashFlow']);
        entry.operatingCashFlow = getVal(row, ['operatingCashflow', 'totalCashFromOperatingActivities']);
        if (entry.freeCashFlow === 0 && entry.operatingCashFlow !== 0) {
          entry.freeCashFlow = entry.operatingCashFlow + getVal(row, ['capitalExpenditures']);
        }
      }

      const mergedFinancials = Array.from(yearMap.values()).sort((a, b) => parseInt(a.year) - parseInt(b.year));

      // The "Check" Step: Before the return statement, add a check
      if (mergedFinancials.length === 0) {
        console.error("MAPPING FAILED: No data extracted from Yahoo");
      }

      fundamentals = {
        trailingPE: ext(summary.trailingPE) || null,
        forwardPE: ext(summary.forwardPE) || null,
        priceToCashFlow: priceToCashFlow,
        pegRatio: pegRatio || null,

        grossMargin: ext(financial.grossMargins) || null,
        operatingMargin: ext(financial.operatingMargins) || null,
        profitMargin: ext(financial.profitMargins) || null,
        fcfMargin: fcfMargin,

        roe: ext(financial.returnOnEquity) || null,
        dividendYield: ext(summary.dividendYield) || null,
        beta: ext(stats.beta) || ext(summary.beta) || null,
        marketCap: ext(summary.marketCap) || (price * shares) || null,
        totalDebt: ext(financial.totalDebt) || null,
        totalCash: ext(financial.totalCash) || null,

        financials: mergedFinancials
      };
    } else if (yahooData && yahooData.isFallback) {
      // Create partial fundamentals from earnings chart
      const incomeSt = yahooData.earningsFallback.map((item: any) => ({
        year: typeof item.date === "number" ? String(item.date) : extractYear(item.date),
        revenue: ext(item.revenue),
        netIncome: ext(item.earnings),
        grossProfit: 0,
        operatingIncome: 0,
        totalAssets: 0, totalLiabilities: 0, totalEquity: 0, cash: 0, debt: 0, freeCashFlow: 0, operatingCashFlow: 0, retainedEarnings: 0
      }));
      fundamentals = {
        trailingPE: null, forwardPE: null, priceToCashFlow: null, pegRatio: null,
        grossMargin: null, operatingMargin: null, profitMargin: null, fcfMargin: null,
        roe: null, dividendYield: null, beta: null, marketCap: null, totalDebt: null, totalCash: null,
        financials: incomeSt
      };
    }

    if (!quote && !fundamentals) {
      return null;
    }

    return { quote, fundamentals, quoteRateLimited: false };
  } catch (error) {
    console.error("Exception during fetch:", error);
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

