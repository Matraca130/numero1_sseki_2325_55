// ============================================================
// TEST: E2E API Services Integration
//
// Verifies the full integration path from service functions
// through apiCall() down to fetch, covering:
//   - URL construction with API_BASE
//   - Authorization header (ANON_KEY always present)
//   - X-Access-Token header (when authenticated)
//   - Response data unwrapping ({ data: ... } envelope)
//   - Error response propagation
//   - Network timeout handling
//   - GET request deduplication (in-flight promise reuse)
//   - Token management (setAccessToken / getAccessToken)
//   - Service-level endpoint correctness (flashcard, quiz, summaries, gamification)
//   - Error propagation from service layer
//
// APPROACH: Mock globalThis.fetch. Mock @/app/lib/supabase for constants.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock supabase module for constants ──────────────────────
vi.mock('@/app/lib/supabase', () => ({
  SUPABASE_URL: 'https://mock.supabase.co',
  SUPABASE_ANON_KEY: 'mock-anon-key',
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: () => Promise.resolve({}),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock quizConstants to avoid import chain issues
vi.mock('@/app/services/quizConstants', () => ({
  DIFFICULTY_TO_INT: { easy: 1, medium: 2, hard: 3 },
}));

// Mock gamification types
vi.mock('@/app/types/gamification', () => ({}));

import {
  apiCall,
  setAccessToken,
  getAccessToken,
  API_BASE,
  ANON_KEY,
} from '@/app/lib/api';

import { getFlashcardsByTopic } from '@/app/services/flashcardApi';
import { getQuizQuestions } from '@/app/services/quizQuestionsApi';
import { getSummaries } from '@/app/services/summariesApi';
import { getProfile } from '@/app/services/gamificationApi';

// ── Helpers ─────────────────────────────────────────────────

const mockFetch = vi.fn();

function mockOkResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(JSON.stringify({ data })),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  } as unknown as Response;
}

function mockErrorResponse(error: string, status: number): Response {
  return {
    ok: false,
    status,
    text: vi.fn().mockResolvedValue(JSON.stringify({ error })),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  } as unknown as Response;
}

// ── Setup / Teardown ────────────────────────────────────────

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
  setAccessToken(null);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════
// 1. URL construction
// ══════════════════════════════════════════════════════════════

describe('apiCall — URL construction with API_BASE', () => {
  it('constructs the full URL as API_BASE + path', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse({ items: [] }));

    await apiCall('/flashcards?summary_id=s1');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${API_BASE}/flashcards?summary_id=s1`);
    expect(calledUrl).toBe(
      'https://mock.supabase.co/functions/v1/server/flashcards?summary_id=s1',
    );
  });
});

// ══════════════════════════════════════════════════════════════
// 2. Authorization header with ANON_KEY (always)
// ══════════════════════════════════════════════════════════════

describe('apiCall — Authorization header', () => {
  it('always sends Authorization: Bearer <ANON_KEY>', async () => {
    mockFetch.mockResolvedValueOnce(mockOkResponse('ok'));

    await apiCall('/test');

    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${ANON_KEY}`);
    expect(headers['Authorization']).toBe('Bearer mock-anon-key');
  });
});

// ══════════════════════════════════════════════════════════════
// 3. X-Access-Token when authenticated
// ══════════════════════════════════════════════════════════════

describe('apiCall — X-Access-Token header', () => {
  it('sends X-Access-Token when a token is set', async () => {
    setAccessToken('user-jwt-123');
    mockFetch.mockResolvedValueOnce(mockOkResponse('ok'));

    await apiCall('/protected');

    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['X-Access-Token']).toBe('user-jwt-123');
  });

  it('omits X-Access-Token when no token is set', async () => {
    setAccessToken(null);
    mockFetch.mockResolvedValueOnce(mockOkResponse('ok'));

    await apiCall('/public');

    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['X-Access-Token']).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
// 4. Response data unwrapping
// ══════════════════════════════════════════════════════════════

describe('apiCall — response parsing', () => {
  it('unwraps { data: X } envelope and returns X', async () => {
    const payload = { id: 'abc', title: 'Test Item' };
    mockFetch.mockResolvedValueOnce(mockOkResponse(payload));

    const result = await apiCall('/items/abc');

    expect(result).toEqual(payload);
  });
});

// ══════════════════════════════════════════════════════════════
// 5. Error response handling
// ══════════════════════════════════════════════════════════════

describe('apiCall — error responses', () => {
  it('throws an Error with the server error message on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse('Resource not found', 404));

    await expect(apiCall('/missing')).rejects.toThrow('Resource not found');
  });

  it('throws a generic error when non-ok response has no error field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue(JSON.stringify({ status: 'fail' })),
      headers: new Headers(),
    } as unknown as Response);

    await expect(apiCall('/broken')).rejects.toThrow('API Error 500');
  });
});

// ══════════════════════════════════════════════════════════════
// 6. Network timeout
// ══════════════════════════════════════════════════════════════

describe('apiCall — network timeout', () => {
  it('aborts and throws after the specified timeoutMs', async () => {
    mockFetch.mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted.');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    await expect(apiCall('/slow', { timeoutMs: 50 })).rejects.toThrow(
      /Request timeout after 50ms/,
    );
  });
});

// ══════════════════════════════════════════════════════════════
// 7. GET request deduplication
// ══════════════════════════════════════════════════════════════

describe('apiCall — GET deduplication', () => {
  it('reuses the same in-flight promise for identical GET paths', async () => {
    let resolveCall: ((v: Response) => void) | undefined;
    mockFetch.mockImplementation(
      () => new Promise<Response>((resolve) => { resolveCall = resolve; }),
    );

    const p1 = apiCall('/dedup-test');
    const p2 = apiCall('/dedup-test');

    // Only one fetch call should have been made
    expect(mockFetch).toHaveBeenCalledTimes(1);

    resolveCall!(mockOkResponse({ value: 'shared' }));

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ value: 'shared' });
    expect(r2).toEqual({ value: 'shared' });
  });

  it('does NOT deduplicate POST requests to the same path', async () => {
    mockFetch.mockResolvedValue(mockOkResponse('created'));

    await Promise.all([
      apiCall('/items', { method: 'POST', body: '{}' }),
      apiCall('/items', { method: 'POST', body: '{}' }),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ══════════════════════════════════════════════════════════════
// 8. Token management
// ══════════════════════════════════════════════════════════════

describe('setAccessToken / getAccessToken', () => {
  it('stores and retrieves a token', () => {
    setAccessToken('jwt-token-xyz');
    expect(getAccessToken()).toBe('jwt-token-xyz');
  });

  it('clears token when set to null', () => {
    setAccessToken('jwt-token-xyz');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it('syncs token to localStorage for backward compat', () => {
    setAccessToken('persisted-jwt');
    expect(localStorage.getItem('axon_access_token')).toBe('persisted-jwt');

    setAccessToken(null);
    expect(localStorage.getItem('axon_access_token')).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// 9. Service: flashcardApi.getFlashcardsByTopic
// ══════════════════════════════════════════════════════════════

describe('flashcardApi.getFlashcardsByTopic', () => {
  it('calls GET /flashcards-by-topic with topic_id query param', async () => {
    const responsePayload = { items: [{ id: 'fc-1', front: 'Q', back: 'A' }], total: 1, limit: 50, offset: 0 };
    mockFetch.mockResolvedValueOnce(mockOkResponse(responsePayload));

    const result = await getFlashcardsByTopic('topic-42');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/flashcards-by-topic?');
    expect(calledUrl).toContain('topic_id=topic-42');
    expect(result).toEqual(responsePayload);
  });
});

// ══════════════════════════════════════════════════════════════
// 10. Service: quizQuestionsApi.getQuizQuestions
// ══════════════════════════════════════════════════════════════

describe('quizQuestionsApi.getQuizQuestions', () => {
  it('calls GET /quiz-questions with summary_id query param', async () => {
    const responsePayload = {
      items: [{ id: 'qq-1', question: 'What is X?', correct_answer: 'Y' }],
      total: 1,
      limit: 50,
      offset: 0,
    };
    mockFetch.mockResolvedValueOnce(mockOkResponse(responsePayload));

    const result = await getQuizQuestions('summary-99');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/quiz-questions?');
    expect(calledUrl).toContain('summary_id=summary-99');
    expect(result).toEqual(responsePayload);
  });
});

// ══════════════════════════════════════════════════════════════
// 11. Service: summariesApi.getSummaries
// ══════════════════════════════════════════════════════════════

describe('summariesApi.getSummaries', () => {
  it('calls GET /summaries with topic_id query param', async () => {
    const responsePayload = {
      items: [{ id: 'sum-1', title: 'Intro', topic_id: 'topic-7' }],
      total: 1,
      limit: 50,
      offset: 0,
    };
    mockFetch.mockResolvedValueOnce(mockOkResponse(responsePayload));

    const result = await getSummaries('topic-7');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/summaries?');
    expect(calledUrl).toContain('topic_id=topic-7');
    expect(result).toEqual(responsePayload);
  });
});

// ══════════════════════════════════════════════════════════════
// 12. Service: gamificationApi.getProfile
// ══════════════════════════════════════════════════════════════

describe('gamificationApi.getProfile', () => {
  it('calls GET /gamification/profile with institution_id query param', async () => {
    const profile = {
      xp: { total: 500, today: 20, this_week: 100, level: 3, daily_goal_minutes: 30, daily_cap: 200, streak_freezes_owned: 1 },
      streak: { current: 5, longest: 12, last_study_date: '2026-03-28' },
      badges_earned: 3,
    };
    mockFetch.mockResolvedValueOnce(mockOkResponse(profile));

    const result = await getProfile('inst-abc');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/gamification/profile?');
    expect(calledUrl).toContain('institution_id=inst-abc');
    expect(result).toEqual(profile);
  });
});

// ══════════════════════════════════════════════════════════════
// 13. Error propagation from services
// ══════════════════════════════════════════════════════════════

describe('Error propagation from service layer', () => {
  it('flashcardApi propagates apiCall errors to the caller', async () => {
    mockFetch.mockResolvedValueOnce(mockErrorResponse('Unauthorized', 401));

    // 401 interceptor (#338) converts to 'Session expired'
    await expect(getFlashcardsByTopic('topic-1')).rejects.toThrow('Session expired');
  });

  it('gamificationApi.getProfile returns null on error instead of throwing', async () => {
    // getProfile has a try/catch that returns null on failure
    mockFetch.mockResolvedValueOnce(mockErrorResponse('Server error', 500));

    const result = await getProfile('inst-x');
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// 14. Non-JSON response handling
// ══════════════════════════════════════════════════════════════

describe('apiCall — non-JSON response', () => {
  it('throws "Invalid response from server" for non-JSON bodies', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue('<html>Bad Gateway</html>'),
      headers: new Headers(),
    } as unknown as Response);

    await expect(apiCall('/html-response')).rejects.toThrow(
      'Invalid response from server (200)',
    );
  });
});
