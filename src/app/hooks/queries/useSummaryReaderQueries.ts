// ============================================================
// Axon — useSummaryReaderQueries
//
// Wraps the 4 initial data fetches of StudentSummaryReader (L4)
// with React Query caching:
//   1. Chunks (professor content, 10 min stale)
//   2. Keywords (professor content, 10 min stale)
//   3. Text Annotations (student data, 2 min stale)
//   4. Summary Blocks detection (professor content, 10 min stale)
//
// On-demand fetches (subtopics, kw-notes) stay imperative in
// the component because they depend on user interaction.
// ============================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import * as summariesApi from '@/app/services/summariesApi';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { Chunk, SummaryKeyword, SummaryBlock } from '@/app/services/summariesApi';
import type { TextAnnotation } from '@/app/services/studentSummariesApi';
import { extractItems } from '@/app/lib/api-helpers';
import { PROFESSOR_CONTENT_STALE, STUDENT_DATA_STALE } from './staleTimes';

// ── Hook ──────────────────────────────────────────────────

interface UseSummaryReaderResult {
  chunks: Chunk[];
  chunksLoading: boolean;
  keywords: SummaryKeyword[];
  keywordsLoading: boolean;
  textAnnotations: TextAnnotation[];
  annotationsLoading: boolean;
  hasBlocks: boolean;
  blocksLoading: boolean;
  /** Refetch annotations after create/update/delete */
  invalidateAnnotations: () => void;
}

export function useSummaryReaderQueries(summaryId: string): UseSummaryReaderResult {
  const queryClient = useQueryClient();

  // 1. Chunks
  const chunksQuery = useQuery({
    queryKey: queryKeys.summaryChunks(summaryId),
    queryFn: async () => {
      const result = await summariesApi.getChunks(summaryId);
      return extractItems<Chunk>(result)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    staleTime: PROFESSOR_CONTENT_STALE,
  });

  // 2. Keywords
  //    Cache stores ALL keywords (incl. inactive) so professor views
  //    (SummaryDetailView) can access the full set. Student consumers
  //    derive active-only via `select`.
  const keywordsQuery = useQuery({
    queryKey: queryKeys.summaryKeywords(summaryId),
    queryFn: async () => {
      const result = await summariesApi.getKeywords(summaryId);
      return extractItems<SummaryKeyword>(result);
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    select: (data) => data.filter(k => k.is_active !== false),
  });

  // 3. Text Annotations (student-created)
  const annotationsQuery = useQuery({
    queryKey: queryKeys.summaryAnnotations(summaryId),
    queryFn: async () => {
      const result = await studentApi.getTextAnnotations(summaryId);
      return extractItems<TextAnnotation>(result);
    },
    staleTime: STUDENT_DATA_STALE,
  });

  // 4. Blocks detection (cache stores full SummaryBlock[], select derives boolean)
  //    SummaryViewer reuses the same cache key to read the full array.
  const blocksQuery = useQuery({
    queryKey: queryKeys.summaryBlocks(summaryId),
    queryFn: async () => {
      const result = await summariesApi.getSummaryBlocks(summaryId);
      return extractItems<SummaryBlock>(result)
        .filter(b => b.is_active !== false)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    select: (blocks) => blocks.length > 0,
  });

  return {
    chunks: chunksQuery.data ?? [],
    chunksLoading: chunksQuery.isLoading,
    keywords: keywordsQuery.data ?? [],
    keywordsLoading: keywordsQuery.isLoading,
    textAnnotations: annotationsQuery.data ?? [],
    annotationsLoading: annotationsQuery.isLoading,
    hasBlocks: blocksQuery.data ?? false,
    blocksLoading: blocksQuery.isLoading,
    invalidateAnnotations: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.summaryAnnotations(summaryId) });
    },
  };
}