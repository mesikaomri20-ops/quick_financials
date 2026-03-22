import { StockData } from "../app/actions";

const MOCK_GOOGL: StockData = {
  quote: {
    symbol: "GOOGL",
    price: 175.42,
    changesPercentage: 1.52,
    companyName: "Alphabet Inc.",
    name: "Alphabet Inc.",
  },
  fundamentals: {
    trailingPE: 26.5,
    forwardPE: 24.1,
    priceToCashFlow: 18.2,
    pegRatio: 1.3,
    grossMargin: 56.4,
    operatingMargin: 28.5,
    profitMargin: 24.1,
    fcfMargin: 20.2,
    roe: 28.4,
    dividendYield: 0.45,
    beta: 1.05,
    marketCap: 2150000000000,
    totalDebt: 29000000000,
    totalCash: 110000000000,
    financials: [
      {
        year: "2023",
        revenue: 307394000000,
        grossProfit: 174000000000,
        operatingIncome: 84293000000,
        netIncome: 73795000000,
        researchAndDevelopment: 45427000000,
        totalAssets: 402392000000,
        totalLiabilities: 119000000000,
        totalEquity: 283392000000,
        cash: 110000000000,
        debt: 29000000000,
        freeCashFlow: 69400000000,
        operatingCashFlow: 101000000000,
        retainedEarnings: 200000000000,
      }
    ]
  },
  quoteRateLimited: false,
  rateLimited: false,
};

const MOCK_AAPL: StockData = {
  quote: {
    symbol: "AAPL",
    price: 189.20,
    changesPercentage: -0.45,
    companyName: "Apple Inc.",
    name: "Apple Inc.",
  },
  fundamentals: {
    trailingPE: 28.5,
    forwardPE: 26.1,
    priceToCashFlow: 22.2,
    pegRatio: 2.3,
    grossMargin: 44.5,
    operatingMargin: 30.5,
    profitMargin: 25.1,
    fcfMargin: 27.2,
    roe: 156.4,
    dividendYield: 0.55,
    beta: 1.25,
    marketCap: 3050000000000,
    totalDebt: 109000000000,
    totalCash: 73000000000,
    financials: [
      {
        year: "2023",
        revenue: 383285000000,
        grossProfit: 170000000000,
        operatingIncome: 114293000000,
        netIncome: 96995000000,
        researchAndDevelopment: 29927000000,
        totalAssets: 352392000000,
        totalLiabilities: 289000000000,
        totalEquity: 62392000000,
        cash: 73000000000,
        debt: 109000000000,
        freeCashFlow: 99400000000,
        operatingCashFlow: 110000000000,
        retainedEarnings: 0,
      }
    ]
  },
  quoteRateLimited: false,
  rateLimited: false,
};

const MOCK_MSFT: StockData = {
  quote: {
    symbol: "MSFT",
    price: 410.22,
    changesPercentage: 2.10,
    companyName: "Microsoft Corp.",
    name: "Microsoft Corp.",
  },
  fundamentals: {
    trailingPE: 35.5,
    forwardPE: 32.1,
    priceToCashFlow: 28.2,
    pegRatio: 2.1,
    grossMargin: 69.5,
    operatingMargin: 44.5,
    profitMargin: 36.1,
    fcfMargin: 32.2,
    roe: 38.4,
    dividendYield: 0.75,
    beta: 0.95,
    marketCap: 3050000000000,
    totalDebt: 79000000000,
    totalCash: 143000000000,
    financials: [
      {
        year: "2023",
        revenue: 211915000000,
        grossProfit: 146000000000,
        operatingIncome: 88523000000,
        netIncome: 72361000000,
        researchAndDevelopment: 27195000000,
        totalAssets: 411976000000,
        totalLiabilities: 205000000000,
        totalEquity: 206000000000,
        cash: 143000000000,
        debt: 79000000000,
        freeCashFlow: 59400000000,
        operatingCashFlow: 87500000000,
        retainedEarnings: 90000000000,
      }
    ]
  },
  quoteRateLimited: false,
  rateLimited: false,
};

export const MOCK_DATABASE: Record<string, StockData> = {
  GOOGL: MOCK_GOOGL,
  AAPL: MOCK_AAPL,
  MSFT: MOCK_MSFT,
};
