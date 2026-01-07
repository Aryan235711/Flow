
import { Flag, UserConfig, MetricEntry } from './types';

export const DEFAULT_CONFIG: UserConfig = {
  wearableBaselines: { sleep: 7.5, rhr: 65, hrv: 50 },
  manualTargets: { protein: 80, gut: 4, sun: 'Full', exercise: 'Medium' },
  streakLogic: {
    freezesAvailable: 2,
    lastFreezeReset: new Date().toISOString()
  }
};

export const STORAGE_KEYS = {
  HISTORY: 'flow_history_v4',
  CONFIG: 'flow_config_v4',
  STAGE: 'flow_stage_v4',
  USER: 'flow_user_v4',
  NOTIFS: 'flow_notifs_v4'
};

// HELPER: Get local YYYY-MM-DD to prevent UTC rollover bugs
export const getLocalDate = (d = new Date()) => {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10); // Subtle tick
  }
};

export const getSafeStorage = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Flow: Storage reset for ${key}`, e);
    return fallback;
  }
};

export const setSafeStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Flow: Storage write error", e);
  }
};

export const clearAppStorage = () => {
  try {
    const keys = [
      STORAGE_KEYS.HISTORY,
      STORAGE_KEYS.CONFIG,
      STORAGE_KEYS.STAGE,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.NOTIFS,
      'last_upsell'
    ];
    keys.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Flow: Storage clear issue', e);
  }
};

// Notification data validation and schema checking
export const validateNotification = (notif: any): notif is Notification => {
  return (
    typeof notif === 'object' &&
    notif !== null &&
    typeof notif.id === 'string' &&
    notif.id.length > 0 &&
    typeof notif.title === 'string' &&
    notif.title.length > 0 &&
    typeof notif.message === 'string' &&
    notif.message.length > 0 &&
    typeof notif.time === 'string' &&
    typeof notif.read === 'boolean' &&
    ['AI', 'SYSTEM', 'STREAK', 'FREEZE'].includes(notif.type)
  );
};

export const validateNotificationArray = (data: any): Notification[] => {
  if (!Array.isArray(data)) return [];

  return data
    .filter(validateNotification)
    .slice(0, 10); // Ensure max 10 notifications
};

// Enhanced safe storage with validation
export const getValidatedNotifications = (): Notification[] => {
  try {
    const data = getSafeStorage(STORAGE_KEYS.NOTIFS, []);
    return validateNotificationArray(data);
  } catch (error) {
    console.error('Failed to load notifications:', error);
    return [];
  }
};

// Notification analytics tracking
export interface NotificationAnalytics {
  totalShown: number;
  totalDismissed: number;
  totalRead: number;
  typeBreakdown: Record<'AI' | 'SYSTEM' | 'STREAK' | 'FREEZE', { shown: number; dismissed: number; read: number }>;
  avgTimeToDismiss: number;
  lastUpdated: string;
}

export const getNotificationAnalytics = (): NotificationAnalytics => {
  return getSafeStorage('notification_analytics', {
    totalShown: 0,
    totalDismissed: 0,
    totalRead: 0,
    typeBreakdown: {
      AI: { shown: 0, dismissed: 0, read: 0 },
      SYSTEM: { shown: 0, dismissed: 0, read: 0 },
      STREAK: { shown: 0, dismissed: 0, read: 0 },
      FREEZE: { shown: 0, dismissed: 0, read: 0 }
    },
    avgTimeToDismiss: 0,
    lastUpdated: new Date().toISOString()
  });
};

export const trackNotificationShown = (type: 'AI' | 'SYSTEM' | 'STREAK' | 'FREEZE') => {
  try {
    const analytics = getNotificationAnalytics();
    analytics.totalShown++;
    analytics.typeBreakdown[type].shown++;
    analytics.lastUpdated = new Date().toISOString();
    setSafeStorage('notification_analytics', analytics);
  } catch (error) {
    console.warn('Failed to track notification shown:', error);
  }
};

export const trackNotificationDismissed = (type: 'AI' | 'SYSTEM' | 'STREAK' | 'FREEZE') => {
  try {
    const analytics = getNotificationAnalytics();
    analytics.totalDismissed++;
    analytics.typeBreakdown[type].dismissed++;
    analytics.lastUpdated = new Date().toISOString();
    setSafeStorage('notification_analytics', analytics);
  } catch (error) {
    console.warn('Failed to track notification dismissed:', error);
  }
};

export const trackNotificationRead = (type: 'AI' | 'SYSTEM' | 'STREAK' | 'FREEZE') => {
  try {
    const analytics = getNotificationAnalytics();
    analytics.totalRead++;
    analytics.typeBreakdown[type].read++;
    analytics.lastUpdated = new Date().toISOString();
    setSafeStorage('notification_analytics', analytics);
  } catch (error) {
    console.warn('Failed to track notification read:', error);
  }
};

export const calculateFlag = (value: number, baseline: number, inverse = false): Flag => {
  const ratio = inverse ? baseline / value : value / baseline;
  if (ratio >= 0.95) return 'GREEN';
  if (ratio >= 0.8) return 'YELLOW';
  return 'RED';
};

export const getFlagColors = (flag: Flag) => {
  const colors = {
    GREEN: { text: 'text-emerald-400', bg: 'bg-emerald-500', hex: '#10b981' },
    YELLOW: { text: 'text-amber-400', bg: 'bg-amber-500', hex: '#f59e0b' },
    RED: { text: 'text-rose-400', bg: 'bg-rose-500', hex: '#ef4444' }
  };
  return colors[flag] || colors.YELLOW;
};

// Generates a "Penalizing" System Log
export const generateFreezeEntry = (date: string, baselines: UserConfig['wearableBaselines']): MetricEntry => {
  return {
    date: date,
    isSystemGenerated: true,
    symptomName: "Cryostasis Protocol",
    symptomScore: 1, // Low load
    rawValues: {
      sleep: 9.5, // Overslept/Lethargic
      rhr: baselines.rhr + 8, // Elevated RHR (Penalty)
      hrv: baselines.hrv - 15, // Low HRV (Penalty)
      protein: 40, // Low intake
      gut: 2, // Poor digestion
      sun: 'None', // No light
      exercise: 'None', // Sedentary
      cognition: 'FROZEN' // Special state
    },
    processedState: {
      sleep: 'YELLOW', // technically enough sleep, but quality assumed low
      rhr: 'YELLOW',
      hrv: 'RED',
      protein: 'RED',
      gut: 'RED',
      sun: 'RED',
      exercise: 'RED'
    }
  };
};

export const generateMockData = (): MetricEntry[] => {
  const data: MetricEntry[] = [];
  const today = new Date();
  
  const cogStates = ['PEAK', 'STEADY', 'FOGGY', 'DRAINED'];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDate(d);
    
    // Generate somewhat realistic variations
    const sleepBase = 7.0;
    const sleep = sleepBase + (Math.random() * 1.5) - 0.5;
    
    const rhrBase = 60;
    const rhr = Math.floor(rhrBase + (Math.random() * 10) - 2);
    
    const hrvBase = 55;
    const hrv = Math.floor(hrvBase + (Math.random() * 20) - 10);
    
    const protein = Math.floor(70 + Math.random() * 40);
    
    const processedState: Record<string, Flag> = {
      sleep: sleep > 7.2 ? 'GREEN' : sleep > 6 ? 'YELLOW' : 'RED',
      rhr: rhr < 65 ? 'GREEN' : 'YELLOW',
      hrv: hrv > 50 ? 'GREEN' : 'YELLOW',
      protein: protein > 80 ? 'GREEN' : 'YELLOW',
      gut: Math.random() > 0.3 ? 'GREEN' : 'YELLOW',
      sun: Math.random() > 0.5 ? 'GREEN' : 'YELLOW',
      exercise: Math.random() > 0.4 ? 'GREEN' : 'YELLOW'
    };

    // Correlate cognition roughly with sleep
    let cogIndex = 1; // Steady
    if (sleep > 7.5 && hrv > 60) cogIndex = 0; // Peak
    else if (sleep < 6) cogIndex = 3; // Drained
    else if (Math.random() > 0.7) cogIndex = 2; // Foggy

    data.push({
      date: dateStr,
      rawValues: {
        sleep: Number(sleep.toFixed(1)),
        rhr,
        hrv,
        protein,
        gut: Math.random() > 0.5 ? 4 : 3,
        sun: Math.random() > 0.5 ? 'Full' : 'Partial',
        exercise: Math.random() > 0.6 ? 'Hard' : 'Medium',
        cognition: cogStates[cogIndex]
      },
      processedState,
      symptomScore: Math.floor(1 + Math.random() * 2),
      symptomName: i % 3 === 0 ? "High Flow" : i % 2 === 0 ? "Recovery" : "Baseline"
    });
  }
  return data;
};
