"use server";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import YahooFinance from 'yahoo-finance2';
const yf = new YahooFinance();
const FRED_KEY  = "65ab3f80fea063304fc09ecc928ba1a8";
const FRED_BASE = "https://api.stlouisfed.org/fred";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Stock {
  symbol: string;
  price: number;
  changesPercentage: number;
  companyName?: string;
  name?: string;
  image?: string;
  marketCap: number;
  totalCash: number;
  totalDebt: number;
  trailingPE: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  roe: number | null;
  dividendYield: number | null;
  beta: number | null;
  annualFinancials: any[];
  quarterlyFinancials: any[];
  error?: string;
}

export type Period = "annual" | "quarter";

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
  annualFinancials?: FinancialYearData[];
  quarterlyFinancials?: FinancialYearData[];
  financials: FinancialYearData[];
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

const extractRaw = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val.raw !== undefined) return val.raw;
  return parseFloat(val) || 0;
};


function rowLabel(row: any, period: Period): string {
  if (!row.date) return "N/A";
  const date = new Date(row.date);
  const year = date.getFullYear().toString();
  
  if (period === "quarter") {
    // If we have an explicit period (like Q1) use it, otherwise calculate from month
    let q = row.period ? String(row.period) : "";
    if (!q.startsWith("Q")) {
        const month = date.getMonth();
        q = `Q${Math.floor(month / 3) + 1}`;
    }
    return `${q} ${year}`;
  }
  return year;
}

// ─── Main Export ───────────────────────────────────────────────────────────

export async function getStockData(
  symbol: string,
  period: Period = "annual"
): Promise<Stock | null> {
  const ticker = symbol.toUpperCase().trim();
  const docRef = doc(db, "stocks", ticker);
  
  try {
    // FORCE BYPASS FIRESTORE FOR DIAGNOSTIC
    return await fetchStockDataFromAPI(ticker, null, true, true, period);
  } catch (err) {
    console.error(`[Firestore Buffer] Error fetching ${ticker}:`, err);
    return await fetchStockDataFromAPI(ticker, null, true, true, period);
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
  fetchFinancials: boolean,
  period: Period
): Promise<any> {
    const symbol = ticker;
    // 1. Fresh Instance Inside the Action
    const yf = new YahooFinance();
    
    try {
        console.log('--- DIAGNOSTIC START ---', symbol);
        // 2 Fetch Everything
        const [results, quoteData]: any[] = await Promise.all([
            yf.quoteSummary(symbol, { modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics'] }).catch(() => ({})),
            yf.quote(symbol).catch(() => null)
        ]);

        // 3. Logic Check Logs
        console.log('DEBUG - Raw Cash:', results.financialData?.totalCash);
        console.log('DEBUG - Raw PE:', results.summaryDetail?.trailingPE);

        const priceMod = results.price || {};
        const sd = results.summaryDetail || {};
        const fd = results.financialData || {};
        const ks = results.defaultKeyStatistics || {};

        // 4 & 5. Flatten the Return (processedData)
        const processedData: any = {
          symbol: ticker,
          price: quoteData?.regularMarketPrice || priceMod.regularMarketPrice?.raw || priceMod.regularMarketPrice || 0,
          changesPercentage: quoteData?.regularMarketChangePercent || priceMod.regularMarketChangePercent?.raw || 0,
          companyName: quoteData?.shortName || priceMod.shortName || priceMod.longName || ticker,
          name: quoteData?.shortName || ticker,
          
          marketCap: sd.marketCap?.raw || priceMod.marketCap?.raw || 0,
          totalCash: fd.totalCash?.raw || 0,
          totalDebt: fd.totalDebt?.raw || 0,
          trailingPE: sd.trailingPE?.raw || sd.trailingPE || 0,
          forwardPE: sd.forwardPE?.raw || sd.forwardPE || 0,
          pegRatio: ks.pegRatio?.raw || 0,
          grossMargin: (fd.grossMargins?.raw || 0) * 100,
          operatingMargin: (fd.operatingMargins?.raw || 0) * 100,
          roe: (fd.returnOnEquity?.raw || 0) * 100,
          dividendYield: (sd.dividendYield?.raw || 0) * 100,
          beta: sd.beta?.raw || null,
          
          annualFinancials: [],
          quarterlyFinancials: []
        };

        return processedData;
    } catch (e: any) {
        console.error(`[Flat Fetch] Error for ${ticker}:`, e.message);
        return { error: 'Yahoo Finance flat fetch failed', symbol: ticker };
    }
}

export async function getFinancialData(
  symbol: string,
  period: Period = "annual"
): Promise<any> {
  const data = await getStockData(symbol, period);
  return data; // Now returns flat object
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

export async function getMarketOverview(): Promise<{ rateLimited: boolean; data: Stock[] }> {
  try {
    const symbols = ["SPY", "QQQ", "GLD"];
    const quotes: Stock[] = [];
    let rateLimited = false;
    
    for (const sym of symbols) {
      const res = await getStockData(sym);
      if (res && res.error === 'rate-limited') rateLimited = true;
      if (res && res.price > 0) quotes.push(res);
    }

    return { rateLimited, data: quotes };
  } catch (e) {
    return { rateLimited: false, data: [] };
  }
}

export async function getBulkQuotes(symbols: string[]): Promise<{ rateLimited: boolean; data: Stock[] }> {
  if (!symbols || symbols.length === 0) return { rateLimited: false, data: [] };
  try {
    const quotes: Stock[] = [];
    let rateLimited = false;
    
    for (const sym of symbols) {
      const res = await getStockData(sym);
      if (res && res.error === 'rate-limited') rateLimited = true;
      if (res && res.price > 0) quotes.push(res);
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
