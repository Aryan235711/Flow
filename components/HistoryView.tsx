
import React, { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, ChevronDown, Zap, CloudFog, BatteryWarning, BrainCircuit, Trash2, Moon, Wind, Activity, Utensils, Sun, Coffee, Dumbbell, Edit3, Snowflake, Calendar, Lock } from 'lucide-react';
import { MetricEntry } from '../types.ts';
import { triggerHaptic } from '../utils.ts';

interface HistoryViewProps {
  history: MetricEntry[];
  isMockData: boolean;
  onDelete: (index: number) => void;
  onEdit: (entry: MetricEntry, index: number) => void;
  isPremium: boolean;
  onTriggerPaywall: () => void;
}

// Mini Gauge Component for History Cards
const MiniScoreGauge = memo(({ score }: { score: number }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const dashoffset = circumference - (progress / 100) * circumference;
  
  const color = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-teal-400' : 'text-rose-400';

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
       <svg className="w-full h-full transform -rotate-90">
         <circle cx="24" cy="24" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="transparent" />
         <circle 
           cx="24" cy="24" r={radius} 
           stroke="currentColor" 
           strokeWidth="3" 
           fill="transparent" 
           strokeDasharray={circumference} 
           strokeDashoffset={dashoffset}
           strokeLinecap="round"
           className={color}
           style={{ filter: 'drop-shadow(0 0 2px currentColor)' }}
         />
       </svg>
       <span className={`absolute text-[10px] font-black font-outfit ${color}`}>{score}</span>
    </div>
  );
});

const DetailItem = memo(({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) => (
  <motion.div 
    variants={{ 
       hidden: { opacity: 0, y: 10 }, 
       show: { opacity: 1, y: 0 } 
    }}
    className="bg-white/5 p-3 rounded-2xl flex flex-col justify-center"
  >
    <div className="flex items-center gap-1.5 mb-1 opacity-50">
      <Icon size={10} className={color} />
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-sm font-bold font-outfit">{value}</span>
  </motion.div>
));

// Extracted Memoized Card to prevent list re-renders on expand
const HistoryCard = memo(({ 
  entry, 
  idx, 
  isExpanded, 
  onToggle, 
  onDelete, 
  onEdit 
}: { 
  entry: MetricEntry; 
  idx: number; 
  isExpanded: boolean; 
  onToggle: (idx: number) => void; 
  onDelete: (idx: number) => void; 
  onEdit: (entry: MetricEntry, idx: number) => void; 
}) => {
  const calculateScore = (entry: MetricEntry) => {
    const flags = Object.values(entry.processedState);
    const greens = flags.filter(f => f === 'GREEN').length;
    const yellows = flags.filter(f => f === 'YELLOW').length;
    const total = flags.length || 1;
    return Math.round(((greens * 100) + (yellows * 50)) / total);
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

  const getCognitiveColor = (state: string) => {
    switch (state) {
      case 'PEAK': return 'bg-teal-500 shadow-teal-500/40';
      case 'FOGGY': return 'bg-slate-500 shadow-slate-500/40';
      case 'DRAINED': return 'bg-rose-500 shadow-rose-500/40';
      case 'FROZEN': return 'bg-cyan-500 shadow-cyan-500/40';
      default: return 'bg-emerald-500 shadow-emerald-500/40';
    }
  };

  const score = calculateScore(entry);
  const isFrozen = entry.rawValues.cognition === 'FROZEN';

  // Determine strip color
  const statusColor = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-teal-500' : 'bg-rose-500';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: idx * 0.05, type: "spring", stiffness: 300, damping: 30 }}
      className={`glass rounded-[32px] overflow-hidden transition-all duration-300 relative ${isExpanded ? 'bg-white/[0.06] shadow-xl ring-1 ring-white/10' : 'active:scale-[0.98]'}`}
    >
      {/* Status Strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor} opacity-50`} />

      <div onClick={() => onToggle(idx)} className="p-4 pl-6 cursor-pointer touch-manipulation">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${getCognitiveColor(entry.rawValues.cognition || 'STEADY')}`}>
              {getCognitiveIcon(entry.rawValues.cognition || 'STEADY')}
            </div>
            <div>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest font-outfit mb-0.5">{entry.date}</p>
              <h3 className={`text-lg font-bold font-outfit leading-none ${isFrozen ? 'text-cyan-400' : 'text-white'}`}>{entry.symptomName}</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <MiniScoreGauge score={score} />
            <ChevronDown size={20} className={`text-white/20 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } }} 
            exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
            className="overflow-hidden bg-[#020617]/30 border-t border-white/5"
          >
            <motion.div 
               className="p-6 pl-8 grid grid-cols-2 gap-3"
               initial="hidden"
               animate="show"
               variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            >
              <DetailItem label="Sleep" value={`${entry.rawValues.sleep.toFixed(1)}h`} icon={Moon} color="text-teal-400" />
              <DetailItem label="RHR" value={`${entry.rawValues.rhr} bpm`} icon={Activity} color="text-rose-400" />
              <DetailItem label="HRV" value={`${entry.rawValues.hrv} ms`} icon={Wind} color="text-emerald-400" />
              <DetailItem label="Protein" value={`${entry.rawValues.protein}g`} icon={Utensils} color="text-amber-400" />
              <DetailItem label="Sun" value={entry.rawValues.sun} icon={Sun} color="text-yellow-400" />
              <DetailItem label="Exertion" value={entry.rawValues.exercise} icon={Dumbbell} color="text-cyan-400" />
              <DetailItem label="Gut" value={`${entry.rawValues.gut}/5`} icon={Coffee} color="text-purple-400" />
              
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="col-span-2 flex gap-2 mt-2">
                {(!entry.isSystemGenerated) && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(entry, idx);
                    }}
                    className="flex-1 p-3 rounded-2xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 flex items-center justify-center gap-2 transition-colors active:scale-95 touch-manipulation border border-teal-500/20"
                  >
                    <Edit3 size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Edit Entry</span>
                  </button>
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Permanently delete this telemetry record?")) {
                      onDelete(idx);
                    }
                  }}
                  className={`p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 flex items-center justify-center gap-2 transition-colors active:scale-95 touch-manipulation ${(!entry.isSystemGenerated) ? 'w-auto px-4' : 'w-full'}`}
                >
                  <Trash2 size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">{(!entry.isSystemGenerated) ? '' : 'Delete'}</span>
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export const HistoryView = memo(({ history, isMockData, onDelete, onEdit, isPremium, onTriggerPaywall }: HistoryViewProps) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const toggleExpand = useCallback((idx: number) => {
    triggerHaptic();
    setExpandedIndex(prev => prev === idx ? null : idx);
  }, []);

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
  const hiddenCount = reversedHistory.length - visibleHistory.length;

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
          <h1 className="text-5xl md:text-7xl font-black font-outfit tracking-tighter text-white">Registry</h1>
          <p className="text-teal-300/40 text-sm md:text-lg font-medium mt-2">Historical telemetry logs.</p>
        </div>
        
        {/* DATE FILTER BUTTON */}
        <button 
          onClick={handleFilterClick}
          className={`
            w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-[24px] flex items-center justify-center border transition-all active:scale-90
            ${showFilter ? 'bg-teal-500 text-white border-teal-500 shadow-lg' : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10'}
          `}
        >
          {isPremium ? <Calendar size={24} /> : <Lock size={24} className="text-amber-500" />}
        </button>
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
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl md:rounded-[32px] p-4 md:p-8 mb-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-teal-300/60 uppercase tracking-widest block mb-2">From Date</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full glass p-3 rounded-xl border border-teal-500/20 bg-teal-500/5 text-white text-sm font-bold focus:border-teal-500/50 focus:bg-teal-500/10 transition-all" 
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-teal-300/60 uppercase tracking-widest block mb-2">To Date</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full glass p-3 rounded-xl border border-teal-500/20 bg-teal-500/5 text-white text-sm font-bold focus:border-teal-500/50 focus:bg-teal-500/10 transition-all" 
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {history.length === 0 ? (
          <div className="col-span-full text-center py-24 opacity-10">
            <Database size={48} className="mx-auto mb-4" />
            <p className="text-sm uppercase tracking-widest font-black">Registry Empty</p>
          </div>
        ) : visibleHistory.map((entry, idx) => (
           <HistoryCard 
             key={`${entry.date}-${idx}`}
             entry={entry}
             idx={idx}
             isExpanded={expandedIndex === idx}
             onToggle={toggleExpand}
             onDelete={onDelete}
             onEdit={onEdit}
           />
        ))}

        {/* LOCKED VAULT CARD (Free User with > 7 logs) */}
        {!isPremium && hiddenCount > 0 && (
          <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             onClick={onTriggerPaywall}
             className="md:col-span-2 glass rounded-[32px] p-6 border-amber-500/20 relative overflow-hidden group cursor-pointer active:scale-95 transition-all"
          >
            {/* Removed the amber gradient overlay */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-1">
                <Lock size={20} />
              </div>
              <h3 className="text-xl font-black font-outfit text-white">Deep Archive Locked</h3>
              <p className="text-white/40 text-sm font-medium">{hiddenCount} older logs stored securely.</p>
              <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-4 py-2 rounded-full border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                 Unlock Vault
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
});
