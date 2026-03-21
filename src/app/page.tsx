"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { getStockData, analyzeStock, type StockData, type Period } from "./actions";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';

// ─── Formatters ────────────────────────────────────────────────────────────

function formatValue(
  val: string | number | null | undefined,
  formatType: 'number' | 'percent' | 'large' | 'date' = 'number'
) {
  if (val === null || val === undefined || val === "None" || val === "0" || val === "-" || val === "NaN") return "-";
  if (formatType === 'date') return val.toString();
  const num = Number(val);
  if (isNaN(num)) return val.toString();
  if (formatType === 'percent') return (num * 100).toFixed(1) + "%";
  if (formatType === 'large') {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9)  return (num / 1e9).toFixed(2)  + "B";
    if (num >= 1e6)  return (num / 1e6).toFixed(2)  + "M";
    return num.toLocaleString();
  }
  return num.toFixed(2);
}

// ─── Home ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [tickerInput, setTickerInput] = useState("");
  const [currentTicker, setCurrentTicker] = useState("AAPL");
  const [period, setPeriod] = useState<Period>("annual");
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  // Prevent concurrent fetches (rapid toggle / double-click)
  const fetchingRef = useRef(false);

  const fetchData = async (symbol: string, p: Period) => {
    if (fetchingRef.current) { console.log("[UI] fetch already in progress — skipping"); return; }
    fetchingRef.current = true;
    setLoading(true);
    setError(false);
    setRateLimited(false);
    setAiAnalysis(null); // Clear previous AI analysis on new search
    try {
      const result = await getStockData(symbol, p);
      if (result?.rateLimited) {
        setRateLimited(true);
        setData(null);
      } else if (result && (result.quote || result.fundamentals)) {
        setData(result);
      } else {
        setData(null);
        setError(true);
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Re-fetch when ticker OR period changes
  useEffect(() => { fetchData(currentTicker, period); }, [currentTicker, period]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (tickerInput.trim()) {
      setCurrentTicker(tickerInput.trim().toUpperCase());
      setTickerInput("");
    }
  };

  const handleGenerateAI = async () => {
    if (!data || aiLoading) return;
    setAiLoading(true);
    const result = await analyzeStock(data);
    setAiAnalysis(result);
    setAiLoading(false);
  };

  const quote = data?.quote;
  const fundamentals = data?.fundamentals;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center p-8 text-white">

      {/* Search Bar */}
      <div className="w-full max-w-4xl mb-8 flex justify-center mt-10">
        <form onSubmit={handleSearch} className="flex space-x-2 w-full max-w-md">
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            placeholder="Search ticker (e.g. NVDA)"
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white placeholder-gray-500 transition-all font-medium tracking-wide shadow-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-900/20 flex items-center gap-2"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : null}
            {loading ? "Loading…" : "Search"}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="w-full max-w-4xl flex flex-col items-center">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-sm w-full mb-8 min-h-[220px] flex items-center justify-center animate-pulse">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-8 w-20 bg-gray-800 rounded"></div>
              <div className="h-12 w-32 bg-gray-800 rounded"></div>
              <div className="h-6 w-24 bg-gray-800 rounded"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full animate-pulse px-4 md:px-0">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-900 border border-gray-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      ) : rateLimited ? (
        <div className="text-amber-400 bg-amber-950/30 p-6 rounded-2xl border border-amber-900 max-w-md w-full text-center mt-8 shadow-xl">
          <svg className="w-10 h-10 mx-auto mb-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-bold text-lg">Rate limit reached</p>
          <p className="text-sm mt-2 text-amber-500/80">FMP API returned 429. Please wait 1 minute and try again.</p>
        </div>
      ) : error || (!quote && !fundamentals) ? (
        <div className="text-red-400 bg-red-950/30 p-6 rounded-2xl border border-red-900 max-w-md w-full text-center mt-8 shadow-xl">
          <p className="font-medium text-lg">Failed to load data for {currentTicker}</p>
          <p className="text-sm mt-2 text-red-500/80">The APIs may be rate-limited or the ticker is invalid.</p>
        </div>
      ) : (
        <div className="w-full max-w-4xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">

          {/* Quote Card */}
          {quote ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mb-12 transform transition-all hover:scale-[1.02] duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full filter blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-500/10 transition-colors duration-500 pointer-events-none"></div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  {quote.symbol}
                </h1>
                <span className="text-xs font-bold text-gray-400 px-3 py-1.5 bg-gray-800/80 rounded-lg uppercase tracking-wider shadow-inner">
                  Quote
                </span>
              </div>
              <div className="flex flex-col space-y-5 relative z-10">
                <div className="flex justify-between items-end">
                  <span className="text-gray-500 text-sm font-medium mb-1">Price</span>
                  <span className="text-5xl font-black tracking-tight">${quote.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-800/50 mt-2">
                  <span className="text-gray-500 text-sm font-medium">24h Change</span>
                  <span className={`text-xl font-bold flex items-center ${quote.changesPercentage >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {quote.changesPercentage >= 0 ? (
                      <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                      </svg>
                    )}
                    {quote.changesPercentage > 0 ? "+" : ""}
                    {quote.changesPercentage.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ) : data?.quoteRateLimited ? (
            <div className="bg-gray-900 border-2 border-dashed border-rose-900/40 rounded-2xl p-6 max-w-sm w-full mb-12 flex flex-col items-center justify-center text-center shadow-lg">
              <p className="text-gray-300 font-bold tracking-wide">Price server busy</p>
              <p className="text-gray-500 text-sm mt-1">Showing fundamental data only</p>
            </div>
          ) : null}

          {/* Fundamentals */}
          {fundamentals && (
            <div className="w-full mb-16 animate-in slide-in-from-bottom-5 duration-700" dir="rtl">

              {/* Section A: Multipliers */}
              <div className="mb-6 bg-gray-900/40 p-5 rounded-2xl border border-gray-800/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500/80"></div>
                <h3 className="text-lg font-bold text-gray-200 mb-4 flex items-center">
                  <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-md text-sm font-semibold tracking-wide shadow-sm ml-3">מכפילים (Multipliers)</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  <StatCard label="מכפיל רווח נוכחי" value={formatValue(fundamentals.trailingPE)} />
                  <StatCard label="מכפיל רווח עתידי" value={formatValue(fundamentals.forwardPE)} />
                  <StatCard label="מכפיל תזרים" value={formatValue(fundamentals.priceToCashFlow)} />
                  <StatCard label="מכפיל PEG" value={formatValue(fundamentals.pegRatio)} />
                </div>
              </div>

              {/* Section B: Margins */}
              <div className="mb-6 bg-gray-950/60 p-5 rounded-2xl border border-gray-800/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-blue-500/60"></div>
                <h3 className="text-lg font-bold text-gray-200 mb-4">
                  <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-md text-sm font-semibold tracking-wide shadow-sm ml-3">שולי רווח ורווחיות (Margins)</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  <StatCard label="שולי רווח גולמי"   value={formatValue(fundamentals.grossMargin, 'percent')} />
                  <StatCard label="שולי רווח תפעולי" value={formatValue(fundamentals.operatingMargin, 'percent')} />
                  <StatCard label="שולי רווח נקי"    value={formatValue(fundamentals.profitMargin, 'percent')} />
                  <StatCard label="שולי תזרים חופשי" value={formatValue(fundamentals.fcfMargin, 'percent')} />
                  <StatCard label="ROE"               value={formatValue(fundamentals.roe, 'percent')} />
                </div>
              </div>

              {/* Section C: Health */}
              <div className="mb-6 bg-gray-900/30 p-5 rounded-2xl border border-gray-800/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-purple-500/60"></div>
                <h3 className="text-lg font-bold text-gray-200 mb-4">
                  <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-md text-sm font-semibold tracking-wide shadow-sm ml-3">נתוני חברה וחוסן (Health)</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  <StatCard label="שווי שוק"    value={formatValue(fundamentals.marketCap, 'large')} prefix="$" />
                  <StatCard label="סך חוב"       value={formatValue(fundamentals.totalDebt, 'large')} prefix="$" />
                  <StatCard label="מזומנים"      value={formatValue(fundamentals.totalCash, 'large')} prefix="$" />
                  <StatCard label="בטא (Beta)"   value={formatValue(fundamentals.beta)} />
                  <StatCard label="אחוז דיבידנד" value={
                    !fundamentals.dividendYield || fundamentals.dividendYield === 0
                      ? "החברה לא מחלקת דיבידנד"
                      : formatValue(fundamentals.dividendYield, 'percent')
                  } />
                </div>
              </div>
            </div>
          )}

          {/* Charts */}
          {fundamentals && (
            <div className="w-full px-4 md:px-0 mb-20 animate-in slide-in-from-bottom-6 duration-1000" dir="rtl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-200 pr-4 border-r-4 border-emerald-500 bg-gray-900/40 py-2 rounded-l-xl shadow-sm font-sans">
                  Financials &amp; Charts (דוחות פיננסיים)
                </h2>

                {/* Annual / Quarterly Toggle */}
                <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-1 shadow-inner" dir="ltr">
                  <button
                    onClick={() => setPeriod("annual")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      period === "annual"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Annual
                  </button>
                  <button
                    onClick={() => setPeriod("quarter")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      period === "quarter"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Quarterly
                  </button>
                </div>
              </div>

              <FinancialCharts financials={fundamentals.financials || []} period={period} />
            </div>
          )}

          {/* AI Insights Section */}
          {fundamentals && (
            <div className="w-full px-4 md:px-0 mb-20 animate-in slide-in-from-bottom-7 duration-1000" dir="rtl">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full filter blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-800 pb-4 relative z-10">
                  <div className="flex items-center gap-3 mb-4 md:mb-0">
                    <div className="bg-blue-900/40 p-2 rounded-lg text-blue-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-200">AI Insights <span className="text-sm text-gray-500 font-normal ml-2 tracking-wide font-sans">(Gemini 1.5)</span></h2>
                  </div>
                  
                  {!aiAnalysis && (
                    <button
                      onClick={handleGenerateAI}
                      disabled={aiLoading}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-blue-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg flex items-center gap-2 font-sans w-full md:w-auto justify-center"
                      dir="ltr"
                    >
                      {aiLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Generate AI Analysis
                        </>
                      )}
                    </button>
                  )}
                </div>

                {aiAnalysis && (
                  <div className="prose prose-invert max-w-none font-sans text-gray-300 leading-relaxed text-right rtl">
                    {/* Render markdown-ish bullets carefully */}
                    {aiAnalysis.split('\n').map((line, i) => {
                      if (!line.trim()) return <br key={i} />;
                      // Bold replacements **text** -> <strong>text</strong> (quick pseudo-markdown)
                      const parts = line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j} className="text-gray-100">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                      });
                      
                      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                        return <li key={i} className="ml-0 mr-6 mb-2">{parts}</li>;
                      }
                      return <p key={i} className="mb-3">{parts}</p>;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ─── StatCard ──────────────────────────────────────────────────────────────

function StatCard({ label, value, prefix }: { label: string; value: string; prefix?: string }) {
  const isFallback = value === "החברה לא מחלקת דיבידנד";
  const displayValue = prefix && value !== "-" && !isFallback ? `${prefix}${value}` : value;
  return (
    <div className="bg-gray-900/80 border border-gray-800/80 rounded-xl p-3 shadow-md shadow-black/10 flex flex-col justify-center transition-all hover:bg-gray-800 hover:-translate-y-0.5 hover:border-gray-600 duration-200 relative group" dir="rtl">
      <span className="text-[0.65rem] font-medium text-gray-400 uppercase tracking-widest mb-1.5 font-sans opacity-90 truncate leading-tight group-hover:text-emerald-400/80 transition-colors" title={label}>{label}</span>
      <span className={`${isFallback ? 'text-[0.7rem] text-gray-500 font-medium pb-1' : 'text-lg font-black text-gray-100'} font-sans tracking-tight truncate`}>{displayValue}</span>
    </div>
  );
}

// ─── FinancialCharts ──────────────────────────────────────────────────────

function FinancialCharts({ financials, period }: { financials: any[]; period: Period }) {
  const [enlargedChart, setEnlargedChart] = useState<string | null>(null);
  // Track which dataKeys are hidden — toggled by clicking legend items
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

  // Reset hidden series when period changes so new chart starts clean
  useEffect(() => { setHiddenSeries({}); }, [period]);

  const toggleSeries = (dataKey: string) => {
    setHiddenSeries(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  const data = useMemo(() => {
    if (!financials || financials.length === 0) return [];
    const master: any[] = financials.map(row => ({
      year: row.year,
      rev:      row.revenue         || 0,
      gross:    row.grossProfit      || 0,
      opInc:    row.operatingIncome  || 0,
      netInc:   row.netIncome        || 0,
      assets:   row.totalAssets      || 0,
      liab:     row.totalLiabilities || 0,
      equity:   row.totalEquity      || 0,
      cash:     row.cash             || 0,
      debt:     row.debt             || 0,
      fcf:      row.freeCashFlow     || 0,
      ocf:      row.operatingCashFlow || 0,
      retained: row.retainedEarnings || 0,
    }));

    master.forEach((m, idx) => {
      m.grossMargin = m.rev > 0 ? (m.gross  / m.rev) * 100 : 0;
      m.opMargin    = m.rev > 0 ? (m.opInc  / m.rev) * 100 : 0;
      m.netMargin   = m.rev > 0 ? (m.netInc / m.rev) * 100 : 0;
      m.fcfMargin   = m.rev > 0 ? (m.fcf    / m.rev) * 100 : 0;
      if (idx === 0) return;
      const p = master[idx - 1];
      m.revYoY      = p.rev    ? ((m.rev    - p.rev)    / Math.abs(p.rev))    * 100 : 0;
      m.netIncYoY   = p.netInc ? ((m.netInc - p.netInc) / Math.abs(p.netInc)) * 100 : 0;
      m.grossYoY    = p.gross  ? ((m.gross  - p.gross)  / Math.abs(p.gross))  * 100 : 0;
      m.opIncYoY    = p.opInc  ? ((m.opInc  - p.opInc)  / Math.abs(p.opInc))  * 100 : 0;
      m.assetsYoY   = p.assets ? ((m.assets - p.assets) / Math.abs(p.assets)) * 100 : 0;
      m.liabYoY     = p.liab   ? ((m.liab   - p.liab)   / Math.abs(p.liab))   * 100 : 0;
      m.equityYoY   = p.equity ? ((m.equity - p.equity) / Math.abs(p.equity)) * 100 : 0;
      m.cashYoY     = p.cash   ? ((m.cash   - p.cash)   / Math.abs(p.cash))   * 100 : 0;
      m.debtYoY     = p.debt   ? ((m.debt   - p.debt)   / Math.abs(p.debt))   * 100 : 0;
      m.fcfYoY      = p.fcf    ? ((m.fcf    - p.fcf)    / Math.abs(p.fcf))    * 100 : 0;
      m.ocfYoY      = p.ocf    ? ((m.ocf    - p.ocf)    / Math.abs(p.ocf))    * 100 : 0;
    });
    return master;
  }, [financials]);

  if (!data || data.length === 0) return <div className="text-gray-500">No Historical Data Found</div>;

  const fm = (val: number) => {
    if (val === 0) return "0";
    if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(1) + "B";
    if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + "M";
    return val.toLocaleString();
  };

  // ── Custom Tooltip ────────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-900 border border-gray-700 shadow-xl p-3 rounded-xl text-sm" dir="ltr">
        <p className="font-bold text-gray-200 mb-2 border-b border-gray-800 pb-1">{label}</p>
        {payload.map((entry: any, i: number) => {
          const yoyVal = entry.payload[`${entry.dataKey}YoY`];
          return (
            <div key={i} className="flex flex-col mb-1">
              <span style={{ color: entry.color }} className="font-semibold text-xs">{entry.name}</span>
              <div className="flex justify-between items-center space-x-4">
                <span className="font-mono">
                  {entry.dataKey.includes('Margin') ? entry.value.toFixed(1) + '%' : fm(entry.value)}
                </span>
                {yoyVal !== undefined && yoyVal !== 0 && (
                  <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded ${yoyVal > 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                    {yoyVal > 0 ? '+' : ''}{yoyVal.toFixed(1)}% YoY
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Interactive Legend ─────────────────────────────────────────────────────
  // Replaces Recharts' default <Legend /> — clicking a pill hides/shows that series
  const InteractiveLegend = ({ payload }: any) => (
    <div className="flex flex-wrap gap-2 justify-center mt-2 pb-1">
      {(payload ?? []).map((entry: any) => {
        const hidden = !!hiddenSeries[entry.dataKey];
        return (
          <button
            key={entry.dataKey}
            onClick={() => toggleSeries(entry.dataKey)}
            title={hidden ? "Click to show" : "Click to hide"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[0.65rem] font-semibold transition-all duration-150 select-none ${
              hidden
                ? "opacity-35 border-gray-700 bg-transparent text-gray-500 line-through"
                : "opacity-100 border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: entry.color }} />
            {entry.value}
          </button>
        );
      })}
    </div>
  );

  // Axis tick formatter for quarterly: rotate if long label
  const xAxisProps = period === 'quarter'
    ? { dataKey: "year", stroke: "#9ca3af", fontSize: 10, tickLine: false, angle: -35, textAnchor: "end" as const, height: 50 }
    : { dataKey: "year", stroke: "#9ca3af", fontSize: 12, tickLine: false };

  // ── Chart Bodies ──────────────────────────────────────────────────────────
  const renderChartBody = (id: string) => {
    const commonAxis = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis {...xAxisProps} />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<InteractiveLegend />} />
      </>
    );

    switch (id) {
      case 'profit': return (
        <BarChart data={data}>
          {commonAxis}
          <YAxis tickFormatter={fm} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={50} />
          <Bar dataKey="rev"    name="הכנסות (Revenue)"       fill="#3b82f6" radius={[2,2,0,0]} hide={!!hiddenSeries['rev']} />
          <Bar dataKey="gross"  name="רווח גולמי (Gross)"    fill="#8b5cf6" radius={[2,2,0,0]} hide={!!hiddenSeries['gross']} />
          <Bar dataKey="opInc"  name="רווח תפעולי (Op Inc)"  fill="#eab308" radius={[2,2,0,0]} hide={!!hiddenSeries['opInc']} />
          <Bar dataKey="netInc" name="רווח נקי (Net Inc)"    fill="#10b981" radius={[2,2,0,0]} hide={!!hiddenSeries['netInc']} />
        </BarChart>
      );
      case 'margins': return (
        <LineChart data={data}>
          {commonAxis}
          <YAxis tickFormatter={(v) => v + '%'} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={40} domain={[0, 'auto']} />
          <Line type="monotone" dataKey="grossMargin" name="שולי גולמי"        stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} hide={!!hiddenSeries['grossMargin']} />
          <Line type="monotone" dataKey="opMargin"    name="שולי תפעולי"       stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} hide={!!hiddenSeries['opMargin']} />
          <Line type="monotone" dataKey="netMargin"   name="שולי נקי"          stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} hide={!!hiddenSeries['netMargin']} />
          <Line type="monotone" dataKey="fcfMargin"   name="שולי תזרים חופשי" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} hide={!!hiddenSeries['fcfMargin']} />
        </LineChart>
      );
      case 'balance': return (
        <BarChart data={data}>
          {commonAxis}
          <YAxis tickFormatter={fm} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={50} />
          <Bar dataKey="assets" name="סך נכסים"         fill="#3b82f6" radius={[2,2,0,0]} hide={!!hiddenSeries['assets']} />
          <Bar dataKey="liab"   name="סך התחייבויות"    fill="#f43f5e" radius={[2,2,0,0]} hide={!!hiddenSeries['liab']} />
          <Bar dataKey="equity" name="הון עצמי"          fill="#10b981" radius={[2,2,0,0]} hide={!!hiddenSeries['equity']} />
        </BarChart>
      );
      case 'liquidity': return (
        <ComposedChart data={data}>
          {commonAxis}
          <YAxis tickFormatter={fm} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={50} />
          <Bar  dataKey="cash" name="סך מזומנים" fill="#10b981" radius={[2,2,0,0]} barSize={20} hide={!!hiddenSeries['cash']} />
          <Line dataKey="debt" name="סך חוב"     stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} hide={!!hiddenSeries['debt']} />
        </ComposedChart>
      );
      case 'retained': return (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRetained" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          {commonAxis}
          <YAxis tickFormatter={fm} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={50} />
          <Area type="monotone" dataKey="retained" name="סך עודפים" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRetained)" hide={!!hiddenSeries['retained']} />
        </AreaChart>
      );
      case 'cashflow': return (
        <BarChart data={data}>
          {commonAxis}
          <YAxis tickFormatter={fm} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={50} />
          <Bar dataKey="ocf" name="תזרים מפעילות שוטפת" fill="#3b82f6" radius={[2,2,0,0]} hide={!!hiddenSeries['ocf']} />
          <Bar dataKey="fcf" name="תזרים מזומנים חופשי" fill="#10b981" radius={[2,2,0,0]} hide={!!hiddenSeries['fcf']} />
        </BarChart>
      );
      default: return null;
    }
  };

  // ── ChartCard ─────────────────────────────────────────────────────────────
  const ChartCard = ({ id, title }: { id: string; title: string }) => (
    <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800/60 shadow-md relative group">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-200 font-bold bg-gray-800 px-3 py-1 rounded inline-block text-sm">{title}</h3>
        <button
          onClick={() => setEnlargedChart(id)}
          className="p-1.5 bg-gray-800 text-gray-400 rounded-lg hover:text-emerald-400 hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
          title="Enlarge Chart"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {renderChartBody(id) as any}
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="ltr">
        <ChartCard id="profit"   title="Profitability Flow (הכנסות ורווחים)" />
        <ChartCard id="margins"  title="Profit Margins (שולי רווחיות)" />
        <ChartCard id="balance"  title="Balance Sheet (מאזן)" />
        <ChartCard id="liquidity" title="Liquidity (נזילות וחוב)" />
        <ChartCard id="retained" title="Retained Earnings (סך עודפים)" />
        <ChartCard id="cashflow" title="Cash Flow (תזרימי מזומנים)" />
      </div>

      {/* Enlarged modal */}
      {enlargedChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" dir="ltr">
          <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-6xl h-[80vh] flex flex-col shadow-2xl relative">
            <button
              onClick={() => setEnlargedChart(null)}
              className="absolute top-6 right-6 p-2 bg-gray-800 text-gray-400 rounded-full hover:text-rose-400 hover:bg-gray-700 transition-colors z-10 shadow-lg"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1 p-8 w-full h-full pt-16">
              <ResponsiveContainer width="100%" height="100%">
                {renderChartBody(enlargedChart) as any}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </>
  );
}