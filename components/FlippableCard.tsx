
import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Info, RotateCcw, LucideIcon } from 'lucide-react';

interface FlippableCardProps {
  children: React.ReactNode;
  backContent: string;
  title: string;
  icon: LucideIcon;
  color: string;
}

export const FlippableCard = memo(({ children, backContent, title, icon: Icon, color }: FlippableCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="perspective-1000 w-full h-full min-h-[220px] relative group" role="region" aria-label={title}>
      <motion.div
        className="w-full h-full relative preserve-3d"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        style={{ willChange: "transform" }}
      >
        {/* Front Face - Holographic Panel */}
        <div className="absolute inset-0 backface-hidden glass rounded-[32px] flex flex-col overflow-hidden border border-white/5 shadow-2xl">
          {/* Subtle Noise & Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

          {/* Header */}
          <div className="flex justify-between items-center p-5 pb-0 relative z-20">
            <div className="flex items-center gap-2">
               <div className={`p-1.5 rounded-lg bg-white/5 ${color} backdrop-blur-md`}>
                 <Icon size={14} />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 font-outfit">{title}</span>
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            >
              <Info size={14} />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 relative w-full h-full px-2 pb-2 isolate">
            {children}
          </div>
        </div>

        {/* Back Face - Info Mode */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 glass rounded-[32px] p-6 bg-[#0a1128]/98 border border-white/10 flex flex-col justify-center text-center z-30">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
          
          <div className={`mx-auto w-12 h-12 rounded-[16px] bg-white/5 flex items-center justify-center mb-4 ${color} shadow-lg ring-1 ring-white/10 shrink-0`}>
            <Icon size={24} />
          </div>
          
          <h4 className="text-xl font-black font-outfit mb-3 text-white">System Logic</h4>
          
          <div className="overflow-y-auto max-h-[140px] px-2 mb-4 scrollbar-hide">
             <p className="text-indigo-200/50 leading-relaxed font-medium text-xs">
              {backContent}
            </p>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
            className="mx-auto py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white flex items-center justify-center gap-2 shrink-0"
          >
            <RotateCcw size={12} /> Return
          </button>
        </div>
      </motion.div>
    </div>
  );
});
