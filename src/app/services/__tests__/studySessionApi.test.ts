// ============================================================
// Unit tests for studySessionApi service
//
// Covers: createStudySession, closeStudySession, getStudySessions,
// getFsrsStates, upsertFsrsState, submitReview, submitReviewBatch,
// fallbackToIndividualPosts.
//
// Verifies URL, method, body, query-param serialization, paginated
// response normalization, and fallback error-swallow semantics.
//
// Mocks: @/app/lib/api (apiCall)
//
// RUN: npx vitest run src/app/services/__tests__/studySessionApi.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

import {
  createStudySession,
  closeStudySession,
  getStudySessions,
  getFsrsStates,
  upsertFsrsState,
  submitReview,
  submitReviewBatch,
  fallbackToIndividualPosts,
  type BatchReviewItem,
  type StudySessionRecord,
  type FsrsStateRow,
} from '@/app/services/studySessionApi';

const SESSION: StudySessionRecord = {
  id: 'ses-1',
  student_id: 'stu-1',
  session_type: 'flashcard',
  course_id: 'crs-1',
  started_at: '2026-04-18T09:00:00Z',
  completed_at: null,
  total_reviews: 0,
  correct_reviews: 0,
};

const FSRS_ROW: FsrsStateRow = {
  id: 'fs-1',
  student_id: 'stu-1',
  flashcard_id: 'card-1',
  stability: 1.5,
  difficulty: 5,
  due_at: '2026-04-19T09:00:00Z',
  last_review_at: '2026-04-18T09:00:00Z',
  reps: 1,
  lapses: 0,
  state: 'learning',
};

beforeEach(() => {
  mockApiCall.mockReset();
});

// ══════════════════════════════════════════════════════════════
// Study Sessions
// ══════════════════════════════════════════════════════════════

describe('createStudySession', () => {
  it('POSTs /study-sessions with JSON body', async () => {
    mockApiCall.mockResolvedValueOnce(SESSION);
    const result = await createStudySession({ session_type: 'flashcard', course_id: 'crs-1' });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/study-sessions');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ session_type: 'flashcard', course_id: 'crs-1' });
    expect(result).toEqual(SESSION);
  });

  it('accepts all valid session_type values', async () => {
    const types: Array<'flashcard' | 'quiz' | 'reading' | 'mixed'> = [
      'flashcard',
      'quiz',
      'reading',
      'mixed',
    ];
    for (const t of types) {
      mockApiCall.mockResolvedValueOnce({ ...SESSION, session_type: t });
      await createStudySession({ session_type: t });
      const body = JSON.parse(mockApiCall.mock.calls[mockApiCall.mock.calls.length - 1][1].body);
      expect(body.session_type).toBe(t);
    }
  });

  it('propagates errors from backend', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('nope'));
    await expect(createStudySession({ session_type: 'quiz' })).rejects.toThrow('nope');
  });
});

describe('closeStudySession', () => {
  it('PUTs /study-sessions/:id with completed_at body', async () => {
    mockApiCall.mockResolvedValueOnce({ ...SESSION, completed_at: '2026-04-18T10:00:00Z' });
    await closeStudySession('ses-1', {
      completed_at: '2026-04-18T10:00:00Z',
      total_reviews: 10,
      correct_reviews: 7,
    });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/study-sessions/ses-1');
    expect(opts.method).toBe('PUT');
    const body = JSON.parse(opts.body);
    // RT-001: completed_at (not ended_at)
    expect(body.completed_at).toBe('2026-04-18T10:00:00Z');
    expect(body).not.toHaveProperty('ended_at');
    // duration_seconds must NOT be added
    expect(body).not.toHaveProperty('duration_seconds');
    expect(body.total_reviews).toBe(10);
    expect(body.correct_reviews).toBe(7);
  });
});

describe('getStudySessions', () => {
  it('GETs /study-sessions with no query when filters omitted', async () => {
    mockApiCall.mockResolvedValueOnce([SESSION]);
    await getStudySessions();
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/study-sessions');
    expect(url).not.toContain('?');
  });

  it('serializes all filters into query string', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 20, offset: 0 });
    await getStudySessions({ session_type: 'flashcard', course_id: 'crs-1', limit: 20 });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('session_type=flashcard');
    expect(url).toContain('course_id=crs-1');
    expect(url).toContain('limit=20');
  });

  it('normalizes plain-array response to array', async () => {
    mockApiCall.mockResolvedValueOnce([SESSION]);
    const result = await getStudySessions();
    expect(result).toEqual([SESSION]);
  });

  it('normalizes CRUD-factory paginated response to items[]', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [SESSION], total: 1, limit: 20, offset: 0 });
    const result = await getStudySessions();
    expect(result).toEqual([SESSION]);
  });

  it('returns [] when response is null/empty object', async () => {
    mockApiCall.mockResolvedValueOnce(null);
    expect(await getStudySessions()).toEqual([]);
    mockApiCall.mockResolvedValueOnce({});
    expect(await getStudySessions()).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// FSRS states
// ══════════════════════════════════════════════════════════════

describe('getFsrsStates', () => {
  it('GETs /fsrs-states with no query when params omitted', async () => {
    mockApiCall.mockResolvedValueOnce([FSRS_ROW]);
    await getFsrsStates();
    expect(mockApiCall.mock.calls[0][0]).toBe('/fsrs-states');
  });

  it('serializes due_before + state + limit', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 50, offset: 0 });
    await getFsrsStates({ due_before: '2026-04-20T00:00:00Z', state: 'review', limit: 50 });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('/fsrs-states?');
    expect(url).toContain('state=review');
    expect(url).toContain('limit=50');
    expect(url).toContain('due_before=');
  });

  it('returns items[] for paginated response', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [FSRS_ROW], total: 1, limit: 50, offset: 0 });
    const result = await getFsrsStates();
    expect(result).toEqual([FSRS_ROW]);
  });

  it('returns [] for null response', async () => {
    mockApiCall.mockResolvedValueOnce(null);
    expect(await getFsrsStates()).toEqual([]);
  });
});

describe('upsertFsrsState', () => {
  it('POSTs /fsrs-states with full FSRS payload', async () => {
    mockApiCall.mockResolvedValueOnce(FSRS_ROW);
    await upsertFsrsState({
      flashcard_id: 'card-1',
      stability: 1.5,
      difficulty: 5,
      due_at: '2026-04-19T09:00:00Z',
      last_review_at: '2026-04-18T09:00:00Z',
      reps: 1,
      lapses: 0,
      state: 'learning',
    });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/fsrs-states');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body).flashcard_id).toBe('card-1');
  });
});

// ══════════════════════════════════════════════════════════════
// Reviews
// ══════════════════════════════════════════════════════════════

describe('submitReview', () => {
  it('POSTs /reviews with required payload', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'rv-1' });
    await submitReview({
      session_id: 'ses-1',
      item_id: 'card-1',
      instrument_type: 'flashcard',
      grade: 3,
      response_time_ms: 1500,
    });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/reviews');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.session_id).toBe('ses-1');
    expect(body.item_id).toBe('card-1');
    expect(body.instrument_type).toBe('flashcard');
    expect(body.grade).toBe(3);
    expect(body.response_time_ms).toBe(1500);
  });
});

// ══════════════════════════════════════════════════════════════
// submitReviewBatch
// ══════════════════════════════════════════════════════════════

describe('submitReviewBatch', () => {
  it('POSTs /review-batch with session_id + reviews array', async () => {
    const reviews: BatchReviewItem[] = [
      { item_id: 'c1', instrument_type: 'flashcard', grade: 4, subtopic_id: 'sub-1' },
      { item_id: 'c2', instrument_type: 'flashcard', grade: 2 },
    ];
    mockApiCall.mockResolvedValueOnce({
      processed: 2,
      reviews_created: 2,
      fsrs_updated: 2,
      bkt_updated: 2,
    });
    const result = await submitReviewBatch('ses-1', reviews);
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/review-batch');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.session_id).toBe('ses-1');
    expect(body.reviews).toHaveLength(2);
    expect(body.reviews[0].subtopic_id).toBe('sub-1');
    // Must NOT include fsrs_update / bkt_update (PATH B → computed server-side)
    expect(body.reviews[0]).not.toHaveProperty('fsrs_update');
    expect(body.reviews[0]).not.toHaveProperty('bkt_update');
    expect(result.processed).toBe(2);
  });

  it('propagates errors so caller can fall back', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('500 boom'));
    await expect(submitReviewBatch('ses-1', [])).rejects.toThrow('500 boom');
  });
});

// ══════════════════════════════════════════════════════════════
// fallbackToIndividualPosts
// ══════════════════════════════════════════════════════════════

describe('fallbackToIndividualPosts', () => {
  it('fires one POST /reviews per batch item', async () => {
    mockApiCall.mockResolvedValue({ id: 'rv-x' });
    const items: BatchReviewItem[] = [
      { item_id: 'c1', instrument_type: 'flashcard', grade: 3 },
      { item_id: 'c2', instrument_type: 'flashcard', grade: 4 },
      { item_id: 'c3', instrument_type: 'flashcard', grade: 1 },
    ];
    await fallbackToIndividualPosts('ses-1', items);
    expect(mockApiCall).toHaveBeenCalledTimes(3);
    for (const call of mockApiCall.mock.calls) {
      expect(call[0]).toBe('/reviews');
      const body = JSON.parse(call[1].body);
      expect(body.session_id).toBe('ses-1');
      expect(body.instrument_type).toBe('flashcard');
    }
  });

  it('does not reject when an individual POST fails (allSettled + catch)', async () => {
    mockApiCall
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce({ id: 'ok' });
    const items: BatchReviewItem[] = [
      { item_id: 'c1', instrument_type: 'flashcard', grade: 3 },
      { item_id: 'c2', instrument_type: 'flashcard', grade: 4 },
    ];
    await expect(
      fallbackToIndividualPosts('ses-1', items),
    ).resolves.toBeUndefined();
    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  it('resolves instantly for empty items array', async () => {
    await expect(fallbackToIndividualPosts('ses-1', [])).resolves.toBeUndefined();
    expect(mockApiCall).not.toHaveBeenCalled();
  });
});
