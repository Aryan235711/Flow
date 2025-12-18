
export type Flag = 'GREEN' | 'YELLOW' | 'RED';
export type AppStage = 'AUTH' | 'ONBOARDING' | 'DISCLAIMER' | 'MAIN';
export type AppView = 'DASHBOARD' | 'LOG' | 'HISTORY';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'AI' | 'SYSTEM' | 'STREAK' | 'FREEZE';
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
  avatarSeed: string; // Updated to generic string for specific seed names
  isAuthenticated: boolean;
  isPremium: boolean; 
  token?: string;
}

export interface MetricEntry {
  date: string;
  rawValues: {
    sleep: number;
    rhr: number;
    hrv: number;
    protein: number;
    gut: number;
    sun: string;
    exercise: string;
    cognition: string; // PEAK | STEADY | FOGGY | DRAINED | FROZEN
  };
  processedState: Record<string, Flag>;
  symptomScore: number;
  symptomName: string;
  isSystemGenerated?: boolean;
}

export interface UserConfig {
  wearableBaselines: { sleep: number; rhr: number; hrv: number };
  manualTargets: { protein: number; gut: number; sun: string; exercise: string };
  streakLogic: {
    freezesAvailable: number; // Max 2
    lastFreezeReset: string; // ISO Date of last monthly reset
  };
}
