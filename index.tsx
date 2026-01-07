
import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Plus, 
  X, 
  History, 
  ShieldAlert, 
  LayoutGrid, 
  Bell, 
  LogOut,
  BellRing,
  Trash2,
  Download,
  Target,
  Scan,
  Crown,
  RefreshCcw,
  Edit2,
  Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

import { AppStage, AppView, UserProfile, MetricEntry, UserConfig, Notification } from './types.ts';
import { STORAGE_KEYS, DEFAULT_CONFIG, getSafeStorage, setSafeStorage, generateMockData, triggerHaptic, generateFreezeEntry, getLocalDate, clearAppStorage, getValidatedNotifications, trackNotificationShown, validateUserConfig } from './utils.ts';
import { BackgroundOrbs } from './components/BackgroundOrbs.tsx';
import { Header } from './components/Header.tsx';
import { Toast } from './components/Toast.tsx';
import { GoalSettings } from './components/GoalSettings.tsx';
import { Onboarding } from './components/Onboarding.tsx';
import { FlowLogo } from './components/FlowLogo.tsx';
import { Paywall } from './components/Paywall.tsx';

// Lazy load heavy components (extracted loaders to allow explicit prefetch)
const importDashboard = () => import('./components/Dashboard.tsx').then(m => ({ default: m.Dashboard }));
const importLogInput = () => import('./components/LogInput.tsx').then(m => ({ default: m.LogInput }));
const importHistoryView = () => import('./components/HistoryView.tsx').then(m => ({ default: m.HistoryView }));

const Dashboard = lazy(importDashboard);
const LogInput = lazy(importLogInput);
const HistoryView = lazy(importHistoryView);

// AESTHETIC AVATAR CONFIGURATION (Notion Style)
const AVATAR_OPTIONS = [
  'Felix', 'Lola', 'Eden', 'Nora', 'Leo', 'Zoe'
];
const AVATAR_BG_COLORS = 'c0aede,d1d4f9,b6e3f4,ffd5dc,ffdfbf';

// --- ANIMATION CONSTANTS ---
const SPRING_TRANSITION = { type: "spring", stiffness: 280, damping: 24, mass: 1 } as const;
const LIQUID_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]; // Apple-style fluid ease

// SMOOTH TRANSITION WRAPPER - REFINED
const PageTransition = ({ children, className }: { children: React.ReactNode; className?: string; key?: React.Key }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96, y: 10, filter: 'blur(4px)' }}
    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
    transition={SPRING_TRANSITION}
    className={className}
  >
    {children}
  </motion.div>
);

const App = () => {
  // Race condition prevention - track component mount status
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Enforce notification limits when loading from storage
  const enforceNotificationLimit = useCallback((notifs: Notification[]): Notification[] => {
    return notifs.slice(0, 10); // Keep only the 10 most recent
  }, []);

  // Safe initialization
  const [stage, setStage] = useState<AppStage>(() => getSafeStorage(STORAGE_KEYS.STAGE, 'AUTH'));
  const [view, setView] = useState<AppView>('DASHBOARD');
  const [user, setUser] = useState<UserProfile>(() => getSafeStorage(STORAGE_KEYS.USER, { isAuthenticated: false, isPremium: true, name: '', email: '', picture: '', avatarSeed: 'Felix' }));
  const [history, setHistory] = useState<MetricEntry[]>(() => getSafeStorage(STORAGE_KEYS.HISTORY, []));
  const [notifications, setNotifications] = useState<Notification[]>(() => getValidatedNotifications());
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const isLocalDev = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    // Only bypass login for Vite dev mode (localhost), NOT for Capacitor native apps
    const isViteDev = import.meta.env.DEV && (host === 'localhost' || host === '127.0.0.1');
    return isViteDev;
  }, []);
  
  const [config, setConfig] = useState<UserConfig>(() => {
    const stored = getSafeStorage(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    return validateUserConfig(stored);
  });
  
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  
  const [entryToEdit, setEntryToEdit] = useState<MetricEntry | null>(null);
  const [navTouched, setNavTouched] = useState(false);
  
  const hasRunSystemCheck = useRef(false);
  const prevHistoryLength = useRef(history.length);
  const mockNoticeShown = useRef(false);
  const mountedRef = useRef(true);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!user.token) throw new Error('Missing auth token');
    
    // Use full API URL for native iOS app, relative URLs for web
    const isNativeApp = !!(window as any).Capacitor;
    const baseUrl = isNativeApp ? 'https://flow-si70.onrender.com' : '';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${user.token}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(fullUrl, { ...options, headers });
  }, [user.token]);

  const addNotification = useCallback((title: string, message: string, type: Notification['type'] = 'AI') => {
    try {
      // Input validation and sanitization
      const sanitizedTitle = title.trim().substring(0, 100); // Max 100 chars
      const sanitizedMessage = message.trim().substring(0, 500); // Max 500 chars

      // Basic XSS prevention - remove potentially dangerous characters
      const sanitizeInput = (input: string) => input.replace(/[<>\"'&]/g, '');

      const finalTitle = sanitizeInput(sanitizedTitle);
      const finalMessage = sanitizeInput(sanitizedMessage);

      // Ensure we have valid content
      if (!finalTitle || !finalMessage) {
        console.warn('Notification rejected: empty title or message after sanitization');
        return;
      }

      const now = new Date();
      const today = new Date().toDateString();
      const notifDate = now.toDateString();
      const timeStr = notifDate === today ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${now.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const newNotif: Notification = { id: crypto.randomUUID(), title: finalTitle, message: finalMessage, time: timeStr, read: false, type };
      if (mountedRef.current) {
        setNotifications(prev => [newNotif, ...prev.slice(0, 10)]);
        setActiveToast(newNotif);
      }
      trackNotificationShown(type);
      triggerHaptic();
    } catch (error) {
      console.error('Failed to add notification:', error);
      // Fallback: show a system error notification
      const errorNotif: Notification = {
        id: crypto.randomUUID(),
        title: 'System Error',
        message: 'Failed to save notification. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false,
        type: 'SYSTEM'
      };
      if (mountedRef.current) {
        setNotifications(prev => [errorNotif, ...prev.slice(0, 10)]);
        setActiveToast(errorNotif);
      }
    }
  }, []);

  // Component mount tracking for race condition prevention
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Persistence
  useEffect(() => setSafeStorage(STORAGE_KEYS.STAGE, stage), [stage]);
  useEffect(() => setSafeStorage(STORAGE_KEYS.USER, user), [user]);
  useEffect(() => setSafeStorage(STORAGE_KEYS.HISTORY, history), [history]);
  useEffect(() => setSafeStorage(STORAGE_KEYS.NOTIFS, notifications), [notifications]);
  useEffect(() => setSafeStorage(STORAGE_KEYS.CONFIG, config), [config]);

  // Local dev: completely bypass login (no API, no OAuth)
  useEffect(() => {
    if (!isLocalDev) return;
    if (stage !== 'AUTH') return; // Only run in AUTH stage
    if (user.isAuthenticated && user.token) return;

    // Instantly create a fake dev user with a mock token
    const fakeDevUser: UserProfile = {
      name: 'Dev User',
      email: 'dev@flow.local',
      avatarSeed: 'Felix',
      picture: 'https://api.dicebear.com/9.x/notionists/svg?seed=Felix&backgroundColor=c0aede,d1d4f9,b6e3f4,ffd5dc,ffdfbf',
      isAuthenticated: true,
      isPremium: false,
      token: 'dev-local-token-' + Date.now()
    };

    setUser(fakeDevUser);
    setStage('ONBOARDING');
  }, [isLocalDev, stage, user.isAuthenticated, user.token]);


  // Notify when using mock data (no user entries)
  useEffect(() => {
    if (history.length === 0 && user.isAuthenticated && !mockNoticeShown.current) {
      mockNoticeShown.current = true;
      addNotification('Mock Data Active', 'No personal telemetry yet. Logs show mock data until you add entries.');
    }
    if (history.length > 0) mockNoticeShown.current = false;
  }, [history.length, user.isAuthenticated, addNotification]);

  const mockHistory = useMemo(() => generateMockData(), []);
  const isMockData = useMemo(() => history.length === 0, [history.length]);
  const displayHistory = useMemo(() => isMockData ? mockHistory : history, [isMockData, mockHistory, history]);
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // SYSTEM MAINTENANCE PIPELINE
  useEffect(() => {
    if (stage !== 'MAIN' || hasRunSystemCheck.current) return;
    hasRunSystemCheck.current = true;

    const today = new Date();
    const todayStr = getLocalDate(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDate(yesterday);

    // FREEZE REFILL LOGIC (Monthly)
    const lastReset = new Date(config.streakLogic.lastFreezeReset);
    if (today.getMonth() !== lastReset.getMonth() || today.getFullYear() !== lastReset.getFullYear()) {
      setConfig(prev => ({
        ...prev,
        streakLogic: {
          freezesAvailable: 2,
          lastFreezeReset: today.toISOString()
        }
      }));
      addNotification("System Update", "Monthly Streak Freezes replenished (2/2).", "SYSTEM");
    }

    // CHECK LOGS & CONSUME FREEZE
    const hasLogToday = history.some(h => h.date === todayStr);
    const hasLogYesterday = history.some(h => h.date === yesterdayStr);

    if (!hasLogYesterday) {
      if (config.streakLogic.freezesAvailable > 0 && history.length > 0) {
        const freezeEntry = generateFreezeEntry(yesterdayStr, config.wearableBaselines);
        setHistory(prev => {
           const newH = [...prev, freezeEntry];
           return newH.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        });
        setConfig(prev => ({
          ...prev,
          streakLogic: {
            ...prev.streakLogic,
            freezesAvailable: prev.streakLogic.freezesAvailable - 1
          }
        }));
        setTimeout(() => {
          if (mountedRef.current) {
            addNotification("Cryostasis Activated", `Missed sync detected. Streak frozen.`, "FREEZE");
          }
        }, 1500);
      }
    } else if (!hasLogToday) {
       setTimeout(() => {
        if (mountedRef.current) {
          addNotification("Protocol Pending", "Log metrics to maintain streak.", "SYSTEM");
        }
      }, 2000);
    } 

    if (!user.isPremium) {
      const lastUpsell = getSafeStorage('last_upsell', 0);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (now - lastUpsell > oneDay) {
        setTimeout(() => {
          if (mountedRef.current) {
            addNotification("Features Locked", "Deep history archive & AI analysis locked.", "SYSTEM");
            setSafeStorage('last_upsell', now);
          }
        }, 5000);
      }
    }
  }, [stage, history, config, addNotification, user.isPremium]);

  useEffect(() => {
    if (stage !== 'MAIN' || hasRunSystemCheck.current) return;
    if (history.length > prevHistoryLength.current) {
        if (history.length >= 3 && history.length % 3 === 0) {
             setTimeout(() => {
               if (mountedRef.current) {
                 addNotification("Neural Tunnel Ready", "Sufficient data for new AI insights.", "AI");
               }
             }, 1000);
        }
    }
    prevHistoryLength.current = history.length;
  }, [history, stage, addNotification]);

  // Handle OAuth callback from custom URL scheme in native app
  useEffect(() => {
    if (!(window as any).Capacitor) return; // Only for native apps

    const handleAppUrlOpen = (event: any) => {
      const url = new URL(event.url);
      
      if (url.protocol === 'flow:' && url.pathname.startsWith('/auth/callback')) {
        console.log('[native auth callback] received URL:', event.url);
        
        const error = url.searchParams.get('error');
        const authPayload = url.searchParams.get('auth_payload');
        
        if (error) {
          console.error('[native auth callback] OAuth error:', error);
          addNotification('Login Failed', 'Authentication error. Please try again.', 'SYSTEM');
          setStage('AUTH');
          return;
        }
        
        if (authPayload) {
          try {
            const decoded = JSON.parse(atob(authPayload.replace(/-/g, '+').replace(/_/g, '/')));
            setUser({
              name: decoded.name || '',
              email: decoded.email || '',
              avatarSeed: decoded.avatarSeed || 'Felix',
              picture: decoded.picture || '',
              isAuthenticated: true,
              isPremium: !!decoded.isPremium,
              token: decoded.token
            });
            setStage('ONBOARDING');
            addNotification('Login Successful', `Welcome back, ${decoded.name}!`, 'SYSTEM');
          } catch (decodeError) {
            console.error('[native auth callback] decode error:', decodeError);
            addNotification('Login Failed', 'Could not process login. Please try again.', 'SYSTEM');
            setStage('AUTH');
          }
        } else {
          addNotification('Login Failed', 'No authentication data received.', 'SYSTEM');
          setStage('AUTH');
        }
      }
    };

    CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen);
    
    // Listen for browser close events (user might cancel OAuth)
    const handleBrowserFinished = () => {
      console.log('[browser] finished - checking if login was cancelled');
      setIsLoggingIn(false);
    };
    
    Browser.addListener('browserFinished', handleBrowserFinished);
    
    return () => {
      CapacitorApp.removeAllListeners();
      Browser.removeAllListeners();
    };
  }, [addNotification]);

  const handleOpenNotifs = useCallback(() => {
    setShowNotifs(true);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleOpenProfile = useCallback(() => {
    triggerHaptic();
    setShowNotifs(false);
    setShowPaywall(false);
    setShowGoals(false);
    setShowProfile(true);
  }, []);

  const suppressPaywall = useCallback(() => {
    setShowPaywall(false);
  }, []);

  useEffect(() => {
    if (!user.isAuthenticated || !user.token) return;
    const load = async () => {
      try {
        const meRes = await authFetch('/api/me');
        if (meRes.ok) {
          const data = await meRes.json();
          const dbUser = data.user || {};
          const dbConfig = data.config || {};
          setUser(prev => ({
            ...prev,
            name: dbUser.name || prev.name,
            email: dbUser.email || prev.email,
            picture: dbUser.picture || prev.picture,
            avatarSeed: dbUser.avatar_seed || prev.avatarSeed,
            isPremium: !!dbUser.is_premium,
            isAuthenticated: true,
            token: prev.token
          }));
          if (dbConfig.wearable_baselines && dbConfig.manual_targets && dbConfig.streak_logic) {
            setConfig({
              wearableBaselines: dbConfig.wearable_baselines,
              manualTargets: dbConfig.manual_targets,
              streakLogic: dbConfig.streak_logic
            });
          }
        }

        const histRes = await authFetch('/api/history?limit=90');
        if (histRes.ok) {
          const data = await histRes.json();
          if (Array.isArray(data.history)) setHistory(data.history);
        }
        if (stage === 'AUTH') setStage('MAIN');
      } catch (e) {
        console.error('[sync] load failed', e);
      }
    };
    load();
  }, [user.isAuthenticated, user.token, authFetch, stage]);

  const handleLogin = useCallback(async () => {
    triggerHaptic();
    setIsLoggingIn(true);
    
    // Use Render domain for both web and native app
    const isNativeApp = !!(window as any).Capacitor;
    const baseUrl = isNativeApp ? 'https://flow-si70.onrender.com' : '';
    const redirectUri = isNativeApp 
      ? 'flow://auth/callback'  // Custom scheme for native app
      : `${baseUrl || window.location.origin}/auth/callback`;  // Web redirect
    const url = `${baseUrl}/api/auth/google/start?redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log('[login] redirecting to', url, 'isNative:', isNativeApp);
    
    if (isNativeApp) {
      // For native apps, open OAuth in system browser
      await Browser.open({ url });
    } else {
      // For web, use regular navigation
      window.location.href = url;
    }
  }, []);

  const handleSignOut = useCallback(() => {
    setUser({ name: '', email: '', picture: '', avatarSeed: 'Felix', isAuthenticated: false, isPremium: false });
    setStage('AUTH');
    setShowProfile(false);
    clearAppStorage();
    setHistory([]);
    setNotifications([]);
  }, []);

  const handleDeleteEntry = useCallback((date: string) => {
    triggerHaptic();
    const remove = async () => {
      try {
        if (user.token) {
          await authFetch(`/api/history/${date}`, { method: 'DELETE' });
        }
      } catch (e) {
        console.error('[history/delete] remote delete failed', e);
      }
      setHistory(prev => prev.filter(entry => entry.date !== date));
    };
    remove();
    addNotification('Record Expunged', 'Telemetry entry deleted.', 'SYSTEM');
    setTimeout(() => {
      if (history.length <= 1) {
        addNotification('Mock Data Active', 'No personal telemetry remains. Showing mock data until you add entries.');
      }
    }, 0);
  }, [addNotification, authFetch, history, user.token]);

  const handleEditEntry = useCallback((entry: MetricEntry, index: number) => {
    if (entry.isSystemGenerated) {
       addNotification("Access Denied", "System Cryostasis logs cannot be edited.", "SYSTEM");
       return;
    }
    triggerHaptic();
    setEntryToEdit(entry); 
    setView('LOG');
  }, [addNotification]);

  const handlePlusClick = useCallback(() => {
    triggerHaptic();
    const todayStr = getLocalDate();
    const existingLog = history.find(h => h.date === todayStr);

    if (existingLog) {
      if (existingLog.isSystemGenerated) {
        addNotification("Protocol Active", "System has already logged a freeze for today.", "SYSTEM");
        return;
      }
      setEntryToEdit(existingLog);
      addNotification("Editing Active", "Log for today already exists. Editing...", "SYSTEM");
    } else {
      setEntryToEdit(null);
    }
    setView('LOG');
  }, [history, addNotification]);

  const handleSaveEntry = useCallback((entry: MetricEntry) => {
    const persist = async () => {
      try {
        if (user.token) {
          const res = await authFetch(`/api/history/${entry.date}`, {
            method: 'PUT',
            body: JSON.stringify(entry)
          });
          if (res.ok) {
            const data = await res.json();
            if (data.entry) entry = data.entry;
          }
        }
      } catch (e) {
        console.error('[history/save] remote save failed, keeping local', e);
      }

      setHistory(prev => {
        let newHistory = [...prev];
        const entryDate = entry.date;
        newHistory = newHistory.filter(h => h.date !== entryDate);
        newHistory.push(entry);
        return newHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      });
      setEntryToEdit(null); 
      changeView('DASHBOARD'); 
      addNotification(entryToEdit ? 'Protocol Updated' : 'Sync Success', 'Registry updated.', 'SYSTEM'); 
    };
    persist();
  }, [entryToEdit, addNotification, authFetch, user.token]);

  const exportDataCSV = useCallback(() => {
    triggerHaptic();
    if (!user.isPremium) {
      setShowProfile(false);
      setShowPaywall(true);
      return;
    }
    if (history.length === 0) return;

    // Limit export to last 365 days to prevent excessive data export
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const recentHistory = history.filter(h => new Date(h.date) >= oneYearAgo);

    if (recentHistory.length === 0) {
      addNotification('Export Failed', 'No data available for export in the last year.', 'SYSTEM');
      return;
    }

    const headers = ['Date', 'Sleep(h)', 'RHR', 'HRV', 'Protein(g)', 'Gut', 'Sun', 'Exertion', 'Cognition', 'Load', 'Status', 'Type'];
    const rows = recentHistory.map(h => [
      h.date,
      h.rawValues.sleep,
      h.rawValues.rhr,
      h.rawValues.hrv,
      h.rawValues.protein,
      h.rawValues.gut,
      h.rawValues.sun,
      h.rawValues.exercise,
      // Sanitize cognition field to prevent CSV injection
      String(h.rawValues.cognition || 'STEADY').replace(/[\r\n,"]/g, ''),
      h.symptomScore,
      // Enhanced CSV sanitization for symptomName
      `"${String(h.symptomName || 'Unknown').replace(/"/g, '""').replace(/[\r\n]/g, ' ')}"`,
      h.isSystemGenerated ? 'AUTO_FREEZE' : 'MANUAL'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    // Add timestamp to prevent filename collisions
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.setAttribute('download', `flow_telemetry_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification('Export Complete', `${recentHistory.length} records exported as CSV.`, 'SYSTEM');
  }, [history, addNotification, user.isPremium]);

  const handleGoalClick = useCallback(() => {
    triggerHaptic();
    if (!user.isPremium) {
      setShowProfile(false);
      setShowPaywall(true);
    } else {
      setShowProfile(false);
      setShowGoals(true);
    }
  }, [user.isPremium]);

  const handleUpgrade = useCallback(() => {
    triggerHaptic();
    // Simulate API Call
    setTimeout(() => {
      setUser(prev => ({ ...prev, isPremium: true }));
      setShowPaywall(false);
      addNotification("Uplink Established", "Welcome to Flow+ Premium.", "SYSTEM");
    }, 1500);
  }, [addNotification]);

  const toggleAvatar = useCallback(() => {
    triggerHaptic();
    setUser(prev => {
      const currentIndex = AVATAR_OPTIONS.indexOf(prev.avatarSeed);
      const nextIndex = (currentIndex + 1) % AVATAR_OPTIONS.length;
      const newSeed = AVATAR_OPTIONS[nextIndex];
      return {
        ...prev,
        avatarSeed: newSeed,
        picture: `https://api.dicebear.com/9.x/notionists/svg?seed=${newSeed}&backgroundColor=${AVATAR_BG_COLORS}`
      };
    });
  }, []);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setUser(prev => ({ ...prev, name: newName }));
  }, []);

  const scheduleRender = useCallback((cb: () => void) => {
    if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      cb();
      return;
    }
    window.requestAnimationFrame(cb);
  }, []);

  const changeView = (v: AppView) => {
    setNavTouched(true);
    scheduleRender(() => {
      triggerHaptic();
      if (v !== 'LOG') {
        setEntryToEdit(null);
      }
      setView(v);
    });
  };

  // Handle OAuth return
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.pathname.startsWith('/auth/callback')) {
      const error = url.searchParams.get('error');
      const payload = url.searchParams.get('auth_payload');
      
      if (error) {
        console.error('[auth callback] OAuth error:', error);
        addNotification('Login Failed', 'Authentication error. Please try again.', 'SYSTEM');
        window.history.replaceState({}, '', '/');
        setStage('AUTH');
        return;
      }
      
      if (payload) {
        try {
          const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
          setUser({
            name: decoded.name || '',
            email: decoded.email || '',
            avatarSeed: decoded.avatarSeed || 'Felix',
            picture: decoded.picture || '',
            isAuthenticated: true,
            isPremium: !!decoded.isPremium,
            token: decoded.token
          });
          setStage('ONBOARDING');
        } catch (e) {
          console.error('[auth callback] decode error', e);
          addNotification('Login Failed', 'Could not process login. Please try again.', 'SYSTEM');
          setStage('AUTH');
        }
      } else {
        addNotification('Login Failed', 'No authentication data received.', 'SYSTEM');
        setStage('AUTH');
      }
      window.history.replaceState({}, '', '/');
    }
  }, [addNotification]);

  useEffect(() => {
    importDashboard();
    importLogInput();
    importHistoryView();
  }, []);

  useEffect(() => {
    if (!navTouched) return;
    const timeout = setTimeout(() => setNavTouched(false), 220);
    return () => clearTimeout(timeout);
  }, [navTouched, view]);

  if (stage === 'AUTH') return (
    <div className="fixed inset-0 z-[300] bg-[#020617] flex flex-col justify-center items-center overflow-hidden">
      <BackgroundOrbs />
      
      {/* CINEMATIC NEURAL RINGS BACKGROUND */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 60, ease: "linear", repeat: Infinity }}
           className="w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] border border-dashed border-teal-500/20 rounded-full"
        />
        <motion.div 
           animate={{ rotate: -360 }}
           transition={{ duration: 40, ease: "linear", repeat: Infinity }}
           className="absolute w-[60vw] h-[60vw] max-w-[450px] max-h-[450px] border border-dotted border-cyan-500/20 rounded-full"
        />
        <motion.div 
           animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
           transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
           className="absolute w-[40vw] h-[40vw] bg-teal-500/10 blur-[60px] rounded-full"
        />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-16 p-8">
        
        {/* LOGO SYSTEM */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          className="relative group"
        >
          {/* Outer glow ring */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-700 opacity-60" />
          
          <div className="w-32 h-32 bg-[#020617]/50 rounded-[40px] flex items-center justify-center shadow-2xl border border-white/10 backdrop-blur-xl relative z-10 overflow-hidden">
             {/* Scanner Light Effect */}
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
             
             <FlowLogo className="w-20 h-20 drop-shadow-[0_0_15px_rgba(20,184,166,0.5)] transition-transform duration-700 group-hover:scale-110 group-hover:rotate-3" />
          </div>
          
          {/* Connection Lines */}
          <div className="absolute -top-12 left-1/2 w-[1px] h-12 bg-gradient-to-b from-transparent to-teal-500/50" />
          <div className="absolute -bottom-12 left-1/2 w-[1px] h-12 bg-gradient-to-t from-transparent to-cyan-500/50" />
        </motion.div>

        {/* TYPOGRAPHY SYSTEM - REFINED FOR READABILITY */}
        <div className="space-y-6 text-center relative z-20">
          <div className="flex justify-center items-end gap-1 h-40">
             {["F", "l", "o", "w"].map((char, i) => (
              <motion.span 
                key={i} 
                initial={{ y: 120, opacity: 0, filter: 'blur(20px)', rotateX: 90 }} 
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)', rotateX: 0 }} 
                transition={{ 
                  duration: 1.4, 
                  delay: 0.4 + (i * 0.12), 
                  type: "spring",
                  bounce: 0.5,
                  stiffness: 150,
                  damping: 15
                }}
                className="inline-block text-[10rem] font-black font-outfit leading-none tracking-normal text-transparent bg-clip-text bg-gradient-to-b from-white via-teal-200 to-teal-600 drop-shadow-[0_10px_30px_rgba(20,184,166,0.6)] select-none relative pb-4"
                style={{ 
                  WebkitTextStroke: '2px rgba(255,255,255,0.1)', 
                  zIndex: 4 - i 
                }}
              >
                {char}
              </motion.span>
            ))}
          </div>
          
          <motion.div 
            initial={{ opacity: 0, letterSpacing: '0.5em', y: 20 }} 
            animate={{ opacity: 1, letterSpacing: '0.25em', y: 0 }} 
            transition={{ delay: 1.8, duration: 1.2, type: "spring" }}
            className="flex items-center justify-center gap-3 text-teal-200/40 text-xs font-bold uppercase tracking-widest mt-4"
          >
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
             Biological Telemetry System
          </motion.div>
        </div>

        {/* INTERACTIVE BUTTON */}
        <motion.button 
          initial={{ opacity: 0, scale: 0.9, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          transition={{ delay: 1.2, type: "spring" }}
          whileHover={{ scale: isLoggingIn || isLocalDev ? 1 : 1.05 }}
          whileTap={{ scale: isLoggingIn || isLocalDev ? 1 : 0.98 }}
          onClick={handleLogin} 
          disabled={isLocalDev || isLoggingIn}
          className="w-full py-6 bg-white text-[#020617] font-black rounded-[32px] text-xl shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] flex items-center justify-center gap-4 font-outfit relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
        >
           <div className="absolute inset-0 bg-gradient-to-r from-teal-50/0 via-teal-50/50 to-teal-50/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out" />
           <span className="relative z-10 flex items-center gap-3">
             {isLoggingIn ? (
               <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-6 h-6 border-3 border-teal-600 border-t-transparent rounded-full" /> CONNECTING...</>
             ) : (
               <><Fingerprint size={24} className="text-teal-600" /> INITIALIZE LINK</>
             )}
           </span>
        </motion.button>

        {isLocalDev && (
          <div className="text-center text-[10px] uppercase tracking-[0.3em] text-white/20 font-black">
            Local Dev: Login bypassed
          </div>
        )}
      </div>
      
      {/* SYSTEM FOOTER */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 2 }} 
        className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2"
      >
        <div className="flex gap-1">
           {[0,1,2].map(i => (
             <motion.div 
               key={i}
               animate={{ opacity: [0.2, 1, 0.2] }}
               transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
               className="w-1 h-1 bg-teal-500 rounded-full"
             />
           ))}
        </div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-black">Secure Neural Uplink v4.01</p>
      </motion.div>
    </div>
  );

  if (stage === 'ONBOARDING') return (
    <Onboarding onComplete={() => {
      setStage('DISCLAIMER');
      triggerHaptic();
    }} />
  );
  
  if (stage === 'DISCLAIMER') return (
    <div className="fixed inset-0 z-[200] bg-[#020617] p-8 flex flex-col justify-center items-center text-center overflow-hidden">
      <BackgroundOrbs />
      <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } } }} className="relative z-10 space-y-10 max-w-sm w-full">
        <motion.div variants={{ hidden: { scale: 0, rotate: 180 }, visible: { scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 15 } } }} className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 bg-teal-500/20 rounded-full animate-ping" />
          <div className="w-full h-full bg-gradient-to-br from-teal-500 to-teal-700 rounded-[48px] flex items-center justify-center shadow-[0_0_50px_rgba(20,184,166,0.4)] border border-white/10 relative z-10">
            <ShieldAlert size={64} className="text-white drop-shadow-lg" /><div className="absolute top-0 right-0 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#020617] animate-pulse" />
          </div>
        </motion.div>
        <div className="space-y-6">
          <motion.h1 variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring' } } }} className="text-5xl font-black font-outfit tracking-tighter text-white leading-none">Neural<br/>Mandate</motion.h1>
          <motion.p variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }} className="text-teal-200/60 text-lg font-medium leading-relaxed px-4">Telemetry analysis is algorithmic. Registry data is <span className="text-white font-bold">non-clinical</span>. Proceed with biological autonomy.</motion.p>
        </div>
        <motion.button variants={{ hidden: { y: 50, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', bounce: 0.4 } } }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { triggerHaptic(); setStage('MAIN'); addNotification('Tunnel Link Active', 'Biometric sync verified.', 'SYSTEM'); }} className="w-full py-8 bg-white text-black font-black rounded-[40px] text-xl shadow-[0_0_60px_-15px_rgba(255,255,255,0.3)] active:scale-95 font-outfit group relative overflow-hidden">
          <span className="relative z-10 flex items-center justify-center gap-3"><Scan size={24} className="text-teal-600" /> ACKNOWLEDGE</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-200/50 to-transparent -translate-x-full group-hover:animate-[scan_1.5s_infinite]" />
          <style>{`@keyframes scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
        </motion.button>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="absolute bottom-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Protocol v4.01</motion.div>
    </div>
  );

  return (
      <div className="max-w-md md:max-w-4xl lg:max-w-6xl mx-auto min-h-screen bg-[#020617] text-white font-quicksand overflow-x-hidden selection:bg-teal-500/30">
      
      {/* ARIA Live Region for Screen Reader Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {activeToast && `${activeToast.title}: ${activeToast.message}`}
      </div>

      <Header 
        user={user} 
        unreadCount={unreadCount} 
        onOpenNotifs={handleOpenNotifs} 
        onOpenProfile={handleOpenProfile} 
      />

      <Toast notification={activeToast} onDismiss={() => setActiveToast(null)} />

      {/* PAYWALL OVERLAY */}
      <AnimatePresence>
        {showPaywall && (
          <Paywall onClose={() => setShowPaywall(false)} onUpgrade={handleUpgrade} />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'DASHBOARD' && (
          <PageTransition key="dashboard" className="relative z-10">
            <Suspense fallback={<div className="flex items-center justify-center h-screen"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>}>
              <Dashboard 
                history={displayHistory} 
                config={config} 
                onAddNotif={addNotification} 
                isMockData={isMockData}
                user={user} 
                onTriggerPaywall={suppressPaywall}
                onLogToday={handlePlusClick}
              />
            </Suspense>
          </PageTransition>
        )}
        {view === 'LOG' && (
          <PageTransition key="log" className="relative z-10">
            <Suspense fallback={<div className="flex items-center justify-center h-screen"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>}>
              <LogInput 
                config={config} 
                initialData={entryToEdit}
                onSave={handleSaveEntry} 
              />
            </Suspense>
          </PageTransition>
        )}
        {view === 'HISTORY' && (
          <PageTransition key="history" className="relative z-10">
            <Suspense fallback={<div className="flex items-center justify-center h-screen"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>}>
              <HistoryView 
                history={displayHistory} 
                isMockData={isMockData} 
                onDelete={handleDeleteEntry} 
                onEdit={handleEditEntry}
                isPremium={user.isPremium} 
                onTriggerPaywall={suppressPaywall} 
              />
            </Suspense>
          </PageTransition>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGoals && (
          <GoalSettings 
            config={config} 
            onSave={async (newConfig) => {
              setConfig(newConfig);
              if (user.token) {
                try {
                  await authFetch('/api/config', {
                    method: 'PUT',
                    body: JSON.stringify({
                      wearable_baselines: newConfig.wearableBaselines,
                      manual_targets: newConfig.manualTargets,
                      streak_logic: newConfig.streakLogic
                    })
                  });
                } catch (e) {
                  console.error('[config] save failed', e);
                }
              }
              addNotification("Protocol Updated", "New baselines established.", "SYSTEM");
            }} 
            onClose={() => setShowGoals(false)} 
          />
        )}

        {showProfile && (
          <motion.div 
            initial={{ x: '100%', opacity: 0.5 }} 
            animate={{ x: 0, opacity: 1 }} 
            exit={{ x: '100%', opacity: 0 }} 
            transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.8 }} 
            className="fixed inset-0 z-[400] bg-[#020617]/95 backdrop-blur-[50px] p-6 pt-safe flex flex-col"
          >
            <div className="flex justify-between items-center mb-10"><h2 className="text-3xl font-black font-outfit tracking-tighter">Profile</h2><button onClick={() => setShowProfile(false)} aria-label="Close profile" className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white/50"><X size={24} /></button></div>
            <div className="space-y-8 flex-1 overflow-y-auto scrollbar-hide">
              {/* Profile Card */}
              <div className="glass p-6 rounded-[32px] border-white/5 shadow-xl relative overflow-hidden flex flex-col gap-6">
                <div className="flex items-center gap-5 relative z-10">
                    <button 
                        onClick={toggleAvatar}
                        aria-label="Change avatar"
                        className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-teal-500/30 relative group flex-shrink-0 active:scale-95 transition-all"
                    >
                        <img src={user.picture} alt="Avatar" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <RefreshCcw size={20} className="text-white" />
                        </div>
                    </button>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 group">
                            <input 
                                value={user.name}
                                onChange={handleNameChange}
                                className="bg-transparent text-2xl font-bold font-outfit text-white outline-none w-full placeholder:text-white/30 border-b border-transparent focus:border-teal-500/50 transition-all p-0"
                            />
                            <Edit2 size={12} className="text-white/20 group-hover:text-white/50 transition-colors" />
                        </div>
                        <div className="flex items-center gap-2">
                             <p className="text-teal-300/40 font-medium text-sm truncate">{user.email}</p>
                             {user.isPremium && <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0">PRO</span>}
                        </div>
                    </div>
                </div>
                
                {/* Premium Shine */}
                {user.isPremium && <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[200%] bg-amber-500/10 blur-[50px] rotate-45 pointer-events-none" />}
              </div>
              
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-teal-400/50 mb-2 px-2">Configuration</h4>
                
                {!user.isPremium && (
                  <button onClick={() => { setShowProfile(false); setShowPaywall(true); }} className="w-full p-6 bg-gradient-to-r from-amber-400 to-orange-500 rounded-[30px] flex items-center justify-between shadow-[0_10px_30px_-10px_rgba(245,158,11,0.3)] active:scale-95 transition-all group overflow-hidden relative">
                    <div className="flex items-center gap-4 relative z-10 text-black">
                       <div className="w-10 h-10 bg-black/10 rounded-xl flex items-center justify-center"><Crown size={20} /></div>
                       <span className="font-bold font-outfit">Upgrade to Flow+</span>
                    </div>
                    <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  </button>
                )}

                <button onClick={handleGoalClick} className="w-full p-6 glass rounded-[30px] flex items-center justify-between border-white/5 hover:bg-white/5 transition-all group active:scale-95">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center text-teal-400"><Target size={20} /></div>
                    <span className="font-bold font-outfit">Goals & Baselines</span>
                  </div>
                  {!user.isPremium && <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center"><Trash2 size={12} className="opacity-0" /><Crown size={12} className="text-amber-500" /></div>}
                </button>

                <button onClick={exportDataCSV} className="w-full p-6 glass rounded-[30px] flex items-center justify-between border-white/5 hover:bg-white/5 transition-all group active:scale-95">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center text-teal-400"><Download size={20} /></div>
                    <span className="font-bold font-outfit">Export Telemetry</span>
                  </div>
                  {!user.isPremium ? 
                     <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center"><Crown size={12} className="text-amber-500" /></div> :
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-30">CSV</span>
                  }
                </button>
              </div>
            </div>
            <button onClick={handleSignOut} className="w-full py-6 bg-rose-500/10 text-rose-500 font-black rounded-[30px] text-lg flex items-center justify-center gap-3 active:scale-95 mb-safe"><LogOut size={20} /> DISCONNECT</button>
          </motion.div>
        )}
        
        {showNotifs && (
          <motion.div 
            initial={{ y: '-100%', opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            exit={{ y: '-100%', opacity: 0 }} 
            transition={{ duration: 0.5, ease: LIQUID_EASE }}
            className="fixed inset-0 z-[400] bg-[#020617]/95 backdrop-blur-[50px] p-6 pt-safe flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500"><BellRing size={20} /></div><h2 className="text-2xl font-black font-outfit tracking-tighter">Insights</h2></div>
              <div className="flex gap-2">
                <button onClick={() => setNotifications([])} className="w-10 h-10 glass rounded-xl flex items-center justify-center text-rose-500/50 active:scale-90 transition-transform"><Trash2 size={20} /></button>
                <button onClick={() => setShowNotifs(false)} className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white/50 active:scale-90 transition-transform"><X size={20} /></button>
              </div>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide pb-24">
              {notifications.length === 0 ? (
                <div className="text-center py-20 opacity-10"><Bell size={48} className="mx-auto mb-4" /><p className="text-sm uppercase tracking-widest font-black">No Active Insights</p></div>
              ) : (
                <AnimatePresence>
                  {notifications.map((n, idx) => (
                    <motion.div 
                       key={n.id} 
                       drag="x"
                       dragConstraints={{ left: 0, right: 0 }}
                       dragElastic={0.1}
                       onDragEnd={(e, info) => {
                         const threshold = 0.5; // 50% threshold
                         const element = e.target as HTMLElement;
                         const width = element.offsetWidth;
                         if (Math.abs(info.offset.x) > width * threshold) {
                           setNotifications(prev => prev.filter(notification => notification.id !== n.id));
                         }
                       }}
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0, x: 0 }}
                       exit={{ opacity: 0, x: -300, scale: 0.8 }}
                       transition={{ 
                         delay: idx * 0.05,
                         exit: { duration: 0.3, ease: "easeOut" },
                         drag: { duration: 0.2 }
                       }}
                       className={`glass p-6 rounded-[30px] border-white/5 space-y-2 shadow-lg cursor-grab active:cursor-grabbing ${!n.read ? 'border-l-4 border-l-teal-500' : ''}`}
                    >
                      <div className="flex justify-between">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            n.type === 'AI' ? 'bg-indigo-500/20 text-indigo-400' : 
                            n.type === 'FREEZE' ? 'bg-cyan-500/20 text-cyan-400' :
                            n.type === 'STREAK' ? 'bg-amber-500/20 text-amber-500' :
                            'bg-emerald-500/20 text-emerald-400'
                        }`}>{n.type} Insight</span>
                        <span className="text-[9px] text-white/10">{n.time}</span>
                      </div>
                      <h4 className="text-lg font-bold font-outfit">{n.title}</h4><p className="text-teal-200/30 text-xs leading-relaxed">{n.message}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE-FIRST BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] pb-safe pointer-events-none">
        <motion.nav 
          initial={{ y: 100, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ type: "spring", damping: 25, stiffness: 250, delay: 0.1 }}
          className="mx-4 mb-4 pointer-events-auto"
        >
          {/* Glass Container - Mobile Optimized */}
          <div className="relative bg-gradient-to-b from-[#0f172a]/98 to-[#0a0f1e]/98 backdrop-blur-2xl rounded-3xl shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)] border border-white/[0.06] overflow-hidden">
            
            {/* Ambient Bottom Glow */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-teal-500/[0.03] to-transparent pointer-events-none" />
            
            {/* Active Indicator Pill */}
            <motion.div
              className="absolute top-2 h-1 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400"
              animate={{
                left: view === 'DASHBOARD' ? '8px' : view === 'HISTORY' ? 'calc(66.66% + 4px)' : 'calc(33.33% + 2px)',
                width: view === 'DASHBOARD' || view === 'HISTORY' ? 'calc(33.33% - 12px)' : 'calc(33.33% - 8px)'
              }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
            />
            
            <div className="flex items-stretch justify-around pt-4 pb-3 px-2">
              {/* Dashboard Button - 44px touch target */}
              <motion.button
                onClick={() => changeView('DASHBOARD')}
                whileTap={{ scale: 0.90 }}
                className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[60px] active:bg-white/5 rounded-2xl transition-colors"
              >
                {view === 'DASHBOARD' && (
                  <motion.div
                    layoutId="activeGlow"
                    className="absolute inset-0 bg-teal-500/10 rounded-2xl"
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  />
                )}
                <LayoutGrid 
                  size={26} 
                  className={`relative z-10 transition-all duration-200 ${
                    view === 'DASHBOARD' 
                      ? 'text-teal-400 drop-shadow-[0_0_12px_rgba(20,184,166,0.8)]' 
                      : 'text-white/40'
                  }`}
                  strokeWidth={view === 'DASHBOARD' ? 2.5 : 2}
                />
                <span className={`text-xs font-bold tracking-wide transition-all duration-200 ${
                  view === 'DASHBOARD' 
                    ? 'text-teal-400' 
                    : 'text-white/30'
                }`}>
                  Flow
                </span>
              </motion.button>

              {/* Add Entry Button - 56px touch target */}
              <motion.button
                onClick={handlePlusClick}
                whileTap={{ scale: 0.88 }}
                className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[60px] active:bg-white/5 rounded-2xl transition-colors"
              >
                <div className="relative">
                  {/* Glow Effect */}
                  <div className="absolute -inset-3 bg-gradient-to-br from-teal-500/40 to-cyan-500/40 rounded-2xl blur-lg" />
                  
                  {/* Button */}
                  <div className="relative w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-[0_4px_24px_-4px_rgba(20,184,166,0.6)] border border-white/20">
                    <Plus size={30} strokeWidth={2.5} className="text-white" />
                    
                    {/* Subtle Shine */}
                    <div className="absolute inset-[1px] bg-gradient-to-br from-white/30 to-transparent rounded-[14px] opacity-40" />
                  </div>
                </div>
                <span className="text-xs font-bold text-white/40 tracking-wide">Add</span>
              </motion.button>

              {/* History Button - 44px touch target */}
              <motion.button
                onClick={() => changeView('HISTORY')}
                whileTap={{ scale: 0.90 }}
                className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[60px] active:bg-white/5 rounded-2xl transition-colors"
              >
                {view === 'HISTORY' && (
                  <motion.div
                    layoutId="activeGlow"
                    className="absolute inset-0 bg-teal-500/10 rounded-2xl"
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  />
                )}
                <History 
                  size={26} 
                  className={`relative z-10 transition-all duration-200 ${
                    view === 'HISTORY' 
                      ? 'text-teal-400 drop-shadow-[0_0_12px_rgba(20,184,166,0.8)]' 
                      : 'text-white/40'
                  }`}
                  strokeWidth={view === 'HISTORY' ? 2.5 : 2}
                />
                <span className={`text-xs font-bold tracking-wide transition-all duration-200 ${
                  view === 'HISTORY' 
                    ? 'text-teal-400' 
                    : 'text-white/30'
                }`}>
                  Logs
                </span>
              </motion.button>
            </div>
          </div>
        </motion.nav>
      </div>
    </div>
  );
};
const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
