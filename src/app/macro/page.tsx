"use client";

import React from "react";

export default function MacroPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-12 text-white">
      <header className="mb-12">
        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
          מאקרו כלכלה (Macro)
        </h1>
        <p className="text-gray-500 mt-2 font-mono text-sm uppercase tracking-widest">Global trends, interest rates, and inflation data</p>
      </header>
      
      <main className="flex flex-col items-center justify-center min-h-[50vh] border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/20">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg className="w-8 h-8 text-emerald-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-200">Coming Soon</h2>
          <p className="text-gray-500 max-w-xs mx-auto">Global macroeconomic signals are being monitored.</p>
        </div>
      </main>
    </div>
  );
}
