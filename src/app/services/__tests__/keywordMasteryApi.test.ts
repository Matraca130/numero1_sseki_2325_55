// ============================================================
// Keyword Mastery API — Contract & Logic Tests
//
// PURPOSE: Verify URL construction, payload contracts, and
// pure aggregation logic for the keyword mastery service.
//
// APPROACH:
//   - Mock apiCall() to inspect URLs and payloads
//   - Mock parallelWithLimit() to run tasks sequentially
//     (so apiCall mock captures all calls deterministically)
//   - Test pure functions (computeLocalKeywordMastery,
//     computeTopicMasterySummary) with constructed data
//
// RUN: npx vitest run src/app/services/__tests__/keywordMasteryApi.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock apiCall BEFORE importing API modules ────────────
const mockApiCall = vi.fn().mockResolvedValue([]);

vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: any[]) => mockApiCall(...args),
}));

// ── Mock parallelWithLimit to run tasks sequentially ─────
// This lets us control execution order and inspect apiCall calls
vi.mock('@/app/lib/concurrency', () => ({
  parallelWithLimit: async <T>(
    tasks: (() => Promise<T>)[],
    _limit: number
  ): Promise<PromiseSettledResult<T>[]> => {
    const results: PromiseSettledResult<T>[] = [];
    for (const task of tasks) {
      try {
        const value = await task();
        results.push({ status: 'fulfilled' as const, value });
      } catch (reason: unknown) {
        results.push({ status: 'rejected' as const, reason });
      }
    }
    return results;
  },
}));

import {
  MASTERY_THRESHOLD,
  fetchKeywordMasteryByTopic,
  fetchKeywordMasteryBySummary,
  computeLocalKeywordMastery,
  computeTopicMasterySummary,
  type KeywordMasteryMap,
  type KeywordMasteryInfo,
  type SubtopicMasteryInfo,
} from '@/app/services/keywordMasteryApi';

beforeEach(() => {
  mockApiCall.mockClear();
});

// ── Helpers ──────────────────────────────────────────────

function makeKeywordMasteryInfo(
  overrides: Partial<KeywordMasteryInfo> & { keyword_id: string }
): KeywordMasteryInfo {
  return {
    name: 'Test Keyword',
    definition: 'A test keyword',
    summary_id: 'sum-1',
    priority: 1,
    mastery: 0,
    subtopics: [],
    isMastered: false,
    subtopicsMastered: 0,
    subtopicsTotal: 0,
    ...overrides,
  };
}

function makeSubtopicInfo(
  overrides: Partial<SubtopicMasteryInfo> & { id: string }
): SubtopicMasteryInfo {
  return {
    name: 'Test Subtopic',
    keyword_id: 'kw-1',
    order_index: 0,
    p_know: 0,
    total_attempts: 0,
    correct_attempts: 0,
    hasData: false,
    isMastered: false,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// SUITE 1: MASTERY_THRESHOLD constant
// ══════════════════════════════════════════════════════════════

describe('MASTERY_THRESHOLD', () => {
  it('is 0.75', () => {
    expect(MASTERY_THRESHOLD).toBe(0.75);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: fetchKeywordMasteryByTopic — URL construction & flow
// ══════════════════════════════════════════════════════════════

describe('fetchKeywordMasteryByTopic', () => {
  it('calls /topic-progress with topic_id query param', async () => {
    mockApiCall.mockResolvedValueOnce({ summaries: [] });
    await fetchKeywordMasteryByTopic('topic-001');

    expect(mockApiCall.mock.calls[0][0]).toBe('/topic-progress?topic_id=topic-001');
  });

  it('returns empty map when topic has no summaries', async () => {
    mockApiCall.mockResolvedValueOnce({ summaries: [] });
    const result = await fetchKeywordMasteryByTopic('topic-empty');

    expect(result.size).toBe(0);
    // Only 1 call — topic-progress, nothing else
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('returns empty map when summaries field is missing', async () => {
    mockApiCall.mockResolvedValueOnce({});
    const result = await fetchKeywordMasteryByTopic('topic-no-field');

    expect(result.size).toBe(0);
  });

  it('fetches keywords for each summary via /keywords?summary_id=', async () => {
    mockApiCall
      // Step 1: topic-progress
      .mockResolvedValueOnce({
        summaries: [{ id: 'sum-A' }, { id: 'sum-B' }],
      })
      // Step 2: keywords for sum-A
      .mockResolvedValueOnce([
        { id: 'kw-1', name: 'Keyword 1', summary_id: 'sum-A' },
      ])
      // Step 2: keywords for sum-B
      .mockResolvedValueOnce([
        { id: 'kw-2', name: 'Keyword 2', summary_id: 'sum-B' },
      ])
      // Step 3: subtopics-batch
      .mockResolvedValueOnce([])
      // Step 4: bkt-states
      .mockResolvedValueOnce([]);

    await fetchKeywordMasteryByTopic('topic-002');

    // Verify keyword fetches use correct URLs
    expect(mockApiCall.mock.calls[1][0]).toBe('/keywords?summary_id=sum-A');
    expect(mockApiCall.mock.calls[2][0]).toBe('/keywords?summary_id=sum-B');
  });

  it('returns empty map when all keywords are inactive or deleted', async () => {
    mockApiCall
      .mockResolvedValueOnce({ summaries: [{ id: 'sum-1' }] })
      // Keywords: one deleted, one inactive
      .mockResolvedValueOnce([
        { id: 'kw-1', name: 'Deleted', summary_id: 'sum-1', deleted_at: '2025-01-01' },
        { id: 'kw-2', name: 'Inactive', summary_id: 'sum-1', is_active: false },
      ]);

    const result = await fetchKeywordMasteryByTopic('topic-003');
    expect(result.size).toBe(0);
  });

  it('calls /subtopics-batch with keyword_ids joined by comma', async () => {
    mockApiCall
      .mockResolvedValueOnce({ summaries: [{ id: 'sum-1' }] })
      .mockResolvedValueOnce([
        { id: 'kw-1', name: 'KW1', summary_id: 'sum-1' },
        { id: 'kw-2', name: 'KW2', summary_id: 'sum-1' },
      ])
      // subtopics-batch
      .mockResolvedValueOnce([
        { id: 'st-1', keyword_id: 'kw-1', name: 'Sub 1' },
      ])
      // bkt-states
      .mockResolvedValueOnce([]);

    await fetchKeywordMasteryByTopic('topic-004');

    const subtopicCall = mockApiCall.mock.calls[2][0] as string;
    expect(subtopicCall).toContain('/subtopics-batch?keyword_ids=');
    expect(subtopicCall).toContain('kw-1');
    expect(subtopicCall).toContain('kw-2');
  });

  it('calls /bkt-states with subtopic_ids and limit param', async () => {
    mockApiCall
      .mockResolvedValueOnce({ summaries: [{ id: 'sum-1' }] })
      .mockResolvedValueOnce([
        { id: 'kw-1', name: 'KW1', summary_id: 'sum-1' },
      ])
      .mockResolvedValueOnce([
        { id: 'st-1', keyword_id: 'kw-1', name: 'Sub 1' },
        { id: 'st-2', keyword_id: 'kw-1', name: 'Sub 2' },
      ])
      .mockResolvedValueOnce([
        { subtopic_id: 'st-1', p_know: 0.8, total_attempts: 5, correct_attempts: 4 },
      ]);

    await fetchKeywordMasteryByTopic('topic-005');

    const bktCall = mockApiCall.mock.calls[3][0] as string;
    expect(bktCall).toContain('/bkt-states?subtopic_ids=');
    expect(bktCall).toContain('st-1');
    expect(bktCall).toContain('st-2');
    expect(bktCall).toContain('limit=2');
  });

  it('builds correct KeywordMasteryMap with aggregated mastery', async () => {
    mockApiCall
      .mockResolvedValueOnce({ summaries: [{ id: 'sum-1' }] })
      .mockResolvedValueOnce([
        { id: 'kw-1', name: 'Hemoglobin', definition: 'Oxygen carrier', summary_id: 'sum-1', priority: 3 },
      ])
      .mockResolvedValueOnce([
        { id: 'st-1', keyword_id: 'kw-1', name: 'Structure', order_index: 0 },
        { id: 'st-2', keyword_id: 'kw-1', name: 'Function', order_index: 1 },
      ])
      .mockResolvedValueOnce([
        { subtopic_id: 'st-1', p_know: 0.9, total_attempts: 10, correct_attempts: 9 },
        { subtopic_id: 'st-2', p_know: 0.5, total_attempts: 6, correct_attempts: 3 },
      ]);

    const result = await fetchKeywordMasteryByTopic('topic-006');

    expect(result.size).toBe(1);
    const kw = result.get('kw-1')!;
    expect(kw.keyword_id).toBe('kw-1');
    expect(kw.name).toBe('Hemoglobin');
    expect(kw.definition).toBe('Oxygen carrier');
    expect(kw.summary_id).toBe('sum-1');
    expect(kw.priority).toBe(3);
    // mastery = avg(0.9, 0.5) = 0.7
    expect(kw.mastery).toBeCloseTo(0.7, 5);
    expect(kw.isMastered).toBe(false); // 0.7 < 0.75
    expect(kw.subtopicsTotal).toBe(2);
    expect(kw.subtopicsMastered).toBe(1); // only st-1 (0.9 >= 0.75)
    expect(kw.subtopics).toHaveLength(2);
    // Verify subtopic order
    expect(kw.subtopics[0].name).toBe('Structure');
    expect(kw.subtopics[1].name).toBe('Function');
  });

  it('deduplicates keywords by ID across summaries', async () => {
    mockApiCall
      .mockResolvedValueOnce({ summaries: [{ id: 'sum-1' }, { id: 'sum-2' }] })
      // Both summaries return the same keyword
      .mockResolvedValueOnce([
        { id: 'kw-dup', name: 'Duplicate', summary_id: 'sum-1' },
      ])
      .mockResolvedValueOnce([
        { id: 'kw-dup', name: 'Duplicate', summary_id: 'sum-2' },
      ])
      .mockResolvedValueOnce([]) // subtopics
      .mockResolvedValueOnce([]); // bkt-states

    const result = await fetchKeywordMasteryByTopic('topic-dup');
    expect(result.size).toBe(1);
  });

  it('handles keywords with no subtopics (mastery = 0)', async () => {
    mockApiCall
      .mockResolvedValueOnce({ summaries: [{ id: 'sum-1' }] })
      .mockResolvedValueOnce([
        { id: 'kw-1', name: 'Orphan KW', summary_id: 'sum-1' },
      ])
      .mockResolvedValueOnce([]) // no subtopics
      .mockResolvedValueOnce([]); // no bkt-states

    const result = await fetchKeywordMasteryByTopic('topic-orphan');
    const kw = result.get('kw-1')!;
    expect(kw.mastery).toBe(0);
    expect(kw.isMastered).toBe(false);
    expect(kw.subtopicsTotal).toBe(0);
    expect(kw.subtopicsMastered).toBe(0);
    expect(kw.subtopics).toHaveLength(0);
  });

  it('handles subtopics with no BKT data (p_know defaults to 0)', async () => {
    mockApiCall
      .mockResolvedValueOnce({ summaries: [{ id: 'sum-1' }] })
      .mockResolvedValueOnce([
        { id: 'kw-1', name: 'New KW', summary_id: 'sum-1' },
      ])
      .mockResolvedValueOnce([
        { id: 'st-1', keyword_id: 'kw-1', name: 'Sub 1' },
      ])
      .mockResolvedValueOnce([]); // no bkt states

    const result = await fetchKeywordMasteryByTopic('topic-nobkt');
    const kw = result.get('kw-1')!;
    expect(kw.mastery).toBe(0);
    expect(kw.subtopics[0].p_know).toBe(0);
    expect(kw.subtopics[0].hasData).toBe(false);
    expect(kw.subtopics[0].isMastered).toBe(false);
  });

  it('handles { items: [...] } wrapper format from API', async () => {
    mockApiCall
      .mockResolvedValueOnce({ summaries: [{ id: 'sum-1' }] })
      // Keywords wrapped in { items: [...] }
      .mockResolvedValueOnce({
        items: [{ id: 'kw-1', name: 'Wrapped', summary_id: 'sum-1' }],
      })
      .mockResolvedValueOnce({ items: [] }) // subtopics
      .mockResolvedValueOnce([]); // bkt-states

    const result = await fetchKeywordMasteryByTopic('topic-wrapped');
    expect(result.size).toBe(1);
    expect(result.get('kw-1')!.name).toBe('Wrapped');
  });

  it('uses default priority 1 when keyword has no priority', async () => {
    mockApiCall
      .mockResolvedValueOnce({ summaries: [{ id: 'sum-1' }] })
      .mockResolvedValueOnce([
        { id: 'kw-1', name: 'No Priority', summary_id: 'sum-1' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await fetchKeywordMasteryByTopic('topic-prio');
    expect(result.get('kw-1')!.priority).toBe(1);
  });

  it('uses empty string for definition when keyword has no definition', async () => {
    mockApiCall
      .mockResolvedValueOnce({ summaries: [{ id: 'sum-1' }] })
      .mockResolvedValueOnce([
        { id: 'kw-1', name: 'No Def', summary_id: 'sum-1' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await fetchKeywordMasteryByTopic('topic-nodef');
    expect(result.get('kw-1')!.definition).toBe('');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: fetchKeywordMasteryBySummary — URL construction & flow
// ══════════════════════════════════════════════════════════════

describe('fetchKeywordMasteryBySummary', () => {
  it('calls /keywords with summary_id query param', async () => {
    mockApiCall.mockResolvedValueOnce([]);
    await fetchKeywordMasteryBySummary('sum-100');

    expect(mockApiCall.mock.calls[0][0]).toBe('/keywords?summary_id=sum-100');
  });

  it('returns empty map when summary has no active keywords', async () => {
    mockApiCall.mockResolvedValueOnce([]);
    const result = await fetchKeywordMasteryBySummary('sum-empty');

    expect(result.size).toBe(0);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('filters out deleted and inactive keywords', async () => {
    mockApiCall.mockResolvedValueOnce([
      { id: 'kw-1', name: 'Active', summary_id: 'sum-1' },
      { id: 'kw-2', name: 'Deleted', summary_id: 'sum-1', deleted_at: '2025-06-01' },
      { id: 'kw-3', name: 'Inactive', summary_id: 'sum-1', is_active: false },
    ]);
    // Only kw-1 is active, so subsequent calls are for 1 keyword
    mockApiCall
      .mockResolvedValueOnce([]) // subtopics
      .mockResolvedValueOnce([]); // bkt-states

    const result = await fetchKeywordMasteryBySummary('sum-filter');
    expect(result.size).toBe(1);
    expect(result.has('kw-1')).toBe(true);
    expect(result.has('kw-2')).toBe(false);
    expect(result.has('kw-3')).toBe(false);
  });

  it('makes exactly 3 API calls for a summary with keywords', async () => {
    mockApiCall
      .mockResolvedValueOnce([
        { id: 'kw-1', name: 'KW', summary_id: 'sum-1' },
      ])
      .mockResolvedValueOnce([
        { id: 'st-1', keyword_id: 'kw-1', name: 'Sub' },
      ])
      .mockResolvedValueOnce([
        { subtopic_id: 'st-1', p_know: 0.5, total_attempts: 3, correct_attempts: 2 },
      ]);

    await fetchKeywordMasteryBySummary('sum-3calls');

    // 1: /keywords, 2: /subtopics-batch, 3: /bkt-states
    expect(mockApiCall).toHaveBeenCalledTimes(3);
  });

  it('constructs correct subtopics-batch URL', async () => {
    mockApiCall
      .mockResolvedValueOnce([
        { id: 'kw-A', name: 'A', summary_id: 'sum-1' },
        { id: 'kw-B', name: 'B', summary_id: 'sum-1' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await fetchKeywordMasteryBySummary('sum-batch');

    const subtopicCall = mockApiCall.mock.calls[1][0] as string;
    expect(subtopicCall).toContain('/subtopics-batch?keyword_ids=');
    expect(subtopicCall).toContain('kw-A');
    expect(subtopicCall).toContain('kw-B');
  });

  it('constructs correct bkt-states URL with limit', async () => {
    mockApiCall
      .mockResolvedValueOnce([
        { id: 'kw-1', name: 'KW', summary_id: 'sum-1' },
      ])
      .mockResolvedValueOnce([
        { id: 'st-10', keyword_id: 'kw-1', name: 'Sub 10' },
        { id: 'st-11', keyword_id: 'kw-1', name: 'Sub 11' },
        { id: 'st-12', keyword_id: 'kw-1', name: 'Sub 12' },
      ])
      .mockResolvedValueOnce([]);

    await fetchKeywordMasteryBySummary('sum-bkt');

    const bktCall = mockApiCall.mock.calls[2][0] as string;
    expect(bktCall).toContain('/bkt-states?subtopic_ids=');
    expect(bktCall).toContain('limit=3');
  });

  it('returns fully populated KeywordMasteryMap', async () => {
    mockApiCall
      .mockResolvedValueOnce([
        { id: 'kw-1', name: 'Mitosis', definition: 'Cell division', summary_id: 'sum-1', priority: 5 },
      ])
      .mockResolvedValueOnce([
        { id: 'st-1', keyword_id: 'kw-1', name: 'Prophase', order_index: 0 },
        { id: 'st-2', keyword_id: 'kw-1', name: 'Metaphase', order_index: 1 },
      ])
      .mockResolvedValueOnce([
        { subtopic_id: 'st-1', p_know: 0.85, total_attempts: 8, correct_attempts: 7 },
        { subtopic_id: 'st-2', p_know: 0.80, total_attempts: 5, correct_attempts: 4 },
      ]);

    const result = await fetchKeywordMasteryBySummary('sum-full');
    const kw = result.get('kw-1')!;

    expect(kw.mastery).toBeCloseTo(0.825, 5);
    expect(kw.isMastered).toBe(true); // 0.825 >= 0.75
    expect(kw.subtopicsMastered).toBe(2);
    expect(kw.subtopicsTotal).toBe(2);
    expect(kw.subtopics[0].hasData).toBe(true);
    expect(kw.subtopics[0].isMastered).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: computeLocalKeywordMastery — pure function
// ══════════════════════════════════════════════════════════════

describe('computeLocalKeywordMastery', () => {
  it('returns same reference when sessionBktUpdates is empty', () => {
    const existing: KeywordMasteryMap = new Map();
    existing.set('kw-1', makeKeywordMasteryInfo({ keyword_id: 'kw-1' }));

    const result = computeLocalKeywordMastery(existing, new Map());
    expect(result).toBe(existing); // same reference
  });

  it('returns new map when updates exist (immutability)', () => {
    const subtopics = [
      makeSubtopicInfo({ id: 'st-1', keyword_id: 'kw-1', p_know: 0.3 }),
    ];
    const existing: KeywordMasteryMap = new Map();
    existing.set('kw-1', makeKeywordMasteryInfo({
      keyword_id: 'kw-1',
      subtopics,
      subtopicsTotal: 1,
    }));

    const updates = new Map([['st-1', 0.9]]);
    const result = computeLocalKeywordMastery(existing, updates);

    expect(result).not.toBe(existing);
    expect(result.size).toBe(1);
  });

  it('updates p_know for affected subtopics', () => {
    const subtopics = [
      makeSubtopicInfo({ id: 'st-1', keyword_id: 'kw-1', p_know: 0.2 }),
      makeSubtopicInfo({ id: 'st-2', keyword_id: 'kw-1', p_know: 0.4 }),
    ];
    const existing: KeywordMasteryMap = new Map();
    existing.set('kw-1', makeKeywordMasteryInfo({
      keyword_id: 'kw-1',
      subtopics,
      subtopicsTotal: 2,
      mastery: 0.3,
    }));

    const updates = new Map([['st-1', 0.85]]);
    const result = computeLocalKeywordMastery(existing, updates);
    const kw = result.get('kw-1')!;

    expect(kw.subtopics[0].p_know).toBe(0.85);
    expect(kw.subtopics[0].hasData).toBe(true);
    expect(kw.subtopics[0].isMastered).toBe(true); // 0.85 >= 0.75
    // Unchanged subtopic keeps original value
    expect(kw.subtopics[1].p_know).toBe(0.4);
  });

  it('recomputes keyword mastery as avg of subtopic p_know', () => {
    const subtopics = [
      makeSubtopicInfo({ id: 'st-1', keyword_id: 'kw-1', p_know: 0.2 }),
      makeSubtopicInfo({ id: 'st-2', keyword_id: 'kw-1', p_know: 0.4 }),
    ];
    const existing: KeywordMasteryMap = new Map();
    existing.set('kw-1', makeKeywordMasteryInfo({
      keyword_id: 'kw-1',
      subtopics,
      subtopicsTotal: 2,
    }));

    const updates = new Map([['st-1', 0.8]]);
    const result = computeLocalKeywordMastery(existing, updates);
    const kw = result.get('kw-1')!;

    // avg(0.8, 0.4) = 0.6
    expect(kw.mastery).toBeCloseTo(0.6, 5);
    expect(kw.isMastered).toBe(false);
  });

  it('marks keyword as mastered when avg p_know >= threshold', () => {
    const subtopics = [
      makeSubtopicInfo({ id: 'st-1', keyword_id: 'kw-1', p_know: 0.5 }),
      makeSubtopicInfo({ id: 'st-2', keyword_id: 'kw-1', p_know: 0.8 }),
    ];
    const existing: KeywordMasteryMap = new Map();
    existing.set('kw-1', makeKeywordMasteryInfo({
      keyword_id: 'kw-1',
      subtopics,
      subtopicsTotal: 2,
    }));

    // Update st-1 to 0.9 => avg(0.9, 0.8) = 0.85 >= 0.75
    const updates = new Map([['st-1', 0.9]]);
    const result = computeLocalKeywordMastery(existing, updates);
    const kw = result.get('kw-1')!;

    expect(kw.mastery).toBeCloseTo(0.85, 5);
    expect(kw.isMastered).toBe(true);
    expect(kw.subtopicsMastered).toBe(2);
  });

  it('reuses existing entry when keyword has no updated subtopics', () => {
    const kw1 = makeKeywordMasteryInfo({
      keyword_id: 'kw-1',
      subtopics: [makeSubtopicInfo({ id: 'st-1', keyword_id: 'kw-1' })],
      subtopicsTotal: 1,
    });
    const kw2 = makeKeywordMasteryInfo({
      keyword_id: 'kw-2',
      subtopics: [makeSubtopicInfo({ id: 'st-2', keyword_id: 'kw-2' })],
      subtopicsTotal: 1,
    });
    const existing: KeywordMasteryMap = new Map([
      ['kw-1', kw1],
      ['kw-2', kw2],
    ]);

    // Only update kw-1's subtopic
    const updates = new Map([['st-1', 0.9]]);
    const result = computeLocalKeywordMastery(existing, updates);

    // kw-2 should be the same reference (immutable optimization)
    expect(result.get('kw-2')).toBe(kw2);
    // kw-1 should be a new object
    expect(result.get('kw-1')).not.toBe(kw1);
  });

  it('handles multiple keywords with interleaved updates', () => {
    const existing: KeywordMasteryMap = new Map([
      ['kw-1', makeKeywordMasteryInfo({
        keyword_id: 'kw-1',
        subtopics: [
          makeSubtopicInfo({ id: 'st-1', keyword_id: 'kw-1', p_know: 0.1 }),
        ],
        subtopicsTotal: 1,
      })],
      ['kw-2', makeKeywordMasteryInfo({
        keyword_id: 'kw-2',
        subtopics: [
          makeSubtopicInfo({ id: 'st-2', keyword_id: 'kw-2', p_know: 0.3 }),
          makeSubtopicInfo({ id: 'st-3', keyword_id: 'kw-2', p_know: 0.5 }),
        ],
        subtopicsTotal: 2,
      })],
    ]);

    const updates = new Map([
      ['st-1', 0.9],
      ['st-3', 0.8],
    ]);
    const result = computeLocalKeywordMastery(existing, updates);

    expect(result.get('kw-1')!.mastery).toBeCloseTo(0.9, 5);
    // avg(0.3, 0.8) = 0.55
    expect(result.get('kw-2')!.mastery).toBeCloseTo(0.55, 5);
  });

  it('handles update for a subtopic_id not in any keyword (no crash)', () => {
    const existing: KeywordMasteryMap = new Map([
      ['kw-1', makeKeywordMasteryInfo({
        keyword_id: 'kw-1',
        subtopics: [
          makeSubtopicInfo({ id: 'st-1', keyword_id: 'kw-1', p_know: 0.5 }),
        ],
        subtopicsTotal: 1,
      })],
    ]);

    const updates = new Map([['st-nonexistent', 0.9]]);
    const result = computeLocalKeywordMastery(existing, updates);

    // kw-1 should remain unchanged (reused reference)
    expect(result.get('kw-1')).toBe(existing.get('kw-1'));
  });

  it('handles empty existing mastery map', () => {
    const existing: KeywordMasteryMap = new Map();
    const updates = new Map([['st-1', 0.9]]);
    const result = computeLocalKeywordMastery(existing, updates);
    expect(result.size).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 5: computeTopicMasterySummary — pure function
// ══════════════════════════════════════════════════════════════

describe('computeTopicMasterySummary', () => {
  it('returns zeros for empty map', () => {
    const result = computeTopicMasterySummary(new Map());

    expect(result.keywordsTotal).toBe(0);
    expect(result.keywordsMastered).toBe(0);
    expect(result.overallMastery).toBe(0);
    expect(result.weakestKeywords).toHaveLength(0);
    expect(result.allKeywordsByMastery).toHaveLength(0);
  });

  it('computes correct counts and overall mastery', () => {
    const map: KeywordMasteryMap = new Map([
      ['kw-1', makeKeywordMasteryInfo({ keyword_id: 'kw-1', mastery: 0.9, isMastered: true })],
      ['kw-2', makeKeywordMasteryInfo({ keyword_id: 'kw-2', mastery: 0.5, isMastered: false })],
      ['kw-3', makeKeywordMasteryInfo({ keyword_id: 'kw-3', mastery: 0.8, isMastered: true })],
    ]);

    const result = computeTopicMasterySummary(map);

    expect(result.keywordsTotal).toBe(3);
    expect(result.keywordsMastered).toBe(2);
    // avg(0.9, 0.5, 0.8) = 2.2/3 = 0.7333...
    expect(result.overallMastery).toBeCloseTo(0.7333, 3);
  });

  it('weakestKeywords excludes mastered keywords', () => {
    const map: KeywordMasteryMap = new Map([
      ['kw-1', makeKeywordMasteryInfo({ keyword_id: 'kw-1', mastery: 0.9, isMastered: true })],
      ['kw-2', makeKeywordMasteryInfo({ keyword_id: 'kw-2', mastery: 0.3, isMastered: false })],
      ['kw-3', makeKeywordMasteryInfo({ keyword_id: 'kw-3', mastery: 0.1, isMastered: false })],
    ]);

    const result = computeTopicMasterySummary(map);

    expect(result.weakestKeywords).toHaveLength(2);
    expect(result.weakestKeywords.every(kw => !kw.isMastered)).toBe(true);
  });

  it('sorts weakestKeywords by mastery ascending (weakest first)', () => {
    const map: KeywordMasteryMap = new Map([
      ['kw-1', makeKeywordMasteryInfo({ keyword_id: 'kw-1', mastery: 0.6, isMastered: false })],
      ['kw-2', makeKeywordMasteryInfo({ keyword_id: 'kw-2', mastery: 0.2, isMastered: false })],
      ['kw-3', makeKeywordMasteryInfo({ keyword_id: 'kw-3', mastery: 0.4, isMastered: false })],
    ]);

    const result = computeTopicMasterySummary(map);

    expect(result.weakestKeywords[0].keyword_id).toBe('kw-2'); // 0.2
    expect(result.weakestKeywords[1].keyword_id).toBe('kw-3'); // 0.4
    expect(result.weakestKeywords[2].keyword_id).toBe('kw-1'); // 0.6
  });

  it('uses priority as tiebreaker (higher priority first) when mastery is equal', () => {
    const map: KeywordMasteryMap = new Map([
      ['kw-1', makeKeywordMasteryInfo({ keyword_id: 'kw-1', mastery: 0.5, priority: 1, isMastered: false })],
      ['kw-2', makeKeywordMasteryInfo({ keyword_id: 'kw-2', mastery: 0.5, priority: 5, isMastered: false })],
      ['kw-3', makeKeywordMasteryInfo({ keyword_id: 'kw-3', mastery: 0.5, priority: 3, isMastered: false })],
    ]);

    const result = computeTopicMasterySummary(map);

    // Same mastery (0.5), sorted by priority descending
    expect(result.weakestKeywords[0].keyword_id).toBe('kw-2'); // priority 5
    expect(result.weakestKeywords[1].keyword_id).toBe('kw-3'); // priority 3
    expect(result.weakestKeywords[2].keyword_id).toBe('kw-1'); // priority 1
  });

  it('allKeywordsByMastery includes all keywords (mastered and not)', () => {
    const map: KeywordMasteryMap = new Map([
      ['kw-1', makeKeywordMasteryInfo({ keyword_id: 'kw-1', mastery: 0.9, isMastered: true })],
      ['kw-2', makeKeywordMasteryInfo({ keyword_id: 'kw-2', mastery: 0.3, isMastered: false })],
    ]);

    const result = computeTopicMasterySummary(map);

    expect(result.allKeywordsByMastery).toHaveLength(2);
    // Sorted ascending
    expect(result.allKeywordsByMastery[0].keyword_id).toBe('kw-2'); // 0.3
    expect(result.allKeywordsByMastery[1].keyword_id).toBe('kw-1'); // 0.9
  });

  it('returns empty weakestKeywords when all keywords are mastered', () => {
    const map: KeywordMasteryMap = new Map([
      ['kw-1', makeKeywordMasteryInfo({ keyword_id: 'kw-1', mastery: 0.9, isMastered: true })],
      ['kw-2', makeKeywordMasteryInfo({ keyword_id: 'kw-2', mastery: 0.8, isMastered: true })],
    ]);

    const result = computeTopicMasterySummary(map);

    expect(result.keywordsMastered).toBe(2);
    expect(result.weakestKeywords).toHaveLength(0);
    expect(result.allKeywordsByMastery).toHaveLength(2);
  });

  it('handles single keyword', () => {
    const map: KeywordMasteryMap = new Map([
      ['kw-1', makeKeywordMasteryInfo({ keyword_id: 'kw-1', mastery: 0.6, isMastered: false })],
    ]);

    const result = computeTopicMasterySummary(map);

    expect(result.keywordsTotal).toBe(1);
    expect(result.keywordsMastered).toBe(0);
    expect(result.overallMastery).toBeCloseTo(0.6, 5);
    expect(result.weakestKeywords).toHaveLength(1);
  });

  it('mastery tiebreaker uses 0.001 epsilon for floating point', () => {
    // Two keywords with mastery difference < 0.001 should be treated as tied
    const map: KeywordMasteryMap = new Map([
      ['kw-1', makeKeywordMasteryInfo({ keyword_id: 'kw-1', mastery: 0.5001, priority: 1, isMastered: false })],
      ['kw-2', makeKeywordMasteryInfo({ keyword_id: 'kw-2', mastery: 0.5005, priority: 5, isMastered: false })],
    ]);

    const result = computeTopicMasterySummary(map);

    // Difference is 0.0004 < 0.001 => treated as tie => priority tiebreaker
    expect(result.weakestKeywords[0].keyword_id).toBe('kw-2'); // priority 5 wins
  });
});
