
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
    <div className="fixed inset-0 z-[250] bg-[#020617] overflow-hidden">
      {/* Background Decor */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 8, repeat: Infinity }}
        className={`absolute inset-0 bg-gradient-to-br ${step === 0 ? 'from-cyan-900/20' : step === 1 ? 'from-fuchsia-900/20' : step === 2 ? 'from-indigo-900/20' : 'from-amber-900/20'} to-transparent z-0`}
      />

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8">
        {/* Slides */}
        <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-center space-y-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center text-center space-y-10"
            >
              {/* Liquid Glass Icon Container */}
              <motion.div variants={itemVariants} className="relative group mx-auto">
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
                <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mb-2">
                  <div className={`h-1 w-8 rounded-full ${slides[step].bg.replace('/10', '')}`} />
                  <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${slides[step].color}`}>Phase 0{step + 1}</span>
                  <div className={`h-1 w-8 md:hidden rounded-full ${slides[step].bg.replace('/10', '')}`} />
                </motion.div>
                
                <motion.h2 variants={itemVariants} className="text-5xl md:text-7xl font-black font-outfit tracking-tighter text-white leading-[0.9]">
                  {slides[step].title}
                </motion.h2>
                
                <motion.p variants={itemVariants} className="text-indigo-200/60 text-lg md:text-xl font-medium leading-relaxed max-w-2xl">
                  {slides[step].desc}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-12 md:mt-20 space-y-8">
            {/* Pagination Dots */}
            <div className="flex justify-center gap-3">
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
              className="w-full py-6 bg-white text-black font-black rounded-[32px] md:rounded-[40px] text-xl shadow-[0_0_50px_-10px_rgba(255,255,255,0.2)] flex items-center justify-center gap-3 font-outfit relative overflow-hidden group"
            >
              <span className="relative z-10">{step === slides.length - 1 ? 'ENTER REGISTRY' : 'NEXT SEQUENCE'}</span>
              {step === slides.length - 1 ? <Check size={24} className="relative z-10" /> : <ChevronRight size={24} className="relative z-10" />}
              
              {/* Button Glint */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]" />
              <style>{`@keyframes shimmer { 100% { transform: translateX(150%); } }`}</style>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
