import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

interface NumericInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onTouch?: () => void;
  onBlur?: () => void;
  isValid?: boolean;
  error?: string;
  touched?: boolean;
  tooltip: string;
  placeholder?: string;
}

const Tooltip = ({ text }: { text: string }) => (
  <div className="relative group">
    <Info size={12} className="text-indigo-400/40 hover:text-indigo-400/60 transition-colors cursor-help" />
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#020617] text-white text-xs font-medium rounded-lg border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999]">
      {text}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#020617]"></div>
    </div>
  </div>
);

export const NumericInput = memo(({ label, value, onChange, onTouch, onBlur, isValid, error, touched, tooltip, placeholder }: NumericInputProps) => {
  return (
    <div className={`glass rounded-[28px] p-6 text-center shadow-lg relative group transition-all ${
      touched && !isValid 
        ? 'border-red-500/50 bg-red-500/5 ring-2 ring-red-500/30' 
        : touched && isValid 
        ? 'border-green-500/50 bg-green-500/5 ring-2 ring-green-500/30' 
        : 'border-white/5 focus-within:ring-2 ring-indigo-500/30'
    }`}>
      <div className={`absolute inset-0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none ${
        touched && !isValid 
          ? 'bg-red-500/10' 
          : touched && isValid 
          ? 'bg-green-500/10' 
          : 'bg-indigo-500/5'
      }`} />
      <div className="flex items-center justify-center gap-2 mb-3">
        <label className={`text-[10px] font-black uppercase font-outfit tracking-widest ${
          touched && !isValid 
            ? 'text-red-400/70' 
            : touched && isValid 
            ? 'text-green-400/70' 
            : 'text-indigo-400/30'
        }`}>{label}</label>
        <Tooltip text={tooltip} />
        {touched && isValid && (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        )}
      </div>
      <input 
        type="text"
        inputMode="decimal"
        pattern="[0-9]*"
        value={value} 
        onChange={(e) => {
          onChange(e.target.value);
          onTouch?.(); // Optional call
        }}
        onBlur={onBlur}
        className={`w-full bg-transparent text-center text-3xl font-bold font-outfit outline-none placeholder:text-white/10 transition-colors ${
          touched && !isValid 
            ? 'text-red-400' 
            : touched && isValid 
            ? 'text-green-400' 
            : 'text-white'
        }`}
        placeholder={placeholder}
        aria-label={`${label} input`}
        aria-invalid={touched && !isValid}
        aria-describedby={error ? `${label.toLowerCase()}-error` : undefined}
      />
      {touched && error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          id={`${label.toLowerCase()}-error`} 
          className="text-red-400 text-xs mt-2 font-medium bg-red-500/10 px-3 py-1 rounded-lg"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
});