// ============================================================
// useFlashcardCoverage — Flashcard↔Topic FSRS aggregation via flashcard-mappings
//
// T-01: Completes the flashcard-mapping pipeline.
// NOTE: This is SEPARATE from useTopicMastery (BKT per-subtopic for plans/dashboard).
//       This hook aggregates FSRS scheduling data per keyword for the flashcard deck view.
//
// DATA FLOW:
//   flashcardMappingApi.getAllFlashcardMappings()
//     → Map<flashcard_id, { subtopic_id, keyword_id }>
//   useStudyQueueData.queue
//     → StudyQueueItem[] (FSRS data)
//   COMBINE → per-keyword aggregation with full FSRS stats
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAllFlashcardMappings } from '@/app/services/flashcardMappingApi';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';

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

export interface FlashcardCoverageData {
  mappingLookup: Map<string, { subtopic_id: string | null; keyword_id: string }>;
  keywordStats: Map<string, KeywordFsrsStats>;
  loading: boolean;
  fallback: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

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
    .then((result) => { _mappingCache = result; _mappingFetchedAt = Date.now(); _mappingInflight = null; return result; })
    .catch((err) => { _mappingInflight = null; throw err; });
  return _mappingInflight;
}

function buildKeywordStats(mapping: MappingCache, queue: StudyQueueItem[]): Map<string, KeywordFsrsStats> {
  const now = new Date();
  const totalByKeyword = new Map<string, number>();
  for (const { keyword_id } of mapping.values()) {
    totalByKeyword.set(keyword_id, (totalByKeyword.get(keyword_id) ?? 0) + 1);
  }
  const accum = new Map<string, { scheduled: number; due: number; new_: number; sumPKnow: number; sumStability: number; sumDifficulty: number }>();
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

export function useFlashcardCoverage(queue: StudyQueueItem[], sqLoading: boolean): FlashcardCoverageData {
  const [mappingLookup, setMappingLookup] = useState<MappingCache>(new Map());
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const fetchMapping = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await fetchMappingCached();
      if (mountedRef.current) { setMappingLookup(result); setFallback(false); }
    } catch (err: unknown) {
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch flashcard mappings';
        setError(msg); setFallback(true);
        const fallbackMap: MappingCache = new Map();
        for (const item of queue) { fallbackMap.set(item.flashcard_id, { subtopic_id: item.subtopic_id, keyword_id: item.keyword_id }); }
        setMappingLookup(fallbackMap);
        if (import.meta.env.DEV) console.warn('[useFlashcardCoverage] Mapping fetch failed, using study-queue fallback:', msg);
      }
    } finally { if (mountedRef.current) setLoading(false); }
  }, [queue]);

  // eslint-disable-next-line react-hooks/exhaustive-deps — mount-only fetch; fetchMapping depends on queue which triggers its own refresh cycle
  useEffect(() => { fetchMapping(); }, []);

  const keywordStats = useMemo(() => buildKeywordStats(mappingLookup, queue), [mappingLookup, queue]);

  const refresh = useCallback(async () => { _mappingCache = null; _mappingFetchedAt = 0; await fetchMapping(); }, [fetchMapping]);

  return { mappingLookup, keywordStats, loading: loading || sqLoading, fallback, error, refresh };
}
