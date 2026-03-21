"use server";

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

/** 
 * Ultra-minimal fetch for Hard Reset 
 */
export async function getStockData(symbol: string): Promise<StockData | null> {
  const ticker = symbol.toUpperCase().trim();
  const API_KEY = "LU2KvGFffEm1ChIVE6iFBZTGLzxUp6Jm";
  
  try {
    const url = `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${API_KEY}`;
    console.log(`[FMP] Fetching quote for ${ticker}...`);
    
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    
    const json = await res.json();
    const q = json[0];
    if (!q) return null;

    return {
      quote: {
        symbol: q.symbol,
        price: q.price || 0,
        changesPercentage: q.changesPercentage || 0,
        companyName: q.name || q.symbol,
        name: q.name || q.symbol
      },
      fundamentals: {
        trailingPE: q.pe || null,
        forwardPE: null,
        priceToCashFlow: null,
        pegRatio: null,
        grossMargin: null,
        operatingMargin: null,
        profitMargin: null,
        fcfMargin: null,
        roe: null,
        dividendYield: null,
        beta: null,
        marketCap: q.marketCap || null,
        totalDebt: null,
        totalCash: null,
        financials: [],
      }
    };
  } catch (e) {
    console.error(`[FMP] Error fetching ${ticker}:`, e);
    return null;
  }
}
