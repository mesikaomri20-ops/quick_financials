"use client";

import React, { useState, useEffect, useMemo } from "react";
import { getStockData, getMarketOverview, getBulkQuotes, getDashboardData, type Stock, type Period } from "./actions";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, orderBy } from "firebase/firestore";
import { AlertCircle, TrendingUp } from "lucide-react";
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
  if (formatType === 'percent') return num.toFixed(1) + "%";
  if (formatType === 'large') {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9)  return (num / 1e9).toFixed(2)  + "B";
    if (num >= 1e6)  return (num / 1e6).toFixed(2)  + "M";
    return num.toLocaleString();
  }
  return num.toFixed(2);
}

// ─── Home ──────────────────────────────────────────────────────────────────

let globalIsFetching = false;

export default function Home() {
  const [user] = useAuthState(auth);
  const watchlistRef = user ? collection(db, "users", user.uid, "watchlist") : null;
  const [watchlistDocs] = useCollection(watchlistRef ? query(watchlistRef, orderBy("ticker")) : null);

  const [marketOverview, setMarketOverview] = useState<Stock[]>([]);
  const [watchlistQuotes, setWatchlistQuotes] = useState<Stock[]>([]);

  const [tickerInput, setTickerInput] = useState("");
  const [currentTicker, setCurrentTicker] = useState("");
  const [period, setPeriod] = useState<Period>("annual");
  const [data, setData] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const fetchData = async (symbol: string, p: Period) => {
    if (!symbol) return;
    setLoading(true);
    setError(false);
    setRateLimited(false);
    
    try {
      const result = await getStockData(symbol);
      
      if (result && !result.error) {
        // Flat data structure sync
        setData(result);
      } else if (result && result.error === 'rate-limited') {
        setRateLimited(true);
        setData(null);
      } else {
        setError(true);
        setData(null);
      }
    } catch (e) {
      console.error("Fetch failed:", e);
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch only strictly on mount or period toggle
  useEffect(() => { 
    if (!currentTicker) return;
    if (globalIsFetching) return;
    globalIsFetching = true;
    fetchData(currentTicker, period).finally(() => {
      globalIsFetching = false;
    });
  }, [period, currentTicker]);

  // Unified Dashboard Hook
  useEffect(() => {
    let mounted = true;
    if (watchlistDocs === undefined && user) return; 

    async function loadDashboard() {
      const symbols = watchlistDocs ? watchlistDocs.docs.map((d: any) => d.data().ticker) : [];
      try {
        const res = await getDashboardData(symbols);
        if (!mounted) return;
        if (res.rateLimited) setRateLimited(true);
        if (res.overview) setMarketOverview(res.overview);
        if (res.watchlist) setWatchlistQuotes(res.watchlist);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    }
    
    loadDashboard();
    return () => { mounted = false; };
  }, [watchlistDocs, user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (globalIsFetching) return;
    
    if (tickerInput.trim()) {
      globalIsFetching = true;
      setLoading(true);
      const newTicker = tickerInput.trim().toUpperCase();
      setCurrentTicker(newTicker);
      setTickerInput("");
      await fetchData(newTicker, period);
      setLoading(false);
      globalIsFetching = false;
    }
  };

  const quote = data;
  const fundamentals = data;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 md:p-8 text-foreground transition-colors duration-300">

      {rateLimited && (
        <div className="w-full max-w-4xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-md rounded-2xl p-4 mt-6 text-center text-rose-500 font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-3 shadow-lg fade-in animate-in">
           <AlertCircle className="w-5 h-5" />
           Daily Data Limit Reached. Using cached data.
        </div>
      )}

      {error && !rateLimited && (
        <div className="w-full max-w-4xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-md rounded-2xl p-4 mt-6 text-center text-rose-500 font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-3 shadow-lg fade-in animate-in">
           <AlertCircle className="w-5 h-5" />
           Live data unavailable
        </div>
      )}

      {/* Market Overview Card */}
      {marketOverview.length > 0 && (
        <div className="w-full max-w-4xl mt-12 flex flex-wrap lg:flex-nowrap gap-4 pb-4">
          {marketOverview.map(q => (
            <div key={q.symbol} className="min-w-[150px] flex-1 bg-card/40 backdrop-blur-2xl border border-border-lux rounded-2xl p-5 shadow-xl relative overflow-hidden group hover:border-foreground/20 hover:scale-[1.02] transition-all cursor-pointer" onClick={() => { setTickerInput(q.symbol); setCurrentTicker(q.symbol); }}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-foreground/5 blur-[40px] -mr-8 -mt-8 group-hover:bg-foreground/10 transition-colors" />
              <div className="flex justify-between items-start relative z-10 mb-2">
                <span className="text-sm font-bold tracking-widest text-foreground">{q.symbol}</span>
                <span className={`text-[10px] font-black ${q.changesPercentage >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {q.changesPercentage > 0 ? "+" : ""}{q.changesPercentage?.toFixed(2)}%
                </span>
              </div>
              <div className="relative z-10 flex items-baseline gap-1">
                <span className="text-2xl font-light tracking-tight">${q.price?.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Watchlist Card */}
      {user && watchlistQuotes.length > 0 && (
        <div className="w-full max-w-4xl mt-4 mb-8 bg-card/30 backdrop-blur-2xl border border-border-lux rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-accent-gold/5 blur-[80px] -mr-16 -mt-16 group-hover:bg-accent-gold/10 transition-colors pointer-events-none" />
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <TrendingUp className="w-5 h-5 text-accent-gold" />
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/50">My Tactical Watchlist</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            {watchlistQuotes.map(q => (
              <div key={q.symbol} className="bg-background/40 border border-border-lux rounded-xl p-4 flex flex-col hover:bg-card/60 transition-colors cursor-pointer active:scale-95" onClick={() => { setTickerInput(q.symbol); setCurrentTicker(q.symbol); }}>
                <span className="text-xs font-bold tracking-wider mb-1 text-foreground/80">{q.symbol}</span>
                <div className="flex justify-between items-end">
                  <span className="text-lg font-light text-foreground">${q.price?.toFixed(2)}</span>
                  <span className={`text-[9px] font-bold ${q.changesPercentage >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {q.changesPercentage > 0 ? "+" : ""}{q.changesPercentage?.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="w-full max-w-4xl mb-12 flex flex-col items-center mt-12 gap-8">
        <h1 className="text-5xl font-extralight tracking-tighter text-foreground leading-none text-center">
          Market <span className="text-accent-gold italic opacity-80">Terminal</span>
        </h1>
        <form onSubmit={handleSearch} className="flex space-x-2 w-full max-w-md">
          <input
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            placeholder="Search Ticker..."
            disabled={loading}
            className="flex-1 px-5 py-3.5 bg-card/50 backdrop-blur-md border border-border-lux rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent-gold/30 text-foreground placeholder-foreground/30 transition-all font-medium tracking-wide shadow-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 bg-foreground text-background hover:opacity-90 disabled:opacity-50 font-black rounded-2xl transition-all shadow-lg active:scale-95 flex items-center gap-2 uppercase text-[10px] tracking-[0.2em]"
          >
            {loading ? "Searching..." : "Execute"}
          </button>
        </form>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl flex flex-col items-center">
        <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">

            {/* Quote Card */}
            {quote && (
              <div className="bg-card/40 backdrop-blur-2xl border border-border-lux rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full mb-16 transform transition-all hover:scale-[1.01] duration-500 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full filter blur-[80px] -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors duration-700 pointer-events-none"></div>
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-4">
                      <h1 className="text-5xl font-extralight tracking-tighter text-foreground leading-none">
                        {quote.symbol}
                      </h1>
                    </div>
                    {quote.companyName && (
                      <div className="mt-4">
                        <span className="text-lg font-bold text-foreground/60 leading-tight block w-full pr-4 uppercase tracking-wider text-[10px]" title={quote.companyName}>
                          {quote.companyName}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-black text-foreground/30 px-3 py-1.5 bg-foreground/5 rounded-full uppercase tracking-[0.2em] border border-border-lux">
                    Terminal_Live
                  </span>
                </div>

                <div className="flex flex-col space-y-6 relative z-10">
                  <div className="flex justify-between items-end">
                    <span className="text-foreground/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Market Price</span>
                    <span className="text-6xl font-extralight tracking-tighter">${quote.price?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-6 border-t border-border-lux mt-4">
                    <span className="text-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">Volatility 24H</span>
                    <span className={`text-2xl font-bold flex items-center ${quote.changesPercentage >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {quote.changesPercentage > 0 ? "+" : ""}
                      {quote.changesPercentage?.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Fundamentals */}
            {fundamentals && (
              <div className="w-full mb-20 animate-in slide-in-from-bottom-8 duration-1000" dir="rtl">
                
                {/* Bloomberg style Header */}
                <div className="flex items-center gap-4 mb-8">
                   <div className="h-px bg-border-lux flex-1"></div>
                   <h2 className="text-xs font-black uppercase tracking-[0.4em] text-foreground/40">Core Financial Metrics</h2>
                   <div className="h-px bg-border-lux flex-1"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <StatGroup title="Valuation" color="emerald">
                      <StatItem label="P/E Current" value={formatValue(fundamentals.trailingPE)} />
                      <StatItem label="Forward P/E" value={formatValue(fundamentals.forwardPE)} />
                      <StatItem label="PEG Ratio" value={formatValue(fundamentals.pegRatio)} />
                   </StatGroup>

                   <StatGroup title="Performance" color="blue">
                      <StatItem label="Gross Margin" value={formatValue(fundamentals.grossMargin, 'percent')} />
                      <StatItem label="Operating Margin" value={formatValue(fundamentals.operatingMargin, 'percent')} />
                      <StatItem label="ROE" value={formatValue(fundamentals.roe, 'percent')} />
                   </StatGroup>

                    <StatGroup title="Capital" color="gold">
                       <StatItem label="Market Cap" value={formatValue(fundamentals.marketCap, 'large')} />
                       <StatItem label="Total Debt" value={formatValue(fundamentals.totalDebt, 'large')} />
                       <StatItem label="Total Cash" value={formatValue(fundamentals.totalCash, 'large')} />
                    </StatGroup>
                </div>
              </div>
            )}

            {/* Charts Section */}
            {fundamentals && (
              <div className="w-full px-4 md:px-0 mb-32 animate-in slide-in-from-bottom-12 duration-1000" dir="rtl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                   <h2 className="text-4xl font-extralight tracking-tighter text-foreground">
                     Financial <span className="text-accent-gold italic opacity-80">Trajectories</span>
                   </h2>

                   <div className="flex p-1 bg-foreground/5 rounded-2xl border border-border-lux backdrop-blur-sm" dir="ltr">
                    <button
                      onClick={() => setPeriod("annual")}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${
                        period === "annual" ? "bg-foreground text-background shadow-lg" : "text-foreground/40 hover:text-foreground/70"
                      }`}
                    >
                      Annual
                    </button>
                    <button
                      onClick={() => setPeriod("quarter")}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${
                        period === "quarter" ? "bg-foreground text-background shadow-lg" : "text-foreground/40 hover:text-foreground/70"
                      }`}
                    >
                      Quarterly
                    </button>
                  </div>
                </div>

                <div className="bg-card/20 backdrop-blur-xl border border-border-lux p-6 md:p-10 rounded-[3rem] shadow-2xl">
                   <FinancialCharts 
                     financials={(period === "annual" ? data?.annualFinancials : data?.quarterlyFinancials) || []} 
                     period={period} 
                   />
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}

function StatGroup({ title, color, children }: { title: string, color: string, children: React.ReactNode }) {
  const colorMap: any = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    gold: "bg-amber-500"
  };
  return (
    <div className="bg-card/30 backdrop-blur-md border border-border-lux p-6 rounded-[2rem] hover:border-foreground/10 transition-all flex flex-col gap-4">
       <div className="flex items-center gap-3 mb-2">
         <div className={`w-1 h-3 ${colorMap[color]} rounded-full opacity-50`}></div>
         <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">{title}</h3>
       </div>
       <div className="space-y-4">
          {children}
       </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col gap-1">
       <span className="text-[9px] font-bold text-foreground/30 uppercase tracking-widest">{label}</span>
       <span className="text-xl font-extralight tracking-tight text-foreground">{value}</span>
    </div>
  );
}

// ─── FinancialCharts ──────────────────────────────────────────────────────

function FinancialCharts({ financials, period }: { financials: any[]; period: Period }) {
  const [enlargedChart, setEnlargedChart] = useState<string | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

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

    const calcMarginUI = (metric: number, rev: number) => {
      if (rev <= 0) return 0;
      const res = (metric / rev) * 100;
      return (res > 100 || res < -100) ? 0 : res;
    };

    master.forEach((m, idx) => {
      m.grossMargin = calcMarginUI(m.gross, m.rev);
      m.opMargin    = calcMarginUI(m.opInc, m.rev);
      m.netMargin   = calcMarginUI(m.netInc, m.rev);
      m.fcfMargin   = calcMarginUI(m.fcf, m.rev);
      if (idx === 0) return;
      const p = master[idx - 1];
      m.revYoY      = p.rev    ? ((m.rev    - p.rev)    / Math.abs(p.rev))    * 100 : 0;
    });
    return master;
  }, [financials]);

  if (!data || data.length === 0) return <div className="text-gray-500">No Historical Data Found</div>;

  const fm = (val: number) => {
    if (val === 0) return "0";
    if (Math.abs(val) >= 1e12) return (val / 1e12).toFixed(1) + "T";
    if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(1) + "B";
    if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + "M";
    return val.toLocaleString();
  };

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

  const InteractiveLegend = ({ payload }: any) => (
    <div className="flex flex-wrap gap-2 justify-center mt-2 pb-1">
      {(payload ?? []).map((entry: any) => {
        const hidden = !!hiddenSeries[entry.dataKey];
        return (
          <button
            key={entry.dataKey}
            onClick={() => toggleSeries(entry.dataKey)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[0.65rem] font-semibold transition-all duration-150 select-none ${
              hidden ? "opacity-35 border-gray-700 bg-transparent text-gray-500 line-through" : "opacity-100 border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: entry.color }} />
            {entry.value}
          </button>
        );
      })}
    </div>
  );

  const xAxisProps = period === 'quarter'
    ? { dataKey: "year", stroke: "#9ca3af", fontSize: 9, tickLine: false, angle: -45, textAnchor: "end" as const, height: 60, interval: 0 }
    : { dataKey: "year", stroke: "#9ca3af", fontSize: 11, tickLine: false };

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
          <Bar dataKey="rev"    name="Revenue"       fill="#3b82f6" radius={[2,2,0,0]} hide={!!hiddenSeries['rev']} />
          <Bar dataKey="gross"  name="Gross Profit"  fill="#8b5cf6" radius={[2,2,0,0]} hide={!!hiddenSeries['gross']} />
          <Bar dataKey="opInc"  name="Op Income"     fill="#eab308" radius={[2,2,0,0]} hide={!!hiddenSeries['opInc']} />
          <Bar dataKey="netInc" name="Net Income"    fill="#10b981" radius={[2,2,0,0]} hide={!!hiddenSeries['netInc']} />
        </BarChart>
      );
      case 'margins': return (
        <LineChart data={data}>
          {commonAxis}
          <YAxis tickFormatter={(v) => v + '%'} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={40} domain={[0, 'auto']} />
          <Line type="monotone" dataKey="grossMargin" name="Gross Margin" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} hide={!!hiddenSeries['grossMargin']} />
          <Line type="monotone" dataKey="opMargin"    name="Op Margin"    stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} hide={!!hiddenSeries['opMargin']} />
          <Line type="monotone" dataKey="netMargin"   name="Net Margin"   stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} hide={!!hiddenSeries['netMargin']} />
        </LineChart>
      );
      case 'balance': return (
        <BarChart data={data}>
          {commonAxis}
          <YAxis tickFormatter={fm} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={50} />
          <Bar dataKey="assets" name="Assets"      fill="#3b82f6" radius={[2,2,0,0]} hide={!!hiddenSeries['assets']} />
          <Bar dataKey="liab"   name="Liabilities" fill="#f43f5e" radius={[2,2,0,0]} hide={!!hiddenSeries['liab']} />
          <Bar dataKey="equity" name="Equity"      fill="#10b981" radius={[2,2,0,0]} hide={!!hiddenSeries['equity']} />
        </BarChart>
      );
      case 'liquidity': return (
        <ComposedChart data={data}>
          {commonAxis}
          <YAxis tickFormatter={fm} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={50} />
          <Bar  dataKey="cash" name="Cash" fill="#10b981" radius={[2,2,0,0]} barSize={20} hide={!!hiddenSeries['cash']} />
          <Line dataKey="debt" name="Debt" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} hide={!!hiddenSeries['debt']} />
        </ComposedChart>
      );
      default: return null;
    }
  };

  const ChartCard = ({ id, title }: { id: string; title: string }) => (
    <div className="bg-card/30 backdrop-blur-md p-4 rounded-2xl border border-border-lux shadow-md relative group">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-200 font-bold bg-gray-800 px-3 py-1 rounded inline-block text-sm">{title}</h3>
        <button
          onClick={() => setEnlargedChart(id)}
          className="p-1.5 bg-gray-800 text-gray-400 rounded-lg hover:text-emerald-400 hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
        >
          <TrendingUp className="w-4 h-4" />
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
        <ChartCard id="profit"    title="Profitability" />
        <ChartCard id="margins"   title="Margins" />
        <ChartCard id="balance"   title="Balance Sheet" />
        <ChartCard id="liquidity" title="Liquidity" />
      </div>

      {enlargedChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" dir="ltr">
          <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-6xl h-[80vh] flex flex-col shadow-2xl relative">
            <button
              onClick={() => setEnlargedChart(null)}
              className="absolute top-6 right-6 p-2 bg-gray-800 text-gray-400 rounded-full hover:text-rose-400 hover:bg-gray-700 transition-colors z-10 shadow-lg"
            >
              <AlertCircle className="w-6 h-6 rotate-45" />
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