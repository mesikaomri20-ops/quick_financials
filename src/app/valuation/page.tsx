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
    <div className="min-h-screen bg-background p-6 md:p-12 text-foreground transition-colors duration-300">
      {/* Search Header */}
      <header className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8 mt-16 md:mt-0">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-foreground/5 p-2 rounded-xl">
              <Dna className="w-6 h-6 text-foreground/40" />
            </div>
            <span className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.4em]">Institutional Terminal</span>
          </div>
          <h1 className="text-5xl font-extralight tracking-tighter text-foreground leading-none">
            Valuation <span className="text-accent-gold italic opacity-80">Terminal</span>
          </h1>
        </div>

        <form onSubmit={handleSearch} className="relative group w-full lg:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-hover:text-emerald-500 transition-colors" />
            <input 
                type="text" 
                placeholder="EX: AAPL, NVDA, GOOGL..." 
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="bg-card/50 border border-border-lux rounded-2xl py-3.5 pl-12 pr-6 outline-none focus:ring-2 focus:ring-accent-gold/20 transition-all font-mono text-xs font-bold w-full lg:w-64 placeholder:opacity-30"
            />
        </form>
      </header>

      {/* Tab Switcher */}
      <div className="flex p-1.5 bg-foreground/5 border border-border-lux rounded-[2rem] mb-16 w-fit mx-auto lg:mx-0 backdrop-blur-md">
          <button 
            onClick={() => setActiveTab("dcf")}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'dcf' ? 'bg-foreground text-background shadow-lg' : 'text-foreground/30 hover:text-foreground/60'}`}
          >
            <BarChart3 className="w-4 h-4" />
            Intrinsic_DCF
          </button>
          <button 
            onClick={() => setActiveTab("3y-target")}
            className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === '3y-target' ? 'bg-foreground text-background shadow-lg' : 'text-foreground/30 hover:text-foreground/60'}`}
          >
            <Target className="w-4 h-4" />
            Growth_Target
          </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 mb-32">
        {/* Input Column */}
        <div className="xl:col-span-4 space-y-8">
            <h2 className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.4em] mb-4">Core Model Parameters</h2>
            
            <div className="space-y-6">
                {activeTab === 'dcf' ? (
                    <>
                        <div className="bg-card/30 border border-border-lux p-8 rounded-[2rem] group hover:border-foreground/10 transition-all backdrop-blur-md">
                            <label className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-3 block group-hover:text-emerald-500/50 transition-colors">Current FCF (M$)</label>
                            <input type="number" value={fcf} onChange={(e) => setFcf(Number(e.target.value))} className="bg-transparent border-none outline-none text-3xl font-extralight tracking-tighter text-foreground w-full" />
                        </div>
                        <div className="bg-card/30 border border-border-lux p-8 rounded-[2rem] group hover:border-foreground/10 transition-all backdrop-blur-md">
                            <label className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-3 block group-hover:text-emerald-500/50 transition-colors">Growth Velocity (%)</label>
                            <input type="number" value={growth} onChange={(e) => setGrowth(Number(e.target.value))} className="bg-transparent border-none outline-none text-3xl font-extralight tracking-tighter text-foreground w-full" />
                        </div>
                        <div className="bg-card/30 border border-border-lux p-8 rounded-[2rem] group hover:border-foreground/10 transition-all backdrop-blur-md">
                            <label className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-3 block group-hover:text-emerald-500/50 transition-colors">Exit Mult (P/FCF)</label>
                            <input type="number" value={exitMultiple} onChange={(e) => setExitMultiple(Number(e.target.value))} className="bg-transparent border-none outline-none text-3xl font-extralight tracking-tighter text-foreground w-full" />
                        </div>
                        <div className="bg-card/30 border border-border-lux p-8 rounded-[2rem] group hover:border-foreground/10 transition-all backdrop-blur-md text-center">
                            <label className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-3 block group-hover:text-emerald-500/50 transition-colors">Capital Cost (WACC %)</label>
                            <input type="number" value={wacc} onChange={(e) => setWacc(Number(e.target.value))} className="bg-transparent border-none outline-none text-2xl font-extralight tracking-tighter text-foreground w-full text-center" />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="bg-card/30 border border-border-lux p-8 rounded-[2rem] group hover:border-foreground/10 transition-all backdrop-blur-md">
                            <label className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-3 block group-hover:text-emerald-500/50 transition-colors">Gross Revenue (M$)</label>
                            <input type="number" value={revenue} onChange={(e) => setRevenue(Number(e.target.value))} className="bg-transparent border-none outline-none text-3xl font-extralight tracking-tighter text-foreground w-full" />
                        </div>
                        <div className="bg-card/30 border border-border-lux p-8 rounded-[2rem] group hover:border-foreground/10 transition-all backdrop-blur-md">
                            <label className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-3 block group-hover:text-emerald-500/50 transition-colors">CAGR Target (%)</label>
                            <input type="number" value={targetGrowth} onChange={(e) => setTargetGrowth(Number(e.target.value))} className="bg-transparent border-none outline-none text-3xl font-extralight tracking-tighter text-foreground w-full" />
                        </div>
                        <div className="bg-card/30 border border-border-lux p-8 rounded-[2rem] group hover:border-foreground/10 transition-all backdrop-blur-md">
                            <label className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-3 block group-hover:text-emerald-500/50 transition-colors">Op Margin (%)</label>
                            <input type="number" value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} className="bg-transparent border-none outline-none text-3xl font-extralight tracking-tighter text-foreground w-full" />
                        </div>

                        {/* Triple P/E Inputs */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-card/30 border border-border-lux p-4 rounded-[1.5rem] text-center hover:border-foreground/10 transition-all">
                                <label className="text-[8px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-2 block">Bear_PE</label>
                                <input type="number" value={peLow} onChange={(e) => setPeLow(Number(e.target.value))} className="bg-transparent border-none outline-none text-xl font-extralight tracking-tighter text-foreground w-full text-center" />
                            </div>
                            <div className="bg-foreground/5 border border-accent-gold/20 p-4 rounded-[1.5rem] text-center shadow-xl shadow-accent-gold/5">
                                <label className="text-[8px] font-black text-accent-gold uppercase tracking-[0.2em] mb-2 block font-bold">Base_PE</label>
                                <input type="number" value={peMid} onChange={(e) => setPeMid(Number(e.target.value))} className="bg-transparent border-none outline-none text-xl font-extralight tracking-tighter text-foreground w-full text-center" />
                            </div>
                            <div className="bg-card/30 border border-border-lux p-4 rounded-[1.5rem] text-center hover:border-foreground/10 transition-all">
                                <label className="text-[8px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-2 block">Bull_PE</label>
                                <input type="number" value={peHigh} onChange={(e) => setPeHigh(Number(e.target.value))} className="bg-transparent border-none outline-none text-xl font-extralight tracking-tighter text-foreground w-full text-center" />
                            </div>
                        </div>
                    </>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-card/30 border border-border-lux p-6 rounded-[2rem] text-center group hover:border-foreground/10 transition-all">
                        <label className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-2 block group-hover:text-emerald-500/50 transition-colors">Spot Price</label>
                        <input type="number" value={currentPrice} onChange={(e) => setCurrentPrice(Number(e.target.value))} className="bg-transparent border-none outline-none text-2xl font-extralight tracking-tighter text-foreground w-full text-center" />
                    </div>
                    <div className="bg-card/30 border border-border-lux p-6 rounded-[2rem] text-center group hover:border-foreground/10 transition-all">
                        <label className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-2 block group-hover:text-emerald-500/50 transition-colors">Floating Shares</label>
                        <input type="number" value={shares} onChange={(e) => setShares(Number(e.target.value))} className="bg-transparent border-none outline-none text-2xl font-extralight tracking-tighter text-foreground w-full text-center" />
                    </div>
                </div>

                <div className="bg-card/30 border border-foreground/5 p-8 rounded-[2rem] group hover:border-foreground/10 transition-all backdrop-blur-sm">
                    <label className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.3em] mb-3 block group-hover:text-emerald-500/50 transition-colors">Cap Matrix (M$)</label>
                    <input type="number" value={marketCap} onChange={(e) => setMarketCap(Number(e.target.value))} className="bg-transparent border-none outline-none text-3xl font-extralight tracking-tighter text-foreground w-full" />
                </div>
            </div>
        </div>

        {/* Results Column */}
        <div className="xl:col-span-8 space-y-12">
            {activeTab === 'dcf' ? (
                /* DCF RESULTS UI */
                <>
                    <div className="bg-card/40 backdrop-blur-2xl border border-border-lux p-10 md:p-16 rounded-[3.5rem] relative overflow-hidden group shadow-3xl">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full filter blur-[120px] -mr-32 -mt-32 pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-1000"></div>
                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                            <div>
                                <span className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.4em] mb-4 block">Calculated Fair Value</span>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-9xl font-extralight text-foreground tracking-tighter leading-none">${dcfResults.fairValuePerShare.toFixed(2)}</span>
                                    <span className="text-xl font-bold text-foreground/20 uppercase tracking-widest">USD</span>
                                </div>
                            </div>
                            <div className={`p-10 rounded-[2.5rem] border ${dcfResults.marginOfSafety > 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'} flex flex-col items-center min-w-[220px] backdrop-blur-md shadow-xl`}>
                                <span className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.3em] mb-2">Safety_Margin</span>
                                <span className={`text-6xl font-extralight tracking-tighter ${dcfResults.marginOfSafety > 0 ? 'text-accent-gold' : 'text-rose-500'}`}>{dcfResults.marginOfSafety.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden border border-border-lux rounded-[3rem] bg-card/20 backdrop-blur-md shadow-2xl">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left font-mono">
                              <thead>
                                  <tr className="bg-foreground/5 text-[9px] text-foreground/20 uppercase font-black tracking-[0.4em]">
                                      <th className="px-10 py-6">Node_Year</th>
                                      <th className="px-10 py-6">FCF_Projection</th>
                                      <th className="px-10 py-6 text-right">Present_Value</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-foreground/5">
                                  {dcfResults.projections.map((p) => (
                                      <tr key={p.year} className="hover:bg-foreground/5 transition-all duration-300">
                                          <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                              <div className="w-1 h-3 bg-foreground/10 rounded-full"></div>
                                              <span className="text-xs text-foreground/40 font-black uppercase tracking-widest">Phase_0{p.year}</span>
                                            </div>
                                          </td>
                                          <td className="px-10 py-6 text-2xl font-extralight tracking-tighter text-foreground">${p.fcf.toFixed(0)}M</td>
                                          <td className="px-10 py-6 text-2xl font-extralight tracking-tighter text-emerald-500 text-right">${p.pv.toFixed(0)}M</td>
                                      </tr>
                                  ))}
                                  <tr className="bg-foreground/5">
                                      <td className="px-10 py-8 font-black text-foreground/40 uppercase text-[10px] tracking-[0.3em]">Terminal Value Multiple</td>
                                      <td className="px-10 py-8 text-foreground/20 text-[10px] font-black uppercase tracking-widest">Exit: {exitMultiple}x</td>
                                      <td className="px-10 py-8 text-4xl font-extralight tracking-tighter text-emerald-500 text-right leading-none">${dcfResults.pvOfTerminalValue.toFixed(0)}M</td>
                                  </tr>
                              </tbody>
                          </table>
                        </div>
                    </div>
                </>
            ) : (
                /* 3Y TARGET RESULTS UI */
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {['Pessimistic', 'Neutral', 'Optimistic'].map((scenario, i) => {
                            const pe = i === 0 ? peLow : i === 1 ? peMid : peHigh;
                            const upside = targetResults.upsides[i];
                            const colorClass = scenario === 'Pessimistic' ? 'text-rose-500' : scenario === 'Neutral' ? 'text-emerald-500' : 'text-blue-500';
                            const borderClass = scenario === 'Pessimistic' ? 'group-hover:border-rose-500/20' : scenario === 'Neutral' ? 'group-hover:border-emerald-500/20' : 'group-hover:border-blue-500/20';
                            
                            return (
                                <div key={scenario} className={`bg-card/30 backdrop-blur-md border border-border-lux p-10 rounded-[3rem] shadow-2xl transition-all duration-500 group relative overflow-hidden flex flex-col ${borderClass}`}>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-foreground/5 rounded-full filter blur-[60px] -mr-16 -mt-16 group-hover:bg-foreground/10 transition-all duration-700 pointer-events-none"></div>
                                    
                                    <span className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.4em] mb-6 block z-10">{scenario}</span>
                                    <div className="flex items-baseline gap-2 mb-8 z-10">
                                        <span className={`text-5xl font-extralight tracking-tighter text-foreground`}>${targetResults.prices[i].toFixed(2)}</span>
                                        <span className="text-[10px] text-foreground/20 font-black uppercase tracking-widest">USD</span>
                                    </div>
                                    <div className={`flex items-center gap-3 p-4 rounded-2xl border mt-auto z-10 ${upside > 0 ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500' : 'bg-rose-500/5 border-rose-500/10 text-rose-500'}`}>
                                        {upside > 0 ? <TrendingUp className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                                        <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">{upside > 0 ? '+' : ''}{upside.toFixed(1)}% Yield</span>
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-foreground/5 flex justify-between items-center text-[9px] text-foreground/30 font-black uppercase tracking-[0.1em] z-10">
                                        <span>Target_PE</span>
                                        <span className="text-foreground/50 tracking-widest">{pe}x</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-card/40 backdrop-blur-2xl border border-border-lux rounded-[3.5rem] p-12 shadow-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-foreground/5 rounded-full filter blur-[120px] -mr-32 -mt-32 pointer-events-none group-hover:bg-foreground/10 transition-all duration-1000"></div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
                            <div>
                                <h3 className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.4em] mb-10 flex items-center gap-3">
                                    <div className="w-4 h-px bg-foreground/20"></div>
                                    Forward Projection Path (T+3Y)
                                </h3>
                                <div className="space-y-10 font-mono">
                                    <div className="flex justify-between items-end border-b border-foreground/10 pb-4 group/row">
                                        <span className="text-[10px] text-foreground/20 font-black uppercase tracking-[0.2em] group-hover/row:text-foreground/40 transition-colors">Gross Revenue</span>
                                        <span className="text-4xl font-extralight tracking-tighter text-foreground leading-none">${(targetResults.rev3Y / 1000).toFixed(2)}B</span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-foreground/10 pb-4 group/row">
                                        <span className="text-[10px] text-foreground/20 font-black uppercase tracking-[0.2em] group-hover/row:text-foreground/40 transition-colors">Operating Income</span>
                                        <span className="text-4xl font-extralight tracking-tighter text-emerald-500 leading-none">${(targetResults.ni3Y / 1000).toFixed(2)}B</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card/10 backdrop-blur-md p-10 rounded-[2.5rem] border border-border-lux flex flex-col justify-center gap-6 shadow-xl">
                                <p className="text-xs text-foreground/40 leading-relaxed uppercase tracking-[0.2em] font-black pr-8">
                                    Strategic earnings mapping based on compounded scaling and operational optimization. Synthetic forecasting is probabilistic.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <div className="px-5 py-2 bg-emerald-500/5 text-emerald-500 border border-emerald-500/10 rounded-full text-[8px] font-black uppercase tracking-widest">Growth_Scaling</div>
                                    <div className="px-5 py-2 bg-blue-500/5 text-blue-500 border border-blue-500/10 rounded-full text-[8px] font-black uppercase tracking-widest">Scenario_Modeling</div>
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
