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
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    console.error("ALPHAVANTAGE_API_KEY is not defined.");
    return null;
  }
  
  console.log(`Fetching data for ${symbol}...`);

  try {
    const alphaPromise = fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
      { cache: 'no-store' }
    ).then(res => res.ok ? res.json() : null);

    const yahooPromise = (async () => {
      try {
        return await yahooFinance.quoteSummary(symbol, { 
          modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics', 'incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory', 'earningsTrend'] 
        } as any);
      } catch (e: any) {
        console.error("Yahoo Finance Error:", e);
        return null;
      }
    })();

    const [quoteData, yahooData] = await Promise.all([alphaPromise, yahooPromise]);

    let quote: StockQuote | null = null;
    let quoteRateLimited = false;

    if (quoteData) {
      if (quoteData["Global Quote"] && Object.keys(quoteData["Global Quote"]).length > 0) {
        const gQuote = quoteData["Global Quote"];
        const changePercentStr = gQuote["10. change percent"] || "0%";
        quote = {
          symbol: gQuote["01. symbol"],
          price: parseFloat(gQuote["05. price"]),
          changesPercentage: parseFloat(changePercentStr.replace("%", "")),
        };
      } else if (quoteData["Information"] || quoteData["Note"] || quoteData["Error Message"]) {
        console.warn(`AlphaVantage API Rate Limited for ${symbol}`);
        quoteRateLimited = true;
      }
    }

    let fundamentals: YahooFundamentals | null = null;
    if (yahooData) {
      console.log("RAW INCOME:", JSON.stringify(yahooData.incomeStatementHistory?.incomeStatementHistory?.[0] || {}, null, 2));
      console.log("RAW BALANCE:", JSON.stringify(yahooData.balanceSheetHistory?.balanceSheetStatements?.[0] || {}, null, 2));
       const summary: any = yahooData.summaryDetail || {};
       const financial: any = yahooData.financialData || {};
       const stats: any = yahooData.defaultKeyStatistics || {};
       
       const price = summary.previousClose || 1;
       const shares = stats.sharesOutstanding || 1;
       const operatingCF = financial.operatingCashflow || 0;
       
       let priceToCashFlow = null;
       if (operatingCF > 0 && shares > 0) {
           priceToCashFlow = price / (operatingCF / shares);
       }

       let fcfMargin = null;
       const freeCashflow = financial.freeCashflow || 0;
       const totalRevenue = financial.totalRevenue || 0;
       if (totalRevenue > 0) {
           fcfMargin = freeCashflow / totalRevenue;
       }

       console.log("DEBUG - Yahoo Data:", JSON.stringify({ summary, stats }, null, 2));

       let pegRatioRaw = stats.pegRatio || stats.priceToEarningsGrowth || summary.pegRatio || summary.priceToEarningsGrowth;
       let pegRatio = pegRatioRaw;
       
       if (pegRatio !== null && typeof pegRatio === 'object') {
           pegRatio = pegRatio.raw ?? pegRatio.fmt ?? null;
       }

       if (!pegRatio) {
           try {
               const trends = yahooData.earningsTrend?.trend || [];
               const fiveYearTrend = trends.find((t: any) => t.period === '+5y' || t.period === '5y');
               
               let growthRate: any = fiveYearTrend?.growth;
               if (growthRate !== null && typeof growthRate === 'object' && growthRate.raw !== undefined) {
                   growthRate = growthRate.raw;
               }

               let forwardPeValue: any = summary.forwardPE;
               if (forwardPeValue !== null && typeof forwardPeValue === 'object' && forwardPeValue.raw !== undefined) {
                   forwardPeValue = forwardPeValue.raw;
               }
               
               if (growthRate && forwardPeValue) {
                   pegRatio = forwardPeValue / (growthRate * 100);
                   console.log("Calculated PEG from 5y Earnings Trend:", pegRatio);
               } else if (financial.earningsGrowth) {
                   let eg: any = financial.earningsGrowth;
                   if (typeof eg === 'object' && eg.raw !== undefined) eg = eg.raw;
                   if (eg && forwardPeValue) {
                       pegRatio = forwardPeValue / (eg * 100);
                       console.log("Calculated PEG from Financial Earnings Growth:", pegRatio);
                   }
               }
           } catch (e) {
               console.error("Error calculating PEG fallback:", e);
           }
       }

       if (!pegRatio && apiKey) {
           try {
               const overviewRes = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`, { cache: 'no-store' });
               if (overviewRes.ok) {
                   const overviewData = await overviewRes.json();
                   if (overviewData && overviewData.PEGRatio && overviewData.PEGRatio !== "None") {
                       pegRatio = parseFloat(overviewData.PEGRatio);
                   }
               }
           } catch (e) {
               console.error("AlphaVantage PEG fallback failed", e);
           }
       }

       fundamentals = {
         trailingPE: summary.trailingPE || null,
         forwardPE: summary.forwardPE || null,
         priceToCashFlow: priceToCashFlow,
         pegRatio: pegRatio || null,
         
         grossMargin: financial.grossMargins || null,
         operatingMargin: financial.operatingMargins || null,
         profitMargin: financial.profitMargins || null,
         fcfMargin: fcfMargin,

         roe: financial.returnOnEquity || null,
         dividendYield: summary.dividendYield || null,
         beta: stats.beta || summary.beta || null,
         marketCap: summary.marketCap || (price * shares) || null,
         totalDebt: financial.totalDebt || null,
         totalCash: financial.totalCash || null,
         
         incomeStatement: yahooData.incomeStatementHistory?.incomeStatementHistory || [],
         balanceSheet: yahooData.balanceSheetHistory?.balanceSheetStatements || [],
         cashFlow: yahooData.cashflowStatementHistory?.cashflowStatements || []
       };
    }

    if (!quote && !fundamentals) {
        return null; 
    }

    return { quote, fundamentals, quoteRateLimited };
  } catch (error) {
    console.error("Exception during fetch:", error);
    return null;
  }
}
