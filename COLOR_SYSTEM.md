# Flow App - Centralized Color System

**Implementation Date:** January 6, 2026  
**Palette Type:** Teal-Centered Medical Wellness Theme  
**Color Psychology:** Health/Biometric Tracking Optimized

---

## 🎨 Core Philosophy

Flow uses a **teal-centered palette** based on color psychology for health and wellness applications:

- **Teal/Cyan**: Medical trust + natural vitality (PRIMARY)
- **Emerald**: Success, health, growth (SECONDARY)
- **Amber**: Premium features, energy (WARNING)
- **Rose**: Critical states, low values (DANGER)
- **Indigo**: AI/Advanced tech features ONLY (ACCENT)

This palette aligns with industry standards (Apple Health, MyFitnessPal, Calm, Headspace) and communicates credibility for medical-grade biometric tracking.

---

## 📋 Color Reference

### Primary Palette (Teal → Cyan)
```
Gradient: from-teal-500 to-cyan-500
Text: text-teal-400
Light Text: text-teal-300
Glow: shadow-teal-500/40
Border: border-teal-500/30
```

**Usage:**
- Bottom navigation active states
- Primary buttons and CTAs
- Active indicators and progress bars
- Sleep metrics and focus states
- Avatar backgrounds
- Header branding

### Secondary (Emerald - Success)
```
Gradient: from-emerald-500 to-teal-500
Text: text-emerald-400
Solid: bg-emerald-500
```

**Usage:**
- Success states (score >= 80)
- Health metrics in optimal range
- HRV vitals display
- Exercise/activity indicators
- Positive cognitive states (STEADY)

### Warning (Amber - Premium)
```
Gradient: from-amber-400 to-orange-500
Text: text-amber-400
Solid: bg-amber-500
```

**Usage:**
- Premium/Pro badges
- Paywall screens
- Streak freeze indicators
- Mid-range warning states
- Protein/nutrition metrics

### Danger (Rose - Critical)
```
Gradient: from-rose-500 to-pink-500
Text: text-rose-400
Solid: bg-rose-500
```

**Usage:**
- Low scores (< 50)
- Critical states (DRAINED cognitive)
- Delete actions
- RHR (heart rate) vitals
- Error states

### Accent (Indigo - AI Only)
```
Gradient: from-indigo-500 to-purple-500
Text: text-indigo-400
Solid: bg-indigo-500
```

**Usage:** 
- Neural Cortex AI features ONLY
- AI-generated insights
- AI notification badges
- Gemini integration UI
- Advanced tech feature labels

### System (Cyan - Generated)
```
Text: text-cyan-400
Solid: bg-cyan-500
```

**Usage:**
- System-generated entries (freeze/cryostasis)
- Automated states
- Preservation mode indicators

### Neutral (Slate - Cognitive Fog)
```
Text: text-slate-400
Solid: bg-slate-500
```

**Usage:**
- FOGGY cognitive state
- Disabled states
- Neutral indicators

---

## 🏗️ Standardized Scales

### Background Hierarchy
```
Darkest:  #020617  (base, overlays, full screens)
Dark:     #0a1128  (cards, toasts, elevated surfaces)
Medium:   #0f172a  (containers, surfaces)
```

### Glass Morphism Opacity (3-tier)
```
Light:  /80  (headers, subtle overlays)
Medium: /90  (toasts, modals)
Heavy:  /95  (important surfaces)
```

### Border Opacity (3-tier)
```
Subtle:  border-white/5   (cards, dividers)
Default: border-white/10  (buttons, inputs)
Strong:  border-white/20  (emphasis, active)
```

### Text Opacity (4-tier)
```
Primary:   text-white      (main content, headings)
Secondary: text-white/70   (supporting text, labels)
Tertiary:  text-white/40   (hints, placeholders)
Disabled:  text-white/20   (inactive states)
```

---

## 🎯 Cognitive State Mapping

```javascript
PEAK:    Teal → Cyan     (optimal performance)
STEADY:  Emerald → Teal  (balanced state)
FOGGY:   Slate → Gray    (clarity issues)
DRAINED: Rose → Pink     (energy depletion)
FROZEN:  Cyan → Blue     (system preservation)
```

---

## 📊 Score-Based Colors

```
High (80-100):   text-emerald-400  ✅ Optimal
Medium (50-79):  text-teal-400     ⚡ Good
Low (0-49):      text-rose-400     ⚠️ Needs attention
```

---

## 🔧 Implementation

All colors are centralized in `/theme.ts`:

```typescript
import { THEME } from './theme.ts';

// Primary button
className={`bg-gradient-to-r ${THEME.primary.gradient}`}

// Success text
className={THEME.success.text}

// Glass card
className={`bg-[${THEME.bg.dark}]/${THEME.glass.medium}`}
```

---

## ✅ Updated Components

**Core:**
- ✅ `index.tsx` (AUTH screen, bottom nav)
- ✅ `Header.tsx`
- ✅ `BackgroundOrbs.tsx`

**Views:**
- ✅ `Dashboard.tsx` (all cards, vitals, AI Cortex)
- ✅ `HistoryView.tsx`
- ✅ `GoalSettings.tsx`

**UI Components:**
- ✅ `Toast.tsx`
- ✅ `PremiumGate.tsx` (kept amber for premium)
- ✅ `Paywall.tsx` (kept amber for premium)

**Charts:**
- ✅ `CognitiveDriftChart.tsx`
- ✅ `ConsistencyHeatmap.tsx`
- ✅ `RadarMesh.tsx`
- ✅ `VelocityChart.tsx`

**Excluded:** Onboarding screens (per user request)

---

## 🎨 Color Psychology Rationale

### Why Teal (Not Indigo-Fuchsia)?

**Indigo + Fuchsia Issues:**
- ❌ Feels like tech startup/creative tool
- ❌ Fuchsia too playful for health data
- ❌ Not standard in medical apps

**Teal + Cyan Benefits:**
- ✅ Medical trust (blue) + vitality (green)
- ✅ Industry standard for health apps
- ✅ Clinical-grade credibility
- ✅ Better accessibility/contrast
- ✅ Professional wellness aesthetic

**Indigo Preserved for:**
- AI features (Neural Cortex)
- Advanced tech capabilities
- Creates distinction for premium AI

---

## 🚀 Future Color Changes

To modify the entire app's palette, simply edit `/theme.ts`:

```typescript
// Example: Change primary to purple
primary: {
  gradient: 'from-purple-500 to-violet-500',
  text: 'text-purple-400',
  // ...
}
```

All components will automatically reflect the change! 🎉
