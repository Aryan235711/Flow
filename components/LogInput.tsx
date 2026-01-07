import React, { useState, useCallback, memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Coffee, Sun, Dumbbell, Zap, CloudFog, BatteryWarning, BrainCircuit, RefreshCw, Info } from 'lucide-react';
import { MetricEntry, UserConfig, Flag } from '../types.ts';
import { calculateFlag, triggerHaptic, getLocalDate } from '../utils.ts';

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
}

export const LogInput = memo(({ config, onSave, initialData }: LogInputProps) => {
  // Default State
  const defaultState = { 
    sleep: '07:30', rhr: '65', hrv: '50', protein: '80', 
    gut: 4, sun: 'Full', exercise: 'Medium', cognition: 'STEADY',
    symptomScore: 1, symptomName: '' 
  };

  const [formData, setFormData] = useState(defaultState);

  // Hydrate form if editing
  useEffect(() => {
    const freshDefault = {
      sleep: '',
      rhr: '',
      hrv: '',
      protein: '',
      gut: 0,
      sun: 0,
      exercise: 0,
      cognition: 0,
      symptomScore: 0,
      symptomName: ''
    };
    
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
      setFormData(freshDefault);
    }
  }, [initialData]);

  // Auto-masking for time input (HH:MM)
  const handleSleepChange = (val: string) => {
    const nums = val.replace(/\D/g, '');
    let formatted = nums;
    if (nums.length > 4) return; 
    if (nums.length > 2) {
      formatted = `${nums.slice(0, 2)}:${nums.slice(2)}`;
    }
    setFormData(p => ({ ...p, sleep: formatted }));
  };

  const updateField = (field: keyof typeof formData, val: any) => {
    triggerHaptic();
    setFormData(p => ({ ...p, [field]: val }));
  };

  const handleSubmit = useCallback(() => {
    triggerHaptic();

    // Auto-generate name if empty
    const finalName = formData.symptomName.trim() || `Log ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    // Robust parsing
    let [h, m] = formData.sleep.split(':').map(n => parseInt(n || '0', 10));
    if (isNaN(h)) h = 7;
    if (isNaN(m)) m = 0;
    
    // Clamp values
    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));
    
    const decimalSleep = h + (m / 60);
    
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
      // Keep original date if editing, else use today's LOCAL date
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
  }, [formData, config, onSave, initialData]);

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
            
            <div className="flex justify-between gap-2 p-1.5 bg-white/5 rounded-[24px]" role="radiogroup" aria-label="Load intensity">
              {[1,2,3,4,5].map(v => {
                const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
                return (
                  <button 
                    key={v} 
                    onClick={() => updateField('symptomScore', v)} 
                    className={`flex-1 h-14 rounded-[18px] font-black text-lg transition-all active:scale-95 touch-manipulation ${formData.symptomScore === v ? `${colors[v-1]} text-white shadow-lg scale-105` : 'text-teal-300/20'}`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
            
            <input 
              placeholder="Log Name (Optional)" 
              value={formData.symptomName} 
              onChange={(e) => setFormData(p => ({...p, symptomName: e.target.value}))} 
              className="w-full bg-white/5 p-6 rounded-[24px] outline-none border border-white/5 focus:border-indigo-500/50 focus:bg-white/10 transition-all font-bold text-white text-xl placeholder:text-white/20" 
            />
          </motion.section>

          {/* NUMERICAL METRICS GRID */}
          <motion.section variants={sectionVariants} className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div className="glass rounded-[28px] p-6 text-center border-white/5 shadow-lg relative group focus-within:ring-2 ring-indigo-500/30 transition-all">
                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                <div className="flex items-center justify-center gap-2 mb-3">
                  <label className="text-[10px] font-black text-indigo-400/30 uppercase font-outfit tracking-widest">Sleep (HH:MM)</label>
                  <Tooltip text="Total hours and minutes of sleep last night" />
                </div>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={formData.sleep} 
                  onChange={(e) => handleSleepChange(e.target.value)} 
                  className="w-full bg-transparent text-center text-3xl font-bold font-outfit outline-none text-white placeholder:text-white/10" 
                  placeholder="00:00"
                />
            </div>
            {[
              { k: 'rhr', l: 'RHR', t: 'numeric', tip: 'Resting heart rate (BPM)' },
              { k: 'hrv', l: 'HRV', t: 'numeric', tip: 'Heart rate variability' },
              { k: 'protein', l: 'Protein (g)', t: 'numeric', tip: 'Protein intake today' }
            ].map(i => (
              <div key={i.k} className="glass rounded-[28px] p-6 text-center border-white/5 shadow-lg relative group focus-within:ring-2 ring-indigo-500/30 transition-all">
                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                <div className="flex items-center justify-center gap-2 mb-3">
                  <label className="text-[10px] font-black text-indigo-400/30 uppercase font-outfit tracking-widest">{i.l}</label>
                  <Tooltip text={i.tip} />
                </div>
                <input 
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  value={(formData as any)[i.k]} 
                  onChange={(e) => setFormData(p => ({...p, [i.k]: e.target.value}))} 
                  className="w-full bg-transparent text-center text-3xl font-bold font-outfit outline-none text-white placeholder:text-white/10" 
                />
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
         className="w-full py-8 md:py-10 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-black rounded-[32px] md:rounded-[40px] text-xl md:text-2xl shadow-2xl transition-all font-outfit uppercase tracking-wider relative overflow-hidden touch-manipulation flex items-center justify-center gap-4 hover:shadow-teal-500/40"
      >
        <span className="relative z-10">{initialData ? 'UPDATE ENTRY' : 'COMMIT BIOMETRIC BASELINE'}</span>
        {initialData && <RefreshCw size={24} className="relative z-10" />}
        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
      </motion.button>
    </motion.div>
  );
});