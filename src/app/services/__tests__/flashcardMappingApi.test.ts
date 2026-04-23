/**
 * flashcardMappingApi.test.ts — Tests for flashcard mapping API service (T-01)
 *
 * Coverage: getFlashcardMappings (querystring building, pagination), getAllFlashcardMappings (auto-pagination, Map building)
 * Mocks: apiCall
 *
 * Run: npx vitest run src/app/services/__tests__/flashcardMappingApi.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/app/lib/api';
import {
  getFlashcardMappings,
  getAllFlashcardMappings,
  type FlashcardMapping,
  type FlashcardMappingResponse,
} from '../flashcardMappingApi';

const mockApiCall = vi.mocked(apiCall);

function makeMapping(id: string, overrides: Partial<FlashcardMapping> = {}): FlashcardMapping {
  return {
    id,
    subtopic_id: `sub-${id}`,
    keyword_id: `kw-${id}`,
    ...overrides,
  };
}

function makeResponse(data: FlashcardMapping[], opts: Partial<FlashcardMappingResponse> = {}): FlashcardMappingResponse {
  return {
    data,
    total: data.length,
    limit: 500,
    offset: 0,
    ...opts,
  };
}

describe('flashcardMappingApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getFlashcardMappings ──

  describe('getFlashcardMappings', () => {
    it('calls /flashcard-mappings without querystring when no opts', async () => {
      mockApiCall.mockResolvedValueOnce(makeResponse([]));
      await getFlashcardMappings();
      expect(mockApiCall).toHaveBeenCalledWith('/flashcard-mappings');
    });

    it('calls /flashcard-mappings without querystring when opts is empty object', async () => {
      mockApiCall.mockResolvedValueOnce(makeResponse([]));
      await getFlashcardMappings({});
      expect(mockApiCall).toHaveBeenCalledWith('/flashcard-mappings');
    });

    it('includes status param when provided', async () => {
      mockApiCall.mockResolvedValueOnce(makeResponse([]));
      await getFlashcardMappings({ status: 'published' });
      expect(mockApiCall).toHaveBeenCalledWith('/flashcard-mappings?status=published');
    });

    it('includes limit and offset params when provided', async () => {
      mockApiCall.mockResolvedValueOnce(makeResponse([]));
      await getFlashcardMappings({ limit: 100, offset: 50 });
      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('limit=100');
      expect(url).toContain('offset=50');
    });

    it('combines all params in querystring', async () => {
      mockApiCall.mockResolvedValueOnce(makeResponse([]));
      await getFlashcardMappings({ status: 'published', limit: 250, offset: 10 });
      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toMatch(/^\/flashcard-mappings\?/);
      expect(url).toContain('status=published');
      expect(url).toContain('limit=250');
      expect(url).toContain('offset=10');
    });

    it('does NOT include limit when limit=0 (falsy)', async () => {
      // Source uses `if (opts?.limit)` — 0 is falsy and excluded. Documents current contract.
      mockApiCall.mockResolvedValueOnce(makeResponse([]));
      await getFlashcardMappings({ limit: 0, offset: 5 });
      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).not.toContain('limit=');
      expect(url).toContain('offset=5');
    });

    it('returns the response unchanged from apiCall', async () => {
      const resp = makeResponse([makeMapping('fc-1')], { total: 1 });
      mockApiCall.mockResolvedValueOnce(resp);
      const result = await getFlashcardMappings();
      expect(result).toEqual(resp);
    });

    it('propagates API errors', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Network error'));
      await expect(getFlashcardMappings()).rejects.toThrow('Network error');
    });
  });

  // ── getAllFlashcardMappings (auto-pagination) ──

  describe('getAllFlashcardMappings', () => {
    it('returns empty Map when backend returns no items', async () => {
      mockApiCall.mockResolvedValueOnce(makeResponse([]));
      const result = await getAllFlashcardMappings();
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('returns Map keyed by flashcard id (single page)', async () => {
      mockApiCall.mockResolvedValueOnce(
        makeResponse([makeMapping('a'), makeMapping('b', { subtopic_id: null })])
      );
      const result = await getAllFlashcardMappings();
      expect(result.size).toBe(2);
      expect(result.get('a')).toEqual({ subtopic_id: 'sub-a', keyword_id: 'kw-a' });
      expect(result.get('b')).toEqual({ subtopic_id: null, keyword_id: 'kw-b' });
    });

    it('uses limit=1000 per page (matches source)', async () => {
      mockApiCall.mockResolvedValueOnce(makeResponse([]));
      await getAllFlashcardMappings();
      const url = mockApiCall.mock.calls[0][0] as string;
      expect(url).toContain('limit=1000');
      // offset=0 is falsy and intentionally omitted by the URLSearchParams builder
      expect(url).not.toContain('offset=0');
    });

    it('paginates across multiple pages until partial page indicates end', async () => {
      // 1000 items page → go again; 500 items → stop (< limit)
      const page1 = Array.from({ length: 1000 }, (_, i) => makeMapping(`p1-${i}`));
      const page2 = Array.from({ length: 500 }, (_, i) => makeMapping(`p2-${i}`));
      mockApiCall
        .mockResolvedValueOnce(makeResponse(page1, { limit: 1000, offset: 0 }))
        .mockResolvedValueOnce(makeResponse(page2, { limit: 1000, offset: 1000 }));

      const result = await getAllFlashcardMappings();

      expect(mockApiCall).toHaveBeenCalledTimes(2);
      expect(result.size).toBe(1500);
      // Second call should request next offset
      const secondUrl = mockApiCall.mock.calls[1][0] as string;
      expect(secondUrl).toContain('offset=1000');
      expect(result.get('p1-0')).toEqual({ subtopic_id: 'sub-p1-0', keyword_id: 'kw-p1-0' });
      expect(result.get('p2-499')).toEqual({ subtopic_id: 'sub-p2-499', keyword_id: 'kw-p2-499' });
    });

    it('stops after first page if exactly < limit items returned', async () => {
      mockApiCall.mockResolvedValueOnce(
        makeResponse([makeMapping('only-1'), makeMapping('only-2')], { limit: 1000, offset: 0 })
      );
      const result = await getAllFlashcardMappings();
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(result.size).toBe(2);
    });

    it('handles missing data array gracefully (treats as empty)', async () => {
      // Defensive: source uses `response.data || []`
      mockApiCall.mockResolvedValueOnce({ total: 0, limit: 1000, offset: 0 } as unknown as FlashcardMappingResponse);
      const result = await getAllFlashcardMappings();
      expect(result.size).toBe(0);
      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    it('later duplicate id overwrites earlier entry in Map', async () => {
      const dup = [
        makeMapping('dup', { keyword_id: 'kw-first' }),
        makeMapping('other'),
        makeMapping('dup', { keyword_id: 'kw-second' }),
      ];
      mockApiCall.mockResolvedValueOnce(makeResponse(dup));
      const result = await getAllFlashcardMappings();
      expect(result.size).toBe(2);
      expect(result.get('dup')).toEqual({ subtopic_id: 'sub-dup', keyword_id: 'kw-second' });
    });

    it('propagates error from mid-pagination', async () => {
      const page1 = Array.from({ length: 1000 }, (_, i) => makeMapping(`p1-${i}`));
      mockApiCall
        .mockResolvedValueOnce(makeResponse(page1, { limit: 1000, offset: 0 }))
        .mockRejectedValueOnce(new Error('500 Internal'));
      await expect(getAllFlashcardMappings()).rejects.toThrow('500 Internal');
    });
  });
});
