"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import yahooFinance from 'yahoo-finance2';
yahooFinance.suppressNotices(['yahooSurvey']);
const FRED_KEY  = "65ab3f80fea063304fc09ecc928ba1a8";
const FRED_BASE = "https://api.stlouisfed.org/fred";

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

export type MacroObservation = {
  date: string;
  value: number;
};

export type MacroIndicator = {
  name: string;
  current: number;
  previous: number;
  change: number;
  history: MacroObservation[];
};

export type MacroData = {
  rates: MacroIndicator;
  inflation: MacroIndicator;
  unemployment: MacroIndicator;
  yield10y: MacroIndicator;
};

export type YieldCurvePoint = {
  maturity: string;
  yield: number;
  label: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const n = (val: any): number => { if (val === null || val === undefined || val === "" || val === "N/A") return 0; const num = Number(val); return isNaN(num) ? 0 : num; };


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
  const docRef = doc(db, "stocks", ticker);
  
  try {
    const docSnap = await getDoc(docRef);
    const data = docSnap.exists() ? docSnap.data() : null;
    const now = Date.now();
    
    const isPriceStale = !data?.lastUpdatedPrice || (now - data.lastUpdatedPrice > 15 * 60 * 1000); // 15 mins
    const isFinancialsStale = !data?.lastUpdatedFinancials || (now - data.lastUpdatedFinancials > 24 * 60 * 60 * 1000); // 24 hours

    if (!data || isPriceStale || isFinancialsStale) {
      const freshData = await fetchStockDataFromAPI(ticker, data, isPriceStale, isFinancialsStale);
      
      if (freshData && !freshData.error && !freshData.rateLimited) {
        const dataToSave = {
          ...freshData,
          lastUpdatedPrice: isPriceStale ? now : data?.lastUpdatedPrice || now,
          lastUpdatedFinancials: isFinancialsStale ? now : data?.lastUpdatedFinancials || now,
        };
        // Save without awaiting to avoid blocking return
        setDoc(docRef, dataToSave, { merge: true }).catch(console.error);
        return freshData as StockData;
      } else {
        // API failed (e.g., rate limit), return stale data if available
        if (data) {
          console.warn(`[API Limit] Returning stale Firestore data for ${ticker}`);
          return data as StockData;
        }
        return freshData; // Error state
      }
    }
    
    return data as StockData;
  } catch (err) {
    console.error(`[Firestore Buffer] Error fetching ${ticker}:`, err);
    return await fetchStockDataFromAPI(ticker, null, true, true);
  }
}

const safePercent = (val: number | null) => {
  if (val === null) return null;
  if (val > 100 || val < -100) return 0;
  return val;
};

async function fetchStockDataFromAPI(
  ticker: string,
  existingData: any,
  fetchQuote: boolean,
  fetchFinancials: boolean
): Promise<any> {
  try {
    const symbol = ticker;
    let quote: any = null;
    let summary: any = null;

    if (fetchQuote) {
      quote = await yahooFinance.quote(symbol);
    }

    if (fetchFinancials) {
      summary = await yahooFinance.quoteSummary(symbol, {
        modules: [
          'price', 
          'summaryDetail', 
          'financialData', 
          'defaultKeyStatistics',
          'incomeStatementHistory',
          'balanceSheetHistory',
          'cashflowStatementHistory'
        ]
      });
    }

    const freshStockData: any = existingData ? { ...existingData } : {
      quote: { symbol: ticker, price: 0, changesPercentage: 0 },
      fundamentals: {
        financials: []
      }
    };

    if (fetchQuote && quote) {
      freshStockData.quote.price = quote.regularMarketPrice || freshStockData.quote.price;
      freshStockData.quote.changesPercentage = quote.regularMarketChangePercent || freshStockData.quote.changesPercentage;
      if (quote.shortName || quote.longName) {
        freshStockData.quote.companyName = quote.shortName || quote.longName;
        freshStockData.quote.name = quote.shortName || quote.longName;
      }
    }

    if (fetchFinancials && summary) {
       const sd = summary.summaryDetail || {};
       const fd = summary.financialData || {};
       const ks = summary.defaultKeyStatistics || {};
       const priceMod = summary.price || {};
       
       if (!freshStockData.quote.companyName) {
           freshStockData.quote.companyName = priceMod.shortName || priceMod.longName || ticker;
           freshStockData.quote.name = priceMod.shortName || priceMod.longName || ticker;
       }

       freshStockData.fundamentals = {
          trailingPE: sd.trailingPE || null,
          forwardPE: sd.forwardPE || null,
          priceToCashFlow: null,
          pegRatio: ks.pegRatio || null,
          grossMargin: fd.grossMargins ? safePercent(fd.grossMargins * 100) : null,
          operatingMargin: fd.operatingMargins ? safePercent(fd.operatingMargins * 100) : null,
          profitMargin: fd.profitMargins ? safePercent(fd.profitMargins * 100) : null,
          fcfMargin: null,
          roe: fd.returnOnEquity ? safePercent(fd.returnOnEquity * 100) : null,
          dividendYield: sd.dividendYield ? safePercent(sd.dividendYield * 100) : null,
          beta: sd.beta || null,
          marketCap: priceMod.marketCap || sd.marketCap || null,
          totalDebt: fd.totalDebt || null,
          totalCash: fd.totalCash || null,
          financials: existingData?.fundamentals?.financials || []
       };

       if (summary.incomeStatementHistory && summary.balanceSheetHistory && summary.cashflowStatementHistory) {
           const is = summary.incomeStatementHistory.incomeStatementHistory || [];
           const bs = summary.balanceSheetHistory.balanceSheetStatements || [];
           const cs = summary.cashflowStatementHistory.cashflowStatements || [];
           
           const yearsMap = new Map<string, any>();
           
           is.forEach((statement: any) => {
               if (!statement.endDate) return;
               const year = new Date(statement.endDate).getFullYear().toString();
               if (!yearsMap.has(year)) yearsMap.set(year, { year });
               const row = yearsMap.get(year);
               row.revenue = statement.totalRevenue;
               row.grossProfit = statement.grossProfit;
               row.operatingIncome = statement.operatingIncome;
               row.netIncome = statement.netIncome;
               row.researchAndDevelopment = statement.researchDevelopment || 0;
           });
           
           bs.forEach((statement: any) => {
               if (!statement.endDate) return;
               const year = new Date(statement.endDate).getFullYear().toString();
               if (!yearsMap.has(year)) yearsMap.set(year, { year });
               const row = yearsMap.get(year);
               row.totalAssets = statement.totalAssets;
               row.totalLiabilities = statement.totalLiab;
               row.totalEquity = statement.totalStockholderEquity;
               row.cash = statement.cash || statement.cashAndCashEquivalents || 0;
               row.debt = statement.shortLongTermDebt || statement.longTermDebt || 0;
               row.retainedEarnings = statement.retainedEarnings || 0;
           });

           cs.forEach((statement: any) => {
               if (!statement.endDate) return;
               const year = new Date(statement.endDate).getFullYear().toString();
               if (!yearsMap.has(year)) yearsMap.set(year, { year });
               const row = yearsMap.get(year);
               row.operatingCashFlow = statement.totalCashFromOperatingActivities || 0;
               row.freeCashFlow = (statement.totalCashFromOperatingActivities || 0) + (statement.capitalExpenditures || 0);
           });
           
           const financialArr = Array.from(yearsMap.values()).sort((a,b) => parseInt(a.year) - parseInt(b.year));
           freshStockData.fundamentals.financials = financialArr;
       }
    }

    freshStockData.rateLimited = false;
    freshStockData.quoteRateLimited = false;
    
    return freshStockData;
  } catch (e: any) {
    console.error(`[fetchStockDataFromAPI] Error for ${ticker}:`, e.message);
    return { error: 'Yahoo Finance parsing failed', rateLimited: false, symbol: ticker };
  }
}

export async function getFinancialData(
  symbol: string,
  period: Period = "annual"
): Promise<YahooFundamentals | null> {
  const data = await getStockData(symbol, period);
  return data?.fundamentals || null;
}

// ─── Macro Data (FRED) ──────────────────────────────────────────────────────

function cleanMacroData(data: MacroObservation[]): MacroObservation[] {
  if (data.length < 2) return data;
  const cleaned: MacroObservation[] = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const prev = cleaned[cleaned.length - 1];
    
    // 1. Absolute zero check for financial rates (usually an error if it's a single point)
    if (current.value === 0 && prev.value > 0.1) continue;
    
    // 2. 50% Deviation Check (Outlier Detection)
    // If a value drops or spikes by more than 50% in a single monthly observation,
    // it's statistically highly unlikely for these macro metrics.
    const diff = Math.abs(current.value - prev.value);
    const threshold = Math.abs(prev.value) * 0.5;
    
    if (diff > threshold && prev.value !== 0) {
      // Skip this anomalous point
      console.warn(`[Macro Clean] Removing outlier at ${current.date}: ${current.value} (Prev: ${prev.value})`);
      continue;
    }
    
    cleaned.push(current);
  }
  return cleaned;
}

async function fetchFred(seriesId: string): Promise<MacroObservation[]> {
  try {
    const url = `${FRED_BASE}/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=100`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.observations || []).map((obs: any) => ({
      date: obs.date,
      value: parseFloat(obs.value) || 0
    })).reverse();
  } catch (e) {
    console.error(`[FRED] Error fetching ${seriesId}:`, e);
    return [];
  }
}

export async function getMacroData(): Promise<MacroData | null> {
  try {
    const [fedFunds, cpi, unrate, dgs10] = await Promise.all([
      fetchFred("FEDFUNDS"),
      fetchFred("CPIAUCSL"),
      fetchFred("UNRATE"),
      fetchFred("DGS10")
    ]);

    const processIndicator = (name: string, data: MacroObservation[]) => {
      const latest = data[data.length - 1];
      const prev = data[data.length - 2];
      return {
        name,
        current: latest?.value || 0,
        previous: prev?.value || 0,
        change: latest && prev ? latest.value - prev.value : 0,
        history: data.slice(-60) // Last 5 years (monthly data)
      };
    };

    // Calculate YoY Inflation for CPI
    const inflationHistory: MacroObservation[] = [];
    for (let i = 12; i < cpi.length; i++) {
      const current = cpi[i];
      const past = cpi[i - 12];
      const yoy = ((current.value / past.value) - 1) * 100;
      inflationHistory.push({ date: current.date, value: yoy });
    }

    return {
      rates: processIndicator("Fed Funds Rate", cleanMacroData(fedFunds)),
      inflation: processIndicator("Inflation (CPI YoY)", cleanMacroData(inflationHistory)),
      unemployment: processIndicator("Unemployment Rate", cleanMacroData(unrate)),
      yield10y: processIndicator("10Y Treasury Yield", cleanMacroData(dgs10))
    };
  } catch (e) {
    console.error("[Macro] Error state:", e);
    return null;
  }
}

export async function getYieldCurveData(): Promise<YieldCurvePoint[]> {
  const series = [
    { id: "DTB3", label: "3M" },
    { id: "DGS1",  label: "1Y" },
    { id: "DGS2",  label: "2Y" },
    { id: "DGS5",  label: "5Y" },
    { id: "DGS10", label: "10Y" },
    { id: "DGS20", label: "20Y" },
    { id: "DGS30", label: "30Y" },
  ];

  try {
    const results = await Promise.all(
      series.map(async (s) => {
        const url = `${FRED_BASE}/series/observations?series_id=${s.id}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=1`;
        const res = await fetch(url, { 
          next: { revalidate: 3600 },
          cache: "no-store" 
        });
        if (!res.ok) return { maturity: s.label, yield: 0, label: s.label };
        const data = await res.json();
        const val = parseFloat(data.observations?.[0]?.value) || 0;
        return { maturity: s.label, yield: val, label: s.label };
      })
    );
    return results;
  } catch (e) {
    console.error("[YieldCurve] Error:", e);
    return [];
  }
}

export async function getMarketOverview(): Promise<{ rateLimited: boolean; data: StockQuote[] }> {
  try {
    const symbols = ["SPY", "QQQ", "GLD"];
    const quotes: StockQuote[] = [];
    let rateLimited = false;
    
    for (const sym of symbols) {
      const res = await getStockData(sym);
      if (res && res.rateLimited) rateLimited = true;
      if (res && res.quote && res.quote.price > 0) quotes.push(res.quote);
    }

    return { rateLimited, data: quotes };
  } catch (e) {
    return { rateLimited: false, data: [] };
  }
}

export async function getBulkQuotes(symbols: string[]): Promise<{ rateLimited: boolean; data: StockQuote[] }> {
  if (!symbols || symbols.length === 0) return { rateLimited: false, data: [] };
  try {
    const quotes: StockQuote[] = [];
    let rateLimited = false;
    
    for (const sym of symbols) {
      const res = await getStockData(sym);
      if (res && res.rateLimited) rateLimited = true;
      if (res && res.quote && res.quote.price > 0) quotes.push(res.quote);
    }

    return { rateLimited, data: quotes };
  } catch (e) {
    return { rateLimited: false, data: [] };
  }
}

export async function getDashboardData(watchlistSymbols: string[]) {
  // Serialized forcing to respect strict API limits underneath
  const overviewRes = await getMarketOverview();
  const watchlistRes = await getBulkQuotes(watchlistSymbols);

  return {
    rateLimited: overviewRes.rateLimited || watchlistRes.rateLimited,
    overview: overviewRes.data,
    watchlist: watchlistRes.data
  };
}
