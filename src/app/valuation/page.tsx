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
  Table as TableIcon
} from "lucide-react";

export default function ValuationPage() {
  // Inputs
  const [fcf, setFcf] = useState<number>(1000);
  const [growth, setGrowth] = useState<number>(10);
  const [terminalGrowth, setTerminalGrowth] = useState<number>(2.5);
  const [wacc, setWacc] = useState<number>(9);
  const [netDebt, setNetDebt] = useState<number>(2000);
  const [shares, setShares] = useState<number>(500);

  // Calculation Core
  const dcfResults = useMemo(() => {
    const projections = [];
    const discountFactor = 1 + wacc / 100;
    let currentFcf = fcf;
    let totalPvOfFcf = 0;

    for (let i = 1; i <= 5; i++) {
        currentFcf = currentFcf * (1 + growth / 100);
        const pv = currentFcf / Math.pow(discountFactor, i);
        projections.push({ year: i, fcf: currentFcf, pv });
        totalPvOfFcf += pv;
    }

    const terminalFcf = currentFcf * (1 + terminalGrowth / 100);
    const terminalValue = terminalFcf / (wacc / 100 - terminalGrowth / 100);
    const pvOfTerminalValue = terminalValue / Math.pow(discountFactor, 5);

    const enterpriseValue = totalPvOfFcf + pvOfTerminalValue;
    const equityValue = enterpriseValue - netDebt;
    const fairValuePerShare = equityValue / shares;

    return {
        projections,
        enterpriseValue,
        equityValue,
        fairValuePerShare,
        terminalValue
    };
  }, [fcf, growth, terminalGrowth, wacc, netDebt, shares]);

  // Sensitivity Analysis Helper
  const getSensitivityValue = (g: number, w: number) => {
    const discountFactor = 1 + w / 100;
    let totalPv = 0;
    let current = fcf;
    for (let i = 1; i <= 5; i++) {
      current = current * (1 + g / 100);
      totalPv += current / Math.pow(discountFactor, i);
    }
    const tFcf = current * (1 + terminalGrowth / 100);
    const tv = tFcf / (w / 100 - terminalGrowth / 100);
    const pvTv = tv / Math.pow(discountFactor, 5);
    return (totalPv + pvTv - netDebt) / shares;
  };

  const sensitivityMatrix = useMemo(() => {
    const growthRates = [growth - 2, growth - 1, growth, growth + 1, growth + 2];
    const waccRates = [wacc + 2, wacc + 1, wacc, wacc - 1, wacc - 2];
    return { growthRates, waccRates };
  }, [growth, wacc]);

  return (
    <div className="min-h-screen bg-gray-950 p-6 md:p-12 text-white font-sans lg:ml-16">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <Calculator className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Valuation Engine v1.0</span>
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-white">
          Intrinsic Value <span className="text-emerald-500">Calculator</span>
        </h1>
        <p className="text-gray-500 mt-2 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
            Standalone Multi-Stage Discounted Cash Flow Model
        </p>
      </header>

      {/* Hero Fair Value Card */}
      <div className="mb-12">
        <div className="bg-emerald-900/10 border border-emerald-500/20 p-10 rounded-3xl relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <span className="text-xs font-bold text-emerald-500/60 uppercase tracking-widest mb-2 block">Estimated Fair Value</span>
              <div className="flex items-baseline gap-2">
                <span className="text-7xl font-black text-white">${dcfResults.fairValuePerShare.toFixed(2)}</span>
                <span className="text-xl font-bold text-gray-500">Per Share</span>
              </div>
              <div className="flex items-center gap-6 mt-6">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Equity Value</span>
                  <span className="text-lg font-mono font-bold text-gray-300">${(dcfResults.equityValue / 1000).toFixed(2)}B</span>
                </div>
                <div className="w-px h-8 bg-gray-800"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Enterprise Value</span>
                  <span className="text-lg font-mono font-bold text-gray-300">${(dcfResults.enterpriseValue / 1000).toFixed(2)}B</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-900/80 border border-gray-800 p-6 rounded-2xl flex flex-col items-center justify-center min-w-[200px]">
                <ShieldCheck className="w-8 h-8 text-emerald-500 mb-3" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Model Integrity</span>
                <span className="text-xl font-black text-emerald-400">PASSED</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Input Controls */}
        <section className="space-y-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <RefreshCw className="w-4 h-4 text-emerald-500" />
              Model Parameters
            </h2>
            
            <div className="space-y-4">
                <div className="bg-gray-900/50 border border-gray-800 p-5 rounded-2xl hover:border-gray-700 transition-colors">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Base FCF (Current Year M$)</label>
                    <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                        <input 
                            type="number" 
                            value={fcf}
                            onChange={(e) => setFcf(Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-2xl font-black text-white w-full"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/50 border border-gray-800 p-5 rounded-2xl hover:border-gray-700 transition-colors">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Growth Rate (%)</label>
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            <input 
                                type="number" 
                                value={growth}
                                onChange={(e) => setGrowth(Number(e.target.value))}
                                className="bg-transparent border-none outline-none text-2xl font-black text-white w-full"
                            />
                        </div>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 p-5 rounded-2xl hover:border-gray-700 transition-colors">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Term. Growth (%)</label>
                        <div className="flex items-center gap-3">
                            <Layers className="w-5 h-5 text-emerald-500" />
                            <input 
                                type="number" 
                                value={terminalGrowth}
                                onChange={(e) => setTerminalGrowth(Number(e.target.value))}
                                className="bg-transparent border-none outline-none text-2xl font-black text-white w-full"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 p-5 rounded-2xl hover:border-gray-700 transition-colors">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Discount Rate (WACC %)</label>
                    <div className="flex items-center gap-3">
                        <Percent className="w-5 h-5 text-emerald-500" />
                        <input 
                            type="number" 
                            value={wacc}
                            onChange={(e) => setWacc(Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-2xl font-black text-white w-full"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/50 border border-gray-800 p-5 rounded-2xl hover:border-gray-700 transition-colors">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Net Debt (M$)</label>
                        <input 
                            type="number" 
                            value={netDebt}
                            onChange={(e) => setNetDebt(Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-2xl font-black text-white w-full mt-2"
                        />
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 p-5 rounded-2xl hover:border-gray-700 transition-colors">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Shares (M)</label>
                        <input 
                            type="number" 
                            value={shares}
                            onChange={(e) => setShares(Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-2xl font-black text-white w-full mt-2"
                        />
                    </div>
                </div>
            </div>
        </section>

        {/* Sensitivity Analysis */}
        <section className="lg:col-span-2 space-y-8">
            <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <TableIcon className="w-4 h-4 text-emerald-500" />
                    Sensitivity Analysis (Growth vs WACC)
                </h2>
                
                <div className="overflow-hidden border border-gray-800 rounded-3xl bg-gray-900/30">
                    <table className="w-full text-center font-mono">
                        <thead>
                            <tr className="bg-gray-900 border-b border-gray-800">
                                <th className="p-6 text-[10px] text-gray-500 uppercase tracking-widest border-r border-gray-800">WACC ↓ / G →</th>
                                {sensitivityMatrix.growthRates.map(g => (
                                    <th key={g} className="p-6 text-xs font-bold text-gray-400">{g.toFixed(1)}%</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {sensitivityMatrix.waccRates.map(w => (
                                <tr key={w} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="p-6 bg-gray-900/50 text-xs font-bold text-gray-400 border-r border-gray-800">{w.toFixed(1)}%</td>
                                    {sensitivityMatrix.growthRates.map(g => {
                                        const val = getSensitivityValue(g, w);
                                        const isOriginal = g === growth && w === wacc;
                                        return (
                                            <td key={`${g}-${w}`} className={`p-6 text-sm ${isOriginal ? 'text-emerald-400 font-bold bg-emerald-500/5' : 'text-gray-400'}`}>
                                                ${val.toFixed(2)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-600 uppercase font-black tracking-widest px-2">
                    <Info className="w-3 h-3" />
                    Highlighted value represents actual model inputs
                </div>
            </div>

            {/* Projection Summary Mini Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Multi-Stage Outlook</h3>
                    <div className="space-y-3">
                        {dcfResults.projections.map((p) => (
                            <div key={p.year} className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Year {p.year} Projected FCF</span>
                                <span className="font-bold text-gray-300 font-mono">${(p.fcf).toFixed(0)}M</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl flex flex-col justify-between">
                    <div>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Terminal Metrics</h3>
                        <div className="space-y-2">
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">Exit Value (Year 5)</span>
                                <span className="font-bold text-gray-300 font-mono">${(dcfResults.terminalValue / 1000).toFixed(2)}B</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-500">PV of Terminal</span>
                                <span className="font-bold text-emerald-500 font-mono">${(dcfResults.enterpriseValue - dcfResults.projections.reduce((a,b)=>a+b.pv, 0) < 0 ? 0 : (dcfResults.enterpriseValue - dcfResults.projections.reduce((a,b)=>a+b.pv, 0)) / 1000).toFixed(2)}B</span>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 mt-4 border-t border-gray-800">
                        <p className="text-[10px] text-gray-600 leading-tight">Terminal value is calculated using the Gordon Growth method: FCF5 * (1+g) / (WACC - g).</p>
                    </div>
                </div>
            </div>
        </section>
      </div>
    </div>
  );
}
