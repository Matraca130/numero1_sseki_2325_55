// ============================================================
// Axon -- Tests for topicProgressApi
//
// Covers:
//   1. getTopicProgress: unified endpoint success
//   2. getTopicProgress: fallback to N+1 on 404
//   3. getTopicProgress: non-404 error propagates
//   4. getTopicProgressRaw: returns raw response
//   5. getTopicsOverview: empty topicIds returns empty
//   6. getTopicsOverview: unified endpoint success
//   7. getTopicsOverview: fallback on 404
//   8. getCourseProgress: empty topicIds returns empty
//   9. getCourseProgress: unified endpoint success
//  10. getCourseProgress: fallback on 404
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

// -- Mock apiCall -----------------------------------------

const mockApiCall = vi.fn();

vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

// -- Mock studentSummariesApi -----------------------------

const mockGetReadingState = vi.fn();

vi.mock('@/app/services/studentSummariesApi', () => ({
  getReadingState: (...args: unknown[]) => mockGetReadingState(...args),
}));

// -- Mock platformApi (getFlashcardsBySummary) ------------

const mockGetFlashcardsBySummary = vi.fn();

vi.mock('@/app/services/platformApi', () => ({
  getFlashcardsBySummary: (...args: unknown[]) => mockGetFlashcardsBySummary(...args),
}));

// -- Mock summariesApi ------------------------------------

const mockGetSummaries = vi.fn();
const mockGetKeywords = vi.fn();

vi.mock('@/app/services/summariesApi', () => ({
  getSummaries: (...args: unknown[]) => mockGetSummaries(...args),
  getKeywords: (...args: unknown[]) => mockGetKeywords(...args),
}));

// -- Import AFTER mocks -----------------------------------

import {
  getTopicProgress,
  getTopicProgressRaw,
  getTopicsOverview,
  getCourseProgress,
} from '../topicProgressApi';

// -- Fixtures ---------------------------------------------

const MOCK_SUMMARY_A = {
  id: 'sum-001',
  topic_id: 'topic-1',
  title: 'Summary A',
  status: 'published',
  is_active: true,
  deleted_at: null,
};

const MOCK_SUMMARY_B = {
  id: 'sum-002',
  topic_id: 'topic-1',
  title: 'Summary B',
  status: 'published',
  is_active: true,
  deleted_at: null,
};

const MOCK_DRAFT_SUMMARY = {
  id: 'sum-003',
  topic_id: 'topic-1',
  title: 'Draft Summary',
  status: 'draft',
  is_active: true,
  deleted_at: null,
};

const MOCK_READING_STATE = {
  id: 'rs-001',
  summary_id: 'sum-001',
  progress: 0.75,
  completed: false,
};

const MOCK_TOPIC_PROGRESS_RESPONSE = {
  summaries: [MOCK_SUMMARY_A, MOCK_SUMMARY_B],
  reading_states: {
    'sum-001': MOCK_READING_STATE,
  },
  flashcard_counts: {
    'sum-001': 10,
    'sum-002': 5,
  },
};

// -- Test suite -------------------------------------------

describe('topicProgressApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- getTopicProgress -----------------------------------

  describe('getTopicProgress', () => {
    it('returns enriched summaries from unified endpoint', async () => {
      mockApiCall.mockResolvedValue(MOCK_TOPIC_PROGRESS_RESPONSE);

      const result = await getTopicProgress('topic-1');

      expect(mockApiCall).toHaveBeenCalledWith('/topic-progress?topic_id=topic-1');
      expect(result).toHaveLength(2);
      expect(result[0].summary.id).toBe('sum-001');
      expect(result[0].readingState).toBe(MOCK_READING_STATE);
      expect(result[0].flashcardCount).toBe(10);
      expect(result[1].summary.id).toBe('sum-002');
      expect(result[1].readingState).toBeNull();
      expect(result[1].flashcardCount).toBe(5);
    });

    it('falls back to N+1 pattern on 404 error', async () => {
      // First call (unified) fails with 404
      mockApiCall.mockRejectedValueOnce(new Error('404 Not Found'));

      // Fallback: getSummaries returns paginated list
      mockGetSummaries.mockResolvedValue({
        items: [MOCK_SUMMARY_A, MOCK_SUMMARY_B, MOCK_DRAFT_SUMMARY],
      });
      mockGetReadingState.mockResolvedValue(MOCK_READING_STATE);
      mockGetFlashcardsBySummary.mockResolvedValue([{ id: 'fc-1' }, { id: 'fc-2' }]);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await getTopicProgress('topic-1');

      // Should only have published/active summaries (not draft)
      expect(result).toHaveLength(2);
      expect(result[0].summary.id).toBe('sum-001');
      expect(result[0].readingState).toBe(MOCK_READING_STATE);
      expect(result[0].flashcardCount).toBe(2);

      consoleSpy.mockRestore();
    });

    it('propagates non-404 errors', async () => {
      mockApiCall.mockRejectedValue(new Error('500 Internal Server Error'));

      await expect(getTopicProgress('topic-1')).rejects.toThrow('500 Internal Server Error');
    });
  });

  // -- getTopicProgressRaw --------------------------------

  describe('getTopicProgressRaw', () => {
    it('returns raw TopicProgressResponse from unified endpoint', async () => {
      mockApiCall.mockResolvedValue(MOCK_TOPIC_PROGRESS_RESPONSE);

      const result = await getTopicProgressRaw('topic-1');

      expect(result).toBe(MOCK_TOPIC_PROGRESS_RESPONSE);
      expect(result.summaries).toHaveLength(2);
      expect(result.reading_states).toHaveProperty('sum-001');
      expect(result.flashcard_counts).toHaveProperty('sum-001');
    });
  });

  // -- getTopicsOverview ----------------------------------

  describe('getTopicsOverview', () => {
    it('returns empty result for empty topicIds array', async () => {
      const result = await getTopicsOverview([]);

      expect(result).toEqual({
        summaries_by_topic: {},
        keyword_counts_by_topic: {},
      });
      expect(mockApiCall).not.toHaveBeenCalled();
    });

    it('fetches from unified endpoint on success', async () => {
      const mockResponse = {
        summaries_by_topic: {
          'topic-1': [MOCK_SUMMARY_A],
        },
        keyword_counts_by_topic: {
          'topic-1': 5,
        },
      };
      mockApiCall.mockResolvedValue(mockResponse);

      const result = await getTopicsOverview(['topic-1']);

      expect(mockApiCall).toHaveBeenCalledWith('/topics-overview?topic_ids=topic-1');
      expect(result).toBe(mockResponse);
    });

    it('joins multiple topic IDs with comma', async () => {
      mockApiCall.mockResolvedValue({
        summaries_by_topic: {},
        keyword_counts_by_topic: {},
      });

      await getTopicsOverview(['topic-1', 'topic-2', 'topic-3']);

      expect(mockApiCall).toHaveBeenCalledWith('/topics-overview?topic_ids=topic-1,topic-2,topic-3');
    });

    it('falls back to N+1 pattern on 404', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('404 Not Found'));

      // Fallback fetches summaries per topic
      mockGetSummaries.mockResolvedValue({ items: [MOCK_SUMMARY_A] });
      mockGetKeywords.mockResolvedValue([{ id: 'kw-1' }, { id: 'kw-2' }]);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await getTopicsOverview(['topic-1']);

      expect(result.summaries_by_topic['topic-1']).toHaveLength(1);
      expect(result.keyword_counts_by_topic['topic-1']).toBe(2);

      consoleSpy.mockRestore();
    });
  });

  // -- getCourseProgress ----------------------------------

  describe('getCourseProgress', () => {
    it('returns empty result for empty topicIds', async () => {
      const result = await getCourseProgress('course-1', [], []);

      expect(result).toEqual({
        summaries_by_topic: {},
        keyword_counts_by_topic: {},
      });
      expect(mockApiCall).not.toHaveBeenCalled();
    });

    it('fetches from unified course-progress endpoint', async () => {
      const mockResponse = {
        summaries_by_topic: { 'topic-1': [MOCK_SUMMARY_A] },
        keyword_counts_by_topic: { 'topic-1': 3 },
        bkt_mastery_by_topic: {
          'topic-1': { avg_p_know: 0.75, total_subtopics: 3 },
        },
      };
      mockApiCall.mockResolvedValue(mockResponse);

      const result = await getCourseProgress(
        'course-1',
        ['topic-1'],
        [{ sectionId: 'sec-1', topicIds: ['topic-1'] }],
      );

      expect(mockApiCall).toHaveBeenCalledWith('/course-progress?course_id=course-1');
      expect(result).toBe(mockResponse);
    });

    it('falls back to section-level getTopicsOverview on 404', async () => {
      // First call (course-progress) fails with 404
      mockApiCall.mockRejectedValueOnce(new Error('404 Not Found'));

      // Fallback calls getTopicsOverview per section
      // That also may 404, falling back to per-topic
      mockApiCall.mockRejectedValueOnce(new Error('404 Not Found'));
      mockGetSummaries.mockResolvedValue({ items: [MOCK_SUMMARY_A] });
      mockGetKeywords.mockResolvedValue([{ id: 'kw-1' }]);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await getCourseProgress(
        'course-1',
        ['topic-1'],
        [{ sectionId: 'sec-1', topicIds: ['topic-1'] }],
      );

      expect(result.summaries_by_topic).toBeDefined();
      expect(result.keyword_counts_by_topic).toBeDefined();

      consoleSpy.mockRestore();
    });
  });
});
