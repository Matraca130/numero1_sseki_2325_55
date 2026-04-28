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

// ── Course-level cache invalidation (runtime, replicated) ──

describe('Course-level cache invalidation (replicated)', () => {
  function makeInvalidate() {
    const cache = new Map<string, unknown>();
    function invalidate(topicId?: string, summaryId?: string): void {
      if (!topicId && !summaryId) {
        cache.clear();
        return;
      }
      if (topicId) {
        cache.delete(`t:${topicId}`);
        if (summaryId) cache.delete(`s:${summaryId}`);
        const keysToDelete: string[] = [];
        for (const key of cache.keys()) {
          if (!key.startsWith('c:')) continue;
          const ids = key.slice(2).split(',');
          if (ids.includes(topicId)) keysToDelete.push(key);
        }
        for (const key of keysToDelete) cache.delete(key);
      } else if (summaryId) {
        cache.delete(`s:${summaryId}`);
      }
    }
    return { cache, invalidate };
  }

  it('clearing without args nukes EVERY entry', () => {
    const { cache, invalidate } = makeInvalidate();
    cache.set('t:abc', 1);
    cache.set('s:xyz', 2);
    cache.set('c:a,b,c', 3);
    invalidate();
    expect(cache.size).toBe(0);
  });

  it('topicId-only invalidates the t: key', () => {
    const { cache, invalidate } = makeInvalidate();
    cache.set('t:abc', 1);
    cache.set('t:other', 2);
    invalidate('abc');
    expect(cache.has('t:abc')).toBe(false);
    expect(cache.has('t:other')).toBe(true);
  });

  it('topicId invalidates ALL course keys that contain that topic', () => {
    const { cache, invalidate } = makeInvalidate();
    cache.set('c:a,b', 1);
    cache.set('c:b,c', 2);
    cache.set('c:c,d', 3);
    invalidate('b');
    expect(cache.has('c:a,b')).toBe(false);
    expect(cache.has('c:b,c')).toBe(false);
    expect(cache.has('c:c,d')).toBe(true);
  });

  it('topicId+summaryId invalidates BOTH', () => {
    const { cache, invalidate } = makeInvalidate();
    cache.set('t:abc', 1);
    cache.set('s:xyz', 2);
    cache.set('s:other', 3);
    invalidate('abc', 'xyz');
    expect(cache.has('t:abc')).toBe(false);
    expect(cache.has('s:xyz')).toBe(false);
    expect(cache.has('s:other')).toBe(true);
  });

  it('summaryId-only invalidates ONLY the s: key (course caches stay until TTL)', () => {
    const { cache, invalidate } = makeInvalidate();
    cache.set('s:xyz', 1);
    cache.set('c:a,b', 2);
    invalidate(undefined, 'xyz');
    expect(cache.has('s:xyz')).toBe(false);
    expect(cache.has('c:a,b')).toBe(true);
  });

  it('topicId substring match: "ab" must NOT match "abc" (uses split(",").includes)', () => {
    // Critical: the algorithm splits by comma and uses Array.includes,
    // so "ab" should NOT match a course key "c:abc,xyz".
    const { cache, invalidate } = makeInvalidate();
    cache.set('c:abc,xyz', 1);
    invalidate('ab');
    expect(cache.has('c:abc,xyz')).toBe(true); // not invalidated
  });

  it('does not mutate the cache while iterating (collects keys first)', () => {
    const { cache, invalidate } = makeInvalidate();
    for (let i = 0; i < 50; i++) cache.set(`c:a,b,t${i}`, i);
    expect(() => invalidate('b')).not.toThrow();
    expect(cache.size).toBe(0); // all 50 had 'b' in them
  });
});

// ── courseKey sort invariance ──────────────────────────────

describe('courseKey sort invariance (replicated)', () => {
  function buildCourseKey(courseTopicIds?: string[]): string {
    return courseTopicIds ? [...courseTopicIds].sort().join(',') : '';
  }

  it('sort makes the key order-independent', () => {
    expect(buildCourseKey(['c', 'a', 'b'])).toBe('a,b,c');
    expect(buildCourseKey(['b', 'a', 'c'])).toBe('a,b,c');
    expect(buildCourseKey(['a', 'b', 'c'])).toBe('a,b,c');
  });

  it('returns "" for undefined courseTopicIds', () => {
    expect(buildCourseKey(undefined)).toBe('');
  });

  it('returns "" for empty array', () => {
    expect(buildCourseKey([])).toBe('');
  });

  it('does not mutate the input (uses spread)', () => {
    const input = ['c', 'a', 'b'];
    buildCourseKey(input);
    expect(input).toEqual(['c', 'a', 'b']);
  });
});

// ── Listener bus runtime (replicated) ──────────────────────

describe('Invalidation listener bus runtime', () => {
  function makeBus() {
    const listeners = new Set<() => void>();
    function on(l: () => void) { listeners.add(l); return () => listeners.delete(l); }
    function notify() { for (const fn of listeners) fn(); }
    return { listeners, on, notify };
  }

  it('subscribe + notify fires the listener exactly once per notify', () => {
    const { on, notify } = makeBus();
    const fn = vi.fn();
    on(fn);
    notify();
    notify();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('unsubscribe stops further notifications', () => {
    const { on, notify } = makeBus();
    const fn = vi.fn();
    const off = on(fn);
    off();
    notify();
    expect(fn).not.toHaveBeenCalled();
  });

  it('multiple listeners all fire on notify', () => {
    const { on, notify } = makeBus();
    const a = vi.fn(), b = vi.fn(), c = vi.fn();
    on(a); on(b); on(c);
    notify();
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
    expect(c).toHaveBeenCalled();
  });

  it('Set dedups same-listener subscribed twice (single firing)', () => {
    const { on, notify } = makeBus();
    const fn = vi.fn();
    on(fn);
    on(fn);
    notify();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ── Source-level invariants (extended) ─────────────────────

describe('Source-level invariants (extended)', () => {
  it("cacheKey prefixes summary IDs with 's:'", () => {
    expect(source).toContain('return `s:${summaryId}`');
  });

  it("cacheKey prefixes topic IDs with 't:'", () => {
    expect(source).toContain('return `t:${topicId}`');
  });

  it('summaryId takes precedence over topicId in cacheKey', () => {
    expect(source).toMatch(/if\s*\(summaryId\)\s*return\s*`s:\$\{summaryId\}`[\s\S]{0,100}if\s*\(topicId\)\s*return\s*`t:\$\{topicId\}`/);
  });

  it('skipCustomNodes defaults to false (student view merges custom)', () => {
    expect(source).toMatch(/skipCustomNodes\s*=\s*false/);
  });

  it('courseKey takes priority over topicId/summaryId in fetchData', () => {
    // Source dispatch: courseKey → fetchGraphByCourse, summaryId →
    // fetchGraphBySummary, otherwise → fetchGraphByTopic
    expect(source).toMatch(/if\s*\(courseKey\)\s*\{[\s\S]{0,200}fetchGraphByCourse/);
    expect(source).toMatch(/else if\s*\(summaryId\)\s*\{[\s\S]{0,150}fetchGraphBySummary/);
    expect(source).toMatch(/else\s*\{[\s\S]{0,150}fetchGraphByTopic/);
  });

  it('skipCustomNodes branch only runs in topic scope (not course/summary)', () => {
    expect(source).toMatch(/if\s*\(topicId\s*&&\s*!skipCustomNodes\)/);
  });

  it('cache TTL is checked via Date.now() - entry.timestamp > CACHE_TTL', () => {
    expect(source).toMatch(/Date\.now\(\)\s*-\s*entry\.timestamp\s*>\s*CACHE_TTL/);
  });

  it('LRU promotion: getCached deletes + re-sets to move to end', () => {
    expect(source).toMatch(/cache\.delete\(key\)[\s\S]{0,150}cache\.set\(key,\s*entry\)/);
  });

  it('error fallback message is "Error al cargar grafo" (Spanish)', () => {
    expect(source).toContain('Error al cargar grafo');
  });

  it('hasSource gates the initial loading state', () => {
    expect(source).toContain('hasSource');
    expect(source).toMatch(/!!\(topicId\s*\|\|\s*summaryId\s*\|\|\s*\(courseTopicIds\s*&&\s*courseTopicIds\.length\s*>\s*0\)\)/);
  });

  it('refetch passes skipCache=true to fetchData', () => {
    expect(source).toMatch(/refetch[\s\S]{0,100}fetchData\(true\)/);
  });

  it('isEmpty derives from graphData?.nodes.length === 0', () => {
    expect(source).toMatch(/isEmpty[\s\S]{0,80}\.nodes\.length\s*===\s*0/);
  });
});
