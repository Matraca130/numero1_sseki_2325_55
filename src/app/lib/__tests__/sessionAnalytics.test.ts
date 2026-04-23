// ============================================================
// Axon -- Tests for sessionAnalytics.ts
//
// postSessionAnalytics() reads current stats/daily-activities
// then writes back accumulated + session values.
// Module-level promise chain serializes concurrent calls.
//
// Approach: mock apiCall and inspect sequence of GET/POST calls
// and the bodies posted.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiCall BEFORE importing the module under test.
const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: any[]) => mockApiCall(...args),
}));

import { postSessionAnalytics } from '@/app/lib/sessionAnalytics';

// Helper: parse the body of a POST call
function bodyOf(call: unknown[]): Record<string, unknown> {
  const opts = call[1] as { body: string };
  return JSON.parse(opts.body);
}

// Categorize mock calls by URL fragment + method
function findCalls(urlFragment: string, method?: string) {
  return mockApiCall.mock.calls.filter((c) => {
    const url = c[0] as string;
    if (!url.includes(urlFragment)) return false;
    const opts = c[1] as { method?: string } | undefined;
    const m = opts?.method ?? 'GET';
    return method ? m === method : true;
  });
}

beforeEach(() => {
  mockApiCall.mockReset();
});

// ================================================================

describe('postSessionAnalytics — happy path (no prior data)', () => {
  it('reads student-stats and daily-activities, then posts accumulated values', async () => {
    // GETs return nothing (first-time user)
    mockApiCall.mockImplementation(async (url: string, opts?: any) => {
      if (!opts || opts.method === 'GET' || !opts.method) {
        if (url === '/student-stats') return null;
        if (url.startsWith('/daily-activities?')) return [];
      }
      return null;
    });

    await postSessionAnalytics({ totalReviews: 10, correctReviews: 8, durationSeconds: 300 });

    const statsGets = findCalls('/student-stats', 'GET');
    const statsPosts = findCalls('/student-stats', 'POST');
    const dailyGets = findCalls('/daily-activities', 'GET');
    const dailyPosts = findCalls('/daily-activities', 'POST');

    expect(statsGets.length).toBe(1);
    expect(statsPosts.length).toBe(1);
    expect(dailyGets.length).toBe(1);
    expect(dailyPosts.length).toBe(1);

    // student-stats POST body reflects session values
    const statsBody = bodyOf(statsPosts[0]);
    expect(statsBody.total_reviews).toBe(10);
    expect(statsBody.total_time_seconds).toBe(300);
    expect(statsBody.total_sessions).toBe(1);
    expect(statsBody.current_streak).toBe(1);
    expect(statsBody.longest_streak).toBe(1);
    expect(typeof statsBody.last_study_date).toBe('string');

    // daily-activities POST body
    const dailyBody = bodyOf(dailyPosts[0]);
    expect(dailyBody.reviews_count).toBe(10);
    expect(dailyBody.correct_count).toBe(8);
    expect(dailyBody.time_spent_seconds).toBe(300);
    expect(dailyBody.sessions_count).toBe(1);
    expect(typeof dailyBody.activity_date).toBe('string');
  });
});

describe('postSessionAnalytics — increment existing values', () => {
  it('adds session values on top of accumulated totals', async () => {
    const existingStats = {
      total_reviews: 100,
      total_time_seconds: 3600,
      total_sessions: 5,
      current_streak: 3,
      longest_streak: 7,
      last_study_date: '1999-01-01', // far in the past -> streak resets to 1
    };
    const existingDaily = {
      reviews_count: 4,
      correct_count: 3,
      time_spent_seconds: 60,
      sessions_count: 1,
    };

    mockApiCall.mockImplementation(async (url: string, opts?: any) => {
      if (!opts || opts.method === 'GET' || !opts.method) {
        if (url === '/student-stats') return existingStats;
        if (url.startsWith('/daily-activities?')) return [existingDaily];
      }
      return null;
    });

    await postSessionAnalytics({ totalReviews: 10, correctReviews: 7, durationSeconds: 200 });

    const statsPosts = findCalls('/student-stats', 'POST');
    const dailyPosts = findCalls('/daily-activities', 'POST');

    const statsBody = bodyOf(statsPosts[0]);
    expect(statsBody.total_reviews).toBe(110);
    expect(statsBody.total_time_seconds).toBe(3800);
    expect(statsBody.total_sessions).toBe(6);

    const dailyBody = bodyOf(dailyPosts[0]);
    expect(dailyBody.reviews_count).toBe(14);
    expect(dailyBody.correct_count).toBe(10);
    expect(dailyBody.time_spent_seconds).toBe(260);
    expect(dailyBody.sessions_count).toBe(2);
  });

  it('keeps streak stable when already studied today (no double increment)', async () => {
    const today = new Date().toISOString().split('T')[0];
    const existingStats = {
      total_reviews: 50,
      total_time_seconds: 1000,
      total_sessions: 2,
      current_streak: 5,
      longest_streak: 10,
      last_study_date: today,
    };

    mockApiCall.mockImplementation(async (url: string, opts?: any) => {
      if (!opts || opts.method === 'GET' || !opts.method) {
        if (url === '/student-stats') return existingStats;
        if (url.startsWith('/daily-activities?')) return [];
      }
      return null;
    });

    await postSessionAnalytics({ totalReviews: 1, correctReviews: 1, durationSeconds: 10 });

    const statsPosts = findCalls('/student-stats', 'POST');
    const statsBody = bodyOf(statsPosts[0]);
    expect(statsBody.current_streak).toBe(5);
    expect(statsBody.longest_streak).toBe(10);
  });

  it('increments streak when last study was yesterday', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const existingStats = {
      total_reviews: 0,
      total_time_seconds: 0,
      total_sessions: 0,
      current_streak: 4,
      longest_streak: 4,
      last_study_date: yesterdayStr,
    };

    mockApiCall.mockImplementation(async (url: string, opts?: any) => {
      if (!opts || opts.method === 'GET' || !opts.method) {
        if (url === '/student-stats') return existingStats;
        if (url.startsWith('/daily-activities?')) return [];
      }
      return null;
    });

    await postSessionAnalytics({ totalReviews: 1, correctReviews: 1, durationSeconds: 10 });

    const statsPosts = findCalls('/student-stats', 'POST');
    const statsBody = bodyOf(statsPosts[0]);
    expect(statsBody.current_streak).toBe(5);
    expect(statsBody.longest_streak).toBe(5);
  });
});

describe('postSessionAnalytics — error resilience', () => {
  it('does not throw when student-stats GET fails', async () => {
    mockApiCall.mockImplementation(async (url: string, opts?: any) => {
      if (url === '/student-stats' && (!opts || opts.method === 'GET' || !opts.method)) {
        throw new Error('server down');
      }
      if (url.startsWith('/daily-activities?')) return [];
      return null;
    });

    await expect(
      postSessionAnalytics({ totalReviews: 1, correctReviews: 1, durationSeconds: 5 })
    ).resolves.toBeUndefined();
  });

  it('does not throw when POSTs fail', async () => {
    mockApiCall.mockImplementation(async (url: string, opts?: any) => {
      if (opts?.method === 'POST') throw new Error('write failed');
      if (url === '/student-stats') return null;
      if (url.startsWith('/daily-activities?')) return [];
      return null;
    });

    await expect(
      postSessionAnalytics({ totalReviews: 3, correctReviews: 2, durationSeconds: 30 })
    ).resolves.toBeUndefined();
  });
});

describe('postSessionAnalytics — daily-activities GET response shape handling', () => {
  it('handles array response with first element', async () => {
    mockApiCall.mockImplementation(async (url: string, opts?: any) => {
      if (!opts || opts.method === 'GET' || !opts.method) {
        if (url === '/student-stats') return null;
        if (url.startsWith('/daily-activities?')) {
          return [{ reviews_count: 5, correct_count: 4, time_spent_seconds: 100, sessions_count: 1 }];
        }
      }
      return null;
    });

    await postSessionAnalytics({ totalReviews: 2, correctReviews: 1, durationSeconds: 20 });

    const dailyPosts = findCalls('/daily-activities', 'POST');
    const dailyBody = bodyOf(dailyPosts[0]);
    expect(dailyBody.reviews_count).toBe(7);
    expect(dailyBody.correct_count).toBe(5);
    expect(dailyBody.time_spent_seconds).toBe(120);
    expect(dailyBody.sessions_count).toBe(2);
  });

  it('handles object (non-array) response from daily-activities GET', async () => {
    mockApiCall.mockImplementation(async (url: string, opts?: any) => {
      if (!opts || opts.method === 'GET' || !opts.method) {
        if (url === '/student-stats') return null;
        if (url.startsWith('/daily-activities?')) {
          return { reviews_count: 3, correct_count: 2, time_spent_seconds: 50, sessions_count: 1 };
        }
      }
      return null;
    });

    await postSessionAnalytics({ totalReviews: 2, correctReviews: 1, durationSeconds: 20 });

    const dailyPosts = findCalls('/daily-activities', 'POST');
    const dailyBody = bodyOf(dailyPosts[0]);
    expect(dailyBody.reviews_count).toBe(5);
    expect(dailyBody.correct_count).toBe(3);
  });

  it('handles empty array response (new day)', async () => {
    mockApiCall.mockImplementation(async (url: string, opts?: any) => {
      if (!opts || opts.method === 'GET' || !opts.method) {
        if (url === '/student-stats') return null;
        if (url.startsWith('/daily-activities?')) return [];
      }
      return null;
    });

    await postSessionAnalytics({ totalReviews: 3, correctReviews: 2, durationSeconds: 30 });

    const dailyPosts = findCalls('/daily-activities', 'POST');
    const dailyBody = bodyOf(dailyPosts[0]);
    expect(dailyBody.reviews_count).toBe(3);
    expect(dailyBody.sessions_count).toBe(1);
  });
});
