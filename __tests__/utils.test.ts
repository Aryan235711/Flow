import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateFlag, getLocalDate, clearAppStorage, STORAGE_KEYS, generateFreezeEntry, DEFAULT_CONFIG, validateUserConfig } from '../utils';

describe('utils', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.spyOn(global, 'localStorage', 'get').mockReturnValue({
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      key: (i: number) => Object.keys(store)[i] ?? null,
      length: Object.keys(store).length
    } as any);
  });

  it('calculateFlag respects inverse ratio', () => {
    expect(calculateFlag(60, 70, true)).toBe('GREEN');
    expect(calculateFlag(90, 70, true)).toBe('RED');
  });

  it('getLocalDate returns YYYY-MM-DD without UTC skew', () => {
    const iso = getLocalDate(new Date('2024-01-02T01:00:00Z'));
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('clearAppStorage removes app keys only', () => {
    const keys = [
      STORAGE_KEYS.HISTORY,
      STORAGE_KEYS.CONFIG,
      STORAGE_KEYS.STAGE,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.NOTIFS,
      'last_upsell',
      'unrelated_key'
    ];
    keys.forEach(k => localStorage.setItem(k, 'x'));
    clearAppStorage();
    expect(localStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
    expect(localStorage.getItem('unrelated_key')).toBe('x');
  });

  it('generateFreezeEntry sets penalizing metrics', () => {
    const entry = generateFreezeEntry('2024-01-01', DEFAULT_CONFIG.wearableBaselines);
    expect(entry.isSystemGenerated).toBe(true);
    expect(entry.rawValues.cognition).toBe('FROZEN');
    expect(entry.processedState.hrv).toBe('RED');
  });

  it('calculateFlag handles edge cases safely', () => {
    expect(calculateFlag(60, 0)).toBe('RED'); // Division by zero
    expect(calculateFlag(NaN, 70)).toBe('RED'); // NaN value
    expect(calculateFlag(60, NaN)).toBe('RED'); // NaN baseline
    expect(calculateFlag(Infinity, 70)).toBe('RED'); // Infinite value
  });

  it('validateUserConfig sanitizes invalid data', () => {
    const invalidConfig = {
      wearableBaselines: { sleep: -5, rhr: 300, hrv: 0 },
      manualTargets: { protein: -10, gut: 10, sun: 'Invalid', exercise: 'Extreme' },
      streakLogic: { freezesAvailable: -1, lastFreezeReset: 'invalid-date' }
    };

    const validated = validateUserConfig(invalidConfig);

    // Should use defaults for invalid values
    expect(validated.wearableBaselines.sleep).toBe(DEFAULT_CONFIG.wearableBaselines.sleep);
    expect(validated.wearableBaselines.rhr).toBe(DEFAULT_CONFIG.wearableBaselines.rhr);
    expect(validated.manualTargets.protein).toBe(DEFAULT_CONFIG.manualTargets.protein);
    expect(validated.streakLogic.freezesAvailable).toBe(DEFAULT_CONFIG.streakLogic.freezesAvailable);
  });

  it('validateUserConfig accepts valid data', () => {
    const validConfig = {
      wearableBaselines: { sleep: 8, rhr: 65, hrv: 50 },
      manualTargets: { protein: 120, gut: 4, sun: 'Full', exercise: 'Medium' },
      streakLogic: { freezesAvailable: 2, lastFreezeReset: '2024-01-01T00:00:00.000Z' }
    };

    const validated = validateUserConfig(validConfig);

    expect(validated.wearableBaselines.sleep).toBe(8);
    expect(validated.manualTargets.protein).toBe(120);
    expect(validated.streakLogic.freezesAvailable).toBe(2);
  });
});
