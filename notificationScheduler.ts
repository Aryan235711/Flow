import { Notification } from './types';
import { setSafeStorage, getSafeStorage } from './utils';

export interface ScheduledNotification {
  id: string;
  notification: Omit<Notification, 'id' | 'time'>;
  scheduledTime: number; // Unix timestamp
  recurring?: {
    interval: 'daily' | 'weekly' | 'monthly';
    count?: number; // Max occurrences, undefined = infinite
  };
  created: number;
}

class NotificationScheduler {
  private timers = new Map<string, NodeJS.Timeout>();
  private storageKey = 'flow_scheduled_notifications_v1';

  constructor() {
    this.loadScheduledNotifications();
  }

  schedule(
    notification: Omit<Notification, 'id' | 'time'>,
    delayMs: number,
    recurring?: ScheduledNotification['recurring']
  ): string {
    const id = crypto.randomUUID();
    const scheduledTime = Date.now() + delayMs;
    
    const scheduled: ScheduledNotification = {
      id,
      notification,
      scheduledTime,
      recurring,
      created: Date.now()
    };

    this.saveScheduledNotification(scheduled);
    this.setTimer(scheduled);
    
    return id;
  }

  cancel(id: string): boolean {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    
    return this.removeScheduledNotification(id);
  }

  private setTimer(scheduled: ScheduledNotification) {
    const delay = Math.max(0, scheduled.scheduledTime - Date.now());
    
    const timer = setTimeout(() => {
      this.executeNotification(scheduled);
    }, delay);
    
    this.timers.set(scheduled.id, timer);
  }

  private executeNotification(scheduled: ScheduledNotification) {
    // Trigger notification
    const event = new CustomEvent('scheduledNotification', {
      detail: {
        ...scheduled.notification,
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    });
    window.dispatchEvent(event);

    // Handle recurring
    if (scheduled.recurring) {
      const nextScheduled = this.createRecurringNotification(scheduled);
      if (nextScheduled) {
        this.saveScheduledNotification(nextScheduled);
        this.setTimer(nextScheduled);
      }
    }

    // Cleanup
    this.timers.delete(scheduled.id);
    this.removeScheduledNotification(scheduled.id);
  }

  private createRecurringNotification(scheduled: ScheduledNotification): ScheduledNotification | null {
    if (!scheduled.recurring) return null;
    
    const { interval, count } = scheduled.recurring;
    if (count !== undefined && count <= 1) return null;

    let nextDelay: number;
    switch (interval) {
      case 'daily': nextDelay = 24 * 60 * 60 * 1000; break;
      case 'weekly': nextDelay = 7 * 24 * 60 * 60 * 1000; break;
      case 'monthly': nextDelay = 30 * 24 * 60 * 60 * 1000; break;
      default: return null;
    }

    return {
      ...scheduled,
      id: crypto.randomUUID(),
      scheduledTime: scheduled.scheduledTime + nextDelay,
      recurring: count ? { ...scheduled.recurring, count: count - 1 } : scheduled.recurring
    };
  }

  private loadScheduledNotifications() {
    try {
      const stored: ScheduledNotification[] = getSafeStorage(this.storageKey, []);
      const now = Date.now();
      
      stored.forEach(scheduled => {
        if (scheduled.scheduledTime > now) {
          this.setTimer(scheduled);
        } else {
          // Execute overdue notifications immediately
          this.executeNotification(scheduled);
        }
      });
    } catch (error) {
      console.warn('Failed to load scheduled notifications:', error);
    }
  }

  private saveScheduledNotification(scheduled: ScheduledNotification) {
    try {
      const stored: ScheduledNotification[] = getSafeStorage(this.storageKey, []);
      stored.push(scheduled);
      setSafeStorage(this.storageKey, stored.slice(-50)); // Keep max 50 scheduled
    } catch (error) {
      console.error('Failed to save scheduled notification:', error);
    }
  }

  private removeScheduledNotification(id: string): boolean {
    try {
      const stored: ScheduledNotification[] = getSafeStorage(this.storageKey, []);
      const filtered = stored.filter(s => s.id !== id);
      setSafeStorage(this.storageKey, filtered);
      return stored.length !== filtered.length;
    } catch (error) {
      console.error('Failed to remove scheduled notification:', error);
      return false;
    }
  }

  getScheduled(): ScheduledNotification[] {
    return getSafeStorage(this.storageKey, []);
  }
}

export const notificationScheduler = new NotificationScheduler();