
import React, { useState, useEffect, memo } from 'react';
import { ChartLoader } from './ChartLoader.tsx';

export const Deferred = memo(({ children }: { children: React.ReactNode }) => {
  const [render, setRender] = useState(false);
  
  useEffect(() => {
    // 300ms delay for a snappy "calculating" feel without sluggishness
    const timer = setTimeout(() => setRender(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!render) return <ChartLoader />;
  
  return (
    <div className="w-full h-full animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0">
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }`}</style>
      {children}
    </div>
  );
});
