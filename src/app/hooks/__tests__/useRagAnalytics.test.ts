// ============================================================
// Unit tests for useRagAnalytics hook.
//
// Coverage:
//   - fetchAnalytics: guards, passes dateRange, sets state, rethrows errors
//   - fetchCoverage: guards, sets state, rethrows errors
//   - fetchAll: parallel dispatch, phase transitions, concurrent guard,
//     error state
//   - updateDateRange: stores range and refetches analytics only
//   - Computed: feedbackRate, positiveRate, zeroResultRate (null/0 edges)
//
// Mocks: @/app/services/aiService (getRagAnalytics, getEmbeddingCoverage)
//
// RUN: npx vitest run src/app/hooks/__tests__/useRagAnalytics.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks BEFORE imports ────────────────────────────────────

const mockGetRagAnalytics = vi.fn();
const mockGetEmbeddingCoverage = vi.fn();

vi.mock('@/app/services/aiService', () => ({
  getRagAnalytics: (...args: unknown[]) => mockGetRagAnalytics(...args),
  getEmbeddingCoverage: (...args: unknown[]) => mockGetEmbeddingCoverage(...args),
}));

import { useRagAnalytics } from '@/app/hooks/useRagAnalytics';
import type { RagAnalytics, EmbeddingCoverage } from '@/app/services/aiService';

// ── Fixtures ─────────────────────────────────────────────────

const ANALYTICS: RagAnalytics = {
  total_queries: 100,
  avg_similarity: 0.78,
  avg_latency_ms: 450,
  positive_feedback: 60,
  negative_feedback: 20,
  zero_result_queries: 5,
};

const ZERO_ANALYTICS: RagAnalytics = {
  total_queries: 0,
  avg_similarity: null,
  avg_latency_ms: null,
  positive_feedback: 0,
  negative_feedback: 0,
  zero_result_queries: 0,
};

const COVERAGE: EmbeddingCoverage = {
  total_chunks: 500,
  chunks_with_embedding: 450,
  coverage_pct: 90,
};

beforeEach(() => {
  mockGetRagAnalytics.mockReset();
  mockGetEmbeddingCoverage.mockReset();
});

// ══════════════════════════════════════════════════════════════
// Initial state
// ══════════════════════════════════════════════════════════════

describe('useRagAnalytics — initial state', () => {
  it('starts in idle with null analytics/coverage/error', () => {
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    expect(result.current.phase).toBe('idle');
    expect(result.current.analytics).toBeNull();
    expect(result.current.coverage).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('starts with empty dateRange', () => {
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    expect(result.current.dateRange).toEqual({});
  });

  it('computed metrics are null when analytics is null', () => {
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    expect(result.current.feedbackRate).toBeNull();
    expect(result.current.positiveRate).toBeNull();
    expect(result.current.zeroResultRate).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// fetchAnalytics
// ══════════════════════════════════════════════════════════════

describe('fetchAnalytics', () => {
  it('no-ops when institutionId is empty', async () => {
    const { result } = renderHook(() => useRagAnalytics(''));
    await act(async () => {
      const out = await result.current.fetchAnalytics();
      expect(out).toBeUndefined();
    });
    expect(mockGetRagAnalytics).not.toHaveBeenCalled();
  });

  it('stores analytics on success', async () => {
    mockGetRagAnalytics.mockResolvedValueOnce(ANALYTICS);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      await result.current.fetchAnalytics();
    });
    expect(result.current.analytics).toEqual(ANALYTICS);
  });

  it('returns fetched analytics to caller', async () => {
    mockGetRagAnalytics.mockResolvedValueOnce(ANALYTICS);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    let returned: RagAnalytics | undefined;
    await act(async () => {
      returned = await result.current.fetchAnalytics();
    });
    expect(returned).toEqual(ANALYTICS);
  });

  it('uses explicit dateRange when provided', async () => {
    mockGetRagAnalytics.mockResolvedValueOnce(ANALYTICS);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      await result.current.fetchAnalytics({ from: '2026-01-01', to: '2026-04-01' });
    });
    expect(mockGetRagAnalytics).toHaveBeenCalledWith(
      'inst-1',
      { from: '2026-01-01', to: '2026-04-01' }
    );
  });

  it('falls back to stored dateRange when no argument is passed', async () => {
    mockGetRagAnalytics.mockResolvedValue(ANALYTICS);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      result.current.updateDateRange({ from: '2026-02-01' });
    });
    // updateDateRange itself calls fetchAnalytics; clear mock to isolate our next call
    mockGetRagAnalytics.mockClear();
    await act(async () => {
      await result.current.fetchAnalytics();
    });
    expect(mockGetRagAnalytics).toHaveBeenCalledWith('inst-1', { from: '2026-02-01' });
  });

  it('rethrows errors (caller handles)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetRagAnalytics.mockRejectedValueOnce(new Error('analytics failed'));
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      await expect(result.current.fetchAnalytics()).rejects.toThrow('analytics failed');
    });
    spy.mockRestore();
  });
});

// ══════════════════════════════════════════════════════════════
// fetchCoverage
// ══════════════════════════════════════════════════════════════

describe('fetchCoverage', () => {
  it('no-ops when institutionId is empty', async () => {
    const { result } = renderHook(() => useRagAnalytics(''));
    await act(async () => {
      const out = await result.current.fetchCoverage();
      expect(out).toBeUndefined();
    });
    expect(mockGetEmbeddingCoverage).not.toHaveBeenCalled();
  });

  it('stores coverage on success', async () => {
    mockGetEmbeddingCoverage.mockResolvedValueOnce(COVERAGE);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      await result.current.fetchCoverage();
    });
    expect(result.current.coverage).toEqual(COVERAGE);
  });

  it('returns fetched coverage to caller', async () => {
    mockGetEmbeddingCoverage.mockResolvedValueOnce(COVERAGE);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    let returned: EmbeddingCoverage | undefined;
    await act(async () => {
      returned = await result.current.fetchCoverage();
    });
    expect(returned).toEqual(COVERAGE);
  });

  it('rethrows errors', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetEmbeddingCoverage.mockRejectedValueOnce(new Error('coverage failed'));
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      await expect(result.current.fetchCoverage()).rejects.toThrow('coverage failed');
    });
    spy.mockRestore();
  });
});

// ══════════════════════════════════════════════════════════════
// fetchAll
// ══════════════════════════════════════════════════════════════

describe('fetchAll', () => {
  it('no-ops when institutionId is empty', async () => {
    const { result } = renderHook(() => useRagAnalytics(''));
    await act(async () => {
      await result.current.fetchAll();
    });
    expect(mockGetRagAnalytics).not.toHaveBeenCalled();
    expect(mockGetEmbeddingCoverage).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('idle');
  });

  it('transitions idle → loading → ready with analytics + coverage populated', async () => {
    mockGetRagAnalytics.mockResolvedValueOnce(ANALYTICS);
    mockGetEmbeddingCoverage.mockResolvedValueOnce(COVERAGE);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      await result.current.fetchAll();
    });
    expect(result.current.phase).toBe('ready');
    expect(result.current.analytics).toEqual(ANALYTICS);
    expect(result.current.coverage).toEqual(COVERAGE);
    expect(result.current.error).toBeNull();
  });

  it('dispatches both services in parallel', async () => {
    mockGetRagAnalytics.mockResolvedValueOnce(ANALYTICS);
    mockGetEmbeddingCoverage.mockResolvedValueOnce(COVERAGE);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      await result.current.fetchAll();
    });
    expect(mockGetRagAnalytics).toHaveBeenCalledTimes(1);
    expect(mockGetEmbeddingCoverage).toHaveBeenCalledTimes(1);
  });

  it('passes range to analytics and nothing to coverage', async () => {
    mockGetRagAnalytics.mockResolvedValueOnce(ANALYTICS);
    mockGetEmbeddingCoverage.mockResolvedValueOnce(COVERAGE);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      await result.current.fetchAll({ from: '2026-03-01' });
    });
    expect(mockGetRagAnalytics).toHaveBeenCalledWith('inst-1', { from: '2026-03-01' });
    expect(mockGetEmbeddingCoverage).toHaveBeenCalledWith('inst-1');
  });

  it('falls back to stored dateRange when no argument', async () => {
    mockGetRagAnalytics.mockResolvedValue(ANALYTICS);
    mockGetEmbeddingCoverage.mockResolvedValue(COVERAGE);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      result.current.updateDateRange({ from: '2026-02-01' });
    });
    mockGetRagAnalytics.mockClear();
    await act(async () => {
      await result.current.fetchAll();
    });
    expect(mockGetRagAnalytics).toHaveBeenCalledWith('inst-1', { from: '2026-02-01' });
  });

  it('transitions to phase=error with message when analytics fails', async () => {
    mockGetRagAnalytics.mockRejectedValueOnce(new Error('db error'));
    mockGetEmbeddingCoverage.mockResolvedValueOnce(COVERAGE);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      await result.current.fetchAll();
    });
    expect(result.current.phase).toBe('error');
    expect(result.current.error).toBe('db error');
  });

  it('transitions to phase=error when coverage fails', async () => {
    mockGetRagAnalytics.mockResolvedValueOnce(ANALYTICS);
    mockGetEmbeddingCoverage.mockRejectedValueOnce(new Error('coverage err'));
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      await result.current.fetchAll();
    });
    expect(result.current.phase).toBe('error');
    expect(result.current.error).toBe('coverage err');
  });

  it('falls back to generic error message if err.message is absent', async () => {
    mockGetRagAnalytics.mockRejectedValueOnce({});
    mockGetEmbeddingCoverage.mockResolvedValueOnce(COVERAGE);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      await result.current.fetchAll();
    });
    expect(result.current.error).toBe('Error al cargar analytics RAG');
  });

  it('guards against concurrent invocations (fetchingRef)', async () => {
    let resolveA: (v: any) => void = () => {};
    mockGetRagAnalytics.mockImplementationOnce(
      () => new Promise((r) => { resolveA = r; })
    );
    mockGetEmbeddingCoverage.mockImplementationOnce(
      () => new Promise(() => {})
    );
    const { result } = renderHook(() => useRagAnalytics('inst-1'));

    // Kick off first fetchAll — it will hang (never resolves)
    act(() => {
      result.current.fetchAll();
    });
    // Attempt second — should be ignored
    await act(async () => {
      await result.current.fetchAll();
    });
    // Only 1 call each
    expect(mockGetRagAnalytics).toHaveBeenCalledTimes(1);
    expect(mockGetEmbeddingCoverage).toHaveBeenCalledTimes(1);

    // Cleanup
    await act(async () => {
      resolveA(ANALYTICS);
    });
  });
});

// ══════════════════════════════════════════════════════════════
// updateDateRange
// ══════════════════════════════════════════════════════════════

describe('updateDateRange', () => {
  it('stores the new range in state', async () => {
    mockGetRagAnalytics.mockResolvedValueOnce(ANALYTICS);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      result.current.updateDateRange({ from: '2026-03-01', to: '2026-04-01' });
    });
    expect(result.current.dateRange).toEqual({ from: '2026-03-01', to: '2026-04-01' });
  });

  it('triggers fetchAnalytics (but NOT fetchCoverage) on update', async () => {
    mockGetRagAnalytics.mockResolvedValueOnce(ANALYTICS);
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      result.current.updateDateRange({ from: '2026-03-01' });
    });
    expect(mockGetRagAnalytics).toHaveBeenCalledWith('inst-1', { from: '2026-03-01' });
    expect(mockGetEmbeddingCoverage).not.toHaveBeenCalled();
  });

  it('swallows fetchAnalytics errors (handled via .catch)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetRagAnalytics.mockRejectedValueOnce(new Error('bad'));
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    // Should not throw unhandled rejection
    await act(async () => {
      result.current.updateDateRange({ from: '2026-03-01' });
    });
    // Give microtasks a chance
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.dateRange).toEqual({ from: '2026-03-01' });
    spy.mockRestore();
  });
});

// ══════════════════════════════════════════════════════════════
// Computed metrics
// ══════════════════════════════════════════════════════════════

describe('computed metrics', () => {
  async function loadAnalytics(data: RagAnalytics) {
    mockGetRagAnalytics.mockResolvedValueOnce(data);
    mockGetEmbeddingCoverage.mockResolvedValueOnce(COVERAGE);
    const hook = renderHook(() => useRagAnalytics('inst-1'));
    await act(async () => {
      await hook.result.current.fetchAll();
    });
    return hook;
  }

  it('feedbackRate: (positive + negative) / total * 100', async () => {
    const { result } = await loadAnalytics(ANALYTICS);
    // (60 + 20) / 100 * 100 = 80
    expect(result.current.feedbackRate).toBe(80);
  });

  it('feedbackRate returns 0 when total_queries is 0', async () => {
    const { result } = await loadAnalytics(ZERO_ANALYTICS);
    expect(result.current.feedbackRate).toBe(0);
  });

  it('positiveRate: positive / (positive + negative) * 100', async () => {
    const { result } = await loadAnalytics(ANALYTICS);
    // 60 / (60 + 20) * 100 = 75
    expect(result.current.positiveRate).toBe(75);
  });

  it('positiveRate returns null when no feedback at all', async () => {
    const { result } = await loadAnalytics(ZERO_ANALYTICS);
    expect(result.current.positiveRate).toBeNull();
  });

  it('positiveRate returns 100 when all feedback is positive', async () => {
    const { result } = await loadAnalytics({
      ...ANALYTICS,
      positive_feedback: 10,
      negative_feedback: 0,
    });
    expect(result.current.positiveRate).toBe(100);
  });

  it('positiveRate returns 0 when all feedback is negative', async () => {
    const { result } = await loadAnalytics({
      ...ANALYTICS,
      positive_feedback: 0,
      negative_feedback: 10,
    });
    expect(result.current.positiveRate).toBe(0);
  });

  it('zeroResultRate: zero_result_queries / total_queries * 100', async () => {
    const { result } = await loadAnalytics(ANALYTICS);
    // 5 / 100 * 100 = 5
    expect(result.current.zeroResultRate).toBe(5);
  });

  it('zeroResultRate returns 0 when total_queries is 0', async () => {
    const { result } = await loadAnalytics(ZERO_ANALYTICS);
    expect(result.current.zeroResultRate).toBe(0);
  });

  it('all computed metrics null when analytics never loaded', () => {
    const { result } = renderHook(() => useRagAnalytics('inst-1'));
    expect(result.current.feedbackRate).toBeNull();
    expect(result.current.positiveRate).toBeNull();
    expect(result.current.zeroResultRate).toBeNull();
  });
});
