/**
 * useSmartGeneration.test.ts — Tests for the smart AI generation hook (v4.5)
 *
 * Coverage: idle state, generate() happy paths (single + bulk + chunked
 *           counts > 10), error path, abort, reset, progress updates,
 *           stats aggregation (uniqueKeywords/uniqueSubtopics/avgPKnow).
 *
 * NOTE (MASTERY-SYSTEMS.md): `avgPKnow` here comes from `_smart.p_know`
 * returned by the backend's BKT targeting. This is Sistema A (rating
 * INPUT / target score) — NOT the card's absolute mastery (Sistema B)
 * nor a keyword-delta (Sistema C). No thresholds are compared against
 * p_know in this file; it is merely averaged for display.
 *
 * Mocks: @/app/services/aiService (generateSmart)
 *
 * Run: npx vitest run src/app/hooks/__tests__/useSmartGeneration.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────

const mockGenerateSmart = vi.fn();

vi.mock('@/app/services/aiService', () => ({
  generateSmart: (...args: unknown[]) => mockGenerateSmart(...args),
}));

// ── SUT ───────────────────────────────────────────────────

import { useSmartGeneration } from '@/app/hooks/useSmartGeneration';

// ── Helpers ───────────────────────────────────────────────

function makeSmart(p_know = 0.4, target_subtopic: string | null = 'sub-A') {
  return {
    target_keyword: 'kw-name-A',
    target_summary: 'sum-A',
    target_subtopic,
    p_know,
    need_score: 0.8,
    primary_reason: 'low_mastery' as const,
  };
}

function makeSingleResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-single',
    front: 'Q',
    back: 'A',
    summary_id: 'sum-1',
    keyword_id: 'kw-1',
    subtopic_id: 'sub-1',
    _smart: makeSmart(0.5, 'sub-1'),
    ...overrides,
  };
}

function makeBulkResponse(count: number, overrides: Partial<Record<'uniformSubtopic', string | null>> = {}) {
  const items = Array.from({ length: count }, (_, i) => ({
    type: 'flashcard',
    id: `b-${i}`,
    keyword_id: `kw-${i}`,
    keyword_name: `name-${i}`,
    summary_id: `sum-${i}`,
    _smart: makeSmart(0.3 + i * 0.05, overrides.uniformSubtopic ?? `sub-${i}`),
  }));
  return {
    items,
    errors: [],
    _meta: {
      model: 'gemini',
      action: 'flashcard',
      total_attempted: count,
      total_generated: count,
      total_failed: 0,
      total_targets_available: count,
      tokens: { input: 0, output: 0 },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────

describe('useSmartGeneration', () => {
  beforeEach(() => {
    // Use mockReset() — clearAllMocks does NOT drain mockResolvedValueOnce queues,
    // causing leftover queued values to leak into subsequent tests.
    mockGenerateSmart.mockReset();
  });

  it('starts in idle phase with null result/progress/error', () => {
    const { result } = renderHook(() => useSmartGeneration());
    expect(result.current.phase).toBe('idle');
    expect(result.current.progress).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns early (no state change, no API call) when count <= 0', async () => {
    const { result } = renderHook(() => useSmartGeneration());
    await act(async () => {
      await result.current.generate({ action: 'flashcard', count: 0 });
    });
    expect(mockGenerateSmart).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('handles single-item generation (count=1) returning item directly', async () => {
    mockGenerateSmart.mockResolvedValueOnce(makeSingleResponse());
    const { result } = renderHook(() => useSmartGeneration());
    await act(async () => {
      await result.current.generate({ action: 'flashcard', count: 1 });
    });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(mockGenerateSmart).toHaveBeenCalledTimes(1);
    expect(result.current.result?.items).toHaveLength(1);
    expect(result.current.result?.stats.requested).toBe(1);
    expect(result.current.result?.stats.generated).toBe(1);
    expect(result.current.result?.stats.failed).toBe(0);
    // single path does not pass count in args
    const args = mockGenerateSmart.mock.calls[0][0];
    expect(args.count).toBeUndefined();
  });

  it('handles bulk chunk (1 < count <= 10) with items[] response', async () => {
    mockGenerateSmart.mockResolvedValueOnce(makeBulkResponse(5));
    const { result } = renderHook(() => useSmartGeneration());
    await act(async () => {
      await result.current.generate({ action: 'flashcard', count: 5, summaryId: 'sum-X' });
    });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(mockGenerateSmart).toHaveBeenCalledTimes(1);
    const args = mockGenerateSmart.mock.calls[0][0];
    expect(args.count).toBe(5);
    expect(args.summaryId).toBe('sum-X');
    expect(result.current.result?.items).toHaveLength(5);
    expect(result.current.result?.stats.generated).toBe(5);
  });

  it('chunks large counts into groups of 10 (count=25 → 10+10+5)', async () => {
    mockGenerateSmart
      .mockResolvedValueOnce(makeBulkResponse(10))
      .mockResolvedValueOnce(makeBulkResponse(10))
      .mockResolvedValueOnce(makeBulkResponse(5));
    const { result } = renderHook(() => useSmartGeneration());
    await act(async () => {
      await result.current.generate({ action: 'flashcard', count: 25 });
    });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(mockGenerateSmart).toHaveBeenCalledTimes(3);
    const callCounts = mockGenerateSmart.mock.calls.map((c: any[]) => c[0].count);
    expect(callCounts).toEqual([10, 10, 5]);
    expect(result.current.result?.stats.generated).toBe(25);
    expect(result.current.result?.stats.requested).toBe(25);
  });

  it('accumulates errors from bulk response', async () => {
    const bulk = makeBulkResponse(2);
    bulk.errors = [
      { keyword_id: 'kw-err', keyword_name: 'bad kw', error: 'AI timeout' },
    ] as any;
    mockGenerateSmart.mockResolvedValueOnce(bulk);
    const { result } = renderHook(() => useSmartGeneration());
    await act(async () => {
      await result.current.generate({ action: 'flashcard', count: 2 });
    });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(result.current.result?.errors).toHaveLength(1);
    expect(result.current.result?.stats.failed).toBe(1);
  });

  it('catches thrown errors per-chunk and adds synthetic error entry', async () => {
    // count=2 triggers the bulk branch which throws
    mockGenerateSmart.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useSmartGeneration());
    await act(async () => {
      await result.current.generate({ action: 'flashcard', count: 2 });
    });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(result.current.result?.errors).toHaveLength(1);
    expect(result.current.result?.errors[0].keyword_id).toBe('unknown');
    expect(result.current.result?.errors[0].error).toBe('network down');
    expect(result.current.result?.stats.generated).toBe(0);
    expect(result.current.result?.stats.failed).toBe(1);
  });

  it('falls back to "Error desconocido" when thrown error lacks message', async () => {
    mockGenerateSmart.mockRejectedValueOnce({});
    const { result } = renderHook(() => useSmartGeneration());
    await act(async () => {
      await result.current.generate({ action: 'flashcard', count: 2 });
    });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(result.current.result?.errors[0].error).toBe('Error desconocido');
  });

  it('computes uniqueKeywords and uniqueSubtopics correctly', async () => {
    // 3 items with 2 distinct keywords and 2 distinct subtopics via _smart.target_subtopic
    mockGenerateSmart.mockResolvedValueOnce({
      items: [
        { type: 'flashcard', id: '1', keyword_id: 'kwA', keyword_name: 'A', summary_id: 's', _smart: makeSmart(0.1, 'subA') },
        { type: 'flashcard', id: '2', keyword_id: 'kwA', keyword_name: 'A', summary_id: 's', _smart: makeSmart(0.2, 'subA') },
        { type: 'flashcard', id: '3', keyword_id: 'kwB', keyword_name: 'B', summary_id: 's', _smart: makeSmart(0.3, 'subB') },
      ],
      errors: [],
      _meta: {},
    });
    const { result } = renderHook(() => useSmartGeneration());
    await act(async () => {
      await result.current.generate({ action: 'flashcard', count: 3 });
    });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(result.current.result?.stats.uniqueKeywords).toBe(2);
    expect(result.current.result?.stats.uniqueSubtopics).toBe(2);
  });

  it('averages p_know across returned items (ignores falsy subtopic for uniqueSubtopics)', async () => {
    mockGenerateSmart.mockResolvedValueOnce({
      items: [
        { type: 'flashcard', id: '1', keyword_id: 'kwA', keyword_name: 'A', summary_id: 's', _smart: makeSmart(0.2, null) },
        { type: 'flashcard', id: '2', keyword_id: 'kwB', keyword_name: 'B', summary_id: 's', _smart: makeSmart(0.8, null) },
      ],
      errors: [],
      _meta: {},
    });
    const { result } = renderHook(() => useSmartGeneration());
    await act(async () => {
      await result.current.generate({ action: 'flashcard', count: 2 });
    });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(result.current.result?.stats.avgPKnow).toBeCloseTo(0.5, 5);
    // null subtopic values are filtered out
    expect(result.current.result?.stats.uniqueSubtopics).toBe(0);
  });

  it('reports progress with latestItem after a chunk completes', async () => {
    mockGenerateSmart.mockResolvedValueOnce(makeBulkResponse(3));
    const { result } = renderHook(() => useSmartGeneration());
    await act(async () => {
      await result.current.generate({ action: 'flashcard', count: 3 });
    });
    // progress should reflect final state
    expect(result.current.progress?.generated).toBe(3);
    expect(result.current.progress?.total).toBe(3);
    expect(result.current.progress?.latestItem?.id).toBe('b-2');
  });

  it('abort() stops processing subsequent chunks', async () => {
    // 15 items → 10 + 5 chunks. Abort after first chunk.
    mockGenerateSmart
      .mockImplementationOnce(async () => makeBulkResponse(10))
      .mockImplementationOnce(async () => {
        throw new Error('should not be called if aborted');
      });
    const { result } = renderHook(() => useSmartGeneration());

    // Start generating then immediately abort synchronously during the await
    const promise = act(async () => {
      const p = result.current.generate({ action: 'flashcard', count: 15 });
      // abort before second chunk runs
      result.current.abort();
      await p;
    });
    await promise;

    // Only first chunk should have been invoked before abort kicked in
    expect(mockGenerateSmart).toHaveBeenCalledTimes(1);
  });

  it('reset() clears all state back to idle', async () => {
    mockGenerateSmart.mockResolvedValueOnce(makeSingleResponse());
    const { result } = renderHook(() => useSmartGeneration());
    await act(async () => {
      await result.current.generate({ action: 'flashcard', count: 1 });
    });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    act(() => {
      result.current.reset();
    });
    expect(result.current.phase).toBe('idle');
    expect(result.current.progress).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('skips a single-item response that is missing id (no push)', async () => {
    mockGenerateSmart.mockResolvedValueOnce({}); // no id
    const { result } = renderHook(() => useSmartGeneration());
    await act(async () => {
      await result.current.generate({ action: 'flashcard', count: 1 });
    });
    await waitFor(() => expect(result.current.phase).toBe('done'));
    expect(result.current.result?.items).toHaveLength(0);
    expect(result.current.result?.stats.generated).toBe(0);
  });
});
