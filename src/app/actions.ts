"use server";

const ALPHA_KEY = process.env.ALPHAVANTAGE_API_KEY || "demo";
const ALPHA_BASE = "https://www.alphavantage.co/query";
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
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function alphaSafe(func: string, params: Record<string, string>, cacheOptions: RequestInit = { cache: "no-store" }): Promise<any> {
  const keySnippet = ALPHA_KEY ? ALPHA_KEY.slice(0, 5) + '...' : 'NONE';
  console.log('Using Alpha Key:', keySnippet);
  try {
    const qs = new URLSearchParams({ function: func, apikey: ALPHA_KEY, ...params }).toString();
    const url = `${ALPHA_BASE}?${qs}`;
    console.log('Alpha URL:', url.replace(ALPHA_KEY, '***')); 
    
    const res = await fetch(url, cacheOptions);
    if (!res.ok) {
      const text = await res.text();
      return { _error: res.status, message: text };
    }
    const json = await res.json();
    if (json.Information && json.Information.includes('rate limit')) {
      console.warn("AlphaVantage Rate Limit Reached:", json.Information);
      return { _error: 429, message: "Rate limit exceeded" };
    }
    if (json["Error Message"]) {
      return { _error: 400, message: json["Error Message"] };
    }
    return json;
  } catch (e: any) {
    console.error(`[AlphaVantage] Error fetching ${func}:`, e.message);
    return { _error: 500, message: e.message };
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

  try {
    const quoteData = await alphaSafe("GLOBAL_QUOTE", { symbol: ticker });
    await sleep(12000); // 12 seconds sleep to strict respect 5 req/min Alpha Limit
    const overviewData = await alphaSafe("OVERVIEW", { symbol: ticker });
    
    if (quoteData._error || overviewData._error) {
      const errObj = quoteData._error ? quoteData : overviewData;
      if (errObj._error === 429) {
        return { error: 'Daily Data Limit Reached', rateLimited: true, symbol: ticker } as any;
      }
      return { error: errObj.message || 'API Error', symbol: ticker } as any;
    }

    const gq = quoteData["Global Quote"] || {};
    const price = n(gq["05. price"]);
    const changePctStr = gq["10. change percent"] || "";
    const changesPercentage = n(changePctStr.replace("%", ""));

    const ov = overviewData || {};
    const profileName = ov.Name || ticker;

    if (!gq["05. price"] && !ov.Name) {
      console.error(`[getStockData] All fetches failed or empty for ${ticker}.`);
      return { error: 'No data returned from AlphaVantage', symbol: ticker } as any;
    }

    const grossMargin = ov.GrossProfitTTM && ov.RevenueTTM ? (n(ov.GrossProfitTTM) / n(ov.RevenueTTM)) * 100 : null;

    const safePercent = (val: number | null) => {
      if (val === null) return null;
      if (val > 100 || val < -100) return 0;
      return val;
    };

    return {
      quote: {
        symbol: ticker,
        price,
        changesPercentage,
        companyName: profileName,
        name: profileName,
      },
      fundamentals: {
        trailingPE: n(ov.TrailingPE) || null,
        forwardPE: n(ov.ForwardPE) || null,
        priceToCashFlow: null,
        pegRatio: n(ov.PEGRatio) || null,
        grossMargin: safePercent(grossMargin),
        operatingMargin: safePercent(n(ov.OperatingMarginTTM) ? n(ov.OperatingMarginTTM) * 100 : null),
        profitMargin: safePercent(n(ov.ProfitMargin) ? n(ov.ProfitMargin) * 100 : null),
        fcfMargin: null,
        roe: safePercent(n(ov.ReturnOnEquityTTM) ? n(ov.ReturnOnEquityTTM) * 100 : null),
        dividendYield: safePercent(n(ov.DividendYield) ? n(ov.DividendYield) * 100 : null),
        beta: n(ov.Beta) || null,
        marketCap: n(ov.MarketCapitalization) || null,
        totalDebt: null,
        totalCash: null,
        financials: []
      },
      quoteRateLimited: false,
      rateLimited: false
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
    const symbols = ["SPY", "QQQ", "GLD", "BTCUSD"];
    const quotes: StockQuote[] = [];
    
    for (const sym of symbols) {
      if (sym === "BTCUSD") {
         const res = await alphaSafe("CURRENCY_EXCHANGE_RATE", { from_currency: "BTC", to_currency: "USD" }, { next: { revalidate: 3600 } });
         if (res && res._error === 429) return { rateLimited: true, data: [] };
         const ex = res["Realtime Currency Exchange Rate"];
         if (ex) {
           quotes.push({
             symbol: sym,
             price: n(ex["5. Exchange Rate"]),
             changesPercentage: 0, 
           });
         }
      } else {
         const res = await alphaSafe("GLOBAL_QUOTE", { symbol: sym }, { next: { revalidate: 3600 } });
         if (res && res._error === 429) return { rateLimited: true, data: [] };
         const gq = res["Global Quote"];
         if (gq && gq["05. price"]) {
           quotes.push({
             symbol: sym,
             price: n(gq["05. price"]),
             changesPercentage: n((gq["10. change percent"] || "").replace("%", ""))
           });
         }
      }
      // Extremely strict sleep spacing for AlphaVantage limitations inside loops
      await sleep(12000); 
    }

    return { rateLimited: false, data: quotes };
  } catch (e) {
    return { rateLimited: false, data: [] };
  }
}

export async function getBulkQuotes(symbols: string[]): Promise<{ rateLimited: boolean; data: StockQuote[] }> {
  if (!symbols || symbols.length === 0) return { rateLimited: false, data: [] };
  try {
    const quotes: StockQuote[] = [];
    
    for (const sym of symbols) {
      const res = await alphaSafe("GLOBAL_QUOTE", { symbol: sym }, { next: { revalidate: 3600 } });
      if (res && res._error === 429) return { rateLimited: true, data: [] };
      const gq = res["Global Quote"];
      if (gq && gq["05. price"]) {
        quotes.push({
          symbol: sym,
          price: n(gq["05. price"]),
          changesPercentage: n((gq["10. change percent"] || "").replace("%", ""))
        });
      }
      await sleep(12000); 
    }

    return { rateLimited: false, data: quotes };
  } catch (e) {
    return { rateLimited: false, data: [] };
  }
}
