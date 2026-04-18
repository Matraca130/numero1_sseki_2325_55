// ============================================================
// Axon -- Tests for trashApi.ts
//
// getTrash(type?)       -> GET  /trash   (no query param when type='all')
// restoreItem(table, id)-> POST /restore/:table/:id
//
// Mocks: @/app/lib/api (apiCall)
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

import { getTrash, restoreItem } from '@/app/services/trashApi';

beforeEach(() => {
  mockApiCall.mockReset();
});

// ══════════════════════════════════════════════════════════════
// getTrash
// ══════════════════════════════════════════════════════════════

describe('getTrash — URL construction', () => {
  it('defaults to type="all" and omits the ?type= query param', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [] });
    await getTrash();
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/trash');
    expect(url).not.toContain('type=');
  });

  it('also omits the query param when explicitly called with "all"', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [] });
    await getTrash('all');
    expect(mockApiCall.mock.calls[0][0]).toBe('/trash');
  });

  it('adds ?type=summaries when filtering', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [] });
    await getTrash('summaries');
    expect(mockApiCall.mock.calls[0][0]).toBe('/trash?type=summaries');
  });

  it('supports type=keywords', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [] });
    await getTrash('keywords');
    expect(mockApiCall.mock.calls[0][0]).toBe('/trash?type=keywords');
  });

  it('supports type=flashcards', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [] });
    await getTrash('flashcards');
    expect(mockApiCall.mock.calls[0][0]).toBe('/trash?type=flashcards');
  });

  it('supports type=quiz-questions', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [] });
    await getTrash('quiz-questions');
    expect(mockApiCall.mock.calls[0][0]).toBe('/trash?type=quiz-questions');
  });

  it('supports type=videos', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [] });
    await getTrash('videos');
    expect(mockApiCall.mock.calls[0][0]).toBe('/trash?type=videos');
  });
});

describe('getTrash — response shape', () => {
  it('returns response.items when present', async () => {
    const items = [
      {
        id: 'a',
        type: 'summary',
        title: 't',
        deleted_at: '2026-04-18T00:00:00Z',
      },
    ];
    mockApiCall.mockResolvedValueOnce({ items });
    expect(await getTrash()).toEqual(items);
  });

  it('returns [] when response has no items key', async () => {
    mockApiCall.mockResolvedValueOnce({});
    expect(await getTrash()).toEqual([]);
  });

  it('returns [] when response.items is undefined', async () => {
    mockApiCall.mockResolvedValueOnce({ items: undefined });
    expect(await getTrash()).toEqual([]);
  });

  it('propagates errors from apiCall', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('net down'));
    await expect(getTrash()).rejects.toThrow('net down');
  });
});

// ══════════════════════════════════════════════════════════════
// restoreItem
// ══════════════════════════════════════════════════════════════

describe('restoreItem', () => {
  it('calls POST /restore/:table/:id', async () => {
    mockApiCall.mockResolvedValueOnce({ restored: true, item: {} });
    await restoreItem('summaries', 'abc-123');
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/restore/summaries/abc-123');
    expect(opts).toEqual({ method: 'POST' });
  });

  it('returns the API response unchanged', async () => {
    const response = {
      restored: true,
      item: { id: 'abc-123', title: 'Restored' },
    };
    mockApiCall.mockResolvedValueOnce(response);
    expect(await restoreItem('summaries', 'abc-123')).toEqual(response);
  });

  it('works for all documented table names', async () => {
    for (const table of [
      'summaries',
      'keywords',
      'flashcards',
      'quiz-questions',
      'videos',
    ]) {
      mockApiCall.mockResolvedValueOnce({ restored: true, item: {} });
      await restoreItem(table, 'id-1');
      expect(mockApiCall).toHaveBeenLastCalledWith(`/restore/${table}/id-1`, {
        method: 'POST',
      });
    }
  });

  it('propagates errors from apiCall', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('403 denied'));
    await expect(restoreItem('summaries', 'abc')).rejects.toThrow(
      '403 denied',
    );
  });
});
