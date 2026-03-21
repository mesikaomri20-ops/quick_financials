"use client";

import React, { useState, useMemo } from "react";
import { 
  Calculator, 
  TrendingUp, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Percent, 
  DollarSign,
  Info,
  RefreshCw,
  Table as TableIcon,
  ChevronRight,
  AlertCircle
} from "lucide-react";

export default function ValuationPage() {
  // Inputs
  const [fcf, setFcf] = useState<number>(1000);
  const [growth, setGrowth] = useState<number>(10);
  const [exitMultiple, setExitMultiple] = useState<number>(20);
  const [wacc, setWacc] = useState<number>(9);
  const [shares, setShares] = useState<number>(500);
  const [currentPrice, setCurrentPrice] = useState<number>(150);

  // Exit Multiple Calculation Logic
  const dcfResults = useMemo(() => {
    const projections = [];
    const discountRate = wacc / 100;
    let runningFcf = fcf;
    let totalPvOfFcf = 0;

    // 1. Project FCF for 5 Years
    for (let i = 1; i <= 5; i++) {
        runningFcf = runningFcf * (1 + growth / 100);
        const pv = runningFcf / Math.pow(1 + discountRate, i);
        projections.push({ 
            year: i, 
            fcf: runningFcf, 
            pv: pv 
        });
        totalPvOfFcf += pv;
    }

    // 2. Terminal Value (Exit Multiple Method)
    const terminalValue = runningFcf * exitMultiple;
    const pvOfTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);

    // 3. Intrinsic Value
    const enterpriseValue = totalPvOfFcf + pvOfTerminalValue;
    const fairValuePerShare = enterpriseValue / shares;

    // 4. Margin of Safety
    const marginOfSafety = ((fairValuePerShare - currentPrice) / fairValuePerShare) * 100;

    return {
        projections,
        enterpriseValue,
        fairValuePerShare,
        terminalValue,
        pvOfTerminalValue,
        totalPvOfFcf,
        marginOfSafety
    };
  }, [fcf, growth, exitMultiple, wacc, shares, currentPrice]);

  return (
    <div className="min-h-screen bg-gray-950 p-6 md:p-12 text-white font-sans lg:ml-16">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <Calculator className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Institutional Valuation Framework</span>
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-white uppercase">
          DCF <span className="text-emerald-500 underline decoration-emerald-500/30 underline-offset-8">Exit Multiple</span> Model
        </h1>
        <p className="text-gray-500 mt-4 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
            Professional Grade Multi-Stage Cash Flow Analysis
        </p>
      </header>

      {/* Hero: Fair Value & MOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-gray-950 border border-emerald-500/20 p-10 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <span className="text-xs font-bold text-emerald-500/60 uppercase tracking-widest mb-3 block">Intrinsic Fair Value</span>
              <div className="flex items-baseline gap-3">
                <span className="text-8xl font-black text-white tracking-tighter">${dcfResults.fairValuePerShare.toFixed(2)}</span>
                <span className="text-lg font-bold text-gray-500 uppercase tracking-widest">USD / Share</span>
              </div>
            </div>
            
            <div className={`p-8 rounded-3xl border ${dcfResults.marginOfSafety > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'} flex flex-col items-center justify-center min-w-[180px]`}>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Margin of Safety</span>
                <span className={`text-3xl font-black ${dcfResults.marginOfSafety > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {dcfResults.marginOfSafety.toFixed(1)}%
                </span>
                <div className="mt-2 flex items-center gap-1">
                    {dcfResults.marginOfSafety > 15 ? (
                         <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    ) : (
                         <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                        {dcfResults.marginOfSafety > 0 ? 'Undervalued' : 'Overvalued'}
                    </span>
                </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-[2.5rem] flex flex-col justify-center">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 border-b border-gray-800 pb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                Value Composition
            </h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Year 1-5 PV</span>
                    <span className="font-bold text-gray-300 font-mono">${(dcfResults.totalPvOfFcf / 1000).toFixed(2)}B</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Terminal PV</span>
                    <span className="font-bold text-gray-300 font-mono">${(dcfResults.pvOfTerminalValue / 1000).toFixed(2)}B</span>
                </div>
                <div className="pt-4 border-t border-gray-800 flex justify-between items-center">
                    <span className="text-xs font-black text-emerald-500 uppercase">Enterprise Value</span>
                    <span className="text-xl font-black text-white font-mono">${(dcfResults.enterpriseValue / 1000).toFixed(2)}B</span>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* Controls */}
        <div className="xl:col-span-4 space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-500" />
                Model Controls
                </h2>
                <span className="text-[10px] text-gray-700 font-bold uppercase cursor-help underline decoration-dotted">Definitions</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {/* Current FCF */}
                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">Current FCF (M$)</label>
                    <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-gray-700 group-hover:text-emerald-500 transition-colors" />
                        <input 
                            type="number" 
                            value={fcf}
                            onChange={(e) => setFcf(Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-2xl font-black text-white w-full"
                        />
                    </div>
                </div>

                {/* Growth Rate */}
                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">Exp. Growth (Next 5Y %)</label>
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-gray-700 group-hover:text-emerald-500 transition-colors" />
                        <input 
                            type="number" 
                            value={growth}
                            onChange={(e) => setGrowth(Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-2xl font-black text-white w-full"
                        />
                    </div>
                </div>

                {/* Exit Multiple */}
                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">Exit Multiple (P/FCF)</label>
                    <div className="flex items-center gap-3">
                        <Layers className="w-5 h-5 text-gray-700 group-hover:text-emerald-500 transition-colors" />
                        <input 
                            type="number" 
                            value={exitMultiple}
                            onChange={(e) => setExitMultiple(Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-2xl font-black text-white w-full"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all text-center">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1 block">WACC (%)</label>
                        <input 
                            type="number" 
                            value={wacc}
                            onChange={(e) => setWacc(Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-xl font-black text-white w-full text-center"
                        />
                    </div>
                    <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all text-center">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1 block">Current Price</label>
                        <input 
                            type="number" 
                            value={currentPrice}
                            onChange={(e) => setCurrentPrice(Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-xl font-black text-white w-full text-center"
                        />
                    </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">Shares Outstanding (M)</label>
                    <input 
                        type="number" 
                        value={shares}
                        onChange={(e) => setShares(Number(e.target.value))}
                        className="bg-transparent border-none outline-none text-2xl font-black text-white w-full"
                    />
                </div>
            </div>
        </div>

        {/* Projection Data */}
        <div className="xl:col-span-8">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-10">
                <TableIcon className="w-4 h-4 text-emerald-500" />
                Multi-Stage FCF Projections
            </h2>

            <div className="overflow-hidden border border-gray-800 rounded-3xl bg-gray-900/20 backdrop-blur-xl shadow-xl">
                <table className="w-full text-left font-mono">
                    <thead>
                        <tr className="bg-gray-900/80 border-b border-gray-800">
                            <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Year</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Forecast FCF</th>
                            <th className="px-8 py-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Discounted PV</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {dcfResults.projections.map((p) => (
                            <tr key={p.year} className="hover:bg-emerald-500/5 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 group-hover:animate-pulse"></div>
                                        <span className="text-sm font-bold text-gray-300">Phase 1 - Year {p.year}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-lg font-black text-white">
                                    ${p.fcf.toFixed(0)}M
                                </td>
                                <td className="px-8 py-6 text-lg font-black text-emerald-400 text-right">
                                    ${p.pv.toFixed(0)}M
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-emerald-500/5">
                            <td className="px-8 py-8 font-black text-emerald-500 uppercase text-xs tracking-widest">Year 5 Exit (PV)</td>
                            <td className="px-8 py-8 text-gray-500">
                                <span className="text-[10px] uppercase font-bold mr-2">Multiple:</span> {exitMultiple}x
                            </td>
                            <td className="px-8 py-8 text-2xl font-black text-emerald-400 text-right">
                                ${(dcfResults.pvOfTerminalValue).toFixed(0)}M
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-8 p-6 bg-gray-900/40 border border-dashed border-gray-800 rounded-2xl flex items-start gap-4">
                <Info className="w-5 h-5 text-gray-600 shrink-0 mt-1" />
                <p className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-tighter">
                    Terminal Value is calculated by applying a target <span className="text-emerald-500 font-bold underline">Exit Multiple</span> to Year 5 FCF, then discounting it back to the present at the WACC. This represents the total cash value of the business at the point of hypothetical sale in year 5.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
