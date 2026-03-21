'use client';

import React, { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Briefcase, Loader2, AlertCircle } from "lucide-react";

export default function PortfolioPage() {
  const [user] = useAuthState(auth);
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Use the suggested pattern: users/{uid}/portfolio
  const portfolioRef = user ? collection(db, "users", user.uid, "portfolio") : null;
  const [values, loading, error] = useCollection(
    portfolioRef ? query(portfolioRef, orderBy("ticker")) : null
  );

  const addHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ticker || !shares || !avgPrice) return;

    setIsAdding(true);
    try {
      const docRef = doc(db, "users", user.uid, "portfolio", ticker.toUpperCase());
      await setDoc(docRef, {
        ticker: ticker.toUpperCase(),
        shares: Number(shares),
        avgPrice: Number(avgPrice),
        updatedAt: new Date().toISOString(),
      });
      setTicker("");
      setShares("");
      setAvgPrice("");
    } catch (err) {
      console.error("Failed to add holding", err);
    } finally {
      setIsAdding(false);
    }
  };

  const removeHolding = async (tickerId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "portfolio", tickerId));
    } catch (err) {
      console.error("Failed to remove holding", err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-12 text-foreground flex flex-col items-center justify-center transition-colors duration-300">
        <div className="bg-card/40 backdrop-blur-xl border border-foreground/5 p-12 rounded-[2.5rem] text-center max-w-md shadow-2xl">
          <Briefcase className="w-16 h-16 text-foreground/20 mx-auto mb-6" />
          <h2 className="text-3xl font-extralight tracking-tighter mb-4">Terminal Locked</h2>
          <p className="text-foreground/40 mb-8 font-medium leading-relaxed text-sm">
            Please authenticate via the sidebar to access your tactical portfolio and cloud-synced assets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 text-foreground transition-colors duration-300">
      <header className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8 mt-16 md:mt-0">
        <div>
          <h1 className="text-5xl font-extralight tracking-tighter text-foreground leading-none">
            Portfolio <span className="text-accent-gold italic opacity-80">Terminal</span>
          </h1>
          <p className="text-foreground/40 mt-4 font-mono text-[10px] uppercase tracking-[0.4em] font-bold">Tactical Asset Management & Logic</p>
        </div>

        <form onSubmit={addHolding} className="flex flex-wrap items-center gap-3 bg-card/50 p-3 rounded-[2rem] border border-foreground/5 backdrop-blur-xl shadow-xl">
          <input 
            type="text" 
            placeholder="TICKER" 
            value={ticker} 
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="bg-background/50 border border-foreground/10 rounded-xl px-4 py-2.5 text-xs font-bold w-full md:w-28 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:opacity-30"
          />
          <input 
            type="number" 
            placeholder="SHARES" 
            value={shares} 
            onChange={(e) => setShares(e.target.value)}
            className="bg-background/50 border border-foreground/10 rounded-xl px-4 py-2.5 text-xs font-bold w-full md:w-28 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:opacity-30"
          />
          <input 
            type="number" 
            placeholder="PRICE" 
            value={avgPrice} 
            onChange={(e) => setAvgPrice(e.target.value)}
            className="bg-background/50 border border-foreground/10 rounded-xl px-4 py-2.5 text-xs font-bold w-full md:w-28 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:opacity-30"
          />
          <button 
            type="submit" 
            disabled={isAdding}
            className="bg-foreground text-background hover:opacity-90 disabled:opacity-50 w-full md:w-12 h-10 rounded-xl transition-all active:scale-95 shadow-lg flex items-center justify-center"
          >
            {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        </form>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-56 bg-card/20 border border-foreground/5 rounded-[2rem] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-2xl flex items-center gap-4 text-rose-500">
          <AlertCircle className="w-6 h-6" />
          <p className="font-bold text-sm uppercase tracking-wider">Failed to connect to tactical data stream.</p>
        </div>
      ) : values?.empty ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] border border-dashed border-foreground/10 rounded-[3rem] bg-card/10 px-6 text-center">
            <Briefcase className="w-12 h-12 text-foreground/10 mb-6" />
            <h3 className="text-xl font-extralight tracking-tighter text-foreground mb-2">Portfolio Empty</h3>
            <p className="text-foreground/30 text-[10px] max-w-xs uppercase tracking-[0.2em] font-black">No active holdings detected. Deploy capital to begin tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {values?.docs.map(doc => {
            const data = doc.data();
            return (
              <div key={doc.id} className="group bg-card/30 backdrop-blur-sm border border-foreground/5 p-8 rounded-[2.5rem] hover:border-foreground/20 transition-all duration-500 relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[80px] -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all duration-700" />
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div>
                    <h3 className="text-3xl font-extralight tracking-tighter text-foreground leading-none">{data.ticker}</h3>
                    <p className="text-[9px] text-foreground/30 font-black tracking-[0.2em] uppercase mt-2">Asset_ID</p>
                  </div>
                  <button 
                    onClick={() => removeHolding(doc.id)}
                    className="p-2 text-foreground/10 hover:text-rose-500 transition-colors bg-foreground/5 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-6 relative z-10">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] text-foreground/30 uppercase font-black tracking-[0.2em]">Holdings</span>
                    <span className="text-3xl font-extralight tracking-tight text-foreground">{data.shares.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] text-foreground/30 uppercase font-black tracking-[0.2em]">Avg Price</span>
                    <span className="text-3xl font-extralight tracking-tight text-foreground">${data.avgPrice.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-foreground/5 flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                    <ArrowUpRight className="w-3 h-3" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Active_Node</span>
                  </div>
                  <span className="text-[8px] text-foreground/20 font-mono tracking-tighter uppercase">Seq_{doc.id.slice(0,6)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

