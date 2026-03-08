// ============================================================
// Axon — useKeywordMasteryQuery
//
// Shared React Query hook for keyword mastery data. Consolidates
// the duplicated fetch pattern from KeywordBadges.tsx and
// KeywordHighlighterInline.tsx into a single cached pipeline:
//
//   1. Keywords for a summary (shares cache with useSummaryReaderQueries)
//   2. Subtopics batch (H-1 FIX: 1 call via /subtopics-batch)
//   3. BKT states scoped (M-5 FIX: 1 call via /bkt-states?subtopic_ids=...)
//   4. Derived: mastery map (AVG p_know per keyword)
//
// Pipeline: Keywords → Subtopics batch (1 call) → BKT scoped (1 call)
// Total: 3 sequential queries vs previous N+2 (N parallel subtopics + 1 global BKT).
//
// Both consumers get identical data from cache — no duplicate
// API calls even when both mount for the same summaryId.
// ============================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useEffect } from 'react';
import { queryKeys } from './queryKeys';
import { apiCall } from '@/app/lib/api';
import * as summariesApi from '@/app/services/summariesApi';
import type { SummaryKeyword, Subtopic } from '@/app/services/summariesApi';
import {
  type BktState,
  getKeywordMastery,
} from '@/app/lib/mastery-helpers';
import { extractItems } from '@/app/lib/api-helpers';
import { PROFESSOR_CONTENT_STALE, STUDENT_BKT_STALE } from './staleTimes';

// ── Types ─────────────────────────────────────────────────

interface UseKeywordMasteryResult {
  /** Active keywords for this summary */
  keywords: SummaryKeyword[];
  keywordsLoading: boolean;
  /** Map<subtopic_id, BktState> — BKT data for mastery coloring */
  bktMap: Map<string, BktState>;
  /** Map<keyword_id, Subtopic[]> — subtopics per keyword */
  subtopicsMap: Map<string, Subtopic[]>;
  /** Map<keyword_id, mastery_number> — -1 = no data */
  keywordMasteryMap: Map<string, number>;
  /** True when keywords + BKT + subtopics are all resolved */
  dataReady: boolean;
}

// ── Serializable cache shape for subtopics batch ──────────

interface SubtopicsBatchEntry {
  keywordId: string;
  subtopics: Subtopic[];
}

// ── Hook ──────────────────────────────────────────────────

export function useKeywordMasteryQuery(
  summaryId: string,
): UseKeywordMasteryResult {
  const queryClient = useQueryClient();

  // ── Query 1: Keywords (shares cache key with useSummaryReaderQueries) ──
  //    Cache stores ALL keywords; select derives active-only for mastery.
  const keywordsQuery = useQuery({
    queryKey: queryKeys.summaryKeywords(summaryId),
    queryFn: async () => {
      const result = await summariesApi.getKeywords(summaryId);
      return extractItems<SummaryKeyword>(result);
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    select: (data) => data.filter((k) => k.is_active !== false),
  });

  const keywords = keywordsQuery.data ?? [];

  // ── Query 2: Subtopics batch (H-1 FIX: 1 call replaces N parallel) ──
  // Uses GET /subtopics-batch?keyword_ids=a,b,c → single SQL IN() query.
  // Falls back to N parallel calls if batch endpoint is unavailable (404).
  // Uses a ref to pass current keywords into queryFn without adding them
  // to the queryKey (the data is deterministic per summary).
  const keywordsRef = useRef<SummaryKeyword[]>([]);
  keywordsRef.current = keywords;

  const subtopicsBatchQuery = useQuery({
    queryKey: queryKeys.summaryKwSubtopics(summaryId),
    queryFn: async (): Promise<SubtopicsBatchEntry[]> => {
      const kws = keywordsRef.current;
      if (kws.length === 0) return [];

      // H-1 FIX: Try batch endpoint first (1 HTTP call for all keywords)
      try {
        const ids = kws.map((k) => k.id).join(',');
        const result = await apiCall<unknown>(
          `/subtopics-batch?keyword_ids=${ids}`,
        );
        const allSubs = extractItems<Subtopic>(result).filter(
          (s) => s.is_active !== false,
        );

        // Group flat array by keyword_id
        const byKeyword = new Map<string, Subtopic[]>();
        for (const kw of kws) byKeyword.set(kw.id, []);
        for (const sub of allSubs) {
          const list = byKeyword.get(sub.keyword_id);
          if (list) list.push(sub);
        }

        return kws.map((kw) => ({
          keywordId: kw.id,
          subtopics: byKeyword.get(kw.id) ?? [],
        }));
      } catch {
        // Fallback: N parallel calls (pre-H-1 backend or batch endpoint down)
        const results = await Promise.all(
          kws.map(async (kw) => {
            try {
              const r = await summariesApi.getSubtopics(kw.id);
              return {
                keywordId: kw.id,
                subtopics: extractItems<Subtopic>(r).filter(
                  (s) => s.is_active !== false,
                ),
              };
            } catch {
              return { keywordId: kw.id, subtopics: [] as Subtopic[] };
            }
          }),
        );
        return results;
      }
    },
    enabled: keywords.length > 0,
    staleTime: PROFESSOR_CONTENT_STALE,
  });

  // ── Derived: Subtopics map (keyword_id → Subtopic[]) ────
  const subtopicsMap = useMemo(() => {
    const map = new Map<string, Subtopic[]>();
    if (!subtopicsBatchQuery.data) return map;
    for (const entry of subtopicsBatchQuery.data) {
      map.set(entry.keywordId, entry.subtopics);
    }
    return map;
  }, [subtopicsBatchQuery.data]);

  // ── Derived: all subtopic IDs for scoped BKT fetch ──────
  const allSubtopicIds = useMemo(() => {
    if (!subtopicsBatchQuery.data) return [];
    return subtopicsBatchQuery.data.flatMap((e) =>
      e.subtopics.map((s) => s.id),
    );
  }, [subtopicsBatchQuery.data]);

  // ── Query 3: BKT states (M-5 FIX: scoped by subtopic_ids) ──
  // Uses GET /bkt-states?subtopic_ids=a,b,c → only relevant BKT states.
  // Falls back to global ?limit=500 if subtopic_ids filter fails (404).
  // Depends on subtopicsBatchQuery → sequential (not parallel).
  // Trade-off: 2 sequential calls (subtopics + BKT) vs 1 global + N parallel.
  // Net win: less server load, less data transfer, correctly scoped data.
  const subtopicIdsRef = useRef<string[]>([]);
  subtopicIdsRef.current = allSubtopicIds;

  const bktQuery = useQuery({
    queryKey: queryKeys.bktStates(summaryId),
    queryFn: async () => {
      const ids = subtopicIdsRef.current;
      if (ids.length === 0) return [];

      // M-5 FIX: Try scoped fetch first
      try {
        const idsParam = ids.join(',');
        const result = await apiCall<unknown>(
          `/bkt-states?subtopic_ids=${idsParam}&limit=500`,
        );
        return extractItems<BktState>(result);
      } catch {
        // Fallback: global fetch (pre-M-5 backend or scoped filter fails)
        const result = await apiCall<unknown>('/bkt-states?limit=500');
        return extractItems<BktState>(result);
      }
    },
    // Only fetch BKT after subtopics resolve (need subtopic_ids)
    enabled: allSubtopicIds.length > 0,
    staleTime: STUDENT_BKT_STALE,
  });

  // ── Derived: BKT map (subtopic_id → BktState) ──────────
  const bktMap = useMemo(() => {
    const map = new Map<string, BktState>();
    if (!bktQuery.data) return map;
    for (const b of bktQuery.data) {
      map.set(b.subtopic_id, b);
    }
    return map;
  }, [bktQuery.data]);

  // ── Cache seeding: populate individual kwSubtopics entries ──
  // When the batch resolves, seed each kwSubtopics(keywordId) cache
  // so KeywordPopup gets instant cache hits without redundant fetches.
  useEffect(() => {
    if (!subtopicsBatchQuery.data) return;
    for (const entry of subtopicsBatchQuery.data) {
      const sorted = [...entry.subtopics].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
      );
      queryClient.setQueryData(queryKeys.kwSubtopics(entry.keywordId), sorted);
    }
  }, [subtopicsBatchQuery.data, queryClient]);

  // ── Derived: Mastery map (keyword_id → number) ──────────
  const keywordMasteryMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const kw of keywords) {
      const subs = subtopicsMap.get(kw.id) || [];
      const bkts = subs
        .map((s) => bktMap.get(s.id))
        .filter((b): b is BktState => b != null);
      map.set(kw.id, getKeywordMastery(bkts));
    }
    return map;
  }, [keywords, subtopicsMap, bktMap]);

  // ── Data readiness ──────────────────────────────────────
  // Keywords loading OR (has keywords AND subtopics still loading)
  // OR (has subtopics AND BKT still loading)
  const dataReady =
    !keywordsQuery.isLoading &&
    (keywords.length === 0 || !subtopicsBatchQuery.isLoading) &&
    (allSubtopicIds.length === 0 || !bktQuery.isLoading);

  return {
    keywords,
    keywordsLoading: keywordsQuery.isLoading,
    bktMap,
    subtopicsMap,
    keywordMasteryMap,
    dataReady,
  };
}
