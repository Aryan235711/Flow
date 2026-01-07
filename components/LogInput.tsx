import React, { useState, useCallback, memo, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Coffee, Sun, Dumbbell, Zap, CloudFog, BatteryWarning, BrainCircuit, RefreshCw, Info } from 'lucide-react';
import { MetricEntry, UserConfig, Flag } from '../types.ts';
import { validateNumericInput, validateTimeInput, validateTextInput, VALIDATION_RULES, getInitialValidationState, isFormValid, FormValidationState } from '../inputValidation.ts';
import { calculateFlag, triggerHaptic, getLocalDate } from '../utils.ts';
import { FormErrorBoundary } from './FormErrorBoundary.tsx';
import { useDebounce } from '../hooks/useDebounce.ts';
import { calculateSmartDefaults } from '../smartDefaults.ts';

// Minimal tooltip component
const Tooltip = ({ text }: { text: string }) => (
  <div className="relative group">
    <Info size={12} className="text-indigo-400/40 hover:text-indigo-400/60 transition-colors cursor-help" />
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#020617] text-white text-xs font-medium rounded-lg border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999]">
      {text}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#020617]"></div>
    </div>
  </div>
);

interface LogInputProps {
  config: UserConfig;
  onSave: (entry: MetricEntry) => void;
  initialData?: MetricEntry | null;
  history?: MetricEntry[]; // Add history for smart defaults
}

export const LogInput = memo(({ config, onSave, initialData, history = [] }: LogInputProps) => {
  return (
    <FormErrorBoundary>
      <LogInputForm config={config} onSave={onSave} initialData={initialData} history={history} />
    </FormErrorBoundary>
  );
});

const LogInputForm = memo(({ config, onSave, initialData, history = [] }: LogInputProps) => {
  // Smart defaults based on history
  const smartDefaults = useMemo(() => calculateSmartDefaults(history), [history]);
  
  // Consistent default state function with smart defaults
  const getDefaultState = useCallback((isEditing: boolean) => {
    if (isEditing) {
      return {
        sleep: '', rhr: '', hrv: '', protein: '',
        gut: 0, sun: '', exercise: '', cognition: '',
        symptomScore: 0, symptomName: ''
      };
    }
    return smartDefaults;
  }, [smartDefaults]);

  const [formData, setFormData] = useState(() => getDefaultState(!!initialData));
  const [validationState, setValidationState] = useState(() => getInitialValidationState());
  
  // Debounce form data for validation to improve performance
  const debouncedFormData = useDebounce(formData, 300);
  
  // Memoize expensive calculations
  const isFormValidMemo = useMemo(() => isFormValid(validationState), [validationState]);

  // Hydrate form if editing
  useEffect(() => {
    if (initialData) {
      // Convert decimal sleep back to HH:MM
      const h = Math.floor(initialData.rawValues.sleep);
      const m = Math.round((initialData.rawValues.sleep - h) * 60);
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      setFormData({
        sleep: timeStr,
        rhr: initialData.rawValues.rhr.toString(),
        hrv: initialData.rawValues.hrv.toString(),
        protein: initialData.rawValues.protein.toString(),
        gut: initialData.rawValues.gut,
        sun: initialData.rawValues.sun,
        exercise: initialData.rawValues.exercise,
        cognition: initialData.rawValues.cognition,
        symptomScore: initialData.symptomScore,
        symptomName: initialData.symptomName
      });
    } else {
      const defaults = getDefaultState(false);
      setFormData({ ...defaults, symptomScore: 1 });
    }
    setValidationState(getInitialValidationState());
  }, [initialData, getDefaultState]);

  // Enhanced sleep input with debounced validation
  const handleSleepChange = useCallback((val: string) => {
    const nums = val.replace(/\D/g, '');
    let formatted = nums;
    if (nums.length > 4) return;
    if (nums.length > 2) {
      formatted = `${nums.slice(0, 2)}:${nums.slice(2)}`;
    }
    
    setFormData(p => ({ ...p, sleep: formatted }));
  }, []);
  
  // Debounced validation effect for sleep
  useEffect(() => {
    const validation = validateTimeInput(debouncedFormData.sleep);
    setValidationState(prev => ({
      ...prev,
      sleep: {
        isValid: validation.isValid,
        error: validation.error,
        touched: prev.sleep.touched
      }
    }));
  }, [debouncedFormData.sleep]);

  const updateField = useCallback((field: keyof typeof formData, val: any) => {
    triggerHaptic();
    setFormData(p => ({ ...p, [field]: val }));
    
    // Mark field as touched immediately for better UX
    setValidationState(prev => ({
      ...prev,
      [field]: { ...prev[field], touched: true }
    }));
  }, []);

  // Optimized numeric input handler with debounced validation
  const handleNumericChange = useCallback((field: 'rhr' | 'hrv' | 'protein', value: string) => {
    setFormData(p => ({ ...p, [field]: value }));
  }, []);
  
  // Debounced validation effects for numeric fields
  useEffect(() => {
    const rules = VALIDATION_RULES.rhr;
    const validation = validateNumericInput(debouncedFormData.rhr, rules);
    setValidationState(prev => ({
      ...prev,
      rhr: {
        isValid: validation.isValid,
        error: validation.error,
        touched: prev.rhr.touched
      }
    }));
  }, [debouncedFormData.rhr]);
  
  useEffect(() => {
    const rules = VALIDATION_RULES.hrv;
    const validation = validateNumericInput(debouncedFormData.hrv, rules);
    setValidationState(prev => ({
      ...prev,
      hrv: {
        isValid: validation.isValid,
        error: validation.error,
        touched: prev.hrv.touched
      }
    }));
  }, [debouncedFormData.hrv]);
  
  useEffect(() => {
    const rules = VALIDATION_RULES.protein;
    const validation = validateNumericInput(debouncedFormData.protein, rules);
    setValidationState(prev => ({
      ...prev,
      protein: {
        isValid: validation.isValid,
        error: validation.error,
        touched: prev.protein.touched
      }
    }));
  }, [debouncedFormData.protein]);

  const handleSubmit = useCallback(() => {
    triggerHaptic();

    // Validate all fields before submission
    if (!isFormValidMemo) {
      // Mark all fields as touched to show errors
      setValidationState(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          updated[key] = { ...updated[key], touched: true };
        });
        return updated;
      });
      return;
    }

    // Auto-generate name if empty
    const finalName = formData.symptomName.trim() || `Log ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    // Use validated values
    const sleepValidation = validateTimeInput(formData.sleep);
    const decimalSleep = sleepValidation.value || 7.5;
    
    const processedState: Record<string, Flag> = {
      sleep: calculateFlag(decimalSleep, config.wearableBaselines.sleep),
      rhr: calculateFlag(parseInt(formData.rhr) || 60, config.wearableBaselines.rhr, true),
      hrv: calculateFlag(parseInt(formData.hrv) || 50, config.wearableBaselines.hrv),
      protein: calculateFlag(parseInt(formData.protein) || 80, config.manualTargets.protein),
      gut: formData.gut <= 2 ? 'RED' : formData.gut === 3 ? 'YELLOW' : 'GREEN',
      sun: formData.sun === 'None' ? 'RED' : formData.sun === 'Partial' ? 'YELLOW' : 'GREEN',
      exercise: formData.exercise === 'None' ? 'RED' : formData.exercise === 'Hard' ? 'GREEN' : 'YELLOW'
    };
    
    onSave({ 
      id: initialData?.id || crypto.randomUUID(),
      date: initialData?.date || getLocalDate(), 
      rawValues: { 
        ...formData, 
        sleep: decimalSleep, 
        rhr: parseInt(formData.rhr) || 60, 
        hrv: parseInt(formData.hrv) || 50, 
        protein: parseInt(formData.protein) || 80 
      }, 
      processedState, 
      symptomScore: formData.symptomScore, 
      symptomName: finalName
    });
  }, [formData, config, onSave, initialData, isFormValidMemo]);

  const cogOptions = [
    { id: 'PEAK', label: 'Peak', icon: Zap, bg: 'bg-teal-500', text: 'text-white' },
    { id: 'STEADY', label: 'Steady', icon: BrainCircuit, bg: 'bg-emerald-500', text: 'text-white' },
    { id: 'FOGGY', label: 'Foggy', icon: CloudFog, bg: 'bg-slate-500', text: 'text-white' },
    { id: 'DRAINED', label: 'Drained', icon: BatteryWarning, bg: 'bg-rose-500', text: 'text-white' },
  ];

  const sectionVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } }
  };

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      className="px-5 pb-40 pt-24 md:pt-32 space-y-10"
    >
      <header className="px-2 md:px-0">
        <h2 className="text-teal-400/50 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mb-2 font-outfit">Biological Registry</h2>
        <h1 className="text-5xl md:text-7xl font-black font-outfit tracking-tighter text-white">
          {initialData ? 'Update' : 'Sync'}
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        <div className="space-y-8">
          {/* NEURAL LOAD SECTION */}
          <motion.section variants={sectionVariants} className="glass rounded-[32px] p-6 md:p-8 space-y-6 border-white/5 shadow-xl">
            <div className="flex items-center gap-3">
              <Target size={20} className="text-teal-400" />
              <h3 className="text-[11px] font-black text-teal-300/40 uppercase tracking-[0.3em] font-outfit">Neural Load</h3>
              <Tooltip text="How intense are your symptoms today?" />
            </div>
            
            <div className="flex justify-between gap-2 p-1.5 bg-white/5 rounded-[24px]" role="radiogroup" aria-label="Neural load intensity from 1 to 5">
              {[1,2,3,4,5].map(v => {
                const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
                return (
                  <button 
                    key={v} 
                    onClick={() => {
                      updateField('symptomScore', v);
                      setValidationState(prev => ({
                        ...prev,
                        symptomScore: { isValid: true, touched: true }
                      }));
                    }} 
                    className={`flex-1 h-14 rounded-[18px] font-black text-lg transition-all active:scale-95 touch-manipulation ${formData.symptomScore === v ? `${colors[v-1]} text-white shadow-lg scale-105` : 'text-teal-300/20'}`}
                    role="radio"
                    aria-checked={formData.symptomScore === v}
                    aria-label={`Neural load level ${v} of 5`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            
            <input 
              placeholder="Log Name (Optional)" 
              value={formData.symptomName} 
              onChange={(e) => {
                const validation = validateTextInput(e.target.value);
                setFormData(p => ({...p, symptomName: e.target.value}));
                setValidationState(prev => ({
                  ...prev,
                  symptomName: {
                    isValid: validation.isValid,
                    error: validation.error,
                    touched: true
                  }
                }));
              }} 
              className="w-full bg-white/5 p-6 rounded-[24px] outline-none border border-white/5 focus:border-indigo-500/50 focus:bg-white/10 transition-all font-bold text-white text-xl placeholder:text-white/20" 
              aria-label="Log entry name"
              aria-describedby="log-name-help"
              maxLength={100}
            />
            <div id="log-name-help" className="sr-only">
              Optional name for this biometric entry. Will auto-generate if left empty.
            </div>
          </motion.section>

          {/* NUMERICAL METRICS GRID */}
          <motion.section variants={sectionVariants} className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div className={`glass rounded-[28px] p-6 text-center shadow-lg relative group transition-all ${
              validationState.sleep.touched && !validationState.sleep.isValid 
                ? 'border-red-500/50 bg-red-500/5 ring-2 ring-red-500/30' 
                : validationState.sleep.touched && validationState.sleep.isValid 
                ? 'border-green-500/50 bg-green-500/5 ring-2 ring-green-500/30' 
                : 'border-white/5 focus-within:ring-2 ring-indigo-500/30'
            }`}>
                <div className={`absolute inset-0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none ${
                  validationState.sleep.touched && !validationState.sleep.isValid 
                    ? 'bg-red-500/10' 
                    : validationState.sleep.touched && validationState.sleep.isValid 
                    ? 'bg-green-500/10' 
                    : 'bg-indigo-500/5'
                }`} />
                <div className="flex items-center justify-center gap-2 mb-3">
                  <label className={`text-[10px] font-black uppercase font-outfit tracking-widest ${
                    validationState.sleep.touched && !validationState.sleep.isValid 
                      ? 'text-red-400/70' 
                      : validationState.sleep.touched && validationState.sleep.isValid 
                      ? 'text-green-400/70' 
                      : 'text-indigo-400/30'
                  }`}>Sleep (HH:MM)</label>
                  <Tooltip text="Total hours and minutes of sleep last night" />
                  {validationState.sleep.touched && validationState.sleep.isValid && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  )}
                </div>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={formData.sleep} 
                  onChange={(e) => {
                    handleSleepChange(e.target.value);
                    setValidationState(prev => ({
                      ...prev,
                      sleep: { ...prev.sleep, touched: true }
                    }));
                  }} 
                  className={`w-full bg-transparent text-center text-3xl font-bold font-outfit outline-none placeholder:text-white/10 transition-colors ${
                    validationState.sleep.touched && !validationState.sleep.isValid 
                      ? 'text-red-400' 
                      : validationState.sleep.touched && validationState.sleep.isValid 
                      ? 'text-green-400' 
                      : 'text-white'
                  }`}
                  placeholder="00:00"
                  aria-label="Sleep duration in hours and minutes"
                  aria-invalid={validationState.sleep.touched && !validationState.sleep.isValid}
                  aria-describedby={validationState.sleep.error ? 'sleep-error' : undefined}
                />
                {validationState.sleep.touched && validationState.sleep.error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    id="sleep-error" 
                    className="text-red-400 text-xs mt-2 font-medium bg-red-500/10 px-3 py-1 rounded-lg"
                  >
                    {validationState.sleep.error}
                  </motion.div>
                )}
            </div>
            {[
              { k: 'rhr', l: 'RHR', t: 'numeric', tip: 'Resting heart rate (BPM)' },
              { k: 'hrv', l: 'HRV', t: 'numeric', tip: 'Heart rate variability' },
              { k: 'protein', l: 'Protein (g)', t: 'numeric', tip: 'Protein intake today' }
            ].map(i => (
              <div key={i.k} className={`glass rounded-[28px] p-6 text-center shadow-lg relative group transition-all ${
                validationState[i.k]?.touched && !validationState[i.k]?.isValid 
                  ? 'border-red-500/50 bg-red-500/5 ring-2 ring-red-500/30' 
                  : validationState[i.k]?.touched && validationState[i.k]?.isValid 
                  ? 'border-green-500/50 bg-green-500/5 ring-2 ring-green-500/30' 
                  : 'border-white/5 focus-within:ring-2 ring-indigo-500/30'
              }`}>
                <div className={`absolute inset-0 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none ${
                  validationState[i.k]?.touched && !validationState[i.k]?.isValid 
                    ? 'bg-red-500/10' 
                    : validationState[i.k]?.touched && validationState[i.k]?.isValid 
                    ? 'bg-green-500/10' 
                    : 'bg-indigo-500/5'
                }`} />
                <div className="flex items-center justify-center gap-2 mb-3">
                  <label className={`text-[10px] font-black uppercase font-outfit tracking-widest ${
                    validationState[i.k]?.touched && !validationState[i.k]?.isValid 
                      ? 'text-red-400/70' 
                      : validationState[i.k]?.touched && validationState[i.k]?.isValid 
                      ? 'text-green-400/70' 
                      : 'text-indigo-400/30'
                  }`}>{i.l}</label>
                  <Tooltip text={i.tip} />
                  {validationState[i.k]?.touched && validationState[i.k]?.isValid && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  )}
                </div>
                <input 
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  value={(formData as any)[i.k]} 
                  onChange={(e) => {
                    handleNumericChange(i.k as 'rhr' | 'hrv' | 'protein', e.target.value);
                    setValidationState(prev => ({
                      ...prev,
                      [i.k]: { ...prev[i.k], touched: true }
                    }));
                  }} 
                  className={`w-full bg-transparent text-center text-3xl font-bold font-outfit outline-none placeholder:text-white/10 transition-colors ${
                    validationState[i.k]?.touched && !validationState[i.k]?.isValid 
                      ? 'text-red-400' 
                      : validationState[i.k]?.touched && validationState[i.k]?.isValid 
                      ? 'text-green-400' 
                      : 'text-white'
                  }`}
                  aria-label={`${i.l} input`}
                  aria-invalid={validationState[i.k]?.touched && !validationState[i.k]?.isValid}
                  aria-describedby={validationState[i.k]?.error ? `${i.k}-error` : undefined}
                />
                {validationState[i.k]?.touched && validationState[i.k]?.error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    id={`${i.k}-error`} 
                    className="text-red-400 text-xs mt-2 font-medium bg-red-500/10 px-3 py-1 rounded-lg"
                  >
                    {validationState[i.k]?.error}
                  </motion.div>
                )}
              </div>
            ))}
          </motion.section>
        </div>

        <div className="space-y-8">
          {/* BEHAVIORAL & COGNITIVE SECTION */}
          <motion.section variants={sectionVariants} className="glass rounded-[32px] p-8 space-y-8 border-white/5 shadow-xl h-full flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-purple-200/40 uppercase tracking-[0.2em] flex items-center gap-2"><BrainCircuit size={14} className="text-purple-400"/> Cognitive State</label>
                <Tooltip text="Current mental clarity and focus level" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {cogOptions.map(opt => (
                  <button 
                    key={opt.id} 
                    onClick={() => updateField('cognition', opt.id)}
                    className={`
                      relative p-5 rounded-[24px] flex flex-col items-center gap-3 transition-all overflow-hidden active:scale-95 touch-manipulation
                      ${formData.cognition === opt.id ? `${opt.bg} ${opt.text} shadow-xl scale-[1.02]` : 'bg-white/5 text-white/30 hover:bg-white/10'}
                    `}
                  >
                     <opt.icon size={24} />
                     <span className="text-[11px] font-black uppercase tracking-widest">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-green-200/40 uppercase tracking-widest flex items-center gap-2"><Coffee size={14} className="text-green-400"/> Gut Stability</label>
                  <Tooltip text="How healthy is your digestion?" />
                </div>
                <span className="text-green-400 font-bold">{formData.gut}/5</span>
              </div>
              <div className="flex justify-between gap-2 p-1.5 bg-white/5 rounded-[24px]">
                {[1,2,3,4,5].map(v => {
                  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
                  return (
                    <button key={v} onClick={() => updateField('gut', v)} className={`flex-1 h-12 rounded-[18px] font-black text-lg transition-all active:scale-95 touch-manipulation ${formData.gut === v ? `${colors[v-1]} text-white shadow-lg scale-105` : 'text-green-300/20'}`}>{v}</button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-yellow-200/40 uppercase tracking-widest flex items-center gap-2"><Sun size={14} className="text-yellow-400"/> Solar Capture</label>
                <Tooltip text="Sunlight exposure duration today" />
              </div>
              <div className="flex gap-3">
                {['None', 'Partial', 'Full'].map((s, idx) => {
                  const colors = ['bg-red-500', 'bg-yellow-500', 'bg-green-500'];
                  return (
                    <button key={s} onClick={() => updateField('sun', s)} className={`flex-1 py-4 rounded-2xl text-[11px] font-black transition-all active:scale-95 touch-manipulation ${formData.sun === s ? `${colors[idx]} text-white shadow-lg` : 'bg-white/5 text-white/30'}`}>{s.toUpperCase()}</button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-red-200/40 uppercase tracking-widest flex items-center gap-2"><Dumbbell size={14} className="text-red-400"/> Exertion</label>
                <Tooltip text="Physical activity intensity today" />
              </div>
              <div className="flex gap-3">
                {['None', 'Low', 'Medium', 'Hard'].map((e, idx) => {
                  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
                  return (
                    <button key={e} onClick={() => updateField('exercise', e)} className={`flex-1 py-4 rounded-2xl text-[11px] font-black transition-all active:scale-95 touch-manipulation ${formData.exercise === e ? `${colors[idx]} text-white shadow-lg` : 'bg-white/5 text-white/30'}`}>{e.toUpperCase()}</button>
                  );
                })}
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      <motion.button 
         variants={sectionVariants}
         whileTap={{ scale: 0.95 }}
         onClick={handleSubmit} 
         disabled={!isFormValidMemo}
         className={`w-full py-8 md:py-10 font-black rounded-[32px] md:rounded-[40px] text-xl md:text-2xl shadow-2xl transition-all font-outfit uppercase tracking-wider relative overflow-hidden touch-manipulation flex items-center justify-center gap-4 ${
           isFormValidMemo 
             ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:shadow-teal-500/40' 
             : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
         }`}
         aria-label={initialData ? 'Update biometric entry' : 'Save new biometric entry'}
         aria-describedby="submit-help"
      >
        <span className="relative z-10">{initialData ? 'UPDATE ENTRY' : 'COMMIT BIOMETRIC BASELINE'}</span>
        {initialData && <RefreshCw size={24} className="relative z-10" />}
        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
      </motion.button>
      
      <div id="submit-help" className="sr-only">
        {isFormValidMemo 
          ? 'All fields are valid. Click to save your biometric data.' 
          : 'Please fix the errors above before submitting.'}
      </div>
    </motion.div>
  );
});