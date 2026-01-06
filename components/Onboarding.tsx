
import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { BrainCircuit, Zap, ChevronRight, Check, Orbit, Timer } from 'lucide-react';
import { triggerHaptic } from '../utils.ts';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(0);

  const slides = [
    {
      id: 0,
      icon: Orbit,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      shadow: 'shadow-cyan-500/20',
      title: "Circaseptan Logic",
      desc: "Biology adapts in 7-day cycles. We track this precise window to align habit formation with your natural physiological tempo, minimizing resistance."
    },
    {
      id: 1,
      icon: Timer,
      color: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10',
      border: 'border-fuchsia-500/20',
      shadow: 'shadow-fuchsia-500/20',
      title: "60-Second Sync",
      desc: "Low friction, high fidelity. Input your bio-markers in under a minute. You provide the raw data; the system handles the complex correlation logic."
    },
    {
      id: 2,
      icon: BrainCircuit,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      shadow: 'shadow-indigo-500/20',
      title: "Neural Tunnel",
      desc: "Our AI engine scans for 'Cognitive Drift', translating disparate metrics into actionable metabolic insights every single day."
    },
    {
      id: 3,
      icon: Zap,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      shadow: 'shadow-amber-500/20',
      title: "Flow State",
      desc: "No spreadsheets. Just beautiful, liquid visualizations that show you exactly where your consistency stands at a glance."
    }
  ];

  const handleNext = () => {
    triggerHaptic();
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      } 
    },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const iconVariants: Variants = {
    hidden: { scale: 0, rotate: -45, opacity: 0 },
    visible: { 
      scale: 1, 
      rotate: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 200, damping: 20 }
    },
    float: {
      y: [0, -10, 0],
      rotate: [0, 3, -3, 0],
      transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center p-4 md:p-12 bg-[#020617] overflow-hidden">
      {/* Background Decor */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 8, repeat: Infinity }}
        className={`absolute inset-0 bg-gradient-to-br ${step === 0 ? 'from-cyan-900/20' : step === 1 ? 'from-fuchsia-900/20' : step === 2 ? 'from-indigo-900/20' : 'from-amber-900/20'} to-transparent z-0`}
      />

      <div className="w-full max-w-5xl relative z-10 px-4">
        {/* Main Content Layout - Stacks on mobile, dual panel on iPad (md+) */}
        <div className="mx-auto w-full rounded-[48px] border border-white/10 bg-[#020617]/70 backdrop-blur-3xl shadow-2xl p-6 md:p-16 flex flex-col md:flex-row gap-12 md:gap-20 items-center justify-center min-h-[50vh] transition-all duration-700">
          
          {/* Actionable Side (Slides) */}
          <div className="flex-1 w-full max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex flex-col items-center md:items-start text-center md:text-left space-y-10"
              >
                {/* Liquid Glass Icon Container */}
                <motion.div variants={itemVariants} className="relative group mx-auto md:mx-0">
                   <motion.div 
                     animate={{ scale: [1, 1.15, 1], opacity: [0, 0.4, 0] }} 
                     transition={{ duration: 4, repeat: Infinity }}
                     className={`absolute inset-0 rounded-full blur-3xl ${slides[step].bg}`} 
                   />
                   <motion.div 
                     variants={iconVariants}
                     animate={["visible", "float"]}
                     className={`
                        w-40 h-40 md:w-56 md:h-56 rounded-[50px] md:rounded-[64px] flex items-center justify-center 
                        glass border ${slides[step].border} relative overflow-hidden backdrop-blur-2xl
                        shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)]
                     `}
                   >
                     {/* Internal liquid highlight */}
                     <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50" />
                     <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent" />
                     
                     {React.createElement(slides[step].icon, { 
                        size: 64, 
                        className: `${slides[step].color} drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] md:w-20 md:h-20` 
                     })}
                   </motion.div>
                </motion.div>

                <div className="space-y-5 px-2">
                  <motion.div variants={itemVariants} className="flex items-center justify-center md:justify-start gap-2 mb-2">
                     <div className={`h-1 w-8 rounded-full ${slides[step].bg.replace('/10', '')}`} />
                     <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${slides[step].color}`}>Phase 0{step + 1}</span>
                     <div className={`h-1 w-8 md:hidden rounded-full ${slides[step].bg.replace('/10', '')}`} />
                  </motion.div>
                  
                  <motion.h2 variants={itemVariants} className="text-5xl md:text-7xl font-black font-outfit tracking-tighter text-white leading-[0.9]">
                    {slides[step].title}
                  </motion.h2>
                  
                  <motion.p variants={itemVariants} className="text-indigo-200/60 text-lg md:text-xl font-medium leading-relaxed max-w-sm">
                    {slides[step].desc}
                  </motion.p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-12 md:mt-20 space-y-8">
               {/* Pagination Dots */}
              <div className="flex justify-center md:justify-start gap-3">
                {slides.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-500 ease-[0.22,1,0.36,1] ${idx === step ? 'w-12 bg-white' : 'w-2 bg-white/10'}`} 
                  />
                ))}
              </div>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                onClick={handleNext}
                className="w-full md:w-auto md:px-12 py-6 bg-white text-black font-black rounded-[32px] md:rounded-[40px] text-xl shadow-[0_0_50px_-10px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 font-outfit relative overflow-hidden group"
              >
                <span className="relative z-10">{step === slides.length - 1 ? 'ENTER REGISTRY' : 'NEXT SEQUENCE'}</span>
                {step === slides.length - 1 ? <Check size={24} className="relative z-10" /> : <ChevronRight size={24} className="relative z-10" />}
                
                {/* Button Glint */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]" />
                <style>{`@keyframes shimmer { 100% { transform: translateX(150%); } }`}</style>
              </motion.button>
            </div>
          </div>

          {/* Decorative/Info Side (Visible on iPad) */}
          <div className="hidden md:flex flex-1 items-center justify-center">
             <div className="relative w-full aspect-square max-w-sm group">
                <div className="absolute inset-0 bg-teal-500/20 blur-[100px] rounded-full animate-pulse opacity-40" />
                <div className={`absolute inset-0 rounded-[80px] border border-white/5 bg-gradient-to-br from-white/10 to-transparent flex flex-col items-center justify-center p-12 text-center backdrop-blur-3xl shadow-3xl`}>
                   <div className="space-y-8">
                      <div className="w-20 h-20 rounded-full border border-teal-500/30 flex items-center justify-center mx-auto bg-teal-500/5">
                        <Check className="text-teal-400" size={32} />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl font-black text-white">iPad Adaptive</h3>
                        <p className="text-white/40 text-sm font-medium leading-relaxed">You're viewing the optimized iPad interface. Generous margins and expanded typography for an immersive biometric experience.</p>
                      </div>
                      <div className="flex gap-2 justify-center">
                         {[1,2,3].map(i => (
                           <div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-500/40" />
                         ))}
                      </div>
                   </div>
                </div>
                {/* Orbital Rings */}
                <div className="absolute -inset-10 border border-teal-500/5 rounded-full animate-[spin_60s_linear_infinite]" />
                <div className="absolute -inset-20 border border-cyan-500/5 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
