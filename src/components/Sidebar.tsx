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
    }
  };

  const logout = () => signOut(auth);

  if (!mounted) return null;

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="bg-foreground p-1.5 rounded-lg">
              <TrendingUp className="w-4 h-4 text-background" />
            </div>
            <span className="text-lg font-extralight tracking-tighter text-foreground">
              Quick<span className="text-accent-gold font-bold">Financials</span>
            </span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-foreground/60 transition-colors hover:text-foreground">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-background/95 backdrop-blur-2xl z-40 pt-24 px-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <nav className="space-y-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    isActive 
                      ? "bg-foreground/5 border-foreground/10 text-foreground" 
                      : "border-transparent text-foreground/50"
                  }`}
                >
                  <item.icon className={`w-6 h-6 ${isActive ? "text-accent-gold" : ""}`} />
                  <div className="flex flex-col">
                    <span className="font-bold text-lg leading-tight">{item.name}</span>
                    <span className="text-xs opacity-40 uppercase tracking-widest">{item.labelHe}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
          
          <div className="pt-6 border-t border-border-lux space-y-4">
            <button onClick={toggleTheme} className="flex items-center justify-between w-full p-4 rounded-xl bg-foreground/5 transition-all active:scale-95">
              <span className="font-bold">Theme</span>
              {theme === 'dark' ? <Sun className="w-6 h-6 text-accent-gold" /> : <Moon className="w-6 h-6" />}
            </button>
            
            {user ? (
              <div className="flex items-center justify-between p-4 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <img src={user.photoURL || ""} alt="" className="w-10 h-10 rounded-full" />
                  <span className="font-bold">{user.displayName}</span>
                </div>
                <button onClick={logout} className="p-2 text-foreground/40 hover:text-red-500 transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button onClick={login} className="w-full py-4 bg-foreground text-background rounded-xl font-bold uppercase tracking-widest">
                Login
              </button>
            )}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex flex-col h-screen sticky top-0 bg-sidebar/50 backdrop-blur-xl border-r border-border-lux transition-all duration-500 z-30 group/sidebar ${
          isCollapsed ? "w-[80px]" : "w-[280px]"
        }`}
      >
        {/* Collapse Toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-12 w-6 h-6 bg-background border border-white/10 rounded-full flex items-center justify-center hover:bg-foreground/5 transition-all z-40 shadow-xl opacity-0 group-hover/sidebar:opacity-100"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Brand Header */}
        <div className={`h-24 flex items-center px-6 transition-all ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="bg-foreground p-2 rounded-xl shrink-0 shadow-lg">
            <TrendingUp className="w-6 h-6 text-background" />
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <span className="text-xl font-extralight tracking-tighter text-foreground whitespace-nowrap">
              Quick<span className="text-accent-gold font-bold">Financials</span>
            </span>
          </div>
        </div>

        {/* User Section */}
        <div className={`px-4 py-6 border-y border-border-lux transition-all ${isCollapsed ? "px-2" : ""}`}>
          {loading ? (
             <div className="h-12 w-full bg-foreground/5 animate-pulse rounded-xl" />
          ) : user ? (
            <div className={`flex items-center bg-foreground/5 p-2 rounded-xl transition-all ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <img 
                src={user.photoURL || ""} 
                alt="" 
                className="w-10 h-10 rounded-lg border border-white/10 shrink-0 object-cover" 
              />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate leading-none mb-1">{user.displayName}</p>
                  <button onClick={logout} className="text-[10px] text-foreground/40 hover:text-accent-gold flex items-center gap-1 font-bold uppercase tracking-widest transition-colors">
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={login}
              className={`flex items-center bg-foreground text-background rounded-xl font-bold uppercase tracking-widest transition-all hover:shadow-lg active:scale-95 ${
                isCollapsed ? "w-12 h-12 justify-center" : "w-full py-3 px-4 text-[10px] gap-2"
              }`}
            >
              <LogIn size={isCollapsed ? 20 : 16} />
              {!isCollapsed && "Login"}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 relative group/item ${
                  isActive 
                    ? "bg-foreground/5 text-foreground shadow-sm" 
                    : "text-foreground/40 hover:bg-foreground/[0.03] hover:text-foreground"
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-accent-gold rounded-full" />
                )}
                <item.icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? "text-accent-gold" : "group-hover/item:scale-110"}`} />
                {!isCollapsed && (
                  <div className="ml-4 flex flex-col overflow-hidden transition-all duration-300">
                    <span className="text-sm font-bold tracking-tight whitespace-nowrap">{item.name}</span>
                    <span className={`text-[10px] uppercase font-bold tracking-widest opacity-30 ${isActive ? "text-accent-gold opacity-50" : ""}`}>
                      {item.labelHe}
                    </span>
                  </div>
                )}
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover/item:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover/item:translate-x-0 whitespace-nowrap z-50 shadow-2xl">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle & Footer */}
        <div className="p-4 border-t border-border-lux space-y-4 bg-sidebar/[0.02]">
           <button 
              onClick={toggleTheme}
              className={`flex items-center bg-foreground/5 rounded-xl transition-all hover:bg-foreground/10 active:scale-95 ${
                isCollapsed ? "w-12 h-12 justify-center mx-auto" : "w-full px-4 py-3 justify-between"
              }`}
           >
              {!isCollapsed && <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Appearance</span>}
              <div className="transition-transform duration-500 scale-100 group-hover:rotate-12">
                {theme === 'dark' ? <Moon size={18} className="text-accent-gold" /> : <Sun size={18} />}
              </div>
           </button>
           
           {!isCollapsed && (
             <div className="flex items-center justify-between px-2 pt-2 border-t border-border-lux/30 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-gold animate-pulse" />
                  <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase opacity-30">SECURE_NODE</span>
                </div>
                <Settings size={14} className="opacity-20 hover:opacity-100 transition-opacity cursor-pointer" />
             </div>
           )}
        </div>
      </aside>
    </>
  );
}

