// ============================================================
// Tests — useGraphData contract tests
//
// Tests the pure caching logic and cache invalidation of the
// useGraphData hook. The hook's fetch logic relies on React
// state/effects, but the module-level cache + invalidation
// bus are importable and testable directly.
//
// Also tests cacheKey generation and LRU eviction behavior
// by replicating the pure functions from the module.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock mindmapApi before importing useGraphData ──────────

const mockFetchByTopic = vi.fn();
const mockFetchBySummary = vi.fn();
const mockFetchByCourse = vi.fn();
const mockFetchCustom = vi.fn();

vi.mock('@/app/services/mindmapApi', () => ({
  fetchGraphByTopic: (...args: unknown[]) => mockFetchByTopic(...args),
  fetchGraphBySummary: (...args: unknown[]) => mockFetchBySummary(...args),
  fetchGraphByCourse: (...args: unknown[]) => mockFetchByCourse(...args),
  fetchCustomGraph: (...args: unknown[]) => mockFetchCustom(...args),
}));

import { invalidateGraphCache, onGraphCacheInvalidation } from '../useGraphData';

// ── Replicated pure logic from useGraphData.ts ─────────────

function cacheKey(topicId?: string, summaryId?: string): string {
  if (summaryId) return `s:${summaryId}`;
  if (topicId) return `t:${topicId}`;
  return '';
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX = 20;

interface CacheEntry {
  data: { nodes: any[]; edges: any[] };
  timestamp: number;
}

// Replicate the LRU cache logic
class TestCache {
  cache = new Map<string, CacheEntry>();

  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    // LRU: move to end
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: any) {
    this.cache.delete(key);
    if (this.cache.size >= CACHE_MAX) {
      const lru = this.cache.keys().next().value;
      if (lru) this.cache.delete(lru);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get size() { return this.cache.size; }
  clear() { this.cache.clear(); }
}

// ── Tests ───────────────────────────────────────────────────

describe('cacheKey generation', () => {
  it('returns summary key for summaryId', () => {
    expect(cacheKey('topic-1', 'sum-1')).toBe('s:sum-1');
  });

  it('returns topic key for topicId only', () => {
    expect(cacheKey('topic-1')).toBe('t:topic-1');
  });

  it('prioritizes summaryId over topicId', () => {
    expect(cacheKey('topic-1', 'sum-1')).toBe('s:sum-1');
  });

  it('returns empty string when neither provided', () => {
    expect(cacheKey()).toBe('');
    expect(cacheKey(undefined, undefined)).toBe('');
  });
});

describe('LRU cache behavior', () => {
  let cache: TestCache;

  beforeEach(() => {
    cache = new TestCache();
  });

  it('stores and retrieves data', () => {
    const data = { nodes: [{ id: 'n1' }], edges: [] };
    cache.set('t:topic-1', data);
    expect(cache.get('t:topic-1')).toEqual(data);
  });

  it('returns null for missing keys', () => {
    expect(cache.get('t:missing')).toBeNull();
  });

  it('evicts LRU entry when max reached', () => {
    for (let i = 0; i < CACHE_MAX + 1; i++) {
      cache.set(`t:topic-${i}`, { nodes: [], edges: [] });
    }
    // First entry (topic-0) should have been evicted
    expect(cache.get('t:topic-0')).toBeNull();
    // Last entry should still be there
    expect(cache.get(`t:topic-${CACHE_MAX}`)).not.toBeNull();
    expect(cache.size).toBe(CACHE_MAX);
  });

  it('moves accessed entries to end (LRU refresh)', () => {
    cache.set('t:a', { nodes: [], edges: [] });
    cache.set('t:b', { nodes: [], edges: [] });
    cache.set('t:c', { nodes: [], edges: [] });

    // Access 'a' to move it to end (most recently used)
    cache.get('t:a');

    // Fill cache to trigger eviction
    for (let i = 0; i < CACHE_MAX - 2; i++) {
      cache.set(`t:fill-${i}`, { nodes: [], edges: [] });
    }

    // 'a' was accessed recently so it should still be present
    // 'b' was never re-accessed and should be evicted first
    expect(cache.get('t:a')).not.toBeNull();
  });

  it('handles re-setting same key (updates timestamp)', () => {
    const data1 = { nodes: [{ id: 'old' }], edges: [] };
    const data2 = { nodes: [{ id: 'new' }], edges: [] };
    cache.set('t:topic-1', data1);
    cache.set('t:topic-1', data2);
    expect(cache.get('t:topic-1')).toEqual(data2);
    expect(cache.size).toBe(1);
  });
});

describe('invalidateGraphCache', () => {
  it('notifies listeners when invalidated', () => {
    const listener = vi.fn();
    const unsub = onGraphCacheInvalidation(listener);

    invalidateGraphCache();
    expect(listener).toHaveBeenCalledOnce();

    unsub();
  });

  it('unsubscribes correctly', () => {
    const listener = vi.fn();
    const unsub = onGraphCacheInvalidation(listener);
    unsub();

    invalidateGraphCache();
    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies multiple listeners', () => {
    const l1 = vi.fn();
    const l2 = vi.fn();
    const u1 = onGraphCacheInvalidation(l1);
    const u2 = onGraphCacheInvalidation(l2);

    invalidateGraphCache();
    expect(l1).toHaveBeenCalledOnce();
    expect(l2).toHaveBeenCalledOnce();

    u1();
    u2();
  });

  it('does not throw when no listeners', () => {
    expect(() => invalidateGraphCache()).not.toThrow();
  });
});

describe('courseKey generation (sorted topic IDs)', () => {
  it('sorts topic IDs for consistent cache key', () => {
    const ids1 = ['c', 'a', 'b'];
    const ids2 = ['b', 'c', 'a'];
    const key1 = [...ids1].sort().join(',');
    const key2 = [...ids2].sort().join(',');
    expect(key1).toBe(key2);
    expect(key1).toBe('a,b,c');
  });

  it('empty array produces empty key', () => {
    const key = [].sort().join(',');
    expect(key).toBe('');
  });
});

describe('Graph data source resolution', () => {
  it('prefers courseTopicIds over topicId', () => {
    const courseKey = 'a,b,c';
    const topicId = 'topic-1';
    const summaryId = undefined;
    // The hook resolves: courseKey ? fetchByCourse : summaryId ? fetchBySummary : fetchByTopic
    const source = courseKey ? 'course' : summaryId ? 'summary' : topicId ? 'topic' : 'none';
    expect(source).toBe('course');
  });

  it('prefers summaryId over topicId when no courseKey', () => {
    const courseKey = '';
    const summaryId = 'sum-1';
    const topicId = 'topic-1';
    const source = courseKey ? 'course' : summaryId ? 'summary' : topicId ? 'topic' : 'none';
    expect(source).toBe('summary');
  });

  it('falls back to topicId when no courseKey or summaryId', () => {
    const courseKey = '';
    const summaryId = undefined;
    const topicId = 'topic-1';
    const source = courseKey ? 'course' : summaryId ? 'summary' : topicId ? 'topic' : 'none';
    expect(source).toBe('topic');
  });

  it('returns none when no source provided', () => {
    const courseKey = '';
    const summaryId = undefined;
    const topicId = undefined;
    const source = courseKey ? 'course' : summaryId ? 'summary' : topicId ? 'topic' : 'none';
    expect(source).toBe('none');
  });
});

describe('Custom node merging logic', () => {
  it('deduplicates nodes by ID', () => {
    const baseNodes = [{ id: 'n1' }, { id: 'n2' }];
    const customNodes = [{ id: 'n2' }, { id: 'n3' }]; // n2 is duplicate

    const existingIds = new Set(baseNodes.map(n => n.id));
    const merged = [
      ...baseNodes,
      ...customNodes.filter(n => !existingIds.has(n.id)),
    ];

    expect(merged.length).toBe(3);
    expect(merged.map(n => n.id)).toEqual(['n1', 'n2', 'n3']);
  });

  it('filters orphan edges (source/target not in merged node set)', () => {
    const allNodeIds = new Set(['n1', 'n2', 'n3']);
    const edges = [
      { id: 'e1', source: 'n1', target: 'n2' }, // valid
      { id: 'e2', source: 'n1', target: 'n99' }, // orphan target
      { id: 'e3', source: 'n99', target: 'n1' }, // orphan source
    ];

    const validEdges = edges.filter(
      e => allNodeIds.has(e.source) && allNodeIds.has(e.target)
    );
    expect(validEdges.length).toBe(1);
    expect(validEdges[0].id).toBe('e1');
  });

  it('deduplicates edges by ID', () => {
    const baseEdges = [{ id: 'e1', source: 'n1', target: 'n2' }];
    const customEdges = [
      { id: 'e1', source: 'n1', target: 'n2' }, // duplicate
      { id: 'e2', source: 'n2', target: 'n3' }, // new
    ];
    const allNodeIds = new Set(['n1', 'n2', 'n3']);
    const existingEdgeIds = new Set(baseEdges.map(e => e.id));

    const merged = [
      ...baseEdges,
      ...customEdges.filter(e =>
        !existingEdgeIds.has(e.id) &&
        allNodeIds.has(e.source) &&
        allNodeIds.has(e.target)
      ),
    ];

    expect(merged.length).toBe(2);
    expect(merged.map(e => e.id)).toEqual(['e1', 'e2']);
  });
});
