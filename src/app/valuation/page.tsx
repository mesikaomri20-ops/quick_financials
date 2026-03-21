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
  AlertCircle,
  Search,
  Target,
  BarChart3,
  Dna
} from "lucide-react";

// Mock data for search demonstration
const MOCK_DATA: Record<string, any> = {
  AAPL: { name: "Apple Inc.", fcf: 100000, revenue: 383000, marketCap: 2800000, price: 180, shares: 15400 },
  NVDA: { name: "NVIDIA Corp.", fcf: 25000, revenue: 60000, marketCap: 2000000, price: 800, shares: 2470 },
  GOOGL: { name: "Alphabet Inc.", fcf: 60000, revenue: 307000, marketCap: 1700000, price: 140, shares: 12400 }
};

export default function ValuationPage() {
  const [activeTab, setActiveTab] = useState<"dcf" | "3y-target">("dcf");
  const [ticker, setTicker] = useState("");

  // Shared Base Metrics
  const [fcf, setFcf] = useState<number>(1000);
  const [revenue, setRevenue] = useState<number>(5000);
  const [marketCap, setMarketCap] = useState<number>(50000);
  const [shares, setShares] = useState<number>(500);
  const [currentPrice, setCurrentPrice] = useState<number>(100);

  // DCF Specific Inputs
  const [growth, setGrowth] = useState<number>(10);
  const [exitMultiple, setExitMultiple] = useState<number>(20);
  const [wacc, setWacc] = useState<number>(9);

  // 3-Year Target Specific Inputs - New Defaults
  const [targetGrowth, setTargetGrowth] = useState<number>(15);
  const [targetMargin, setTargetMargin] = useState<number>(20);
  const [peLow, setPeLow] = useState<number>(12);
  const [peMid, setPeMid] = useState<number>(18);
  const [peHigh, setPeHigh] = useState<number>(25);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = ticker.toUpperCase();
    if (MOCK_DATA[symbol]) {
        const d = MOCK_DATA[symbol];
        setFcf(d.fcf);
        setRevenue(d.revenue);
        setMarketCap(d.marketCap);
        setShares(d.shares);
        setCurrentPrice(d.price);
    }
  };

  // Logic: DCF Model
  const dcfResults = useMemo(() => {
    const projections = [];
    const discountRate = wacc / 100;
    let runningFcf = fcf;
    let totalPvOfFcf = 0;

    for (let i = 1; i <= 5; i++) {
        runningFcf = runningFcf * (1 + growth / 100);
        const pv = runningFcf / Math.pow(1 + discountRate, i);
        projections.push({ year: i, fcf: runningFcf, pv: pv });
        totalPvOfFcf += pv;
    }

    const terminalValue = runningFcf * exitMultiple;
    const pvOfTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);
    const enterpriseValue = totalPvOfFcf + pvOfTerminalValue;
    const fairValuePerShare = enterpriseValue / shares;
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

  // Logic: 3-Year Target Price
  const targetResults = useMemo(() => {
    const rev3Y = revenue * Math.pow(1 + targetGrowth / 100, 3);
    const ni3Y = rev3Y * (targetMargin / 100);
    
    const capLow = ni3Y * peLow;
    const capMid = ni3Y * peMid;
    const capHigh = ni3Y * peHigh;

    const priceLow = capLow / shares;
    const priceMid = capMid / shares;
    const priceHigh = capHigh / shares;

    const upsideLow = ((capLow / marketCap) - 1) * 100;
    const upsideMid = ((capMid / marketCap) - 1) * 100;
    const upsideHigh = ((capHigh / marketCap) - 1) * 100;

    return {
        rev3Y, ni3Y,
        caps: [capLow, capMid, capHigh],
        prices: [priceLow, priceMid, priceHigh],
        upsides: [upsideLow, upsideMid, upsideHigh]
    };
  }, [revenue, targetGrowth, targetMargin, peLow, peMid, peHigh, shares, marketCap]);

  return (
    <div className="min-h-screen bg-gray-950 p-6 md:p-12 text-white font-sans lg:ml-16">
      {/* Search Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-500/20 p-2 rounded-lg">
              <Dna className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">Institutional Terminal</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            Valuation <span className="text-emerald-500">Command Center</span>
          </h1>
        </div>

        <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-hover:text-emerald-500 transition-colors" />
            <input 
                type="text" 
                placeholder="Ex: AAPL, NVDA, GOOGL..." 
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="bg-gray-900/80 border border-gray-800 rounded-2xl py-3 pl-12 pr-6 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all font-mono text-sm w-full md:w-64"
            />
        </form>
      </header>

      {/* Tab Switcher */}
      <div className="flex p-1.5 bg-gray-900 border border-gray-800 rounded-2xl mb-12 w-fit mx-auto md:mx-0">
          <button 
            onClick={() => setActiveTab("dcf")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'dcf' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <BarChart3 className="w-4 h-4" />
            Exit Multiple DCF
          </button>
          <button 
            onClick={() => setActiveTab("3y-target")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === '3y-target' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Target className="w-4 h-4" />
            3Y Growth Target
          </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* Input Column */}
        <div className="xl:col-span-4 space-y-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Core Model Inputs</h2>
            
            <div className="space-y-4">
                {activeTab === 'dcf' ? (
                    <>
                        <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">Current FCF (M$)</label>
                            <input type="number" value={fcf} onChange={(e) => setFcf(Number(e.target.value))} className="bg-transparent border-none outline-none text-2xl font-black text-white w-full" />
                        </div>
                        <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">FCF Growth Rate (%)</label>
                            <input type="number" value={growth} onChange={(e) => setGrowth(Number(e.target.value))} className="bg-transparent border-none outline-none text-2xl font-black text-white w-full" />
                        </div>
                        <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">Exit Multiple (P/FCF)</label>
                            <input type="number" value={exitMultiple} onChange={(e) => setExitMultiple(Number(e.target.value))} className="bg-transparent border-none outline-none text-2xl font-black text-white w-full" />
                        </div>
                        <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all text-center">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1 block group-hover:text-emerald-500 transition-colors">WACC (%)</label>
                            <input type="number" value={wacc} onChange={(e) => setWacc(Number(e.target.value))} className="bg-transparent border-none outline-none text-xl font-black text-white w-full text-center" />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">Current Revenue (M$)</label>
                            <input type="number" value={revenue} onChange={(e) => setRevenue(Number(e.target.value))} className="bg-transparent border-none outline-none text-2xl font-black text-white w-full" />
                        </div>
                        <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">3Y Rev Growth (%)</label>
                            <input type="number" value={targetGrowth} onChange={(e) => setTargetGrowth(Number(e.target.value))} className="bg-transparent border-none outline-none text-2xl font-black text-white w-full" />
                        </div>
                        <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all">
                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">Target Net Margin (%)</label>
                            <input type="number" value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} className="bg-transparent border-none outline-none text-2xl font-black text-white w-full" />
                        </div>

                        {/* Triple P/E Inputs */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl text-center hover:border-emerald-500/30 transition-all">
                                <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1 block">Bear P/E</label>
                                <input type="number" value={peLow} onChange={(e) => setPeLow(Number(e.target.value))} className="bg-transparent border-none outline-none text-lg font-black text-white w-full text-center" />
                            </div>
                            <div className="bg-gray-900/40 border border-emerald-500/30 p-4 rounded-xl text-center shadow-lg shadow-emerald-500/5">
                                <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 block">Base P/E</label>
                                <input type="number" value={peMid} onChange={(e) => setPeMid(Number(e.target.value))} className="bg-transparent border-none outline-none text-lg font-black text-white w-full text-center" />
                            </div>
                            <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-xl text-center hover:border-emerald-500/30 transition-all">
                                <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1 block">Bull P/E</label>
                                <input type="number" value={peHigh} onChange={(e) => setPeHigh(Number(e.target.value))} className="bg-transparent border-none outline-none text-lg font-black text-white w-full text-center" />
                            </div>
                        </div>
                    </>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl text-center group hover:border-emerald-500/30 transition-all">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1 block group-hover:text-emerald-500 transition-colors">Current Price</label>
                        <input type="number" value={currentPrice} onChange={(e) => setCurrentPrice(Number(e.target.value))} className="bg-transparent border-none outline-none text-xl font-black text-white w-full text-center" />
                    </div>
                    <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl text-center group hover:border-emerald-500/30 transition-all">
                        <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1 block group-hover:text-emerald-500 transition-colors">Shares (M)</label>
                        <input type="number" value={shares} onChange={(e) => setShares(Number(e.target.value))} className="bg-transparent border-none outline-none text-xl font-black text-white w-full text-center" placeholder="Shares" />
                    </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/30 transition-all">
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block group-hover:text-emerald-500 transition-colors">Current Market Cap (M$)</label>
                    <input type="number" value={marketCap} onChange={(e) => setMarketCap(Number(e.target.value))} className="bg-transparent border-none outline-none text-2xl font-black text-white w-full" placeholder="Market Cap" />
                </div>
            </div>
        </div>

        {/* Results Column */}
        <div className="xl:col-span-8 space-y-8">
            {activeTab === 'dcf' ? (
                /* DCF RESULTS UI */
                <>
                    <div className="bg-emerald-900/10 border border-emerald-500/20 p-10 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div>
                                <span className="text-xs font-bold text-emerald-500/60 uppercase tracking-widest mb-3 block">Intrinsic Fair Value</span>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-8xl font-black text-white tracking-tighter">${dcfResults.fairValuePerShare.toFixed(2)}</span>
                                    <span className="text-lg font-bold text-gray-500 uppercase tracking-widest">USD</span>
                                </div>
                            </div>
                            <div className={`p-8 rounded-3xl border ${dcfResults.marginOfSafety > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'} flex flex-col items-center min-w-[180px]`}>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Margin of Safety</span>
                                <span className={`text-4xl font-black ${dcfResults.marginOfSafety > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{dcfResults.marginOfSafety.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden border border-gray-800 rounded-3xl bg-gray-900/20">
                        <table className="w-full text-left font-mono">
                            <thead>
                                <tr className="bg-gray-900/80 border-b border-gray-800 text-[10px] text-gray-500 uppercase tracking-[0.2em]">
                                    <th className="px-8 py-5">Projection Year</th>
                                    <th className="px-8 py-5">Forecast FCF</th>
                                    <th className="px-8 py-5 text-right">Discounted PV</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {dcfResults.projections.map((p) => (
                                    <tr key={p.year} className="hover:bg-emerald-500/5 transition-colors">
                                        <td className="px-8 py-5 text-sm text-gray-400 font-bold">Phase 1 - Year {p.year}</td>
                                        <td className="px-8 py-5 text-lg font-black text-gray-200">${p.fcf.toFixed(0)}M</td>
                                        <td className="px-8 py-5 text-lg font-black text-emerald-500 text-right">${p.pv.toFixed(0)}M</td>
                                    </tr>
                                ))}
                                <tr className="bg-emerald-500/5">
                                    <td className="px-8 py-6 font-black text-emerald-500 uppercase text-xs">Terminal Value (Multiple)</td>
                                    <td className="px-8 py-6 text-gray-500 text-xs font-bold">Multiple: {exitMultiple}x</td>
                                    <td className="px-8 py-6 text-2xl font-black text-emerald-500 text-right">${dcfResults.pvOfTerminalValue.toFixed(0)}M</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                /* 3Y TARGET RESULTS UI */
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {['Pessimistic', 'Neutral', 'Optimistic'].map((scenario, i) => {
                            const pe = i === 0 ? peLow : i === 1 ? peMid : peHigh;
                            const upside = targetResults.upsides[i];
                            const color = scenario === 'Pessimistic' ? 'rose' : scenario === 'Neutral' ? 'emerald' : 'blue';
                            const colorHex = scenario === 'Pessimistic' ? '#fb7185' : scenario === 'Neutral' ? '#10b981' : '#3b82f6';
                            
                            return (
                                <div key={scenario} className={`bg-gray-900/60 border border-gray-800 p-8 rounded-[2rem] hover:border-${color}-500/30 transition-all group`}>
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mb-4 block group-hover:text-white transition-colors">{scenario} Target</span>
                                    <div className="flex items-baseline gap-1 mb-6">
                                        <span className={`text-4xl font-black text-white`}>${targetResults.prices[i].toFixed(2)}</span>
                                        <span className="text-[10px] text-gray-600 font-bold">USD</span>
                                    </div>
                                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${upside > 0 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/5 border-rose-500/20 text-rose-500'}`}>
                                        {upside > 0 ? <TrendingUp className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                        <span className="text-sm font-black whitespace-nowrap">{upside > 0 ? '+' : ''}{upside.toFixed(1)}% Upside</span>
                                    </div>
                                    <div className="mt-6 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                                        <span>Target P/E:</span>
                                        <span className="font-bold text-white uppercase tracking-widest">{pe}x</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-gray-900/30 border border-gray-800 rounded-[2.5rem] p-10 mt-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-emerald-500" />
                                    Forecast Path (Year 3)
                                </h3>
                                <div className="space-y-6 font-mono">
                                    <div className="flex justify-between items-end border-b border-gray-800/50 pb-2">
                                        <span className="text-xs text-gray-600 font-bold">PROJECTED REVENUE</span>
                                        <span className="text-2xl font-black text-white">${(targetResults.rev3Y / 1000).toFixed(2)}B</span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-gray-800/50 pb-2">
                                        <span className="text-xs text-gray-600 font-bold">PROJECTED NET INCOME</span>
                                        <span className="text-2xl font-black text-emerald-400">${(targetResults.ni3Y / 1000).toFixed(2)}B</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-800/20 p-8 rounded-3xl border border-gray-800/50 flex flex-col justify-center gap-4">
                                <p className="text-[11px] text-gray-500 leading-relaxed uppercase tracking-widest font-bold pr-4">
                                    The 3-Year Target model projects future earnings based on compounded revenue growth and target operational efficiency (margins).
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest">Growth First</div>
                                    <div className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-widest">Scenario Based</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
}
