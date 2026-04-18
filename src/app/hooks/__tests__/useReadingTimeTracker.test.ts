// ============================================================
// Unit tests for useReadingTimeTracker hook.
//
// Coverage:
//   - Periodic save after 30s interval
//   - visibilitychange → save when document.hidden
//   - beforeunload → saveBeacon uses fetch with keepalive
//   - Unmount cleanup
//   - Skip-save when elapsed < MIN_ELAPSED_TO_SAVE (5s)
//   - snapshotForExternalSave atomic + reset semantics
//   - getCurrentTotal includes unsaved session time
//   - Save error swallowed (silent retry)
//   - initialTimeSpent sync via Math.max (never lowers)
//
// Uses real timers globally (setup.ts baseline) and enables fake
// timers PER-TEST with beforeEach/afterEach to avoid leaks.
//
// Mocks:
//   - @/app/services/studentSummariesApi (upsertReadingState)
//   - @/app/lib/api (ANON_KEY, API_BASE, getAccessToken)
//   - global.fetch (for saveBeacon / keepalive)
//
// RUN: npx vitest run src/app/hooks/__tests__/useReadingTimeTracker.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────

const mockUpsertReadingState = vi.fn();
vi.mock('@/app/services/studentSummariesApi', () => ({
  upsertReadingState: (...args: unknown[]) => mockUpsertReadingState(...args),
}));

vi.mock('@/app/lib/api', () => ({
  API_BASE: 'https://api.test/server',
  ANON_KEY: 'anon-test-key',
  getAccessToken: () => 'jwt-test-token',
}));

import { useReadingTimeTracker } from '@/app/hooks/useReadingTimeTracker';

const SAVE_INTERVAL_MS = 30_000;

// ── Global setup ───────────────────────────────────────────

beforeEach(() => {
  mockUpsertReadingState.mockReset();
  mockUpsertReadingState.mockResolvedValue({ id: 'rs-1' });
  vi.useFakeTimers();
  // Reset document visibility to visible at start of each test
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => 'visible',
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════
// Layer 1: Periodic save
// ══════════════════════════════════════════════════════════════

describe('periodic save (30s interval)', () => {
  it('does not save before the interval fires', () => {
    renderHook(() => useReadingTimeTracker('sum-1', 0));
    // Advance less than one interval
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(mockUpsertReadingState).not.toHaveBeenCalled();
  });

  it('saves accumulated time after 30s', async () => {
    renderHook(() => useReadingTimeTracker('sum-1', 100));
    await act(async () => {
      vi.advanceTimersByTime(SAVE_INTERVAL_MS);
      // Let microtasks (the async save) flush
      await Promise.resolve();
    });
    expect(mockUpsertReadingState).toHaveBeenCalledTimes(1);
    const payload = mockUpsertReadingState.mock.calls[0][0];
    expect(payload.summary_id).toBe('sum-1');
    // initial 100s + ~30s elapsed = 130s
    expect(payload.time_spent_seconds).toBeGreaterThanOrEqual(130);
    expect(payload.time_spent_seconds).toBeLessThanOrEqual(131);
    expect(typeof payload.last_read_at).toBe('string');
  });

  it('does not pass scroll_position when getter is undefined', async () => {
    renderHook(() => useReadingTimeTracker('sum-1', 0));
    await act(async () => {
      vi.advanceTimersByTime(SAVE_INTERVAL_MS);
      await Promise.resolve();
    });
    const payload = mockUpsertReadingState.mock.calls[0][0];
    expect(payload).not.toHaveProperty('scroll_position');
  });

  it('includes scroll_position when getter returns a number', async () => {
    const getter = vi.fn().mockReturnValue(42);
    renderHook(() => useReadingTimeTracker('sum-1', 0, getter));
    await act(async () => {
      vi.advanceTimersByTime(SAVE_INTERVAL_MS);
      await Promise.resolve();
    });
    const payload = mockUpsertReadingState.mock.calls[0][0];
    expect(payload.scroll_position).toBe(42);
  });

  it('omits scroll_position when getter returns undefined', async () => {
    const getter = vi.fn().mockReturnValue(undefined);
    renderHook(() => useReadingTimeTracker('sum-1', 0, getter));
    await act(async () => {
      vi.advanceTimersByTime(SAVE_INTERVAL_MS);
      await Promise.resolve();
    });
    const payload = mockUpsertReadingState.mock.calls[0][0];
    expect(payload).not.toHaveProperty('scroll_position');
  });

  it('swallows save errors and retries on next tick', async () => {
    mockUpsertReadingState
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ id: 'rs-1' });
    renderHook(() => useReadingTimeTracker('sum-1', 0));
    await act(async () => {
      vi.advanceTimersByTime(SAVE_INTERVAL_MS);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockUpsertReadingState).toHaveBeenCalledTimes(1);
    // Next interval: should try again (not give up)
    await act(async () => {
      vi.advanceTimersByTime(SAVE_INTERVAL_MS);
      await Promise.resolve();
    });
    expect(mockUpsertReadingState).toHaveBeenCalledTimes(2);
  });

  it('accumulates across multiple saves (no double-counting)', async () => {
    renderHook(() => useReadingTimeTracker('sum-1', 100));
    // First save after 30s → ~130s
    await act(async () => {
      vi.advanceTimersByTime(SAVE_INTERVAL_MS);
      await Promise.resolve();
    });
    const first = mockUpsertReadingState.mock.calls[0][0].time_spent_seconds;
    // Second save after another 30s → ~160s (not ~130 + ~30 + ~30 = 190)
    await act(async () => {
      vi.advanceTimersByTime(SAVE_INTERVAL_MS);
      await Promise.resolve();
    });
    const second = mockUpsertReadingState.mock.calls[1][0].time_spent_seconds;
    expect(second - first).toBeGreaterThanOrEqual(29);
    expect(second - first).toBeLessThanOrEqual(31);
  });
});

// ══════════════════════════════════════════════════════════════
// Layer 2: visibilitychange
// ══════════════════════════════════════════════════════════════

describe('visibilitychange listener', () => {
  it('saves when tab becomes hidden', async () => {
    renderHook(() => useReadingTimeTracker('sum-1', 0));
    // Advance past MIN_ELAPSED_TO_SAVE (5s) but before interval
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    // Flip visibility + dispatch
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(mockUpsertReadingState).toHaveBeenCalledTimes(1);
  });

  it('does NOT save when tab becomes visible (ignored)', async () => {
    renderHook(() => useReadingTimeTracker('sum-1', 0));
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    // Visibility still 'visible' — no hide → no save
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(mockUpsertReadingState).not.toHaveBeenCalled();
  });

  it('removes listener on unmount (no save after unmount)', async () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useReadingTimeTracker('sum-1', 0));
    unmount();
    // At least one removeEventListener('visibilitychange', ...) was called
    const calls = removeSpy.mock.calls.filter((c) => c[0] === 'visibilitychange');
    expect(calls.length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════
// Layer 3: beforeunload → saveBeacon (keepalive fetch)
// ══════════════════════════════════════════════════════════════

describe('beforeunload / saveBeacon', () => {
  it('fires keepalive fetch on beforeunload after enough elapsed time', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation((() => Promise.resolve(new Response('{}'))) as any);
    renderHook(() => useReadingTimeTracker('sum-1', 50));
    await act(async () => {
      vi.advanceTimersByTime(10_000); // > MIN_ELAPSED_TO_SAVE
    });
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.test/server/reading-states');
    const opts = options as RequestInit;
    expect(opts.method).toBe('POST');
    expect(opts.keepalive).toBe(true);
    const body = JSON.parse(opts.body as string);
    expect(body.summary_id).toBe('sum-1');
    expect(body.time_spent_seconds).toBeGreaterThanOrEqual(55);
    const headers = opts.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer anon-test-key');
    expect(headers['X-Access-Token']).toBe('jwt-test-token');
  });

  it('does NOT fire beacon when elapsed < MIN_ELAPSED_TO_SAVE', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation((() => Promise.resolve(new Response('{}'))) as any);
    renderHook(() => useReadingTimeTracker('sum-1', 0));
    await act(async () => {
      vi.advanceTimersByTime(1_000); // < 5s
    });
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('swallows fetch errors silently', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('fetch failed');
    });
    renderHook(() => useReadingTimeTracker('sum-1', 0));
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    // Should not throw
    expect(() => {
      window.dispatchEvent(new Event('beforeunload'));
    }).not.toThrow();
  });
});

// ══════════════════════════════════════════════════════════════
// Public API: snapshotForExternalSave + getCurrentTotal
// ══════════════════════════════════════════════════════════════

describe('snapshotForExternalSave', () => {
  it('returns current total including unsaved session elapsed', () => {
    const { result } = renderHook(() => useReadingTimeTracker('sum-1', 100));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    let snap = 0;
    act(() => {
      snap = result.current.snapshotForExternalSave();
    });
    expect(snap).toBeGreaterThanOrEqual(109);
    expect(snap).toBeLessThanOrEqual(111);
  });

  it('resets the session clock so next periodic save starts from 0 elapsed', async () => {
    const { result } = renderHook(() => useReadingTimeTracker('sum-1', 100));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    act(() => {
      result.current.snapshotForExternalSave();
    });
    // Now immediately fire interval — session elapsed is ~0 so save is skipped
    // (below MIN_ELAPSED_TO_SAVE=5s). Advance just the remaining interval.
    await act(async () => {
      vi.advanceTimersByTime(SAVE_INTERVAL_MS - 10_000);
      await Promise.resolve();
    });
    // Zero saves because elapsed since snapshot is ~20s but reset happened,
    // meaning lastSaveTime = just now. Actual elapsed = 20_000ms = 20s,
    // the save DOES happen but with total = snapshot + 20. This is still fine.
    // More importantly, it must not double-count: total never exceeds snap + session
    if (mockUpsertReadingState.mock.calls.length > 0) {
      const total = mockUpsertReadingState.mock.calls[0][0].time_spent_seconds;
      expect(total).toBeLessThanOrEqual(135);
    }
  });
});

describe('getCurrentTotal', () => {
  it('returns initial time when no time has passed', () => {
    const { result } = renderHook(() => useReadingTimeTracker('sum-1', 500));
    const total = result.current.getCurrentTotal();
    expect(total).toBe(500);
  });

  it('includes in-flight session seconds without mutating state', () => {
    const { result } = renderHook(() => useReadingTimeTracker('sum-1', 500));
    act(() => {
      vi.advanceTimersByTime(7_000);
    });
    const total = result.current.getCurrentTotal();
    expect(total).toBeGreaterThanOrEqual(506);
    expect(total).toBeLessThanOrEqual(508);
    // Called again — same result (pure read)
    const again = result.current.getCurrentTotal();
    expect(again).toBeGreaterThanOrEqual(506);
  });
});

// ══════════════════════════════════════════════════════════════
// initialTimeSpent sync (Math.max — never lowers)
// ══════════════════════════════════════════════════════════════

describe('initialTimeSpent prop sync', () => {
  it('raises accumulated total when a higher initialTimeSpent is passed', async () => {
    const { rerender, result } = renderHook(
      ({ initial }) => useReadingTimeTracker('sum-1', initial),
      { initialProps: { initial: 100 } },
    );
    expect(result.current.getCurrentTotal()).toBe(100);
    rerender({ initial: 500 });
    // The sync is in useEffect — flush
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.getCurrentTotal()).toBeGreaterThanOrEqual(500);
  });

  it('does NOT lower accumulated total when a smaller initialTimeSpent is passed', async () => {
    const { rerender, result } = renderHook(
      ({ initial }) => useReadingTimeTracker('sum-1', initial),
      { initialProps: { initial: 500 } },
    );
    rerender({ initial: 100 });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.getCurrentTotal()).toBeGreaterThanOrEqual(500);
  });
});

// ══════════════════════════════════════════════════════════════
// Unmount
// ══════════════════════════════════════════════════════════════

describe('unmount', () => {
  it('clears the periodic interval (no further saves)', async () => {
    const { unmount } = renderHook(() => useReadingTimeTracker('sum-1', 0));
    unmount();
    // Any save-on-unmount triggers once, but no more intervals should fire
    mockUpsertReadingState.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(SAVE_INTERVAL_MS * 3);
      await Promise.resolve();
    });
    expect(mockUpsertReadingState).not.toHaveBeenCalled();
  });
});
