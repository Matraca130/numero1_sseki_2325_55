/**
 * useFlashcardCoverage.test.ts — Tests for the flashcard↔topic FSRS coverage hook (T-01)
 *
 * Coverage: initial load, keywordStats aggregation from mapping + queue,
 *           fallback to study-queue when mapping fetch fails, refresh()
 *           bypassing the cache, empty-deck edge case, due/new counters.
 *
 * NOTE (MASTERY-SYSTEMS.md): `avgPKnow` / `avgStability` / `avgDifficulty`
 * derive from StudyQueueItem FSRS scheduling (p_know here is the card's
 * SRS probability-of-recall, Sistema B domain — card mastery absoluto).
 * The hook only averages; no threshold comparisons are made.
 *
 * Mocks: @/app/services/flashcardMappingApi (getAllFlashcardMappings)
 *        → mocked via dynamic vi.mock and module reset to bypass
 *          the module-level cache between scenarios.
 *
 * Run: npx vitest run src/app/hooks/__tests__/useFlashcardCoverage.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import type { StudyQueueItem } from '@/app/lib/studyQueueApi';

// ── Mock setup (declared once; reset per test via resetModules) ──

const mockGetAllFlashcardMappings = vi.fn();

vi.mock('@/app/services/flashcardMappingApi', () => ({
  getAllFlashcardMappings: (...args: unknown[]) => mockGetAllFlashcardMappings(...args),
}));

// Mock AuthContext so the hook can read selectedInstitution.
// The cache is keyed by institutionId (#746); per-test mutation of this
// object lets us simulate institution switches.
let mockAuthValues: { selectedInstitution: { id: string } | null } = {
  selectedInstitution: { id: 'inst-test' },
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

function makeMapping(
  entries: Array<[string, string, string | null]>
): Map<string, { subtopic_id: string | null; keyword_id: string }> {
  const m = new Map<string, { subtopic_id: string | null; keyword_id: string }>();
  for (const [id, kw, sub] of entries) {
    m.set(id, { subtopic_id: sub, keyword_id: kw });
  }
  return m;
}

// We must reset modules between tests to clear the module-level _mappingCache.
async function loadHook() {
  const mod = await import('../useFlashcardCoverage');
  return mod.useFlashcardCoverage;
}

beforeEach(() => {
  vi.resetModules();
  mockGetAllFlashcardMappings.mockReset();
  mockAuthValues = { selectedInstitution: { id: 'inst-test' } };
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────

describe('useFlashcardCoverage', () => {
  it('starts in loading state with empty maps', async () => {
    mockGetAllFlashcardMappings.mockResolvedValueOnce(new Map());
    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage([], true));
    expect(result.current.loading).toBe(true);
    expect(result.current.mappingLookup.size).toBe(0);
    expect(result.current.keywordStats.size).toBe(0);
  });

  it('loads mapping and completes loading when sqLoading=false', async () => {
    const mapping = makeMapping([
      ['fc-1', 'kw-A', 'sub-A'],
      ['fc-2', 'kw-A', 'sub-A'],
      ['fc-3', 'kw-B', 'sub-B'],
    ]);
    mockGetAllFlashcardMappings.mockResolvedValueOnce(mapping);
    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage([], false));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mappingLookup.size).toBe(3);
    expect(result.current.fallback).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('remains loading=true when sqLoading=true even after fetch resolves', async () => {
    mockGetAllFlashcardMappings.mockResolvedValueOnce(new Map());
    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage([], true));
    // mapping fetched but sq still loading → loading stays true
    await waitFor(() => expect(result.current.mappingLookup.size).toBe(0));
    expect(result.current.loading).toBe(true);
  });

  it('computes keywordStats from mapping totals + queue items', async () => {
    // mapping: kw-A has 2 cards, kw-B has 1 card
    const mapping = makeMapping([
      ['fc-1', 'kw-A', 'sub-A'],
      ['fc-2', 'kw-A', 'sub-A'],
      ['fc-3', 'kw-B', 'sub-B'],
    ]);
    mockGetAllFlashcardMappings.mockResolvedValueOnce(mapping);

    // queue has scheduling for fc-1 (kw-A) and fc-3 (kw-B) — only 1 of kw-A's 2 is scheduled
    const queue: StudyQueueItem[] = [
      makeQueueItem({ flashcard_id: 'fc-1', keyword_id: 'kw-A', p_know: 0.4, stability: 5, difficulty: 4, is_new: false, due_at: '2020-01-01T00:00:00Z' }),
      makeQueueItem({ flashcard_id: 'fc-3', keyword_id: 'kw-B', p_know: 0.8, stability: 20, difficulty: 6, is_new: true, due_at: null, fsrs_state: 'new' }),
    ];

    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage(queue, false));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const statsA = result.current.keywordStats.get('kw-A')!;
    const statsB = result.current.keywordStats.get('kw-B')!;
    expect(statsA).toBeDefined();
    expect(statsB).toBeDefined();

    // kw-A: 2 total cards in mapping, 1 scheduled, 1 due (past date), 0 new
    expect(statsA.totalCards).toBe(2);
    expect(statsA.scheduledCards).toBe(1);
    expect(statsA.dueCards).toBe(1);
    expect(statsA.newCards).toBe(0);
    expect(statsA.avgPKnow).toBeCloseTo(0.4, 5);
    expect(statsA.coverage).toBeCloseTo(0.5, 5);

    // kw-B: 1 total, 1 scheduled, 1 new (fsrs_state=new), 0 due (due_at null)
    expect(statsB.totalCards).toBe(1);
    expect(statsB.scheduledCards).toBe(1);
    expect(statsB.newCards).toBe(1);
    expect(statsB.dueCards).toBe(0);
    expect(statsB.coverage).toBe(1);
  });

  it('coverage caps at 1 when queue has more scheduled than mapping has total', async () => {
    const mapping = makeMapping([['fc-1', 'kw-A', 'sub-A']]); // only 1
    mockGetAllFlashcardMappings.mockResolvedValueOnce(mapping);
    const queue: StudyQueueItem[] = [
      makeQueueItem({ flashcard_id: 'fc-1', keyword_id: 'kw-A' }),
      makeQueueItem({ flashcard_id: 'fc-2', keyword_id: 'kw-A' }),
    ];
    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage(queue, false));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const stats = result.current.keywordStats.get('kw-A')!;
    // totalCards = max(total=1, scheduled=2) = 2 (source line 88)
    expect(stats.totalCards).toBe(2);
    expect(stats.scheduledCards).toBe(2);
    expect(stats.coverage).toBe(1); // clamped by Math.min(ratio, 1)
  });

  it('returns coverage=0 when a keyword has total=0 in mapping', async () => {
    // Keyword kw-Z exists only in the queue, not in mapping
    const mapping = makeMapping([['fc-1', 'kw-A', 'sub-A']]);
    mockGetAllFlashcardMappings.mockResolvedValueOnce(mapping);
    const queue: StudyQueueItem[] = [
      makeQueueItem({ flashcard_id: 'fc-orphan', keyword_id: 'kw-Z', p_know: 0.7 }),
    ];
    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage(queue, false));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const stats = result.current.keywordStats.get('kw-Z')!;
    expect(stats.totalCards).toBe(1); // max(0, 1)
    expect(stats.scheduledCards).toBe(1);
    // totalByKeyword.get returned undefined → total=0 → coverage=0
    expect(stats.coverage).toBe(0);
  });

  it('ignores queue items with falsy keyword_id (defensive)', async () => {
    const mapping = makeMapping([]);
    mockGetAllFlashcardMappings.mockResolvedValueOnce(mapping);
    const queue: StudyQueueItem[] = [
      makeQueueItem({ flashcard_id: 'fc-bad', keyword_id: '' }),
    ];
    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage(queue, false));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.keywordStats.size).toBe(0);
  });

  it('falls back to study-queue when getAllFlashcardMappings throws', async () => {
    mockGetAllFlashcardMappings.mockRejectedValueOnce(new Error('500 backend down'));
    const queue: StudyQueueItem[] = [
      makeQueueItem({ flashcard_id: 'fc-1', keyword_id: 'kw-A', subtopic_id: 'sub-A' }),
      makeQueueItem({ flashcard_id: 'fc-2', keyword_id: 'kw-A', subtopic_id: 'sub-A' }),
    ];
    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage(queue, false));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fallback).toBe(true);
    expect(result.current.error).toContain('500 backend down');
    // fallback map built from queue items
    expect(result.current.mappingLookup.size).toBe(2);
    expect(result.current.mappingLookup.get('fc-1')).toEqual({ subtopic_id: 'sub-A', keyword_id: 'kw-A' });
  });

  it('sets a non-Error string rejection to a default message', async () => {
    mockGetAllFlashcardMappings.mockRejectedValueOnce('string-reject');
    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage([], false));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fallback).toBe(true);
    expect(result.current.error).toBe('Failed to fetch flashcard mappings');
  });

  it('returns empty keywordStats when deck and queue are both empty', async () => {
    mockGetAllFlashcardMappings.mockResolvedValueOnce(new Map());
    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage([], false));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.keywordStats.size).toBe(0);
  });

  it('refresh() re-fetches mapping (cache bypassed)', async () => {
    const mapping1 = makeMapping([['fc-1', 'kw-A', 'sub-A']]);
    const mapping2 = makeMapping([
      ['fc-1', 'kw-A', 'sub-A'],
      ['fc-2', 'kw-B', 'sub-B'],
    ]);
    mockGetAllFlashcardMappings
      .mockResolvedValueOnce(mapping1)
      .mockResolvedValueOnce(mapping2);

    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage([], false));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mappingLookup.size).toBe(1);

    await act(async () => {
      await result.current.refresh();
    });
    expect(mockGetAllFlashcardMappings).toHaveBeenCalledTimes(2);
    expect(result.current.mappingLookup.size).toBe(2);
  });

  it('avgStability and avgDifficulty are means over scheduled items only', async () => {
    const mapping = makeMapping([
      ['fc-1', 'kw-A', 'sub-A'],
      ['fc-2', 'kw-A', 'sub-A'],
      ['fc-3', 'kw-A', 'sub-A'], // not in queue
    ]);
    mockGetAllFlashcardMappings.mockResolvedValueOnce(mapping);
    const queue: StudyQueueItem[] = [
      makeQueueItem({ flashcard_id: 'fc-1', keyword_id: 'kw-A', stability: 10, difficulty: 4, p_know: 0.5 }),
      makeQueueItem({ flashcard_id: 'fc-2', keyword_id: 'kw-A', stability: 20, difficulty: 6, p_know: 0.7 }),
    ];
    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage(queue, false));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const stats = result.current.keywordStats.get('kw-A')!;
    expect(stats.avgStability).toBeCloseTo(15, 5);
    expect(stats.avgDifficulty).toBeCloseTo(5, 5);
    expect(stats.avgPKnow).toBeCloseTo(0.6, 5);
    // scheduled=2, total=3, coverage ~0.6667
    expect(stats.coverage).toBeCloseTo(2 / 3, 5);
  });

  // ── Regression: #746 — cache must be scoped by institutionId ────
  it('refetches when institutionId changes (does not serve stale per-institution mapping)', async () => {
    const mappingA = makeMapping([['fc-A1', 'kw-A', 'sub-A']]);
    const mappingB = makeMapping([
      ['fc-B1', 'kw-B', 'sub-B'],
      ['fc-B2', 'kw-B', 'sub-B'],
    ]);
    mockGetAllFlashcardMappings
      .mockResolvedValueOnce(mappingA)
      .mockResolvedValueOnce(mappingB);

    mockAuthValues = { selectedInstitution: { id: 'inst-A' } };
    const useFlashcardCoverage = await loadHook();
    const { result, rerender } = renderHook(() => useFlashcardCoverage([], false));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mappingLookup.size).toBe(1);
    expect(result.current.mappingLookup.has('fc-A1')).toBe(true);

    // Simulate institution switch — same hook instance, new institutionId.
    mockAuthValues = { selectedInstitution: { id: 'inst-B' } };
    rerender();

    await waitFor(() => expect(mockGetAllFlashcardMappings).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.mappingLookup.size).toBe(2));
    expect(result.current.mappingLookup.has('fc-A1')).toBe(false);
    expect(result.current.mappingLookup.has('fc-B1')).toBe(true);
  });

  it('does not call the API when no institution is selected', async () => {
    mockAuthValues = { selectedInstitution: null };
    const useFlashcardCoverage = await loadHook();
    const { result } = renderHook(() => useFlashcardCoverage([], false));
    // Hook returned without invoking the API
    await waitFor(() => expect(result.current.mappingLookup.size).toBe(0));
    expect(mockGetAllFlashcardMappings).not.toHaveBeenCalled();
  });
});
