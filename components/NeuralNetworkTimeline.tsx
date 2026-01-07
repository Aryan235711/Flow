import React, { memo, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, ChevronDown, Zap, CloudFog, BatteryWarning, BrainCircuit, Trash2, Moon, Wind, Activity, Utensils, Sun, Coffee, Dumbbell, Edit3, Snowflake, Calendar, Lock, Network, GitBranch, ArrowRight, TrendingUp, TrendingDown, Activity as ActivityIcon, Heart, Zap as EnergyIcon, History } from 'lucide-react';
import { MetricEntry } from '../types.ts';
import { triggerHaptic, getCognitiveColor } from '../utils.ts';

interface NeuralNetworkTimelineProps {
  history: MetricEntry[];
  isMockData: boolean;
  onDelete: (date: string) => void;
  onEdit: (entry: MetricEntry, index: number) => void;
  isPremium: boolean;
  onTriggerPaywall: () => void;
  onToggleView?: () => void;
}

// Helper functions to convert string values to numbers
const convertSunToNumber = (sun: string): number => {
  switch (sun) {
    case 'Full': return 60;
    case 'Partial': return 30;
    case 'None': return 0;
    default: return 30;
  }
};

const convertExerciseToNumber = (exercise: string): number => {
  switch (exercise) {
    case 'Hard': return 90;
    case 'Medium': return 60;
    case 'Light': return 30;
    case 'None': return 0;
    default: return 30;
  }
};

// Biological Systems Constants
const BIOLOGICAL_SYSTEMS = {
  SLEEP: { name: 'Sleep', icon: Moon, color: 'text-teal-400', affects: ['COGNITION', 'HRV', 'ENERGY'] },
  HRV: { name: 'HRV', icon: Wind, color: 'text-emerald-400', affects: ['COGNITION', 'STRESS'] },
  EXERCISE: { name: 'Exercise', icon: Dumbbell, color: 'text-cyan-400', affects: ['ENERGY', 'COGNITION', 'HRV'] },
  NUTRITION: { name: 'Nutrition', icon: Utensils, color: 'text-amber-400', affects: ['ENERGY', 'GUT', 'COGNITION'] },
  SUNLIGHT: { name: 'Sunlight', icon: Sun, color: 'text-yellow-400', affects: ['SLEEP', 'ENERGY'] },
  GUT: { name: 'Gut', icon: Coffee, color: 'text-purple-400', affects: ['COGNITION', 'ENERGY'] },
  COGNITION: { name: 'Cognition', icon: BrainCircuit, color: 'text-blue-400', affects: [] },
  ENERGY: { name: 'Energy', icon: EnergyIcon, color: 'text-green-400', affects: ['COGNITION'] }
};

// Flow State Analysis
const analyzeFlowState = (entry: MetricEntry) => {
  const systems = {
    sleep: entry.rawValues.sleep >= 7 ? 'OPTIMAL' : entry.rawValues.sleep >= 5 ? 'GOOD' : 'POOR',
    hrv: entry.rawValues.hrv >= 50 ? 'OPTIMAL' : entry.rawValues.hrv >= 30 ? 'GOOD' : 'POOR',
    exercise: convertExerciseToNumber(entry.rawValues.exercise) >= 60 ? 'OPTIMAL' : convertExerciseToNumber(entry.rawValues.exercise) >= 30 ? 'GOOD' : 'POOR',
    protein: entry.rawValues.protein >= 100 ? 'OPTIMAL' : entry.rawValues.protein >= 50 ? 'GOOD' : 'POOR',
    sun: convertSunToNumber(entry.rawValues.sun) >= 30 ? 'OPTIMAL' : convertSunToNumber(entry.rawValues.sun) >= 15 ? 'GOOD' : 'POOR',
    gut: entry.rawValues.gut >= 4 ? 'OPTIMAL' : entry.rawValues.gut >= 3 ? 'GOOD' : 'POOR'
  };

  const optimalCount = Object.values(systems).filter(s => s === 'OPTIMAL').length;
  const goodCount = Object.values(systems).filter(s => s === 'GOOD').length;

  if (optimalCount >= 4) return 'FLOW_STATE';
  if (optimalCount >= 2 && goodCount >= 3) return 'HIGH_FLOW';
  if (goodCount >= 4) return 'MODERATE_FLOW';
  if (optimalCount + goodCount >= 3) return 'LOW_FLOW';
  return 'DISRUPTED';
};

// Biological Flow Node Component
const BiologicalFlowNode = memo(({
  entry,
  position,
  flowState,
  systemStrengths,
  causalLinks,
  isExpanded,
  onToggle,
  onDelete,
  onEdit,
  idx
}: {
  entry: MetricEntry;
  position: { x: number; y: number };
  flowState: string;
  systemStrengths: Record<string, number>;
  causalLinks: Array<{ from: string; to: string; strength: number; type: 'positive' | 'negative' | 'neutral' }>;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onEdit: (entry: MetricEntry, idx: number) => void;
  idx: number;
}) => {
  const calculateScore = (entry: MetricEntry) => {
    const flags = Object.values(entry.processedState);
    const greens = flags.filter(f => f === 'GREEN').length;
    const yellows = flags.filter(f => f === 'YELLOW').length;
    const total = flags.length || 1;
    return Math.round(((greens * 100) + (yellows * 50)) / total);
  };

  const getFlowStateColor = (state: string) => {
    switch (state) {
      case 'FLOW_STATE': return 'border-emerald-400 bg-emerald-500/10 shadow-emerald-500/20';
      case 'HIGH_FLOW': return 'border-teal-400 bg-teal-500/10 shadow-teal-500/20';
      case 'MODERATE_FLOW': return 'border-cyan-400 bg-cyan-500/10 shadow-cyan-500/20';
      case 'LOW_FLOW': return 'border-yellow-400 bg-yellow-500/10 shadow-yellow-500/20';
      default: return 'border-rose-400 bg-rose-500/10 shadow-rose-500/20';
    }
  };

  const getCognitiveIcon = (state: string) => {
    switch (state) {
      case 'PEAK': return <Zap size={16} className="text-white" />;
      case 'FOGGY': return <CloudFog size={16} className="text-white" />;
      case 'DRAINED': return <BatteryWarning size={16} className="text-white" />;
      case 'FROZEN': return <Snowflake size={16} className="text-white" />;
      default: return <BrainCircuit size={16} className="text-white" />;
    }
  };

  const score = calculateScore(entry);
  const isFrozen = entry.rawValues.cognition === 'FROZEN';
  const nodeSize = isExpanded ? 280 : 100;

  // Generate causal pathway visualizations
  const causalPaths = causalLinks.map((link, i) => {
    const fromSystem = BIOLOGICAL_SYSTEMS[link.from as keyof typeof BIOLOGICAL_SYSTEMS];
    const toSystem = BIOLOGICAL_SYSTEMS[link.to as keyof typeof BIOLOGICAL_SYSTEMS];
    if (!fromSystem || !toSystem) return null;

    // Calculate positions based on system relationships
    const angle = (i / causalLinks.length) * 2 * Math.PI;
    const radius = 60;
    const startX = position.x;
    const startY = position.y;
    const endX = position.x + Math.cos(angle) * radius;
    const endY = position.y + Math.sin(angle) * radius;

    return (
      <motion.path
        key={`${link.from}-${link.to}`}
        d={`M ${startX} ${startY} Q ${startX + (endX - startX) * 0.5} ${startY + (endY - startY) * 0.5 - 20} ${endX} ${endY}`}
        stroke={link.type === 'positive' ? 'rgba(16, 185, 129, 0.6)' : link.type === 'negative' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(156, 163, 175, 0.4)'}
        strokeWidth={link.strength * 3}
        fill="none"
        strokeDasharray={link.type === 'neutral' ? '5,5' : 'none'}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: idx * 0.1 + i * 0.1, duration: 0.8 }}
      />
    );
  });

  return (
    <motion.div
      className="absolute"
      style={{
        left: position.x - nodeSize / 2,
        top: position.y - nodeSize / 2,
        width: nodeSize,
        height: nodeSize,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: idx * 0.1, type: "spring", stiffness: 200, damping: 20 }}
    >
      {/* Causal Pathways Background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {causalPaths}
      </svg>

      {/* Biological Flow Node */}
      <motion.div
        className={`relative ${isExpanded ? 'z-[9999]' : 'z-10'} glass rounded-2xl border-2 transition-all duration-500 cursor-pointer overflow-hidden ${getFlowStateColor(flowState)}`}
        whileHover={{ scale: isExpanded ? 1 : 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          triggerHaptic();
          onToggle();
        }}
      >
        {/* Flow State Indicator Ring */}
        <AnimatePresence>
          {flowState === 'FLOW_STATE' && (
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-emerald-400/30"
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: 1.2, opacity: [0, 1, 0] }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          )}
        </AnimatePresence>

        <div className="w-full h-full flex items-center justify-center">
          {isExpanded ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center w-full bg-black/100 rounded-2xl p-4"
            >
              {/* Flow State Header */}
              <div className="mb-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                  flowState === 'FLOW_STATE' ? 'bg-emerald-500/20 text-emerald-300' :
                  flowState === 'HIGH_FLOW' ? 'bg-teal-500/20 text-teal-300' :
                  flowState === 'MODERATE_FLOW' ? 'bg-cyan-500/20 text-cyan-300' :
                  flowState === 'LOW_FLOW' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  {flowState === 'FLOW_STATE' && <Zap size={12} />}
                  {flowState === 'HIGH_FLOW' && <TrendingUp size={12} />}
                  {flowState === 'MODERATE_FLOW' && <ActivityIcon size={12} />}
                  {flowState === 'LOW_FLOW' && <TrendingDown size={12} />}
                  {flowState.replace('_', ' ')}
                </div>
              </div>

              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-3 ${getCognitiveColor(entry.rawValues.cognition || 'STEADY')}`}>
                {getCognitiveIcon(entry.rawValues.cognition || 'STEADY')}
              </div>

              <h3 className={`text-lg font-bold font-outfit leading-none mb-1 ${isFrozen ? 'text-cyan-400' : 'text-white'}`}>
                {entry.symptomName}
              </h3>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest font-outfit mb-3">{entry.date}</p>

              {/* Biological Systems Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                {Object.entries(systemStrengths).slice(0, 4).map(([system, strength]) => {
                  const sys = BIOLOGICAL_SYSTEMS[system as keyof typeof BIOLOGICAL_SYSTEMS];
                  if (!sys) return null;
                  const Icon = sys.icon;
                  return (
                    <div key={system} className="bg-white/10 p-2 rounded-lg flex items-center gap-1">
                      <Icon size={10} className={sys.color} />
                      <div>
                        <div className={`font-bold ${strength >= 80 ? 'text-emerald-400' : strength >= 60 ? 'text-yellow-400' : 'text-rose-400'}`}>
                          {strength}%
                        </div>
                        <div className="text-white/40 text-[8px] uppercase">{system.slice(0, 3)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Causal Insights */}
              <div className="bg-white/10 p-3 rounded-lg mb-3">
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Key Drivers</div>
                <div className="space-y-1">
                  {causalLinks.slice(0, 2).map((link, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <ArrowRight size={8} className={link.type === 'positive' ? 'text-emerald-400' : link.type === 'negative' ? 'text-rose-400' : 'text-gray-400'} />
                      <span className="text-white/60">{link.from} → {link.to}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 relative z-[10000]">
                {(!entry.isSystemGenerated) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(entry, idx);
                    }}
                    className="flex-1 p-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 text-[10px] font-bold transition-colors"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Permanently delete this telemetry record?")) {
                      onDelete(entry.date);
                    }
                  }}
                  className="flex-1 p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 text-[10px] font-bold transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="text-center"
              whileHover={{ scale: 1.1 }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-1 ${getCognitiveColor(entry.rawValues.cognition || 'STEADY')}`}>
                {getCognitiveIcon(entry.rawValues.cognition || 'STEADY')}
              </div>
              <div className="text-[8px] font-black text-white/40 uppercase tracking-widest">{entry.date.split('-')[2]}</div>
              <div className={`text-[10px] font-bold mt-1 ${
                flowState === 'FLOW_STATE' ? 'text-emerald-400' :
                flowState === 'HIGH_FLOW' ? 'text-teal-400' :
                flowState === 'MODERATE_FLOW' ? 'text-cyan-400' :
                flowState === 'LOW_FLOW' ? 'text-yellow-400' :
                'text-rose-400'
              }`}>
                {flowState === 'FLOW_STATE' ? '⚡' :
                 flowState === 'HIGH_FLOW' ? '↗' :
                 flowState === 'MODERATE_FLOW' ? '→' :
                 flowState === 'LOW_FLOW' ? '↘' :
                 '⚠'}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});

// Biological Flow Connections Component
const BiologicalFlowConnections = memo(({
  connections
}: {
  connections: Array<{
    from: { x: number; y: number; system: string };
    to: { x: number; y: number; system: string };
    strength: number;
    type: 'positive' | 'negative' | 'neutral';
    label?: string;
  }>
}) => {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
      {connections.map((conn, i) => {
        const dx = conn.to.x - conn.from.x;
        const dy = conn.to.y - conn.from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const midX = conn.from.x + dx * 0.5;
        const midY = conn.from.y + dy * 0.5;

        // Create curved path with control point
        const controlOffset = distance * 0.3;
        const controlX = midX;
        const controlY = midY - controlOffset;

        return (
          <g key={i}>
            <motion.path
              d={`M ${conn.from.x} ${conn.from.y} Q ${controlX} ${controlY} ${conn.to.x} ${conn.to.y}`}
              stroke={conn.type === 'positive' ? 'rgba(16, 185, 129, 0.4)' : conn.type === 'negative' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(156, 163, 175, 0.3)'}
              strokeWidth={conn.strength * 2}
              fill="none"
              strokeDasharray={conn.type === 'neutral' ? '8,4' : 'none'}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: i * 0.05, duration: 0.8 }}
            />
            {/* Direction arrow */}
            <motion.polygon
              points={`${conn.to.x},${conn.to.y} ${conn.to.x - 8},${conn.to.y - 4} ${conn.to.x - 8},${conn.to.y + 4}`}
              fill={conn.type === 'positive' ? 'rgba(16, 185, 129, 0.6)' : conn.type === 'negative' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(156, 163, 175, 0.5)'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 + 0.4, duration: 0.4 }}
            />
          </g>
        );
      })}
    </svg>
  );
});

export const NeuralNetworkTimeline = memo(({
  history,
  isMockData,
  onDelete,
  onEdit,
  isPremium,
  onTriggerPaywall,
  onToggleView
}: NeuralNetworkTimelineProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [showFilter, setShowFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const reversedHistory = history.slice().reverse();
  const filteredHistory = reversedHistory.filter(entry => {
    if (!startDate && !endDate) return true;
    const entryDate = new Date(entry.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start && entryDate < start) return false;
    if (end && entryDate > end) return false;
    return true;
  });

  const visibleHistory = isPremium ? filteredHistory : filteredHistory.slice(0, 7);

  // Calculate meaningful positions based on biological flow states
  const nodePositions = useMemo(() => {
    const positions: Array<{ x: number; y: number }> = [];
    const centerX = 400;
    const startY = 120;
    const spacing = 140;

    visibleHistory.forEach((entry, idx) => {
      const flowState = analyzeFlowState(entry);

      // Position based on flow state trajectory
      let xOffset = 0;
      let yOffset = 0;

      switch (flowState) {
        case 'FLOW_STATE':
          xOffset = Math.sin(idx * 0.5) * 80; // Gentle flow
          yOffset = idx * spacing;
          break;
        case 'HIGH_FLOW':
          xOffset = Math.sin(idx * 0.7) * 60;
          yOffset = idx * spacing + Math.cos(idx * 0.3) * 20;
          break;
        case 'MODERATE_FLOW':
          xOffset = Math.sin(idx * 0.9) * 40;
          yOffset = idx * spacing + Math.sin(idx * 0.4) * 15;
          break;
        case 'LOW_FLOW':
          xOffset = Math.sin(idx * 1.1) * 30;
          yOffset = idx * spacing + Math.sin(idx * 0.6) * 25;
          break;
        case 'DISRUPTED':
          xOffset = Math.sin(idx * 1.3) * 50; // Chaotic movement
          yOffset = idx * spacing + Math.sin(idx * 0.8) * 35;
          break;
      }

      positions.push({
        x: centerX + xOffset,
        y: startY + yOffset
      });
    });

    return positions;
  }, [visibleHistory]);

  // Generate meaningful biological connections
  const biologicalConnections = useMemo(() => {
    const connections: Array<{
      from: { x: number; y: number; system: string };
      to: { x: number; y: number; system: string };
      strength: number;
      type: 'positive' | 'negative' | 'neutral';
      label?: string;
    }> = [];

    visibleHistory.forEach((entry, idx) => {
      if (idx === 0) return; // Skip first entry

      const prevEntry = visibleHistory[idx - 1];
      const currentFlow = analyzeFlowState(entry);
      const prevFlow = analyzeFlowState(prevEntry);

      // Connect based on biological relationships
      const relationships = [
        // Sleep affects HRV and Energy
        { from: 'SLEEP', to: 'HRV', condition: entry.rawValues.sleep < prevEntry.rawValues.sleep },
        { from: 'SLEEP', to: 'ENERGY', condition: entry.rawValues.sleep < prevEntry.rawValues.sleep },

        // Exercise affects HRV and Cognition
        { from: 'EXERCISE', to: 'HRV', condition: convertExerciseToNumber(entry.rawValues.exercise) > convertExerciseToNumber(prevEntry.rawValues.exercise) },
        { from: 'EXERCISE', to: 'COGNITION', condition: convertExerciseToNumber(entry.rawValues.exercise) > convertExerciseToNumber(prevEntry.rawValues.exercise) },

        // Nutrition affects Energy and Gut
        { from: 'NUTRITION', to: 'ENERGY', condition: entry.rawValues.protein > prevEntry.rawValues.protein },
        { from: 'NUTRITION', to: 'GUT', condition: entry.rawValues.protein > prevEntry.rawValues.protein },

        // Sunlight affects Sleep
        { from: 'SUNLIGHT', to: 'SLEEP', condition: convertSunToNumber(entry.rawValues.sun) > convertSunToNumber(prevEntry.rawValues.sun) },
      ];

      relationships.forEach(rel => {
        if (rel.condition) {
          connections.push({
            from: { ...nodePositions[idx - 1], system: rel.from },
            to: { ...nodePositions[idx], system: rel.to },
            strength: 0.6,
            type: 'positive' as const,
            label: `${rel.from} → ${rel.to}`
          });
        }
      });

      // Flow state transitions
      if (currentFlow !== prevFlow) {
        connections.push({
          from: { ...nodePositions[idx - 1], system: 'COGNITION' },
          to: { ...nodePositions[idx], system: 'COGNITION' },
          strength: 0.8,
          type: currentFlow === 'FLOW_STATE' ? 'positive' : currentFlow === 'DISRUPTED' ? 'negative' : 'neutral',
          label: 'Flow Transition'
        });
      }
    });

    return connections;
  }, [visibleHistory, nodePositions]);

  // Calculate system strengths and causal links for each entry
  const getSystemData = useCallback((entry: MetricEntry) => {
    const sleepStrength = Math.round(Math.min(100, (entry.rawValues.sleep / 8) * 100));
    const hrvStrength = Math.round(Math.min(100, (entry.rawValues.hrv / 80) * 100));
    const exerciseStrength = Math.round(Math.min(100, (convertExerciseToNumber(entry.rawValues.exercise) / 90) * 100));
    const nutritionStrength = Math.round(Math.min(100, (entry.rawValues.protein / 150) * 100));
    const sunlightStrength = Math.round(Math.min(100, (convertSunToNumber(entry.rawValues.sun) / 60) * 100));
    const gutStrength = Math.round(Math.min(100, (entry.rawValues.gut / 5) * 100));
    const cognitionStrength = entry.rawValues.cognition === 'PEAK' ? 100 : entry.rawValues.cognition === 'STEADY' ? 75 : entry.rawValues.cognition === 'FOGGY' ? 50 : entry.rawValues.cognition === 'DRAINED' ? 25 : 10;
    const energyStrength = Math.round((sleepStrength + nutritionStrength + exerciseStrength) / 3);

    const systemStrengths = {
      SLEEP: sleepStrength,
      HRV: hrvStrength,
      EXERCISE: exerciseStrength,
      NUTRITION: nutritionStrength,
      SUNLIGHT: sunlightStrength,
      GUT: gutStrength,
      COGNITION: cognitionStrength,
      ENERGY: energyStrength
    };

    // Generate causal links - always show key biological relationships
    const causalLinks = [
      // Core biological relationships that are always present
      { from: 'SLEEP', to: 'COGNITION', strength: Math.max(0.3, (100 - sleepStrength) / 100), type: sleepStrength < 60 ? 'negative' as const : 'neutral' as const },
      { from: 'EXERCISE', to: 'ENERGY', strength: Math.min(0.8, exerciseStrength / 100), type: exerciseStrength > 50 ? 'positive' as const : 'neutral' as const },
      { from: 'NUTRITION', to: 'GUT', strength: Math.min(0.7, nutritionStrength / 100), type: nutritionStrength > 40 ? 'positive' as const : 'neutral' as const },
      { from: 'SUNLIGHT', to: 'SLEEP', strength: Math.min(0.6, sunlightStrength / 100), type: sunlightStrength > 30 ? 'positive' as const : 'neutral' as const }
    ];

    // Add additional relationships based on specific conditions
    if (sleepStrength < 50) {
      causalLinks.push({ from: 'SLEEP', to: 'HRV', strength: 0.7, type: 'negative' as const });
    }
    if (exerciseStrength > 80) {
      causalLinks.push({ from: 'EXERCISE', to: 'COGNITION', strength: 0.6, type: 'positive' as const });
    }
    if (nutritionStrength < 40) {
      causalLinks.push({ from: 'NUTRITION', to: 'ENERGY', strength: 0.5, type: 'negative' as const });
    }
    if (gutStrength < 50) {
      causalLinks.push({ from: 'GUT', to: 'COGNITION', strength: 0.4, type: 'negative' as const });
    }

    return { systemStrengths, causalLinks };
  }, []);

  const handleNodeToggle = useCallback((idx: number) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      return newSet;
    });
  }, []);

  const handleFilterClick = () => {
    triggerHaptic();
    if (!isPremium) {
      onTriggerPaywall();
    } else {
      setShowFilter(prev => !prev);
    }
  };

  return (
    <div className="px-5 pb-40 pt-28 space-y-8 md:px-10 md:pt-40 max-w-6xl mx-auto">
      <header className="px-2 flex justify-between items-end mb-4 md:mb-8">
        <div>
          {isMockData && (
             <div className="flex items-center gap-2 mb-2 opacity-50">
               <Database size={10} className="text-teal-400" />
               <span className="text-[9px] font-black uppercase tracking-widest text-teal-400">Simulation Mode</span>
             </div>
          )}
          <h1 className="text-5xl md:text-7xl font-black font-outfit tracking-tighter text-white flex items-center gap-4">
            <Network size={60} className="text-teal-400" />
            Biological Flow
          </h1>
          <p className="text-teal-300/40 text-sm md:text-lg font-medium mt-2">Systems biology telemetry network.</p>
        </div>

        {/* DATE FILTER BUTTON */}
        <div className="flex gap-3">
          {onToggleView && (
            <button
              onClick={() => {
                triggerHaptic();
                onToggleView();
              }}
              className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[24px] flex items-center justify-center border border-white/5 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all active:scale-90"
            >
              <History size={24} />
            </button>
          )}
          <button
            onClick={handleFilterClick}
            className={`
              w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[24px] flex items-center justify-center border transition-all active:scale-90
              ${showFilter ? 'bg-teal-500 text-white border-teal-500 shadow-lg' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'}
            `}
          >
            {isPremium ? <Calendar size={24} /> : <Lock size={24} className="text-amber-500" />}
          </button>
        </div>
      </header>

      {/* FILTER UI (Premium Only) */}
      <AnimatePresence>
        {showFilter && isPremium && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl md:rounded-[32px] p-6 md:p-10 mb-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col">
                  <label className="text-xs font-black text-teal-300/60 uppercase tracking-widest block mb-3">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-11/12 glass p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 text-white text-sm font-bold focus:border-teal-500/50 focus:bg-teal-500/10 transition-all"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-black text-teal-300/60 uppercase tracking-widest block mb-3">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-11/12 glass p-4 rounded-xl border border-teal-500/20 bg-teal-500/5 text-white text-sm font-bold focus:border-teal-500/50 focus:bg-teal-500/10 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="w-full py-3 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-black rounded-xl transition-colors active:scale-95"
              >
                Clear Filter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Biological Flow Network Container */}
      <div className="relative w-full h-[1000px] md:h-[1200px] bg-gradient-to-br from-slate-900/30 to-teal-900/20 rounded-[32px] border border-white/5 overflow-hidden">
        {/* Biological Systems Background Grid */}
        <div className="absolute inset-0 opacity-20">
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id="biological-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="2" fill="rgba(20, 184, 166, 0.4)" />
                <circle cx="30" cy="30" r="8" fill="none" stroke="rgba(20, 184, 166, 0.2)" strokeWidth="0.5" />
                <line x1="30" y1="22" x2="30" y2="38" stroke="rgba(20, 184, 166, 0.2)" strokeWidth="0.5" />
                <line x1="22" y1="30" x2="38" y2="30" stroke="rgba(20, 184, 166, 0.2)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#biological-grid)" />
          </svg>
        </div>

        {/* Biological Flow Connections */}
        <BiologicalFlowConnections connections={biologicalConnections} />

        {/* Biological Flow Nodes */}
        {visibleHistory.map((entry, idx) => {
          const flowState = analyzeFlowState(entry);
          const { systemStrengths, causalLinks } = getSystemData(entry);

          return (
            <BiologicalFlowNode
              key={`${entry.date}-${entry.symptomName}-${idx}`}
              entry={entry}
              position={nodePositions[idx]}
              flowState={flowState}
              systemStrengths={systemStrengths}
              causalLinks={causalLinks}
              isExpanded={expandedNodes.has(idx)}
              onToggle={() => handleNodeToggle(idx)}
              onDelete={onDelete}
              onEdit={onEdit}
              idx={idx}
            />
          );
        })}

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-xs">
          <div className="font-bold text-white mb-2">Flow States</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-emerald-300">Flow State</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal-500"></div>
              <span className="text-teal-300">High Flow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
              <span className="text-cyan-300">Moderate Flow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-yellow-300">Low Flow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span className="text-rose-300">Disrupted</span>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {history.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center opacity-10">
              <Network size={48} className="mx-auto mb-4 text-teal-400" />
              <p className="text-sm uppercase tracking-widest font-black">Biological Network Empty</p>
              <p className="text-xs text-white/40 mt-2">Start logging to build your biological flow network</p>
            </div>
          </div>
        )}
      </div>

      {/* LOCKED VAULT CARD (Free User with > 7 logs) */}
      {!isPremium && reversedHistory.length > 7 && (
        <motion.div
           initial={{ opacity: 0 }} animate={{ opacity: 1 }}
           onClick={onTriggerPaywall}
           className="glass rounded-[32px] p-6 border-amber-500/20 relative overflow-hidden group cursor-pointer active:scale-95 transition-all"
        >
          <div className="relative z-10 flex flex-col items-center justify-center text-center gap-2">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-1">
              <Lock size={20} />
            </div>
            <h3 className="text-xl font-black font-outfit text-white">Deep Archive Locked</h3>
            <p className="text-white/40 text-sm font-medium">{reversedHistory.length - 7} older logs stored securely.</p>
            <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-black transition-colors">
               Unlock Vault
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
});