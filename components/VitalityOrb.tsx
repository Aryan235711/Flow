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
  // Edge case: No history data
  if (!history || history.length === 0) {
    return {
      biologicalAge: chronologicalAge,
      agingFactor: 1.0,
      healthScore: 50,
      breakdown: { sleep: 50, hrv: 50, cognitive: 50, symptoms: 50, consistency: 50, activity: 50, nutrition: 50 }
    };
  }

  const recentData = history.slice(-30).filter(e => e?.rawValues); // Filter out invalid entries
  
  // Edge case: No valid recent data
  if (recentData.length === 0) {
    return {
      biologicalAge: chronologicalAge,
      agingFactor: 1.0,
      healthScore: 50,
      breakdown: { sleep: 50, hrv: 50, cognitive: 50, symptoms: 50, consistency: 50, activity: 50, nutrition: 50 }
    };
  }

  // Helper function to safely calculate averages
  const safeAvg = (values: number[]) => {
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
    return validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;
  };

  // Helper to clamp values
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  // 1. SLEEP QUALITY (20%) - Optimal 7-8h
  const avgSleep = safeAvg(recentData.map(e => e.rawValues?.sleep || 0));
  let sleepScore = 50; // Default
  if (avgSleep === 0) sleepScore = 20; // No sleep data penalty
  else if (avgSleep < 4) sleepScore = 20; // Severe sleep deprivation
  else if (avgSleep < 6) sleepScore = 40 + (avgSleep / 6) * 40;
  else if (avgSleep >= 7 && avgSleep <= 8) sleepScore = 100;
  else if (avgSleep > 9) sleepScore = Math.max(30, 100 - ((avgSleep - 9) * 15));
  else sleepScore = 85 + ((8 - Math.abs(avgSleep - 7.5)) / 0.5) * 15;

  // 2. HRV RECOVERY (15%) - Higher is better
  const avgHRV = safeAvg(recentData.map(e => e.rawValues?.hrv || 0));
  const hrvTarget = config?.wearableBaselines?.hrv || 50;
  let hrvScore = 50;
  if (avgHRV > 0 && hrvTarget > 0) {
    hrvScore = clamp((avgHRV / hrvTarget) * 80 + 20, 0, 100);
  }

  // 3. COGNITIVE PERFORMANCE (20%)
  const cognitiveMap: Record<string, number> = { PEAK: 100, STEADY: 80, FOGGY: 50, DRAINED: 30, FROZEN: 10 };
  const avgCognitive = safeAvg(recentData.map(e => cognitiveMap[e.rawValues?.cognition] || 50));

  // 4. SYMPTOM SEVERITY (15%) - Lower is better
  const avgSymptoms = safeAvg(recentData.map(e => e.symptomScore || 0));
  const symptomScore = clamp(100 - (avgSymptoms * 10), 0, 100);

  // 5. CONSISTENCY (10%)
  const consistencyScore = clamp((recentData.length / 30) * 100, 0, 100);

  // 6. PHYSICAL ACTIVITY (10%)
  const activityMap: Record<string, number> = { INTENSE: 100, MODERATE: 80, LIGHT: 60, NONE: 20 };
  const avgActivity = safeAvg(recentData.map(e => activityMap[e.rawValues?.exercise] || 50));

  // 7. NUTRITION (10%)
  const proteinTarget = config?.manualTargets?.protein || 100;
  const avgProtein = safeAvg(recentData.map(e => e.rawValues?.protein || 0));
  const proteinScore = clamp((avgProtein / proteinTarget) * 100, 0, 100);
  
  const gutScore = clamp(safeAvg(recentData.map(e => e.rawValues?.gut || 0)) * 10, 0, 100);
  
  const sunMap: Record<string, number> = { ADEQUATE: 100, PARTIAL: 70, MINIMAL: 40, NONE: 10 };
  const avgSun = safeAvg(recentData.map(e => sunMap[e.rawValues?.sun] || 50));
  
  const nutritionScore = (proteinScore * 0.4 + gutScore * 0.3 + avgSun * 0.3);

  // WEIGHTED HEALTH SCORE (0-100)
  const healthScore = clamp(
    sleepScore * 0.20 +
    hrvScore * 0.15 +
    avgCognitive * 0.20 +
    symptomScore * 0.15 +
    consistencyScore * 0.10 +
    avgActivity * 0.10 +
    nutritionScore * 0.10,
    0, 100
  );

  // AGING FACTOR CALCULATION (0.6 = excellent, 1.5 = poor)
  const agingFactor = clamp(1.5 - (healthScore / 100) * 0.9, 0.6, 1.5);

  // BIOLOGICAL AGE ADJUSTMENT
  const ageAdjustment = (agingFactor - 1.0) * (recentData.length / 365) * chronologicalAge * 0.5;
  const biologicalAge = clamp(chronologicalAge + ageAdjustment, 18, chronologicalAge + 20);

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
    <div className="w-full h-full min-h-[280px] relative" style={{ perspective: '1000px' }}>
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* FRONT FACE */}
        <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
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
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
              {/* Hyperrealistic Orb */}
              <div className="relative w-44 h-44 mb-4">
                {/* Ambient Background Glow */}
                <div 
                  className="absolute inset-0 rounded-full blur-3xl opacity-30"
                  style={{ background: `radial-gradient(circle at 50% 50%, ${theme.gradient[0]}, transparent 70%)` }}
                />

                {/* Core Orb SVG */}
                <svg className="w-full h-full relative z-10" viewBox="0 0 200 200">
                  <defs>
                    {/* Main Sphere Gradient */}
                    <radialGradient id="sphereGradient" cx="35%" cy="35%">
                      <stop offset="0%" stopColor={theme.gradient[0]} stopOpacity="1" />
                      <stop offset="40%" stopColor={theme.gradient[1]} stopOpacity="0.9" />
                      <stop offset="70%" stopColor={theme.gradient[2]} stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
                    </radialGradient>

                    {/* Specular Highlight */}
                    <radialGradient id="specular" cx="30%" cy="30%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                      <stop offset="30%" stopColor="#ffffff" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </radialGradient>

                    {/* Fresnel Edge Lighting */}
                    <radialGradient id="fresnel" cx="50%" cy="50%">
                      <stop offset="0%" stopColor="transparent" stopOpacity="0" />
                      <stop offset="75%" stopColor="transparent" stopOpacity="0" />
                      <stop offset="90%" stopColor={theme.gradient[0]} stopOpacity="0.6" />
                      <stop offset="100%" stopColor={theme.gradient[1]} stopOpacity="0.9" />
                    </radialGradient>

                    {/* Soft Shadow */}
                    <radialGradient id="shadow" cx="50%" cy="80%">
                      <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="#000000" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>

                    {/* Professional Glow Filter */}
                    <filter id="professionalGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0" result="glow"/>
                      <feMerge>
                        <feMergeNode in="glow"/>
                        <feMergeNode in="glow"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Drop Shadow */}
                  <ellipse cx="100" cy="160" rx="50" ry="8" fill="url(#shadow)" opacity="0.5" />

                  {/* Main Sphere */}
                  <motion.circle
                    cx="100"
                    cy="100"
                    r="65"
                    fill="url(#sphereGradient)"
                    filter="url(#professionalGlow)"
                    animate={{ r: [65, 67, 65] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />

                  {/* Fresnel Rim Light */}
                  <circle cx="100" cy="100" r="65" fill="url(#fresnel)" opacity="0.7" />

                  {/* Specular Highlight */}
                  <ellipse cx="80" cy="75" rx="25" ry="30" fill="url(#specular)" opacity="0.6" />

                  {/* Subtle Energy Field Lines */}
                  {[...Array(3)].map((_, i) => (
                    <motion.circle
                      key={`ring-${i}`}
                      cx="100"
                      cy="100"
                      r={70 + i * 10}
                      fill="none"
                      stroke={theme.gradient[0]}
                      strokeWidth="0.5"
                      opacity="0.15"
                      animate={{ 
                        r: [70 + i * 10, 75 + i * 10, 70 + i * 10],
                        opacity: [0.1, 0.2, 0.1]
                      }}
                      transition={{ 
                        duration: 4 + i, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: i * 0.5
                      }}
                    />
                  ))}

                  {/* Floating Data Particles */}
                  {[...Array(6)].map((_, i) => {
                    const angle = (i / 6) * Math.PI * 2;
                    const radius = 80;
                    const baseX = 100 + Math.cos(angle) * radius;
                    const baseY = 100 + Math.sin(angle) * radius;
                    return (
                      <motion.g key={`particle-${i}`}>
                        <motion.circle
                          r="1.5"
                          fill={theme.gradient[0]}
                          opacity="0.7"
                          filter="url(#professionalGlow)"
                          animate={{
                            cx: [baseX, 100 + Math.cos(angle + 0.3) * (radius + 15), baseX],
                            cy: [baseY, 100 + Math.sin(angle + 0.3) * (radius + 15), baseY],
                            opacity: [0.4, 0.8, 0.4]
                          }}
                          transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.4
                          }}
                        />
                      </motion.g>
                    );
                  })}
                </svg>

                {/* Center Stats Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <motion.div 
                    className={`text-5xl font-black font-outfit tracking-tighter ${theme.color}`}
                    style={{ 
                      textShadow: `0 0 20px ${theme.glow}, 0 0 40px ${theme.glow}`,
                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                    }}
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {vitality.biologicalAge}
                  </motion.div>
                  <div className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">Bio Age</div>
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
              </div>
            </div>
          </div>
        </div>

        {/* BACK FACE */}
        <div 
          className="absolute inset-0" 
          style={{ 
            backfaceVisibility: 'hidden', 
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
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
