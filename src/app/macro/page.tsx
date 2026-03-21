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

export default function MacroPage() {
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
      <div className="min-h-screen bg-gray-950 p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Synchronizing Macro Data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 p-12 text-white text-center">
        <div className="max-w-md mx-auto bg-gray-900 border border-gray-800 p-8 rounded-2xl">
          <p className="text-emerald-500 font-bold mb-4">API CONNECTION OFFLINE</p>
          <p className="text-gray-400 mb-8">Failed to establish handshake with FRED clusters. Verify FRED_KEY.</p>
          <button onClick={fetchData} className="px-6 py-2 bg-emerald-600 rounded-lg text-white font-bold hover:bg-emerald-500 transition-colors">RETRY HANDSHAKE</button>
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
    <div className="min-h-screen bg-gray-950 p-8 md:p-12 text-white font-sans">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <Globe className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Economic Intelligence</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white">
            Macroeconomics <span className="text-emerald-500">Terminal</span>
          </h1>
          <p className="text-gray-500 mt-2 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time FRED Data Synchronization Online
          </p>
        </div>
        
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors text-xs font-bold text-gray-400 uppercase tracking-widest"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Data
        </button>
      </header>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
        {/* Summary Table */}
        <section className="xl:col-span-2">
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm h-full">
            <div className="p-6 border-b border-gray-800 bg-gray-900/80">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-500" />
                Indicator Summary (Current vs Previous)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-950/40 text-gray-500 uppercase text-[10px] tracking-widest">
                    <th className="px-8 py-4 font-bold">Indicator</th>
                    <th className="px-8 py-4 font-bold">Latest</th>
                    <th className="px-8 py-4 font-bold">Previous</th>
                    <th className="px-8 py-4 font-bold text-right">Momentum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {indicators.map((ind) => {
                    const item = (data as any)[ind.key];
                    const sign = item.change >= 0 ? '+' : '';
                    const momentumColor = item.change > 0 ? 'text-emerald-400' : item.change < 0 ? 'text-rose-400' : 'text-gray-400';
                    
                    return (
                      <tr key={ind.key} className="hover:bg-gray-800/30 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-200 group-hover:text-emerald-400 transition-colors">{ind.label}</span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-tighter opacity-70">{ind.sub}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-lg font-black">{item.current.toFixed(2)}{ind.suffix}</td>
                        <td className="px-8 py-5 text-gray-500">{item.previous.toFixed(2)}{ind.suffix}</td>
                        <td className={`px-8 py-5 text-right font-bold ${momentumColor}`}>
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

        {/* Yield Curve Mini Preview / Header */}
        <section className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">Yield Curve Analysis</h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              The relation between interest rates and time to maturity. A normal curve slopes upward, while an <span className="text-rose-400 font-bold italic">inverted curve</span> often signals impending recession.
            </p>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Spread 10Y-2Y</span>
                    <span className={`text-xl font-black ${(yieldCurve[4]?.yield - yieldCurve[2]?.yield) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {yieldCurve.length > 4 ? (yieldCurve[4].yield - yieldCurve[2].yield).toFixed(2) : '0.00'}%
                    </span>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Spread 10Y-3M</span>
                    <span className={`text-xl font-black ${(yieldCurve[4]?.yield - yieldCurve[0]?.yield) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {yieldCurve.length > 4 ? (yieldCurve[4].yield - yieldCurve[0].yield).toFixed(2) : '0.00'}%
                    </span>
                </div>
            </div>
        </section>
      </div>

      {/* Main Charts Section */}
      <div className="space-y-8 mb-20">
        {/* Yield Curve Chart - Full Width */}
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full filter blur-3xl -mr-20 -mt-20 group-hover:bg-blue-500/10 transition-colors duration-500 pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                  <h3 className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors">U.S. Treasury Yield Curve</h3>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.3em] mt-1">Real-time Multi-Maturity Snapshot</p>
                </div>
                <div className="bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                    Live Fed Series
                </div>
            </div>
            
            <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yieldCurve}>
                        <defs>
                            <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} opacity={0.5} />
                        <XAxis 
                            dataKey="maturity" 
                            stroke="#4b5563" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            padding={{ left: 20, right: 20 }}
                        />
                        <YAxis 
                            stroke="#4b5563" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(v) => v.toFixed(1) + '%'}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', fontSize: '14px', padding: '12px' }}
                            itemStyle={{ color: '#60a5fa', fontWeight: 'black' }}
                            labelStyle={{ color: '#9ca3af', marginBottom: '8px', fontWeight: 'bold' }}
                            formatter={(value: any) => [`${value.toFixed(3)}%`, "Yield"]}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="yield" 
                            stroke="#3b82f6" 
                            strokeWidth={4} 
                            fillOpacity={1} 
                            fill="url(#colorYield)"
                            dot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }}
                            activeDot={{ r: 8, stroke: '#111827', strokeWidth: 2, fill: '#60a5fa' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-7 gap-px bg-gray-800 border border-gray-800 rounded-xl mt-8 overflow-hidden font-mono text-center">
                {yieldCurve.map((point) => (
                    <div key={point.maturity} className="bg-gray-900 p-4 hover:bg-gray-800 transition-colors">
                        <span className="text-[10px] text-gray-500 uppercase font-black block mb-1">{point.maturity}</span>
                        <span className="text-lg font-bold text-white tracking-widest">{point.yield.toFixed(2)}%</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Other Trends */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {indicators.map((ind) => {
            const item = (data as any)[ind.key];
            return (
                <div key={ind.key} className="bg-gray-900/60 border border-gray-800 p-6 rounded-3xl shadow-xl hover:border-gray-700 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full filter blur-3xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    
                    <div className="flex justify-between items-start mb-6">
                        <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{ind.label}</h3>
                        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em]">{ind.sub} (5-Year Trend)</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.change >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {item.change >= 0 ? 'Increasing' : 'Decreasing'}
                        </div>
                    </div>
                    
                    <div className="h-48 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={item.history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} opacity={0.3} />
                            <XAxis 
                                dataKey="date" 
                                stroke="#4b5563" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                tickCount={4}
                                tickFormatter={(d) => {
                                    const [y, m] = d.split('-');
                                    return `${y.substring(2)}-${m}`;
                                }}
                            />
                            <YAxis 
                                stroke="#4b5563" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(v) => v.toFixed(1) + (ind.suffix || '')}
                                domain={['auto', 'auto']}
                                width={35}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '11px' }}
                                itemStyle={{ color: ind.color, fontWeight: 'bold' }}
                                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke={ind.color} 
                                strokeWidth={3} 
                                dot={false}
                                activeDot={{ r: 5, stroke: '#111827', strokeWidth: 2 }}
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
