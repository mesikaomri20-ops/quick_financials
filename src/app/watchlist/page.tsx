"use client";

import React from "react";

export default function WatchlistPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-12 text-white">
      <header className="mb-12">
        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
          רשימת מעקב (Watchlist)
        </h1>
        <p className="text-gray-500 mt-2 font-mono text-sm uppercase tracking-widest">Monitor your targets and set alerts</p>
      </header>
      
      <main className="flex flex-col items-center justify-center min-h-[50vh] border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/20">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg className="w-8 h-8 text-emerald-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-200">Coming Soon</h2>
          <p className="text-gray-500 max-w-xs mx-auto">Target selection protocols are initializing. Stand by.</p>
        </div>
      </main>
    </div>
  );
}
