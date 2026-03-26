// ============================================================
// Hook Tests -- useReviewBatch
//
// Tests the useReviewBatch hook (queue reviews, BKT heuristic,
// batch submission, fallback, localStorage persistence, reset).
//
// Mocks:
//   - @/app/services/studySessionApi (submitReviewBatch, fallbackToIndividualPosts)
//   - localStorage (getItem, setItem, removeItem)
//
// RUN: npx vitest run src/app/hooks/__tests__/useReviewBatch.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mock studySessionApi ────────────────────────────────────

const mockSubmitReviewBatch = vi.fn();
const mockFallbackToIndividualPosts = vi.fn();

vi.mock('@/app/services/studySessionApi', () => ({
  submitReviewBatch: (...args: unknown[]) => mockSubmitReviewBatch(...args),
  fallbackToIndividualPosts: (...args: unknown[]) => mockFallbackToIndividualPosts(...args),
}));

// ── Import after mocks ──────────────────────────────────────

import { useReviewBatch, retryPendingBatches } from '@/app/hooks/useReviewBatch';
import type {
  QueueReviewParams,
  ReviewableCard,
  BatchSubmitResult,
} from '@/app/hooks/useReviewBatch';

// ── BKT heuristic constants (mirror source) ─────────────────

const P_LEARN_ESTIMATE = 0.18;
const P_FORGET_ESTIMATE = 0.25;

// ── localStorage mock ───────────────────────────────────────

const LS_KEY = 'axon_pending_review_batch';

let localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { localStorageStore = {}; }),
  get length() { return Object.keys(localStorageStore).length; },
  key: vi.fn((_i: number) => null),
};

// ── Helpers ─────────────────────────────────────────────────

function makeCard(id: string, subtopicId?: string | null): ReviewableCard {
  return { id, subtopic_id: subtopicId };
}

function makeParams(overrides?: Partial<QueueReviewParams>): QueueReviewParams {
  return {
    card: makeCard('card-1', 'sub-1'),
    grade: 4,
    responseTimeMs: 2000,
    currentPKnow: 0.5,
    ...overrides,
  };
}

// ── Setup / Teardown ────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  localStorageStore = {};
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ════════════════════════════════════════════════════════════
// 1. queueReview: agrega item a la cola, retorna isCorrect y estimatedPKnow
// ════════════════════════════════════════════════════════════

describe('queueReview', () => {
  it('returns isCorrect=true and estimated pKnow for grade >= 3', () => {
    const { result } = renderHook(() => useReviewBatch());

    let reviewResult!: ReturnType<typeof result.current.queueReview>;
    act(() => {
      reviewResult = result.current.queueReview(makeParams({ grade: 4, currentPKnow: 0.5 }));
    });

    expect(reviewResult.isCorrect).toBe(true);
    // estimatedPKnow = 0.5 + (1 - 0.5) * 0.18 = 0.59
    expect(reviewResult.estimatedPKnow).toBeCloseTo(0.59, 10);
    expect(reviewResult.previousPKnow).toBe(0.5);
  });

  it('returns isCorrect=false and decremented pKnow for grade < 3', () => {
    const { result } = renderHook(() => useReviewBatch());

    let reviewResult!: ReturnType<typeof result.current.queueReview>;
    act(() => {
      reviewResult = result.current.queueReview(makeParams({ grade: 2, currentPKnow: 0.6 }));
    });

    expect(reviewResult.isCorrect).toBe(false);
    // estimatedPKnow = 0.6 * (1 - 0.25) = 0.45
    expect(reviewResult.estimatedPKnow).toBeCloseTo(0.45, 10);
    expect(reviewResult.previousPKnow).toBe(0.6);
  });

  it('increments batch size after queuing', () => {
    const { result } = renderHook(() => useReviewBatch());

    expect(result.current.getBatchSize()).toBe(0);

    act(() => {
      result.current.queueReview(makeParams());
    });

    expect(result.current.getBatchSize()).toBe(1);
  });

  it('defaults currentPKnow to 0 when omitted', () => {
    const { result } = renderHook(() => useReviewBatch());

    let reviewResult!: ReturnType<typeof result.current.queueReview>;
    act(() => {
      reviewResult = result.current.queueReview(
        makeParams({ grade: 4, currentPKnow: undefined }),
      );
    });

    // resolvedPKnow = 0, estimatedPKnow = 0 + (1 - 0) * 0.18 = 0.18
    expect(reviewResult.previousPKnow).toBe(0);
    expect(reviewResult.estimatedPKnow).toBeCloseTo(P_LEARN_ESTIMATE, 10);
  });

  it('handles card without subtopic_id', () => {
    const { result } = renderHook(() => useReviewBatch());

    let reviewResult!: ReturnType<typeof result.current.queueReview>;
    act(() => {
      reviewResult = result.current.queueReview(
        makeParams({ card: makeCard('card-no-sub', null), currentPKnow: 0.3 }),
      );
    });

    expect(reviewResult.isCorrect).toBe(true);
    // 0.3 + (1 - 0.3) * 0.18 = 0.426
    expect(reviewResult.estimatedPKnow).toBeCloseTo(0.426, 10);
    expect(result.current.getBatchSize()).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════
// 2. BKT visual heuristic: grade >=3 increments, grade <3 decrements
// ════════════════════════════════════════════════════════════

describe('BKT visual heuristic', () => {
  it('grade >= 3 increases p_know via P_LEARN formula', () => {
    const { result } = renderHook(() => useReviewBatch());

    let r!: ReturnType<typeof result.current.queueReview>;
    act(() => {
      r = result.current.queueReview(makeParams({ grade: 3, currentPKnow: 0.4 }));
    });

    expect(r.isCorrect).toBe(true);
    const expected = 0.4 + (1 - 0.4) * P_LEARN_ESTIMATE;
    expect(r.estimatedPKnow).toBeCloseTo(expected, 10);
  });

  it('grade < 3 decreases p_know via P_FORGET formula', () => {
    const { result } = renderHook(() => useReviewBatch());

    let r!: ReturnType<typeof result.current.queueReview>;
    act(() => {
      r = result.current.queueReview(makeParams({ grade: 1, currentPKnow: 0.8 }));
    });

    expect(r.isCorrect).toBe(false);
    const expected = 0.8 * (1 - P_FORGET_ESTIMATE);
    expect(r.estimatedPKnow).toBeCloseTo(expected, 10);
  });

  it('grade == 5 (Easy) also increments', () => {
    const { result } = renderHook(() => useReviewBatch());

    let r!: ReturnType<typeof result.current.queueReview>;
    act(() => {
      r = result.current.queueReview(makeParams({ grade: 5, currentPKnow: 0.7 }));
    });

    expect(r.isCorrect).toBe(true);
    const expected = 0.7 + (1 - 0.7) * P_LEARN_ESTIMATE;
    expect(r.estimatedPKnow).toBeCloseTo(expected, 10);
  });
});

// ════════════════════════════════════════════════════════════
// 3. Multiple reviews of same subtopic accumulate correctly
// ════════════════════════════════════════════════════════════

describe('intra-session BKT accumulation', () => {
  it('second review of same subtopic uses accumulated p_know, not currentPKnow', () => {
    const { result } = renderHook(() => useReviewBatch());

    let r1!: ReturnType<typeof result.current.queueReview>;
    let r2!: ReturnType<typeof result.current.queueReview>;

    act(() => {
      // First review: sub-A, grade 4, currentPKnow 0.5
      r1 = result.current.queueReview(makeParams({
        card: makeCard('card-1', 'sub-A'),
        grade: 4,
        currentPKnow: 0.5,
      }));
    });

    const afterFirst = r1.estimatedPKnow; // 0.5 + (1-0.5)*0.18 = 0.59

    act(() => {
      // Second review: same subtopic sub-A, different card, grade 4
      // Should use 0.59 (accumulated), NOT 0.5 (currentPKnow passed in)
      r2 = result.current.queueReview(makeParams({
        card: makeCard('card-2', 'sub-A'),
        grade: 4,
        currentPKnow: 0.5, // this should be ignored in favor of session accumulator
      }));
    });

    expect(r2.previousPKnow).toBeCloseTo(afterFirst, 10);
    const expectedSecond = afterFirst + (1 - afterFirst) * P_LEARN_ESTIMATE;
    expect(r2.estimatedPKnow).toBeCloseTo(expectedSecond, 10);
    expect(result.current.getBatchSize()).toBe(2);
  });

  it('different subtopics accumulate independently', () => {
    const { result } = renderHook(() => useReviewBatch());

    let rA!: ReturnType<typeof result.current.queueReview>;
    let rB!: ReturnType<typeof result.current.queueReview>;

    act(() => {
      rA = result.current.queueReview(makeParams({
        card: makeCard('card-1', 'sub-A'),
        grade: 4,
        currentPKnow: 0.5,
      }));
    });

    act(() => {
      rB = result.current.queueReview(makeParams({
        card: makeCard('card-2', 'sub-B'),
        grade: 2,
        currentPKnow: 0.8,
      }));
    });

    // sub-A: 0.5 + (1-0.5)*0.18 = 0.59
    expect(rA.estimatedPKnow).toBeCloseTo(0.59, 10);
    // sub-B: 0.8 * (1 - 0.25) = 0.6
    expect(rB.estimatedPKnow).toBeCloseTo(0.6, 10);
    // sub-B used its own currentPKnow since it was first for that subtopic
    expect(rB.previousPKnow).toBe(0.8);
  });

  it('three consecutive reviews of same subtopic chain correctly', () => {
    const { result } = renderHook(() => useReviewBatch());

    let r1!: ReturnType<typeof result.current.queueReview>;
    let r2!: ReturnType<typeof result.current.queueReview>;
    let r3!: ReturnType<typeof result.current.queueReview>;

    act(() => {
      r1 = result.current.queueReview(makeParams({
        card: makeCard('c1', 'sub-X'),
        grade: 4,
        currentPKnow: 0.3,
      }));
    });

    act(() => {
      r2 = result.current.queueReview(makeParams({
        card: makeCard('c2', 'sub-X'),
        grade: 1, // incorrect
        currentPKnow: 0.3,
      }));
    });

    act(() => {
      r3 = result.current.queueReview(makeParams({
        card: makeCard('c3', 'sub-X'),
        grade: 5,
        currentPKnow: 0.3,
      }));
    });

    // r1: 0.3 + (1-0.3)*0.18 = 0.426
    expect(r1.estimatedPKnow).toBeCloseTo(0.426, 10);
    // r2: 0.426 * (1-0.25) = 0.3195
    expect(r2.previousPKnow).toBeCloseTo(0.426, 10);
    expect(r2.estimatedPKnow).toBeCloseTo(0.3195, 10);
    // r3: 0.3195 + (1-0.3195)*0.18 = 0.3195 + 0.122490 = 0.44199
    expect(r3.previousPKnow).toBeCloseTo(0.3195, 10);
    expect(r3.estimatedPKnow).toBeCloseTo(0.3195 + (1 - 0.3195) * P_LEARN_ESTIMATE, 10);
  });
});

// ════════════════════════════════════════════════════════════
// 4. submitBatch: calls API with correct items
// ════════════════════════════════════════════════════════════

describe('submitBatch', () => {
  it('calls submitReviewBatch with session ID and queued items', async () => {
    const mockResponse = {
      processed: 2,
      reviews_created: 2,
      fsrs_updated: 2,
      bkt_updated: 1,
      results: [
        {
          item_id: 'card-1',
          fsrs: { stability: 5, difficulty: 0.3, due_at: '2026-04-01', state: 'review', reps: 1, lapses: 0, consecutive_lapses: 0, is_leech: false },
          bkt: { subtopic_id: 'sub-1', p_know: 0.65, max_p_know: 0.65, delta: 0.15 },
        },
      ],
    };
    mockSubmitReviewBatch.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useReviewBatch());

    act(() => {
      result.current.queueReview(makeParams({ card: makeCard('card-1', 'sub-1'), grade: 4 }));
      result.current.queueReview(makeParams({ card: makeCard('card-2', 'sub-1'), grade: 3 }));
    });

    let submitResult!: BatchSubmitResult | null;
    await act(async () => {
      submitResult = await result.current.submitBatch('session-123');
    });

    expect(mockSubmitReviewBatch).toHaveBeenCalledOnce();
    const [sessionId, items] = mockSubmitReviewBatch.mock.calls[0];
    expect(sessionId).toBe('session-123');
    expect(items).toHaveLength(2);
    expect(items[0].item_id).toBe('card-1');
    expect(items[0].instrument_type).toBe('flashcard');
    expect(items[0].grade).toBe(4);
    expect(items[1].item_id).toBe('card-2');
    expect(items[1].subtopic_id).toBe('sub-1');

    // Returns computed results as a Map
    expect(submitResult).not.toBeNull();
    expect(submitResult!.computedResults.get('card-1')?.bkt?.p_know).toBe(0.65);
    expect(submitResult!.response.reviews_created).toBe(2);

    // Queue should be cleared
    expect(result.current.getBatchSize()).toBe(0);
  });

  it('returns null and clears queue for empty batch', async () => {
    const { result } = renderHook(() => useReviewBatch());

    let submitResult!: BatchSubmitResult | null;
    await act(async () => {
      submitResult = await result.current.submitBatch('session-123');
    });

    expect(submitResult).toBeNull();
    expect(mockSubmitReviewBatch).not.toHaveBeenCalled();
  });

  it('returns null and clears queue for local session ID', async () => {
    const { result } = renderHook(() => useReviewBatch());

    act(() => {
      result.current.queueReview(makeParams());
    });

    let submitResult!: BatchSubmitResult | null;
    await act(async () => {
      submitResult = await result.current.submitBatch('local-abc-123');
    });

    expect(submitResult).toBeNull();
    expect(mockSubmitReviewBatch).not.toHaveBeenCalled();
    expect(result.current.getBatchSize()).toBe(0);
  });

  it('returns null for empty sessionId', async () => {
    const { result } = renderHook(() => useReviewBatch());

    act(() => {
      result.current.queueReview(makeParams());
    });

    let submitResult!: BatchSubmitResult | null;
    await act(async () => {
      submitResult = await result.current.submitBatch('');
    });

    expect(submitResult).toBeNull();
    expect(mockSubmitReviewBatch).not.toHaveBeenCalled();
  });

  it('clears pending batch from localStorage on success', async () => {
    mockSubmitReviewBatch.mockResolvedValueOnce({
      processed: 1, reviews_created: 1, fsrs_updated: 1, bkt_updated: 0,
    });

    const { result } = renderHook(() => useReviewBatch());

    act(() => {
      result.current.queueReview(makeParams());
    });

    await act(async () => {
      await result.current.submitBatch('session-ok');
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(LS_KEY);
  });
});

// ════════════════════════════════════════════════════════════
// 5. Fallback: if batch fails, uses individual fallback
// ════════════════════════════════════════════════════════════

describe('fallback to individual POSTs', () => {
  it('calls fallbackToIndividualPosts when batch submission fails', async () => {
    mockSubmitReviewBatch.mockRejectedValueOnce(new Error('batch 500'));
    mockFallbackToIndividualPosts.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useReviewBatch());

    act(() => {
      result.current.queueReview(makeParams({ card: makeCard('card-1', 'sub-1'), grade: 4 }));
    });

    await act(async () => {
      const res = await result.current.submitBatch('session-fail');
      expect(res).toBeNull();
    });

    expect(mockFallbackToIndividualPosts).toHaveBeenCalledOnce();
    const [sessionId, items] = mockFallbackToIndividualPosts.mock.calls[0];
    expect(sessionId).toBe('session-fail');
    expect(items).toHaveLength(1);
    expect(items[0].item_id).toBe('card-1');
  });

  it('clears localStorage when fallback succeeds', async () => {
    mockSubmitReviewBatch.mockRejectedValueOnce(new Error('batch fail'));
    mockFallbackToIndividualPosts.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useReviewBatch());

    act(() => {
      result.current.queueReview(makeParams());
    });

    await act(async () => {
      await result.current.submitBatch('session-x');
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(LS_KEY);
  });

  it('keeps localStorage when both batch and fallback fail', async () => {
    mockSubmitReviewBatch.mockRejectedValueOnce(new Error('batch fail'));
    mockFallbackToIndividualPosts.mockRejectedValueOnce(new Error('fallback fail'));

    const { result } = renderHook(() => useReviewBatch());

    act(() => {
      result.current.queueReview(makeParams());
    });

    // Before submit, localStorage should have been set by savePendingBatch
    await act(async () => {
      await result.current.submitBatch('session-y');
    });

    // setItem was called (savePendingBatch), but removeItem was NOT called
    expect(localStorageMock.setItem).toHaveBeenCalled();
    // Verify the saved data is still present
    expect(localStorageStore[LS_KEY]).toBeDefined();

    // Queue is still cleared even on failure
    expect(result.current.getBatchSize()).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════
// 6. localStorage persistence: saves batch if submit fails
// ════════════════════════════════════════════════════════════

describe('localStorage persistence', () => {
  it('saves pending batch to localStorage before API call', async () => {
    mockSubmitReviewBatch.mockResolvedValueOnce({
      processed: 1, reviews_created: 1, fsrs_updated: 0, bkt_updated: 0,
    });

    const { result } = renderHook(() => useReviewBatch());

    act(() => {
      result.current.queueReview(makeParams({ card: makeCard('card-ls', 'sub-ls'), grade: 3 }));
    });

    await act(async () => {
      await result.current.submitBatch('session-ls');
    });

    // setItem should have been called with the LS_KEY
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      LS_KEY,
      expect.any(String),
    );

    // Verify the saved data structure
    const savedCall = localStorageMock.setItem.mock.calls.find(
      (call: string[]) => call[0] === LS_KEY,
    );
    expect(savedCall).toBeDefined();
    const saved = JSON.parse(savedCall![1]);
    expect(saved.sessionId).toBe('session-ls');
    expect(saved.items).toHaveLength(1);
    expect(saved.items[0].item_id).toBe('card-ls');
    expect(saved.savedAt).toBeDefined();
  });

  it('retryPendingBatches retries a saved batch via submitReviewBatch', async () => {
    const pending = {
      sessionId: 'session-retry',
      items: [{ item_id: 'card-r', instrument_type: 'flashcard', grade: 4 }],
      savedAt: new Date().toISOString(),
    };
    localStorageStore[LS_KEY] = JSON.stringify(pending);

    mockSubmitReviewBatch.mockResolvedValueOnce({
      processed: 1, reviews_created: 1, fsrs_updated: 1, bkt_updated: 0,
    });

    const retried = await retryPendingBatches();

    expect(retried).toBe(true);
    expect(mockSubmitReviewBatch).toHaveBeenCalledWith('session-retry', pending.items);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(LS_KEY);
  });

  it('retryPendingBatches falls back to individual if batch retry fails', async () => {
    const pending = {
      sessionId: 'session-retry-fb',
      items: [{ item_id: 'card-rfb', instrument_type: 'flashcard', grade: 2 }],
      savedAt: new Date().toISOString(),
    };
    localStorageStore[LS_KEY] = JSON.stringify(pending);

    mockSubmitReviewBatch.mockRejectedValueOnce(new Error('retry batch fail'));
    mockFallbackToIndividualPosts.mockResolvedValueOnce(undefined);

    const retried = await retryPendingBatches();

    expect(retried).toBe(true);
    expect(mockFallbackToIndividualPosts).toHaveBeenCalledWith('session-retry-fb', pending.items);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(LS_KEY);
  });

  it('retryPendingBatches returns false if nothing is pending', async () => {
    const retried = await retryPendingBatches();
    expect(retried).toBe(false);
    expect(mockSubmitReviewBatch).not.toHaveBeenCalled();
  });

  it('retryPendingBatches discards batches older than 24 hours', async () => {
    const old = {
      sessionId: 'session-old',
      items: [{ item_id: 'card-old', instrument_type: 'flashcard', grade: 3 }],
      savedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
    };
    localStorageStore[LS_KEY] = JSON.stringify(old);

    const retried = await retryPendingBatches();

    expect(retried).toBe(false);
    expect(mockSubmitReviewBatch).not.toHaveBeenCalled();
    // loadPendingBatch should have cleared the expired entry
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(LS_KEY);
  });
});

// ════════════════════════════════════════════════════════════
// 7. reset: clears queue and BKT accumulators
// ════════════════════════════════════════════════════════════

describe('reset', () => {
  it('clears the batch queue', () => {
    const { result } = renderHook(() => useReviewBatch());

    act(() => {
      result.current.queueReview(makeParams({ card: makeCard('c1', 'sub-1') }));
      result.current.queueReview(makeParams({ card: makeCard('c2', 'sub-1') }));
    });

    expect(result.current.getBatchSize()).toBe(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.getBatchSize()).toBe(0);
  });

  it('clears BKT session accumulators so next review uses currentPKnow', () => {
    const { result } = renderHook(() => useReviewBatch());

    act(() => {
      // Build up session BKT for sub-A
      result.current.queueReview(makeParams({
        card: makeCard('c1', 'sub-A'),
        grade: 4,
        currentPKnow: 0.5,
      }));
    });

    act(() => {
      result.current.reset();
    });

    // After reset, reviewing sub-A should use currentPKnow again, not accumulated
    let r!: ReturnType<typeof result.current.queueReview>;
    act(() => {
      r = result.current.queueReview(makeParams({
        card: makeCard('c3', 'sub-A'),
        grade: 4,
        currentPKnow: 0.2,
      }));
    });

    // Should use 0.2 (currentPKnow), not the accumulated value from before reset
    expect(r.previousPKnow).toBe(0.2);
    expect(r.estimatedPKnow).toBeCloseTo(0.2 + (1 - 0.2) * P_LEARN_ESTIMATE, 10);
  });
});
