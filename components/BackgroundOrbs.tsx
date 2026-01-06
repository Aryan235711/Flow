
import React, { memo } from 'react';
import { motion } from 'framer-motion';

export const BackgroundOrbs = memo(() => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 backface-hidden" aria-hidden="true">
    {/* CSS Noise Overlay - Optimized opacity */}
    <div className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none" 
         style={{ 
           backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
           backgroundRepeat: 'repeat',
         }} 
    />

    <motion.div 
      initial={{ x: 0, y: 0, scale: 1 }}
      animate={{ x: [0, 10, 0], y: [0, 15, 0], scale: [1, 1.05, 1] }} 
      transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
      style={{ willChange: 'transform' }}
      className="absolute top-[-10%] left-[-10%] w-[120vw] h-[120vw] bg-teal-500/[0.03] blur-[100px] rounded-full transform-gpu" 
    />
  </div>
));
