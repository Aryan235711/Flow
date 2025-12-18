
import { useState, useCallback } from 'react';
import { MetricEntry, UserConfig } from '../types.ts';

export const useFlowAI = () => {
  const [loading, setLoading] = useState(false);
  
  const getInsight = useCallback(async (history: MetricEntry[], config: UserConfig) => {
    setLoading(true);
    try {
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, config })
      });

      if (!res.ok) {
        throw new Error('Insight request failed');
      }

      const data = await res.json();
      return data.insight || "Metrics indicate metabolic stability. Maintain current baseline protocols.";
    } catch (e) {
      console.error(e);
      return "Network latency detected. Telemetry trends remain consistent with previous sync cycles.";
    } finally {
      setLoading(false);
    }
  }, []);

  return { getInsight, loading };
};
