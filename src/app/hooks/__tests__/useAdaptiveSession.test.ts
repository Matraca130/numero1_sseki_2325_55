/**
 * useAdaptiveSession.test.ts — Tests for adaptive flashcard session hook
 *
 * Coverage: initial state, startSession, handleRate, phase transitions
 * Mocks: useReviewBatch, studySessionApi, keywordMasteryApi,
 *        adaptiveGenerationApi, sessionAnalytics, useFlashcardEngine
 *
 * Run: npx vitest run src/app/hooks/__tests__/useAdaptiveSession.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────

const mockQueueReview = vi.fn().mockReturnValue({
  estimatedPKnow: 0.6,
  previousPKnow: 0.4,
});
const mockSubmitBatch = vi.fn().mockResolvedValue(undefined);
const mockBatchReset = vi.fn();

vi.mock('../useReviewBatch', () => ({
  useReviewBatch: () => ({
    queueReview: mockQueueReview,
    submitBatch: mockSubmitBatch,
    reset: mockBatchReset,
  }),
}));

const mockCloseStudySession = vi.fn().mockResolvedValue(undefined);

vi.mock('@/app/services/studySessionApi', () => ({
  createStudySession: vi.fn().mockResolvedValue({ id: 'session-123' }),
  closeStudySession: (...args: any[]) => mockCloseStudySession(...args),
}));

vi.mock('@/app/services/keywordMasteryApi', () => ({
  fetchKeywordMasteryByTopic: vi.fn().mockResolvedValue(new Map()),
  computeLocalKeywordMastery: vi.fn().mockReturnValue(new Map()),
  computeTopicMasterySummary: vi.fn().mockReturnValue({
    keywordsMastered: 0,
    keywordsTotal: 0,
    overallMastery: 0,
  }),
}));

const mockGenerateAdaptiveBatch = vi.fn().mockResolvedValue({
  cards: [],
  errors: [],
  stats: { requested: 0, generated: 0, failed: 0, uniqueKeywords: 0, avgPKnow: 0, totalTokens: 0, elapsedMs: 0 },
});
const mockMapBatchToFlashcards = vi.fn().mockReturnValue([]);

vi.mock('@/app/services/adaptiveGenerationApi', () => ({
  generateAdaptiveBatch: (...args: any[]) => mockGenerateAdaptiveBatch(...args),
  mapBatchToFlashcards: (...args: any[]) => mockMapBatchToFlashcards(...args),
}));

const mockPostSessionAnalytics = vi.fn().mockResolvedValue(undefined);

vi.mock('@/app/lib/sessionAnalytics', () => ({
  postSessionAnalytics: (...args: any[]) => mockPostSessionAnalytics(...args),
}));

vi.mock('@/app/lib/session-stats', () => ({
  countCorrect: vi.fn().mockReturnValue(0),
}));

vi.mock('./useFlashcardEngine', () => ({
  estimateOptimisticDueAt: vi.fn().mockReturnValue('2026-04-01T00:00:00Z'),
}));

import { useAdaptiveSession, type UseAdaptiveSessionOpts } from '../useAdaptiveSession';
import type { Flashcard } from '@/app/types/content';

// ── Helpers ───────────────────────────────────────────────

function makeCard(id: string, overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id,
    front: `Front ${id}`,
    back: `Back ${id}`,
    question: `Front ${id}`,
    answer: `Back ${id}`,
    mastery: 0,
    difficulty: 'normal',
    keywords: [],
    summary_id: 'sum-1',
    keyword_id: 'kw-1',
    subtopic_id: 'sub-1',
    source: 'professor',
    ...overrides,
  } as Flashcard;
}

const defaultOpts: UseAdaptiveSessionOpts = {
  studentId: 'student-001',
  courseId: 'course-001',
  topicId: 'topic-001',
  institutionId: 'inst-001',
};

// ── Tests ─────────────────────────────────────────────────

describe('useAdaptiveSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes in idle phase', () => {
    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));

    expect(result.current.phase).toBe('idle');
    expect(result.current.currentCard).toBeNull();
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.totalCards).toBe(0);
    expect(result.current.isRevealed).toBe(false);
    expect(result.current.completedRounds).toEqual([]);
    expect(result.current.roundCount).toBe(0);
  });

  it('transitions to reviewing phase on startSession', async () => {
    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));
    const cards = [makeCard('c1'), makeCard('c2'), makeCard('c3')];

    await act(async () => {
      await result.current.startSession(cards);
    });

    expect(result.current.phase).toBe('reviewing');
    expect(result.current.totalCards).toBe(3);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentCard).toBeTruthy();
    expect(result.current.currentCard?.id).toBe('c1');
  });

  it('does not start session with empty cards', async () => {
    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));

    await act(async () => {
      await result.current.startSession([]);
    });

    expect(result.current.phase).toBe('idle');
  });

  it('does not start session without studentId', async () => {
    const { result } = renderHook(() =>
      useAdaptiveSession({ ...defaultOpts, studentId: null }),
    );

    await act(async () => {
      await result.current.startSession([makeCard('c1')]);
    });

    expect(result.current.phase).toBe('idle');
  });

  it('handleRate does nothing when not in reviewing phase', async () => {
    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));

    // Still idle
    act(() => {
      result.current.handleRate(4);
    });

    expect(mockQueueReview).not.toHaveBeenCalled();
  });

  it('handleRate queues a review and advances to next card', async () => {
    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));
    const cards = [makeCard('c1'), makeCard('c2'), makeCard('c3')];

    await act(async () => {
      await result.current.startSession(cards);
    });

    expect(result.current.currentCard?.id).toBe('c1');

    // Rate the first card
    act(() => {
      result.current.handleRate(4);
    });

    expect(mockQueueReview).toHaveBeenCalledTimes(1);
    expect(mockQueueReview).toHaveBeenCalledWith(
      expect.objectContaining({ grade: 4 }),
    );

    // After delay, should advance
    await waitFor(() => {
      expect(result.current.currentIndex).toBeGreaterThanOrEqual(1);
    }, { timeout: 500 });
  });

  it('transitions to partial-summary after rating last card in round', async () => {
    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));
    const cards = [makeCard('c1')]; // Single card round

    await act(async () => {
      await result.current.startSession(cards);
    });

    // Rate the only card → should finish round
    act(() => {
      result.current.handleRate(3);
    });

    await waitFor(() => {
      expect(result.current.phase).toBe('partial-summary');
    });

    expect(result.current.completedRounds).toHaveLength(1);
    expect(result.current.completedRounds[0].source).toBe('professor');
    expect(result.current.completedRounds[0].roundNumber).toBe(1);
  });

  it('exposes mastery-related state', () => {
    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));

    expect(result.current.keywordMastery).toBeInstanceOf(Map);
    expect(result.current.topicSummary).toBeNull(); // no mastery loaded yet
    expect(result.current.masteryLoading).toBe(false);
  });

  it('exposes generation state', () => {
    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));

    expect(result.current.generationProgress).toBeNull();
    expect(result.current.lastGenerationResult).toBeNull();
    expect(result.current.generationError).toBeNull();
  });

  it('setIsRevealed toggles card reveal state', async () => {
    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));

    await act(async () => {
      await result.current.startSession([makeCard('c1')]);
    });

    expect(result.current.isRevealed).toBe(false);

    act(() => {
      result.current.setIsRevealed(true);
    });

    expect(result.current.isRevealed).toBe(true);
  });

  // ── finishSession: partial-summary → completed ──

  it('finishSession transitions to completed and submits batch', async () => {
    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));

    // Start session and complete one round → partial-summary
    await act(async () => {
      await result.current.startSession([makeCard('c1')]);
    });
    act(() => {
      result.current.handleRate(4);
    });
    await waitFor(() => {
      expect(result.current.phase).toBe('partial-summary');
    });

    // Now finish the session
    await act(async () => {
      await result.current.finishSession();
    });

    expect(result.current.phase).toBe('completed');
    expect(mockSubmitBatch).toHaveBeenCalledWith('session-123');
    expect(mockCloseStudySession).toHaveBeenCalledWith(
      'session-123',
      expect.objectContaining({
        total_reviews: expect.any(Number),
        correct_reviews: expect.any(Number),
      }),
    );
    expect(mockPostSessionAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        totalReviews: expect.any(Number),
        correctReviews: expect.any(Number),
        durationSeconds: expect.any(Number),
      }),
    );
  });

  it('finishSession does nothing when already finishing', async () => {
    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));

    // idle phase — finishSession should be a no-op
    await act(async () => {
      await result.current.finishSession();
    });

    expect(result.current.phase).toBe('idle');
    expect(mockSubmitBatch).not.toHaveBeenCalled();
  });

  // ── generateMore: partial-summary → generating → reviewing(ai) ──

  it('generateMore transitions through generating to reviewing with AI cards', async () => {
    const aiCard = makeCard('ai-1', { source: 'ai' as any });
    mockMapBatchToFlashcards.mockReturnValueOnce([aiCard]);
    mockGenerateAdaptiveBatch.mockResolvedValueOnce({
      cards: [{ id: 'ai-1', front: 'AI Q', back: 'AI A' }],
      errors: [],
      stats: { requested: 1, generated: 1, failed: 0, uniqueKeywords: 1, avgPKnow: 0.3, totalTokens: 100, elapsedMs: 500 },
    });

    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));

    // Complete first round → partial-summary
    await act(async () => {
      await result.current.startSession([makeCard('c1')]);
    });
    act(() => {
      result.current.handleRate(4);
    });
    await waitFor(() => {
      expect(result.current.phase).toBe('partial-summary');
    });

    // Generate more
    await act(async () => {
      await result.current.generateMore(3);
    });

    // Should now be reviewing AI cards
    await waitFor(() => {
      expect(result.current.phase).toBe('reviewing');
    });
    expect(result.current.currentCard?.id).toBe('ai-1');
    expect(mockGenerateAdaptiveBatch).toHaveBeenCalledWith(
      expect.objectContaining({ count: 3 }),
    );
  });

  it('generateMore shows error and returns to partial-summary when no cards generated', async () => {
    mockMapBatchToFlashcards.mockReturnValueOnce([]);
    mockGenerateAdaptiveBatch.mockResolvedValueOnce({
      cards: [],
      errors: [],
      stats: { requested: 3, generated: 0, failed: 3, uniqueKeywords: 0, avgPKnow: 0, totalTokens: 0, elapsedMs: 100 },
    });

    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));

    await act(async () => {
      await result.current.startSession([makeCard('c1')]);
    });
    act(() => {
      result.current.handleRate(4);
    });
    await waitFor(() => {
      expect(result.current.phase).toBe('partial-summary');
    });

    await act(async () => {
      await result.current.generateMore(3);
    });

    expect(result.current.phase).toBe('partial-summary');
    expect(result.current.generationError).toBeTruthy();
  });

  it('generateMore does nothing when not in partial-summary phase', async () => {
    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));

    // idle phase
    await act(async () => {
      await result.current.generateMore(3);
    });

    expect(result.current.phase).toBe('idle');
    expect(mockGenerateAdaptiveBatch).not.toHaveBeenCalled();
  });

  // ── abortGeneration ──

  it('abortGeneration returns to partial-summary and clears progress', async () => {
    // Make generateAdaptiveBatch hang indefinitely
    mockGenerateAdaptiveBatch.mockImplementationOnce(
      () => new Promise(() => {}), // never resolves
    );

    const { result } = renderHook(() => useAdaptiveSession(defaultOpts));

    await act(async () => {
      await result.current.startSession([makeCard('c1')]);
    });
    act(() => {
      result.current.handleRate(4);
    });
    await waitFor(() => {
      expect(result.current.phase).toBe('partial-summary');
    });

    // Start generation (won't resolve)
    act(() => {
      result.current.generateMore(3);
    });

    await waitFor(() => {
      expect(result.current.phase).toBe('generating');
    });

    // Abort
    act(() => {
      result.current.abortGeneration();
    });

    expect(result.current.phase).toBe('partial-summary');
    expect(result.current.generationProgress).toBeNull();
    expect(result.current.generationError).toBeNull();
  });
});
