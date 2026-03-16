// ============================================================
// Axon — useGraphData hook
//
// Fetches and manages graph data for the knowledge mind map.
// Handles loading, error states, caching, and provides refetch.
//
// CACHING: Module-level FIFO cache keyed by topicId/summaryId.
// Prevents redundant API calls when navigating between cards
// in micro-session graphs (flashcard/quiz/summary panels).
// Cache TTL: 5 minutes. Max entries: 20. Evicts oldest on overflow.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
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
  return entry.data;
}

function setCache(key: string, data: GraphData): void {
  // Evict oldest if at max
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

function cacheKey(topicId?: string, summaryId?: string): string {
  return summaryId ? `s:${summaryId}` : `t:${topicId}`;
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
    return;
  }
  // Invalidate specific key
  if (summaryId) cache.delete(`s:${summaryId}`);
  if (topicId) cache.delete(`t:${topicId}`);
  // Also invalidate any course-level caches that include this topic
  for (const key of cache.keys()) {
    if (key.startsWith('c:') && topicId && key.includes(topicId)) {
      cache.delete(key);
    }
  }
}

// ── Hook ─────────────────────────────────────────────────

interface UseGraphDataOptions {
  topicId?: string;
  summaryId?: string;
  /** When provided, fetches the full course graph (all topics). Takes priority over topicId. */
  courseTopicIds?: string[];
}

interface UseGraphDataResult {
  graphData: GraphData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isEmpty: boolean;
}

export function useGraphData({ topicId, summaryId, courseTopicIds }: UseGraphDataOptions): UseGraphDataResult {
  const hasSource = !!(topicId || summaryId || (courseTopicIds && courseTopicIds.length > 0));
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(hasSource);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  // Stable key for courseTopicIds — sorted so order doesn't affect cache key
  const courseKey = courseTopicIds ? [...courseTopicIds].sort().join(',') : '';

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

      // Merge student's custom nodes/edges (topic scope only)
      if (topicId) {
        try {
          const custom = await fetchCustomGraph(topicId);
          if (custom.nodes.length > 0 || custom.edges.length > 0) {
            const existingIds = new Set(data.nodes.map(n => n.id));
            const mergedNodes = [
              ...data.nodes,
              ...custom.nodes.filter(n => !existingIds.has(n.id)),
            ];
            const existingEdgeIds = new Set(data.edges.map(e => e.id));
            const mergedEdges = [
              ...data.edges,
              ...custom.edges.filter(e => !existingEdgeIds.has(e.id)),
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
    } catch (e) {
      if (fetchId !== fetchIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Erro ao carregar grafo');
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [topicId, summaryId, courseKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // refetch always skips cache
  const refetch = useCallback(() => fetchData(true), [fetchData]);

  const isEmpty = graphData !== null && graphData.nodes.length === 0;

  return { graphData, loading, error, refetch, isEmpty };
}
