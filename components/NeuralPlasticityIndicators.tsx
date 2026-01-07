import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricEntry, UserConfig } from '../types.ts';

interface NeuralPlasticityIndicatorsProps {
  history: MetricEntry[];
  config: UserConfig;
}

interface DailyPlasticityData {
  date: string;
  displayDate: string;
  memoryConsolidation: number;
  synapticPlasticity: number;
  cognitiveReserve: number;
  neuroplasticityIndex: number;
  total: number;
}

const generateSampleData = (): DailyPlasticityData[] => {
  const sampleData: DailyPlasticityData[] = [];
  for (let i = 7; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    sampleData.push({
      date: date.toISOString().split('T')[0],
      displayDate: date.getDate().toString(),
      memoryConsolidation: Math.floor(Math.random() * 40) + 60,
      synapticPlasticity: Math.floor(Math.random() * 40) + 60,
      cognitiveReserve: Math.floor(Math.random() * 40) + 60,
      neuroplasticityIndex: Math.floor(Math.random() * 40) + 60,
      total: 0
    });
  }
  return sampleData.map(item => ({ ...item, total: item.memoryConsolidation + item.synapticPlasticity + item.cognitiveReserve + item.neuroplasticityIndex }));
};

const calculateDailyPlasticity = (dayData: MetricEntry[], config: UserConfig): DailyPlasticityData | null => {

  // Use the same calculation logic as before but for a single day's data
  const recentData = dayData.slice(-7).filter(e => e?.rawValues); // Use last 7 entries for stability
  if (recentData.length === 0) return null;

  // Memory Consolidation (Sleep + HRV)
  const sleepScores = recentData.map(entry => {
    const sleepHours = entry.rawValues.sleep;
    const hrv = entry.rawValues.hrv;
    const sleepQuality = Math.max(0, Math.min(100, 100 - Math.abs(sleepHours - 8) * 20));
    const hrvScore = Math.min(100, hrv * 2);
    return (sleepQuality * 0.7) + (hrvScore * 0.3);
  });
  const memoryConsolidation = sleepScores.length > 0 ? Math.round(sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length) : 50;

  // Synaptic Plasticity (HRV Variability + Cognitive State)
  const hrvVariability = recentData.length > 1 ?
    recentData.slice(1).reduce((acc, entry, i) => {
      const prev = recentData[i].rawValues.hrv;
      const curr = entry.rawValues.hrv;
      return acc + Math.abs(curr - prev);
    }, 0) / (recentData.length - 1) : 0;

  const cognitiveStates = recentData.map(entry => {
    const state = entry.rawValues.cognition;
    switch (state) {
      case 'PEAK': return 100;
      case 'STEADY': return 85;
      case 'FOGGY': return 60;
      case 'DRAINED': return 40;
      case 'FROZEN': return 20;
      default: return 70;
    }
  });
  const avgCognitiveState = cognitiveStates.reduce((a, b) => a + b, 0) / cognitiveStates.length;
  const hrvVariabilityScore = Math.min(100, hrvVariability * 5);
  const synapticPlasticity = Math.round((avgCognitiveState * 0.6) + (hrvVariabilityScore * 0.4));

  // Cognitive Reserve (Consistency + Recovery)
  const consistencyScore = Math.min(100, (recentData.length / 7) * 100);
  const recoveryPatterns = recentData.map((entry, i) => {
    if (i === 0) return 100;
    const prevSleep = recentData[i-1].rawValues.sleep;
    const currSleep = entry.rawValues.sleep;
    const sleepRecovery = Math.max(0, Math.min(100, 100 - Math.abs(currSleep - prevSleep) * 10));
    const prevHrv = recentData[i-1].rawValues.hrv;
    const currHrv = entry.rawValues.hrv;
    const hrvRecovery = Math.max(0, Math.min(100, 100 - Math.abs(currHrv - prevHrv) * 2));
    return (sleepRecovery * 0.5) + (hrvRecovery * 0.5);
  });
  const avgRecovery = recoveryPatterns.reduce((a, b) => a + b, 0) / recoveryPatterns.length;
  const cognitiveReserve = Math.round((consistencyScore * 0.4) + (avgRecovery * 0.6));

  // Neuroplasticity Index (Weighted combination)
  const neuroplasticityIndex = Math.round(
    (memoryConsolidation * 0.35) +
    (synapticPlasticity * 0.35) +
    (cognitiveReserve * 0.30)
  );

  const total = memoryConsolidation + synapticPlasticity + cognitiveReserve + neuroplasticityIndex;

  return {
    date: dayData[0]?.date || '',
    displayDate: new Date(dayData[0]?.date || '').getDate().toString(),
    memoryConsolidation,
    synapticPlasticity,
    cognitiveReserve,
    neuroplasticityIndex,
    total
  };
};

const getPlasticityColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-teal-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
};

export const NeuralPlasticityIndicators: React.FC<NeuralPlasticityIndicatorsProps> = memo(({
  history,
  config
}) => {
  const trendData = useMemo(() => {
    if (!history || history.length === 0) {
      return []; // Return empty array to show fallback message
    }

    // Group entries by date (YYYY-MM-DD format)
    const groupedByDate = history.reduce((acc, entry) => {
      if (!entry?.date) return acc;

      const dateKey = entry.date.split('T')[0]; // Extract YYYY-MM-DD
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(entry);
      return acc;
    }, {} as Record<string, MetricEntry[]>);

    // Get last 10 days
    const last10Days = Object.keys(groupedByDate)
      .sort()
      .slice(-10)
      .map(date => groupedByDate[date]);

    // Calculate daily plasticity for each day
    const dailyData = last10Days
      .map(dayData => calculateDailyPlasticity(dayData, config))
      .filter(Boolean) as DailyPlasticityData[];

    if (dailyData.length === 0) {
      return generateSampleData(); // Generate sample data if we have history but no valid calculations
    }

    // Sort by date ascending for chart
    const sortedData = dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sortedData;
  }, [history, config]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="h-full flex flex-col"
    >
      {/* Chart Container */}
      <div className="flex-1 p-4">
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={trendData}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
            >
                <defs>
                  {/* Memory Consolidation Gradients - Changed to blue */}
                  <linearGradient id="memoryG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="memoryActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.8}/>
                  </linearGradient>

                  {/* Synaptic Plasticity Gradients - Keep teal but make it more distinct */}
                  <linearGradient id="synapticG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="synapticActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.8}/>
                  </linearGradient>

                  {/* Cognitive Reserve Gradients */}
                  <linearGradient id="cognitiveG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="cognitiveActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.8}/>
                  </linearGradient>

                  {/* Neuroplasticity Index Gradients */}
                  <linearGradient id="neuroG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="neuroActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.6)' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  label={{ value: 'Score', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: 'rgba(255,255,255,0.6)', fontSize: 9 } }}
                />
                <YAxis
                  type="category"
                  dataKey="displayDate"
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.6)' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  width={25}
                />
                <Tooltip
                  cursor={{ fill: 'transparent', stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
                      const status = total >= 320 ? 'EXCELLENT' : total >= 280 ? 'GOOD' : total >= 200 ? 'MODERATE' : 'NEEDS WORK';
                      const color = total >= 320 ? 'text-emerald-400' : total >= 280 ? 'text-blue-400' : total >= 200 ? 'text-amber-400' : 'text-rose-400';
                      return (
                         <div className="bg-[#0a1128] border border-white/10 p-2 rounded-xl shadow-xl backdrop-blur-md">
                           <p className={`text-[9px] font-black ${color} font-outfit uppercase tracking-widest`}>{status}: {total}</p>
                         </div>
                      );
                    }
                    return null;
                  }}
                  animationDuration={150}
                />

                {/* Stack from lowest (top) to highest (bottom) - memoryConsolidation tends lowest, neuroplasticityIndex tends highest */}
                <Bar dataKey="memoryConsolidation" stackId="neural" fill="url(#memoryG)" name="Memory Consolidation" barSize={32}
                     radius={[8, 8, 8, 8]} isAnimationActive={true} animationDuration={1500} animationBegin={200} animationEasing="ease-out"
                     activeBar={{ fill: "url(#memoryActive)", stroke: "#fff", strokeWidth: 1.5, radius: 8 }} />
                <Bar dataKey="synapticPlasticity" stackId="neural" fill="url(#synapticG)" name="Synaptic Plasticity" barSize={32}
                     radius={[8, 8, 8, 8]} isAnimationActive={true} animationDuration={1500} animationBegin={400} animationEasing="ease-out"
                     activeBar={{ fill: "url(#synapticActive)", stroke: "#fff", strokeWidth: 1.5, radius: 8 }} />
                <Bar dataKey="cognitiveReserve" stackId="neural" fill="url(#cognitiveG)" name="Cognitive Reserve" barSize={32}
                     radius={[8, 8, 8, 8]} isAnimationActive={true} animationDuration={1500} animationBegin={600} animationEasing="ease-out"
                     activeBar={{ fill: "url(#cognitiveActive)", stroke: "#fff", strokeWidth: 1.5, radius: 8 }} />
                <Bar dataKey="neuroplasticityIndex" stackId="neural" fill="url(#neuroActive)" name="Neuroplasticity Index" barSize={32}
                     radius={[8, 8, 8, 8]} isAnimationActive={true} animationDuration={1500} animationBegin={800} animationEasing="ease-out"
                     activeBar={{ fill: "url(#neuroActive)", stroke: "#fff", strokeWidth: 1.5, radius: 8 }} />
              </BarChart>
            </ResponsiveContainer>

        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <p className="text-xs text-white/50">Need more data for trend analysis</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 pb-3 flex justify-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
          <span className="text-[9px] text-white/60">Memory</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
          <span className="text-[9px] text-white/60">Synaptic</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          <span className="text-[9px] text-white/60">Cognitive</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-rose-400"></div>
          <span className="text-[9px] text-white/60">Neuro</span>
        </div>
      </div>
    </motion.div>
  );
});