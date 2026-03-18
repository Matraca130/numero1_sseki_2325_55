// ============================================================
// Axon — useProfessorNotesQueries (Professor: kw-prof-notes CRUD)
//
// React Query hooks for ProfessorNotesPanel:
//
//   1. useProfNotesQuery          — notes list per keyword
//   2. useUpsertProfNoteMutation  — POST (upsert) + invalidate
//   3. useDeleteProfNoteMutation  — DELETE + invalidate
//
// Cache key: queryKeys.kwProfNotes(keywordId) — professor-only,
// no student equivalent.
//
// When summaryId is provided, mutations also invalidate
// queryKeys.keywordCounts(summaryId) so the KeywordsManager
// badge counts stay fresh.
//
// Routes (all FLAT):
//   GET    /kw-prof-notes?keyword_id=xxx
//   POST   /kw-prof-notes { keyword_id, note } — UPSERT on (professor_id, keyword_id)
//   DELETE /kw-prof-notes/:id                  — hard delete
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import { PROFESSOR_CONTENT_STALE } from './staleTimes';
import { apiCall } from '@/app/lib/api';
import { extractItems } from '@/app/lib/api-helpers';

// ── Types ─────────────────────────────────────────────────

export interface KwProfNote {
  id: string;
  keyword_id: string;
  professor_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

// ── 1. Notes list (per keyword) ───────────────────────────

export function useProfNotesQuery(keywordId: string) {
  return useQuery({
    queryKey: queryKeys.kwProfNotes(keywordId),
    queryFn: async () => {
      const result = await apiCall<unknown>(
        `/kw-prof-notes?keyword_id=${keywordId}`,
      );
      return extractItems<KwProfNote>(result);
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    enabled: !!keywordId,
  });
}

// ── Helper: invalidate prof-note caches ───────────────────

function invalidateProfNotes(
  queryClient: ReturnType<typeof useQueryClient>,
  keywordId: string,
  summaryId?: string,
) {
  const promises: Promise<void>[] = [
    queryClient.invalidateQueries({
      queryKey: queryKeys.kwProfNotes(keywordId),
    }),
  ];
  if (summaryId) {
    promises.push(
      queryClient.invalidateQueries({
        queryKey: queryKeys.keywordCounts(summaryId),
      }),
    );
  }
  return Promise.all(promises);
}

// ── 2. Upsert note mutation (POST) ────────────────────────

export function useUpsertProfNoteMutation(
  keywordId: string,
  summaryId?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (note: string) =>
      apiCall('/kw-prof-notes', {
        method: 'POST',
        body: JSON.stringify({
          keyword_id: keywordId,
          note,
        }),
      }),
    onSuccess: () => {
      invalidateProfNotes(queryClient, keywordId, summaryId);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al guardar nota');
    },
  });
}

// ── 3. Delete note mutation ───────────────────────────────

export function useDeleteProfNoteMutation(
  keywordId: string,
  summaryId?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) =>
      apiCall(`/kw-prof-notes/${noteId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Nota eliminada');
      invalidateProfNotes(queryClient, keywordId, summaryId);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar nota');
    },
  });
}
