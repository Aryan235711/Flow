import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Info, RotateCcw } from 'lucide-react';
import { MetricEntry, UserConfig } from '../types.ts';

// TypedArray for zero-GC particle storage
type TypedParticleData = Float32Array;

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

// Particle Ring Canvas Component - Main Thread Optimized with TypedArray
  const ParticleRing: React.FC<{ theme: ReturnType<typeof getOrbTheme> }> = ({ theme }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const timeRef = useRef(0);
    const lastFrameTimeRef = useRef(0);
    const lastRenderTimestampRef = useRef(0);
    const velocityRef = useRef(0);
    const currentRadiusRef = useRef(0);
    const rotationRef = useRef(0);
    const lastPhaseRef = useRef<'contracting' | 'expanding'>('expanding');
    const shockwavesRef = useRef<Array<{ startTime: number; startRadius: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 240;
    const dpr = window.devicePixelRatio || 1;
    const hiddenScale = 0.5;
    const hiddenCanvasSize = Math.round(size * hiddenScale);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const hiddenCanvas = document.createElement('canvas');
    hiddenCanvas.width = hiddenCanvasSize;
    hiddenCanvas.height = hiddenCanvasSize;
    const hiddenCtx = hiddenCanvas.getContext('2d')!;


    // ALWAYS use main thread rendering (Web Worker has compatibility issues)
    // Safari claims to support OffscreenCanvas but transferControlToOffscreen() fails
    console.log('[VitalityOrb] Using main thread rendering with TypedArray optimization');
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = size;
    glowCanvas.height = size;
    const glowCtx = glowCanvas.getContext('2d')!;

    const hiddenGlowCanvas = document.createElement('canvas');
    hiddenGlowCanvas.width = hiddenCanvasSize;
    hiddenGlowCanvas.height = hiddenCanvasSize;
    const hiddenGlowCtx = hiddenGlowCanvas.getContext('2d')!;

    ctx.scale(dpr, dpr);

    const baseInnerRadius = 60;
    const baseOuterRadius = 105;
    const particleCount = 180;
    const springTension = 110;
    const springFriction = 12;
    const cycleDuration = 2.8;
    const desiredFPS = 45;
    const frameInterval = 1000 / desiredFPS;
    const hiddenFrameInterval = 1000 / 5;
    const rotationSpeed = 0.09;
    const maxShockwaves = 3;
    const glowBlur = 5;
    const glowOpacity = 0.35;
    const hiddenGlowBlur = 3;
    const hiddenGlowOpacity = 0.25;

    // TypedArray particle storage (zero GC even on main thread)
    const FLOATS_PER_PARTICLE = 6;
    const particles = new Float32Array(particleCount * FLOATS_PER_PARTICLE);

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      const offset = i * FLOATS_PER_PARTICLE;
      const angle = Math.random() * Math.PI * 2;
      const u1 = Math.random();
      const u2 = Math.random();
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const normalizedGaussian = Math.max(0, Math.min(1, (gaussian + 2) / 4));
      const baseRadius = baseInnerRadius + normalizedGaussian * (baseOuterRadius - baseInnerRadius);
      const opacity = 0.2 + Math.random() * 0.5;
      const particleSize = 0.8 + Math.random() * 1.0;
      const shimmerPhase = Math.random() * Math.PI * 2;
      const radiusRatio = (baseRadius - baseInnerRadius) / (baseOuterRadius - baseInnerRadius);

      particles[offset] = angle;
      particles[offset + 1] = baseRadius;
      particles[offset + 2] = opacity;
      particles[offset + 3] = particleSize;
      particles[offset + 4] = shimmerPhase;
      particles[offset + 5] = radiusRatio;
    }

    // Pre-render particle texture
    const offscreenParticle = document.createElement('canvas');
    const offscreenCtx = offscreenParticle.getContext('2d')!;
    const particleTextureSize = 20;
    offscreenParticle.width = particleTextureSize;
    offscreenParticle.height = particleTextureSize;
    const gradient = offscreenCtx.createRadialGradient(
      particleTextureSize / 2, particleTextureSize / 2, 0,
      particleTextureSize / 2, particleTextureSize / 2, particleTextureSize / 2
    );
    gradient.addColorStop(0, theme.primary);
    gradient.addColorStop(0.5, theme.secondary);
    gradient.addColorStop(1, 'transparent');
    offscreenCtx.fillStyle = gradient;
    offscreenCtx.fillRect(0, 0, particleTextureSize, particleTextureSize);

    // Main thread animation loop
    const animate = (currentTime: number) => {
      const deltaTime = lastFrameTimeRef.current === 0 ? 0.016 : (currentTime - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = currentTime;
      timeRef.current += deltaTime;
      rotationRef.current += deltaTime * rotationSpeed;

      const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const interval = isHidden ? hiddenFrameInterval : frameInterval;
      if (currentTime - lastRenderTimestampRef.current < interval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastRenderTimestampRef.current = currentTime;

      const drawCtx = isHidden ? hiddenCtx : ctx;
      const glowTargetCtx = isHidden ? hiddenGlowCtx : glowCtx;
      const glowSourceCanvas = isHidden ? hiddenGlowCanvas : glowCanvas;
      const drawSize = isHidden ? hiddenCanvasSize : size;
      const scale = drawSize / size;
      const centerX = drawSize / 2;
      const centerY = drawSize / 2;

      drawCtx.clearRect(0, 0, drawSize, drawSize);
      glowTargetCtx.clearRect(0, 0, drawSize, drawSize);
      drawCtx.globalCompositeOperation = 'lighter';
      glowTargetCtx.globalCompositeOperation = 'lighter';

      const cycleProgress = (timeRef.current % cycleDuration) / cycleDuration;
      const contractionPhase = 0.2;

      let targetRadius: number;
      let isContracting: boolean;

      if (cycleProgress < contractionPhase) {
        const snapProgress = cycleProgress / contractionPhase;
        const backEase = snapProgress * snapProgress * ((2.5 + 1) * snapProgress - 2.5);
        targetRadius = -12 * backEase;
        isContracting = true;
      } else {
        const driftProgress = (cycleProgress - contractionPhase) / (1 - contractionPhase);
        const driftEase = 1 - Math.pow(1 - driftProgress, 3);
        targetRadius = -12 + (12 * driftEase);
        isContracting = false;
      }

      const displacement = targetRadius - currentRadiusRef.current;
      const springForce = displacement * springTension;
      const dampingForce = -velocityRef.current * springFriction;
      const acceleration = (springForce + dampingForce) / 100;

      velocityRef.current += acceleration * deltaTime;
      currentRadiusRef.current += velocityRef.current * deltaTime;

      const pulseFactor = currentRadiusRef.current;
      const pulseIntensity = Math.abs(pulseFactor) / 12;

      const currentPhase: 'contracting' | 'expanding' = isContracting ? 'contracting' : 'expanding';
      if (!isHidden && lastPhaseRef.current === 'contracting' && currentPhase === 'expanding' && shockwavesRef.current.length < maxShockwaves) {
        shockwavesRef.current.push({
          startTime: timeRef.current,
          startRadius: baseInnerRadius + pulseFactor * 0.5
        });
      }
      lastPhaseRef.current = currentPhase;

      const globalBlur = isContracting ? 4 : 2.5;
      const opacityMultiplier = isContracting ? 1 + pulseIntensity * 0.25 : 1 - pulseIntensity * 0.1;

      if (!isHidden) {
        drawCtx.save();
        drawCtx.shadowBlur = 0;
        drawCtx.strokeStyle = theme.primary;
        drawCtx.globalAlpha = 1;

        shockwavesRef.current = shockwavesRef.current.filter(wave => {
          const elapsed = timeRef.current - wave.startTime;
          if (elapsed > 0.5) return false;

          const progress = elapsed / 0.5;
          const easeOut = 1 - Math.pow(1 - progress, 2);
          const waveRadius = (wave.startRadius + easeOut * (baseOuterRadius * 2 - wave.startRadius)) * scale;
          const waveOpacity = 0.3 * (1 - easeOut);

          drawCtx.globalAlpha = waveOpacity;
          drawCtx.lineWidth = 1.5;
          drawCtx.beginPath();
          drawCtx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
          drawCtx.stroke();

          return true;
        });
        drawCtx.restore();
      }

      for (let i = 0; i < particleCount; i++) {
        const offset = i * FLOATS_PER_PARTICLE;
        const angle = particles[offset];
        const baseRadius = particles[offset + 1];
        const opacity = particles[offset + 2];
        const particleSize = particles[offset + 3];
        const shimmerPhase = particles[offset + 4];
        const radiusRatio = particles[offset + 5];

        const currentAngle = angle + rotationRef.current;
        const lagFactor = isContracting ? radiusRatio * 0.5 : 0;
        const laggedPulse = pulseFactor * (1 - lagFactor);
        const shimmer = Math.cos(timeRef.current * 2.5 + shimmerPhase) * 1.5;
        const radius = (baseRadius + laggedPulse + shimmer) * scale;

        const x = centerX + Math.cos(currentAngle) * radius;
        const y = centerY + Math.sin(currentAngle) * radius;
        const renderSize = particleSize * 3 * scale;
        const drawAlpha = opacity * opacityMultiplier;

        drawCtx.globalAlpha = drawAlpha;
        drawCtx.drawImage(offscreenParticle, x - renderSize / 2, y - renderSize / 2, renderSize, renderSize);

        glowTargetCtx.globalAlpha = drawAlpha;
        glowTargetCtx.drawImage(offscreenParticle, x - renderSize / 2, y - renderSize / 2, renderSize, renderSize);
      }

      drawCtx.save();
      drawCtx.filter = `blur(${isHidden ? hiddenGlowBlur : glowBlur}px)`;
      drawCtx.globalAlpha = isHidden ? hiddenGlowOpacity : glowOpacity;
      drawCtx.drawImage(glowSourceCanvas, 0, 0, drawSize, drawSize);
      drawCtx.restore();
      drawCtx.globalCompositeOperation = 'source-over';
      glowTargetCtx.globalCompositeOperation = 'source-over';

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ filter: 'blur(0.5px)' }}
    />
  );
};

export const VitalityOrb: React.FC<VitalityOrbProps> = ({ history, config, userAge = 30 }) => {
  const vitality = useMemo(() => calculateVitality(history, config, userAge), [history, config, userAge]);
  const theme = getOrbTheme(vitality.agingFactor);
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const frontFaceRef = useRef<HTMLDivElement>(null);
  const backFaceRef = useRef<HTMLDivElement>(null);

  const inspectDOM = () => {
    if (!cardRef.current) return;
    
    const card = cardRef.current;
    const allFaces = card.querySelectorAll('.absolute.inset-0.backface-hidden');
    
    console.log('[VitalityOrb] === DOM INSPECTION ===');
    console.log('[VitalityOrb] Found', allFaces.length, 'faces');
    console.log('[VitalityOrb] Card transform:', window.getComputedStyle(card).transform);
    console.log('[VitalityOrb] Card transformStyle:', window.getComputedStyle(card).transformStyle);
    console.log('[VitalityOrb] Card perspective:', window.getComputedStyle(card.parentElement!).perspective);
    
    allFaces.forEach((face, index) => {
      const faceEl = face as HTMLElement;
      const style = window.getComputedStyle(faceEl);
      const isBack = faceEl.classList.contains('z-30');
      const label = isBack ? 'BACK' : 'FRONT';
      
      console.log(`[VitalityOrb] ${label} #${index} - visibility:`, style.visibility);
      console.log(`[VitalityOrb] ${label} #${index} - opacity:`, style.opacity);
      console.log(`[VitalityOrb] ${label} #${index} - display:`, style.display);
      console.log(`[VitalityOrb] ${label} #${index} - backfaceVisibility:`, style.backfaceVisibility);
      console.log(`[VitalityOrb] ${label} #${index} - transform:`, style.transform);
      console.log(`[VitalityOrb] ${label} #${index} - zIndex:`, style.zIndex);
      console.log(`[VitalityOrb] ${label} #${index} - background:`, style.background);
      console.log(`[VitalityOrb] ${label} #${index} - color:`, style.color);
      console.log(`[VitalityOrb] ${label} #${index} - innerText (trimmed):`, faceEl.textContent?.trim().slice(0, 120));
    });
    
    console.log('[VitalityOrb] === END INSPECTION ===');
  };

  const handleFlipToBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[VitalityOrb] Flip to BACK clicked');
    console.log('[VitalityOrb] Current state:', { isFlipped });
    setIsFlipped(true);
    console.log('[VitalityOrb] State updated to: true');
  };

  const handleFlipToFront = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[VitalityOrb] Flip to FRONT clicked');
    console.log('[VitalityOrb] Current state:', { isFlipped });
    setIsFlipped(false);
    console.log('[VitalityOrb] State updated to: false');
  };

  React.useEffect(() => {
    console.log('[VitalityOrb] isFlipped state changed:', isFlipped);
    console.log('[VitalityOrb] rotateY should be:', isFlipped ? 180 : 0);
    console.log('[VitalityOrb] front face node present:', !!frontFaceRef.current);
    console.log('[VitalityOrb] back face node present:', !!backFaceRef.current);
    // Delay inspection to allow CSS transition to complete
    setTimeout(inspectDOM, 700);
  }, [isFlipped]);

  React.useEffect(() => {
    if (!backFaceRef.current) return;
    console.log('[VitalityOrb] back face content snapshot:', backFaceRef.current.textContent?.trim().slice(0, 200));
  }, [isFlipped]);

  return (
    <div className="perspective-1000 w-full h-full min-h-[520px] relative">
      <div
        ref={cardRef}
        className="w-full h-full relative preserve-3d"
      >
        {/* FRONT FACE */}
        <div 
          ref={frontFaceRef}
          className="absolute inset-0 backface-hidden glass rounded-[40px] border border-white/5"
          style={{
            transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
            transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)'
          }}
        >
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
                onClick={handleFlipToBack}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/20 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <Info size={14} />
              </button>
            </div>

            {/* Orb Content */}
            <div className="flex-1 flex flex-col items-center justify-start px-6 py-4">
              {/* Luminous Particle Ring */}
              <div className="relative w-[280px] h-[280px] mb-4 mx-auto shrink-0">
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
                  <div className="text-[11px] font-bold text-white/60 uppercase tracking-widest mt-2">Bio Age</div>
                </div>
              </div>

              {/* Aging Factor Badge */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-3">
                <Activity size={16} className={theme.color} />
                <div className="flex flex-col items-start">
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Aging Rate</div>
                  <div className={`text-xl font-black font-outfit ${theme.color}`}>{vitality.agingFactor}x</div>
                </div>
              </div>

              {/* Status Label */}
              <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${theme.color} mb-2`}>
                {theme.label}
              </div>

              {/* Health Score */}
              <div className="text-xs text-white/30">
                Vitality Score: <span className="text-white/50 font-bold">{vitality.healthScore}/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* BACK FACE */}
        <div 
          ref={backFaceRef}
          className="absolute inset-0 backface-hidden glass rounded-[40px] border border-white/5 z-30"
          style={{
            transform: `rotateY(${isFlipped ? 0 : -180}deg)`,
            transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
            background: 'rgba(10, 17, 40, 0.95)'
          }}
        >
          <div className="w-full h-full flex flex-col overflow-hidden">
            {/* Back Header */}
            <div className="flex justify-between items-center p-5 pb-3 border-b border-white/5">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-teal-300 font-outfit">Algorithm Details</span>
              <button 
                onClick={handleFlipToFront}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Back Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-3">
              {/* Warning Banner */}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
