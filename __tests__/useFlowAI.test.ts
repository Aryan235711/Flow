import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlowAI } from '../hooks/useFlowAI';
import { DEFAULT_CONFIG, generateMockData } from '../utils';

const mockHistory = generateMockData();

describe('useFlowAI', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ insight: 'Test insight' })
    }) as any;
  });

  it('calls /api/insight and returns text', async () => {
    const { result } = renderHook(() => useFlowAI());
    let insight: string | undefined;
    await act(async () => {
      insight = await result.current.getInsight(mockHistory, DEFAULT_CONFIG);
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/insight', expect.anything());
    expect(insight).toBe('Test insight');
  });

  it('falls back on error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
    const { result } = renderHook(() => useFlowAI());
    let insight: string | undefined;
    await act(async () => {
      insight = await result.current.getInsight(mockHistory, DEFAULT_CONFIG);
    });
    expect(insight).toMatch(/Network latency/);
  });
});
