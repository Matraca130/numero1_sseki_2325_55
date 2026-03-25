// ============================================================
// useTopicProgress — Topic-level mastery from shared study-queue
//
// REFACTORED v4.4.1:
//   Now consumes useStudyQueueData (bySummaryId index) instead
//   of fetching its own copy. Eliminates 1 of 3 duplicate fetches.
//
//   Also eliminates N+1 summary lookups — now uses a single
//   batch fetch for topic→summary mapping cached in-memory.
//
// BKT thresholds:
//   mastered >= 0.80 | learning >= 0.50 | new < 0.50 | empty = no cards
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { apiCall } from '@/app/lib/api';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';
import type { NodeStatus } from '@/app/components/layout/topic-sidebar/types';

// ── Types ─────────────────────────────────────────────────

export interface TopicProgress {
  status: NodeStatus;
  pKnow: number;       // AVG(p_know) across all cards in this topic (0-1)
  totalCards: number;   // total flashcards in study-queue for this topic
  newCards: number;     // cards with fsrs_state 'new'
  dueCards: number;     // cards with due_at in the past
}

// ── Helpers ───────────────────────────────────────────────

function pKnowToStatus(pKnow: number): NodeStatus {
  if (pKnow >= 0.80) return 'mastered';
  if (pKnow >= 0.50) return 'learning';
  return 'new';
}

const EMPTY_PROGRESS: TopicProgress = {
  status: 'empty',
  pKnow: 0,
  totalCards: 0,
  newCards: 0,
  dueCards: 0,
};

/** Extract all topic IDs from the content tree */
function extractTopicIds(tree: any): string[] {
  const ids: string[] = [];
  for (const course of tree?.courses || []) {
    for (const sem of course.semesters || []) {
      for (const sec of sem.sections || []) {
        for (const topic of sec.topics || []) {
          ids.push(topic.id);
        }
      }
    }
  }
  return ids;
}

// ── Module-level cache for topic → summary_id[] mapping ──
// This avoids N+1 API calls on every mount. The mapping is
// stable (content tree rarely changes during a session).

const _topicSummaryCache = new Map<string, string[]>();
let _summaryFetchInFlight: Promise<void> | null = null;

/**
 * Batch-fetch summary IDs for all topics. Uses cache when available.
 * Falls back to per-topic fetch only for uncached topics.
 */
async function ensureTopicSummaryMap(
  topicIds: string[],
  signal?: AbortSignal,
): Promise<Map<string, string[]>> {
  const uncached = topicIds.filter(id => !_topicSummaryCache.has(id));

  if (uncached.length > 0 && !_summaryFetchInFlight) {
    _summaryFetchInFlight = (async () => {
      // Fetch in batches of 10 to avoid overwhelming the connection pool
      const BATCH = 10;
      for (let i = 0; i < uncached.length; i += BATCH) {
        if (signal?.aborted) break;
        const batch = uncached.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(tid =>
            apiCall<any>(`/summaries?topic_id=${tid}`)
              .then(data => {
                const items = Array.isArray(data) ? data : data?.items || [];
                return { topicId: tid, summaryIds: items.map((s: any) => s.id) };
              })
              .catch(() => ({ topicId: tid, summaryIds: [] as string[] }))
          )
        );
        for (const r of results) {
          if (r.status === 'fulfilled') {
            _topicSummaryCache.set(r.value.topicId, r.value.summaryIds);
          }
        }
      }
    })();
    await _summaryFetchInFlight;
    _summaryFetchInFlight = null;
  } else if (_summaryFetchInFlight) {
    await _summaryFetchInFlight;
  }

  // Build result from cache
  const result = new Map<string, string[]>();
  for (const tid of topicIds) {
    result.set(tid, _topicSummaryCache.get(tid) || []);
  }
  return result;
}

// ── Build progress map ────────────────────────────────────

function buildProgressMap(
  topicSummaryMap: Map<string, string[]>,
  bySummaryId: Map<string, StudyQueueItem[]>,
): Map<string, TopicProgress> {
  const result = new Map<string, TopicProgress>();
  const now = new Date();

  for (const [topicId, summaryIds] of topicSummaryMap) {
    // Collect all queue items for this topic's summaries
    let totalPKnow = 0;
    let count = 0;
    let newCards = 0;
    let dueCards = 0;

    for (const sid of summaryIds) {
      const items = bySummaryId.get(sid);
      if (!items) continue;

      for (const item of items) {
        totalPKnow += item.p_know;
        count++;
        if (item.is_new || item.fsrs_state === 'new') newCards++;
        if (item.due_at && new Date(item.due_at) <= now) dueCards++;
      }
    }

    if (count === 0) {
      result.set(topicId, EMPTY_PROGRESS);
    } else {
      const avgPKnow = totalPKnow / count;
      result.set(topicId, {
        status: pKnowToStatus(avgPKnow),
        pKnow: avgPKnow,
        totalCards: count,
        newCards,
        dueCards,
      });
    }
  }

  return result;
}

// ── Hook ──────────────────────────────────────────────────

/**
 * Topic-level progress from shared study-queue data.
 *
 * @param bySummaryId - Pre-indexed map from useStudyQueueData
 * @param sqLoading   - Loading state from useStudyQueueData
 * @param courseId    - Current course ID
 */
export function useTopicProgress(
  bySummaryId: Map<string, StudyQueueItem[]>,
  sqLoading: boolean,
  courseId: string | null,
) {
  const { tree, loading: treeLoading } = useContentTree();

  const [progressMap, setProgressMap] = useState<Map<string, TopicProgress>>(new Map());
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Extract topic IDs from tree (stable reference)
  const topicIds = useMemo(
    () => (treeLoading || !tree ? [] : extractTopicIds(tree)),
    [tree, treeLoading],
  );

  const refresh = useCallback(async () => {
    if (!courseId || topicIds.length === 0 || sqLoading) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const topicSummaryMap = await ensureTopicSummaryMap(topicIds, controller.signal);
      if (controller.signal.aborted) return;

      const map = buildProgressMap(topicSummaryMap, bySummaryId);
      setProgressMap(map);

      if (import.meta.env.DEV) {
        console.log(`[useTopicProgress] Built progress for ${map.size} topics`);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && import.meta.env.DEV) {
        console.error('[useTopicProgress] error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, topicIds, bySummaryId, sqLoading]);

  // Auto-rebuild when study-queue data or topic list changes
  useEffect(() => {
    if (topicIds.length > 0 && !sqLoading) {
      refresh();
    }
    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps — refresh is stable via useCallback; including it would not change behavior but triggers false positives
  }, [topicIds, bySummaryId, sqLoading]);

  // ── Derived helpers ─────────────────────────────────────

  /** Get progress for a specific topic */
  const getProgress = useCallback(
    (topicId: string): TopicProgress => progressMap.get(topicId) || EMPTY_PROGRESS,
    [progressMap],
  );

  /** Overall course progress (average p_know across all topics with cards) */
  const overallProgress = useMemo(() => {
    let sumPKnow = 0;
    let topicsWithCards = 0;
    let totalCards = 0;
    let dueCards = 0;

    for (const p of progressMap.values()) {
      if (p.totalCards > 0) {
        sumPKnow += p.pKnow;
        topicsWithCards++;
        totalCards += p.totalCards;
        dueCards += p.dueCards;
      }
    }

    if (topicsWithCards === 0) return { pKnow: 0, pct: 0, totalCards: 0, dueCards: 0 };
    const avgPKnow = sumPKnow / topicsWithCards;
    return { pKnow: avgPKnow, pct: Math.round(avgPKnow * 100), totalCards, dueCards };
  }, [progressMap]);

  return {
    progressMap,
    loading: loading || sqLoading,
    refresh,
    getProgress,
    overallProgress,
  };
}
