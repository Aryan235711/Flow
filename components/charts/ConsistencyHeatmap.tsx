
import React, { useMemo, memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MetricEntry, UserConfig } from '../../types.ts';
import { triggerHaptic } from '../../utils.ts';
import { Calendar, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeatmapDay {
  date: string;
  score: number;
  hasData: boolean;
  status: 'OPTIMAL' | 'MODERATE' | 'LOW' | 'NO DATA';
  displayDate: string;
  metGoals: boolean;
}

// Extracted Tile to prevent grid re-renders
const HeatmapTile = memo(({ 
  day, 
  isSelected, 
  onSelect, 
  index 
}: { 
  day: HeatmapDay; 
  isSelected: boolean; 
  onSelect: (e: React.MouseEvent, day: HeatmapDay) => void;
  index: number;
}) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: index * 0.01, type: 'spring', stiffness: 200, damping: 20 }}
    onClick={(e) => onSelect(e, day)}
    className="relative aspect-square cursor-pointer touch-manipulation group"
  >
    <div 
      className={`
        w-full h-full rounded-lg transition-all duration-300
        ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a1128] z-10 scale-110 shadow-xl' : 'hover:scale-105 active:scale-90'}
        ${!day.hasData ? 'bg-white/5 border border-white/5' : 
          day.status === 'OPTIMAL' ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 
          day.status === 'MODERATE' ? 'bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.3)]' : 
          'bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.3)]'}
      `}
    />
  </motion.div>
));

export const ConsistencyHeatmap = memo(({ history, config }: { history: MetricEntry[], config?: UserConfig }) => {
  const heatData = useMemo(() => {
    const days: HeatmapDay[] = [];
    const today = new Date();
    const historyMap = new Map(history.map(h => [h.date, h]));

    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = historyMap.get(dateStr);
      
      let score = 0;
      let hasData = false;
      let status: HeatmapDay['status'] = 'NO DATA';
      let metGoals = false;
      
      if (entry) {
        hasData = true;
        const flags = Object.values(entry.processedState);
        const greens = flags.filter(f => f === 'GREEN').length;
        const yellows = flags.filter(f => f === 'YELLOW').length;
        score = (greens + (yellows * 0.5)) / (flags.length || 1);
        
        if (score >= 0.8) status = 'OPTIMAL';
        else if (score >= 0.5) status = 'MODERATE';
        else status = 'LOW';

        // Simple goal check: Sleep or HRV green
        if (entry.processedState.sleep === 'GREEN' && entry.processedState.hrv === 'GREEN') {
          metGoals = true;
        }
      }
      
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      days.push({ date: dateStr, score, hasData, status, displayDate, metGoals });
    }
    return days;
  }, [history]);

  // Default to today (last element)
  const [selectedDate, setSelectedDate] = useState<HeatmapDay | null>(null);

  useEffect(() => {
    if (heatData.length > 0) {
      setSelectedDate(heatData[heatData.length - 1]);
    }
  }, [heatData]);

  const handleSelect = useCallback((e: React.MouseEvent, day: HeatmapDay) => {
    e.stopPropagation(); // Critical: prevents card from flipping when selecting data
    triggerHaptic();
    setSelectedDate(day);
  }, []);

  return (
    <div className="w-full h-full flex flex-col px-2 pt-2 min-h-0">
      {/* Grid - Responsive sizing */}
      <div className="grid grid-cols-7 gap-2 md:gap-3 content-start mb-3 max-w-2xl mx-auto w-full flex-shrink-0">
        {heatData.map((day, i) => (
          <HeatmapTile 
             key={day.date} 
             day={day} 
             index={i} 
             isSelected={selectedDate?.date === day.date}
             onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Info & Legend Container - Flexible layout */}
      <div className="flex-1 flex flex-col justify-between min-h-0 space-y-2">
        
        {/* Selection Details - Compact for landscape */}
        <AnimatePresence mode="wait">
          {selectedDate ? (
            <motion.div 
              key={selectedDate.date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="bg-white/5 p-2 md:p-3 rounded-xl border border-white/5 flex items-center justify-between flex-shrink-0"
            >
               <div className="flex items-center gap-3">
                 <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${selectedDate.hasData ? 'bg-white/10' : 'bg-white/5'}`}>
                    <Calendar size={16} className="text-white/60" />
                 </div>
                 <div>
                   <div className="text-[9px] font-black uppercase tracking-widest text-white/30">History Log</div>
                   <div className="text-sm font-bold text-white">{selectedDate.displayDate}</div>
                 </div>
               </div>
               
               {selectedDate.hasData ? (
                 <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-0.5">
                       <span className={`text-xs font-bold uppercase tracking-wide ${
                          selectedDate.status === 'OPTIMAL' ? 'text-emerald-400' : 
                          selectedDate.status === 'MODERATE' ? 'text-teal-400' : 
                          'text-rose-400'
                       }`}>
                         {selectedDate.status}
                       </span>
                       <Activity size={12} className={
                          selectedDate.status === 'OPTIMAL' ? 'text-emerald-400' : 
                          selectedDate.status === 'MODERATE' ? 'text-teal-400' : 
                          'text-rose-400'
                       } />
                    </div>
                    {selectedDate.metGoals && (
                      <div className="flex items-center gap-1 opacity-70">
                        <CheckCircle2 size={10} className="text-emerald-400" />
                        <span className="text-[9px] text-white/50">Baseline Met</span>
                      </div>
                    )}
                 </div>
               ) : (
                  <div className="flex items-center gap-1 opacity-40">
                     <AlertCircle size={14} />
                     <span className="text-[10px] uppercase font-bold">No Data</span>
                  </div>
               )}
            </motion.div>
          ) : (
            <div className="h-12 md:h-16 flex items-center justify-center text-[10px] text-white/20 uppercase tracking-widest bg-white/5 rounded-xl border border-white/5 border-dashed flex-shrink-0">Select a tile</div>
          )}
        </AnimatePresence>

        {/* Legend - Always visible at bottom */}
        <div className="flex justify-center items-center gap-4 md:gap-6 py-2 flex-shrink-0">
          <LegendItem color="bg-emerald-400" label="High" />
          <LegendItem color="bg-teal-400" label="Mid" />
          <LegendItem color="bg-rose-400" label="Low" />
          <LegendItem color="bg-white/10 border border-white/10" label="Empty" />
        </div>
      </div>
    </div>
  );
});

const LegendItem = memo(({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${color}`} />
    <span className="text-[9px] md:text-[11px] uppercase font-bold text-white/30">{label}</span>
  </div>
));
