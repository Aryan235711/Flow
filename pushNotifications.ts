// Basic push notification support
class PushNotificationManager {
  private registration: ServiceWorkerRegistration | null = null;

  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async scheduleNotification(title: string, message: string, delayMs: number): Promise<void> {
    if (!this.registration) {
      await this.initialize();
    }

    // For now, use setTimeout as a fallback
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/icons/icon-192.webp',
          badge: '/icons/icon-72.webp',
          tag: 'flow-notification'
        });
      }
    }, delayMs);
  }
}

export const pushNotificationManager = new PushNotificationManager();