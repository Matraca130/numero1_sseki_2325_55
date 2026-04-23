/**
 * useTopicMastery.test.ts — Tests for the topic-level mastery hook.
 *
 * SISTEMA B (MASTERY-SYSTEMS.md): this hook is the CARD-ABSOLUTE side —
 * it reads `p_know` from BKT states and emits `masteryPercent = round(p_know*100)`
 * AS-IS without any delta/priority rescaling. Any threshold decisions live
 * inside MASTERY_LOW_THRESHOLD (0.5) for the `needsReview` flag and in the
 * priority-score heuristic. This file asserts the raw mapping, not any
 * delta-color classification (that is Sistema C and lives in
 * useKeywordMastery).
 *
 * IMPORTANT stability note: the hook's internal `fetchFsrsAndFlashcards` is
 * memoized with `[topicIds]` as the dep. If a test passes a new array
 * literal on every render, it re-triggers the effect infinitely. Every
 * renderHook call in this file therefore uses a STABLE array reference
 * created ONCE at the top of the test.
 *
 * Coverage (happy path + main errors):
 *   - loading state aggregation (studentLoading || fsrsLoading)
 *   - BKT p_know → masteryPercent rounding + attempts passthrough
 *   - Missing BKT state → pKnow=null, masteryPercent=0, needsReview=true
 *   - groupBktByTopic keeps the record with highest total_attempts
 *   - FSRS aggregation per topic (totalCards, dueCount, avgStability, dominant)
 *   - fsrsDueCount only counts states whose `due` is strictly before now
 *   - flashcardToTopicMap built from flashcards with subtopic_id
 *   - topicIds override vs. default (keys of BKT map)
 *   - courseMastery averages masteryPercent per course id
 *   - courseMastery empty when topicToCourseMap not provided
 *   - needsReview true when pKnow < 0.5 OR dueCount > 0
 *   - priorityScore higher for low mastery + overdue cards
 *   - graceful fallback when getFsrsStates rejects → [] (hook still works)
 *   - graceful fallback when getFlashcardsByTopic rejects → topic ignored
 *   - refresh() re-triggers the fetch
 *
 * MOCKS:
 *   - @/app/context/StudentDataContext (useStudentDataContext)
 *   - @/app/services/platformApi (getFsrsStates)
 *   - @/app/services/flashcardApi (getFlashcardsByTopic)
 *   - @/app/utils/constants (getAxonToday, pinned to a fixed instant)
 *
 * RUN: npx vitest run src/app/hooks/__tests__/useTopicMastery.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// ── Pin "now" so `due < now` branch is deterministic ──────
// All FSRS fixtures below compare against 2026-04-18T12:00:00Z.
const FIXED_NOW = new Date('2026-04-18T12:00:00Z');

vi.mock('@/app/utils/constants', () => ({
  getAxonToday: () => new Date(FIXED_NOW),
}));

// ── Context mock ──────────────────────────────────────────
const studentCtxState: { bktStates: any[]; loading: boolean } = {
  bktStates: [],
  loading: false,
};

vi.mock('@/app/context/StudentDataContext', () => ({
  useStudentDataContext: () => studentCtxState,
}));

// ── Service mocks ─────────────────────────────────────────
const getFsrsStatesMock = vi.fn();
const getFlashcardsByTopicMock = vi.fn();

vi.mock('@/app/services/platformApi', () => ({
  getFsrsStates: (...args: any[]) => getFsrsStatesMock(...args),
}));

vi.mock('@/app/services/flashcardApi', () => ({
  getFlashcardsByTopic: (...args: any[]) => getFlashcardsByTopicMock(...args),
}));

// ── Imports AFTER mocks ───────────────────────────────────
import { useTopicMastery } from '@/app/hooks/useTopicMastery';

// ── Stable array references (see note above) ──────────────
// Keep a pool of frozen arrays so test bodies never pass literals that
// would change reference between re-renders.
const IDS_T1 = Object.freeze(['t-1']) as unknown as string[];
const IDS_T1_T2 = Object.freeze(['t-1', 't-2']) as unknown as string[];
const IDS_ORPHAN = Object.freeze(['t-orphan']) as unknown as string[];
const IDS_ABC = Object.freeze(['t-A', 't-B', 't-C']) as unknown as string[];
const IDS_AB = Object.freeze(['t-A', 't-B']) as unknown as string[];
const IDS_WEAK_STRONG = Object.freeze(['t-weak', 't-strong']) as unknown as string[];
const IDS_EMPTY = Object.freeze([]) as unknown as string[];

// ── Fixture helpers ───────────────────────────────────────

function makeBkt(
  subtopic_id: string,
  p_know: number,
  overrides: Record<string, any> = {},
): any {
  return {
    id: `bkt-${subtopic_id}`,
    subtopic_id,
    p_know,
    p_transit: 0.1,
    p_slip: 0.1,
    p_guess: 0.2,
    delta: 0,
    total_attempts: 5,
    correct_attempts: 3,
    last_attempt_at: '2026-04-18T10:00:00Z',
    ...overrides,
  };
}

function makeFsrs(
  flashcard_id: string,
  overrides: Record<string, any> = {},
): any {
  return {
    id: `fs-${flashcard_id}`,
    flashcard_id,
    stability: 5,
    difficulty: 5,
    reps: 1,
    lapses: 0,
    state: 'review' as const,
    due: null,
    ...overrides,
  };
}

function makeFlashcard(id: string, subtopic_id: string | null): any {
  return {
    id,
    summary_id: 'sum-1',
    keyword_id: 'kw-1',
    subtopic_id,
    front: 'Q',
    back: 'A',
    source: 'ai',
    is_active: true,
    deleted_at: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  };
}

function mockFlashcardsByTopic(byTopic: Record<string, any[]>) {
  getFlashcardsByTopicMock.mockImplementation(async (topicId: string) => ({
    items: byTopic[topicId] ?? [],
    total: (byTopic[topicId] ?? []).length,
    limit: 500,
    offset: 0,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  studentCtxState.bktStates = [];
  studentCtxState.loading = false;
  getFsrsStatesMock.mockResolvedValue([]);
  getFlashcardsByTopicMock.mockResolvedValue({
    items: [],
    total: 0,
    limit: 500,
    offset: 0,
  });
});

// ─────────────────────────────────────────────────────────
// Suite 1: loading state
// ─────────────────────────────────────────────────────────

describe('useTopicMastery — loading', () => {
  it('is loading while FSRS fetch is in flight', () => {
    getFsrsStatesMock.mockReturnValueOnce(new Promise(() => {}));
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    expect(result.current.loading).toBe(true);
  });

  it('is loading when student context is loading', async () => {
    studentCtxState.loading = true;
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    // Even after FSRS drains, studentLoading keeps us in loading state.
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
  });

  it('is NOT loading once FSRS resolved and context is ready', async () => {
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });
});

// ─────────────────────────────────────────────────────────
// Suite 2: BKT → masteryPercent mapping (Sistema B)
// ─────────────────────────────────────────────────────────

describe('useTopicMastery — BKT → masteryPercent', () => {
  it('maps p_know=0.6 to masteryPercent=60 (absolute, no rescale)', async () => {
    studentCtxState.bktStates = [
      makeBkt('t-1', 0.6, { total_attempts: 8, correct_attempts: 5 }),
    ];
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const info = result.current.topicMastery.get('t-1')!;
    expect(info.pKnow).toBeCloseTo(0.6, 10);
    expect(info.masteryPercent).toBe(60);
    expect(info.totalAttempts).toBe(8);
    expect(info.correctAttempts).toBe(5);
  });

  it('rounds masteryPercent (e.g. 0.555 → 56)', async () => {
    studentCtxState.bktStates = [makeBkt('t-1', 0.555)];
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.topicMastery.get('t-1')!.masteryPercent).toBe(56);
  });

  it('returns pKnow=null + masteryPercent=0 when no BKT state exists for the topic', async () => {
    studentCtxState.bktStates = [];
    const { result } = renderHook(() => useTopicMastery(IDS_ORPHAN));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const info = result.current.topicMastery.get('t-orphan')!;
    expect(info.pKnow).toBeNull();
    expect(info.masteryPercent).toBe(0);
    expect(info.totalAttempts).toBe(0);
    expect(info.correctAttempts).toBe(0);
    // pKnow is null → hook marks needsReview=true (unknown == review).
    expect(info.needsReview).toBe(true);
  });

  it('needsReview=true when pKnow<0.5 and no due cards', async () => {
    studentCtxState.bktStates = [makeBkt('t-1', 0.3)];
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.topicMastery.get('t-1')!.needsReview).toBe(true);
  });

  it('needsReview=false when pKnow>=0.5 and no due cards', async () => {
    studentCtxState.bktStates = [makeBkt('t-1', 0.8)];
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.topicMastery.get('t-1')!.needsReview).toBe(false);
  });

  it('keeps the BKT record with highest total_attempts when duplicates exist', async () => {
    studentCtxState.bktStates = [
      makeBkt('t-1', 0.2, { id: 'low', total_attempts: 2 }),
      makeBkt('t-1', 0.9, { id: 'hi', total_attempts: 20 }),
      makeBkt('t-1', 0.5, { id: 'mid', total_attempts: 10 }),
    ];
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const info = result.current.topicMastery.get('t-1')!;
    expect(info.pKnow).toBeCloseTo(0.9, 10);
    expect(info.totalAttempts).toBe(20);
  });
});

// ─────────────────────────────────────────────────────────
// Suite 3: FSRS aggregation
// ─────────────────────────────────────────────────────────

describe('useTopicMastery — FSRS aggregation', () => {
  it('aggregates total cards, due count, stability, and dominant state per topic', async () => {
    studentCtxState.bktStates = [makeBkt('t-1', 0.7)];

    mockFlashcardsByTopic({
      't-1': [
        makeFlashcard('fc-1', 't-1'),
        makeFlashcard('fc-2', 't-1'),
        makeFlashcard('fc-3', 't-1'),
      ],
      't-2': [makeFlashcard('fc-4', 't-2')],
    });

    // fc-1 overdue; fc-2 future; fc-3 null. states: 2 review + 1 learning.
    getFsrsStatesMock.mockResolvedValue([
      makeFsrs('fc-1', { state: 'review', stability: 2, due: '2026-04-17T00:00:00Z' }),
      makeFsrs('fc-2', { state: 'review', stability: 10, due: '2026-04-30T00:00:00Z' }),
      makeFsrs('fc-3', { state: 'learning', stability: 0.5, due: null }),
    ]);

    const { result } = renderHook(() => useTopicMastery(IDS_T1_T2));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const info = result.current.topicMastery.get('t-1')!;
    expect(info.fsrsTotalCards).toBe(3);
    expect(info.fsrsDueCount).toBe(1);
    expect(info.avgStability).toBeCloseTo((2 + 10 + 0.5) / 3, 10);
    expect(info.dominantFsrsState).toBe('review');
  });

  it('fsrsDueCount=0 when a card has no due date', async () => {
    studentCtxState.bktStates = [makeBkt('t-1', 0.7)];
    mockFlashcardsByTopic({ 't-1': [makeFlashcard('fc-1', 't-1')] });
    getFsrsStatesMock.mockResolvedValue([makeFsrs('fc-1', { due: null })]);
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.topicMastery.get('t-1')!.fsrsDueCount).toBe(0);
  });

  it('needsReview=true when mastery is fine but cards are due', async () => {
    studentCtxState.bktStates = [makeBkt('t-1', 0.9)];
    mockFlashcardsByTopic({ 't-1': [makeFlashcard('fc-1', 't-1')] });
    getFsrsStatesMock.mockResolvedValue([
      makeFsrs('fc-1', { due: '2026-04-17T00:00:00Z' }),
    ]);
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.topicMastery.get('t-1')!.needsReview).toBe(true);
  });

  it('priorityScore grows as mastery drops and due cards accumulate', async () => {
    studentCtxState.bktStates = [makeBkt('t-weak', 0.2), makeBkt('t-strong', 0.9)];
    mockFlashcardsByTopic({
      't-weak': [makeFlashcard('fc-w1', 't-weak'), makeFlashcard('fc-w2', 't-weak')],
      't-strong': [makeFlashcard('fc-s1', 't-strong')],
    });
    getFsrsStatesMock.mockResolvedValue([
      makeFsrs('fc-w1', { state: 'relearning', stability: 0.1, due: '2026-04-17T00:00:00Z' }),
      makeFsrs('fc-w2', { state: 'learning', stability: 0.2, due: '2026-04-17T00:00:00Z' }),
      makeFsrs('fc-s1', { state: 'review', stability: 100, due: '2026-05-01T00:00:00Z' }),
    ]);

    const { result } = renderHook(() => useTopicMastery(IDS_WEAK_STRONG));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const weak = result.current.topicMastery.get('t-weak')!;
    const strong = result.current.topicMastery.get('t-strong')!;
    expect(weak.priorityScore).toBeGreaterThan(strong.priorityScore);
    expect(weak.priorityScore).toBeLessThanOrEqual(100);
  });

  it('FSRS entries whose flashcard_id is not in any topic are ignored', async () => {
    studentCtxState.bktStates = [makeBkt('t-1', 0.5)];
    mockFlashcardsByTopic({ 't-1': [makeFlashcard('fc-1', 't-1')] });
    getFsrsStatesMock.mockResolvedValue([
      makeFsrs('fc-1', { due: '2026-04-17T00:00:00Z' }),
      makeFsrs('fc-orphan', { due: '2026-04-17T00:00:00Z' }),
    ]);
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const info = result.current.topicMastery.get('t-1')!;
    expect(info.fsrsTotalCards).toBe(1);
    expect(info.fsrsDueCount).toBe(1);
  });

  it('flashcards without subtopic_id do not pollute the map', async () => {
    studentCtxState.bktStates = [makeBkt('t-1', 0.5)];
    mockFlashcardsByTopic({
      't-1': [makeFlashcard('fc-1', 't-1'), makeFlashcard('fc-2', null)],
    });
    getFsrsStatesMock.mockResolvedValue([
      makeFsrs('fc-1', { due: '2026-04-17T00:00:00Z' }),
      makeFsrs('fc-2', { due: '2026-04-17T00:00:00Z' }),
    ]);
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const info = result.current.topicMastery.get('t-1')!;
    expect(info.fsrsTotalCards).toBe(1);
    expect(result.current.flashcardToTopicMap.size).toBe(1);
    expect(result.current.flashcardToTopicMap.get('fc-1')).toBe('t-1');
  });
});

// ─────────────────────────────────────────────────────────
// Suite 4: topicIds vs default + courseMastery
// ─────────────────────────────────────────────────────────

describe('useTopicMastery — topicIds and courseMastery', () => {
  it('defaults to BKT subtopic ids when topicIds is not provided', async () => {
    studentCtxState.bktStates = [makeBkt('t-A', 0.5), makeBkt('t-B', 0.7)];
    const { result } = renderHook(() => useTopicMastery());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const ids = Array.from(result.current.topicMastery.keys()).sort();
    expect(ids).toEqual(['t-A', 't-B']);
    // No topicIds → no per-topic flashcards fetch.
    expect(getFlashcardsByTopicMock).not.toHaveBeenCalled();
  });

  it('does not request flashcards-by-topic when topicIds is empty', async () => {
    studentCtxState.bktStates = [makeBkt('t-A', 0.5)];
    const { result } = renderHook(() => useTopicMastery(IDS_EMPTY));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getFlashcardsByTopicMock).not.toHaveBeenCalled();
    // Caller passed an explicit [] → hook uses it (??-check is "defined",
    // not "truthy"), so topicMastery ends up empty too.
    expect(result.current.topicMastery.size).toBe(0);
  });

  it('courseMastery is empty when topicToCourseMap is not provided', async () => {
    studentCtxState.bktStates = [makeBkt('t-A', 0.8)];
    const AIDS = Object.freeze(['t-A']) as unknown as string[];
    const { result } = renderHook(() => useTopicMastery(AIDS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.courseMastery.size).toBe(0);
  });

  it('courseMastery averages masteryPercent per course', async () => {
    studentCtxState.bktStates = [
      makeBkt('t-A', 0.6),   // 60
      makeBkt('t-B', 0.8),   // 80
      makeBkt('t-C', 0.4),   // 40
    ];
    const topicToCourse = new Map<string, string>([
      ['t-A', 'c-1'],
      ['t-B', 'c-1'],
      ['t-C', 'c-2'],
    ]);
    const { result } = renderHook(() =>
      useTopicMastery(IDS_ABC, topicToCourse),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.courseMastery.get('c-1')).toBe(70); // (60+80)/2
    expect(result.current.courseMastery.get('c-2')).toBe(40);
  });

  it('courseMastery skips topics without a course mapping', async () => {
    studentCtxState.bktStates = [makeBkt('t-A', 0.6), makeBkt('t-B', 1.0)];
    const topicToCourse = new Map<string, string>([['t-A', 'c-1']]);
    const { result } = renderHook(() =>
      useTopicMastery(IDS_AB, topicToCourse),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.courseMastery.get('c-1')).toBe(60);
    expect(result.current.courseMastery.has('c-2')).toBe(false);
    expect(result.current.courseMastery.size).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────
// Suite 5: Error paths + refresh
// ─────────────────────────────────────────────────────────

describe('useTopicMastery — error paths and refresh', () => {
  it('continues with empty FSRS data when getFsrsStates rejects', async () => {
    studentCtxState.bktStates = [makeBkt('t-1', 0.7)];
    getFsrsStatesMock.mockRejectedValueOnce(new Error('fsrs 500'));
    mockFlashcardsByTopic({ 't-1': [makeFlashcard('fc-1', 't-1')] });

    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const info = result.current.topicMastery.get('t-1')!;
    expect(info.fsrsTotalCards).toBe(0);
    expect(info.fsrsDueCount).toBe(0);
    // BKT side still works.
    expect(info.masteryPercent).toBe(70);
  });

  it('tolerates getFlashcardsByTopic rejections via Promise.allSettled', async () => {
    studentCtxState.bktStates = [makeBkt('t-1', 0.7), makeBkt('t-2', 0.5)];
    getFsrsStatesMock.mockResolvedValue([
      makeFsrs('fc-1', { due: '2026-04-17T00:00:00Z' }),
      makeFsrs('fc-2', { due: '2026-04-17T00:00:00Z' }),
    ]);
    getFlashcardsByTopicMock.mockImplementation(async (topicId: string) => {
      if (topicId === 't-1') {
        return { items: [makeFlashcard('fc-1', 't-1')], total: 1, limit: 500, offset: 0 };
      }
      throw new Error('flashcards 500 for ' + topicId);
    });

    const { result } = renderHook(() => useTopicMastery(IDS_T1_T2));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const t1 = result.current.topicMastery.get('t-1')!;
    const t2 = result.current.topicMastery.get('t-2')!;
    expect(t1.fsrsTotalCards).toBe(1);
    expect(t2.fsrsTotalCards).toBe(0);
    expect(t2.fsrsDueCount).toBe(0);
  });

  it('refresh() re-invokes the fetch pipeline', async () => {
    studentCtxState.bktStates = [makeBkt('t-1', 0.7)];
    mockFlashcardsByTopic({ 't-1': [] });
    const { result } = renderHook(() => useTopicMastery(IDS_T1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const fsrsCallsBefore = getFsrsStatesMock.mock.calls.length;
    const flashcardCallsBefore = getFlashcardsByTopicMock.mock.calls.length;

    await act(async () => {
      await result.current.refresh();
    });

    expect(getFsrsStatesMock.mock.calls.length).toBeGreaterThan(fsrsCallsBefore);
    expect(getFlashcardsByTopicMock.mock.calls.length).toBeGreaterThan(
      flashcardCallsBefore,
    );
  });
});
