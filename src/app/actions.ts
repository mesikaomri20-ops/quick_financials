"use server";
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export type StockQuote = {
  symbol: string;
  price: number;
  changesPercentage: number;
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
  
  incomeStatement: any[];
  balanceSheet: any[];
  cashFlow: any[];
};

export type StockData = {
  quote: StockQuote | null;
  fundamentals: YahooFundamentals | null;
  quoteRateLimited?: boolean;
};

export async function getStockData(symbol: string): Promise<StockData | null> {
  // Clean Logs: Add log saying we are fetching from Yahoo Finance
  console.log(`Fetching data from Yahoo Finance for ${symbol}...`);

  try {
    const ext = (val: any) => {
        if (val === null || val === undefined) return 0;
        return val.raw !== undefined ? val.raw : (Number(val) || 0);
    };

    const extractYear = (d: any) => {
        if (!d) return "N/A";
        try {
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
      yahooData = await yahooFinance.quoteSummary(symbol, { 
        modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics', 'incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory', 'earningsTrend', 'price'] 
      } as any);
    } catch (e: any) {
      console.warn("Yahoo Finance quoteSummary Error, falling back to a simpler approach...", e.message);
      
      // Add Fallback calculation exactly as requested
      try {
        const basicQuote = await yahooFinance.quote(symbol);
        quote = {
          symbol: basicQuote.symbol,
          price: basicQuote.regularMarketPrice || 0,
          changesPercentage: basicQuote.regularMarketChangePercent || 0
        };
        
        // Simpler chart call fallback logic
        const chartRes = await yahooFinance.quoteSummary(symbol, { modules: ['earnings'] } as any);
        if (chartRes && chartRes.earnings && chartRes.earnings.financialsChart) {
             const yearly = chartRes.earnings.financialsChart.yearly || [];
             yahooData = { isFallback: true, earningsFallback: yearly };
        } else {
             const chartOnly = await yahooFinance.chart(symbol, { period1: '2020-01-01' });
             yahooData = null; // We can't build fundamental history from just price chart
        }
      } catch (e2) {
         console.warn("Fallback failed too.");
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

      // Map the Yahoo data accurately directly to frontend expectations
      const cleanIncome = (arr: any[]) => {
          if (!arr || !Array.isArray(arr)) return [];
          return arr.map((item: any) => {
              const rev = item.totalRevenue?.raw || item.totalRevenue || 0;
              let gross = item.grossProfit?.raw || item.grossProfit || item.totalGrossProfit?.raw || item.totalGrossProfit || 0;
              if (!gross || gross === 0) {
                  gross = rev - (item.costOfRevenue?.raw || item.costOfRevenue || 0);
              }
              return {
                  year: new Date(item.endDate || item.asOfDate).getFullYear().toString(),
                  revenue: rev,
                  grossProfit: gross,
                  operatingIncome: item.operatingIncome?.raw || item.operatingIncome || 0,
                  netIncome: item.netIncome?.raw || item.netIncome || item.netIncomeCommonStockholders?.raw || item.netIncomeCommonStockholders || 0
              };
          });
      };

      const cleanBalance = (arr: any[]) => {
          if (!arr || !Array.isArray(arr)) return [];
          return arr.map((item: any) => {
              let parsedDebt = item.totalDebt?.raw || item.totalDebt || item.longTermDebt?.raw || item.longTermDebt || 0;
              if (parsedDebt === 0) {
                  parsedDebt = (item.shortLongTermDebt?.raw || item.shortLongTermDebt || 0) + (item.longTermDebt?.raw || item.longTermDebt || 0);
              }
              return {
                  year: new Date(item.endDate || item.asOfDate).getFullYear().toString(),
                  totalAssets: item.totalAssets?.raw || item.totalAssets || 0,
                  totalLiabilities: item.totalLiabilitiesNetMinorityInterest?.raw || item.totalLiabilitiesNetMinorityInterest || item.totalLiab?.raw || item.totalLiab || item.totalLiabilities?.raw || item.totalLiabilities || 0,
                  totalEquity: item.totalStockholderEquity?.raw || item.totalStockholderEquity || item.stockholdersEquity?.raw || item.stockholdersEquity || 0,
                  cash: item.totalCashAndShortTermInvestments?.raw || item.totalCashAndShortTermInvestments || item.cashAndCashEquivalents?.raw || item.cashAndCashEquivalents || item.cash?.raw || item.cash || item.totalCash?.raw || item.totalCash || 0,
                  debt: parsedDebt,
                  retainedEarnings: item.retainedEarnings?.raw || item.retainedEarnings || 0
              };
          });
      };
      
      const cleanCashFlow = (arr: any[]) => {
          if (!arr || !Array.isArray(arr)) return [];
          return arr.map((item: any) => {
              let fcf = item.freeCashflow?.raw || item.freeCashflow || item.freeCashFlow?.raw || item.freeCashFlow || 0;
              const ocf = item.operatingCashflow?.raw || item.operatingCashflow || item.totalCashFromOperatingActivities?.raw || item.totalCashFromOperatingActivities || 0;
              if (fcf === 0 && ocf !== 0) fcf = ocf + (item.capitalExpenditures?.raw || item.capitalExpenditures || 0);
              return {
                  year: new Date(item.endDate || item.asOfDate).getFullYear().toString(),
                  freeCashFlow: fcf,
                  operatingCashFlow: ocf
              };
          });
      };

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
        
        incomeStatement: cleanIncome(yahooData.incomeStatementHistory?.incomeStatementHistory || []),
        balanceSheet: cleanBalance(yahooData.balanceSheetHistory?.balanceSheetStatements || []),
        cashFlow: cleanCashFlow(yahooData.cashflowStatementHistory?.cashflowStatements || [])
      };

      if (fundamentals.incomeStatement.length === 0 && fundamentals.balanceSheet.length === 0) {
          console.error("MAPPING FAILED: No data extracted from Yahoo");
      }
    } else if (yahooData && yahooData.isFallback) {
         // Create partial fundamentals from earnings chart
         const incomeSt = yahooData.earningsFallback.map((item: any) => ({
             year: typeof item.date === "number" ? String(item.date) : extractYear(item.date),
             revenue: ext(item.revenue),
             netIncome: ext(item.earnings),
             grossProfit: 0,
             operatingIncome: 0
         }));
         fundamentals = {
            trailingPE: null, forwardPE: null, priceToCashFlow: null, pegRatio: null,
            grossMargin: null, operatingMargin: null, profitMargin: null, fcfMargin: null,
            roe: null, dividendYield: null, beta: null, marketCap: null, totalDebt: null, totalCash: null,
            incomeStatement: incomeSt,
            balanceSheet: [],
            cashFlow: []
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
