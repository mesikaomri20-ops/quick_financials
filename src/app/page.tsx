"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { 
  Heart, 
  Map as MapIcon, 
  Calendar, 
  Clock, 
  Image as ImageIcon,
  Sparkles,
  ChevronRight
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────

const WEDDING_DATE = new Date("2026-12-10T19:30:00+02:00"); // Israel Time (UTC+2)

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Home() {
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState("home");
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Countdown Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = WEDDING_DATE.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border-lux py-4 px-8 flex justify-between items-center">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setActiveTab("home")}>
          <Heart className="w-5 h-5 text-accent-gold fill-accent-gold animate-pulse" />
          <span className="text-sm font-black uppercase tracking-[0.4em] text-foreground">Our <span className="text-accent-gold">Story</span></span>
        </div>
        
        <div className="hidden md:flex gap-12">
          {["home", "date", "bucket", "timeline"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 relative py-2 ${
                activeTab === tab ? "text-accent-gold" : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              {tab === "bucket" ? "Bucket List" : tab === "date" ? "Date Generator" : tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-px bg-accent-gold shadow-[0_0_10px_#D4AF37]" />
              )}
            </button>
          ))}
        </div>

        {user ? (
          <div className="w-8 h-8 rounded-full bg-accent-gold/20 border border-accent-gold/50 flex items-center justify-center overflow-hidden">
             {user.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover" /> : <div className="text-[10px] font-bold text-accent-gold">U</div>}
          </div>
        ) : (
          <button className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 border border-accent-gold/30 rounded-full text-accent-gold hover:bg-accent-gold hover:text-background transition-all">Join</button>
        )}
      </nav>

      {/* Main Content */}
      <main className="mt-32 w-full max-w-6xl px-6 flex flex-col items-center pb-20">
        
        {/* Section: Home */}
        {activeTab === "home" && (
          <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-16 gap-4">
              <h1 className="text-7xl font-extralight tracking-tighter text-foreground leading-none">
                The <span className="text-accent-gold italic">Countdown</span>
              </h1>
              <div className="h-px w-24 bg-accent-gold/30"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-foreground/40 leading-relaxed">
                10.12.2026 — 19:30
              </p>
            </div>

            {/* Countdown Boxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24 w-full max-w-2xl">
              {[
                { label: "Days", value: timeLeft.days },
                { label: "Hours", value: timeLeft.hours },
                { label: "Minutes", value: timeLeft.minutes },
                { label: "Seconds", value: timeLeft.seconds }
              ].map((item) => (
                <div key={item.label} className="bg-card/30 backdrop-blur-md border border-border-lux rounded-[2rem] p-8 flex flex-col items-center group hover:border-accent-gold/20 transition-all duration-500">
                  <span className="text-5xl font-extralight tracking-tighter text-foreground mb-2 group-hover:text-accent-gold transition-colors">{item.value.toString().padStart(2, '0')}</span>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-foreground/30">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Media Wall Placeholder */}
            <div className="w-full">
              <div className="flex items-center gap-4 mb-12">
                <ImageIcon className="w-5 h-5 text-accent-gold" />
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-foreground/40">Media Wall</h2>
                <div className="h-px bg-border-lux flex-1"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square bg-card/20 border border-border-lux rounded-[2.5rem] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-accent-gold/20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section: Date Generator */}
        {activeTab === "date" && (
          <div className="w-full max-w-lg flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-6xl font-extralight tracking-tighter text-foreground mb-8">Date <span className="text-accent-gold italic">Generator</span></h1>
            <div className="w-full bg-card/30 backdrop-blur-md border border-border-lux rounded-[3rem] p-12 shadow-2xl flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">What's the vibe today?</label>
                <input 
                  type="text" 
                  placeholder="e.g. Something romantic outdoors..." 
                  className="bg-background/50 border border-border-lux rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-accent-gold/20 text-foreground transition-all"
                />
              </div>
              <div className="flex gap-4">
                <button className="flex-1 bg-accent-gold text-background font-black uppercase text-[10px] tracking-[0.3em] py-5 rounded-2xl hover:opacity-90 transition-all active:scale-95 shadow-[0_10px_30px_-10px_#D4AF37]">Generate</button>
                <button className="px-8 bg-card border border-border-lux rounded-2xl hover:bg-card/50 transition-all flex items-center justify-center group">
                  <Sparkles className="w-5 h-5 text-accent-gold group-hover:rotate-12 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section: Bucket List */}
        {activeTab === "bucket" && (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
            <h1 className="text-7xl font-extralight tracking-tighter text-foreground mb-12">Bucket <span className="text-accent-gold italic">List Map</span></h1>
            <div className="w-full aspect-video bg-card/30 backdrop-blur-md border border-border-lux rounded-[4rem] flex flex-col items-center justify-center gap-6 group cursor-pointer hover:border-accent-gold/10 transition-all duration-700 overflow-hidden relative">
              <div className="absolute inset-0 bg-accent-gold/5 blur-[100px] -z-10 group-hover:bg-accent-gold/10 transition-colors duration-1000"></div>
              <MapIcon className="w-16 h-16 text-accent-gold opacity-30 group-hover:scale-110 group-hover:opacity-50 transition-all duration-1000" />
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-foreground/30">Interactive map coming soon</p>
            </div>
          </div>
        )}

        {/* Section: Timeline */}
        {activeTab === "timeline" && (
          <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-right-8 duration-700">
             <h1 className="text-7xl font-extralight tracking-tighter text-foreground mb-20 text-center">Chapter <span className="text-accent-gold italic">One</span></h1>
             
             <div className="relative w-full max-w-2xl">
               <div className="absolute left-1/2 -translate-x-1/2 w-px h-full bg-border-lux"></div>
               
               {[
                 { date: "31.12.2017", title: "Where it all began", desc: "The very first spark that ignited our story." },
                 { date: "Present Day", title: "Still writing...", desc: "The journey continues, more beautiful than ever." }
               ].map((event, i) => (
                 <div key={i} className={`flex w-full mb-32 items-center ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
                    <div className="w-1/2"></div>
                    <div className="z-10 w-2 h-2 rounded-full bg-accent-gold shadow-[0_0_15px_#D4AF37]"></div>
                    <div className="w-1/2 px-12">
                       <div className="flex flex-col gap-2">
                         <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-gold">{event.date}</span>
                         <h3 className="text-2xl font-extralight tracking-tighter text-foreground">{event.title}</h3>
                         <p className="text-sm font-light text-foreground/40 leading-relaxed">{event.desc}</p>
                       </div>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </main>

      {/* Footer / Status */}
      <footer className="fixed bottom-0 w-full py-6 px-12 border-t border-border-lux bg-background/50 backdrop-blur-md flex justify-between items-center">
         <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-gold animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30">System Live</span>
         </div>
         <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30">2017 — 2026</span>
      </footer>
    </div>
  );
}