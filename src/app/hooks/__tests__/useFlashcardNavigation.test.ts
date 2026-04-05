/**
 * useFlashcardNavigation.test.ts — Tests for flashcard navigation hook + pure utilities
 *
 * Coverage:
 *   - flashcard-types.ts: getMasteryStats, filterCardsByMastery (pure functions)
 *   - useFlashcardNavigation: initial state, view state transitions
 *
 * Mocks: NavigationContext, ContentTreeContext, useStudentNav, useStudyQueueData,
 *        apiCall, flashcardApi, keywordMasteryApi
 *
 * Run: npx vitest run src/app/hooks/__tests__/useFlashcardNavigation.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getMasteryStats, filterCardsByMastery } from '../flashcard-types';
import type { Flashcard } from '@/app/types/content';

// ═══ PURE FUNCTION TESTS (flashcard-types.ts) ═══

function makeCard(mastery: number, overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: `card-${Math.random()}`,
    front: 'Q',
    back: 'A',
    question: 'Q',
    answer: 'A',
    mastery,
    difficulty: 'normal',
    keywords: [],
    summary_id: 's1',
    keyword_id: 'k1',
    subtopic_id: null,
    source: 'test',
    ...overrides,
  } as Flashcard;
}

describe('getMasteryStats', () => {
  it('returns zeros for empty array', () => {
    const stats = getMasteryStats([]);
    expect(stats).toEqual({ avg: 0, pct: 0, mastered: 0, learning: 0, newCards: 0 });
  });

  it('calculates correct stats for mixed mastery levels', () => {
    const cards = [
      makeCard(5), // mastered
      makeCard(4), // mastered
      makeCard(3), // learning
      makeCard(1), // new
      makeCard(0), // new
    ];
    const stats = getMasteryStats(cards);
    expect(stats.mastered).toBe(2);
    expect(stats.learning).toBe(1);
    expect(stats.newCards).toBe(2);
    expect(stats.avg).toBeCloseTo(2.6);
    expect(stats.pct).toBeCloseTo(52); // (2.6/5)*100
  });

  it('returns 100% for all mastered cards', () => {
    const cards = [makeCard(5), makeCard(5), makeCard(5)];
    const stats = getMasteryStats(cards);
    expect(stats.pct).toBe(100);
    expect(stats.mastered).toBe(3);
    expect(stats.newCards).toBe(0);
  });

  it('returns 0% for all new cards', () => {
    const cards = [makeCard(0), makeCard(0)];
    const stats = getMasteryStats(cards);
    expect(stats.pct).toBe(0);
    expect(stats.newCards).toBe(2);
  });

  it('handles single card', () => {
    const stats = getMasteryStats([makeCard(3)]);
    expect(stats.avg).toBe(3);
    expect(stats.learning).toBe(1);
  });
});

describe('filterCardsByMastery', () => {
  const cards = [
    makeCard(0),
    makeCard(1),
    makeCard(2),
    makeCard(3),
    makeCard(4),
    makeCard(5),
  ];

  it('returns all cards for "all" filter', () => {
    expect(filterCardsByMastery(cards, 'all')).toHaveLength(6);
  });

  it('returns new cards (mastery <= 2) for "new" filter', () => {
    const result = filterCardsByMastery(cards, 'new');
    expect(result).toHaveLength(3);
    expect(result.every(c => c.mastery <= 2)).toBe(true);
  });

  it('returns learning cards (mastery === 3) for "learning" filter', () => {
    const result = filterCardsByMastery(cards, 'learning');
    expect(result).toHaveLength(1);
    expect(result[0].mastery).toBe(3);
  });

  it('returns mastered cards (mastery >= 4) for "mastered" filter', () => {
    const result = filterCardsByMastery(cards, 'mastered');
    expect(result).toHaveLength(2);
    expect(result.every(c => c.mastery >= 4)).toBe(true);
  });

  it('returns empty array when no cards match filter', () => {
    const newCards = [makeCard(0), makeCard(1)];
    expect(filterCardsByMastery(newCards, 'mastered')).toHaveLength(0);
  });
});

// ═══ HOOK TESTS (useFlashcardNavigation) ═══

// Mock all dependencies
vi.mock('@/app/context/NavigationContext', () => ({
  useNavigation: () => ({ setCurrentTopic: vi.fn() }),
}));

vi.mock('@/app/context/ContentTreeContext', () => ({
  useContentTree: () => ({
    tree: { courses: [] },
    loading: false,
  }),
}));

vi.mock('@/app/hooks/useStudentNav', () => ({
  useStudentNav: () => ({ navigateTo: vi.fn() }),
}));

vi.mock('@/app/hooks/useStudyQueueData', () => ({
  useStudyQueueData: () => ({
    items: [],
    byFlashcardId: new Map(),
    loading: false,
    error: null,
    refresh: vi.fn(),
    applyOptimisticBatch: vi.fn(),
  }),
  invalidateStudyQueueCache: vi.fn(),
  STUDY_QUEUE_ALL_COURSES: '__all__',
}));

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('@/app/services/flashcardApi', () => ({
  getFlashcardsByTopic: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock('@/app/services/keywordMasteryApi', () => ({
  fetchKeywordMasteryByTopic: vi.fn().mockResolvedValue([]),
  computeTopicMasterySummary: vi.fn().mockReturnValue({
    keywordsMastered: 0,
    keywordsTotal: 0,
    overallMastery: 0,
  }),
}));

describe('useFlashcardNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with hub view state', async () => {
    const { useFlashcardNavigation } = await import('../useFlashcardNavigation');
    const { result } = renderHook(() => useFlashcardNavigation());

    expect(result.current.viewState).toBe('hub');
    expect(result.current.selectedSection).toBeNull();
    expect(result.current.selectedTopic).toBeNull();
  });

  it('returns empty course when tree has no courses', async () => {
    const { useFlashcardNavigation } = await import('../useFlashcardNavigation');
    const { result } = renderHook(() => useFlashcardNavigation());

    expect(result.current.currentCourse.id).toBe('empty');
    expect(result.current.currentCourse.name).toBe('Sin Curso');
    expect(result.current.currentCourse.semesters).toEqual([]);
  });

  it('returns empty allFlashcards when no content', async () => {
    const { useFlashcardNavigation } = await import('../useFlashcardNavigation');
    const { result } = renderHook(() => useFlashcardNavigation());

    expect(result.current.allFlashcards).toEqual([]);
  });

  it('goToHub resets view state to hub', async () => {
    const { useFlashcardNavigation } = await import('../useFlashcardNavigation');
    const { result } = renderHook(() => useFlashcardNavigation());

    // Set to section first
    act(() => {
      result.current.setViewState('section');
    });
    expect(result.current.viewState).toBe('section');

    // Go back to hub
    act(() => {
      result.current.goToHub();
    });
    expect(result.current.viewState).toBe('hub');
  });

  it('exposes masteryMap as a Map', async () => {
    const { useFlashcardNavigation } = await import('../useFlashcardNavigation');
    const { result } = renderHook(() => useFlashcardNavigation());

    expect(result.current.masteryMap).toBeInstanceOf(Map);
  });

  it('allSections is an array', async () => {
    const { useFlashcardNavigation } = await import('../useFlashcardNavigation');
    const { result } = renderHook(() => useFlashcardNavigation());

    expect(Array.isArray(result.current.allSections)).toBe(true);
  });
});
