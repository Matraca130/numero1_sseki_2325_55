// ============================================================
// useStudyQueueData — Shared study-queue data provider
//
// PROBLEM (pre-v4.4.1):
//   useFlashcardNavigation, useKeywordMasteryQuery, useTopicProgress
//   each fetched GET /study-queue?course_id=xxx&limit=9999
//   independently — tripling bandwidth and backend load.
//
// SOLUTION:
//   Single shared hook that fetches once per course, with:
//   - In-flight request deduplication (same courseId = same promise)
//   - Configurable TTL cache (default 60s stale-while-revalidate)
//   - AbortController for cleanup on unmount / course change
//
// CONSUMERS:
//   useFlashcardNavigation -> masteryMap (flashcard_id -> item)
//   useKeywordMasteryQuery -> keyword grouping from same data
//   useTopicProgress       -> topic aggregation from same data
//
// FIX v4.4.2: Added applyOptimisticBatch() so callers can merge
// locally-computed FSRS/BKT updates into the queue without waiting
// for a backend round-trip. The next refresh() overwrites with
// authoritative backend data.
//
// PERF v4.4.3:
//   [L5] load() no longer depends on queue.length (uses ref).
//        Prevents cascading callback re-creation in consumers.
//
// PERF v4.4.4:
//   [PN-10] applyOptimisticBatch uses queueRef (no [queue] dep).
//   [PN-13] Removed dead pagination loop (backend returns all in one request).
//
// SECURITY (#748):
//   The module-level cache used to be keyed only by `courseId`. The JS
//   module survives logout, so if user A logged out and user B logged in
//   within the 60s TTL, user B was served user A's personalized queue —
//   FSRS states, p_know, due_at — leaking private learning data between
//   users. The cache is now keyed by `${userId}:${courseId}` and the
//   hook reads `userId` from useAuth(); if no user is authenticated, the
//   hook short-circuits (no fetch, no cache, local state cleared).
//
// SCALABILITY:
//   100K users x 2000 cards = fetched in a single request currently.
//   When backend supports offset pagination, implement chunked fetch here.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { getStudyQueue } from '@/app/lib/studyQueueApi';
import type { StudyQueueItem, StudyQueueMeta } from '@/app/lib/studyQueueApi';
import { useAuth } from '@/app/context/AuthContext';

// ── Module-level cache (shared across hook instances) ─────

interface CacheEntry {
  userId: string;
  courseId: string;
  queue: StudyQueueItem[];
  meta: StudyQueueMeta | null;
  fetchedAt: number;
}

/** TTL in ms — data older than this triggers a background refresh */
const CACHE_TTL_MS = 60_000; // 60 seconds

/** Sentinel: pass as courseId to fetch ALL courses (no course_id filter) */
export const STUDY_QUEUE_ALL_COURSES = '__all__';

/** Page size for future paginated fetching */
const PAGE_SIZE = 200;

/**
 * Cache key shape: `${userId}:${courseId}`.
 * Keying by userId is REQUIRED for the security fix in #748 — without
 * userId in the key, a logout→login within the TTL would serve the
 * previous user's personalized FSRS/BKT data to the new user.
 */
function makeCacheKey(userId: string, courseId: string): string {
  return `${userId}:${courseId}`;
}

const _cache = new Map<string, CacheEntry>();
const _inflight = new Map<string, Promise<CacheEntry>>();

function isCacheValid(userId: string, courseId: string): boolean {
  const entry = _cache.get(makeCacheKey(userId, courseId));
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

/**
 * Fetch all study-queue items for a (user, course) pair.
 * Deduplicates in-flight requests for the same key.
 *
 * PN-13: Removed dead pagination loop. Backend currently returns all items
 * in a single response. When offset pagination is supported, re-implement
 * chunked fetching here.
 */
async function fetchStudyQueue(
  userId: string,
  courseId: string,
  signal?: AbortSignal,
): Promise<CacheEntry> {
  const key = makeCacheKey(userId, courseId);

  // Deduplicate: if same (user, course) is already in-flight, reuse
  const existing = _inflight.get(key);
  if (existing) return existing;

  const doFetch = async (): Promise<CacheEntry> => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const resp = await getStudyQueue({
      course_id: courseId === STUDY_QUEUE_ALL_COURSES ? undefined : courseId,
      limit: PAGE_SIZE,
      include_future: true,
    });

    const allItems = resp.queue || [];
    const meta = resp.meta || null;

    // TODO: When backend supports offset pagination, implement chunked
    // fetching here (loop while items.length === PAGE_SIZE).

    const entry: CacheEntry = {
      userId,
      courseId,
      queue: allItems,
      meta,
      fetchedAt: Date.now(),
    };

    _cache.set(key, entry);
    return entry;
  };

  const promise = doFetch().finally(() => {
    _inflight.delete(key);
  });
  _inflight.set(key, promise);

  return promise;
}

// ── Public: invalidate cache (after review session) ───────

/**
 * Clears the entire study-queue cache. Used by callers like
 * `refreshMastery` in useFlashcardNavigation that want to force a full
 * refetch after a review session. Nuking-all is correct here because the
 * intent is "invalidate all stale data we may have"; per-user scoping is
 * not required for this code path (the active session reloads its own
 * key immediately).
 */
export function invalidateStudyQueueCache(): void {
  _cache.clear();
  _inflight.clear();
}

// ── Hook return type ──────────────────────────────────

export interface StudyQueueData {
  queue: StudyQueueItem[];
  meta: StudyQueueMeta | null;
  byFlashcardId: Map<string, StudyQueueItem>;
  byKeywordId: Map<string, StudyQueueItem[]>;
  bySummaryId: Map<string, StudyQueueItem[]>;
  loading: boolean;
  refresh: () => Promise<void>;
  applyOptimisticBatch: (updates: StudyQueueItem[]) => void;
}

// ── Hook ──────────────────────────────────────────────

export function useStudyQueueData(courseId: string | null): StudyQueueData {
  // SECURITY (#748): cache is scoped by userId so a logout→login within
  // the TTL cannot serve the previous user's personalized queue.
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [queue, setQueue] = useState<StudyQueueItem[]>([]);
  const [meta, setMeta] = useState<StudyQueueMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const loadedKeyRef = useRef<string | null>(null);
  // [L5] Ref to track if queue has been populated, avoids queue.length in load deps
  const queuePopulatedRef = useRef(false);
  // [PN-10] Ref mirror of queue for use in stable callbacks
  const queueRef = useRef<StudyQueueItem[]>([]);
  queueRef.current = queue;

  // PN-10: catch(err:any) -> catch(err:unknown)
  const load = useCallback(async (forceRefresh = false) => {
    // SECURITY (#748): if there is no authenticated user OR no course,
    // clear local state and skip the fetch. Without this, a logout would
    // leave the previous user's queue in local state until next render.
    if (!userId || !courseId) {
      setQueue([]);
      setMeta(null);
      loadedKeyRef.current = null;
      queuePopulatedRef.current = false;
      return;
    }

    const cacheKey = makeCacheKey(userId, courseId);

    // Use cache if valid and not forced
    if (!forceRefresh && isCacheValid(userId, courseId)) {
      const cached = _cache.get(cacheKey);
      if (cached && (loadedKeyRef.current !== cacheKey || !queuePopulatedRef.current)) {
        setQueue(cached.queue);
        setMeta(cached.meta);
        loadedKeyRef.current = cacheKey;
        queuePopulatedRef.current = cached.queue.length > 0;
      }
      return;
    }

    // Abort previous in-flight request if course/user changed
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const entry = await fetchStudyQueue(userId, courseId, controller.signal);
      if (mountedRef.current && !controller.signal.aborted) {
        setQueue(entry.queue);
        setMeta(entry.meta);
        loadedKeyRef.current = cacheKey;
        queuePopulatedRef.current = entry.queue.length > 0;
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Expected: request was cancelled
      } else if (import.meta.env.DEV) {
        console.error('[useStudyQueueData] fetch error:', err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, courseId]);

  const refresh = useCallback(async () => {
    invalidateStudyQueueCache();
    await load(true);
  }, [load]);

  // Auto-fetch on (userId, courseId) change.
  // SECURITY (#748): userId MUST be in the deps so a user switch on a
  // mounted hook (e.g. logout→login) re-runs the load and clears stale
  // local state. Without this, React would keep showing the previous
  // user's queue.
  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [userId, courseId]); // [L5] queue.length REMOVED from deps

  // ── Derived indexes (O(n) once, O(1) lookups) ──────────

  const byFlashcardId = useRef(new Map<string, StudyQueueItem>());
  const byKeywordId = useRef(new Map<string, StudyQueueItem[]>());
  const bySummaryId = useRef(new Map<string, StudyQueueItem[]>());
  const lastQueueRef = useRef<StudyQueueItem[]>([]);

  // Rebuild indexes only when queue reference changes
  if (queue !== lastQueueRef.current) {
    lastQueueRef.current = queue;

    const fcMap = new Map<string, StudyQueueItem>();
    const kwMap = new Map<string, StudyQueueItem[]>();
    const smMap = new Map<string, StudyQueueItem[]>();

    for (const item of queue) {
      fcMap.set(item.flashcard_id, item);

      if (item.keyword_id) {
        const list = kwMap.get(item.keyword_id);
        if (list) list.push(item);
        else kwMap.set(item.keyword_id, [item]);
      }

      if (item.summary_id) {
        const list = smMap.get(item.summary_id);
        if (list) list.push(item);
        else smMap.set(item.summary_id, [item]);
      }
    }

    byFlashcardId.current = fcMap;
    byKeywordId.current = kwMap;
    bySummaryId.current = smMap;
  }

  // PN-10: Uses queueRef instead of queue in closure -> stable [] deps
  const applyOptimisticBatch = useCallback((updates: StudyQueueItem[]) => {
    const currentQueue = queueRef.current;
    const newQueue = [...currentQueue];
    const updateMap = new Map<string, StudyQueueItem>();

    for (const update of updates) {
      updateMap.set(update.flashcard_id, update);
    }

    // Replace existing items in-place
    const matched = new Set<string>();
    for (let i = 0; i < newQueue.length; i++) {
      const item = newQueue[i];
      const update = updateMap.get(item.flashcard_id);
      if (update) {
        newQueue[i] = update;
        matched.add(item.flashcard_id);
      }
    }

    // Append items that had no existing entry (new cards first review)
    for (const [fid, update] of updateMap) {
      if (!matched.has(fid)) {
        newQueue.push(update);
      }
    }

    setQueue(newQueue);
  }, []); // PN-10: Empty deps! Uses queueRef for current queue value.

  return {
    queue,
    meta,
    byFlashcardId: byFlashcardId.current,
    byKeywordId: byKeywordId.current,
    bySummaryId: bySummaryId.current,
    loading,
    refresh,
    applyOptimisticBatch,
  };
}
