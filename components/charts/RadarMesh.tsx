import React, { memo, useMemo } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';
import { MetricEntry } from '../../types.ts';

export const RadarMesh = memo(({ latest }: { latest?: MetricEntry }) => {
  if (!latest) return <div className="h-full flex items-center justify-center text-white/10 text-xs">NO MESH DATA</div>;
  
  const data = useMemo(() => [
    { subject: 'Sleep', A: latest.processedState?.sleep === 'GREEN' ? 100 : latest.processedState?.sleep === 'YELLOW' ? 70 : 40, fullMark: 100 },
    { subject: 'Sun', A: latest.processedState?.sun === 'GREEN' ? 100 : latest.processedState?.sun === 'YELLOW' ? 70 : 40, fullMark: 100 },
    { subject: 'HRV', A: latest.processedState?.hrv === 'GREEN' ? 100 : latest.processedState?.hrv === 'YELLOW' ? 70 : 40, fullMark: 100 },
    { subject: 'Gut', A: latest.processedState?.gut === 'GREEN' ? 100 : latest.processedState?.gut === 'YELLOW' ? 70 : 40, fullMark: 100 },
    { subject: 'Move', A: latest.processedState?.exercise === 'GREEN' ? 100 : latest.processedState?.exercise === 'YELLOW' ? 70 : 40, fullMark: 100 },
  ], [latest]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
        <defs>
          <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.9}/>
            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.3}/>
          </linearGradient>
        </defs>
        
        <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.08)" />
        
        <PolarAngleAxis 
          dataKey="subject" 
          tick={{ fill: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 800, fontFamily: 'Outfit' }} 
        />
        
        <Tooltip
          cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const val = payload[0].value;
              const status = val === 100 ? 'OPTIMAL' : val === 70 ? 'ADEQUATE' : 'DEFICIT';
              return (
                 <div className="bg-[#0a1128] border border-white/10 p-2 rounded-xl shadow-xl backdrop-blur-md">
                   <p className="text-[9px] font-black text-amber-400 font-outfit uppercase tracking-widest">{payload[0].payload.subject}: {status}</p>
                 </div>
              );
            }
            return null;
          }}
        />

        <Radar
          name="Alignment"
          dataKey="A"
          stroke="#fbbf24"
          strokeWidth={3}
          fill="url(#radarFill)"
          fillOpacity={0.6}
          isAnimationActive={true}
          animationDuration={1500}
          animationEasing="ease-out"
        />
      </RadarChart>
    </ResponsiveContainer>
  );
});