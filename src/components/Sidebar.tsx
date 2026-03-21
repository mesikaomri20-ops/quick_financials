'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  LayoutGrid, 
  Briefcase, 
  List, 
  Calculator, 
  Percent, 
  Globe,
  Settings,
  LogOut,
  LogIn,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  User
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
  const { theme, setTheme } = useTheme();
  const [user, loading] = useAuthState(auth);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed:", error);
      alert("Login failed: " + (error.message || "Unknown error"));
    }
  };

  const logout = () => signOut(auth);

  if (!mounted) return null;

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <>
      {/* Mobile Header (Only visible on small screens) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between p-4 border-b border-foreground/5 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="bg-foreground p-1.5 rounded-lg">
              <TrendingUp className="w-4 h-4 text-background" />
            </div>
            <span className="text-lg font-extralight tracking-tighter text-foreground">
              Quick<span className="text-accent-gold font-bold">Financials</span>
            </span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-foreground/60">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-background/95 backdrop-blur-xl z-40 pt-20 px-6 space-y-6 animate-in fade-in slide-in-from-top-4">
          <nav className="space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-4 p-4 rounded-xl border ${
                  pathname === item.href 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                    : "border-transparent text-foreground/60"
                }`}
              >
                <item.icon className="w-6 h-6" />
                <span className="font-bold text-lg">{item.name}</span>
              </Link>
            ))}
          </nav>
          <div className="pt-6 border-t border-foreground/5">
             <button onClick={toggleTheme} className="flex items-center gap-4 p-4 w-full">
                {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                <span className="font-bold">Toggle Theme</span>
             </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex flex-col h-screen fixed sticky top-0 bg-sidebar border-r border-foreground/5 transition-all duration-300 z-30 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-10 w-6 h-6 bg-background border border-foreground/10 rounded-full flex items-center justify-center hover:bg-foreground/5 transition-colors z-40"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Brand Header */}
        <div className={`p-6 border-b border-foreground/5 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="bg-foreground p-1.5 rounded-lg shrink-0">
            <TrendingUp className="w-5 h-5 text-background" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-extralight tracking-tighter text-foreground">
              Quick<span className="text-accent-gold font-bold">Financials</span>
            </span>
          )}
        </div>

        {/* User Section */}
        <div className={`p-6 border-b border-foreground/5 overflow-hidden ${isCollapsed ? "px-5" : ""}`}>
          {loading ? (
            <div className="h-10 w-full bg-foreground/5 animate-pulse rounded-xl" />
          ) : user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border border-foreground/10" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
                  {user.displayName?.charAt(0)}
                </div>
              )}
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">{user.displayName}</span>
                  <button onClick={logout} className="text-[10px] text-foreground/40 hover:text-emerald-500 flex items-center gap-1 font-bold uppercase tracking-wider">
                    <LogOut size={10} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={login}
              className={`flex items-center justify-center gap-2 bg-foreground text-background rounded-xl font-bold uppercase tracking-widest transition-all active:scale-95 ${
                isCollapsed ? "w-10 h-10 p-0" : "w-full py-3 text-[10px]"
              }`}
            >
              <LogIn size={isCollapsed ? 18 : 14} />
              {!isCollapsed && "Login"}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center group px-4 py-3 rounded-xl transition-all duration-200 border ${
                  isActive 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                    : "border-transparent text-foreground/50 hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "scale-110" : "group-hover:scale-110 transition-transform"}`} />
                {!isCollapsed && (
                  <div className="ml-3 flex flex-col overflow-hidden">
                    <span className="text-sm font-bold tracking-tight">{item.name}</span>
                    <span className={`text-[9px] uppercase font-bold opacity-40 ${isActive ? "text-emerald-500" : ""}`}>
                      {item.labelHe}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle & Footer */}
        <div className="p-4 border-t border-foreground/5 space-y-4">
           {!isCollapsed ? (
             <button 
                onClick={toggleTheme}
                className="flex items-center justify-between w-full px-4 py-3 bg-foreground/5 rounded-xl text-xs font-bold transition-all hover:bg-foreground/10"
             >
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                  <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-emerald-500' : 'bg-foreground/20'}`}>
                  <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-5' : 'left-1'}`} />
                </div>
             </button>
           ) : (
             <button 
                onClick={toggleTheme}
                className="w-full aspect-square flex items-center justify-center text-foreground/60 hover:text-foreground bg-foreground/5 rounded-xl"
             >
               {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
             </button>
           )}
           
           {!isCollapsed && (
             <div className="flex items-center justify-between px-2 opacity-30">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase">SYST_ACTV</span>
                </div>
                <Settings size={12} />
             </div>
           )}
        </div>
      </aside>
    </>
  );
}

