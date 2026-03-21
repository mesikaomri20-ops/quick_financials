"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutGrid, 
  Briefcase, 
  List, 
  Calculator, 
  Percent, 
  Globe,
  Settings,
  ChevronRight
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutGrid, labelHe: "לוח בקרה" },
  { name: "Portfolio", href: "/portfolio", icon: Briefcase, labelHe: "תיק השקעות" },
  { name: "Watchlist", href: "/watchlist", icon: List, labelHe: "רשימת מעקב" },
  { name: "Valuation", href: "/valuation", icon: Calculator, labelHe: "הערכת שווי" },
  { name: "Multipliers", href: "/multipliers", icon: Percent, labelHe: "מכפילים" },
  { name: "Macro", href: "/macro", icon: Globe, labelHe: "מאקרו" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0 fixed h-full z-20 shadow-2xl">
      {/* Brand Header */}
      <div className="p-8 border-b border-gray-800/50">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/40">
            <LayoutGrid className="text-gray-950 w-5 h-5 stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">
            Command <span className="text-emerald-500">Center</span>
          </h1>
        </div>
        <p className="text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase mt-1 opacity-70">Tactical Financial OS</p>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 pt-6 space-y-1.5 overflow-y-auto">
        <div className="px-4 mb-4">
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em]">Main Navigation</span>
        </div>
        
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between group px-4 py-3 rounded-xl transition-all duration-300 border ${
                isActive 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-sm" 
                  : "bg-transparent border-transparent text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold tracking-wide">{item.name}</span>
                  <span className={`text-[9px] uppercase tracking-wider font-bold opacity-60 ${isActive ? "text-emerald-500" : "text-gray-500"}`}>
                    {item.labelHe}
                  </span>
                </div>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-glow animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>
      
      {/* Footer / Status */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">SYS_ACTIVE</span>
          </div>
          <Settings className="w-3.5 h-3.5 text-gray-600 hover:text-gray-400 cursor-pointer transition-colors" />
        </div>
        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-emerald-500/50 rounded-full" />
        </div>
      </div>
    </aside>
  );
}
