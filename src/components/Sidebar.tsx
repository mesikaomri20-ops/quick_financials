'use client';

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
  LogOut,
  LogIn
} from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";

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
  const [user, loading] = useAuthState(auth);

  const login = async () => {
    try {
      console.log("Starting Google Login...");
      await signInWithPopup(auth, googleProvider);
      console.log("Login successful");
    } catch (error: any) {
      console.error("Login failed full error:", error);
      alert("Login failed: " + (error.message || "Unknown error occurred"));
    }
  };

  const logout = () => signOut(auth);

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
      
      {/* User Section */}
      <div className="px-6 py-6 border-b border-gray-800/50">
        {loading ? (
          <div className="h-10 w-full bg-gray-800 animate-pulse rounded-xl" />
        ) : user ? (
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ""} className="w-10 h-10 rounded-full border-2 border-emerald-500/20 shadow-lg" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-gray-950 font-black">
                {user.displayName?.charAt(0) || "U"}
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-white truncate">{user.displayName}</span>
              <button onClick={logout} className="text-[9px] text-gray-500 flex items-center gap-1 hover:text-emerald-500 transition-colors uppercase font-black tracking-widest">
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={login}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" /> Login with Google
          </button>
        )}
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
