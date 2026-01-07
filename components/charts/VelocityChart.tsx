import React, { memo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, Tooltip, XAxis, ReferenceLine, YAxis } from 'recharts';

export const VelocityChart = memo(({ data, proteinGoal }: { data: any[], proteinGoal: number }) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-white/10 text-xs">NO VELOCITY DATA</div>;
  
  // Ensure we always have at least 5 slots for visual balance, even if empty
  const displayData = data.length < 5
    ? [...Array(5 - data.length).fill({ day: '', protein: 0, exertion: 0 }), ...data]
    : data;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={displayData} margin={{ top: 20, bottom: 5, left: -20, right: 10 }}>
        <defs>
          <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.2}/>
          </linearGradient>
          <linearGradient id="barActive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
            <stop offset="100%" stopColor="#34d399" stopOpacity={0.8}/>
          </linearGradient>
        </defs>
        
        <Tooltip 
          cursor={{ fill: 'transparent', stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }}
          contentStyle={{ 
            background: 'rgba(2, 6, 23, 0.9)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '16px', 
            color: '#fff', 
            fontSize: '10px',
            padding: '4px 8px',
            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.8)' 
          }} 
          itemStyle={{ color: 'rgba(255,255,255,0.7)', padding: 0 }}
          labelFormatter={() => ''}
          animationDuration={200}
        />
        
        <XAxis 
          dataKey="day" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, fontFamily: 'Outfit' }} 
          dy={10}
        />
        
        {/* Hidden YAxis to ensure scale matches protein goal if it's high */}
        <YAxis hide domain={[0, (dataMax: number) => Math.max(dataMax, proteinGoal + 20)]} />
        
        <ReferenceLine y={proteinGoal} stroke="rgba(16, 185, 129, 0.3)" strokeDasharray="3 3" strokeWidth={1} />
        
        <Bar 
          dataKey="protein" 
          fill="url(#barG)" 
          radius={[8, 8, 8, 8]} 
          barSize={32} // Reduced for mobile safety
          isAnimationActive={true} 
          animationDuration={1500}
          animationBegin={200}
          animationEasing="ease-out"
          activeBar={{ fill: "url(#barActive)", stroke: "#fff", strokeWidth: 1.5, radius: 8 }}
        />
        <Line 
          type="monotone" 
          dataKey="exertion" 
          stroke="#818cf8" 
          strokeWidth={3} 
          dot={{ r: 4, fill: '#0a1128', stroke: '#818cf8', strokeWidth: 2 }} 
          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: "#6366f1" }}
          isAnimationActive={true}
          animationDuration={2000}
          animationBegin={500}
          animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});