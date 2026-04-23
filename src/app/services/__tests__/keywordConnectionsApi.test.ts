// ============================================================
// Axon -- Tests for keywordConnectionsApi.ts
//
// GET    /keyword-connections?keyword_id=xxx
// POST   /keyword-connections
// DELETE /keyword-connections/:id
// GET    /keyword-search?q=xxx&exclude_summary_id=yyy
//
// Mocks: @/app/lib/api (apiCall)
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

import {
  getConnections,
  createConnection,
  deleteConnection,
  searchKeywords,
} from '@/app/services/keywordConnectionsApi';
import type { CreateConnectionInput } from '@/app/types/keyword-connections';

beforeEach(() => {
  mockApiCall.mockReset();
});

// ══════════════════════════════════════════════════════════════
// getConnections
// ══════════════════════════════════════════════════════════════

describe('getConnections', () => {
  it('builds URL with keyword_id query param', async () => {
    mockApiCall.mockResolvedValueOnce([]);
    await getConnections('kw-1');
    expect(mockApiCall.mock.calls[0][0]).toBe(
      '/keyword-connections?keyword_id=kw-1',
    );
  });

  it('returns array as-is when apiCall resolves to T[]', async () => {
    const rows = [{ id: 'c1' }, { id: 'c2' }];
    mockApiCall.mockResolvedValueOnce(rows);
    expect(await getConnections('kw-1')).toEqual(rows);
  });

  it('extracts .items when apiCall resolves to { items }', async () => {
    const rows = [{ id: 'c1' }];
    mockApiCall.mockResolvedValueOnce({ items: rows });
    expect(await getConnections('kw-1')).toEqual(rows);
  });

  it('returns [] when response is null', async () => {
    mockApiCall.mockResolvedValueOnce(null);
    expect(await getConnections('kw-1')).toEqual([]);
  });

  it('returns [] when response is an object with no items key', async () => {
    mockApiCall.mockResolvedValueOnce({});
    expect(await getConnections('kw-1')).toEqual([]);
  });

  it('propagates errors from apiCall', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('oops'));
    await expect(getConnections('kw-1')).rejects.toThrow('oops');
  });
});

// ══════════════════════════════════════════════════════════════
// createConnection
// ══════════════════════════════════════════════════════════════

describe('createConnection', () => {
  const baseInput: CreateConnectionInput = {
    keyword_a_id: 'A',
    keyword_b_id: 'B',
    relationship: 'causa de',
    connection_type: 'related',
    source_keyword_id: null,
  };

  it('POSTs to /keyword-connections with JSON body', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'conn-1' });

    const result = await createConnection(baseInput);
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/keyword-connections');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(baseInput);
    expect(result).toEqual({ id: 'conn-1' });
  });

  it('does NOT enforce canonical order (caller is responsible)', async () => {
    // Caller passes keyword_b_id < keyword_a_id; we still forward verbatim.
    const input: CreateConnectionInput = {
      ...baseInput,
      keyword_a_id: 'Z',
      keyword_b_id: 'A',
    };
    mockApiCall.mockResolvedValueOnce({ id: 'x' });
    await createConnection(input);
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.keyword_a_id).toBe('Z');
    expect(body.keyword_b_id).toBe('A');
  });

  it('propagates errors', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('409 conflict'));
    await expect(createConnection(baseInput)).rejects.toThrow('409 conflict');
  });
});

// ══════════════════════════════════════════════════════════════
// deleteConnection
// ══════════════════════════════════════════════════════════════

describe('deleteConnection', () => {
  it('DELETEs /keyword-connections/:id', async () => {
    mockApiCall.mockResolvedValueOnce(undefined);
    await deleteConnection('conn-42');
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/keyword-connections/conn-42');
    expect(opts).toEqual({ method: 'DELETE' });
  });

  it('resolves to void even when apiCall returns a body', async () => {
    mockApiCall.mockResolvedValueOnce({ deleted: true });
    const result = await deleteConnection('conn-42');
    expect(result).toBeUndefined();
  });

  it('propagates errors', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('404'));
    await expect(deleteConnection('c')).rejects.toThrow('404');
  });
});

// ══════════════════════════════════════════════════════════════
// searchKeywords
// ══════════════════════════════════════════════════════════════

describe('searchKeywords', () => {
  it('builds /keyword-search?q=... URL', async () => {
    mockApiCall.mockResolvedValueOnce([]);
    await searchKeywords('pneumo');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('/keyword-search?');
    expect(url).toContain('q=pneumo');
  });

  it('trims whitespace in q', async () => {
    mockApiCall.mockResolvedValueOnce([]);
    await searchKeywords('  pneumo  ');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('q=pneumo');
    expect(url).not.toContain('%20%20');
  });

  it('appends exclude_summary_id when provided', async () => {
    mockApiCall.mockResolvedValueOnce([]);
    await searchKeywords('pneumo', 'sum-9');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('q=pneumo');
    expect(url).toContain('exclude_summary_id=sum-9');
  });

  it('does NOT include exclude_summary_id when undefined', async () => {
    mockApiCall.mockResolvedValueOnce([]);
    await searchKeywords('pneumo');
    expect(mockApiCall.mock.calls[0][0]).not.toContain('exclude_summary_id');
  });

  it('percent-encodes query values', async () => {
    mockApiCall.mockResolvedValueOnce([]);
    await searchKeywords('a b&c');
    const url: string = mockApiCall.mock.calls[0][0];
    // URLSearchParams uses '+' for spaces, and percent-encodes ampersands
    expect(url).toMatch(/q=a\+b%26c|q=a%20b%26c/);
  });

  it('returns array when apiCall resolves to T[]', async () => {
    const rows = [{ id: 'k1' }, { id: 'k2' }];
    mockApiCall.mockResolvedValueOnce(rows);
    expect(await searchKeywords('x')).toEqual(rows);
  });

  it('extracts .items when apiCall returns { items }', async () => {
    const rows = [{ id: 'k1' }];
    mockApiCall.mockResolvedValueOnce({ items: rows });
    expect(await searchKeywords('x')).toEqual(rows);
  });

  it('returns [] when response is null', async () => {
    mockApiCall.mockResolvedValueOnce(null);
    expect(await searchKeywords('x')).toEqual([]);
  });
});
