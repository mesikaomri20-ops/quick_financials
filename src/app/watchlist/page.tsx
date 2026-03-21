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
      <div className="min-h-screen bg-gray-950 p-12 text-white flex flex-col items-center justify-center">
        <div className="bg-gray-900/50 border border-gray-800 p-12 rounded-3xl text-center max-w-md shadow-2xl">
          <List className="w-16 h-16 text-emerald-500 mx-auto mb-6 opacity-20" />
          <h2 className="text-3xl font-black mb-4">Tactical Access Denied</h2>
          <p className="text-gray-500 mb-8 font-medium leading-relaxed">
            Authentication required to initialize cloud-synced watchlist protocols. Use the command sidebar to begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8 md:p-12 text-white">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 uppercase">
            Watchlist <span className="text-gray-700">Protocol</span>
          </h1>
          <p className="text-gray-500 mt-2 font-mono text-[10px] uppercase tracking-[0.3em]">High-Value Target Monitoring</p>
        </div>

        <form onSubmit={addTicker} className="flex items-center gap-3 bg-gray-900/50 p-2 rounded-2xl border border-gray-800/50 backdrop-blur-xl w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input 
              type="text" 
              placeholder="Add Ticker..." 
              value={ticker} 
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="bg-gray-950/50 border border-gray-800 rounded-xl pl-11 pr-4 py-2.5 text-sm font-bold w-full md:w-64 outline-none focus:border-emerald-500/50 transition-all font-mono"
            />
          </div>
          <button 
            type="submit" 
            disabled={isAdding}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-gray-950 px-6 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/10 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Track</>}
          </button>
        </form>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-900/40 border border-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4 text-red-400">
          <AlertCircle className="w-6 h-6" />
          <p className="font-bold text-sm">Target acquisition stream failure. Check uplink.</p>
        </div>
      ) : values?.empty ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/20 px-6 text-center">
            <TrendingUp className="w-12 h-12 text-gray-700 mb-6" />
            <h3 className="text-xl font-bold text-gray-300 mb-2">Watchlist Empty</h3>
            <p className="text-gray-500 text-sm max-w-xs uppercase tracking-widest font-mono">No high-value targets identified. Add tickers to monitor market movement.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {values?.docs.map(doc => {
            const data = doc.data();
            return (
              <div key={doc.id} className="group flex items-center justify-between bg-gray-900/40 border border-gray-800 px-8 py-6 rounded-2xl hover:border-emerald-500/30 transition-all duration-300">
                <div className="flex items-center gap-8">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-lg font-black text-emerald-500">{data.ticker.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{data.ticker}</h3>
                    <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mt-0.5">Tactical Identifier: {doc.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-12">
                  <div className="hidden md:block">
                     <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-1 text-right">Added On</p>
                     <p className="text-xs font-mono text-gray-400">{new Date(data.addedAt).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={() => removeTicker(doc.id)}
                    className="p-3 bg-gray-950/50 border border-gray-800 rounded-xl text-gray-700 hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/5 transition-all active:scale-95"
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
