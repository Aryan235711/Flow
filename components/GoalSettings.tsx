
import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Target, Moon, Activity, Wind, Utensils } from 'lucide-react';
import { UserConfig } from '../types.ts';

interface GoalSettingsProps {
  config: UserConfig;
  onSave: (newConfig: UserConfig) => void;
  onClose: () => void;
}

export const GoalSettings = memo(({ config, onSave, onClose }: GoalSettingsProps) => {
  const [localConfig, setLocalConfig] = useState<UserConfig>(JSON.parse(JSON.stringify(config)));

  const handleChange = (section: keyof UserConfig, key: string, value: string) => {
    let numValue = parseFloat(value);

    // Enhanced validation with better error handling
    if (isNaN(numValue) || !isFinite(numValue)) {
      // Don't update if invalid input
      return;
    }

    // Stricter safety clamps with better bounds
    const clamps = {
      sleep: { min: 4, max: 12 },
      rhr: { min: 40, max: 120 },
      hrv: { min: 20, max: 150 },
      protein: { min: 20, max: 300 }
    };

    const clamp = clamps[key as keyof typeof clamps];
    if (clamp) {
      numValue = Math.min(clamp.max, Math.max(clamp.min, numValue));
    }

    setLocalConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: numValue
      }
    }));
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  return (
    <motion.div 
      initial={{ y: '100%' }} 
      animate={{ y: 0 }} 
      exit={{ y: '100%' }} 
      transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
      className="fixed inset-0 z-[450] bg-[#020617] flex flex-col pt-safe"
    >
      <div className="w-full max-w-2xl mx-auto px-6 py-5 flex justify-between items-center border-b border-white/5 bg-[#020617]/95 backdrop-blur-xl z-20 shrink-0">
        <h2 className="text-2xl md:text-3xl font-black font-outfit tracking-tighter">Calibration</h2>
        <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 glass rounded-xl flex items-center justify-center text-white/50 active:scale-95 touch-manipulation">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 w-full max-w-2xl mx-auto overflow-y-auto px-6 py-6 space-y-8 pb-32">
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold font-outfit">Wearable Baselines</h3>
              <p className="text-xs md:text-sm text-white/40">Set your biometric thresholds.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass p-5 rounded-[24px] border-white/5 md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-teal-300/50 flex items-center gap-2">
                  <Moon size={12} /> Sleep Target (h)
                </label>
                <span className="text-xl font-bold font-outfit">{localConfig.wearableBaselines.sleep}</span>
              </div>
              <input 
                type="range" 
                min="4" 
                max="12" 
                step="0.1" 
                value={localConfig.wearableBaselines.sleep} 
                onChange={(e) => handleChange('wearableBaselines', 'sleep', e.target.value)}
                className="w-full accent-teal-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer touch-none" 
              />
            </div>

            <div className="glass p-5 rounded-[24px] border-white/5">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-teal-300/50 flex items-center gap-2">
                  <Activity size={12} /> RHR Baseline (bpm)
                </label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={localConfig.wearableBaselines.rhr} 
                  onChange={(e) => handleChange('wearableBaselines', 'rhr', e.target.value)}
                  className="bg-transparent text-right font-bold font-outfit text-lg outline-none w-20 text-white" 
                />
              </div>
              <p className="text-[10px] text-white/30">Resting Heart Rate baseline.</p>
            </div>

            <div className="glass p-5 rounded-[24px] border-white/5">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-teal-300/50 flex items-center gap-2">
                  <Wind size={12} /> HRV Baseline (ms)
                </label>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={localConfig.wearableBaselines.hrv} 
                  onChange={(e) => handleChange('wearableBaselines', 'hrv', e.target.value)}
                  className="bg-transparent text-right font-bold font-outfit text-lg outline-none w-20 text-white" 
                />
              </div>
              <p className="text-[10px] text-white/30">Heart Rate Variability target.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Utensils size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-outfit">Nutritional Targets</h3>
              <p className="text-xs text-white/40">Daily intake goals.</p>
            </div>
          </div>

          <div className="glass p-5 rounded-[24px] border-white/5">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-300/50 flex items-center gap-2">
                <Target size={12} /> Protein Goal (g)
              </label>
              <input 
                type="number" 
                inputMode="numeric"
                value={localConfig.manualTargets.protein} 
                onChange={(e) => handleChange('manualTargets', 'protein', e.target.value)}
                className="bg-transparent text-right font-bold font-outfit text-lg outline-none w-20 text-white" 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 pb-safe bg-gradient-to-t from-[#020617] via-[#020617] to-transparent z-30 flex justify-center">
        <button 
          onClick={handleSave} 
          className="w-full max-w-2xl py-5 bg-white text-black font-black rounded-[24px] text-lg shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-outfit touch-manipulation"
        >
          <Save size={20} /> SAVE CALIBRATION
        </button>
      </div>
    </motion.div>
  );
});
