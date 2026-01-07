import React, { memo } from 'react';

interface RatingScaleProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  colors?: string[];
  label?: string;
  showValue?: boolean;
  ariaLabel?: string;
}

export const RatingScale = memo(({ 
  value, 
  onChange, 
  min = 1, 
  max = 5, 
  colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'],
  label,
  showValue = false,
  ariaLabel
}: RatingScaleProps) => {
  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  
  return (
    <div className="space-y-4">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-green-200/40 uppercase tracking-widest">{label}</label>
          {showValue && <span className="text-green-400 font-bold">{value}/{max}</span>}
        </div>
      )}
      <div className="flex justify-between gap-2 p-1.5 bg-white/5 rounded-[24px]" role="radiogroup" aria-label={ariaLabel || `Rating from ${min} to ${max}`}>
        {range.map(v => (
          <button 
            key={v} 
            onClick={() => onChange(v)} 
            className={`flex-1 h-14 rounded-[18px] font-black text-lg transition-all active:scale-95 touch-manipulation ${
              value === v 
                ? `${colors[v-min]} text-white shadow-lg scale-105` 
                : 'text-teal-300/20'
            }`}
            role="radio"
            aria-checked={value === v}
            aria-label={`Rating level ${v} of ${max}`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
});