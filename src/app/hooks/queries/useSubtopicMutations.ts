// ============================================================
// Axon — Subtopic Query + Mutations (React Query)
//
// Professor-only hooks for subtopic CRUD within SubtopicsPanel.
//
//   1. useSubtopicsQuery           — list for a keyword (own cache key)
//   2. useCreateSubtopicMutation   — POST + invalidate
//   3. useUpdateSubtopicMutation   — PUT  + invalidate (name/is_active/order)
//   4. useDeleteSubtopicMutation   — DELETE + invalidate
//
// Cache invalidation touches 3 keys on every mutation:
//   • kwSubtopics(keywordId)       → SubtopicsPanel list refresh
//   • keywordCounts(summaryId)     → KeywordsManager badge counts
//   • summaryKwSubtopics(summaryId)→ student batch cache (mastery recalc)
//
// MAX_SUBTOPICS_PER_KEYWORD = 6 (enforced in UI, not here).
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import { PROFESSOR_CONTENT_STALE } from './staleTimes';
import * as api from '@/app/services/summariesApi';
import type { Subtopic } from '@/app/services/summariesApi';
import { extractItems } from '@/app/lib/api-helpers';

// ── Constants ─────────────────────────────────────────────────

export const MAX_SUBTOPICS_PER_KEYWORD = 6;

// ── Helper: invalidate subtopic-related caches ───────────────

function invalidateSubtopicCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  keywordId: string,
  summaryId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.kwSubtopics(keywordId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.keywordCounts(summaryId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.summaryKwSubtopics(summaryId) }),
  ]);
}

// ── 1. Subtopics query (per keyword) ─────────────────────────

export function useSubtopicsQuery(keywordId: string) {
  return useQuery({
    queryKey: queryKeys.kwSubtopics(keywordId),
    queryFn: async () => {
      const result = await api.getSubtopics(keywordId);
      return extractItems<Subtopic>(result)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    enabled: !!keywordId,
  });
}

// ── 2. Create subtopic ──────────────────────────────────────

export function useCreateSubtopicMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { keyword_id: string; name: string; order_index?: number }) =>
      api.createSubtopic(data),
    onSuccess: (_data, variables) => {
      toast.success('Subtema creado');
      invalidateSubtopicCaches(queryClient, variables.keyword_id, summaryId);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al crear subtema');
    },
  });
}

// ── 3. Update subtopic ──────────────────────────────────────

export function useUpdateSubtopicMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      subtopicId: string;
      keywordId: string;
      data: { name?: string; order_index?: number; is_active?: boolean };
    }) => api.updateSubtopic(vars.subtopicId, vars.data),
    onSuccess: (_data, variables) => {
      // Contextual toast: distinguish toggle vs edit
      if (variables.data.is_active !== undefined) {
        toast.success(variables.data.is_active ? 'Subtema activado' : 'Subtema desactivado');
      } else {
        toast.success('Subtema actualizado');
      }
      invalidateSubtopicCaches(queryClient, variables.keywordId, summaryId);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar subtema');
    },
  });
}

// ── 4. Delete subtopic ──────────────────────────────────────

export function useDeleteSubtopicMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subtopicId }: { subtopicId: string; keywordId: string }) =>
      api.deleteSubtopic(subtopicId),
    onSuccess: (_data, variables) => {
      toast.success('Subtema eliminado');
      invalidateSubtopicCaches(queryClient, variables.keywordId, summaryId);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar subtema');
    },
  });
}
