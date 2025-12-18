
import React, { memo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';

interface DriftProps {
  data: any[];
}

export const CognitiveDriftChart = memo(({ data }: DriftProps) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-white/10 text-xs">NO COGNITIVE DATA</div>;

  const displayData = data.length < 3 
    ? [...Array(3 - data.length).fill({ day: '', value: 0 }), ...data]
    : data;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={displayData} margin={{ top: 10, bottom: 5, left: 0, right: 0 }}>
        <defs>
          <linearGradient id="cogGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f472b6" stopOpacity={0.6}/>
            <stop offset="95%" stopColor="#f472b6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Tooltip 
          cursor={{ stroke: '#f472b6', strokeWidth: 2, strokeDasharray: "4 4", opacity: 0.5 }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const val = payload[0].value;
              const label = val >= 90 ? 'PEAK' : val >= 70 ? 'STEADY' : val >= 30 ? 'FOGGY' : 'DRAINED';
              const color = val >= 90 ? 'text-indigo-400' : val >= 70 ? 'text-emerald-400' : 'text-rose-400';
              return (
                 <div className="bg-[#0a1128] border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md">
                   <p className={`text-[10px] font-black ${color} font-outfit uppercase tracking-widest`}>{label}</p>
                 </div>
              );
            }
            return null;
          }}
          animationDuration={150}
        />
        <XAxis 
          dataKey="day" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }} 
          dy={10}
          padding={{ left: 10, right: 10 }}
        />
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke="#f472b6" 
          strokeWidth={4} 
          fill="url(#cogGradient)" 
          isAnimationActive={true}
          animationDuration={2000}
          animationEasing="ease-in-out"
          activeDot={{ r: 6, stroke: 'white', strokeWidth: 2, fill: '#f472b6' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
