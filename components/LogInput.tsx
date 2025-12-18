import React, { useState, useCallback, memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Coffee, Sun, Dumbbell, Zap, CloudFog, BatteryWarning, BrainCircuit, RefreshCw } from 'lucide-react';
import { MetricEntry, UserConfig, Flag } from '../types.ts';
import { calculateFlag, triggerHaptic, getLocalDate } from '../utils.ts';

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
      setFormData(defaultState);
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
    { id: 'PEAK', label: 'Peak', icon: Zap, bg: 'bg-indigo-500', text: 'text-white' },
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
      className="px-5 pb-40 pt-24 space-y-8"
    >
      <header className="px-2">
        <h2 className="text-indigo-400/50 text-[10px] font-black uppercase tracking-[0.4em] mb-1 font-outfit">Biological Registry</h2>
        <h1 className="text-5xl font-black font-outfit tracking-tighter text-white">
          {initialData ? 'Update' : 'Sync'}
        </h1>
      </header>

      <motion.section variants={sectionVariants} className="glass rounded-[32px] p-6 space-y-6 border-white/5 shadow-xl">
        <div className="flex items-center gap-3"><Target size={18} className="text-indigo-400" /><h3 className="text-[10px] font-black text-indigo-300/40 uppercase tracking-[0.3em] font-outfit">Neural Load</h3></div>
        
        <div className="flex justify-between gap-2 p-1.5 bg-white/5 rounded-[24px]" role="radiogroup" aria-label="Load intensity">
          {[1,2,3,4,5].map(v => (
            <button 
              key={v} 
              onClick={() => updateField('symptomScore', v)} 
              className={`flex-1 h-12 rounded-[18px] font-black transition-all active:scale-95 touch-manipulation ${formData.symptomScore === v ? 'bg-indigo-500 text-white shadow-lg scale-105' : 'text-indigo-300/20'}`}
            >
              {v}
            </button>
          ))}
        </div>
        
        <input 
          placeholder="Log Name (Optional)" 
          value={formData.symptomName} 
          onChange={(e) => setFormData(p => ({...p, symptomName: e.target.value}))} 
          className="w-full bg-white/5 p-5 rounded-[24px] outline-none border border-white/5 focus:border-indigo-500/50 focus:bg-white/10 transition-all font-bold text-white text-lg placeholder:text-white/20" 
        />
      </motion.section>

      <motion.section variants={sectionVariants} className="grid grid-cols-2 gap-4">
        <div className="glass rounded-[28px] p-5 text-center border-white/5 shadow-lg relative overflow-hidden group focus-within:scale-[1.02] transition-transform">
            <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
            <label className="text-[9px] font-black text-indigo-400/30 uppercase mb-2 block font-outfit tracking-widest">Sleep (HH:MM)</label>
            <input 
              type="text" 
              inputMode="decimal"
              value={formData.sleep} 
              onChange={(e) => handleSleepChange(e.target.value)} 
              className="w-full bg-transparent text-center text-2xl font-bold font-outfit outline-none text-white placeholder:text-white/10" 
              placeholder="00:00"
            />
        </div>
        {[
          { k: 'rhr', l: 'RHR', t: 'numeric' },
          { k: 'hrv', l: 'HRV', t: 'numeric' },
          { k: 'protein', l: 'Protein (g)', t: 'numeric' }
        ].map(i => (
          <div key={i.k} className="glass rounded-[28px] p-5 text-center border-white/5 shadow-lg relative overflow-hidden group focus-within:scale-[1.02] transition-transform">
            <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
            <label className="text-[9px] font-black text-indigo-400/30 uppercase mb-2 block font-outfit tracking-widest">{i.l}</label>
            <input 
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              value={(formData as any)[i.k]} 
              onChange={(e) => setFormData(p => ({...p, [i.k]: e.target.value}))} 
              className="w-full bg-transparent text-center text-2xl font-bold font-outfit outline-none text-white placeholder:text-white/10" 
            />
          </div>
        ))}
      </motion.section>

      <motion.section variants={sectionVariants} className="glass rounded-[32px] p-6 space-y-7 border-white/5 shadow-xl">
        <div className="space-y-4">
          <label className="text-[9px] font-black text-indigo-200/40 uppercase tracking-widest flex items-center gap-2"><BrainCircuit size={12}/> Cognitive State</label>
          <div className="grid grid-cols-2 gap-3">
            {cogOptions.map(opt => (
              <button 
                key={opt.id} 
                onClick={() => updateField('cognition', opt.id)}
                className={`
                  relative p-4 rounded-[20px] flex flex-col items-center gap-2 transition-all overflow-hidden active:scale-95 touch-manipulation
                  ${formData.cognition === opt.id ? `${opt.bg} ${opt.text} shadow-lg scale-[1.02]` : 'bg-white/5 text-white/30 hover:bg-white/10'}
                `}
              >
                 <opt.icon size={22} />
                 <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center"><label className="text-[9px] font-black text-indigo-200/40 uppercase tracking-widest flex items-center gap-2"><Coffee size={12}/> Gut Stability</label><span className="text-indigo-400 font-bold">{formData.gut}/5</span></div>
          <div className="flex gap-2 h-10">
            {[1,2,3,4,5].map(v => (
              <button key={v} onClick={() => updateField('gut', v)} className={`flex-1 rounded-xl transition-all active:scale-95 touch-manipulation ${formData.gut >= v ? 'bg-indigo-500 shadow-sm' : 'bg-white/5'}`}></button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[9px] font-black text-indigo-200/40 uppercase tracking-widest flex items-center gap-2"><Sun size={12}/> Solar Capture</label>
          <div className="flex gap-2">
            {['None', 'Partial', 'Full'].map(s => (
              <button key={s} onClick={() => updateField('sun', s)} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black transition-all active:scale-95 touch-manipulation ${formData.sun === s ? 'bg-amber-500 text-black shadow-lg' : 'bg-white/5 text-white/30'}`}>{s.toUpperCase()}</button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[9px] font-black text-indigo-200/40 uppercase tracking-widest flex items-center gap-2"><Dumbbell size={12}/> Exertion</label>
          <div className="flex gap-2">
            {['None', 'Low', 'Medium', 'Hard'].map(e => (
              <button key={e} onClick={() => updateField('exercise', e)} className={`flex-1 py-3.5 rounded-2xl text-[9px] font-black transition-all active:scale-95 touch-manipulation ${formData.exercise === e ? 'bg-emerald-500 text-black shadow-lg' : 'bg-white/5 text-white/30'}`}>{e.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.button 
         variants={sectionVariants}
         whileTap={{ scale: 0.95 }}
         onClick={handleSubmit} 
         className="w-full py-7 bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white font-black rounded-[32px] text-xl shadow-2xl transition-all font-outfit uppercase tracking-wider relative overflow-hidden touch-manipulation flex items-center justify-center gap-3"
      >
        <span className="relative z-10">{initialData ? 'UPDATE ENTRY' : 'COMMIT BASELINE'}</span>
        {initialData && <RefreshCw size={20} className="relative z-10" />}
        <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
      </motion.button>
    </motion.div>
  );
});