import React, { memo } from 'react';
import { Zap, BrainCircuit, CloudFog, BatteryWarning } from 'lucide-react';

interface CognitiveStateOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number }>;
  bg: string;
  text: string;
}

interface CognitiveStateSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const cogOptions: CognitiveStateOption[] = [
  { id: 'PEAK', label: 'Peak', icon: Zap, bg: 'bg-teal-500', text: 'text-white' },
  { id: 'STEADY', label: 'Steady', icon: BrainCircuit, bg: 'bg-emerald-500', text: 'text-white' },
  { id: 'FOGGY', label: 'Foggy', icon: CloudFog, bg: 'bg-slate-500', text: 'text-white' },
  { id: 'DRAINED', label: 'Drained', icon: BatteryWarning, bg: 'bg-rose-500', text: 'text-white' },
];

export const CognitiveStateSelector = memo(({ value, onChange }: CognitiveStateSelectorProps) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-black text-purple-200/40 uppercase tracking-[0.2em] flex items-center gap-2">
          <BrainCircuit size={14} className="text-purple-400"/> Cognitive State
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {cogOptions.map(opt => (
          <button 
            key={opt.id} 
            onClick={() => onChange(opt.id)}
            className={`
              relative p-5 rounded-[24px] flex flex-col items-center gap-3 transition-all overflow-hidden active:scale-95 touch-manipulation
              ${value === opt.id ? `${opt.bg} ${opt.text} shadow-xl scale-[1.02]` : 'bg-white/5 text-white/30 hover:bg-white/10'}
            `}
          >
             <opt.icon size={24} />
             <span className="text-[11px] font-black uppercase tracking-widest">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});