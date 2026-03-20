"use server";
import yahooFinance from 'yahoo-finance2';

// Pass a realistic browser User-Agent on every request so Vercel IPs
// are not blocked by Yahoo Finance's bot-detection.
// yahoo-finance2 v3 exposes this via the third "moduleOpts" argument
// on each call (fetchOptions), NOT via setGlobalConfig.
const YF_MODULE_OPTS = {
  fetchOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
    },
  },
} as const;

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
        } catch(e) {}
        return "N/A";
    };

    let quote: StockQuote | null = null;
    let fundamentals: YahooFundamentals | null = null;

    let yahooData: any = null;
    try {
      yahooData = await yahooFinance.quoteSummary(
        symbol,
        { modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics', 'incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory', 'earningsTrend', 'price'] } as any,
        YF_MODULE_OPTS as any
      );
    } catch (e: any) {
      console.warn("Yahoo Finance quoteSummary Error, falling back to a simpler approach...", e.message);
      try {
        const basicQuote: any = await yahooFinance.quote(symbol, {}, YF_MODULE_OPTS as any);
        quote = {
          symbol: basicQuote.symbol,
          price: basicQuote.regularMarketPrice || 0,
          changesPercentage: basicQuote.regularMarketChangePercent || 0
        };
        const chartRes: any = await yahooFinance.quoteSummary(
          symbol,
          { modules: ['earnings'] } as any,
          YF_MODULE_OPTS as any
        );
        if (chartRes && chartRes.earnings && chartRes.earnings.financialsChart) {
             const yearly = chartRes.earnings.financialsChart.yearly || [];
             yahooData = { isFallback: true, earningsFallback: yearly };
        } else {
             yahooData = null; 
        }
      } catch (e2: any) {
         console.warn("Fallback failed too.", e2.message);
      }
    }

    if (yahooData && !yahooData.isFallback) {
      const priceInfo = yahooData.price || {};
      quote = {
        symbol: priceInfo.symbol || symbol,
        price: priceInfo.regularMarketPrice || ext(yahooData.summaryDetail?.previousClose) || 0,
        changesPercentage: (priceInfo.regularMarketChangePercent !== undefined) ? (priceInfo.regularMarketChangePercent * 100) : 0
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
