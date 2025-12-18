
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Zap, Crown, BrainCircuit, Activity } from 'lucide-react';
import { FlowLogo } from './FlowLogo.tsx';

interface PaywallProps {
  onClose: () => void;
  onUpgrade: () => void;
}

export const Paywall = memo(({ onClose, onUpgrade }: PaywallProps) => {
  const features = [
    { icon: BrainCircuit, title: "Neural Cortex AI", desc: "Deep correlation analysis via Gemini." },
    { icon: Activity, title: "Trend Visualization", desc: "Unlock Drift, Heatmap & Radar charts." },
    { icon: Zap, title: "Advanced Calibration", desc: "Custom biometrics & CSV Export." },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[500] bg-[#020617] flex flex-col pt-safe"
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-amber-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-orange-600/10 blur-[80px] rounded-full" />
      </div>

      <div className="px-6 py-5 flex justify-end relative z-10">
        <button onClick={onClose} className="w-10 h-10 glass rounded-full flex items-center justify-center text-white/50 active:scale-95">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 px-8 flex flex-col items-center relative z-10">
        <div className="w-24 h-24 mb-8 relative">
           <div className="absolute inset-0 bg-amber-500/30 blur-2xl rounded-full animate-pulse" />
           <FlowLogo className="w-full h-full drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
           <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[10px] font-black px-2 py-1 rounded-full shadow-lg">PRO</div>
        </div>

        <h2 className="text-4xl font-black font-outfit text-center mb-2 leading-none">
          Unlock Total<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">Biological Clarity</span>
        </h2>
        
        <p className="text-amber-100/40 text-center text-sm font-medium mb-12 max-w-[260px]">
          Upgrade to Flow+ to access the Neural Cortex AI and advanced telemetry visualization.
        </p>

        <div className="w-full space-y-4 mb-8">
          {features.map((f, i) => (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 * i }}
              key={i} 
              className="glass p-4 rounded-2xl flex items-center gap-4 border-amber-500/10"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center text-amber-400">
                <f.icon size={20} />
              </div>
              <div>
                <h3 className="font-bold font-outfit text-white">{f.title}</h3>
                <p className="text-xs text-white/40">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pricing / CTA */}
      <div className="p-6 pb-safe bg-gradient-to-t from-[#020617] to-transparent relative z-10 space-y-4">
        <div className="text-center space-y-1">
          <div className="text-3xl font-black font-outfit text-white">$4.99<span className="text-base text-white/30 font-bold"> / month</span></div>
          <div className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Cancel anytime</div>
        </div>

        <button 
          onClick={onUpgrade}
          className="w-full py-5 bg-gradient-to-r from-amber-400 to-orange-500 text-[#020617] font-black rounded-[32px] text-lg shadow-[0_10px_40px_-10px_rgba(245,158,11,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3 font-outfit relative overflow-hidden group"
        >
          <Crown size={20} className="fill-black/20" /> 
          <span className="relative z-10">INITIATE UPLINK</span>
          <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </button>
      </div>
    </motion.div>
  );
});
