// ============================================================
// Axon -- Tests for apiConfig.ts
//
// Bridge module that re-exports API_BASE_URL / ANON / getRealToken
// plus realRequest (GET dedup + unwrap { data }) and figmaRequest
// (no user JWT). Fetch is mocked via global.fetch.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Silence the logger side-effects.
vi.mock('@/app/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  API_BASE_URL,
  publicAnonKey,
  getAnonKey,
  getRealToken,
  ApiError,
  realRequest,
  figmaRequest,
} from '@/app/services/apiConfig';
import { setAccessToken, API_BASE, ANON_KEY } from '@/app/lib/api';

// ── Helpers ──────────────────────────────────────────────

function mockFetchOnce(body: unknown, init: Partial<Response> = {}) {
  const res = {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response;
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(res);
}

beforeEach(() => {
  // Stub global fetch
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
  setAccessToken(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════
// Re-exports
// ══════════════════════════════════════════════════════════════

describe('re-exports', () => {
  it('API_BASE_URL mirrors API_BASE from lib/api', () => {
    expect(API_BASE_URL).toBe(API_BASE);
  });

  it('publicAnonKey mirrors ANON_KEY', () => {
    expect(publicAnonKey).toBe(ANON_KEY);
  });

  it('getAnonKey() returns ANON_KEY', () => {
    expect(getAnonKey()).toBe(ANON_KEY);
  });

  it('getRealToken() returns null when no token set', () => {
    expect(getRealToken()).toBeNull();
  });

  it('getRealToken() returns the token after setAccessToken', () => {
    setAccessToken('abc.def.ghi');
    expect(getRealToken()).toBe('abc.def.ghi');
    setAccessToken(null);
  });
});

// ══════════════════════════════════════════════════════════════
// ApiError
// ══════════════════════════════════════════════════════════════

describe('ApiError', () => {
  it('is an Error subclass with code + status', () => {
    const e = new ApiError('oops', 'BOOM', 500);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.message).toBe('oops');
    expect(e.code).toBe('BOOM');
    expect(e.status).toBe(500);
    expect(e.name).toBe('ApiError');
  });
});

// ══════════════════════════════════════════════════════════════
// realRequest — URL + headers
// ══════════════════════════════════════════════════════════════

describe('realRequest — URL construction', () => {
  it('fetches from API_BASE + path', async () => {
    mockFetchOnce({ data: { ok: true } });
    await realRequest('/hello');
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(url).toBe(`${API_BASE}/hello`);
  });

  it('sends Authorization Bearer <ANON_KEY> always', async () => {
    mockFetchOnce({ data: {} });
    await realRequest('/x');
    const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${ANON_KEY}`);
  });

  it('sends Content-Type: application/json', async () => {
    mockFetchOnce({ data: {} });
    await realRequest('/x');
    const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('adds X-Access-Token only when a user token is set', async () => {
    mockFetchOnce({ data: {} });
    await realRequest('/x');
    let init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as RequestInit;
    let headers = init.headers as Record<string, string>;
    expect(headers['X-Access-Token']).toBeUndefined();

    setAccessToken('jwt-xyz');
    mockFetchOnce({ data: {} });
    await realRequest('/y');
    init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[1][1] as RequestInit;
    headers = init.headers as Record<string, string>;
    expect(headers['X-Access-Token']).toBe('jwt-xyz');
    setAccessToken(null);
  });

  it('forwards caller-provided headers (and caller wins over defaults for same key)', async () => {
    mockFetchOnce({ data: {} });
    await realRequest('/x', {
      headers: { 'X-Custom': 'v1', Authorization: 'override' },
    });
    const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Custom']).toBe('v1');
    expect(headers.Authorization).toBe('override');
  });
});

// ══════════════════════════════════════════════════════════════
// realRequest — response parsing
// ══════════════════════════════════════════════════════════════

describe('realRequest — response unwrapping', () => {
  // NOTE: error-path tests use POST to bypass the GET deduplication branch
  // (realRequest attaches a fire-and-forget `.finally` to the in-flight
  // promise, which surfaces as an unhandled-rejection under jsdom when the
  // underlying promise rejects).

  it('unwraps { data: T } to T', async () => {
    mockFetchOnce({ data: { id: 'abc' } });
    const result = await realRequest<{ id: string }>('/y');
    expect(result).toEqual({ id: 'abc' });
  });

  it('returns the body as-is when no "data" wrapper', async () => {
    mockFetchOnce({ id: 'raw' });
    const result = await realRequest<{ id: string }>('/y');
    expect(result).toEqual({ id: 'raw' });
  });

  it('throws ApiError on non-OK response with error message', async () => {
    mockFetchOnce({ error: 'nope' }, { ok: false, status: 400 });
    await expect(
      realRequest('/z', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'nope',
    });
  });

  it('throws ApiError on non-OK response without error message', async () => {
    mockFetchOnce({}, { ok: false, status: 500 });
    await expect(
      realRequest('/z', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
    });
  });

  it('throws ApiError when body contains top-level { error } on a 200', async () => {
    mockFetchOnce({ error: 'soft-fail' });
    await expect(
      realRequest('/z', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      message: 'soft-fail',
    });
  });

  it('throws PARSE_ERROR on non-JSON body', async () => {
    mockFetchOnce('<<not json>>' as unknown as object);
    await expect(
      realRequest('/z', { method: 'POST', body: '{}' }),
    ).rejects.toMatchObject({
      code: 'PARSE_ERROR',
    });
  });
});

// ══════════════════════════════════════════════════════════════
// realRequest — GET dedup (PERF-S2)
// ══════════════════════════════════════════════════════════════

describe('realRequest — GET deduplication', () => {
  it('reuses the in-flight promise for the same GET URL', async () => {
    let resolveFetch: (v: Response) => void = () => {};
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const p1 = realRequest('/dedup-path');
    const p2 = realRequest('/dedup-path');

    // Only one fetch fired even though two calls were issued
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { hit: true } }),
    } as Response);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({ hit: true });
    expect(r2).toEqual({ hit: true });
  });

  it('does NOT dedup POST requests', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetchOnce({ data: 1 });
    mockFetchOnce({ data: 2 });
    await realRequest('/same', { method: 'POST', body: '{}' });
    await realRequest('/same', { method: 'POST', body: '{}' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ══════════════════════════════════════════════════════════════
// figmaRequest
// ══════════════════════════════════════════════════════════════

describe('figmaRequest', () => {
  it('never sends X-Access-Token', async () => {
    setAccessToken('should-not-leak');
    mockFetchOnce({ data: {} });
    await figmaRequest('/ai/ping');
    const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Access-Token']).toBeUndefined();
    expect(headers.Authorization).toBe(`Bearer ${ANON_KEY}`);
    setAccessToken(null);
  });

  it('unwraps { data: T }', async () => {
    mockFetchOnce({ data: { summary: 'x' } });
    const result = await figmaRequest<{ summary: string }>('/ai/x');
    expect(result).toEqual({ summary: 'x' });
  });

  it('throws FIGMA_ERROR on non-OK response', async () => {
    mockFetchOnce({ error: 'denied' }, { ok: false, status: 403 });
    await expect(figmaRequest('/ai/x')).rejects.toMatchObject({
      code: 'FIGMA_ERROR',
      status: 403,
      message: 'denied',
    });
  });

  it('throws PARSE_ERROR on non-JSON', async () => {
    mockFetchOnce('boom' as unknown as object);
    await expect(figmaRequest('/ai/x')).rejects.toMatchObject({
      code: 'PARSE_ERROR',
    });
  });
});
