/**
 * useStudyQueueData.test.ts — Regression tests for the shared study-queue hook.
 *
 * Primary focus: SECURITY (#748) — the module-level cache MUST be scoped by
 * userId so a logout→login within the 60s TTL cannot serve user A's
 * personalized FSRS/BKT queue to user B.
 *
 * Mocks:
 *   - @/app/lib/studyQueueApi (getStudyQueue) — controls fetch results
 *   - @/app/context/AuthContext (useAuth) — simulates user switches by
 *     mutating a top-level mockAuthValues object across renders.
 *
 * Pattern: mirrors useFlashcardCoverage.test.ts (the #746 fix that
 * scoped a similar module-level cache by institutionId).
 *
 * Run: npx vitest run src/app/hooks/__tests__/useStudyQueueData.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import type { StudyQueueItem, StudyQueueMeta } from '@/app/lib/studyQueueApi';

// ── Mock setup ────────────────────────────────────────────

const mockGetStudyQueue = vi.fn();

vi.mock('@/app/lib/studyQueueApi', () => ({
  getStudyQueue: (...args: unknown[]) => mockGetStudyQueue(...args),
}));

// Auth mock — per-test mutation simulates logout→login.
let mockAuthValues: { user: { id: string } | null } = {
  user: { id: 'user-A' },
};

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockAuthValues,
}));

// ── Helpers ───────────────────────────────────────────────

function makeQueueItem(overrides: Partial<StudyQueueItem> = {}): StudyQueueItem {
  return {
    flashcard_id: 'fc-1',
    summary_id: 'sum-1',
    keyword_id: 'kw-1',
    subtopic_id: 'sub-1',
    front: 'Q',
    back: 'A',
    front_image_url: null,
    back_image_url: null,
    need_score: 0.5,
    retention: 0.9,
    mastery_color: 'yellow',
    p_know: 0.5,
    fsrs_state: 'review',
    due_at: null,
    stability: 10,
    difficulty: 5,
    is_new: false,
    is_leech: false,
    consecutive_lapses: 0,
    clinical_priority: 0,
    ...overrides,
  };
}

function makeMeta(overrides: Partial<StudyQueueMeta> = {}): StudyQueueMeta {
  return {
    total_due: 0,
    total_new: 0,
    total_in_queue: 0,
    returned: 0,
    limit: 200,
    include_future: true,
    course_id: null,
    generated_at: new Date().toISOString(),
    algorithm: 'fsrs',
    weights: {
      overdueWeight: 1,
      masteryWeight: 1,
      fragilityWeight: 1,
      noveltyWeight: 1,
      graceDays: 0,
    },
    ...overrides,
  };
}

// We must reset modules between tests to clear module-level _cache/_inflight.
async function loadHook() {
  const mod = await import('../useStudyQueueData');
  return mod.useStudyQueueData;
}

beforeEach(() => {
  vi.resetModules();
  mockGetStudyQueue.mockReset();
  mockAuthValues = { user: { id: 'user-A' } };
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────

describe('useStudyQueueData', () => {
  it('fetches the study queue for the active user/course', async () => {
    const itemA = makeQueueItem({ flashcard_id: 'fc-A1', p_know: 0.8 });
    mockGetStudyQueue.mockResolvedValueOnce({ queue: [itemA], meta: makeMeta() });

    const useStudyQueueData = await loadHook();
    const { result } = renderHook(() => useStudyQueueData('course-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].flashcard_id).toBe('fc-A1');
    expect(mockGetStudyQueue).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when no user is authenticated (no leak via empty userId)', async () => {
    mockAuthValues = { user: null };
    const useStudyQueueData = await loadHook();
    const { result } = renderHook(() => useStudyQueueData('course-1'));

    // The effect runs but short-circuits — no API call, empty local state.
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.queue).toEqual([]);
    expect(result.current.meta).toBeNull();
    expect(mockGetStudyQueue).not.toHaveBeenCalled();
  });

  // ── Regression: #748 — cache MUST be scoped by userId ─────
  it('refetches when userId changes (does NOT serve user A queue to user B)', async () => {
    const itemA = makeQueueItem({
      flashcard_id: 'fc-A1',
      p_know: 0.91, // user A's personalized FSRS state
      fsrs_state: 'review',
    });
    const itemB = makeQueueItem({
      flashcard_id: 'fc-B1',
      p_know: 0.12, // user B's personalized FSRS state
      fsrs_state: 'new',
    });
    mockGetStudyQueue
      .mockResolvedValueOnce({ queue: [itemA], meta: makeMeta() })
      .mockResolvedValueOnce({ queue: [itemB], meta: makeMeta() });

    // User A logs in and fetches the queue for course-1.
    mockAuthValues = { user: { id: 'user-A' } };
    const useStudyQueueData = await loadHook();
    const { result, rerender } = renderHook(() => useStudyQueueData('course-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.queue[0].flashcard_id).toBe('fc-A1');
    expect(result.current.queue[0].p_know).toBe(0.91);

    // Simulate logout → login as user B within the 60s TTL.
    // Same hook instance, same courseId, different userId.
    mockAuthValues = { user: { id: 'user-B' } };
    rerender();

    // The hook MUST trigger a new fetch for user B (cache key differs).
    await waitFor(() => expect(mockGetStudyQueue).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.queue[0]?.flashcard_id).toBe('fc-B1'));

    // Critical: user B never sees user A's p_know. This is the security
    // assertion that fails on the buggy (courseId-only) cache.
    expect(result.current.queue[0].p_know).toBe(0.12);
    expect(result.current.queue.some((it) => it.flashcard_id === 'fc-A1')).toBe(false);
  });

  it('clears local state when user logs out (no stale queue lingers)', async () => {
    const itemA = makeQueueItem({ flashcard_id: 'fc-A1' });
    mockGetStudyQueue.mockResolvedValueOnce({ queue: [itemA], meta: makeMeta() });

    mockAuthValues = { user: { id: 'user-A' } };
    const useStudyQueueData = await loadHook();
    const { result, rerender } = renderHook(() => useStudyQueueData('course-1'));
    await waitFor(() => expect(result.current.queue).toHaveLength(1));

    // Logout — user becomes null. Hook should drop user A's local state.
    mockAuthValues = { user: null };
    rerender();

    await waitFor(() => expect(result.current.queue).toEqual([]));
    expect(result.current.meta).toBeNull();
  });

  it('serves the same user from cache within TTL (no duplicate fetch)', async () => {
    const itemA = makeQueueItem({ flashcard_id: 'fc-A1' });
    mockGetStudyQueue.mockResolvedValueOnce({ queue: [itemA], meta: makeMeta() });

    const useStudyQueueData = await loadHook();
    const { result, rerender } = renderHook(() => useStudyQueueData('course-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetStudyQueue).toHaveBeenCalledTimes(1);

    // Re-render with same userId+courseId → cache hit, no extra fetch.
    rerender();
    rerender();
    expect(mockGetStudyQueue).toHaveBeenCalledTimes(1);
  });
});
