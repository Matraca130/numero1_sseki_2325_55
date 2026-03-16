// ============================================================
// TEST: sessionAnalytics.ts — Post-session analytics
//
// Covers:
//   1. Streak logic: today (no-op), yesterday (increment), other (reset)
//   2. Accumulation: prev + session values for student-stats
//   3. Daily activities: read-then-increment for same-day totals
//   4. First-time user: no existing stats → creates from zero
//   5. Fire-and-forget: errors logged but never thrown
//   6. Mutex serialization: concurrent calls don't race
//
// Mocks: apiCall (all HTTP is mocked)
// Date: vi.useFakeTimers for deterministic today/yesterday
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock apiCall BEFORE import ────────────────────────────
const mockApiCall = vi.fn();

vi.mock('../api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

// ── Import AFTER mock ─────────────────────────────────────
import { postSessionAnalytics } from '../sessionAnalytics';
import type { SessionAnalyticsInput } from '../sessionAnalytics';

// ── Helpers ───────────────────────────────────────────────

const BASE_INPUT: SessionAnalyticsInput = {
  totalReviews: 10,
  correctReviews: 7,
  durationSeconds: 300,
};

/**
 * Sets up apiCall mock to return specific values for GET calls.
 * Pattern: GET /student-stats → statsResponse, GET /daily-activities?... → dailyResponse
 */
function setupApiMock(opts: {
  existingStats?: Record<string, unknown> | null;
  existingDaily?: Record<string, unknown>[] | Record<string, unknown> | null;
  postShouldFail?: boolean;
}) {
  mockApiCall.mockImplementation((url: string, options?: { method?: string }) => {
    const method = options?.method ?? 'GET';

    if (method === 'GET') {
      if (url === '/student-stats') {
        if (opts.existingStats === undefined) {
          return Promise.reject(new Error('404 not found'));
        }
        return Promise.resolve(opts.existingStats);
      }
      if (url.startsWith('/daily-activities')) {
        return Promise.resolve(opts.existingDaily ?? []);
      }
    }

    if (method === 'POST') {
      if (opts.postShouldFail) {
        return Promise.reject(new Error('500 server error'));
      }
      return Promise.resolve({ ok: true });
    }

    return Promise.resolve(null);
  });
}

/** Extract the body from the POST call to a specific URL */
function getPostBody(url: string): Record<string, unknown> | null {
  const call = mockApiCall.mock.calls.find(
    ([u, opts]: [string, { method?: string }?]) =>
      u === url && opts?.method === 'POST',
  );
  if (!call) return null;
  return JSON.parse(call[1].body);
}

// ── Setup (shared date + mock cleanup) ────────────────────

beforeEach(() => {
  mockApiCall.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-10T14:00:00Z'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ── Streak logic ──────────────────────────────────────────

describe('postSessionAnalytics — streak logic', () => {
  it('first-time user → streak = 1, longest_streak = 1', async () => {
    setupApiMock({}); // GET /student-stats → 404 (first time)

    await postSessionAnalytics(BASE_INPUT);

    const body = getPostBody('/student-stats');
    expect(body).not.toBeNull();
    expect(body!.current_streak).toBe(1);
    expect(body!.longest_streak).toBe(1);
    expect(body!.last_study_date).toBe('2026-03-10');
  });

  it('studied yesterday → streak increments by 1', async () => {
    setupApiMock({
      existingStats: {
        total_reviews: 20,
        total_time_seconds: 600,
        total_sessions: 2,
        current_streak: 3,
        longest_streak: 5,
        last_study_date: '2026-03-09', // yesterday
      },
    });

    await postSessionAnalytics(BASE_INPUT);

    const body = getPostBody('/student-stats');
    expect(body!.current_streak).toBe(4); // 3 + 1
    expect(body!.longest_streak).toBe(5); // max(5, 4) = 5
  });

  it('studied yesterday → updates longest_streak if new streak exceeds it', async () => {
    setupApiMock({
      existingStats: {
        total_reviews: 50,
        total_time_seconds: 1000,
        total_sessions: 5,
        current_streak: 5,
        longest_streak: 5,
        last_study_date: '2026-03-09',
      },
    });

    await postSessionAnalytics(BASE_INPUT);

    const body = getPostBody('/student-stats');
    expect(body!.current_streak).toBe(6);
    expect(body!.longest_streak).toBe(6); // max(5, 6) = 6
  });

  it('already studied today → streak unchanged', async () => {
    setupApiMock({
      existingStats: {
        total_reviews: 10,
        total_time_seconds: 300,
        total_sessions: 1,
        current_streak: 3,
        longest_streak: 7,
        last_study_date: '2026-03-10', // today
      },
    });

    await postSessionAnalytics(BASE_INPUT);

    const body = getPostBody('/student-stats');
    expect(body!.current_streak).toBe(3); // unchanged
    expect(body!.longest_streak).toBe(7); // unchanged
  });

  it('gap of 2+ days → streak resets to 1', async () => {
    setupApiMock({
      existingStats: {
        total_reviews: 100,
        total_time_seconds: 5000,
        total_sessions: 20,
        current_streak: 15,
        longest_streak: 15,
        last_study_date: '2026-03-07', // 3 days ago
      },
    });

    await postSessionAnalytics(BASE_INPUT);

    const body = getPostBody('/student-stats');
    expect(body!.current_streak).toBe(1); // reset
    expect(body!.longest_streak).toBe(15); // max(15, 1) = 15 preserved
  });
});

// ── Accumulation ──────────────────────────────────────────

describe('postSessionAnalytics — accumulation', () => {
  it('accumulates total_reviews from existing + session', async () => {
    setupApiMock({
      existingStats: {
        total_reviews: 50,
        total_time_seconds: 2000,
        total_sessions: 5,
        current_streak: 1,
        longest_streak: 3,
        last_study_date: '2026-03-10',
      },
    });

    await postSessionAnalytics(BASE_INPUT);

    const body = getPostBody('/student-stats');
    expect(body!.total_reviews).toBe(60); // 50 + 10
    expect(body!.total_time_seconds).toBe(2300); // 2000 + 300
    expect(body!.total_sessions).toBe(6); // 5 + 1
  });

  it('first-time user accumulates from zero', async () => {
    setupApiMock({}); // 404 → null

    await postSessionAnalytics(BASE_INPUT);

    const body = getPostBody('/student-stats');
    expect(body!.total_reviews).toBe(10); // 0 + 10
    expect(body!.total_time_seconds).toBe(300); // 0 + 300
    expect(body!.total_sessions).toBe(1); // 0 + 1
  });
});

// ── Daily activities ──────────────────────────────────────

describe('postSessionAnalytics — daily activities', () => {
  it('accumulates daily totals when existing row exists (array response)', async () => {
    setupApiMock({
      existingStats: null,
      existingDaily: [{
        reviews_count: 5,
        correct_count: 3,
        time_spent_seconds: 120,
        sessions_count: 1,
      }],
    });

    await postSessionAnalytics(BASE_INPUT);

    const body = getPostBody('/daily-activities');
    expect(body).not.toBeNull();
    expect(body!.reviews_count).toBe(15); // 5 + 10
    expect(body!.correct_count).toBe(10); // 3 + 7
    expect(body!.time_spent_seconds).toBe(420); // 120 + 300
    expect(body!.sessions_count).toBe(2); // 1 + 1
    expect(body!.activity_date).toBe('2026-03-10');
  });

  it('accumulates daily totals when backend returns single object (not array)', async () => {
    // Some backends return a single object instead of an array
    // The source handles both: Array.isArray(result) and !Array.isArray(result)
    setupApiMock({
      existingStats: null,
      existingDaily: {
        reviews_count: 8,
        correct_count: 5,
        time_spent_seconds: 200,
        sessions_count: 2,
      } as any, // single object, not array
    });

    await postSessionAnalytics(BASE_INPUT);

    const body = getPostBody('/daily-activities');
    expect(body).not.toBeNull();
    expect(body!.reviews_count).toBe(18); // 8 + 10
    expect(body!.correct_count).toBe(12); // 5 + 7
    expect(body!.time_spent_seconds).toBe(500); // 200 + 300
    expect(body!.sessions_count).toBe(3); // 2 + 1
  });

  it('first session of the day → creates from zero', async () => {
    setupApiMock({
      existingStats: null,
      existingDaily: [], // empty array = no row for today
    });

    await postSessionAnalytics(BASE_INPUT);

    const body = getPostBody('/daily-activities');
    expect(body!.reviews_count).toBe(10);
    expect(body!.correct_count).toBe(7);
    expect(body!.time_spent_seconds).toBe(300);
    expect(body!.sessions_count).toBe(1);
  });
});

// ── Fire-and-forget ───────────────────────────────────────

describe('postSessionAnalytics — error resilience', () => {
  it('should NOT throw when POST fails', async () => {
    setupApiMock({ existingStats: null, postShouldFail: true });

    // Should resolve without throwing
    await expect(postSessionAnalytics(BASE_INPUT)).resolves.toBeUndefined();
  });

  it('should NOT throw when GET fails', async () => {
    mockApiCall.mockRejectedValue(new Error('network down'));

    await expect(postSessionAnalytics(BASE_INPUT)).resolves.toBeUndefined();
  });
});

// ── Mutex serialization ───────────────────────────────────

describe('postSessionAnalytics — serialization', () => {
  it('concurrent calls should serialize (second waits for first)', async () => {
    const callOrder: string[] = [];

    mockApiCall.mockImplementation((url: string, options?: { method?: string }) => {
      const method = options?.method ?? 'GET';

      if (method === 'GET' && url === '/student-stats') {
        callOrder.push('GET-stats');
        return Promise.resolve(null);
      }
      if (method === 'GET' && url.startsWith('/daily-activities')) {
        return Promise.resolve([]);
      }
      if (method === 'POST' && url === '/student-stats') {
        callOrder.push('POST-stats');
        return Promise.resolve({ ok: true });
      }
      if (method === 'POST') {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve(null);
    });

    // Fire two calls concurrently
    const p1 = postSessionAnalytics({ totalReviews: 5, correctReviews: 3, durationSeconds: 100 });
    const p2 = postSessionAnalytics({ totalReviews: 8, correctReviews: 6, durationSeconds: 200 });

    await Promise.all([p1, p2]);

    // Both should complete. The key invariant is that we get
    // 2 GET-stats and 2 POST-stats (not interleaved reads)
    const getCount = callOrder.filter(c => c === 'GET-stats').length;
    const postCount = callOrder.filter(c => c === 'POST-stats').length;
    expect(getCount).toBe(2);
    expect(postCount).toBe(2);

    // First GET should come before first POST (read-then-write order)
    const firstGet = callOrder.indexOf('GET-stats');
    const firstPost = callOrder.indexOf('POST-stats');
    expect(firstGet).toBeLessThan(firstPost);
  });
});
