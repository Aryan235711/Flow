
import React from 'react';
import { motion } from 'framer-motion';

export const ChartLoader = () => (
  <div className="relative w-full h-full overflow-hidden rounded-[20px] bg-white/[0.01] flex items-center justify-center border border-white/5">
    {/* Grid Background */}
    <div className="absolute inset-0 opacity-20" 
         style={{ backgroundImage: 'linear-gradient(to right, rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
    />
    
    {/* Scanning Line */}
    <motion.div 
      className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.8)] z-10"
      animate={{ top: ['0%', '100%'], opacity: [0, 1, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    />
    
    {/* Pulsing Center Text */}
    <div className="relative z-20 flex flex-col items-center gap-2">
       <div className="flex gap-1">
         {[0, 1, 2].map(i => (
           <motion.div 
             key={i}
             animate={{ scaleY: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
             transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
             className="w-1 h-3 bg-indigo-500 rounded-full"
           />
         ))}
       </div>
       <span className="text-[9px] font-black tracking-[0.3em] text-indigo-400/60 font-outfit">
         ANALYZING
       </span>
    </div>
  </div>
);
