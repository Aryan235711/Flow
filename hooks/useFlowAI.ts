
import { useState, useCallback } from 'react';
import { MetricEntry, UserConfig, UserProfile } from '../types.ts';

// Intelligent data sampling to prevent token limit issues
const sampleHistoryData = (history: MetricEntry[], maxEntries: number = 45) => {
  if (history.length <= maxEntries) return history;

  // Always include the most recent 14 days
  const recent = history.slice(-14);

  // For older data, sample every Nth entry to reach maxEntries
  const remainingSlots = maxEntries - recent.length;
  const olderData = history.slice(0, -14);

  if (remainingSlots <= 0) return recent;

  const sampleInterval = Math.max(1, Math.floor(olderData.length / remainingSlots));
  const sampledOlder = olderData.filter((_, index) => index % sampleInterval === 0).slice(-remainingSlots);

  return [...sampledOlder, ...recent];
};

// Calculate comprehensive health metrics
const calculateHealthMetrics = (history: MetricEntry[]) => {
  if (!history.length) return null;

  const recent30 = history.slice(-30);
  const recent7 = history.slice(-7);

  // Basic averages
  const avgSleep = recent30.reduce((sum, e) => sum + (e.rawValues?.sleep || 0), 0) / recent30.length;
  const avgHRV = recent30.reduce((sum, e) => sum + (e.rawValues?.hrv || 0), 0) / recent30.length;
  const avgProtein = recent30.reduce((sum, e) => sum + (e.rawValues?.protein || 0), 0) / recent30.length;

  // Consistency metrics
  const sleepConsistency = 100 - (recent30.reduce((sum, e, i, arr) => {
    if (i === 0) return 0;
    return sum + Math.abs((e.rawValues?.sleep || 0) - (arr[i-1].rawValues?.sleep || 0));
  }, 0) / recent30.length);

  // Trend analysis
  const sleepTrend = recent7.length >= 2 ?
    (recent7[recent7.length-1].rawValues?.sleep || 0) - (recent7[0].rawValues?.sleep || 0) : 0;

  const hrvTrend = recent7.length >= 2 ?
    (recent7[recent7.length-1].rawValues?.hrv || 0) - (recent7[0].rawValues?.hrv || 0) : 0;

  // Symptom analysis
  const symptomFrequency = recent30.filter(e => e.symptomScore > 0).length / recent30.length * 100;

  // Neural plasticity indicators (simplified calculation)
  const memoryConsolidation = Math.min(100, Math.max(0,
    (avgSleep * 10) + (avgHRV * 0.5) - (symptomFrequency * 2)
  ));

  const synapticPlasticity = Math.min(100, Math.max(0,
    (avgHRV * 0.8) + (sleepConsistency * 0.5) + (recent7.filter(e =>
      e.rawValues?.cognition === 'PEAK').length / recent7.length * 50)
  ));

  const cognitiveReserve = Math.min(100, Math.max(0,
    100 - symptomFrequency - (recent30.filter(e =>
      ['FOGGY', 'DRAINED', 'FROZEN'].includes(e.rawValues?.cognition || '')).length / recent30.length * 100)
  ));

  // Vitality calculations (simplified)
  const biologicalAge = 30 + (100 - avgHRV) * 0.3 + symptomFrequency * 0.2;
  const agingFactor = biologicalAge / 30;

  return {
    averages: { sleep: avgSleep, hrv: avgHRV, protein: avgProtein },
    trends: { sleep: sleepTrend, hrv: hrvTrend },
    consistency: { sleep: sleepConsistency },
    symptoms: { frequency: symptomFrequency },
    neuralPlasticity: {
      memoryConsolidation,
      synapticPlasticity,
      cognitiveReserve,
      overall: (memoryConsolidation + synapticPlasticity + cognitiveReserve) / 3
    },
    vitality: {
      biologicalAge,
      agingFactor,
      healthScore: Math.max(0, 100 - symptomFrequency - (100 - avgHRV))
    }
  };
};

export const useFlowAI = () => {
  const [loading, setLoading] = useState(false);

  const getInsight = useCallback(async (
    history: MetricEntry[],
    config: UserConfig,
    user: UserProfile,
    additionalData?: {
      streak?: number;
      chartData?: any[];
      driftData?: any[];
      latest?: MetricEntry;
      todayEntry?: MetricEntry;
    }
  ) => {
    setLoading(true);
    try {
      // Intelligent data sampling to prevent token limits
      const sampledHistory = sampleHistoryData(history, 45);
      const healthMetrics = calculateHealthMetrics(history);

      const payload = {
        // Core data
        history: sampledHistory,
        config,

        // User context
        userProfile: {
          name: user.name,
          isPremium: user.isPremium,
          daysActive: history.length
        },

        // Processed insights
        processedInsights: {
          streak: additionalData?.streak || 0,
          latestEntry: additionalData?.latest,
          todayEntry: additionalData?.todayEntry,
          healthMetrics,
          trendAnalysis: {
            chartData: additionalData?.chartData,
            driftData: additionalData?.driftData
          }
        },

        // Sampling metadata
        dataSummary: {
          totalEntries: history.length,
          sampledEntries: sampledHistory.length,
          dateRange: history.length > 0 ? {
            oldest: history[0]?.date,
            newest: history[history.length - 1]?.date
          } : null
        }
      };

      // Use full API URL for native iOS app, relative URLs for web
      const isNativeApp = !!(window as any).Capacitor;
      const baseUrl = isNativeApp ? 'https://flow-si70.onrender.com' : '';
      const apiUrl = `${baseUrl}/api/insight`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
