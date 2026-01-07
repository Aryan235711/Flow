import { MetricEntry } from './types.ts';

/**
 * Calculate smart defaults based on user's historical data
 * @param history - Array of previous metric entries
 * @param lookbackDays - Number of recent days to consider (default: 7)
 * @returns Smart default values for form prefill
 */
export function calculateSmartDefaults(history: MetricEntry[], lookbackDays: number = 7) {
  if (!history || history.length === 0) {
    return {
      sleep: '07:30',
      rhr: '65',
      hrv: '50',
      protein: '80',
      gut: 4,
      sun: 'Full',
      exercise: 'Medium',
      cognition: 'STEADY'
    };
  }

  // Get recent entries within lookback period
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
  
  const recentEntries = history.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= cutoffDate;
  });

  if (recentEntries.length === 0) {
    return {
      sleep: '07:30',
      rhr: '65', 
      hrv: '50',
      protein: '80',
      gut: 4,
      sun: 'Full',
      exercise: 'Medium',
      cognition: 'STEADY'
    };
  }

  // Calculate averages
  const avgSleep = recentEntries.reduce((sum, e) => sum + e.rawValues.sleep, 0) / recentEntries.length;
  const avgRhr = Math.round(recentEntries.reduce((sum, e) => sum + e.rawValues.rhr, 0) / recentEntries.length);
  const avgHrv = Math.round(recentEntries.reduce((sum, e) => sum + e.rawValues.hrv, 0) / recentEntries.length);
  const avgProtein = Math.round(recentEntries.reduce((sum, e) => sum + e.rawValues.protein, 0) / recentEntries.length);
  const avgGut = Math.round(recentEntries.reduce((sum, e) => sum + e.rawValues.gut, 0) / recentEntries.length);

  // Most common categorical values
  const sunModes = recentEntries.map(e => e.rawValues.sun);
  const exerciseModes = recentEntries.map(e => e.rawValues.exercise);
  const cognitionModes = recentEntries.map(e => e.rawValues.cognition);

  const mostCommon = (arr: string[]) => {
    const counts = arr.reduce((acc, val) => ({ ...acc, [val]: (acc[val] || 0) + 1 }), {} as Record<string, number>);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  };

  // Convert sleep back to HH:MM format
  const h = Math.floor(avgSleep);
  const m = Math.round((avgSleep - h) * 60);
  const sleepStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

  return {
    sleep: sleepStr,
    rhr: avgRhr.toString(),
    hrv: avgHrv.toString(), 
    protein: avgProtein.toString(),
    gut: Math.max(1, Math.min(5, avgGut)),
    sun: sunModes.length > 0 ? mostCommon(sunModes) : 'Full',
    exercise: exerciseModes.length > 0 ? mostCommon(exerciseModes) : 'Medium',
    cognition: cognitionModes.length > 0 ? mostCommon(cognitionModes) : 'STEADY'
  };
}