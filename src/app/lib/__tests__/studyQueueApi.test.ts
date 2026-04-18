// ============================================================
// Axon -- Tests for studyQueueApi.ts (GET /study-queue wrapper)
//
// Coverage: query-string builder correctness (course_id, limit,
//           include_future), no-params case, response pass-through.
//
// Mocks: @/app/lib/api apiCall
//
// NOTE (memory: URLSearchParams omits falsy values by design).
// `limit: 0` and `include_future: false` are intentionally NOT emitted
// because the implementation uses `if (params.limit)` / `if (include_future)`.
//
// Run: npx vitest run src/app/lib/__tests__/studyQueueApi.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/app/lib/api';
import { getStudyQueue, type StudyQueueResponse } from '@/app/lib/studyQueueApi';

const mockApiCall = vi.mocked(apiCall);

function emptyResponse(): StudyQueueResponse {
  return {
    queue: [],
    meta: {
      total_due: 0,
      total_new: 0,
      total_in_queue: 0,
      returned: 0,
      limit: 20,
      include_future: false,
      course_id: null,
      generated_at: '2026-04-18T00:00:00Z',
      algorithm: 'fsrs',
      weights: {
        overdueWeight: 0.4,
        masteryWeight: 0.3,
        fragilityWeight: 0.2,
        noveltyWeight: 0.1,
        graceDays: 1,
      },
    },
  };
}

describe('getStudyQueue', () => {
  beforeEach(() => {
    mockApiCall.mockReset();
  });

  it('calls /study-queue with no query string when no params provided', async () => {
    mockApiCall.mockResolvedValueOnce(emptyResponse());
    await getStudyQueue();
    expect(mockApiCall).toHaveBeenCalledWith('/study-queue');
  });

  it('calls /study-queue with no query string when params is empty object', async () => {
    mockApiCall.mockResolvedValueOnce(emptyResponse());
    await getStudyQueue({});
    expect(mockApiCall).toHaveBeenCalledWith('/study-queue');
  });

  it('appends course_id when provided', async () => {
    mockApiCall.mockResolvedValueOnce(emptyResponse());
    await getStudyQueue({ course_id: 'course-123' });
    expect(mockApiCall).toHaveBeenCalledWith('/study-queue?course_id=course-123');
  });

  it('appends limit when provided', async () => {
    mockApiCall.mockResolvedValueOnce(emptyResponse());
    await getStudyQueue({ limit: 50 });
    expect(mockApiCall).toHaveBeenCalledWith('/study-queue?limit=50');
  });

  it('appends include_future=1 when true', async () => {
    mockApiCall.mockResolvedValueOnce(emptyResponse());
    await getStudyQueue({ include_future: true });
    expect(mockApiCall).toHaveBeenCalledWith('/study-queue?include_future=1');
  });

  it('does NOT append include_future when false (truthy-check behaviour)', async () => {
    mockApiCall.mockResolvedValueOnce(emptyResponse());
    await getStudyQueue({ include_future: false });
    expect(mockApiCall).toHaveBeenCalledWith('/study-queue');
  });

  it('does NOT append limit when zero (falsy-check behaviour)', async () => {
    mockApiCall.mockResolvedValueOnce(emptyResponse());
    await getStudyQueue({ limit: 0 });
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).not.toContain('limit=');
  });

  it('combines all three params in canonical order', async () => {
    mockApiCall.mockResolvedValueOnce(emptyResponse());
    await getStudyQueue({
      course_id: 'c1',
      limit: 20,
      include_future: true,
    });
    // URLSearchParams preserves insertion order: course_id, limit, include_future
    expect(mockApiCall).toHaveBeenCalledWith(
      '/study-queue?course_id=c1&limit=20&include_future=1',
    );
  });

  it('url-encodes special characters in course_id', async () => {
    mockApiCall.mockResolvedValueOnce(emptyResponse());
    await getStudyQueue({ course_id: 'course id/1+2' });
    const url = mockApiCall.mock.calls[0][0] as string;
    // URLSearchParams encodes ' ' as '+' (form encoding)
    expect(url).toContain('course_id=course+id%2F1%2B2');
  });

  it('returns the apiCall result unchanged', async () => {
    const resp = emptyResponse();
    resp.meta.returned = 5;
    mockApiCall.mockResolvedValueOnce(resp);
    const out = await getStudyQueue({ course_id: 'c1' });
    expect(out).toBe(resp);
    expect(out.meta.returned).toBe(5);
  });

  it('propagates apiCall rejection', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('500 Internal'));
    await expect(getStudyQueue({ course_id: 'c1' })).rejects.toThrow('500 Internal');
  });

  it('ignores empty-string course_id (falsy)', async () => {
    mockApiCall.mockResolvedValueOnce(emptyResponse());
    await getStudyQueue({ course_id: '' });
    expect(mockApiCall).toHaveBeenCalledWith('/study-queue');
  });
});
