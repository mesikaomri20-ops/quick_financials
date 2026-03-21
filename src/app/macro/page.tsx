"use client";

import React, { useEffect, useState } from "react";
import { getMacroData, type MacroData } from "../actions";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Percent, 
  Globe, 
  ArrowRightLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";

export default function MacroPage() {
  const [data, setData] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getMacroData();
      setData(result);
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
      <div className="min-h-screen bg-gray-950 p-12 text-white">
        <p>Failed to load macro data. Please check FMP_KEY / FRED_KEY.</p>
      </div>
    );
  }

  const indicators = [
    { key: 'rates', label: 'Interest Rate', sub: 'Fed Funds', color: '#10b981', suffix: '%' },
    { key: 'inflation', label: 'Inflation', sub: 'CPI YoY', color: '#f59e0b', suffix: '%' },
    { key: 'unemployment', label: 'Unemployment', sub: 'National Rate', color: '#ef4444', suffix: '%' },
    { key: 'yield10y', label: 'Treasury Yield', sub: '10Y Note', color: '#3b82f6', suffix: '%' },
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
      
      {/* Summary Table */}
      <section className="mb-12">
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
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

      {/* Trend Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
        {indicators.map((ind) => {
          const item = (data as any)[ind.key];
          return (
            <div key={ind.key} className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl shadow-xl hover:border-gray-700 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">{ind.label}</h3>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em]">{ind.sub} (5-Year Trend)</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.change >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                  {item.change >= 0 ? 'Expandal' : 'Contraction'}
                </div>
              </div>
              
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={item.history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#4b5563" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(d) => d.substring(2, 7)} // YY-MM
                    />
                    <YAxis 
                      stroke="#4b5563" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(v) => v.toFixed(1) + (ind.suffix || '')}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: ind.color, fontWeight: 'bold' }}
                      labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={ind.color} 
                      strokeWidth={3} 
                      dot={false}
                      activeDot={{ r: 6, stroke: '#111827', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
