import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  validateNotification, 
  validateNotificationArray, 
  migrateNotifications,
  trackNotificationShown,
  trackNotificationDismissed,
  getNotificationAnalytics,
  Notification
} from '../utils';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Notification Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('validateNotification', () => {
    it('should validate correct notification object', () => {
      const validNotification: Notification = {
        id: 'test-id',
        title: 'Test Title',
        message: 'Test Message',
        time: '10:30',
        read: false,
        type: 'AI'
      };

      expect(validateNotification(validNotification)).toBe(true);
    });

    it('should reject invalid notification objects', () => {
      expect(validateNotification(null)).toBe(false);
      expect(validateNotification({})).toBe(false);
      expect(validateNotification({ id: 'test' })).toBe(false);
      expect(validateNotification({ 
        id: 'test', 
        title: 'Test', 
        message: 'Test', 
        time: '10:30', 
        read: false, 
        type: 'INVALID' 
      })).toBe(false);
    });
  });

  describe('validateNotificationArray', () => {
    it('should filter and limit valid notifications', () => {
      const input = [
        { id: '1', title: 'Valid', message: 'Test', time: '10:30', read: false, type: 'AI' },
        { invalid: 'object' },
        { id: '2', title: 'Valid2', message: 'Test2', time: '10:31', read: true, type: 'SYSTEM' },
        ...Array(15).fill(0).map((_, i) => ({
          id: `${i + 3}`, title: `Title${i}`, message: `Message${i}`, 
          time: '10:32', read: false, type: 'STREAK'
        }))
      ];

      const result = validateNotificationArray(input);
      
      expect(result).toHaveLength(10); // Max 10 notifications
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should return empty array for invalid input', () => {
      expect(validateNotificationArray(null)).toEqual([]);
      expect(validateNotificationArray('invalid')).toEqual([]);
    });
  });

  describe('migrateNotifications', () => {
    it('should migrate malformed notification data', () => {
      const malformedData = [
        { title: 'Test', message: 'Message' }, // Missing required fields
        { id: 'test', title: 'Valid', message: 'Valid', time: '10:30', read: false, type: 'AI' },
        null,
        { title: 'Another', message: 'Test', type: 'INVALID_TYPE' }
      ];

      const result = migrateNotifications(malformedData);
      
      expect(result).toHaveLength(3); // Should be 3 valid items (null filtered out)
      expect(result[0].id).toBeDefined();
      expect(result[0].title).toBe('Test');
      expect(result[0].type).toBe('SYSTEM'); // Default type
      expect(result[1].id).toBe('test');
      expect(result[1].type).toBe('AI');
      expect(result[2].title).toBe('Another');
      expect(result[2].type).toBe('SYSTEM'); // Invalid type becomes SYSTEM
    });

    it('should handle completely invalid data', () => {
      expect(migrateNotifications(null)).toEqual([]);
      expect(migrateNotifications('invalid')).toEqual([]);
      expect(migrateNotifications({})).toEqual([]);
    });
  });

  describe('Analytics Tracking', () => {
    beforeEach(() => {
      // Reset analytics
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
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
      }));
    });

    it('should track notification shown', () => {
      trackNotificationShown('AI');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'notification_analytics',
        expect.stringContaining('"totalShown":1')
      );
    });

    it('should track notification dismissed', () => {
      trackNotificationDismissed('SYSTEM');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'notification_analytics',
        expect.stringContaining('"totalDismissed":1')
      );
    });

    it('should get analytics with defaults', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const analytics = getNotificationAnalytics();
      
      expect(analytics.totalShown).toBe(0);
      expect(analytics.typeBreakdown.AI.shown).toBe(0);
    });
  });
});