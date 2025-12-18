
import React, { memo } from 'react';
import { Lock, Sparkles, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

interface PremiumGateProps {
  isPremium: boolean;
  children: React.ReactNode;
  triggerPaywall: () => void;
  label?: string;
  className?: string;
}

export const PremiumGate = memo(({ isPremium, children, triggerPaywall, label = "Flow+", className = "" }: PremiumGateProps) => {
  if (isPremium) return <>{children}</>;

  return (
    <div className={`relative w-full h-full group ${className} overflow-hidden`}>
      {/* The Blurred Content - Interactive disabled */}
      <div className="w-full h-full opacity-50 blur-[12px] pointer-events-none select-none grayscale-[0.3] transition-all duration-500 group-hover:blur-[8px] group-hover:scale-[1.02] mix-blend-lighten">
        {children}
      </div>

      {/* The Lock Overlay & CTA */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4">
        <motion.button
          onClick={(e) => { e.stopPropagation(); triggerPaywall(); }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative group/btn w-full max-w-[200px]"
        >
          {/* Glowing Backing */}
          <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 group-hover/btn:opacity-40 transition-opacity" />
          
          <div className="relative overflow-hidden bg-gradient-to-r from-[#020617] to-[#0f172a] p-[1px] rounded-2xl shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/50 to-orange-500/50 opacity-50" />
            
            <div className="relative bg-[#020617]/90 backdrop-blur-xl px-6 py-4 rounded-[15px] flex items-center justify-center gap-3 border border-amber-500/30 group-hover/btn:border-amber-500/60 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-black shadow-lg shadow-orange-500/20">
                 <Lock size={14} strokeWidth={3} />
              </div>
              
              <div className="flex flex-col items-start">
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-200">Unlock</span>
                 <span className="text-sm font-bold text-white font-outfit leading-none">{label}</span>
              </div>
            </div>
            
            {/* Shimmer Animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[200%] animate-[shimmer_3s_infinite]" />
          </div>
        </motion.button>
      </div>
    </div>
  );
});
