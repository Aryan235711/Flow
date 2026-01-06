import React, { useMemo, useState, useEffect, useRef } from 'react';
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
    primary: '#14b8a6', // teal
    secondary: '#10b981', // emerald
    glow: 'rgba(20, 184, 166, 0.6)',
    label: 'EXCEPTIONAL',
    color: 'text-emerald-400'
  };
  if (agingFactor <= 1.0) return {
    primary: '#06b6d4', // cyan
    secondary: '#3b82f6', // blue
    glow: 'rgba(6, 182, 212, 0.5)',
    label: 'OPTIMAL',
    color: 'text-cyan-400'
  };
  if (agingFactor <= 1.2) return {
    primary: '#f59e0b', // amber
    secondary: '#f97316', // orange
    glow: 'rgba(245, 158, 11, 0.5)',
    label: 'DECLINING',
    color: 'text-amber-400'
  };
  return {
    primary: '#f43f5e', // rose
    secondary: '#ef4444', // red
    glow: 'rgba(244, 63, 94, 0.6)',
    label: 'CRITICAL',
    color: 'text-rose-400'
  };
};

// Particle Ring Canvas Component
const ParticleRing: React.FC<{ theme: ReturnType<typeof getOrbTheme> }> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const rotationRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const baseInnerRadius = 60;
    const baseOuterRadius = 105;
    const particleCount = 900;

    // Easing function for asymmetric pulse (cubic-bezier approximation)
    const easeInOutCustom = (t: number) => {
      if (t < 0.5) {
        // Contraction phase - faster (ease-in)
        return 4 * t * t * t;
      } else {
        // Expansion phase - slower (ease-out with overshoot)
        const t2 = t - 1;
        return 1 + 4 * t2 * t2 * t2;
      }
    };

    // Generate particles with individual shimmer offsets
    const particles: Array<{ 
      angle: number; 
      baseRadius: number; 
      opacity: number; 
      size: number;
      shimmerPhase: number;
      radiusRatio: number; // 0-1, how far out in the ring (for velocity lag)
    }> = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      
      // More uniform distribution across ring thickness with slight center bias
      const u1 = Math.random();
      const u2 = Math.random();
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const normalizedGaussian = Math.max(0, Math.min(1, (gaussian + 2) / 4));
      const baseRadius = baseInnerRadius + normalizedGaussian * (baseOuterRadius - baseInnerRadius);
      
      const opacity = 0.2 + Math.random() * 0.5;
      const size = 0.8 + Math.random() * 1.0;
      const shimmerPhase = Math.random() * Math.PI * 2; // Random phase offset for shimmer
      const radiusRatio = (baseRadius - baseInnerRadius) / (baseOuterRadius - baseInnerRadius);
      
      particles.push({ angle, baseRadius, opacity, size, shimmerPhase, radiusRatio });
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      
      // Time progression (60fps = ~0.016s per frame)
      timeRef.current += 0.016;
      
      // Biomimetic pulse calculation (4 second cycle = 0.25 Hz)
      const pulseFrequency = 0.25; // Hz
      const pulseAmplitude = 12; // pixels
      const rawPulse = Math.sin(2 * Math.PI * pulseFrequency * timeRef.current);
      const normalizedTime = (rawPulse + 1) / 2; // 0 to 1
      const easedPulse = easeInOutCustom(normalizedTime);
      const pulseFactor = (easedPulse - 0.5) * 2; // -1 to 1
      
      // Phase detection: contraction (negative) vs expansion (positive)
      const isContracting = pulseFactor < 0;
      const pulseIntensity = Math.abs(pulseFactor);
      
      // Dynamic ring dimensions
      const currentInnerRadius = baseInnerRadius + pulseFactor * pulseAmplitude * 0.5;
      const currentOuterRadius = baseOuterRadius + pulseFactor * pulseAmplitude;
      
      // Density fluctuation: intensity during contraction, ethereal during expansion
      const globalBlur = isContracting ? 4 + pulseIntensity * 2 : 3;
      const opacityMultiplier = isContracting ? 1 + pulseIntensity * 0.3 : 1 - pulseIntensity * 0.2;
      
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowBlur = globalBlur;
      ctx.shadowColor = theme.glow;

      // Slow rotation
      rotationRef.current += 0.0015;

      // Draw particles with elasticity and shimmer
      particles.forEach(p => {
        const currentAngle = p.angle + rotationRef.current;
        
        // Velocity lag: outer particles lag during contraction
        const lagFactor = isContracting ? p.radiusRatio * 0.3 : 0;
        const laggedPulse = pulseFactor * (1 - lagFactor);
        
        // Individual shimmer using cosine wave
        const shimmer = Math.cos(timeRef.current * 2 + p.shimmerPhase) * 2;
        
        // Calculate current radius with pulse, lag, and shimmer
        const radius = p.baseRadius + laggedPulse * pulseAmplitude + shimmer;
        
        const x = centerX + Math.cos(currentAngle) * radius;
        const y = centerY + Math.sin(currentAngle) * radius;

        // Radial gradient for sparkle effect
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size * 2);
        gradient.addColorStop(0, theme.primary);
        gradient.addColorStop(0.5, theme.secondary);
        gradient.addColorStop(1, 'transparent');

        // Apply density-based opacity
        ctx.globalAlpha = p.opacity * opacityMultiplier;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, p.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 m-auto"
      style={{ filter: 'blur(0.5px)' }}
    />
  );
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
              {/* Luminous Particle Ring */}
              <div className="relative w-[300px] h-[300px] mb-4 flex items-center justify-center">
                {/* Ambient Background Glow */}
                <div 
                  className="absolute inset-0 rounded-full blur-3xl opacity-40"
                  style={{ background: `radial-gradient(circle at 50% 50%, ${theme.primary}, transparent 70%)` }}
                />

                {/* Canvas Particle Ring */}
                <ParticleRing theme={theme} />

                {/* Center Stats Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                  <motion.div 
                    className={`text-5xl font-black font-outfit tracking-tighter ${theme.color}`}
                    style={{ 
                      textShadow: `0 0 20px ${theme.glow}, 0 0 40px ${theme.glow}`,
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.8))'
                    }}
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {vitality.biologicalAge}
                  </motion.div>
                  <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">Bio Age</div>
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
