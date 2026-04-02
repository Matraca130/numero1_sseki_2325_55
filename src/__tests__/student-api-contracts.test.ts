// ============================================================
// Student API Contract Guards — Axon
//
// PURPOSE: Verify that every exported function in studentApi.ts
// (barrel) and its sub-files constructs correct URLs, methods,
// and payloads without making real network requests.
//
// GUARDS AGAINST:
//   - URL construction bugs (wrong endpoint, missing params)
//   - HTTP method mismatches (GET vs POST vs PUT)
//   - Payload shape changes that break backend contract
//   - student_id leaking into payloads (auto from token)
//   - Field name mapping errors (camelCase -> snake_case)
//
// APPROACH: Mock apiCall() and inspect what URL/options were passed.
//
// RUN: npx vitest run src/__tests__/student-api-contracts.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// -- Mock apiCall BEFORE importing API modules --
const mockApiCall = vi.fn().mockResolvedValue({});
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

// -- Imports from barrel (studentApi.ts) --
import {
  getProfile,
  updateProfile,
  getStats,
  updateStats,
  getDailyActivity,
  getSessions,
  logSession,
  getReviews,
  getReviewsByCourse,
  saveReviews,
  getStudySummary,
  aiChat,
  aiExplain,
  fetchStudyIntelligence,
} from '@/app/services/studentApi';

// -- Import infra to reset caches between tests --
import { _courseProgressCache, _keywordCache } from '@/app/services/student-api/sa-infra';

beforeEach(() => {
  mockApiCall.mockClear();
  mockApiCall.mockResolvedValue({});
  _courseProgressCache.entry = null;
  _keywordCache.clear();
});

// ======================================================================
// SUITE 1: Profile (sa-profile-stats.ts)
// ======================================================================

describe('getProfile -- URL construction', () => {
  it('calls GET /me', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'u1', email: 'a@b.com' });
    await getProfile();
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/me');
    // GET is default (no options object with method)
    expect(mockApiCall.mock.calls[0][1]).toBeUndefined();
  });

  it('returns null on 404 without throwing', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('404 Not Found'));
    const result = await getProfile();
    expect(result).toBeNull();
  });

  it('returns null on 401 without throwing', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('401 Unauthorized'));
    const result = await getProfile();
    expect(result).toBeNull();
  });
});

describe('updateProfile -- payload contract', () => {
  it('sends PUT to /me with snake_case fields', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'u1', full_name: 'New Name', email: 'a@b.com' });
    await updateProfile({ name: 'New Name', avatarUrl: 'https://img.png' });

    const url: string = mockApiCall.mock.calls[0][0];
    const opts = mockApiCall.mock.calls[0][1];
    expect(url).toBe('/me');
    expect(opts.method).toBe('PUT');

    const body = JSON.parse(opts.body);
    expect(body.full_name).toBe('New Name');
    expect(body.avatar_url).toBe('https://img.png');
    // Must NOT contain camelCase frontend keys
    expect(body).not.toHaveProperty('name');
    expect(body).not.toHaveProperty('avatarUrl');
  });

  it('does NOT include student_id in payload', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'u1', email: 'a@b.com' });
    await updateProfile({ name: 'X' });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('student_id');
  });
});

// ======================================================================
// SUITE 2: Stats (sa-profile-stats.ts)
// ======================================================================

describe('getStats -- URL construction', () => {
  it('calls GET /student-stats', async () => {
    mockApiCall.mockResolvedValueOnce({ total_sessions: 5 });
    await getStats();
    expect(mockApiCall.mock.calls[0][0]).toBe('/student-stats');
    expect(mockApiCall.mock.calls[0][1]).toBeUndefined();
  });

  it('returns null on 404 without throwing', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('404'));
    const result = await getStats();
    expect(result).toBeNull();
  });
});

describe('updateStats -- payload contract', () => {
  it('sends POST to /student-stats with snake_case mapped fields', async () => {
    mockApiCall.mockResolvedValueOnce({ total_sessions: 10 });
    await updateStats({
      currentStreak: 5,
      longestStreak: 12,
      totalCardsReviewed: 100,
      totalStudyMinutes: 30,
      totalSessions: 10,
      lastStudyDate: '2026-03-25',
    });

    const url: string = mockApiCall.mock.calls[0][0];
    const opts = mockApiCall.mock.calls[0][1];
    expect(url).toBe('/student-stats');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.current_streak).toBe(5);
    expect(body.longest_streak).toBe(12);
    expect(body.total_reviews).toBe(100);
    expect(body.total_time_seconds).toBe(1800); // 30 * 60
    expect(body.total_sessions).toBe(10);
    expect(body.last_study_date).toBe('2026-03-25');
  });

  it('does NOT include student_id in payload', async () => {
    mockApiCall.mockResolvedValueOnce({});
    await updateStats({ currentStreak: 1 });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('student_id');
  });
});

// ======================================================================
// SUITE 3: Daily Activity (sa-activity-sessions.ts)
// ======================================================================

describe('getDailyActivity -- URL construction', () => {
  it('calls GET /daily-activities', async () => {
    mockApiCall.mockResolvedValueOnce([]);
    await getDailyActivity();
    expect(mockApiCall.mock.calls[0][0]).toBe('/daily-activities');
  });

  it('returns empty array on error without throwing', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('network'));
    const result = await getDailyActivity();
    expect(result).toEqual([]);
  });
});

// ======================================================================
// SUITE 4: Sessions (sa-activity-sessions.ts)
// ======================================================================

describe('getSessions -- URL construction', () => {
  it('calls GET /study-sessions', async () => {
    mockApiCall.mockResolvedValueOnce([]);
    await getSessions();
    expect(mockApiCall.mock.calls[0][0]).toBe('/study-sessions');
  });

  it('returns empty array on error without throwing', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('500'));
    const result = await getSessions();
    expect(result).toEqual([]);
  });
});

describe('logSession -- payload contract', () => {
  it('sends POST to /study-sessions with session_type and course_id', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'sess-1', session_type: 'flashcards' });
    await logSession({
      id: 'temp',
      type: 'flashcards',
      courseId: 'course-abc',
      startedAt: '',
      endedAt: '',
      durationMinutes: 0,
      cardsReviewed: 0,
    });

    const url: string = mockApiCall.mock.calls[0][0];
    const opts = mockApiCall.mock.calls[0][1];
    expect(url).toBe('/study-sessions');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.session_type).toBe('flashcards');
    expect(body.course_id).toBe('course-abc');
  });

  it('defaults session_type to flashcards when type is undefined', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'sess-2' });
    await logSession({
      id: 'temp',
      courseId: '',
      startedAt: '',
      endedAt: '',
      durationMinutes: 0,
      cardsReviewed: 0,
    } as any);

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.session_type).toBe('flashcards');
  });

  it('does NOT include student_id in payload', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'sess-3' });
    await logSession({
      id: 'temp',
      type: 'flashcards',
      courseId: '',
      startedAt: '',
      endedAt: '',
      durationMinutes: 0,
      cardsReviewed: 0,
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('student_id');
    expect(body).not.toHaveProperty('studentId');
  });
});

// ======================================================================
// SUITE 5: Reviews (sa-activity-sessions.ts)
// ======================================================================

describe('getReviews -- stub behavior', () => {
  it('returns empty array without calling apiCall', async () => {
    const result = await getReviews();
    expect(result).toEqual([]);
    expect(mockApiCall).not.toHaveBeenCalled();
  });
});

describe('getReviewsByCourse -- stub behavior', () => {
  it('returns empty array without calling apiCall', async () => {
    const result = await getReviewsByCourse('course-123');
    expect(result).toEqual([]);
    expect(mockApiCall).not.toHaveBeenCalled();
  });
});

describe('saveReviews -- payload contract', () => {
  it('returns { saved: 0 } for empty reviews without calling apiCall', async () => {
    const result = await saveReviews([]);
    expect(result).toEqual({ saved: 0 });
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('creates a session then sends individual review POSTs', async () => {
    // First call: create session
    mockApiCall.mockResolvedValueOnce({ id: 'sess-new' });
    // Second call: review POST
    mockApiCall.mockResolvedValueOnce({ id: 'rev-1' });
    // Third call: session update PUT
    mockApiCall.mockResolvedValueOnce({});

    await saveReviews([
      {
        cardId: 'card-001',
        rating: 4,
        courseId: 'course-x',
        reviewedAt: '2026-03-25T00:00:00Z',
      } as any,
    ]);

    // First call: POST /study-sessions to create session
    expect(mockApiCall.mock.calls[0][0]).toBe('/study-sessions');
    expect(mockApiCall.mock.calls[0][1].method).toBe('POST');
    const sessionBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sessionBody.session_type).toBe('flashcard');
    expect(sessionBody.course_id).toBe('course-x');

    // Second call: POST /reviews with review data
    expect(mockApiCall.mock.calls[1][0]).toBe('/reviews');
    expect(mockApiCall.mock.calls[1][1].method).toBe('POST');
    const reviewBody = JSON.parse(mockApiCall.mock.calls[1][1].body);
    expect(reviewBody.session_id).toBe('sess-new');
    expect(reviewBody.item_id).toBe('card-001');
    expect(reviewBody.instrument_type).toBe('flashcard');
    expect(reviewBody.grade).toBe(4);

    // Third call: PUT /study-sessions/:id to finalize
    expect(mockApiCall.mock.calls[2][0]).toBe('/study-sessions/sess-new');
    expect(mockApiCall.mock.calls[2][1].method).toBe('PUT');
    const finalizeBody = JSON.parse(mockApiCall.mock.calls[2][1].body);
    expect(finalizeBody.total_reviews).toBe(1);
    expect(finalizeBody.correct_reviews).toBe(1); // rating >= 3
  });

  it('does NOT include student_id in any review payload', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'sess-abc' });
    mockApiCall.mockResolvedValueOnce({ id: 'rev-1' });
    mockApiCall.mockResolvedValueOnce({});

    await saveReviews([
      { cardId: 'c1', rating: 2, courseId: 'cx', reviewedAt: '' } as any,
    ]);

    for (const call of mockApiCall.mock.calls) {
      if (call[1]?.body) {
        const body = JSON.parse(call[1].body);
        expect(body).not.toHaveProperty('student_id');
        expect(body).not.toHaveProperty('studentId');
      }
    }
  });

  it('counts correct_reviews based on rating >= 3', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'sess-count' });
    // 3 review POSTs
    mockApiCall.mockResolvedValueOnce({});
    mockApiCall.mockResolvedValueOnce({});
    mockApiCall.mockResolvedValueOnce({});
    // session finalize PUT
    mockApiCall.mockResolvedValueOnce({});

    await saveReviews([
      { cardId: 'c1', rating: 1, courseId: 'cx', reviewedAt: '' } as any,
      { cardId: 'c2', rating: 3, courseId: 'cx', reviewedAt: '' } as any,
      { cardId: 'c3', rating: 5, courseId: 'cx', reviewedAt: '' } as any,
    ]);

    // Find the PUT call (session finalize)
    const putCall = mockApiCall.mock.calls.find(
      (c: unknown[]) => c[1]?.method === 'PUT'
    );
    expect(putCall).toBeDefined();
    const finalBody = JSON.parse(putCall![1].body);
    expect(finalBody.total_reviews).toBe(3);
    expect(finalBody.correct_reviews).toBe(2); // ratings 3 and 5
  });
});

// ======================================================================
// SUITE 6: Study Summary (sa-content.ts)
// ======================================================================

describe('getStudySummary -- URL construction', () => {
  it('calls GET /summaries?topic_id=<id>', async () => {
    mockApiCall.mockResolvedValueOnce([]);
    await getStudySummary('student-1', 'course-1', 'topic-abc');

    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/summaries?topic_id=topic-abc');
    expect(url).toContain('topic_id=topic-abc');
    // Uses flat route with query param, not nested REST
    expect(url).not.toMatch(/\/topics\//);
  });

  it('returns null when no items found', async () => {
    mockApiCall.mockResolvedValueOnce([]);
    const result = await getStudySummary('s1', 'c1', 'topic-empty');
    expect(result).toBeNull();
  });

  it('returns null on error without throwing', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('500'));
    const result = await getStudySummary('s1', 'c1', 't1');
    expect(result).toBeNull();
  });
});

// ======================================================================
// SUITE 7: AI Chat (sa-ai-legacy.ts)
// ======================================================================

describe('aiChat -- payload contract', () => {
  it('sends POST to /ai/rag-chat with message extracted from last user msg', async () => {
    mockApiCall.mockResolvedValueOnce({ response: 'Hi!' });
    await aiChat([
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'What is FSRS?' },
    ]);

    const url: string = mockApiCall.mock.calls[0][0];
    const opts = mockApiCall.mock.calls[0][1];
    expect(url).toBe('/ai/rag-chat');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.message).toBe('What is FSRS?');
    expect(body.history).toEqual([{ role: 'assistant', content: 'Hello' }]);
  });

  it('includes summary_id from context when provided', async () => {
    mockApiCall.mockResolvedValueOnce({ response: 'ok' });
    await aiChat(
      [{ role: 'user', content: 'explain' }],
      { summaryId: 'sum-xyz' }
    );

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.summary_id).toBe('sum-xyz');
  });

  it('omits history when only one message', async () => {
    mockApiCall.mockResolvedValueOnce({ response: 'ok' });
    await aiChat([{ role: 'user', content: 'hi' }]);

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.history).toBeUndefined();
  });
});

// ======================================================================
// SUITE 8: AI Explain (sa-ai-legacy.ts)
// ======================================================================

describe('aiExplain -- payload contract', () => {
  it('sends POST to /ai/rag-chat with concept in message', async () => {
    mockApiCall.mockResolvedValueOnce({ response: 'Explanation here' });
    await aiExplain('Mitosis');

    const url: string = mockApiCall.mock.calls[0][0];
    const opts = mockApiCall.mock.calls[0][1];
    expect(url).toBe('/ai/rag-chat');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.message).toContain('Mitosis');
  });

  it('includes context in message when provided', async () => {
    mockApiCall.mockResolvedValueOnce({ response: 'ok' });
    await aiExplain('DNA replication', 'Biology 101');

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.message).toContain('DNA replication');
    expect(body.message).toContain('Biology 101');
  });
});

// ======================================================================
// SUITE 9: fetchStudyIntelligence (studentApi.ts -- standalone)
// ======================================================================

describe('fetchStudyIntelligence -- URL construction', () => {
  it('calls /study-intelligence with course_id param', async () => {
    mockApiCall.mockResolvedValueOnce({});
    await fetchStudyIntelligence('course-99');

    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('/study-intelligence?');
    expect(url).toContain('course_id=course-99');
  });

  it('includes include_prerequisites param when option is true', async () => {
    mockApiCall.mockResolvedValueOnce({});
    await fetchStudyIntelligence('c1', { includePrerequisites: true });

    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('include_prerequisites=true');
  });

  it('includes include_similar param when option is true', async () => {
    mockApiCall.mockResolvedValueOnce({});
    await fetchStudyIntelligence('c1', { includeSimilar: true });

    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('include_similar=true');
  });

  it('does NOT include optional params when not set', async () => {
    mockApiCall.mockResolvedValueOnce({});
    await fetchStudyIntelligence('c1');

    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).not.toContain('include_prerequisites');
    expect(url).not.toContain('include_similar');
  });

  it('includes both optional params when both are true', async () => {
    mockApiCall.mockResolvedValueOnce({});
    await fetchStudyIntelligence('c1', {
      includePrerequisites: true,
      includeSimilar: true,
    });

    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('include_prerequisites=true');
    expect(url).toContain('include_similar=true');
    expect(url).toContain('course_id=c1');
  });
});

// ======================================================================
// SUITE 10: getAllCourseProgress -- URL construction (sa-course-progress.ts)
// ======================================================================

describe('getAllCourseProgress -- URL construction', () => {
  // Import directly to avoid barrel alias issues
  let getAllCourseProgress: typeof import('@/app/services/student-api/sa-course-progress').getAllCourseProgress;

  beforeEach(async () => {
    const mod = await import('@/app/services/student-api/sa-course-progress');
    getAllCourseProgress = mod.getAllCourseProgress;
    _courseProgressCache.entry = null;
  });

  it('calls three endpoints in parallel: study-sessions, fsrs-states, bkt-states', async () => {
    mockApiCall.mockResolvedValue({ items: [] });
    await getAllCourseProgress();

    const urls = mockApiCall.mock.calls.map((c: unknown[]) => c[0]);
    expect(urls).toContain('/study-sessions?limit=200');
    expect(urls).toContain('/fsrs-states?limit=500');
    expect(urls).toContain('/bkt-states?limit=500');
  });
});

// SUITE 11: getTopicKeywords — REMOVED (dead code, replaced by useKeywordMasteryQuery hook)
