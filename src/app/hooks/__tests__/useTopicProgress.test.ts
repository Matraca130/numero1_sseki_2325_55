// ============================================================
// Axon -- Tests for useTopicProgress
//
// Tests the useTopicProgress hook which builds topic-level
// progress from study-queue data and content tree.
//
// Covers:
//   1. Empty state when no course or topics
//   2. Progress building from study queue items
//   3. BKT thresholds: mastered/learning/new/empty
//   4. Overall progress computation
//   5. getProgress helper for individual topics
//   6. Loading state propagation
//
// RUN: npx vitest run src/app/hooks/__tests__/useTopicProgress.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';

// -- Mock ContentTreeContext --------------------------------

let mockTree: any = null;
let mockTreeLoading = false;

vi.mock('@/app/context/ContentTreeContext', () => ({
  useContentTree: () => ({
    tree: mockTree,
    loading: mockTreeLoading,
  }),
}));

// -- Mock apiCall (for ensureTopicSummaryMap) ----------------

const mockApiCall = vi.fn();

vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

// -- Import AFTER mocks ------------------------------------

import { useTopicProgress } from '../useTopicProgress';

// -- Fixture Helpers ----------------------------------------

function makeTree(topicIds: string[]) {
  return {
    courses: [
      {
        id: 'course-1',
        name: 'Test Course',
        semesters: [
          {
            id: 'sem-1',
            name: 'Semester 1',
            sections: [
              {
                id: 'sec-1',
                name: 'Section 1',
                topics: topicIds.map(id => ({ id, name: `Topic ${id}` })),
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeQueueItem(
  summaryId: string,
  pKnow: number,
  overrides: Partial<StudyQueueItem> = {},
): StudyQueueItem {
  return {
    flashcard_id: `fc-${Math.random().toString(36).slice(2, 8)}`,
    summary_id: summaryId,
    keyword_id: 'kw-1',
    keyword_label: 'Test Keyword',
    p_know: pKnow,
    need_score: 1 - pKnow,
    due_at: null,
    fsrs_state: 'review',
    is_new: false,
    stability: 10,
    difficulty: 5,
    reps: 3,
    lapses: 0,
    ...overrides,
  } as StudyQueueItem;
}

function buildBySummaryId(items: StudyQueueItem[]): Map<string, StudyQueueItem[]> {
  const map = new Map<string, StudyQueueItem[]>();
  for (const item of items) {
    const key = item.summary_id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

// -- Test suite -------------------------------------------

describe('useTopicProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTree = null;
    mockTreeLoading = false;

    // Default: apiCall for summaries returns empty items
    mockApiCall.mockImplementation((url: string) => {
      if (url.includes('/summaries')) {
        return Promise.resolve({ items: [{ id: url.split('topic_id=')[1] + '-sum-1' }] });
      }
      return Promise.resolve([]);
    });
  });

  // -- Empty state ----------------------------------------

  describe('when courseId is null', () => {
    it('returns empty progressMap', () => {
      mockTree = makeTree(['topic-1']);

      const bySummaryId = new Map<string, StudyQueueItem[]>();
      const { result } = renderHook(() => useTopicProgress(bySummaryId, false, null));

      expect(result.current.progressMap.size).toBe(0);
      expect(result.current.overallProgress.pKnow).toBe(0);
      expect(result.current.overallProgress.totalCards).toBe(0);
    });
  });

  describe('when tree is loading', () => {
    it('returns empty progressMap while tree loads', () => {
      mockTreeLoading = true;
      mockTree = null;

      const bySummaryId = new Map<string, StudyQueueItem[]>();
      const { result } = renderHook(() => useTopicProgress(bySummaryId, false, 'course-1'));

      expect(result.current.progressMap.size).toBe(0);
    });
  });

  describe('when study queue is loading', () => {
    it('reflects sqLoading in loading state', () => {
      mockTree = makeTree(['topic-1']);
      const bySummaryId = new Map<string, StudyQueueItem[]>();

      const { result } = renderHook(() => useTopicProgress(bySummaryId, true, 'course-1'));

      expect(result.current.loading).toBe(true);
    });
  });

  // -- Progress building ----------------------------------

  describe('progress map building', () => {
    it('builds progress for topics with queue items', async () => {
      mockTree = makeTree(['topic-1']);

      const items = [
        makeQueueItem('topic-1-sum-1', 0.9),
        makeQueueItem('topic-1-sum-1', 0.7),
      ];
      const bySummaryId = buildBySummaryId(items);

      const { result } = renderHook(() =>
        useTopicProgress(bySummaryId, false, 'course-1'),
      );

      await waitFor(() => {
        expect(result.current.progressMap.size).toBeGreaterThan(0);
      });

      const progress = result.current.getProgress('topic-1');
      // avg p_know = (0.9 + 0.7) / 2 = 0.8
      expect(progress.pKnow).toBe(0.8);
      expect(progress.totalCards).toBe(2);
      expect(progress.status).toBe('mastered'); // >= 0.80
    });
  });

  // -- BKT Thresholds -------------------------------------

  describe('BKT status thresholds', () => {
    it('returns mastered status when avg p_know >= 0.80', async () => {
      mockTree = makeTree(['topic-1']);

      const items = [makeQueueItem('topic-1-sum-1', 0.85)];
      const bySummaryId = buildBySummaryId(items);

      const { result } = renderHook(() =>
        useTopicProgress(bySummaryId, false, 'course-1'),
      );

      await waitFor(() => {
        expect(result.current.progressMap.size).toBeGreaterThan(0);
      });

      expect(result.current.getProgress('topic-1').status).toBe('mastered');
    });

    it('returns learning status when avg p_know >= 0.50 and < 0.80', async () => {
      mockTree = makeTree(['topic-1']);

      const items = [makeQueueItem('topic-1-sum-1', 0.65)];
      const bySummaryId = buildBySummaryId(items);

      const { result } = renderHook(() =>
        useTopicProgress(bySummaryId, false, 'course-1'),
      );

      await waitFor(() => {
        expect(result.current.progressMap.size).toBeGreaterThan(0);
      });

      expect(result.current.getProgress('topic-1').status).toBe('learning');
    });

    it('returns new status when avg p_know < 0.50', async () => {
      mockTree = makeTree(['topic-1']);

      const items = [makeQueueItem('topic-1-sum-1', 0.3)];
      const bySummaryId = buildBySummaryId(items);

      const { result } = renderHook(() =>
        useTopicProgress(bySummaryId, false, 'course-1'),
      );

      await waitFor(() => {
        expect(result.current.progressMap.size).toBeGreaterThan(0);
      });

      expect(result.current.getProgress('topic-1').status).toBe('new');
    });

    it('returns empty status when topic has no cards', async () => {
      mockTree = makeTree(['topic-no-cards']);
      // apiCall for this topic returns no summaries
      mockApiCall.mockImplementation(() =>
        Promise.resolve({ items: [] })
      );

      const bySummaryId = new Map<string, StudyQueueItem[]>();

      const { result } = renderHook(() =>
        useTopicProgress(bySummaryId, false, 'course-1'),
      );

      await waitFor(() => {
        expect(result.current.progressMap.size).toBeGreaterThan(0);
      });

      expect(result.current.getProgress('topic-no-cards').status).toBe('empty');
      expect(result.current.getProgress('topic-no-cards').totalCards).toBe(0);
    });
  });

  // -- getProgress helper ---------------------------------

  describe('getProgress', () => {
    it('returns EMPTY_PROGRESS for unknown topic ID', () => {
      mockTree = makeTree([]);
      const bySummaryId = new Map<string, StudyQueueItem[]>();

      const { result } = renderHook(() =>
        useTopicProgress(bySummaryId, false, 'course-1'),
      );

      const progress = result.current.getProgress('nonexistent-topic');
      expect(progress.status).toBe('empty');
      expect(progress.pKnow).toBe(0);
      expect(progress.totalCards).toBe(0);
      expect(progress.newCards).toBe(0);
      expect(progress.dueCards).toBe(0);
    });
  });

  // -- overallProgress ------------------------------------

  describe('overallProgress', () => {
    it('returns 0 when no topics have cards', () => {
      mockTree = makeTree([]);
      const bySummaryId = new Map<string, StudyQueueItem[]>();

      const { result } = renderHook(() =>
        useTopicProgress(bySummaryId, false, 'course-1'),
      );

      expect(result.current.overallProgress.pKnow).toBe(0);
      expect(result.current.overallProgress.pct).toBe(0);
      expect(result.current.overallProgress.totalCards).toBe(0);
      expect(result.current.overallProgress.dueCards).toBe(0);
    });
  });

  // -- New and due card counting --------------------------

  describe('card counting', () => {
    it('counts new cards correctly', async () => {
      mockTree = makeTree(['topic-1']);

      const items = [
        makeQueueItem('topic-1-sum-1', 0.5, { is_new: true, fsrs_state: 'new' }),
        makeQueueItem('topic-1-sum-1', 0.8, { is_new: false, fsrs_state: 'review' }),
      ];
      const bySummaryId = buildBySummaryId(items);

      const { result } = renderHook(() =>
        useTopicProgress(bySummaryId, false, 'course-1'),
      );

      await waitFor(() => {
        expect(result.current.progressMap.size).toBeGreaterThan(0);
      });

      const progress = result.current.getProgress('topic-1');
      expect(progress.newCards).toBe(1);
      expect(progress.totalCards).toBe(2);
    });

    it('counts due cards (due_at in the past)', async () => {
      mockTree = makeTree(['topic-1']);

      const pastDate = new Date(2020, 0, 1).toISOString();
      const futureDate = new Date(2030, 0, 1).toISOString();

      const items = [
        makeQueueItem('topic-1-sum-1', 0.5, { due_at: pastDate }),
        makeQueueItem('topic-1-sum-1', 0.8, { due_at: futureDate }),
      ];
      const bySummaryId = buildBySummaryId(items);

      const { result } = renderHook(() =>
        useTopicProgress(bySummaryId, false, 'course-1'),
      );

      await waitFor(() => {
        expect(result.current.progressMap.size).toBeGreaterThan(0);
      });

      const progress = result.current.getProgress('topic-1');
      expect(progress.dueCards).toBe(1);
    });
  });
});
