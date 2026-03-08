// ============================================================
// Axon — useSummaryViewQueries
//
// React Query hooks for the SummaryView component. Replaces
// 4 manual useState/useEffect fetch patterns:
//
//   1. useTopicSummariesQuery — summaries list per topic
//   2. useSummaryChunksQuery  — chunks (SHARED cache with
//                               useSummaryReaderQueries)
//   3. useReadingStateQuery   — student reading progress
//   4. useSummaryAnnotationsQuery — student text annotations
//                               (SHARED cache with
//                               useSummaryReaderQueries)
//   5. useToggleCompletedMutation — mark/unmark read
//
// Cache sharing: chunks & annotations use the same queryKeys
// as useSummaryReaderQueries → navigating between SummaryView
// and StudentSummaryReader produces instant cache hits.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import { PROFESSOR_CONTENT_STALE, STUDENT_DATA_STALE } from './staleTimes';
import * as summariesApi from '@/app/services/summariesApi';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { Summary, Chunk } from '@/app/services/summariesApi';
import type { ReadingState, TextAnnotation } from '@/app/services/studentSummariesApi';
import { extractItems } from '@/app/lib/api-helpers';

// ── 1. Topic summaries list ──────────────────────────────

export function useTopicSummariesQuery(topicId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.topicSummaries(topicId!),
    queryFn: async () => {
      const result = await summariesApi.getSummaries(topicId!);
      return extractItems<Summary>(result)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    enabled: !!topicId,
  });
}

// ── 2. Summary chunks (SHARED cache key) ─────────────────

export function useSummaryChunksQuery(summaryId: string | null) {
  return useQuery({
    queryKey: queryKeys.summaryChunks(summaryId!),
    queryFn: async () => {
      const result = await summariesApi.getChunks(summaryId!);
      return extractItems<Chunk>(result)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    enabled: !!summaryId,
  });
}

// ── 3. Reading state (student per-summary) ───────────────

export function useReadingStateQuery(
  summaryId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.readingState(summaryId!),
    queryFn: async (): Promise<ReadingState | null> => {
      const rs = await studentApi.getReadingState(summaryId!);
      if (!rs) return null;
      // Normalize response shape (API returns array | { items } | object)
      if (Array.isArray(rs)) return (rs as any)[0] || null;
      if ((rs as any)?.items) return (rs as any).items[0] || null;
      return rs;
    },
    staleTime: STUDENT_DATA_STALE,
    enabled: !!summaryId && enabled,
  });
}

// ── 4. Text annotations (SHARED cache key) ───────────────

export function useSummaryAnnotationsQuery(
  summaryId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.summaryAnnotations(summaryId!),
    queryFn: async () => {
      const result = await studentApi.getTextAnnotations(summaryId!);
      return extractItems<TextAnnotation>(result);
    },
    staleTime: STUDENT_DATA_STALE,
    enabled: !!summaryId && enabled,
  });
}

// ── 5. Toggle completed mutation ─────────────────────────

export function useToggleCompletedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      summary_id: string;
      completed: boolean;
      last_read_at: string;
    }) => studentApi.upsertReadingState(vars),
    onSuccess: (rs, variables) => {
      // Update reading state cache directly (no refetch needed)
      queryClient.setQueryData(
        queryKeys.readingState(variables.summary_id),
        rs,
      );
      toast.success(
        variables.completed ? 'Marcado como leído' : 'Marcado como no leído',
      );
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al actualizar estado');
    },
  });
}
