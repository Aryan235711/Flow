import React, { useMemo, useState, useCallback, memo, lazy, Suspense } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Moon, Activity, Sun, Sparkles, Database, Target, Zap, Flame, Disc, Snowflake, ScanLine, Fingerprint, RefreshCw, Calendar, Edit3, Plus, BrainCircuit, CloudFog, BatteryWarning, Coffee, Dumbbell } from 'lucide-react';
import { MetricEntry, UserConfig, Notification, UserProfile } from '../types.ts';
import { useFlowAI } from '../hooks/useFlowAI.ts';
import { Deferred } from './Deferred.tsx';
import { FlippableCard } from './FlippableCard.tsx';
import { PremiumGate } from './PremiumGate.tsx';
import { triggerHaptic, getLocalDate } from '../utils.ts';

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

const BioTargetCard = ({ value, target, unit, color, label }: { 
  value: number, target: number, unit: string, color: string, label: string 
}) => {
  const startAngle = -110;
  const endAngle = 110;
  const radius = 38;
  const cx = 50;
  const cy = 50;
  
  const progress = Math.min(1, value / target);
  const currentAngle = startAngle + (progress * (endAngle - startAngle));

  const getCoords = (angle: number) => {
    const a = (angle - 90) * (Math.PI / 180); 
    return {
      x: cx + radius * Math.cos(a),
      y: cy + radius * Math.sin(a)
    };
  };

  const start = getCoords(startAngle);
  const end = getCoords(endAngle);
  const current = getCoords(currentAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  const bgPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  
  const progressLargeArc = currentAngle - startAngle <= 180 ? "0" : "1";
  const progressPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${progressLargeArc} 1 ${current.x} ${current.y}`;

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-between py-1">
      <div className="relative w-32 h-32 flex items-center justify-center mt-1">
         <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
           <defs>
             <filter id="glow-arc" x="-50%" y="-50%" width="200%" height="200%">
               <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
               <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
               </feMerge>
             </filter>
           </defs>
           <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
           <motion.path 
             initial={{ pathLength: 0, opacity: 0 }}
             animate={{ pathLength: 1, opacity: 1 }}
             transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
             d={progressPath} 
             fill="none" 
             stroke="currentColor" 
             strokeWidth="10" 
             strokeLinecap="round" 
             className={color}
             style={{ filter: 'url(#glow-arc)' }}
           />
         </svg>
         
         <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
           <span className="text-4xl font-black font-outfit text-white tracking-tighter leading-none drop-shadow-2xl">
             {value}
           </span>
           <span className="text-[10px] font-bold text-white/40 mt-1">{unit}</span>
         </div>
      </div>

      <div className="flex flex-col items-center -mt-5 space-y-1.5 w-full">
        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/50">{label}</div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
           <Target size={10} className="text-indigo-300" />
           <span className="text-[10px] font-bold text-teal-200/80">Goal <span className="text-white">{target}</span></span>
        </div>
      </div>
    </div>
  );
};

const DailySnapshot = memo(({ entry, onLog }: { entry?: MetricEntry, onLog: () => void }) => {
  const isSystem = entry?.isSystemGenerated;
  
  const getTheme = (c?: string) => {
    if (isSystem) return { color: 'text-cyan-400', gradient: 'from-cyan-500/20 to-blue-600/20', icon: Snowflake };
    switch (c) {
      case 'PEAK': return { color: 'text-teal-400', gradient: 'from-teal-500/20 to-cyan-500/20', icon: Zap };
      case 'FOGGY': return { color: 'text-slate-400', gradient: 'from-slate-500/20 to-gray-500/20', icon: CloudFog };
      case 'DRAINED': return { color: 'text-rose-400', gradient: 'from-rose-500/20 to-orange-600/20', icon: BatteryWarning };
      default: return { color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-teal-500/20', icon: BrainCircuit };
    }
  };

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

  const theme = getTheme(entry.rawValues.cognition);
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
          <div className="grid grid-cols-4 gap-4 mb-8 relative z-10 border-t border-white/5 pt-8">
             <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/20">Sleep</span>
                <span className="text-2xl font-black font-outfit text-teal-200">{entry.rawValues.sleep.toFixed(1)}<span className="text-[10px] text-white/20 ml-0.5 align-top">h</span></span>
             </div>
             <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/20">HRV</span>
                <span className="text-2xl font-black font-outfit text-emerald-200">{entry.rawValues.hrv}<span className="text-[10px] text-white/20 ml-0.5 align-top">ms</span></span>
             </div>
             <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/20">RHR</span>
                <span className="text-2xl font-black font-outfit text-rose-200">{entry.rawValues.rhr}<span className="text-[10px] text-white/20 ml-0.5 align-top">bp</span></span>
             </div>
             <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/20">Prot</span>
                <span className="text-2xl font-black font-outfit text-amber-200">{entry.rawValues.protein}<span className="text-[10px] text-white/20 ml-0.5 align-top">g</span></span>
             </div>
          </div>

          {/* Footer Context Pills */}
          <div className="flex items-center gap-3 relative z-10">
             <div className="px-4 py-2 rounded-full bg-white/5 border border-white/5 flex items-center gap-2.5">
                <Sun size={12} className={entry.processedState.sun === 'GREEN' ? 'text-amber-400' : 'text-white/30'} />
                <span className="text-[10px] font-bold text-white/70 tracking-wide">{entry.rawValues.sun}</span>
             </div>
             <div className="px-4 py-2 rounded-full bg-white/5 border border-white/5 flex items-center gap-2.5">
                <Dumbbell size={12} className={entry.processedState.exercise === 'GREEN' ? 'text-emerald-400' : 'text-white/30'} />
                <span className="text-[10px] font-bold text-white/70 tracking-wide">{entry.rawValues.exercise}</span>
             </div>
             <div className="px-4 py-2 rounded-full bg-white/5 border border-white/5 flex items-center gap-2.5">
                <Coffee size={12} className={entry.processedState.gut === 'GREEN' ? 'text-teal-400' : 'text-white/30'} />
                <span className="text-[10px] font-bold text-white/70 tracking-wide">Gut {entry.rawValues.gut}</span>
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

  const latest = useMemo(() => history[history.length - 1], [history]);
  
  // Find today's entry
  const todayEntry = useMemo(() => {
    const todayStr = getLocalDate();
    return history.find(h => h.date === todayStr);
  }, [history]);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user.name ? user.name.split(' ')[0] : 'Traveler';
    if (hour < 12) return `Good Morning, ${firstName}.`;
    if (hour < 18) return `Good Afternoon, ${firstName}.`;
    return `Good Evening, ${firstName}.`;
  };

  const streak = useMemo(() => {
    if (!history || history.length === 0) return 0;
    try {
        const sorted = [...history]
            .filter(h => h.date && !isNaN(new Date(h.date).getTime()))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const uniqueDates = Array.from(new Set(sorted.map(h => h.date)));
        if (uniqueDates.length === 0) return 0;
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const lastEntryDate = uniqueDates[0];
        if (lastEntryDate !== today && lastEntryDate !== yesterday) return 0; 
        let currentStreak = 1;
        let currentTs = new Date(lastEntryDate).setUTCHours(12,0,0,0);
        for (let i = 1; i < uniqueDates.length; i++) {
            const prevTs = new Date(uniqueDates[i]).setUTCHours(12,0,0,0);
            if (Math.round((currentTs - prevTs) / 86400000) === 1) {
                currentStreak++;
                currentTs = prevTs;
            } else break;
        }
        return currentStreak;
    } catch (e) { return 0; }
  }, [history]);

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

  const chartData = useMemo(() => history.slice(-7).map(h => ({
      day: h.date.split('-')[2],
      protein: h.rawValues?.protein || 0,
      hrv: h.rawValues?.hrv || 0,
      exertion: h.processedState?.exercise === 'GREEN' ? 100 : h.processedState?.exercise === 'YELLOW' ? 60 : 20
  })), [history]);

  const driftData = useMemo(() => history.slice(-7).map(h => ({
    day: h.date.split('-')[2],
    value: h.rawValues?.cognition === 'PEAK' ? 100 : h.rawValues?.cognition === 'FOGGY' ? 40 : h.rawValues?.cognition === 'DRAINED' ? 15 : h.rawValues?.cognition === 'FROZEN' ? 5 : 75
  })), [history]);

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
    <motion.div variants={staggerChildren} initial="hidden" animate="show" className="px-5 pb-40 space-y-6 mt-20">
      
      {/* PERSONALIZED GREETING */}
      <motion.div variants={fadeUp} className="flex justify-between items-end mb-2">
         <div>
            <h3 className="text-2xl font-black font-outfit text-white leading-none tracking-tight">
               {getGreeting()}
            </h3>
            <p className="text-sm font-medium text-teal-300/40">Your biometrics are synced.</p>
         </div>
         {isMockData && (
          <div className="flex items-center gap-1.5 opacity-50 bg-white/5 px-2 py-1 rounded-lg">
             <Database size={10} className="text-teal-400" />
             <span className="text-[9px] font-black uppercase tracking-widest text-teal-400">Sim</span>
          </div>
        )}
      </motion.div>

      {/* 1. HERO CARD (Streak) */}
      <motion.div variants={fadeUp} className={`glass rounded-[48px] p-6 sm:p-8 relative overflow-hidden group border-t-2 ${dailyFocus.border || 'border-white/10'}`}>
        {/* Subtle Gradient wash that breathes */}
        <div className={`absolute inset-0 bg-gradient-to-br ${dailyFocus.color === 'text-emerald-400' ? 'from-emerald-900/10' : dailyFocus.color === 'text-rose-400' ? 'from-rose-900/10' : 'from-teal-900/10'} to-transparent opacity-50`} />
        
        {/* Scan line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[scan_6s_ease-in-out_infinite]" />
        <style>{`@keyframes scan { 0%,100% { transform: translateY(0); opacity: 0; } 50% { transform: translateY(200px); opacity: 1; } }`}</style>
        
        <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
          <div className="flex justify-between items-start gap-4 sm:gap-6">
            <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
                     <div className="flex items-center gap-2">
                        <Fingerprint size={14} className={`animate-pulse ${dailyFocus.color}`} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${dailyFocus.color} opacity-80`}>Protocol</span>
                     </div>
               <h2 className="text-3xl sm:text-4xl font-black font-outfit tracking-tighter leading-none text-white drop-shadow-lg">{dailyFocus.title}</h2>
               <p className="text-xs sm:text-sm font-bold text-white/50 leading-relaxed sm:leading-relaxed">{dailyFocus.desc}</p>
                </div>
            <div className="flex flex-col items-end shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[24px] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-md relative mb-3">
                <span className="text-2xl sm:text-3xl font-black font-outfit text-white">{streak}</span>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse shadow-[0_0_15px_#f59e0b]" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
                       <Snowflake size={10} className="text-cyan-400" />
                       <span className="text-[9px] font-black text-cyan-400 tracking-wider font-outfit">{config.streakLogic?.freezesAvailable ?? 2}/2</span>
                    </div>
                </div>
            </div>
        </div>
      </motion.div>

      {/* 2. TODAY'S SNAPSHOT (NEW) */}
      <motion.div variants={fadeUp}>
         <DailySnapshot entry={todayEntry} onLog={onLogToday} />
      </motion.div>

      {/* 3. BIOMETRIC ARRAY (Free) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Slightly tinted glass for biometric cards to distinguish from background */}
        <motion.div variants={fadeUp} className="glass rounded-[40px] p-4 border-white/5 relative overflow-hidden bg-teal-500/[0.02]">
          <BioTargetCard value={latest?.rawValues?.sleep || 0} target={config.wearableBaselines.sleep} unit="h" color="text-teal-400" label="Sleep Depth" />
        </motion.div>
        <motion.div variants={fadeUp} className="glass rounded-[40px] p-4 border-white/5 relative overflow-hidden bg-cyan-500/[0.02]">
          <BioTargetCard value={latest?.rawValues?.hrv || 0} target={config.wearableBaselines.hrv} unit="ms" color="text-cyan-400" label="Neural HRV" />
        </motion.div>
      </div>

      {/* 4. CORTEX UPLINK (PREMIUM GATE) */}
      <motion.div variants={fadeUp} className="relative group mt-4">
        <PremiumGate isPremium={user.isPremium} triggerPaywall={onTriggerPaywall} label="Neural Cortex" className="rounded-[32px]">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[34px] opacity-30 group-hover:opacity-60 blur transition duration-500" />
          <div className="glass rounded-[32px] p-1 relative bg-[#020617]">
            <div className="flex justify-between items-center p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Sparkles size={18} className={`text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <div className="text-[9px] font-black text-indigo-300/60 uppercase tracking-[0.2em] font-outfit">Cortex Uplink</div>
                  <div className="text-xs font-bold text-white">Neural Analysis Engine</div>
                </div>
              </div>
              
              {user.isPremium && (
                <button 
                  onClick={() => handleGenerateInsight(false)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-indigo-400 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ${isExpanded ? 'bg-white/10 text-white' : ''}`}
                >
                  {loading ? 'Scanning...' : hasGenerated ? (isExpanded ? 'Collapse' : 'View Insight') : 'Ping AI'} <ScanLine size={12} />
                </button>
              )}
            </div>
            
            {/* Conditional Content: Real UI or "Fake" Placeholder for Blur */}
            <AnimatePresence>
              {isExpanded ? (
                <motion.div 
                   initial={{ height: 0, opacity: 0 }} 
                   animate={{ height: 'auto', opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } }} 
                   exit={{ height: 0, opacity: 0 }} 
                   className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-0 space-y-3">
                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <p className="text-sm font-medium font-outfit text-indigo-100/90 leading-relaxed">{aiText}</p>
                    </div>
                    {hasGenerated && (
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Analysis based on recent logs</span>
                        <button onClick={() => handleGenerateInsight(true)} aria-label="Regenerate AI insight" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Regenerate</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : !user.isPremium ? (
                 // SIMULATED INSIGHT FOR BLUR
                 <div className="px-5 pb-5 pt-0 opacity-50">
                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                      <p className="text-sm font-medium font-outfit text-indigo-100/90 leading-relaxed blur-[3px]">
                        Metabolic indicators suggest a 15% increase in cognitive drift. Optimize protein intake to stabilize circadian rhythm output.
                      </p>
                    </div>
                 </div>
              ) : null}
            </AnimatePresence>
          </div>
        </PremiumGate>
      </motion.div>

      {/* 5. TELEMETRY DECK (PREMIUM GATE) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 px-2 opacity-60">
           <Disc size={12} className="text-emerald-400 animate-spin-slow" />
           <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Advanced Telemetry</span>
        </div>

        <motion.div variants={fadeUp} className="space-y-4">
          <div className="h-[280px] w-full">
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
          <div className="h-[240px] w-full">
            <PremiumGate isPremium={user.isPremium} triggerPaywall={onTriggerPaywall} label="Drift Analysis">
              <FlippableCard title="Cognitive Drift" icon={Zap} color="text-pink-400" backContent="Drift visualizes the stability of your subjective mental state over time.">
                {history.length >= 3 ? (
                  <div className="h-full w-full pb-4"><Deferred><Suspense fallback={<div/>}><CognitiveDriftChart data={driftData} /></Suspense></Deferred></div>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-3 opacity-40">
                    <Zap size={32} className="text-pink-400" />
                    <p className="text-xs text-white/50 text-center px-4">Need 3+ entries to analyze cognitive drift</p>
                  </div>
                )}
              </FlippableCard>
            </PremiumGate>
          </div>
          <div className="h-[400px] w-full">
            <PremiumGate isPremium={user.isPremium} triggerPaywall={onTriggerPaywall} label="Flow Heatmap">
              <FlippableCard title="Flow Persistence" icon={Calendar} color="text-cyan-400" backContent="The Heatmap displays your consistency density over the last 28 days.">
                {history.length >= 3 ? (
                  <div className="h-full w-full mt-2"><Deferred><Suspense fallback={<div/>}><ConsistencyHeatmap history={history} config={config} /></Suspense></Deferred></div>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-3 opacity-40">
                    <Calendar size={32} className="text-cyan-400" />
                    <p className="text-xs text-white/50 text-center px-4">Need 3+ entries to show consistency heatmap</p>
                  </div>
                )}
              </FlippableCard>
            </PremiumGate>
          </div>
          <div className="h-[300px] w-full">
             <PremiumGate isPremium={user.isPremium} triggerPaywall={onTriggerPaywall} label="Bio-Mesh">
                <FlippableCard title="Bio-Mesh Alignment" icon={Sun} color="text-amber-400" backContent="The Radar Mesh maps the symmetry of your current physiological state.">
                  <div className="h-full w-full"><Deferred><Suspense fallback={<div/>}><RadarMesh latest={latest} /></Suspense></Deferred></div>
                </FlippableCard>
             </PremiumGate>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
});