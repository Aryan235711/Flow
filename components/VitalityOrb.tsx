import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Info, RotateCcw } from 'lucide-react';
import { MetricEntry, UserConfig } from '../types.ts';

interface VitalityOrbProps {
  history: MetricEntry[];
  config: UserConfig;
  userAge?: number; // User's chronological age
}

interface VitalityMetrics {
  biologicalAge: number;
  agingFactor: number;
  healthScore: number; // 0-100
  breakdown: {
    sleep: number;
    hrv: number;
    cognitive: number;
    symptoms: number;
    consistency: number;
    activity: number;
    nutrition: number;
  };
}

const calculateVitality = (history: MetricEntry[], config: UserConfig, chronologicalAge: number = 30): VitalityMetrics => {
  if (history.length === 0) {
    return {
      biologicalAge: chronologicalAge,
      agingFactor: 1.0,
      healthScore: 50,
      breakdown: { sleep: 50, hrv: 50, cognitive: 50, symptoms: 50, consistency: 50, activity: 50, nutrition: 50 }
    };
  }

  const recentData = history.slice(-30); // Last 30 entries
  const latest = history[history.length - 1];

  // 1. SLEEP QUALITY (20%) - Optimal 7-8h
  const avgSleep = recentData.reduce((sum, e) => sum + (e.rawValues.sleep || 0), 0) / recentData.length;
  let sleepScore = 100;
  if (avgSleep < 6) sleepScore = 40 + (avgSleep / 6) * 40; // 40-80 for <6h
  else if (avgSleep > 9) sleepScore = 100 - ((avgSleep - 9) * 15); // Penalty for oversleeping
  else if (avgSleep >= 7 && avgSleep <= 8) sleepScore = 100; // Optimal
  else sleepScore = 85 + ((8 - Math.abs(avgSleep - 7.5)) / 0.5) * 15;

  // 2. HRV RECOVERY (15%) - Higher is better (normalize to target)
  const avgHRV = recentData.reduce((sum, e) => sum + (e.rawValues.hrv || 0), 0) / recentData.length;
  const hrvTarget = config.wearableBaselines.hrv;
  const hrvScore = Math.min(100, (avgHRV / hrvTarget) * 80 + 20); // 20-100

  // 3. COGNITIVE PERFORMANCE (20%)
  const cognitiveMap: Record<string, number> = { PEAK: 100, STEADY: 80, FOGGY: 50, DRAINED: 30, FROZEN: 10 };
  const avgCognitive = recentData.reduce((sum, e) => sum + (cognitiveMap[e.rawValues.cognition] || 50), 0) / recentData.length;

  // 4. SYMPTOM SEVERITY (15%) - Lower is better (0-10 scale, invert)
  const avgSymptoms = recentData.reduce((sum, e) => sum + (e.symptomScore || 0), 0) / recentData.length;
  const symptomScore = Math.max(0, 100 - (avgSymptoms * 10)); // 0=100pts, 10=0pts

  // 5. CONSISTENCY (10%) - Logging frequency & streak
  const consistencyScore = Math.min(100, (recentData.length / 30) * 100); // Max at 30 days

  // 6. PHYSICAL ACTIVITY (10%)
  const activityMap: Record<string, number> = { INTENSE: 100, MODERATE: 80, LIGHT: 60, NONE: 20 };
  const avgActivity = recentData.reduce((sum, e) => sum + (activityMap[e.rawValues.exercise] || 50), 0) / recentData.length;

  // 7. NUTRITION (10%) - Protein, gut, sun
  const proteinTarget = config.manualTargets.protein;
  const avgProtein = recentData.reduce((sum, e) => sum + (e.rawValues.protein || 0), 0) / recentData.length;
  const proteinScore = Math.min(100, (avgProtein / proteinTarget) * 100);
  
  const gutScore = recentData.reduce((sum, e) => sum + (e.rawValues.gut || 0), 0) / recentData.length * 10; // 0-10 scale
  
  const sunMap: Record<string, number> = { ADEQUATE: 100, PARTIAL: 70, MINIMAL: 40, NONE: 10 };
  const avgSun = recentData.reduce((sum, e) => sum + (sunMap[e.rawValues.sun] || 50), 0) / recentData.length;
  
  const nutritionScore = (proteinScore * 0.4 + gutScore * 0.3 + avgSun * 0.3);

  // WEIGHTED HEALTH SCORE (0-100)
  const healthScore = 
    sleepScore * 0.20 +
    hrvScore * 0.15 +
    avgCognitive * 0.20 +
    symptomScore * 0.15 +
    consistencyScore * 0.10 +
    avgActivity * 0.10 +
    nutritionScore * 0.10;

  // AGING FACTOR CALCULATION (0.6 = excellent, 1.5 = poor)
  // healthScore: 100 -> 0.6, 80 -> 0.85, 60 -> 1.0, 40 -> 1.2, 20 -> 1.4, 0 -> 1.5
  const agingFactor = Math.max(0.6, Math.min(1.5, 1.5 - (healthScore / 100) * 0.9));

  // BIOLOGICAL AGE ADJUSTMENT
  // Aging factor affects how fast you age: 0.8 = aging 20% slower
  // Over 30 days, adjust biological age based on deviation from 1.0
  const ageAdjustment = (agingFactor - 1.0) * (recentData.length / 365) * chronologicalAge * 0.5;
  const biologicalAge = Math.max(18, chronologicalAge + ageAdjustment);

  return {
    biologicalAge: Math.round(biologicalAge * 10) / 10,
    agingFactor: Math.round(agingFactor * 100) / 100,
    healthScore: Math.round(healthScore),
    breakdown: {
      sleep: Math.round(sleepScore),
      hrv: Math.round(hrvScore),
      cognitive: Math.round(avgCognitive),
      symptoms: Math.round(symptomScore),
      consistency: Math.round(consistencyScore),
      activity: Math.round(avgActivity),
      nutrition: Math.round(nutritionScore)
    }
  };
};

const getOrbTheme = (agingFactor: number) => {
  if (agingFactor <= 0.85) return {
    gradient: ['#14b8a6', '#06b6d4', '#10b981'], // teal/cyan/emerald
    glow: 'rgba(20, 184, 166, 0.4)',
    label: 'EXCEPTIONAL',
    color: 'text-emerald-400'
  };
  if (agingFactor <= 1.0) return {
    gradient: ['#06b6d4', '#3b82f6', '#14b8a6'], // cyan/blue/teal
    glow: 'rgba(6, 182, 212, 0.3)',
    label: 'OPTIMAL',
    color: 'text-cyan-400'
  };
  if (agingFactor <= 1.2) return {
    gradient: ['#f59e0b', '#f97316', '#eab308'], // amber/orange/yellow
    glow: 'rgba(245, 158, 11, 0.3)',
    label: 'DECLINING',
    color: 'text-amber-400'
  };
  return {
    gradient: ['#f43f5e', '#ef4444', '#dc2626'], // rose/red
    glow: 'rgba(244, 63, 94, 0.4)',
    label: 'CRITICAL',
    color: 'text-rose-400'
  };
};

export const VitalityOrb: React.FC<VitalityOrbProps> = ({ history, config, userAge = 30 }) => {
  const vitality = useMemo(() => calculateVitality(history, config, userAge), [history, config, userAge]);
  const theme = getOrbTheme(vitality.agingFactor);
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="perspective-1000 w-full h-full min-h-[280px] relative">
      <motion.div
        className="w-full h-full relative preserve-3d"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* FRONT FACE */}
        <div className="absolute inset-0 backface-hidden">
          <div className="w-full h-full flex flex-col">
            {/* Header with flip button */}
            <div className="flex justify-between items-center px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/5 text-teal-400 backdrop-blur-md">
                  <Activity size={14} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 font-outfit">Vitality</span>
              </div>
              <button 
                onClick={() => setIsFlipped(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <Info size={14} />
              </button>
            </div>

            {/* Orb Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">{/* Animated Orb */}
      <div className="relative w-40 h-40 mb-4">
        {/* Outer Glow Rings */}
        <motion.div
          className="absolute inset-0 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${theme.glow}, transparent 70%)` }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${theme.glow}, transparent 60%)` }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />

        {/* Core Orb */}
        <svg className="w-full h-full" viewBox="0 0 200 200">
          <defs>
            <radialGradient id="orbGradient">
              <stop offset="0%" stopColor={theme.gradient[0]} stopOpacity="0.9" />
              <stop offset="50%" stopColor={theme.gradient[1]} stopOpacity="0.7" />
              <stop offset="100%" stopColor={theme.gradient[2]} stopOpacity="0.3" />
            </radialGradient>
            <filter id="orbGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <motion.circle
            cx="100"
            cy="100"
            r="70"
            fill="url(#orbGradient)"
            filter="url(#orbGlow)"
            animate={{ r: [70, 75, 70] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Energy Particles */}
          {[...Array(8)].map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const baseX = 100 + Math.cos(angle) * 60;
            const baseY = 100 + Math.sin(angle) * 60;
            return (
              <motion.circle
                key={i}
                r="2"
                fill={theme.gradient[0]}
                opacity="0.6"
                animate={{
                  cx: [baseX, 100 + Math.cos(angle) * 80, baseX],
                  cy: [baseY, 100 + Math.sin(angle) * 80, baseY],
                  opacity: [0.6, 0.9, 0.6]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2
                }}
              />
            );
          })}
        </svg>

        {/* Center Stats */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-4xl font-black font-outfit tracking-tighter ${theme.color}`}>
            {vitality.biologicalAge}
          </div>
          <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Bio Age</div>
        </div>
      </div>

      {/* Aging Factor Badge */}
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-2">
        <Activity size={14} className={theme.color} />
        <div className="flex flex-col items-start">
          <div className="text-[8px] font-bold text-white/40 uppercase tracking-wider">Aging Rate</div>
          <div className={`text-lg font-black font-outfit ${theme.color}`}>{vitality.agingFactor}x</div>
        </div>
      </div>

      {/* Status Label */}
      <div className={`text-[9px] font-black uppercase tracking-[0.25em] ${theme.color}`}>
        {theme.label}
      </div>

      {/* Health Score */}
      <div className="text-xs text-white/30 mt-2">
        Vitality Score: <span className="text-white/50 font-bold">{vitality.healthScore}/100</span>
      </div></div>
          </div>
        </div>

        {/* BACK FACE */}
        <div className="absolute inset-0 backface-hidden" style={{ transform: 'rotateY(180deg)' }}>
          <div className="w-full h-full glass rounded-[32px] flex flex-col overflow-hidden border border-white/5">
            {/* Back Header */}
            <div className="flex justify-between items-center p-5 pb-3 border-b border-white/5">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-teal-300 font-outfit">Algorithm Details</span>
              <button 
                onClick={() => setIsFlipped(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Back Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-3">{/* Warning Banner */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <div className="text-[10px] leading-relaxed text-amber-200/80">
          <span className="font-bold block mb-1">Medical Disclaimer</span>
          This is a <span className="font-bold">theoretical estimation</span> based solely on self-reported metrics. 
          Not a medical diagnosis. Consult healthcare professionals for health decisions.
        </div>
      </div>

      {/* How It Works */}
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-teal-300">Vitality Algorithm</h3>
        <div className="text-[10px] leading-relaxed text-white/50">
          Biological age and aging rate are calculated using a weighted formula across 7 health dimensions:
        </div>

        <div className="space-y-1.5 pl-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/40">Sleep Quality (20%)</span>
            <span className="text-[9px] font-bold text-teal-400">{vitality.breakdown.sleep}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/40">HRV Recovery (15%)</span>
            <span className="text-[9px] font-bold text-cyan-400">{vitality.breakdown.hrv}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/40">Cognitive State (20%)</span>
            <span className="text-[9px] font-bold text-teal-400">{vitality.breakdown.cognitive}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/40">Symptom Control (15%)</span>
            <span className="text-[9px] font-bold text-emerald-400">{vitality.breakdown.symptoms}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/40">Logging Consistency (10%)</span>
            <span className="text-[9px] font-bold text-cyan-400">{vitality.breakdown.consistency}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/40">Physical Activity (10%)</span>
            <span className="text-[9px] font-bold text-teal-400">{vitality.breakdown.activity}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/40">Nutrition Quality (10%)</span>
            <span className="text-[9px] font-bold text-emerald-400">{vitality.breakdown.nutrition}%</span>
          </div>
        </div>
      </div>

      {/* Interpretation */}
      <div className="space-y-1 pt-2 border-t border-white/5">
        <div className="text-[10px] leading-relaxed text-white/50">
          <span className="font-bold text-white/70">Aging Factor:</span> {vitality.agingFactor < 1 ? 'You are aging slower than average' : vitality.agingFactor > 1 ? 'You are aging faster than average' : 'You are aging at a normal rate'}.
          A factor of <span className="font-bold text-teal-400">{vitality.agingFactor}x</span> suggests your biological systems are {vitality.agingFactor < 0.9 ? 'highly optimized' : vitality.agingFactor > 1.1 ? 'under significant stress' : 'functioning normally'}.
        </div>
      </div></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
