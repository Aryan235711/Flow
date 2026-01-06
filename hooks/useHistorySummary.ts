import { useMemo } from 'react';
import { MetricEntry, UserConfig } from '../types.ts';
import { getLocalDate } from '../utils.ts';

export interface HistorySummary {
  latest?: MetricEntry;
  todayEntry?: MetricEntry;
  streak: number;
  chartData: Array<{ day: string; protein: number; hrv: number; exertion: number }>;
  driftData: Array<{ day: string; value: number }>;
}

const exertionValue = (key?: string) => {
  if (key === 'GREEN') return 100;
  if (key === 'YELLOW') return 60;
  return 20;
};

export const useHistorySummary = (history: MetricEntry[], config: UserConfig): HistorySummary => {
  return useMemo(() => {
    const safeHistory = history || [];
    const latest = safeHistory[safeHistory.length - 1];
    const todayStr = getLocalDate();
    const todayEntry = safeHistory.find(entry => entry.date === todayStr);

    const validEntries = safeHistory
      .filter(entry => entry.date && !isNaN(new Date(entry.date).getTime()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const uniqueDates = Array.from(new Set(validEntries.map(entry => entry.date)));

    let streak = 0;
    if (uniqueDates.length > 0) {
      const lastEntryDate = uniqueDates[0];
      const todayKey = todayStr;
      const yesterdayKey = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastEntryDate === todayKey || lastEntryDate === yesterdayKey) {
        let currentStreak = 1;
        let currentTs = new Date(lastEntryDate).setUTCHours(12, 0, 0, 0);
        for (let i = 1; i < uniqueDates.length; i++) {
          const prevTs = new Date(uniqueDates[i]).setUTCHours(12, 0, 0, 0);
          if (Math.round((currentTs - prevTs) / 86400000) === 1) {
            currentStreak++;
            currentTs = prevTs;
          } else {
            break;
          }
        }
        streak = currentStreak;
      }
    }

    const lastSeven = safeHistory.slice(-7);

    const chartData = lastSeven.map(entry => ({
      day: entry.date?.split('-')[2] || '',
      protein: entry.rawValues?.protein || 0,
      hrv: entry.rawValues?.hrv || 0,
      exertion: exertionValue(entry.processedState?.exercise),
    }));

    const driftData = lastSeven.map(entry => ({
      day: entry.date?.split('-')[2] || '',
      value: entry.rawValues?.cognition === 'PEAK' ? 100
        : entry.rawValues?.cognition === 'FOGGY' ? 40
        : entry.rawValues?.cognition === 'DRAINED' ? 15
        : entry.rawValues?.cognition === 'FROZEN' ? 5
        : 75,
    }));

    return {
      latest,
      todayEntry,
      streak,
      chartData,
      driftData,
    };
  }, [history, config.manualTargets?.protein]);
};
