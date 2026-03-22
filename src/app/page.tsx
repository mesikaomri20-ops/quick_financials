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
  User,
  Menu,
  X,
  Plus
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
  const [activeTab, setActiveTab] = useState("דף הבית");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const navLinks = [
    { id: "דף הבית", label: "דף הבית" },
    { id: "מחולל דייטים", label: "מחולל דייטים" },
    { id: "מפת יעדים", label: "מפת יעדים" },
    { id: "ציר זמן", label: "ציר זמן" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center overflow-x-hidden font-assistant" dir="rtl">
      
      {/* Fixed Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-2xl border-b border-border-lux py-6 px-10 flex justify-between items-center transition-all duration-500">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { setActiveTab("דף הבית"); setIsMenuOpen(false); }}>
          <span className="text-2xl font-serif tracking-widest text-accent-gold uppercase select-none drop-shadow-sm" dir="ltr">
            OMRI <span className="text-accent-gold-soft">&</span> OPAL
          </span>
        </div>
        
        <div className="hidden md:flex gap-10 items-center">
          {navLinks.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs font-bold uppercase tracking-wider transition-all duration-300 relative py-2 ${
                activeTab === tab.id ? "text-accent-gold" : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-gold shadow-[0_2px_10px_rgba(212,175,55,0.4)]" />
              )}
            </button>
          ))}
          <div className="mr-8 opacity-80 hover:opacity-100 transition-opacity">
            <WeddingRings />
          </div>
        </div>

        <div className="flex items-center gap-6">
           {/* Mobile Menu Toggle */}
           <button 
             className="md:hidden p-2 text-accent-gold hover:bg-accent-gold/5 rounded-full transition-colors"
             onClick={() => setIsMenuOpen(!isMenuOpen)}
           >
             {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
           </button>

           {user ? (
             <div className="w-10 h-10 rounded-full border-2 border-accent-gold/20 p-0.5 overflow-hidden shadow-sm">
                {user.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover rounded-full" /> : <User className="w-full h-full text-foreground/20 p-1" />}
             </div>
           ) : (
             <button className="text-xs font-bold uppercase tracking-wide px-6 py-3 bg-accent-gold text-white rounded-full hover:shadow-xl transition-all active:scale-95 shadow-[0_10px_20px_-5px_rgba(212,175,55,0.4)]">
               הצטרפו לסיפור
             </button>
           )}
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="absolute top-full right-0 w-full bg-white/95 backdrop-blur-2xl border-b border-border-lux md:hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col p-8 gap-6 text-right">
              {navLinks.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsMenuOpen(false); }}
                  className={`text-sm font-bold uppercase tracking-wide transition-all ${
                    activeTab === tab.id ? "text-accent-gold" : "text-foreground/40"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area (Full Width) */}
      <main className="mt-36 w-full flex flex-col items-center px-4 md:px-0">
        
        {/* Section: דף הבית */}
        {activeTab === "דף הבית" && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-1000">
            
            {/* The Countdown Header */}
            <div className="flex flex-col items-center text-center mb-16 gap-3">
              <h1 className="text-6xl font-light tracking-tight text-accent-gold select-none">
                הספירה <span className="italic">לאחור</span>
              </h1>
              <p className="text-xs font-bold uppercase tracking-[0.4em] text-foreground/30">
                10.12.2026 — 19:30 שעון ישראל
              </p>
            </div>

            {/* Timer Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-32 w-full max-w-5xl px-6">
              {[
                { label: "ימים", value: timeLeft.days },
                { label: "שעות", value: timeLeft.hours },
                { label: "דקות", value: timeLeft.minutes },
                { label: "שניות", value: timeLeft.seconds }
              ].map((item) => (
                <div key={item.label} className="gold-gradient rounded-[2.5rem] p-10 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
                   <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 blur-[40px] -ml-16 -mt-16 group-hover:bg-white/20 transition-all duration-700 pointer-events-none"></div>
                   <span className="text-7xl font-light tracking-tighter text-white mb-2 relative z-10 drop-shadow-sm">{item.value.toString().padStart(2, '0')}</span>
                   <span className="text-xs font-bold uppercase tracking-widest text-white/50 relative z-10">{item.label}</span>
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
                      <h2 className="text-4xl font-light tracking-tight text-accent-gold mt-2">הסיפור <span className="italic">שלנו</span></h2>
                    </div>
                    <div className="h-px bg-border-lux flex-1"></div>
                 </div>
                 
                 {/* Upload Button Placeholder */}
                 <button className="flex items-center gap-3 px-8 py-4 border border-accent-gold/30 rounded-full text-accent-gold text-xs font-bold tracking-wide hover:bg-accent-gold hover:text-white transition-all group scale-90 md:scale-100">
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                    העלה תמונה/סרטון
                 </button>
              </div>

              {/* Media Grid Placeholder */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                 {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                   <div key={i} className={`aspect-square bg-white border border-border-lux rounded-3xl relative overflow-hidden group hover:border-accent-gold/30 transition-all duration-500 shadow-sm ${i === 1 ? 'md:col-span-2 md:row-span-2 aspect-auto' : ''}`}>
                      <div className="absolute inset-0 bg-gradient-to-t from-accent-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/80 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        )}

        {/* Section: מחולל דייטים */}
        {activeTab === "מחולל דייטים" && (
          <div className="w-full max-w-xl flex flex-col items-center animate-in fade-in duration-700 py-12 px-6">
            <h1 className="text-5xl font-light tracking-tight text-accent-gold mb-12">מחולל <span className="italic">דייטים</span></h1>
            <div className="w-full bg-white border border-border-lux rounded-[3rem] p-12 shadow-xl shadow-accent-gold/5 flex flex-col gap-10 border-t-accent-gold/10">
              <div className="flex flex-col gap-4">
                <label className="text-xs font-bold uppercase tracking-wide text-foreground/40">החזון הערב...</label>
                <input 
                  type="text" 
                  placeholder="ספרו לנו על הציפיות שלכם..." 
                  className="bg-background/40 border border-border-lux rounded-2xl px-7 py-5 focus:outline-none focus:ring-2 focus:ring-accent-gold/20 text-foreground transition-all placeholder:text-foreground/20 text-right"
                />
              </div>
              <button className="gold-gradient text-white font-bold uppercase text-xs tracking-widest py-6 rounded-2xl hover:opacity-90 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-3">
                 <Sparkles className="w-4 h-4" />
                 מחולל פלאות
              </button>
            </div>
          </div>
        )}

        {/* Section: מפת יעדים */}
        {activeTab === "מפת יעדים" && (
          <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-700 py-12 px-8">
            <h1 className="text-6xl font-light tracking-tight text-accent-gold mb-16 select-none">מפת <span className="italic">יעדים</span></h1>
            <div className="w-full max-w-5xl aspect-[16/8] bg-white border border-border-lux rounded-[4rem] flex flex-col items-center justify-center gap-8 group cursor-pointer hover:border-accent-gold/10 transition-all duration-700 overflow-hidden relative shadow-2xl text-center px-6">
              <div className="absolute inset-0 bg-accent-gold/5 blur-[120px] -z-10 group-hover:bg-accent-gold/10 transition-colors duration-1000"></div>
              <MapIcon className="w-16 h-16 text-accent-gold opacity-20 group-hover:scale-110 group-hover:opacity-40 transition-all duration-1000" />
              <p className="text-xs font-bold uppercase tracking-widest text-foreground/20">המפה בטעינה... היעדים בדרך</p>
            </div>
          </div>
        )}

        {/* Section: ציר זמן */}
        {activeTab === "ציר זמן" && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-12 duration-1000 py-12 pb-32">
             <h1 className="text-6xl font-light tracking-tight text-accent-gold mb-24 text-center">ציר הזמן <span className="italic">שלנו</span></h1>
             
             <div className="relative w-full max-w-3xl px-10">
               <div className="absolute right-1/2 translate-x-1/2 w-0.5 h-full bg-border-lux"></div>
               
               {[
                 { date: "31.12.2017", title: "הניצוץ הראשון", desc: "הרגע שבו שני העולמות שלנו הפכו לאחד." },
                 { date: "10.12.2026", title: "נדרים לנצח", desc: "הפרק הבא בסיפור האהבה האינסופי שלנו." }
               ].map((event, i) => (
                 <div key={i} className={`flex w-full mb-32 items-center ${i % 2 === 0 ? "flex-row-reverse" : "flex-row"}`}>
                    <div className="w-1/2"></div>
                    <div className="z-10 w-4 h-4 rounded-full bg-accent-gold border-4 border-white shadow-lg"></div>
                    <div className="w-1/2 px-12">
                       <div className="flex flex-col gap-2 text-right">
                         <span className="text-xs font-bold uppercase tracking-widest text-accent-gold">{event.date}</span>
                         <h3 className="text-3xl font-light tracking-tight text-foreground">{event.title}</h3>
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
      <footer className="fixed bottom-0 w-full py-5 px-12 border-t border-border-lux bg-white/70 backdrop-blur-md flex flex-row-reverse justify-between items-center z-40">
         <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-gold shadow-[0_0_5px_#D4AF37]"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 font-serif">Secure_Node_V3</span>
         </div>
         <div className="flex gap-8 flex-row-reverse">
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/20 font-serif">© 2017 — 2026</span>
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent-gold/40 font-serif">OMRI & OPAL</span>
         </div>
      </footer>
    </div>
  );
}