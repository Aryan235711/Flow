import React, { useMemo, useState, useCallback, memo, lazy, Suspense } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Moon, Activity, Sun, Sparkles, Database, Target, Zap, Flame, Disc, Snowflake, ScanLine, Fingerprint, RefreshCw, Calendar, Edit3, Plus, BrainCircuit, Brain, CloudFog, BatteryWarning, Coffee, Dumbbell, Heart } from 'lucide-react';
import { MetricEntry, UserConfig, Notification, UserProfile } from '../types.ts';
import { useFlowAI } from '../hooks/useFlowAI.ts';
import { Deferred } from './Deferred.tsx';
import { FlippableCard } from './FlippableCard.tsx';
import { PremiumGate } from './PremiumGate.tsx';
import { VitalityOrb } from './VitalityOrb.tsx';
import { NeuralPlasticityIndicators } from './NeuralPlasticityIndicators.tsx';
import { triggerHaptic } from '../utils.ts';
import { useHistorySummary } from '../hooks/useHistorySummary.ts';

// Lazy load chart components
const VelocityChart = lazy(() => import('./charts/VelocityChart.tsx').then(m => ({ default: m.VelocityChart })));
const RadarMesh = lazy(() => import('./charts/RadarMesh.tsx').then(m => ({ default: m.RadarMesh })));
const ConsistencyHeatmap = lazy(() => import('./charts/ConsistencyHeatmap.tsx').then(m => ({ default: m.ConsistencyHeatmap })));
const CognitiveDriftChart = lazy(() => import('./charts/CognitiveDriftChart.tsx').then(m => ({ default: m.CognitiveDriftChart })));

interface DashboardProps {
  history: MetricEntry[];
  config: UserConfig;
  onAddNotif: (title: string, message: string, type: Notification['type']) => void;
  isMockData: boolean;
  user: UserProfile; 
  onTriggerPaywall: () => void; 
  onLogToday: () => void;
}

const DailySnapshot = memo(({ entry, onLog }: { entry?: MetricEntry, onLog: () => void }) => {
  const isSystem = entry?.isSystemGenerated;
  const cognition = entry?.rawValues?.cognition;

  const theme = useMemo(() => {
    if (isSystem) {
      return { color: 'text-cyan-400', gradient: 'from-cyan-500/20 to-blue-600/20', icon: Snowflake };
    }
    switch (cognition) {
      case 'PEAK': return { color: 'text-teal-400', gradient: 'from-teal-500/20 to-cyan-500/20', icon: Zap };
      case 'FOGGY': return { color: 'text-slate-400', gradient: 'from-slate-500/20 to-gray-500/20', icon: CloudFog };
      case 'DRAINED': return { color: 'text-rose-400', gradient: 'from-rose-500/20 to-orange-600/20', icon: BatteryWarning };
      default: return { color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-teal-500/20', icon: BrainCircuit };
    }
  }, [isSystem, cognition]);

  if (!entry) {
    return (
      <motion.button
        onClick={() => { triggerHaptic(); onLog(); }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="w-full relative overflow-hidden rounded-[40px] bg-[#0f172a] border border-white/5 p-8 group"
      >
         <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
         <div className="relative flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-xl">
               <Plus size={32} className="text-white/40 group-hover:text-white transition-colors" />
            </div>
            <div>
               <h3 className="text-lg font-black font-outfit text-white mb-1">Awaiting Sync</h3>
               <p className="text-xs font-medium text-white/30">Initialize daily telemetry.</p>
            </div>
         </div>
      </motion.button>
    );
  }

    const StatusIcon = theme.icon;

  return (
    <div className="relative w-full group">
       {/* Ambient Glow */}
       <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} blur-3xl opacity-30 rounded-[40px] transition-all duration-700 group-hover:opacity-50`} />
       
       <div className="relative glass rounded-[40px] p-8 border-white/10 overflow-hidden">
           {/* Header */}
           <div className="flex justify-between items-start mb-10 relative z-10">
             <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 ${theme.color} shadow-lg backdrop-blur-md`}>
                   <StatusIcon size={24} />
                </div>
                <div>
                   <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-1">Current State</div>
                   <div className="text-4xl font-black font-outfit text-white leading-none tracking-tight shadow-black drop-shadow-lg">
                      {isSystem ? 'Cryostasis' : entry.rawValues.cognition}
                   </div>
                </div>
             </div>
             
             {!isSystem && (
               <button onClick={() => { triggerHaptic(); onLog(); }} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white transition-colors active:scale-95">
                  <Edit3 size={16} />
               </button>
             )}
          </div>

          {/* Minimal Vitals Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-7 mb-10 relative z-10 border-t border-white/5 pt-8">
             <div className="flex flex-col gap-1">
               <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/20">Sleep</span>
               <span className="text-2xl md:text-3xl font-black font-outfit text-teal-200">{entry.rawValues.sleep.toFixed(1)}<span className="text-[10px] text-white/20 ml-0.5 align-top">h</span></span>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/20">HRV</span>
               <span className="text-2xl md:text-3xl font-black font-outfit text-emerald-200">{entry.rawValues.hrv}<span className="text-[10px] text-white/20 ml-0.5 align-top">ms</span></span>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/20">RHR</span>
               <span className="text-2xl md:text-3xl font-black font-outfit text-rose-200">{entry.rawValues.rhr}<span className="text-[10px] text-white/20 ml-0.5 align-top">bp</span></span>
             </div>
             <div className="flex flex-col gap-1">
               <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-white/20">Prot</span>
               <span className="text-2xl md:text-3xl font-black font-outfit text-amber-200">{entry.rawValues.protein}<span className="text-[10px] text-white/20 ml-0.5 align-top">g</span></span>
             </div>
          </div>

           {/* Footer Context Pills */}
           <div className="flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-4 relative z-10">
             <div className="px-4 py-2 md:px-5 md:py-3 rounded-full bg-white/5 border border-white/5 flex items-center gap-2.5">
               <Sun size={14} className={entry.processedState.sun === 'GREEN' ? 'text-amber-400' : 'text-white/30'} />
               <span className="text-[10px] md:text-xs font-bold text-white/70 tracking-wide">{entry.rawValues.sun}</span>
             </div>
             <div className="px-4 py-2 md:px-5 md:py-3 rounded-full bg-white/5 border border-white/5 flex items-center gap-2.5">
               <Dumbbell size={14} className={entry.processedState.exercise === 'GREEN' ? 'text-emerald-400' : 'text-white/30'} />
               <span className="text-[10px] md:text-xs font-bold text-white/70 tracking-wide">{entry.rawValues.exercise}</span>
             </div>
             <div className="px-4 py-2 md:px-5 md:py-3 rounded-full bg-white/5 border border-white/5 flex items-center gap-2.5">
               <Coffee size={14} className={entry.processedState.gut === 'GREEN' ? 'text-teal-400' : 'text-white/30'} />
               <span className="text-[10px] md:text-xs font-bold text-white/70 tracking-wide">Gut {entry.rawValues.gut}</span>
             </div>
           </div>
       </div>
    </div>
  );
});

export const Dashboard = memo(({ history, config, onAddNotif, isMockData, user, onTriggerPaywall, onLogToday }: DashboardProps) => {
  const { getInsight, loading } = useFlowAI();
  const [aiText, setAiText] = useState("System online. Neural interface standing by for query.");
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const { latest, todayEntry, streak, chartData, driftData } = useHistorySummary(history, config);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user.name ? user.name.split(' ')[0] : 'Traveler';
    if (hour < 12) return `Good Morning, ${firstName}.`;
    if (hour < 18) return `Good Afternoon, ${firstName}.`;
    return `Good Evening, ${firstName}.`;
  };

  const dailyFocus = useMemo(() => {
    if (!latest) return { title: "CALIBRATE", desc: "Initialize protocol.", color: "text-white", border: "border-white/10" };
    if (latest.isSystemGenerated) return {
       title: "CRYOSTASIS", desc: "Preservation mode.", color: "text-cyan-400", icon: Snowflake, border: "border-cyan-500/30"
    };
    const sleep = latest.rawValues?.sleep || 0;
    const hrv = latest.rawValues?.hrv || 0;
    if (sleep < 6 || hrv < 35) return { title: "DEEP REST", desc: "Prioritize recovery.", color: "text-rose-400", icon: Moon, border: "border-rose-500/20" };
    if (sleep > 7.2 && hrv > 55) return { title: "HIGH EXERTION", desc: "Push limits.", color: "text-emerald-400", icon: Flame, border: "border-emerald-500/20" };
    return { title: "MAINTENANCE", desc: "Sustain output.", color: "text-teal-400", icon: Activity, border: "border-teal-500/20" };
  }, [latest]);

  const handleGenerateInsight = useCallback(async (force = false) => {
    triggerHaptic();
    if (!user.isPremium) {
      onTriggerPaywall();
      return;
    }
    if (hasGenerated && !force) {
      setIsExpanded(prev => !prev);
      return;
    }
    if (history.length < 3) {
      setAiText("Telemetry insufficient. Data density too low for neural correlation. Please log at least 3 entries.");
      setIsExpanded(true);
      return;
    }
    setIsExpanded(true); 
    const insight = await getInsight(history, config);
    setAiText(insight);
    setHasGenerated(true);
    onAddNotif("Cortex Updated", "New correlation detected.", "AI");
  }, [history, config, getInsight, onAddNotif, hasGenerated, user.isPremium, onTriggerPaywall]);

  const staggerChildren: Variants = { show: { transition: { staggerChildren: 0.08 } } };
  const fadeUp: Variants = { 
    hidden: { y: 20, opacity: 0, scale: 0.98 }, 
    show: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 120 } } 
  };

  return (
    <motion.div variants={staggerChildren} initial="hidden" animate="show" className="px-5 pb-40 space-y-8 mt-20 md:mt-36">
      
      {/* PERSONALIZED GREETING */}
      <motion.div variants={fadeUp} className="flex justify-between items-end mb-2">
         <div>
            <h3 className="text-2xl md:text-4xl font-black font-outfit text-white leading-none tracking-tight">
               {getGreeting()}
            </h3>
            <p className="text-sm md:text-base font-medium text-teal-300/40">Your biometrics are synced.</p>
         </div>
         {isMockData && (
          <div className="flex items-center gap-1.5 opacity-50 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-md">
             <Database size={10} className="text-teal-400" />
             <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">Simulation Mode</span>
          </div>
        )}
      </motion.div>

      {/* CORE STATS GRID */}
      <div className="grid grid-cols-1 gap-8 items-start">
        
        {/* 1. HERO CARD (Streak) */}
        <motion.div variants={fadeUp} className={`glass rounded-[48px] p-6 sm:p-8 md:p-12 relative overflow-hidden group border-t-2 ${dailyFocus.border || 'border-white/10'} flex flex-col justify-center min-h-[220px] md:min-h-[280px]`}>
          {/* Subtle Gradient wash that breathes */}
          <div className={`absolute inset-0 bg-gradient-to-br ${dailyFocus.color === 'text-emerald-400' ? 'from-emerald-900/10' : dailyFocus.color === 'text-rose-400' ? 'from-rose-900/10' : 'from-teal-900/10'} to-transparent opacity-50`} />
          
          {/* Scan line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[scan_6s_ease-in-out_infinite]" />
          
          <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
            <div className="flex justify-between items-start gap-4 sm:gap-10">
              <div className="space-y-4 flex-1 min-w-0">
                       <div className="flex items-center gap-2">
                          <Fingerprint size={14} className={`animate-pulse ${dailyFocus.color}`} />
                          <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${dailyFocus.color} opacity-80`}>Protocol Active</span>
                       </div>
                 <h2 className="text-3xl sm:text-5xl md:text-7xl font-black font-outfit tracking-tighter leading-none text-white drop-shadow-lg">{dailyFocus.title}</h2>
                 <p className="text-xs sm:text-lg md:text-xl font-bold text-white/50 leading-relaxed max-w-2xl">{dailyFocus.desc}</p>
                  </div>
              <div className="flex flex-col items-end shrink-0">
                <div className="w-16 h-16 md:w-32 md:h-32 rounded-[28px] md:rounded-[48px] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-md relative mb-4 group-hover:scale-105 transition-transform">
                  <span className="text-3xl md:text-6xl font-black font-outfit text-white">{streak}</span>
                          <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-4 h-4 md:w-8 md:h-8 bg-amber-500 rounded-full animate-pulse shadow-[0_0_20px_#f59e0b]" />
                      </div>
                      <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
                         <Snowflake size={12} className="text-cyan-400" />
                         <span className="text-[10px] font-black text-cyan-400 tracking-wider font-outfit">{config.streakLogic?.freezesAvailable ?? 2}/2</span>
                      </div>
                  </div>
              </div>
          </div>
        </motion.div>

        {/* 2. TODAY'S SNAPSHOT */}
        <motion.div variants={fadeUp}>
           <DailySnapshot entry={todayEntry} onLog={onLogToday} />
        </motion.div>
      </div>

      {/* ADAPTIVE VISUALIZATION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        
        {/* 3. VITALITY ORB COLUMN (Left on iPad) */}
        <motion.div variants={fadeUp} className="md:col-span-5 lg:col-span-4 flex flex-col">
          {/* Vitality Orb */}
          <div className="min-h-[520px] lg:sticky lg:top-32">
            <FlippableCard title="Vitality Orb" icon={Heart} color="text-rose-400" backContent="The Vitality Orb calculates your biological age based on comprehensive health metrics including sleep quality, heart rate variability, cognitive performance, physical activity, and nutritional consistency. A lower biological age than chronological age indicates excellent health optimization.">
              <VitalityOrb history={history} config={config} userAge={30} />
            </FlippableCard>
          </div>

          {/* Neural Plasticity Indicators (Gap Filler) */}
          <div className="flex-1 mt-6">
            <FlippableCard title="Neural Plasticity" icon={Brain} color="text-indigo-400" backContent="Neural plasticity measures your brain's ability to adapt and reorganize. This chart tracks four key indicators: Memory Consolidation (sleep quality), Synaptic Plasticity (cognitive flexibility), Cognitive Reserve (mental resilience), and Neuroplasticity Index (overall brain adaptability). Higher scores indicate better neural health and learning capacity.">
              <NeuralPlasticityIndicators history={history} config={config} />
            </FlippableCard>
          </div>
        </motion.div>

        {/* 4. CORTEX + TELEMETRY (Right on iPad) */}
        <div className="md:col-span-7 lg:col-span-8 space-y-8">
          
          {/* CORTEX UPLINK */}
          <motion.div variants={fadeUp} className="relative group">
            <PremiumGate isPremium={user.isPremium} triggerPaywall={onTriggerPaywall} label="Neural Cortex" className="rounded-[32px]">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[34px] opacity-30 group-hover:opacity-60 blur transition duration-500" />
              <div className="glass rounded-[32px] p-2 relative bg-[#020617]">
                <div className="flex justify-between items-center p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                      <Sparkles size={22} className={`text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-indigo-300/60 uppercase tracking-[0.3em] font-outfit">Cortex Uplink</div>
                      <div className="text-sm font-bold text-white">Neural Analysis Engine</div>
                    </div>
                  </div>
                  
                  {user.isPremium && (
                    <button 
                      onClick={() => handleGenerateInsight(false)}
                      disabled={loading}
                      className={`px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest text-indigo-400 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ${isExpanded ? 'bg-white/10 text-white' : ''}`}
                    >
                      {loading ? 'Scanning...' : hasGenerated ? (isExpanded ? 'Collapse' : 'View Insight') : 'Ping AI'} <ScanLine size={14} />
                    </button>
                  )}
                </div>
                
                <AnimatePresence>
                  {isExpanded ? (
                    <motion.div 
                       initial={{ height: 0, opacity: 0 }} 
                       animate={{ height: 'auto', opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }} 
                       exit={{ height: 0, opacity: 0 }} 
                       className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-0 space-y-4">
                        <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
                          <p className="text-base md:text-lg font-medium font-outfit text-indigo-100/90 leading-relaxed">{aiText}</p>
                        </div>
                        {hasGenerated && (
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Analysis based on recent biometric history</span>
                            <button onClick={() => handleGenerateInsight(true)} aria-label="Regenerate AI insight" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Regenerate</button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : !user.isPremium ? (
                    <div className="px-6 pb-6 pt-0 opacity-50">
                        <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 line-clamp-2">
                          <p className="text-base font-medium font-outfit text-indigo-100/90 leading-relaxed blur-[4px]">
                            Metabolic indicators suggest a 15% increase in cognitive drift. Optimize protein intake to stabilize circadian rhythm output and improve biological resilience.
                          </p>
                        </div>
                    </div>
                  ) : null}
                </AnimatePresence>
              </div>
            </PremiumGate>
          </motion.div>

          {/* TELEMETRY DECK GRID */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2 opacity-60">
               <Disc size={12} className="text-emerald-400 animate-spin-slow" />
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Advanced Telemetry Deck</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 items-start">
              <div className="h-[280px]">
                <PremiumGate isPremium={user.isPremium} triggerPaywall={onTriggerPaywall} label="Velocity Tracking">
                  <FlippableCard title="Velocity" icon={Activity} color="text-emerald-400" backContent="Velocity tracks the correlation between metabolic protein intake and physical exertion.">
                    {history.length >= 3 ? (
                      <div className="h-full w-full pb-6"><Deferred><Suspense fallback={<div/>}><VelocityChart data={chartData} proteinGoal={config.manualTargets.protein} /></Suspense></Deferred></div>
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center gap-3 opacity-40">
                        <Database size={32} className="text-emerald-400" />
                        <p className="text-xs text-white/50 text-center px-4">Need 3+ entries to visualize velocity trends</p>
                      </div>
                    )}
                  </FlippableCard>
                </PremiumGate>
              </div>
              <div className="h-[280px]">
                <PremiumGate isPremium={user.isPremium} triggerPaywall={onTriggerPaywall} label="Drift Analysis">
                  <FlippableCard title="Cognitive Drift" icon={Zap} color="text-pink-400" backContent="Drift visualizes the stability of your subjective mental state over time.">
                    {history.length >= 3 ? (
                      <div className="h-full w-full pb-6"><Deferred><Suspense fallback={<div/>}><CognitiveDriftChart data={driftData} /></Suspense></Deferred></div>
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center gap-3 opacity-40">
                        <Zap size={32} className="text-pink-400" />
                        <p className="text-xs text-white/50 text-center px-4">Need 3+ entries to analyze cognitive drift</p>
                      </div>
                    )}
                  </FlippableCard>
                </PremiumGate>
              </div>
              <div className="min-h-[440px] md:min-h-[520px] lg:min-h-[560px] md:col-span-2 h-full">
                <PremiumGate isPremium={user.isPremium} triggerPaywall={onTriggerPaywall} label="Flow Heatmap">
                  <FlippableCard title="Flow Persistence" icon={Calendar} color="text-cyan-400" backContent="The Heatmap displays your consistency density over the last 28 days.">
                    {history.length >= 3 ? (
                      <div className="h-full w-full mt-2 flex"><Deferred><Suspense fallback={<div/>}><ConsistencyHeatmap history={history} config={config} /></Suspense></Deferred></div>
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center gap-3 opacity-40">
                        <Calendar size={32} className="text-cyan-400" />
                        <p className="text-xs text-white/50 text-center px-4">Need 3+ entries to show consistency heatmap</p>
                      </div>
                    )}
                  </FlippableCard>
                </PremiumGate>
              </div>
              <div className="h-[300px] md:col-span-2">
                 <PremiumGate isPremium={user.isPremium} triggerPaywall={onTriggerPaywall} label="Bio-Mesh">
                    <FlippableCard title="Bio-Mesh Alignment" icon={Sun} color="text-amber-400" backContent="The Radar Mesh maps the symmetry of your current physiological state.">
                      <div className="h-full w-full"><Deferred><Suspense fallback={<div/>}><RadarMesh latest={latest} /></Suspense></Deferred></div>
                    </FlippableCard>
                 </PremiumGate>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});