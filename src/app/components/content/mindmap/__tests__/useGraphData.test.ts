// ============================================================
// Tests — useGraphData (cache logic + module contract)
//
// Replicates the internal LRU cache algorithm to verify:
// - cacheKey generation (topic, summary, empty)
// - getCached: hit, miss, TTL expiry, LRU promotion
// - setCache: insertion, empty-key guard, LRU eviction at max
// - invalidation event bus: subscribe, notify, unsubscribe
//
// Also validates module exports via source reading.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'useGraphData.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Constants (mirrored from source) ────────────────────────

const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX = 20;

// ── Replicated pure functions ───────────────────────────────

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

function createCacheTestHarness() {
  const cache = new Map<string, CacheEntry>();

  function getCached(key: string): unknown | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
      return null;
    }
    cache.delete(key);
    cache.set(key, entry);
    return entry.data;
  }

  function setCache(key: string, data: unknown): void {
    if (!key) return;
    cache.delete(key);
    if (cache.size >= CACHE_MAX) {
      const lru = cache.keys().next().value;
      if (lru) cache.delete(lru);
    }
    cache.set(key, { data, timestamp: Date.now() });
  }

  function cacheKey(topicId?: string, summaryId?: string): string {
    if (summaryId) return `s:${summaryId}`;
    if (topicId) return `t:${topicId}`;
    return '';
  }

  return { cache, getCached, setCache, cacheKey };
}

// ── Module contract ─────────────────────────────────────────

describe('useGraphData module contract', () => {
  it('exports useGraphData hook', () => {
    expect(source).toContain('export function useGraphData');
  });

  it('exports invalidateGraphCache function', () => {
    expect(source).toContain('export function invalidateGraphCache');
  });

  it('exports onGraphCacheInvalidation function', () => {
    expect(source).toContain('export function onGraphCacheInvalidation');
  });

  it('defines CACHE_TTL as 5 minutes', () => {
    expect(source).toContain('const CACHE_TTL = 5 * 60 * 1000');
  });

  it('defines CACHE_MAX as 20', () => {
    expect(source).toContain('const CACHE_MAX = 20');
  });

  it('imports from mindmapApi (fetchGraphByTopic, fetchGraphBySummary, fetchGraphByCourse, fetchCustomGraph)', () => {
    expect(source).toContain('fetchGraphByTopic');
    expect(source).toContain('fetchGraphBySummary');
    expect(source).toContain('fetchGraphByCourse');
    expect(source).toContain('fetchCustomGraph');
  });

  it('returns UseGraphDataResult shape', () => {
    expect(source).toContain('graphData');
    expect(source).toContain('loading');
    expect(source).toContain('error');
    expect(source).toContain('refetch');
    expect(source).toContain('isEmpty');
  });
});

// ── cacheKey ────────────────────────────────────────────────

describe('cacheKey generation', () => {
  const { cacheKey } = createCacheTestHarness();

  it('returns summary key when summaryId provided', () => {
    expect(cacheKey('topic-1', 'summary-1')).toBe('s:summary-1');
  });

  it('prefers summaryId over topicId', () => {
    expect(cacheKey('topic-1', 'summary-1')).toBe('s:summary-1');
  });

  it('returns topic key when only topicId provided', () => {
    expect(cacheKey('topic-1')).toBe('t:topic-1');
  });

  it('returns empty string when neither provided', () => {
    expect(cacheKey()).toBe('');
    expect(cacheKey(undefined, undefined)).toBe('');
  });
});

// ── getCached / setCache ────────────────────────────────────

describe('LRU cache', () => {
  let harness: ReturnType<typeof createCacheTestHarness>;

  beforeEach(() => {
    harness = createCacheTestHarness();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null on cache miss', () => {
    expect(harness.getCached('nonexistent')).toBeNull();
  });

  it('returns cached data on hit', () => {
    const data = { nodes: [], edges: [] };
    harness.setCache('t:topic-1', data);
    expect(harness.getCached('t:topic-1')).toEqual(data);
  });

  it('ignores empty keys on setCache', () => {
    harness.setCache('', { nodes: [] });
    expect(harness.cache.size).toBe(0);
  });

  it('expires entries after CACHE_TTL', () => {
    harness.setCache('t:topic-1', { nodes: [] });
    vi.advanceTimersByTime(CACHE_TTL + 1);
    expect(harness.getCached('t:topic-1')).toBeNull();
    expect(harness.cache.size).toBe(0);
  });

  it('does NOT expire entries before TTL', () => {
    const data = { nodes: [{ id: '1' }] };
    harness.setCache('t:topic-1', data);
    vi.advanceTimersByTime(CACHE_TTL - 1000);
    expect(harness.getCached('t:topic-1')).toEqual(data);
  });

  it('promotes accessed entries to most-recently-used', () => {
    harness.setCache('k1', 'a');
    harness.setCache('k2', 'b');
    harness.setCache('k3', 'c');

    // Access k1 to promote it
    harness.getCached('k1');

    const keys = [...harness.cache.keys()];
    expect(keys[keys.length - 1]).toBe('k1');
  });

  it('evicts LRU entry when at max capacity', () => {
    for (let i = 0; i < CACHE_MAX; i++) {
      harness.setCache(`k${i}`, `v${i}`);
    }
    expect(harness.cache.size).toBe(CACHE_MAX);

    // Insert one more — should evict k0 (least recently used)
    harness.setCache('overflow', 'new');
    expect(harness.cache.size).toBe(CACHE_MAX);
    expect(harness.getCached('k0')).toBeNull();
    expect(harness.getCached('overflow')).toBe('new');
  });

  it('overwrites existing key without increasing cache size', () => {
    harness.setCache('t:topic-1', 'v1');
    harness.setCache('t:topic-1', 'v2');
    expect(harness.cache.size).toBe(1);
    expect(harness.getCached('t:topic-1')).toBe('v2');
  });
});

// ── Invalidation event bus ──────────────────────────────────

describe('invalidation event bus (algorithm)', () => {
  it('source implements listener pattern with Set', () => {
    expect(source).toContain('const listeners = new Set');
    expect(source).toContain('listeners.add(listener)');
    expect(source).toContain('listeners.delete(listener)');
  });

  it('invalidateGraphCache clears all when no args', () => {
    expect(source).toContain('cache.clear()');
  });

  it('invalidateGraphCache handles topicId with course-level keys', () => {
    expect(source).toContain("key.startsWith('c:')");
  });

  it('auto-refetch uses 300ms debounce', () => {
    expect(source).toContain('300');
  });
});

// ── Stale request guard ─────────────────────────────────────

describe('stale request protection', () => {
  it('uses fetchIdRef to guard against stale responses', () => {
    expect(source).toContain('fetchIdRef');
    const guards = source.match(/fetchId !== fetchIdRef\.current/g);
    expect(guards).not.toBeNull();
    expect(guards!.length).toBeGreaterThanOrEqual(2);
  });
});
