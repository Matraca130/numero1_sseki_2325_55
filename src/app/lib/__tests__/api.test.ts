// ============================================================
// TEST: apiCall() — Axon API wrapper
//
// Verifies:
//   - Header construction (Authorization, X-Access-Token)
//   - URL construction
//   - Response unwrapping ({ data: X } → X)
//   - Error handling (non-ok, non-JSON)
//   - Timeout via AbortController
//   - GET deduplication
//   - POST non-deduplication
//   - Token management (setAccessToken, getAccessToken)
//   - ensureGeneralKeyword helper
//
// APPROACH: Mock global.fetch with vi.fn(). Mock @/app/lib/supabase
// to provide constants without importing the real Supabase client.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock supabase module for constants ──────────────────────
vi.mock('@/app/lib/supabase', () => ({
  SUPABASE_URL: 'https://mock.supabase.co',
  SUPABASE_ANON_KEY: 'mock-anon-key',
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

import {
  apiCall,
  setAccessToken,
  getAccessToken,
  ensureGeneralKeyword,
  API_BASE,
  ANON_KEY,
} from '@/app/lib/api';

// ── Helpers ─────────────────────────────────────────────────

function mockFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  } as unknown as Response;
}

// ── Setup ───────────────────────────────────────────────────

const fetchSpy = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  fetchSpy.mockReset();
  global.fetch = fetchSpy;
  // Reset token state between tests
  setAccessToken(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════
// SUITE 1: Header construction
// ══════════════════════════════════════════════════════════════

describe('apiCall — headers', () => {
  it('always includes Authorization: Bearer <ANON_KEY>', async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse({ data: 'ok' }));

    await apiCall('/test');

    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${ANON_KEY}`);
    expect(headers['Authorization']).toBe('Bearer mock-anon-key');
  });

  it('includes X-Access-Token when token is set', async () => {
    setAccessToken('my-jwt');
    fetchSpy.mockResolvedValue(mockFetchResponse({ data: 'ok' }));

    await apiCall('/test');

    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['X-Access-Token']).toBe('my-jwt');
  });

  it('does NOT include X-Access-Token when token is null', async () => {
    setAccessToken(null);
    fetchSpy.mockResolvedValue(mockFetchResponse({ data: 'ok' }));

    await apiCall('/test');

    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['X-Access-Token']).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: URL construction
// ══════════════════════════════════════════════════════════════

describe('apiCall — URL construction', () => {
  it('builds URL as API_BASE + path', async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse({ data: [] }));

    await apiCall('/keywords?summary_id=abc');

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe(`${API_BASE}/keywords?summary_id=abc`);
    expect(url).toBe('https://mock.supabase.co/functions/v1/server/keywords?summary_id=abc');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: Response handling
// ══════════════════════════════════════════════════════════════

describe('apiCall — response handling', () => {
  it('unwraps { data: X } envelope to X', async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse({ data: { id: '123', name: 'test' } }));

    const result = await apiCall('/items');

    expect(result).toEqual({ id: '123', name: 'test' });
  });

  it('throws Error when response is not ok with { error } body', async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse({ error: 'Not found' }, 404));

    await expect(apiCall('/missing')).rejects.toThrow('Not found');
  });

  it('throws Error for non-JSON response', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue('<html>Not JSON</html>'),
      headers: new Headers(),
    } as unknown as Response);

    await expect(apiCall('/bad-endpoint')).rejects.toThrow('Invalid response from server');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: Timeout
// ══════════════════════════════════════════════════════════════

describe('apiCall — timeout', () => {
  it('aborts request after timeoutMs', async () => {
    // Simulate a fetch that never resolves until aborted
    fetchSpy.mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            const abortError = new Error('The operation was aborted.');
            abortError.name = 'AbortError';
            reject(abortError);
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
// SUITE 5: GET deduplication
// ══════════════════════════════════════════════════════════════

describe('apiCall — GET deduplication', () => {
  it('deduplicates 2 simultaneous GETs to the same path into 1 fetch', async () => {
    let resolveCall: ((v: Response) => void) | undefined;
    fetchSpy.mockImplementation(
      () => new Promise<Response>((resolve) => { resolveCall = resolve; }),
    );

    const p1 = apiCall('/dedup-path');
    const p2 = apiCall('/dedup-path');

    // Only one fetch should have been made
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Resolve the single fetch
    resolveCall!(mockFetchResponse({ data: 'deduped' }));

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('deduped');
    expect(r2).toBe('deduped');
  });

  it('does NOT deduplicate POST requests', async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse({ data: 'ok' }));

    await Promise.all([
      apiCall('/post-path', { method: 'POST', body: '{}' }),
      apiCall('/post-path', { method: 'POST', body: '{}' }),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 6: Token management
// ══════════════════════════════════════════════════════════════

describe('setAccessToken / getAccessToken', () => {
  it('setAccessToken stores token and syncs to localStorage', () => {
    setAccessToken('jwt-abc');

    expect(getAccessToken()).toBe('jwt-abc');
    expect(localStorage.getItem('axon_access_token')).toBe('jwt-abc');
  });

  it('setAccessToken(null) removes token from localStorage', () => {
    setAccessToken('jwt-abc');
    setAccessToken(null);

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('axon_access_token')).toBeNull();
  });

  it('getAccessToken returns the current token', () => {
    setAccessToken('current-token');
    expect(getAccessToken()).toBe('current-token');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 7: ensureGeneralKeyword
// ══════════════════════════════════════════════════════════════

describe('ensureGeneralKeyword', () => {
  it('returns existing keyword ID when "General" keyword exists', async () => {
    // First call: GET /keywords?summary_id=... returns a list with General
    // Second call should NOT happen
    fetchSpy.mockResolvedValueOnce(
      mockFetchResponse({
        data: [
          { id: 'kw-1', name: 'Specific', summary_id: 'sum-1' },
          { id: 'kw-2', name: 'General', summary_id: 'sum-1' },
        ],
      }),
    );

    const id = await ensureGeneralKeyword('sum-1');

    expect(id).toBe('kw-2');
    // Only the GET was made, no POST
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('creates a new keyword when "General" does not exist', async () => {
    // First call: GET returns keywords without General
    fetchSpy.mockResolvedValueOnce(
      mockFetchResponse({
        data: [{ id: 'kw-1', name: 'Specific', summary_id: 'sum-1' }],
      }),
    );
    // Second call: POST creates General
    fetchSpy.mockResolvedValueOnce(
      mockFetchResponse({
        data: { id: 'kw-new', name: 'General', summary_id: 'sum-1' },
      }),
    );

    const id = await ensureGeneralKeyword('sum-1');

    expect(id).toBe('kw-new');
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Verify the POST call
    const postCall = fetchSpy.mock.calls[1];
    const postUrl = postCall[0] as string;
    const postInit = postCall[1] as RequestInit;
    expect(postUrl).toContain('/keywords');
    expect(postInit.method).toBe('POST');
    expect(JSON.parse(postInit.body as string)).toEqual({
      summary_id: 'sum-1',
      name: 'General',
    });
  });
});
