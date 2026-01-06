// Particle Ring Web Worker - Offloads math from Main Thread
// This runs on a separate CPU thread, keeping the browser UI responsive

interface ParticleData {
  angle: number;
  baseRadius: number;
  opacity: number;
  size: number;
  shimmerPhase: number;
  radiusRatio: number;
}

interface WorkerMessage {
  type: 'init' | 'animate' | 'pause' | 'resume';
  payload?: {
    particleCount?: number;
    baseInnerRadius?: number;
    baseOuterRadius?: number;
    canvas?: OffscreenCanvas;
    theme?: {
      primary: string;
      secondary: string;
      glow: string;
    };
  };
}

// Particle data stored in TypedArray for zero-GC performance
let particleData: Float32Array;
let particleCount = 0;
const FLOATS_PER_PARTICLE = 6; // angle, baseRadius, opacity, size, shimmerPhase, radiusRatio

// Animation state
let rotation = 0;
let time = 0;
let lastFrameTime = 0;
let velocity = 0;
let currentRadius = 0;
let lastPhase: 'contracting' | 'expanding' = 'expanding';
let shockwaves: Array<{ startTime: number; startRadius: number }> = [];
let isPaused = false;
let animationId: number | null = null;

// Canvas context
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let offscreenParticle: OffscreenCanvas | null = null;
let theme = { primary: '#14b8a6', secondary: '#10b981', glow: 'rgba(20, 184, 166, 0.6)' };

const springTension = 120;
const springFriction = 14;
const cycleDuration = 2.8;

function initParticles(count: number, baseInnerRadius: number, baseOuterRadius: number) {
  particleCount = count;
  particleData = new Float32Array(count * FLOATS_PER_PARTICLE);

  for (let i = 0; i < count; i++) {
    const offset = i * FLOATS_PER_PARTICLE;
    const angle = Math.random() * Math.PI * 2;
    
    const u1 = Math.random();
    const u2 = Math.random();
    const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const normalizedGaussian = Math.max(0, Math.min(1, (gaussian + 2) / 4));
    const baseRadius = baseInnerRadius + normalizedGaussian * (baseOuterRadius - baseInnerRadius);
    
    const opacity = 0.2 + Math.random() * 0.5;
    const size = 0.8 + Math.random() * 1.0;
    const shimmerPhase = Math.random() * Math.PI * 2;
    const radiusRatio = (baseRadius - baseInnerRadius) / (baseOuterRadius - baseInnerRadius);
    
    particleData[offset] = angle;
    particleData[offset + 1] = baseRadius;
    particleData[offset + 2] = opacity;
    particleData[offset + 3] = size;
    particleData[offset + 4] = shimmerPhase;
    particleData[offset + 5] = radiusRatio;
  }
}

function createParticleTexture() {
  if (!offscreenParticle) {
    offscreenParticle = new OffscreenCanvas(20, 20);
    const offCtx = offscreenParticle.getContext('2d')!;
    
    const gradient = offCtx.createRadialGradient(10, 10, 0, 10, 10, 10);
    gradient.addColorStop(0, theme.primary);
    gradient.addColorStop(0.5, theme.secondary);
    gradient.addColorStop(1, 'transparent');
    offCtx.fillStyle = gradient;
    offCtx.fillRect(0, 0, 20, 20);
  }
}

function animate(currentTime: number) {
  if (isPaused || !ctx) {
    return;
  }

  const deltaTime = lastFrameTime === 0 ? 0.016 : (currentTime - lastFrameTime) / 1000;
  lastFrameTime = currentTime;
  time += deltaTime;
  
  const size = ctx.canvas.width;
  const centerX = size / 2;
  const centerY = size / 2;
  const baseInnerRadius = 60;
  const baseOuterRadius = 105;
  
  ctx.clearRect(0, 0, size, size);
  
  // 20/80 rule spring physics
  const cycleProgress = (time % cycleDuration) / cycleDuration;
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
  
  const displacement = targetRadius - currentRadius;
  const springForce = displacement * springTension;
  const dampingForce = -velocity * springFriction;
  const acceleration = (springForce + dampingForce) / 100;
  
  velocity += acceleration * deltaTime;
  currentRadius += velocity * deltaTime;
  
  const pulseFactor = currentRadius;
  const pulseIntensity = Math.abs(pulseFactor) / 12;
  
  // Detect peak and trigger shockwave
  const currentPhase: 'contracting' | 'expanding' = isContracting ? 'contracting' : 'expanding';
  if (lastPhase === 'contracting' && currentPhase === 'expanding') {
    shockwaves.push({ startTime: time, startRadius: baseInnerRadius + pulseFactor * 0.5 });
  }
  lastPhase = currentPhase;
  
  const globalBlur = isContracting ? 4 + pulseIntensity * 3 : 3;
  const opacityMultiplier = isContracting ? 1 + pulseIntensity * 0.4 : 1 - pulseIntensity * 0.15;
  
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowBlur = globalBlur;
  ctx.shadowColor = theme.glow;

  rotation += 0.0015;

  // Draw shockwaves
  ctx.save();
  ctx.shadowBlur = 0;
  
  shockwaves = shockwaves.filter(wave => {
    const elapsed = time - wave.startTime;
    if (elapsed > 0.5) return false;
    
    const progress = elapsed / 0.5;
    const easeOut = 1 - Math.pow(1 - progress, 2);
    const waveRadius = wave.startRadius + easeOut * (baseOuterRadius * 2 - wave.startRadius);
    const waveOpacity = 0.3 * (1 - easeOut);
    
    ctx.strokeStyle = theme.primary;
    ctx.globalAlpha = waveOpacity;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    return true;
  });
  
  ctx.restore();

  // Draw particles from TypedArray (zero object allocation)
  ctx.shadowBlur = globalBlur;
  ctx.shadowColor = theme.glow;
  
  for (let i = 0; i < particleCount; i++) {
    const offset = i * FLOATS_PER_PARTICLE;
    const angle = particleData[offset];
    const baseRadius = particleData[offset + 1];
    const opacity = particleData[offset + 2];
    const size = particleData[offset + 3];
    const shimmerPhase = particleData[offset + 4];
    const radiusRatio = particleData[offset + 5];
    
    const currentAngle = angle + rotation;
    const lagFactor = isContracting ? radiusRatio * 0.5 : 0;
    const laggedPulse = pulseFactor * (1 - lagFactor);
    const shimmer = Math.cos(time * 2.5 + shimmerPhase) * 1.5;
    const radius = baseRadius + laggedPulse + shimmer;
    
    const x = centerX + Math.cos(currentAngle) * radius;
    const y = centerY + Math.sin(currentAngle) * radius;

    ctx.globalAlpha = opacity * opacityMultiplier;
    const renderSize = size * 3;
    
    if (offscreenParticle) {
      ctx.drawImage(offscreenParticle, x - renderSize / 2, y - renderSize / 2, renderSize, renderSize);
    }
  }

  animationId = requestAnimationFrame(animate);
}

// Worker message handler
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'init':
      if (payload?.canvas && payload?.theme) {
        ctx = payload.canvas.getContext('2d');
        theme = payload.theme;
        
        if (ctx) {
          const size = 300;
          ctx.canvas.width = size;
          ctx.canvas.height = size;
          
          initParticles(
            payload.particleCount || 900,
            payload.baseInnerRadius || 60,
            payload.baseOuterRadius || 105
          );
          
          createParticleTexture();
          isPaused = false;
          animationId = requestAnimationFrame(animate);
        }
      }
      break;

    case 'pause':
      isPaused = true;
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      break;

    case 'resume':
      if (isPaused && ctx) {
        isPaused = false;
        lastFrameTime = 0;
        animationId = requestAnimationFrame(animate);
      }
      break;
  }
};
