// ============================================================
// useTopicMastery — Flashcard↔Topic FSRS aggregation via flashcard-mappings
//
// T-01: Completes the flashcard-mapping pipeline.
//
// PURPOSE:
//   Provides a global flashcard_id → keyword_id/subtopic_id lookup
//   and aggregates FSRS scheduling data per keyword/topic.
//
// DATA FLOW:
//   flashcardMappingApi.getAllFlashcardMappings()
//     → Map<flashcard_id, { subtopic_id, keyword_id }>   (lightweight, no content)
//   useStudyQueueData.queue
//     → StudyQueueItem[] (has FSRS data: stability, difficulty, due_at, p_know)
//   COMBINE → per-keyword aggregation with full FSRS stats
//
// CONSUMERS:
//   useFlashcardNavigation (enriches topic sections with mastery)
//   Any component needing "coverage % for this keyword"
//
// SAFETY:
//   - Read-only. Zero mutations.
//   - Graceful degradation: if /flashcard-mappings fails, falls back to study-queue-only data.
//   - Cached per session (mapping rarely changes mid-session).
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAllFlashcardMappings } from '@/app/services/flashcardMappingApi';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';

// ── Types ─────────────────────────────────────────────────────

export interface KeywordFsrsStats {
  keyword_id: string;
  totalCards: number;
  scheduledCards: number;
  dueCards: number;
  newCards: number;
  avgPKnow: number;
  avgStability: number;
  avgDifficulty: number;
  coverage: number;
}

export interface TopicMasteryData {
  mappingLookup: Map<string, { subtopic_id: string | null; keyword_id: string }>;
  keywordStats: Map<string, KeywordFsrsStats>;
  loading: boolean;
  fallback: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ── Module-level cache ────────────────────────────────────────

type MappingCache = Map<string, { subtopic_id: string | null; keyword_id: string }>;

let _mappingCache: MappingCache | null = null;
let _mappingFetchedAt = 0;
let _mappingInflight: Promise<MappingCache> | null = null;

const MAPPING_CACHE_TTL_MS = 300_000;

function isMappingCacheValid(): boolean {
  return _mappingCache !== null && Date.now() - _mappingFetchedAt < MAPPING_CACHE_TTL_MS;
}

async function fetchMappingCached(): Promise<MappingCache> {
  if (isMappingCacheValid()) return _mappingCache!;
  if (_mappingInflight) return _mappingInflight;

  _mappingInflight = getAllFlashcardMappings()
    .then((result) => {
      _mappingCache = result;
      _mappingFetchedAt = Date.now();
      _mappingInflight = null;
      return result;
    })
    .catch((err) => {
      _mappingInflight = null;
      throw err;
    });

  return _mappingInflight;
}

// ── Build keyword stats ───────────────────────────────────────

function buildKeywordStats(
  mapping: MappingCache,
  queue: StudyQueueItem[],
): Map<string, KeywordFsrsStats> {
  const now = new Date();

  const totalByKeyword = new Map<string, number>();
  for (const { keyword_id } of mapping.values()) {
    totalByKeyword.set(keyword_id, (totalByKeyword.get(keyword_id) ?? 0) + 1);
  }

  const accum = new Map<string, {
    scheduled: number; due: number; new_: number;
    sumPKnow: number; sumStability: number; sumDifficulty: number;
  }>();

  for (const item of queue) {
    const kwId = item.keyword_id;
    if (!kwId) continue;
    let a = accum.get(kwId);
    if (!a) { a = { scheduled: 0, due: 0, new_: 0, sumPKnow: 0, sumStability: 0, sumDifficulty: 0 }; accum.set(kwId, a); }
    a.scheduled++;
    a.sumPKnow += item.p_know;
    a.sumStability += item.stability;
    a.sumDifficulty += item.difficulty;
    if (item.is_new || item.fsrs_state === 'new') a.new_++;
    if (item.due_at && new Date(item.due_at) <= now) a.due++;
  }

  const allKeywordIds = new Set([...totalByKeyword.keys(), ...accum.keys()]);
  const result = new Map<string, KeywordFsrsStats>();

  for (const kwId of allKeywordIds) {
    const total = totalByKeyword.get(kwId) ?? 0;
    const a = accum.get(kwId);
    const scheduled = a?.scheduled ?? 0;
    result.set(kwId, {
      keyword_id: kwId,
      totalCards: Math.max(total, scheduled),
      scheduledCards: scheduled,
      dueCards: a?.due ?? 0,
      newCards: a?.new_ ?? 0,
      avgPKnow: scheduled > 0 ? a!.sumPKnow / scheduled : 0,
      avgStability: scheduled > 0 ? a!.sumStability / scheduled : 0,
      avgDifficulty: scheduled > 0 ? a!.sumDifficulty / scheduled : 0,
      coverage: total > 0 ? Math.min(scheduled / total, 1) : 0,
    });
  }

  return result;
}

// ── Hook ──────────────────────────────────────────────────────

export function useTopicMastery(
  queue: StudyQueueItem[],
  sqLoading: boolean,
): TopicMasteryData {
  const [mappingLookup, setMappingLookup] = useState<MappingCache>(new Map());
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchMapping = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMappingCached();
      if (mountedRef.current) { setMappingLookup(result); setFallback(false); }
    } catch (err: unknown) {
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch flashcard mappings';
        setError(msg);
        setFallback(true);
        const fallbackMap: MappingCache = new Map();
        for (const item of queue) {
          fallbackMap.set(item.flashcard_id, { subtopic_id: item.subtopic_id, keyword_id: item.keyword_id });
        }
        setMappingLookup(fallbackMap);
        if (import.meta.env.DEV) console.warn('[useTopicMastery] Mapping fetch failed, using study-queue fallback:', msg);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [queue]);

  useEffect(() => { fetchMapping(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const keywordStats = useMemo(
    () => buildKeywordStats(mappingLookup, queue),
    [mappingLookup, queue],
  );

  const refresh = useCallback(async () => {
    _mappingCache = null;
    _mappingFetchedAt = 0;
    await fetchMapping();
  }, [fetchMapping]);

  return { mappingLookup, keywordStats, loading: loading || sqLoading, fallback, error, refresh };
}
