"use client";

import React from "react";

export default function ValuationPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-12 text-white">
      <header className="mb-12">
        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
          הערכת שווי (Valuation)
        </h1>
        <p className="text-gray-500 mt-2 font-mono text-sm uppercase tracking-widest">Calculate intrinsic value and margin of safety</p>
      </header>
      
      <main className="flex flex-col items-center justify-center min-h-[50vh] border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/20">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg className="w-8 h-8 text-emerald-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-200">Coming Soon</h2>
          <p className="text-gray-500 max-w-xs mx-auto">Intrinsic value models are being stress-tested.</p>
        </div>
      </main>
    </div>
  );
}
