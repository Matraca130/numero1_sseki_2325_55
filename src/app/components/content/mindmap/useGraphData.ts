// ============================================================
// Axon — useGraphData hook
//
// Fetches and manages graph data for the knowledge mind map.
// Handles loading, error states, caching, and provides refetch.
//
// CACHING: Module-level LRU cache keyed by topicId/summaryId.
// Prevents redundant API calls when navigating between cards
// in micro-session graphs (flashcard/quiz/summary panels).
// Cache TTL: 5 minutes. Max entries: 20. Evicts least-recently-used on overflow.
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchGraphByTopic, fetchGraphBySummary, fetchGraphByCourse, fetchCustomGraph } from '@/app/services/mindmapApi';
import type { GraphData } from '@/app/types/mindmap';

// ── Module-level cache ────────────────────────────────────

interface CacheEntry {
  data: GraphData;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX = 20;
const cache = new Map<string, CacheEntry>();

function getCached(key: string): GraphData | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  // LRU: move to end so it's the most-recently-used entry
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function setCache(key: string, data: GraphData): void {
  // Delete first so re-set moves key to end of insertion order (LRU correctness)
  cache.delete(key);
  // Evict least-recently-used if at max
  if (cache.size >= CACHE_MAX) {
    const lru = cache.keys().next().value;
    if (lru) cache.delete(lru);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

function cacheKey(topicId?: string, summaryId?: string): string {
  if (summaryId) return `s:${summaryId}`;
  if (topicId) return `t:${topicId}`;
  return ''; // empty key — will not be cached
}

// ── Invalidation event bus ────────────────────────────────
// Allows mounted useGraphData instances to auto-refetch when
// cache is invalidated (e.g. after quiz/flashcard completion).

type InvalidationListener = () => void;
const listeners = new Set<InvalidationListener>();

/** Subscribe to cache invalidation events. Returns unsubscribe fn. */
export function onGraphCacheInvalidation(listener: InvalidationListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function notifyInvalidation(): void {
  for (const fn of listeners) fn();
}

/**
 * Invalidate cached graph data.
 * Call after quiz/flashcard completion so the next graph render
 * fetches fresh mastery data from the backend.
 *
 * @param topicId  — invalidate a specific topic (and all course caches)
 * @param summaryId — invalidate a specific summary
 * If neither is provided, clears the entire cache.
 */
export function invalidateGraphCache(topicId?: string, summaryId?: string): void {
  if (!topicId && !summaryId) {
    cache.clear();
    notifyInvalidation();
    return;
  }
  if (topicId) {
    // Invalidate specific topic + summary keys
    cache.delete(`t:${topicId}`);
    if (summaryId) cache.delete(`s:${summaryId}`);
    // Also invalidate any course-level caches that include this topic.
    // Course keys are comma-separated sorted IDs prefixed with "c:".
    for (const key of cache.keys()) {
      if (!key.startsWith('c:')) continue;
      const ids = key.slice(2).split(',');
      if (ids.includes(topicId)) {
        cache.delete(key);
      }
    }
  } else if (summaryId) {
    // Only summaryId provided (no topicId) — invalidate the specific
    // summary key. Course-level caches may be stale but will refresh
    // on next fetch via TTL; this avoids nuking the entire cache.
    cache.delete(`s:${summaryId}`);
  } else {
    // No identifiers provided — clear entire cache as fallback.
    cache.clear();
  }
  notifyInvalidation();
}

// ── Hook ─────────────────────────────────────────────────

interface UseGraphDataOptions {
  topicId?: string;
  summaryId?: string;
  /** When provided, fetches the full course graph (all topics). Takes priority over topicId. */
  courseTopicIds?: string[];
  /** Skip merging student custom nodes (e.g. for professor view). Default: false */
  skipCustomNodes?: boolean;
}

interface UseGraphDataResult {
  graphData: GraphData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isEmpty: boolean;
}

export function useGraphData({ topicId, summaryId, courseTopicIds, skipCustomNodes = false }: UseGraphDataOptions): UseGraphDataResult {
  const hasSource = !!(topicId || summaryId || (courseTopicIds && courseTopicIds.length > 0));
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(hasSource);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  // Stable key for courseTopicIds — sorted so order doesn't affect cache key
  const courseKey = useMemo(
    () => courseTopicIds ? [...courseTopicIds].sort().join(',') : '',
    [courseTopicIds],
  );

  const fetchData = useCallback(async (skipCache = false) => {
    if (!topicId && !summaryId && !courseKey) {
      setLoading(false);
      return;
    }

    const key = courseKey ? `c:${courseKey}` : cacheKey(topicId, summaryId);

    // Check cache first (unless explicit refetch)
    if (!skipCache) {
      const cached = getCached(key);
      if (cached) {
        setGraphData(cached);
        setLoading(false);
        setError(null);
        return;
      }
    }

    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      let data: GraphData;
      if (courseKey) {
        data = await fetchGraphByCourse(courseKey.split(','));
      } else if (summaryId) {
        data = await fetchGraphBySummary(summaryId);
      } else {
        data = await fetchGraphByTopic(topicId!);
      }

      // Stale request guard (check after first await)
      if (fetchId !== fetchIdRef.current) return;

      // Merge student's custom nodes/edges (topic scope only, skip for professor view)
      if (topicId && !skipCustomNodes) {
        try {
          const custom = await fetchCustomGraph(topicId);
          // Stale request guard (check after second await)
          if (fetchId !== fetchIdRef.current) return;
          if (custom.nodes.length > 0 || custom.edges.length > 0) {
            const existingIds = new Set(data.nodes.map(n => n.id));
            const mergedNodes = [
              ...data.nodes,
              ...custom.nodes.filter(n => !existingIds.has(n.id)),
            ];
            // Build full node set for edge validation (prevents orphan edges)
            const allNodeIds = new Set(mergedNodes.map(n => n.id));
            const existingEdgeIds = new Set(data.edges.map(e => e.id));
            const mergedEdges = [
              ...data.edges,
              ...custom.edges.filter(e =>
                !existingEdgeIds.has(e.id) &&
                allNodeIds.has(e.source) &&
                allNodeIds.has(e.target)
              ),
            ];
            data = { nodes: mergedNodes, edges: mergedEdges };
          }
        } catch {
          // Custom graph fetch failed — continue with auto-generated data only
        }
      }

      // Stale request guard
      if (fetchId !== fetchIdRef.current) return;

      setCache(key, data);
      setGraphData(data);
    } catch (e: unknown) {
      if (fetchId !== fetchIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Error al cargar grafo');
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [topicId, summaryId, courseKey, skipCustomNodes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stable ref for fetchData to avoid subscription churn on topic changes
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  // Auto-refetch when cache is invalidated externally
  // (e.g. after quiz/flashcard completion in another view)
  useEffect(() => {
    if (!hasSource) return;
    return onGraphCacheInvalidation(() => { fetchDataRef.current(true); });
  }, [hasSource]);

  // refetch always skips cache
  const refetch = useCallback(() => fetchData(true), [fetchData]);

  const isEmpty = graphData !== null && graphData.nodes.length === 0;

  return { graphData, loading, error, refetch, isEmpty };
}
