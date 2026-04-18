// ============================================================
// Axon -- Tests for searchApi.ts (search service)
//
// search(q, type) builds URL with q and optional type param,
// and returns response.results (or [] if missing).
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: any[]) => mockApiCall(...args),
}));

import { search } from '@/app/services/searchApi';

beforeEach(() => {
  mockApiCall.mockReset();
});

// ================================================================

describe('search — short-circuit on invalid input', () => {
  it('returns [] when q is empty string', async () => {
    const result = await search('');
    expect(result).toEqual([]);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('returns [] when q is a single character', async () => {
    const result = await search('a');
    expect(result).toEqual([]);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('returns [] when q is whitespace only', async () => {
    const result = await search('   ');
    expect(result).toEqual([]);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('returns [] when q is undefined (guarded)', async () => {
    // TypeScript forbids this, but JavaScript callers may pass it.
    const result = await search(undefined as unknown as string);
    expect(result).toEqual([]);
    expect(mockApiCall).not.toHaveBeenCalled();
  });
});

describe('search — URL construction', () => {
  beforeEach(() => {
    mockApiCall.mockResolvedValue({ results: [] });
  });

  it('builds URL with q param for default type (no type param emitted)', async () => {
    await search('hola');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('/search?');
    expect(url).toContain('q=hola');
    expect(url).not.toContain('type=');
  });

  it('trims leading and trailing whitespace in q', async () => {
    await search('  world  ');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('q=world');
    expect(url).not.toContain('q=+world');
    expect(url).not.toContain('q=++');
  });

  it('includes type param when not "all"', async () => {
    await search('chem', 'summaries');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('q=chem');
    expect(url).toContain('type=summaries');
  });

  it('includes type=keywords', async () => {
    await search('photo', 'keywords');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('type=keywords');
  });

  it('includes type=videos', async () => {
    await search('lecture', 'videos');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('type=videos');
  });

  it('URL-encodes special characters in q', async () => {
    await search('hello world!');
    const url: string = mockApiCall.mock.calls[0][0];
    // URLSearchParams encodes space as '+' and '!' stays as-is
    expect(url).toContain('q=hello+world');
  });
});

describe('search — response handling', () => {
  it('returns response.results when present', async () => {
    const fakeResults = [
      { type: 'summary', id: 's1', title: 'T1', snippet: 'sn', parent_path: 'a/b' },
      { type: 'keyword', id: 'k1', title: 'K1', snippet: 'ss', parent_path: 'a/c' },
    ];
    mockApiCall.mockResolvedValue({ results: fakeResults });

    const result = await search('anything');
    expect(result).toEqual(fakeResults);
  });

  it('returns [] when results field is missing', async () => {
    mockApiCall.mockResolvedValue({});
    const result = await search('anything');
    expect(result).toEqual([]);
  });

  it('returns [] when results is undefined', async () => {
    mockApiCall.mockResolvedValue({ results: undefined });
    const result = await search('anything');
    expect(result).toEqual([]);
  });

  it('returns [] when results is null', async () => {
    mockApiCall.mockResolvedValue({ results: null });
    const result = await search('anything');
    expect(result).toEqual([]);
  });

  it('propagates apiCall rejection', async () => {
    mockApiCall.mockRejectedValue(new Error('network'));
    await expect(search('anything')).rejects.toThrow('network');
  });
});
