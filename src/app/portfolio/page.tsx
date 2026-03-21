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
      <div className="min-h-screen bg-gray-950 p-12 text-white flex flex-col items-center justify-center">
        <div className="bg-gray-900/50 border border-gray-800 p-12 rounded-3xl text-center max-w-md shadow-2xl">
          <Briefcase className="w-16 h-16 text-emerald-500 mx-auto mb-6 opacity-20" />
          <h2 className="text-3xl font-black mb-4">Access Restricted</h2>
          <p className="text-gray-500 mb-8 font-medium leading-relaxed">
            Please log in via the sidebar to access your tactical portfolio and cloud-synced assets.
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
            Portfolio <span className="text-gray-700">Terminal</span>
          </h1>
          <p className="text-gray-500 mt-2 font-mono text-[10px] uppercase tracking-[0.3em]">Tactical Asset Management & Logic</p>
        </div>

        <form onSubmit={addHolding} className="flex flex-wrap items-center gap-3 bg-gray-900/50 p-2 rounded-2xl border border-gray-800/50 backdrop-blur-xl">
          <input 
            type="text" 
            placeholder="Ticker" 
            value={ticker} 
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-2 text-sm font-bold w-24 outline-none focus:border-emerald-500/50 transition-all"
          />
          <input 
            type="number" 
            placeholder="Shares" 
            value={shares} 
            onChange={(e) => setShares(e.target.value)}
            className="bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-2 text-sm font-bold w-24 outline-none focus:border-emerald-500/50 transition-all"
          />
          <input 
            type="number" 
            placeholder="Avg Price" 
            value={avgPrice} 
            onChange={(e) => setAvgPrice(e.target.value)}
            className="bg-gray-950/50 border border-gray-800 rounded-xl px-4 py-2 text-sm font-bold w-28 outline-none focus:border-emerald-500/50 transition-all"
          />
          <button 
            type="submit" 
            disabled={isAdding}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-gray-950 p-2 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
          >
            {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        </form>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-900/40 border border-gray-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4 text-red-400">
          <AlertCircle className="w-6 h-6" />
          <p className="font-bold text-sm">Failed to connect to tactical data stream.</p>
        </div>
      ) : values?.empty ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/20 px-6 text-center">
            <Briefcase className="w-12 h-12 text-gray-700 mb-6" />
            <h3 className="text-xl font-bold text-gray-300 mb-2">Portfolio Empty</h3>
            <p className="text-gray-500 text-sm max-w-xs uppercase tracking-widest font-mono">No active holdings detected. Deploy capital to begin tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {values?.docs.map(doc => {
            const data = doc.data();
            return (
              <div key={doc.id} className="group bg-gray-900/40 border border-gray-800 p-6 rounded-3xl hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-all" />
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-white">{data.ticker}</h3>
                    <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Asset Identification</p>
                  </div>
                  <button 
                    onClick={() => removeHolding(doc.id)}
                    className="p-2 text-gray-700 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-950/50 p-3 rounded-xl border border-gray-800/50">
                    <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-1">Shares</p>
                    <p className="text-lg font-bold text-white">{data.shares.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-950/50 p-3 rounded-xl border border-gray-800/50">
                    <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-1">Avg Price</p>
                    <p className="text-lg font-bold text-white">${data.avgPrice.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-800/50 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <ArrowUpRight className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Live Pathing</span>
                  </div>
                  <span className="text-[10px] text-gray-600 font-mono italic">UID: {doc.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
