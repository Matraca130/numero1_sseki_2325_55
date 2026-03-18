// ============================================================
// Axon — useKeywordsManagerQueries
//
// React Query hooks for the KeywordsManager component.
// Replaces useState/useEffect/fetchKeywords manual pattern.
//
//   1. useKeywordsQuery        — keyword list (SHARED cache key
//                                with useSummaryReaderQueries &
//                                useKeywordMasteryQuery)
//   2. useKeywordCountsQuery   — subtopic + prof-note counts
//                                (separate cache key, professor-only)
//   3. useCreateKeywordMutation — POST /keywords + invalidate
//   4. useUpdateKeywordMutation — PUT  /keywords/:id + invalidate
//   5. useDeleteKeywordMutation — DELETE /keywords/:id + invalidate
//   6. useRestoreKeywordMutation — PUT /keywords/:id/restore + invalidate
//
// Cache sharing:
//   queryKeys.summaryKeywords(summaryId) stores ALL SummaryKeyword[]
//   (including inactive). Consumers use `select` to derive filtered
//   views. Mutations invalidate BOTH summaryKeywords AND keywordCounts
//   so all views stay fresh.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import { PROFESSOR_CONTENT_STALE } from './staleTimes';
import * as api from '@/app/services/summariesApi';
import type { SummaryKeyword, Subtopic } from '@/app/services/summariesApi';
import { apiCall } from '@/app/lib/api';
import { extractItems } from '@/app/lib/api-helpers';

// ── 1. Keywords list (shared cache key) ──────────────────

export function useKeywordsQuery(summaryId: string) {
  return useQuery({
    queryKey: queryKeys.summaryKeywords(summaryId),
    queryFn: async () => {
      const result = await api.getKeywords(summaryId);
      return extractItems<SummaryKeyword>(result);
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    select: (data) => data.filter(k => k.is_active !== false),
    enabled: !!summaryId,
  });
}

// ── 2. Enrichment counts (separate cache key) ────────────

export interface KeywordCounts {
  subtopicCounts: Record<string, number>;
  noteCounts: Record<string, number>;
}

export function useKeywordCountsQuery(
  summaryId: string,
  keywords: SummaryKeyword[],
) {
  // Derive a stable list of keyword IDs for the queryKey so the
  // cache auto-invalidates when the keyword set changes.
  const keywordIds = keywords.map(k => k.id).sort();

  return useQuery({
    queryKey: [...queryKeys.keywordCounts(summaryId), keywordIds],
    queryFn: async (): Promise<KeywordCounts> => {
      const subtopicCounts: Record<string, number> = {};
      const noteCounts: Record<string, number> = {};

      await Promise.all(
        keywords.map(async (kw) => {
          // Subtopic count
          try {
            const subResult = await api.getSubtopics(kw.id);
            subtopicCounts[kw.id] = extractItems<Subtopic>(subResult)
              .filter(s => s.is_active !== false).length;
          } catch {
            subtopicCounts[kw.id] = 0;
          }

          // Prof-note count
          try {
            const notesResult = await apiCall<unknown>(
              `/kw-prof-notes?keyword_id=${kw.id}`,
            );
            noteCounts[kw.id] = extractItems<unknown>(notesResult).length;
          } catch {
            noteCounts[kw.id] = 0;
          }
        }),
      );

      return { subtopicCounts, noteCounts };
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    // Only fetch once we have keywords
    enabled: keywords.length > 0,
  });
}

// ── Helper: invalidate both keyword caches ────────────────

function invalidateKeywords(
  queryClient: ReturnType<typeof useQueryClient>,
  summaryId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.summaryKeywords(summaryId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.keywordCounts(summaryId) }),
  ]);
}

// ── 3. Create keyword mutation ────────────────────────────

export function useCreateKeywordMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      definition?: string;
      priority?: number;
    }) =>
      api.createKeyword({
        summary_id: summaryId,
        ...data,
      }),
    onSuccess: () => {
      toast.success('Keyword creado');
      invalidateKeywords(queryClient, summaryId);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al crear keyword');
    },
  });
}

// ── 4. Update keyword mutation ────────────────────────────

export function useUpdateKeywordMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      keywordId: string;
      data: {
        name?: string;
        definition?: string;
        priority?: number;
        is_active?: boolean;
      };
    }) => api.updateKeyword(vars.keywordId, vars.data),
    onSuccess: () => {
      toast.success('Keyword actualizado');
      invalidateKeywords(queryClient, summaryId);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al guardar keyword');
    },
  });
}

// ── 5. Delete keyword mutation ────────────────────────────

export function useDeleteKeywordMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keywordId: string) => api.deleteKeyword(keywordId),
    onSuccess: () => {
      toast.success('Keyword eliminado');
      invalidateKeywords(queryClient, summaryId);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar keyword');
    },
  });
}

// ── 6. Restore keyword mutation ────────────────────────────

export function useRestoreKeywordMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keywordId: string) => api.restoreKeyword(keywordId),
    onSuccess: () => {
      toast.success('Keyword restaurado');
      invalidateKeywords(queryClient, summaryId);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al restaurar keyword');
    },
  });
}