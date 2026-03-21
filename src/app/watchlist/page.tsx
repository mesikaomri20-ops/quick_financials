'use client';

import React, { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { Plus, Trash2, List, Loader2, AlertCircle, TrendingUp, Search } from "lucide-react";

export default function WatchlistPage() {
  const [user] = useAuthState(auth);
  const [ticker, setTicker] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Use the suggested pattern: users/{uid}/watchlist
  const watchlistRef = user ? collection(db, "users", user.uid, "watchlist") : null;
  const [values, loading, error] = useCollection(
    watchlistRef ? query(watchlistRef, orderBy("ticker")) : null
  );

  const addTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ticker) return;

    setIsAdding(true);
    try {
      const docRef = doc(db, "users", user.uid, "watchlist", ticker.toUpperCase());
      await setDoc(docRef, {
        ticker: ticker.toUpperCase(),
        addedAt: new Date().toISOString(),
      });
      setTicker("");
    } catch (err) {
      console.error("Failed to add ticker", err);
    } finally {
      setIsAdding(false);
    }
  };

  const removeTicker = async (tickerId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "watchlist", tickerId));
    } catch (err) {
      console.error("Failed to remove ticker", err);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-12 text-foreground flex flex-col items-center justify-center transition-colors duration-300">
        <div className="bg-card/40 backdrop-blur-2xl border border-border-lux p-12 rounded-[2.5rem] text-center max-w-md shadow-2xl">
          <List className="w-16 h-16 text-foreground/20 mx-auto mb-6" />
          <h2 className="text-3xl font-extralight tracking-tighter mb-4">Terminal Locked</h2>
          <p className="text-foreground/40 mb-8 font-medium leading-relaxed text-sm">
            Please authenticate via the sidebar to access your tactical watchlist and monitor high-value targets.
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
            Watchlist <span className="text-accent-gold italic opacity-80">Terminal</span>
          </h1>
          <p className="text-foreground/40 mt-4 font-mono text-[10px] uppercase tracking-[0.4em] font-bold">High-Value Target Monitoring</p>
        </div>

        <form onSubmit={addTicker} className="flex items-center gap-3 bg-card/50 p-2 rounded-2xl border border-border-lux backdrop-blur-2xl shadow-xl w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
            <input 
              type="text" 
              placeholder="ADD TICKER..." 
              value={ticker} 
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="bg-background/50 border border-border-lux rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold w-full lg:w-64 outline-none focus:ring-2 focus:ring-accent-gold/20 transition-all font-mono placeholder:opacity-30"
            />
          </div>
          <button 
            type="submit" 
            disabled={isAdding}
            className="bg-foreground text-background px-6 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </form>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-card/20 border border-border-lux rounded-[2rem] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-2xl flex items-center gap-4 text-rose-500">
          <AlertCircle className="w-6 h-6" />
          <p className="font-bold text-sm uppercase tracking-wider">Target acquisition stream failure. Check uplink.</p>
        </div>
      ) : values?.empty ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] border border-dashed border-border-lux rounded-[3rem] bg-card/10 px-6 text-center text-foreground">
            <TrendingUp className="w-12 h-12 text-foreground/10 mb-6" />
            <h3 className="text-xl font-extralight tracking-tighter text-foreground mb-2">Watchlist Empty</h3>
            <p className="text-foreground/30 text-[10px] max-w-xs uppercase tracking-[0.2em] font-black">No high-value targets identified. Add tickers to monitor market movement.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {values?.docs.map(doc => {
            const data = doc.data();
            return (
              <div key={doc.id} className="group flex items-center justify-between bg-card/30 backdrop-blur-md border border-border-lux px-8 py-6 rounded-[2.5rem] hover:border-foreground/20 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[80px] -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all duration-700" />
                
                <div className="flex items-center gap-8 relative z-10">
                  <div className="w-12 h-12 bg-foreground/5 border border-border-lux rounded-2xl flex items-center justify-center">
                    <span className="text-lg font-extralight tracking-tighter text-foreground">{data.ticker.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-extralight tracking-tighter text-foreground group-hover:text-emerald-500 transition-colors uppercase leading-none">{data.ticker}</h3>
                    <p className="text-[9px] text-foreground/30 font-black tracking-[0.2em] uppercase mt-2">Node_{doc.id.slice(0,8)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-12 relative z-10">
                  <div className="hidden md:block text-right">
                     <p className="text-[9px] text-foreground/20 uppercase font-black tracking-[0.2em] mb-1">Observation_Start</p>
                     <p className="text-xs font-mono font-bold text-foreground/40">{new Date(data.addedAt).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={() => removeTicker(doc.id)}
                    className="p-3 bg-foreground/5 border border-border-lux rounded-2xl text-foreground/20 hover:text-rose-500 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

