// ============================================================
// Axon — useTopicDetailQueries (Professor: summary CRUD per topic)
//
// React Query hooks for TopicDetailPanel:
//
//   1. useProfessorSummariesQuery  — summaries list (ALL, including
//                                     soft-deleted for restore button)
//   2. useSummarySubCountsQuery    — enrichment counts per summary
//                                     (chunks / keywords / videos)
//   3-7. CRUD mutations: create, update, delete, restore, toggleStatus
//
// Cache key: queryKeys.topicSummaries(topicId) — shared with
// student useTopicSummariesQuery. Both store ALL summaries
// (neither filters is_active in queryFn). Compatible.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import { PROFESSOR_CONTENT_STALE } from './staleTimes';
import * as api from '@/app/services/summariesApi';
import type { Summary } from '@/app/services/summariesApi';
import { extractItems } from '@/app/lib/api-helpers';

// ── 1. Summaries list (professor: ALL, no is_active filter) ──

export function useProfessorSummariesQuery(topicId: string) {
  return useQuery({
    queryKey: queryKeys.topicSummaries(topicId),
    queryFn: async () => {
      const result = await api.getSummaries(topicId);
      return extractItems<Summary>(result)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    enabled: !!topicId,
  });
}

// ── 2. Sub-content counts (chunks/keywords/videos per summary) ──

export interface SummarySubCounts {
  [summaryId: string]: {
    chunks: number;
    keywords: number;
    videos: number;
  };
}

export function useSummarySubCountsQuery(
  topicId: string,
  summaries: Summary[],
) {
  // Only count active summaries
  const activeIds = summaries
    .filter(s => s.is_active)
    .map(s => s.id)
    .sort();

  return useQuery({
    queryKey: [...queryKeys.summarySubCounts(topicId), activeIds],
    queryFn: async (): Promise<SummarySubCounts> => {
      const results: SummarySubCounts = {};

      await Promise.allSettled(
        summaries
          .filter(s => s.is_active)
          .map(async (s) => {
            try {
              const [chunksRes, kwRes, videosRes] = await Promise.allSettled([
                api.getChunks(s.id),
                api.getKeywords(s.id),
                api.getVideos(s.id),
              ]);
              const extract = (r: PromiseSettledResult<any>): number => {
                if (r.status !== 'fulfilled') return 0;
                const v = r.value;
                if (Array.isArray(v)) return v.length;
                if (v && Array.isArray(v.items))
                  return v.items.filter((i: any) => i.is_active !== false).length;
                return 0;
              };
              results[s.id] = {
                chunks: extract(chunksRes),
                keywords: extract(kwRes),
                videos: extract(videosRes),
              };
            } catch {
              /* ignore individual summary errors */
            }
          }),
      );

      return results;
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    enabled: activeIds.length > 0,
  });
}

// ── Helper: invalidate topic-level caches ────────────────────

function invalidateTopic(
  queryClient: ReturnType<typeof useQueryClient>,
  topicId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.topicSummaries(topicId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.summarySubCounts(topicId) }),
  ]);
}

// ── 3. Create summary mutation ──────────────────────────────

export function useCreateSummaryMutation(topicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      content_markdown: string;
      status: 'draft' | 'published';
    }) =>
      api.createSummary({
        topic_id: topicId,
        ...data,
      }),
    onSuccess: () => {
      toast.success('Resumen creado');
      invalidateTopic(queryClient, topicId);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al crear resumen');
    },
  });
}

// ── 4. Update summary mutation ──────────────────────────────

export function useUpdateSummaryMutation(topicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      summaryId: string;
      data: {
        title?: string;
        content_markdown?: string;
        status?: 'draft' | 'published' | 'rejected';
      };
    }) => api.updateSummary(vars.summaryId, vars.data),
    onSuccess: () => {
      toast.success('Resumen actualizado');
      invalidateTopic(queryClient, topicId);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al guardar resumen');
    },
  });
}

// ── 5. Delete summary mutation ──────────────────────────────

export function useDeleteSummaryMutation(topicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (summaryId: string) => api.deleteSummary(summaryId),
    onSuccess: () => {
      toast.success('Resumen eliminado');
      invalidateTopic(queryClient, topicId);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al eliminar resumen');
    },
  });
}

// ── 6. Restore summary mutation ─────────────────────────────

export function useRestoreSummaryMutation(topicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (summaryId: string) => api.restoreSummary(summaryId),
    onSuccess: () => {
      toast.success('Resumen restaurado');
      invalidateTopic(queryClient, topicId);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al restaurar resumen');
    },
  });
}

// ── 7. Toggle status mutation ───────────────────────────────

export function useToggleStatusMutation(topicId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      summaryId: string;
      newStatus: 'draft' | 'published';
    }) => api.updateSummary(vars.summaryId, { status: vars.newStatus }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.newStatus === 'published' ? 'Publicado' : 'Cambiado a borrador',
      );
      invalidateTopic(queryClient, topicId);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al cambiar estado');
    },
  });
}
