import { PieChart, Zap } from "lucide-react";

export default function MultipliersPage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-12 text-foreground transition-colors duration-300">
      <header className="mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8 mt-16 md:mt-0">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-foreground/5 p-2 rounded-xl">
              <PieChart className="w-6 h-6 text-foreground/40" />
            </div>
            <span className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.4em]">Multi-Factor Analysis</span>
          </div>
          <h1 className="text-5xl font-extralight tracking-tighter text-foreground leading-none">
            Multipliers <span className="text-foreground/30 italic">Engine</span>
          </h1>
          <p className="text-foreground/40 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Peer Comparison Matrix Offline
          </p>
        </div>
      </header>
      
      <main className="flex flex-col items-center justify-center min-h-[50vh] bg-card/30 border border-border-lux rounded-[3.5rem] shadow-3xl backdrop-blur-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-foreground/5 rounded-full filter blur-[120px] -mr-32 -mt-32 pointer-events-none group-hover:bg-foreground/10 transition-colors duration-1000"></div>
        
        <div className="text-center space-y-8 relative z-10 px-6">
          <div className="w-24 h-24 bg-foreground/5 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl border border-border-lux group-hover:scale-110 transition-transform duration-700">
            <Zap className="w-10 h-10 text-foreground/20 animate-pulse" />
          </div>
          <h2 className="text-4xl font-extralight tracking-tighter text-foreground leading-none">Intelligence Hub <span className="italic text-foreground/30">Sequencing</span></h2>
          <p className="text-foreground/40 max-w-sm mx-auto font-mono text-[10px] uppercase tracking-[0.2em] leading-relaxed font-bold">
            The comparative multiplier engine is currently undergoing architecture synchronization. Cross-ticker PEG/PE analysis will be online shortly.
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
