/**
 * FLOW APP - CENTRALIZED COLOR SYSTEM
 * Teal-centered medical wellness palette
 * Based on color psychology for health/biometric applications
 */

export const THEME = {
  // PRIMARY PALETTE - Teal/Cyan (Medical Trust + Vitality)
  primary: {
    gradient: 'from-teal-500 to-cyan-500',
    gradientHover: 'from-teal-400 to-cyan-400',
    solid: 'bg-teal-500',
    text: 'text-teal-400',
    textLight: 'text-teal-300',
    glow: 'shadow-teal-500/40',
    border: 'border-teal-500/30',
  },

  // SECONDARY - Emerald (Health, Vitality, Success)
  success: {
    gradient: 'from-emerald-500 to-teal-500',
    solid: 'bg-emerald-500',
    text: 'text-emerald-400',
    textLight: 'text-emerald-300',
    glow: 'shadow-emerald-500/40',
    border: 'border-emerald-500/30',
  },

  // WARNING - Amber (Attention, Energy)
  warning: {
    gradient: 'from-amber-400 to-orange-500',
    solid: 'bg-amber-500',
    text: 'text-amber-400',
    textLight: 'text-amber-300',
    glow: 'shadow-amber-500/40',
    border: 'border-amber-500/30',
  },

  // DANGER - Rose (Critical, Low Values)
  danger: {
    gradient: 'from-rose-500 to-pink-500',
    solid: 'bg-rose-500',
    text: 'text-rose-400',
    textLight: 'text-rose-300',
    glow: 'shadow-rose-500/40',
    border: 'border-rose-500/30',
  },

  // ACCENT - Indigo (AI/Advanced Tech Features ONLY)
  ai: {
    gradient: 'from-indigo-500 to-purple-500',
    solid: 'bg-indigo-500',
    text: 'text-indigo-400',
    textLight: 'text-indigo-300',
    glow: 'shadow-indigo-500/40',
    border: 'border-indigo-500/30',
  },

  // SYSTEM - Cyan (System-generated, Freeze states)
  system: {
    gradient: 'from-cyan-400 to-blue-400',
    solid: 'bg-cyan-500',
    text: 'text-cyan-400',
    textLight: 'text-cyan-300',
    glow: 'shadow-cyan-500/40',
  },

  // NEUTRAL - Slate/Gray (Cognitive states)
  neutral: {
    gradient: 'from-slate-500 to-gray-500',
    solid: 'bg-slate-500',
    text: 'text-slate-400',
    textLight: 'text-slate-300',
    glow: 'shadow-slate-500/40',
  },

  // BACKGROUNDS (Dark Slate Base)
  bg: {
    darkest: '#020617',      // Base, overlays, full screens
    dark: '#0a1128',         // Cards, toasts, elevated
    medium: '#0f172a',       // Surfaces, containers
  },

  // GLASS MORPHISM OPACITY SCALE (3 tiers)
  glass: {
    light: '80',    // Headers, subtle overlays
    medium: '90',   // Toasts, modals
    heavy: '95',    // Important surfaces
  },

  // BORDER OPACITY SCALE (3 tiers)
  border: {
    subtle: 'border-white/5',
    default: 'border-white/10',
    strong: 'border-white/20',
  },

  // TEXT OPACITY HIERARCHY (4 tiers)
  text: {
    primary: 'text-white',           // Main content
    secondary: 'text-white/70',      // Supporting text
    tertiary: 'text-white/40',       // Hints, placeholders
    disabled: 'text-white/20',       // Disabled states
  },

  // COGNITIVE STATE COLORS (for mental clarity tracking)
  cognitive: {
    peak: {
      gradient: 'from-teal-500 to-cyan-500',
      solid: 'bg-teal-500',
      text: 'text-teal-400',
      icon: 'Zap',
    },
    steady: {
      gradient: 'from-emerald-500 to-teal-500',
      solid: 'bg-emerald-500',
      text: 'text-emerald-400',
      icon: 'BrainCircuit',
    },
    foggy: {
      gradient: 'from-slate-500 to-gray-500',
      solid: 'bg-slate-500',
      text: 'text-slate-400',
      icon: 'CloudFog',
    },
    drained: {
      gradient: 'from-rose-500 to-pink-500',
      solid: 'bg-rose-500',
      text: 'text-rose-400',
      icon: 'BatteryWarning',
    },
    frozen: {
      gradient: 'from-cyan-400 to-blue-400',
      solid: 'bg-cyan-500',
      text: 'text-cyan-400',
      icon: 'Snowflake',
    },
  },

  // SCORE-BASED COLORS (for metrics visualization)
  score: {
    high: 'text-emerald-400',      // 80-100
    medium: 'text-teal-400',       // 50-79
    low: 'text-rose-400',          // 0-49
  },
} as const;

/**
 * USAGE EXAMPLES:
 * 
 * Primary button:
 * className={`bg-gradient-to-r ${THEME.primary.gradient} ${THEME.primary.glow}`}
 * 
 * Success text:
 * className={THEME.success.text}
 * 
 * Glass card:
 * className={`bg-[${THEME.bg.dark}]/${THEME.glass.medium} ${THEME.border.default}`}
 * 
 * AI feature badge:
 * className={`bg-gradient-to-r ${THEME.ai.gradient}`}
 */
