"use client";

import React, { useEffect, useState } from "react";
import { getMacroData, getYieldCurveData, type MacroData, type YieldCurvePoint } from "../actions";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Percent, 
  Globe, 
  ArrowRightLeft,
  ChevronRight,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { useTheme } from "next-themes";

export default function MacroPage() {
  const { theme } = useTheme();
  const [data, setData] = useState<MacroData | null>(null);
  const [yieldCurve, setYieldCurve] = useState<YieldCurvePoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [macroResult, yieldResult] = await Promise.all([
        getMacroData(),
        getYieldCurveData()
      ]);
      setData(macroResult);
      setYieldCurve(yieldResult);
    } catch (e) {
      console.error("Macro fetch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-12 flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-foreground/20 animate-spin" />
          <p className="text-foreground/40 font-mono text-[10px] uppercase tracking-[0.3em] font-bold">Synchronizing Macro Data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background p-12 text-foreground text-center transition-colors duration-300">
        <div className="max-w-md mx-auto bg-card/40 backdrop-blur-xl border border-foreground/5 p-12 rounded-[2.5rem] shadow-2xl">
          <p className="text-rose-500 font-black text-[10px] uppercase tracking-[0.2em] mb-4">API Offline</p>
          <p className="text-foreground/40 mb-8 font-medium text-sm leading-relaxed uppercase tracking-wider">Failed to establish handshake with FRED clusters. Verify FRED_KEY.</p>
          <button onClick={fetchData} className="px-8 py-3 bg-foreground text-background rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-black/10">Retry Connection</button>
        </div>
      </div>
    );
  }

  const indicators = [
    { key: 'rates', label: 'Interest Rate', sub: 'Fed Funds', color: '#10b981', suffix: '%' },
    { key: 'inflation', label: 'Inflation', sub: 'CPI YoY', color: '#f59e0b', suffix: '%' },
    { key: 'unemployment', label: 'Unemployment', sub: 'National Rate', color: '#ef4444', suffix: '%' },
  ];

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 text-foreground transition-colors duration-300">
      <header className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8 mt-16 md:mt-0">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-foreground/5 p-2 rounded-xl">
              <Globe className="w-6 h-6 text-foreground/40" />
            </div>
            <span className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.4em]">Economic Intelligence</span>
          </div>
          <h1 className="text-5xl font-extralight tracking-tighter text-foreground leading-none">
            Macroeconomics <span className="text-foreground/30 italic">Terminal</span>
          </h1>
          <p className="text-foreground/40 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            FRED Stream Synchronized
          </p>
        </div>
        
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-6 py-3 bg-foreground/5 border border-foreground/5 rounded-xl hover:bg-foreground/10 transition-colors text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Uplink
        </button>
      </header>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-16">
        {/* Summary Table */}
        <section className="xl:col-span-2">
          <div className="bg-card/30 border border-foreground/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl h-full pb-6">
            <div className="p-8 border-b border-foreground/5">
              <h2 className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.4em] flex items-center gap-3">
                <ArrowRightLeft className="w-4 h-4 text-foreground/40" />
                Momentum Matrix
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="border-b border-foreground/5 text-foreground/20 uppercase text-[9px] font-black tracking-[0.3em]">
                    <th className="px-8 py-6">Indicator</th>
                    <th className="px-8 py-6">Latest</th>
                    <th className="px-8 py-6">Prev</th>
                    <th className="px-8 py-6 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/5">
                  {indicators.map((ind) => {
                    const item = (data as any)[ind.key];
                    const sign = item.change >= 0 ? '+' : '';
                    const momentumColor = item.change > 0 ? 'text-emerald-500' : item.change < 0 ? 'text-rose-500' : 'text-foreground/40';
                    
                    return (
                      <tr key={ind.key} className="hover:bg-foreground/5 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-extralight text-xl tracking-tight text-foreground group-hover:text-emerald-500/80 transition-colors leading-none">{ind.label}</span>
                            <span className="text-[9px] text-foreground/20 uppercase tracking-[0.2em] font-black mt-2 opacity-70">{ind.sub}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-2xl font-extralight tracking-tighter">{item.current.toFixed(2)}{ind.suffix}</td>
                        <td className="px-8 py-6 text-foreground/30 font-bold">{item.previous.toFixed(2)}{ind.suffix}</td>
                        <td className={`px-8 py-6 text-right font-black text-xs uppercase tracking-widest ${momentumColor}`}>
                          <div className="flex items-center justify-end gap-2">
                            {item.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {sign}{item.change.toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Yield Curve Mini Analytics */}
        <section className="bg-card/40 border border-foreground/5 rounded-[2.5rem] p-10 flex flex-col justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-foreground/5 rounded-full filter blur-[80px] -mr-16 -mt-16 group-hover:bg-foreground/10 transition-colors duration-700 pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="bg-foreground/5 p-2 rounded-xl">
                <BarChart3 className="w-5 h-5 text-foreground/40" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/40">Yield Curve Index</h3>
            </div>
            <p className="text-foreground/40 text-sm font-medium leading-relaxed mb-8 relative z-10">
              Maturity spreads indicate structural health. <span className="text-rose-500 font-black italic">Inversions</span> signal cyclical contraction.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                <div className="bg-foreground/5 p-6 rounded-2xl border border-foreground/5 backdrop-blur-sm group/card hover:bg-foreground/10 transition-all duration-300">
                    <span className="text-[8px] text-foreground/30 uppercase font-black block mb-2 tracking-[0.2em]">Spread 10Y-2Y</span>
                    <span className={`text-3xl font-extralight tracking-tighter ${(yieldCurve[4]?.yield - yieldCurve[2]?.yield) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {yieldCurve.length > 4 ? (yieldCurve[4].yield - yieldCurve[2].yield).toFixed(2) : '0.00'}%
                    </span>
                </div>
                <div className="bg-foreground/5 p-6 rounded-2xl border border-foreground/5 backdrop-blur-sm group/card hover:bg-foreground/10 transition-all duration-300">
                    <span className="text-[8px] text-foreground/30 uppercase font-black block mb-2 tracking-[0.2em]">Spread 10Y-3M</span>
                    <span className={`text-3xl font-extralight tracking-tighter ${(yieldCurve[4]?.yield - yieldCurve[0]?.yield) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {yieldCurve.length > 4 ? (yieldCurve[4].yield - yieldCurve[0].yield).toFixed(2) : '0.00'}%
                    </span>
                </div>
            </div>
        </section>
      </div>

      {/* Main Charts Section */}
      <div className="space-y-12 mb-32">
        {/* Yield Curve Chart - Full Width */}
        <div className="bg-card/30 border border-foreground/5 p-8 md:p-12 rounded-[3.5rem] shadow-3xl relative overflow-hidden group backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full filter blur-[120px] -mr-32 -mt-32 group-hover:bg-emerald-500/10 transition-colors duration-700 pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 relative z-10 gap-4">
                <div>
                  <h3 className="text-4xl font-extralight tracking-tighter text-foreground leading-none">Yield Curve <span className="italic text-foreground/40">Continuum</span></h3>
                  <p className="text-[9px] text-foreground/30 font-black uppercase tracking-[0.4em] mt-4">Multi-Maturity Capital Mapping</p>
                </div>
                <div className="bg-foreground/5 text-foreground/40 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border border-foreground/5">
                    Live_Network_Node
                </div>
            </div>
            
            <div className="h-[450px] w-full mt-4" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yieldCurve}>
                        <defs>
                            <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme === 'dark' ? '#10b981' : '#059669'} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={theme === 'dark' ? '#10b981' : '#059669'} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" vertical={false} opacity={0.05} />
                        <XAxis 
                            dataKey="maturity" 
                            stroke="currentColor" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            className="text-foreground/30 font-bold uppercase tracking-widest"
                            padding={{ left: 30, right: 30 }}
                        />
                        <YAxis 
                            stroke="currentColor" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            className="text-foreground/30 font-bold"
                            tickFormatter={(v) => v.toFixed(1) + '%'}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(var(--background), 0.8)', 
                              backdropFilter: 'blur(12px)',
                              border: '1px solid rgba(var(--foreground), 0.05)', 
                              borderRadius: '24px', 
                              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                            itemStyle={{ color: '#10b981', fontWeight: '900', fontSize: '18px' }}
                            labelStyle={{ color: 'rgba(var(--foreground), 0.3)', marginBottom: '8px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '10px' }}
                            formatter={(value: any) => [`${value.toFixed(3)}%`, "YIELD"]}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="yield" 
                            stroke="#10b981" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorYield)"
                            dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                            activeDot={{ r: 8, stroke: 'currentColor', strokeWidth: 4, fill: '#10b981' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-foreground/10 border border-foreground/10 rounded-[2rem] mt-12 overflow-hidden relative z-10 shadow-lg">
                {yieldCurve.map((point) => (
                    <div key={point.maturity} className="bg-card/40 p-6 hover:bg-card/60 transition-all duration-300 backdrop-blur-sm flex flex-col items-center group/item text-center">
                        <span className="text-[8px] text-foreground/20 uppercase font-black block mb-2 tracking-[0.2em] group-hover/item:text-emerald-500/50 transition-colors">{point.maturity}</span>
                        <span className="text-xl font-extralight tracking-tighter text-foreground">{point.yield.toFixed(2)}%</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Global Economic Indices */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {indicators.map((ind) => {
            const item = (data as any)[ind.key];
            return (
                <div key={ind.key} className="bg-card/30 backdrop-blur-md border border-foreground/5 p-10 rounded-[3rem] shadow-2xl hover:border-foreground/10 transition-all duration-500 group relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-foreground/5 rounded-full filter blur-[80px] -mr-16 -mt-16 group-hover:bg-foreground/10 transition-all duration-700 pointer-events-none"></div>
                    
                    <div className="flex flex-col gap-6 mb-10 relative z-10">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-3xl font-extralight tracking-tighter text-foreground leading-none">{ind.label}</h3>
                            <p className="text-[9px] text-foreground/30 font-black uppercase tracking-[0.2em] mt-3">{ind.sub} (5Y Cycle)</p>
                          </div>
                          <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${item.change >= 0 ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : 'bg-rose-500/5 text-rose-500 border-rose-500/10'}`}>
                            {item.change >= 0 ? 'Expansion' : 'Contraction'}
                          </div>
                        </div>
                    </div>
                    
                    <div className="h-48 mt-auto relative z-10" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={item.history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" vertical={false} opacity={0.03} />
                            <XAxis 
                                dataKey="date" 
                                stroke="currentColor" 
                                fontSize={8} 
                                className="text-foreground/20 font-bold uppercase tracking-widest"
                                tickLine={false} 
                                axisLine={false}
                                tickCount={4}
                                tickFormatter={(d) => d.split('-')[0].substring(2)}
                            />
                            <YAxis 
                                stroke="currentColor" 
                                fontSize={8} 
                                className="text-foreground/20 font-bold"
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(v) => v.toFixed(0) + (ind.suffix || '')}
                                domain={['auto', 'auto']}
                                width={25}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(var(--background), 0.8)', 
                                  backdropFilter: 'blur(12px)',
                                  border: '1px solid rgba(var(--foreground), 0.05)', 
                                  borderRadius: '20px'
                                }}
                                itemStyle={{ color: ind.color, fontWeight: '900', fontSize: '14px' }}
                                labelStyle={{ color: 'rgba(var(--foreground), 0.3)', marginBottom: '4px', fontSize: '9px', fontWeight: '900', letterSpacing: '0.1em' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke={ind.color} 
                                strokeWidth={3} 
                                dot={false}
                                activeDot={{ r: 6, stroke: 'currentColor', strokeWidth: 3, fill: ind.color }}
                            />
                        </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            );
            })}
        </section>
      </div>
    </div>
  );
}
