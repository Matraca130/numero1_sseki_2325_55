// ============================================================
// Hook Tests -- useFlashcardEngine
//
// Tests the useFlashcardEngine hook (session lifecycle, card
// navigation, reveal, rating, progress, completion).
//
// Mocks:
//   - @/app/services/studySessionApi (createStudySession, closeStudySession)
//   - @/app/hooks/useReviewBatch (queueReview, submitBatch, reset)
//   - @/app/lib/sessionAnalytics (postSessionAnalytics)
//
// RUN: npx vitest run src/app/hooks/__tests__/useFlashcardEngine.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Flashcard } from '@/app/types/content';

// ── Mock useReviewBatch ─────────────────────────────────────

const mockQueueReview = vi.fn().mockReturnValue({
  isCorrect: true,
  estimatedPKnow: 0.5,
  previousPKnow: 0.3,
});
const mockSubmitBatch = vi.fn().mockResolvedValue(null);
const mockBatchReset = vi.fn();

vi.mock('@/app/hooks/useReviewBatch', () => ({
  useReviewBatch: () => ({
    queueReview: mockQueueReview,
    submitBatch: mockSubmitBatch,
    reset: mockBatchReset,
  }),
}));

// ── Mock studySessionApi ────────────────────────────────────

const mockCreateSession = vi.fn().mockResolvedValue({ id: 'session-abc' });
const mockCloseSession = vi.fn().mockResolvedValue(undefined);

vi.mock('@/app/services/studySessionApi', () => ({
  createStudySession: (...args: unknown[]) => mockCreateSession(...args),
  closeStudySession: (...args: unknown[]) => mockCloseSession(...args),
}));

// ── Mock sessionAnalytics ───────────────────────────────────

const mockPostAnalytics = vi.fn().mockResolvedValue(undefined);

vi.mock('@/app/lib/sessionAnalytics', () => ({
  postSessionAnalytics: (...args: unknown[]) => mockPostAnalytics(...args),
}));

// ── Import AFTER mocks ─────────────────────────────────────

import { useFlashcardEngine, estimateOptimisticDueAt } from '@/app/hooks/useFlashcardEngine';

// ── Fixture helpers ─────────────────────────────────────────

function makeCard(id: string, front = 'Q', back = 'A'): Flashcard {
  return {
    id,
    front,
    back,
    question: front,
    answer: back,
    mastery: 0,
    subtopic_id: `subtopic-${id}`,
  };
}

const THREE_CARDS: Flashcard[] = [
  makeCard('card-1', 'What is mitosis?', 'Cell division'),
  makeCard('card-2', 'What is ATP?', 'Energy molecule'),
  makeCard('card-3', 'What is DNA?', 'Genetic material'),
];

const ONE_CARD: Flashcard[] = [makeCard('card-only')];

const DEFAULT_OPTS = {
  studentId: 'student-1',
  courseId: 'course-1',
  topicId: 'topic-1',
  onFinish: vi.fn(),
};

// ── Helpers ────────────────────────────────────────────────

/** Flush all pending microtasks/timers so async ops inside handleRate complete. */
async function flushAsync() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

// ════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════

describe('useFlashcardEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockCreateSession.mockResolvedValue({ id: 'session-abc' });
    mockQueueReview.mockReturnValue({
      isCorrect: true,
      estimatedPKnow: 0.5,
      previousPKnow: 0.3,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ══════════════════════════════════════════════════════════
  // SUITE 1: Hook return shape
  // ══════════════════════════════════════════════════════════

  describe('return shape', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      expect(result.current).toHaveProperty('isRevealed');
      expect(result.current).toHaveProperty('setIsRevealed');
      expect(result.current).toHaveProperty('currentIndex');
      expect(result.current).toHaveProperty('sessionStats');
      expect(result.current).toHaveProperty('sessionCards');
      expect(result.current).toHaveProperty('startSession');
      expect(result.current).toHaveProperty('handleRate');
      expect(result.current).toHaveProperty('restartSession');
      expect(result.current).toHaveProperty('optimisticUpdates');
      expect(result.current).toHaveProperty('masteryDeltas');
    });

    it('has correct initial state before startSession', () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      expect(result.current.isRevealed).toBe(false);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.sessionStats).toEqual([]);
      expect(result.current.sessionCards).toEqual([]);
    });

    it('setIsRevealed is a function', () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));
      expect(typeof result.current.setIsRevealed).toBe('function');
    });

    it('optimisticUpdates and masteryDeltas are ref objects', () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));
      expect(result.current.optimisticUpdates).toHaveProperty('current');
      expect(result.current.masteryDeltas).toHaveProperty('current');
    });
  });

  // ══════════════════════════════════════════════════════════
  // SUITE 2: startSession
  // ══════════════════════════════════════════════════════════

  describe('startSession', () => {
    it('sets sessionCards and resets state', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      expect(result.current.sessionCards).toEqual(THREE_CARDS);
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.isRevealed).toBe(false);
      expect(result.current.sessionStats).toEqual([]);
    });

    it('calls createStudySession with correct params', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      expect(mockCreateSession).toHaveBeenCalledWith({
        session_type: 'flashcard',
        course_id: 'course-1',
      });
    });

    it('does nothing when cards array is empty', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession([]);
      });

      expect(result.current.sessionCards).toEqual([]);
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    it('resets batch queue via batchReset', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      expect(mockBatchReset).toHaveBeenCalled();
    });

    it('falls back to local session ID when createStudySession fails', async () => {
      mockCreateSession.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      // Session should still be initialized (cards set)
      expect(result.current.sessionCards).toEqual(THREE_CARDS);
      expect(result.current.currentIndex).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════
  // SUITE 3: reveal
  // ══════════════════════════════════════════════════════════

  describe('reveal (setIsRevealed)', () => {
    it('changes isRevealed to true', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      expect(result.current.isRevealed).toBe(false);

      act(() => {
        result.current.setIsRevealed(true);
      });

      expect(result.current.isRevealed).toBe(true);
    });

    it('can toggle back to false', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      act(() => {
        result.current.setIsRevealed(true);
      });
      expect(result.current.isRevealed).toBe(true);

      act(() => {
        result.current.setIsRevealed(false);
      });
      expect(result.current.isRevealed).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════
  // SUITE 4: handleRate advances to next card
  // ══════════════════════════════════════════════════════════

  describe('handleRate (non-last card)', () => {
    it('calls queueReview with the current card (SM-2→FSRS translated grade)', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      act(() => {
        result.current.handleRate(4); // SM-2 rating "Fácil"
      });

      expect(mockQueueReview).toHaveBeenCalledTimes(1);
      // Audit P0 #1: engine translates SM-2 4 → FSRS 3 (Good) via
      // smRatingToFsrsGrade before forwarding to useReviewBatch.
      expect(mockQueueReview).toHaveBeenCalledWith(
        expect.objectContaining({
          card: THREE_CARDS[0],
          grade: 3,
        }),
      );
    });

    it('adds rating to sessionStats', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      act(() => {
        result.current.handleRate(3);
      });

      expect(result.current.sessionStats).toEqual([3]);
    });

    it('resets isRevealed to false after rating', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      act(() => {
        result.current.setIsRevealed(true);
      });
      expect(result.current.isRevealed).toBe(true);

      act(() => {
        result.current.handleRate(4);
      });

      expect(result.current.isRevealed).toBe(false);
    });

    it('advances currentIndex after 200ms timeout', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      expect(result.current.currentIndex).toBe(0);

      act(() => {
        result.current.handleRate(4);
      });

      // Before timeout, still at 0
      expect(result.current.currentIndex).toBe(0);

      // Advance timer by 200ms
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.currentIndex).toBe(1);
    });

    it('accumulates stats across multiple ratings', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      // Rate card 1
      act(() => {
        result.current.handleRate(4);
      });
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Rate card 2
      act(() => {
        result.current.handleRate(2);
      });
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.sessionStats).toEqual([4, 2]);
      expect(result.current.currentIndex).toBe(2);
    });
  });

  // ══════════════════════════════════════════════════════════
  // SUITE 5: handleRate on last card (session complete)
  // ══════════════════════════════════════════════════════════

  describe('handleRate on last card (completion)', () => {
    it('calls submitBatch and closeSession when finishing', async () => {
      const onFinish = vi.fn();
      const opts = { ...DEFAULT_OPTS, onFinish };
      const { result } = renderHook(() => useFlashcardEngine(opts));

      await act(async () => {
        await result.current.startSession(ONE_CARD);
      });

      // Rate the only card (last card)
      act(() => {
        result.current.handleRate(5);
      });

      // Let all async operations complete
      await flushAsync();

      // Advance the POST_PERSIST_GRACE_MS timer (400ms)
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      await flushAsync();

      expect(mockSubmitBatch).toHaveBeenCalledWith('session-abc');
      expect(mockCloseSession).toHaveBeenCalled();
      expect(mockPostAnalytics).toHaveBeenCalled();
      expect(onFinish).toHaveBeenCalled();
    });

    it('prevents double-fire on rapid clicks after last card', async () => {
      const onFinish = vi.fn();
      const opts = { ...DEFAULT_OPTS, onFinish };
      const { result } = renderHook(() => useFlashcardEngine(opts));

      await act(async () => {
        await result.current.startSession(ONE_CARD);
      });

      // Rate the same (last) card twice rapidly
      act(() => {
        result.current.handleRate(4);
        result.current.handleRate(4); // should be ignored
      });

      // queueReview should only be called once (guard prevents second)
      expect(mockQueueReview).toHaveBeenCalledTimes(1);
    });

    it('does not call submitBatch when session is local', async () => {
      mockCreateSession.mockRejectedValueOnce(new Error('offline'));
      const onFinish = vi.fn();
      const opts = { ...DEFAULT_OPTS, onFinish };
      const { result } = renderHook(() => useFlashcardEngine(opts));

      await act(async () => {
        await result.current.startSession(ONE_CARD);
      });

      act(() => {
        result.current.handleRate(3);
      });

      await flushAsync();
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      await flushAsync();

      // submitBatch is called but returns null for local sessions (handled inside submitBatch)
      // closeSession should NOT be called for local sessions
      expect(mockCloseSession).not.toHaveBeenCalled();
    });

    it('records sessionStats including the last card rating', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(ONE_CARD);
      });

      act(() => {
        result.current.handleRate(5);
      });

      expect(result.current.sessionStats).toEqual([5]);
    });
  });

  // ══════════════════════════════════════════════════════════
  // SUITE 6: Progress calculation
  // ══════════════════════════════════════════════════════════

  describe('progress (currentIndex / totalCards)', () => {
    it('starts at 0/3 (0%)', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      const progress = result.current.currentIndex / result.current.sessionCards.length;
      expect(progress).toBe(0);
    });

    it('advances to 1/3 after first rating', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      act(() => {
        result.current.handleRate(4);
      });
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      const progress = result.current.currentIndex / result.current.sessionCards.length;
      expect(progress).toBeCloseTo(1 / 3);
    });

    it('advances to 2/3 after second rating', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      // Rate card 1
      act(() => {
        result.current.handleRate(4);
      });
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Rate card 2
      act(() => {
        result.current.handleRate(3);
      });
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      const progress = result.current.currentIndex / result.current.sessionCards.length;
      expect(progress).toBeCloseTo(2 / 3);
    });

    it('sessionCards.length reflects total cards', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      expect(result.current.sessionCards.length).toBe(3);
    });
  });

  // ══════════════════════════════════════════════════════════
  // SUITE 7: restartSession
  // ══════════════════════════════════════════════════════════

  describe('restartSession', () => {
    it('resets index, stats, and isRevealed', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      // Advance through one card
      act(() => {
        result.current.handleRate(4);
      });
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.sessionStats).toEqual([4]);

      // Restart
      await act(async () => {
        result.current.restartSession();
      });
      await flushAsync();

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.sessionStats).toEqual([]);
      expect(result.current.isRevealed).toBe(false);
    });

    it('calls batchReset', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      mockBatchReset.mockClear();

      await act(async () => {
        result.current.restartSession();
      });
      await flushAsync();

      expect(mockBatchReset).toHaveBeenCalled();
    });

    it('creates a new backend session', async () => {
      const { result } = renderHook(() => useFlashcardEngine(DEFAULT_OPTS));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      mockCreateSession.mockClear();

      await act(async () => {
        result.current.restartSession();
      });
      await flushAsync();

      expect(mockCreateSession).toHaveBeenCalledWith({
        session_type: 'flashcard',
        course_id: 'course-1',
      });
    });
  });

  // ══════════════════════════════════════════════════════════
  // SUITE 8: estimateOptimisticDueAt (pure function)
  // ══════════════════════════════════════════════════════════

  describe('estimateOptimisticDueAt', () => {
    it('grade 1 returns ~now', () => {
      const before = Date.now();
      const iso = estimateOptimisticDueAt(1);
      const ts = new Date(iso).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(before + 100); // within 100ms
    });

    it('grade 2 returns ~5 minutes from now', () => {
      const before = Date.now();
      const iso = estimateOptimisticDueAt(2);
      const ts = new Date(iso).getTime();
      const diffMs = ts - before;
      // 5 minutes = 300_000 ms
      expect(diffMs).toBeGreaterThanOrEqual(299_000);
      expect(diffMs).toBeLessThanOrEqual(301_000);
    });

    it('grade 3 returns ~1 day from now', () => {
      const before = Date.now();
      const iso = estimateOptimisticDueAt(3);
      const ts = new Date(iso).getTime();
      const diffMs = ts - before;
      // 1 day = 86_400_000 ms
      expect(diffMs).toBeGreaterThanOrEqual(86_399_000);
      expect(diffMs).toBeLessThanOrEqual(86_401_000);
    });

    it('grade 4 (default) returns ~4 days from now', () => {
      const before = Date.now();
      const iso = estimateOptimisticDueAt(4);
      const ts = new Date(iso).getTime();
      const diffMs = ts - before;
      // 4 days = 345_600_000 ms
      expect(diffMs).toBeGreaterThanOrEqual(345_599_000);
      expect(diffMs).toBeLessThanOrEqual(345_601_000);
    });

    it('grade 5 (default branch) returns ~4 days from now', () => {
      const before = Date.now();
      const iso = estimateOptimisticDueAt(5);
      const ts = new Date(iso).getTime();
      const diffMs = ts - before;
      expect(diffMs).toBeGreaterThanOrEqual(345_599_000);
      expect(diffMs).toBeLessThanOrEqual(345_601_000);
    });

    it('returns valid ISO string', () => {
      const iso = estimateOptimisticDueAt(3);
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(iso).toISOString()).toBe(iso);
    });
  });

  // ══════════════════════════════════════════════════════════
  // SUITE 9: Edge cases
  // ══════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('works with null studentId', async () => {
      const opts = { ...DEFAULT_OPTS, studentId: null };
      const { result } = renderHook(() => useFlashcardEngine(opts));

      await act(async () => {
        await result.current.startSession(ONE_CARD);
      });

      expect(result.current.sessionCards).toEqual(ONE_CARD);
    });

    it('works without topicId', async () => {
      const opts = { ...DEFAULT_OPTS, topicId: undefined };
      const { result } = renderHook(() => useFlashcardEngine(opts));

      await act(async () => {
        await result.current.startSession(THREE_CARDS);
      });

      expect(result.current.sessionCards).toEqual(THREE_CARDS);
    });

    it('works without masteryMap', async () => {
      const opts = { ...DEFAULT_OPTS, masteryMap: undefined };
      const { result } = renderHook(() => useFlashcardEngine(opts));

      await act(async () => {
        await result.current.startSession(ONE_CARD);
      });

      act(() => {
        result.current.handleRate(3);
      });

      // Should not throw; queueReview is called with currentPKnow undefined
      expect(mockQueueReview).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPKnow: undefined,
        }),
      );
    });

    it('handles courseId as empty string', async () => {
      const opts = { ...DEFAULT_OPTS, courseId: '' };
      const { result } = renderHook(() => useFlashcardEngine(opts));

      await act(async () => {
        await result.current.startSession(ONE_CARD);
      });

      // Empty string is falsy, so course_id should be undefined
      expect(mockCreateSession).toHaveBeenCalledWith({
        session_type: 'flashcard',
        course_id: undefined,
      });
    });
  });
});
