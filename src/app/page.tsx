"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { 
  Heart, 
  Map as MapIcon, 
  Calendar, 
  Clock, 
  Camera,
  Sparkles,
  ChevronRight,
  User
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────

const WEDDING_DATE = new Date("2026-12-10T19:30:00+02:00"); // Israel Time (UTC+2)

// ─── Icons ─────────────────────────────────────────────────────────────────

const WeddingRings = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="14" r="7" stroke="#D4AF37" strokeWidth="1.5" />
    <circle cx="15" cy="10" r="7" stroke="#E6D5B8" strokeWidth="1.5" />
    <path d="M12 7L12 5" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="4" r="1.5" fill="#D4AF37" />
  </svg>
);

const CameraHeart = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="6" width="18" height="14" rx="3" stroke="#D4AF37" strokeWidth="1.5" />
    <circle cx="12" cy="13" r="3" stroke="#D4AF37" strokeWidth="1.5" />
    <path d="M12 11.5C12.5 10.5 13.5 10.5 14 11C14.5 11.5 14 12.5 12 14.5C10 12.5 9.5 11.5 10 11C10.5 10.5 11.5 10.5 12 11.5Z" fill="#D4AF37" />
    <path d="M7 6L9 4H15L17 6" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Home() {
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState("HOME");
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
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center overflow-x-hidden">
      
      {/* Fixed Header */}
      <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-2xl border-b border-border-lux py-5 px-10 flex justify-between items-center">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab("HOME")}>
          <span className="text-lg font-black tracking-[0.2em] text-accent-gold uppercase select-none">Omri<span className="text-accent-gold-soft">&</span>Opal</span>
        </div>
        
        <div className="hidden md:flex gap-10 items-center">
          {["HOME", "DATE GENERATOR", "BUCKET LIST", "TIMELINE"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 relative py-2 ${
                activeTab === tab ? "text-accent-gold" : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-gold shadow-[0_2px_10px_rgba(212,175,55,0.4)]" />
              )}
            </button>
          ))}
          <div className="ml-4 opacity-80 hover:opacity-100 transition-opacity">
            <WeddingRings />
          </div>
        </div>

        <div className="flex items-center gap-4">
           {user ? (
             <div className="w-9 h-9 rounded-full border border-border-lux p-0.5 overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover rounded-full" /> : <User className="w-full h-full text-foreground/20 p-1" />}
             </div>
           ) : (
             <button className="text-[9px] font-black uppercase tracking-[0.2em] px-5 py-2.5 bg-accent-gold text-white rounded-full hover:shadow-lg transition-all active:scale-95 shadow-[0_5px_15px_-5px_rgba(212,175,55,0.5)]">Join Story</button>
           )}
        </div>
      </header>

      {/* Main Content Area (Full Width) */}
      <main className="mt-36 w-full flex flex-col items-center px-4 md:px-0">
        
        {/* Section: HOME */}
        {activeTab === "HOME" && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-1000">
            
            {/* The Countdown Header */}
            <div className="flex flex-col items-center text-center mb-16 gap-3">
              <h1 className="text-6xl font-extralight tracking-tight text-accent-gold select-none">
                The <span className="italic">Countdown</span>
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-foreground/30">
                10.12.2026 — 19:30 Israel Time
              </p>
            </div>

            {/* Timer Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-32 w-full max-w-5xl px-6">
              {[
                { label: "Days", value: timeLeft.days },
                { label: "Hours", value: timeLeft.hours },
                { label: "Minutes", value: timeLeft.minutes },
                { label: "Seconds", value: timeLeft.seconds }
              ].map((item) => (
                <div key={item.label} className="gold-gradient rounded-[2.5rem] p-10 flex flex-col items-center justify-center relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] -mr-16 -mt-16 group-hover:bg-white/20 transition-all duration-700 pointer-events-none"></div>
                   <span className="text-7xl font-light tracking-tighter text-white mb-2 relative z-10 drop-shadow-sm">{item.value.toString().padStart(2, '0')}</span>
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 relative z-10">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Media Wall: OUR STORY */}
            <div className="w-full max-w-6xl px-8 pb-32">
              <div className="flex flex-col items-center gap-6 mb-16">
                 <div className="flex items-center gap-6 w-full">
                    <div className="h-px bg-border-lux flex-1"></div>
                    <div className="flex flex-col items-center gap-1">
                      <CameraHeart />
                      <h2 className="text-3xl font-extralight tracking-tight text-accent-gold uppercase mt-2">Our <span className="italic">Story</span></h2>
                    </div>
                    <div className="h-px bg-border-lux flex-1"></div>
                 </div>
              </div>

              {/* Media Grid Placeholder (Organized boxes with delicate light frames) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                 {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                   <div key={i} className={`aspect-square bg-white border border-border-lux rounded-3xl relative overflow-hidden group hover:border-accent-gold/30 transition-all duration-500 shadow-sm ${i === 1 ? 'md:col-span-2 md:row-span-2 aspect-auto' : ''}`}>
                      <div className="absolute inset-0 bg-gradient-to-t from-accent-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                         <Sparkles className="w-5 h-5 text-accent-gold/10 group-hover:text-accent-gold/20 group-hover:scale-110 transition-all duration-700" />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/80 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        )}

        {/* Section: DATE GENERATOR */}
        {activeTab === "DATE GENERATOR" && (
          <div className="w-full max-w-xl flex flex-col items-center animate-in fade-in duration-700 py-12 px-6">
            <h1 className="text-5xl font-extralight tracking-tight text-accent-gold mb-10">Inspire <span className="italic">Us</span></h1>
            <div className="w-full bg-white border border-border-lux rounded-[3rem] p-12 shadow-xl shadow-accent-gold/5 flex flex-col gap-10 border-t-accent-gold/10">
              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40">Tonight's vision...</label>
                <input 
                  type="text" 
                  placeholder="Tell us what you're dreaming of..." 
                  className="bg-background/40 border border-border-lux rounded-2xl px-7 py-5 focus:outline-none focus:ring-2 focus:ring-accent-gold/20 text-foreground transition-all placeholder:text-foreground/20"
                />
              </div>
              <button className="gold-gradient text-white font-black uppercase text-[10px] tracking-[0.4em] py-6 rounded-2xl hover:opacity-90 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-3">
                 <Sparkles className="w-4 h-4" />
                 Surprise Me
              </button>
            </div>
          </div>
        )}

        {/* Section: BUCKET LIST */}
        {activeTab === "BUCKET LIST" && (
          <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-700 py-12 px-8">
            <h1 className="text-6xl font-extralight tracking-tight text-accent-gold mb-16 select-none">Global <span className="italic">Destinies</span></h1>
            <div className="w-full max-w-5xl aspect-[16/8] bg-white border border-border-lux rounded-[4rem] flex flex-col items-center justify-center gap-8 group cursor-pointer hover:border-accent-gold/10 transition-all duration-700 overflow-hidden relative shadow-2xl">
              <div className="absolute inset-0 bg-accent-gold/5 blur-[120px] -z-10 group-hover:bg-accent-gold/10 transition-colors duration-1000"></div>
              <MapIcon className="w-16 h-16 text-accent-gold opacity-20 group-hover:scale-110 group-hover:opacity-40 transition-all duration-1000" />
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-foreground/20">Cartography interface loading...</p>
            </div>
          </div>
        )}

        {/* Section: TIMELINE */}
        {activeTab === "TIMELINE" && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-12 duration-1000 py-12 pb-32">
             <h1 className="text-6xl font-extralight tracking-tight text-accent-gold mb-24 text-center">Our <span className="italic">Timeline</span></h1>
             
             <div className="relative w-full max-w-3xl px-10">
               <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-border-lux"></div>
               
               {[
                 { date: "31.12.2017", title: "Midnight Spark", desc: "The moment our two worlds became one." },
                 { date: "10.12.2026", title: "Eternal Vows", desc: "The next chapter in our beautiful infinity." }
               ].map((event, i) => (
                 <div key={i} className={`flex w-full mb-32 items-center ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
                    <div className="w-1/2"></div>
                    <div className="z-10 w-3 h-3 rounded-full bg-accent-gold border-4 border-white shadow-lg"></div>
                    <div className="w-1/2 px-15">
                       <div className="flex flex-col gap-2">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-gold">{event.date}</span>
                         <h3 className="text-3xl font-extralight tracking-tight text-foreground">{event.title}</h3>
                         <p className="text-sm font-light text-foreground/40 leading-relaxed max-w-xs">{event.desc}</p>
                       </div>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </main>

      {/* Footer Bar */}
      <footer className="fixed bottom-0 w-full py-5 px-12 border-t border-border-lux bg-white/70 backdrop-blur-md flex justify-between items-center z-40">
         <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-gold shadow-[0_0_5px_#D4AF37]"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30">Secure_Node_V3</span>
         </div>
         <div className="flex gap-8">
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/20">© 2017 — 2026</span>
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-gold/40">OMRI & OPAL</span>
         </div>
      </footer>
    </div>
  );
}