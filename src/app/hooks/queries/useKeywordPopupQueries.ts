// ============================================================
// Axon — useKeywordPopupQueries
//
// React Query hook for ALL data in KeywordPopup (student hub).
// Replaces 6 manual useState/useEffect fetch patterns + 3 CRUD
// handlers with cached queries + typed mutations.
//
// Queries (5):
//   1. Subtopics       — kwSubtopics(keywordId), seeded from batch
//   2. Connections      — kwConnections(keywordId), includes external KW resolve
//   3. Student notes    — kwNotes(keywordId), shared with useKeywordDetailQueries
//   4. Professor notes  — kwProfNotes(keywordId), read-only
//   5. Action counts    — kwActionCounts(keywordId), flashcard + quiz counts
//
// Mutations (3):
//   - createNote / updateNote / deleteNote (optimistic for delete)
//
// Performance wins:
//   - Cache-first: reopening same keyword popup → instant (no spinners)
//   - Cache seeding: kwSubtopics pre-populated from useKeywordMasteryQuery batch
//   - Dedup: kwNotes shared with useKeywordDetailQueries
//   - Parallel: all 5 queries fire simultaneously (no waterfall)
//   - Optimistic delete: note disappears instantly, rolls back on error
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import { apiCall } from '@/app/lib/api';
import * as summariesApi from '@/app/services/summariesApi';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { Subtopic, SummaryKeyword } from '@/app/services/summariesApi';
import type { KwStudentNote } from '@/app/services/studentSummariesApi';
import { extractItems } from '@/app/lib/api-helpers';
import {
  PROFESSOR_CONTENT_STALE as PROFESSOR_STALE,
  STUDENT_DATA_STALE as STUDENT_STALE,
  CONNECTIONS_STALE,
} from './staleTimes';
import type { KeywordConnection, ExternalKeyword } from '@/app/types/keyword-connections';
import { invalidateGraphCache } from '@/app/components/content/mindmap/useGraphData';

// Re-export shared types so existing consumers (e.g. KeywordPopup)
// don't need import path changes.
export type { KeywordConnection, ExternalKeyword };

// ── Types ─────────────────────────────────────────────────

export interface KwProfNote {
  id: string;
  keyword_id: string;
  professor_id: string;
  note: string;
  tag?: 'tip' | 'mnemonic' | 'clinical' | 'correction';
  created_at: string;
  updated_at: string;
}

interface ActionCounts {
  flashcards: number;
  quizzes: number;
}

// ── Return type ───────────────────────────────────────────

interface ConnectionsData {
  connections: KeywordConnection[];
  externalKws: Record<string, ExternalKeyword>;
}

interface UseKeywordPopupResult {
  // ── Subtopics ──
  subtopics: Subtopic[];
  subtopicsLoading: boolean;

  // ── Connections ──
  connections: KeywordConnection[];
  connectionsLoading: boolean;
  externalKws: Map<string, ExternalKeyword>;
  invalidateConnections: () => void;

  // ── Student notes ──
  notes: KwStudentNote[];
  notesLoading: boolean;
  createNote: (note: string) => Promise<void>;
  updateNote: (noteId: string, note: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  isNoteMutating: boolean;

  // ── Professor notes ──
  profNotes: KwProfNote[];
  profNotesLoading: boolean;

  // ── Action counts ──
  flashcardCount: number | null;
  quizCount: number | null;
}

// ── Hook ──────────────────────────────────────────────────

export function useKeywordPopupQueries(
  keywordId: string,
  allKeywordIds: string[],
  summaryId: string,
): UseKeywordPopupResult {
  const queryClient = useQueryClient();

  // ── 1. Subtopics (seeded from useKeywordMasteryQuery batch) ──
  const subtopicsQuery = useQuery({
    queryKey: queryKeys.kwSubtopics(keywordId),
    queryFn: async () => {
      const result = await summariesApi.getSubtopics(keywordId);
      return extractItems<Subtopic>(result)
        .filter((s) => s.is_active !== false)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    staleTime: PROFESSOR_STALE,
  });

  // ── 2. Connections + external keyword resolution ─────────
  // AUDIT F2: 3-phase resolution eliminates N+1 GET /keywords/:id calls.
  //   Phase 1: Extract external kw data from F1 embedded join (0 requests)
  //   Phase 2: Fallback fetch for any external not in join (pre-F1 cache, etc.)
  //   Phase 3: Fetch summary_id for externals resolved by join but missing it
  //            (backend without Fase A expanded join — id+name only)
  const connectionsQuery = useQuery<ConnectionsData>({
    queryKey: queryKeys.kwConnectionsResolved(keywordId),
    queryFn: async () => {
      const result = await apiCall<unknown>(
        `/keyword-connections?keyword_id=${keywordId}`,
      );
      const conns = extractItems<KeywordConnection>(result);

      const localIdSet = new Set(allKeywordIds);
      const extMap: Record<string, ExternalKeyword> = {};

      // ── Phase 1: Extract from F1-joined embedded objects (0 extra requests)
      for (const conn of conns) {
        const otherId =
          conn.keyword_a_id === keywordId
            ? conn.keyword_b_id
            : conn.keyword_a_id;
        if (localIdSet.has(otherId) || extMap[otherId]) continue;

        const embedded =
          conn.keyword_a_id === keywordId ? conn.keyword_b : conn.keyword_a;
        if (embedded?.name) {
          extMap[otherId] = {
            id: embedded.id || otherId,
            name: embedded.name,
            summary_id: embedded.summary_id || '',
            definition: embedded.definition ?? null,
          };
        }
      }

      // ── Phase 2: Fallback for externals not resolved by join
      // (stale cache entries, or backend pre-F1 without embedded objects)
      const unresolvedIds = [
        ...new Set(
          conns
            .map((c) =>
              c.keyword_a_id === keywordId ? c.keyword_b_id : c.keyword_a_id,
            )
            .filter((id) => !localIdSet.has(id) && !extMap[id]),
        ),
      ];

      if (unresolvedIds.length > 0) {
        const results = await Promise.allSettled(
          unresolvedIds.map((id) => apiCall<any>(`/keywords/${id}`)),
        );
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value) {
            const kw = r.value;
            extMap[unresolvedIds[i]] = {
              id: kw.id || unresolvedIds[i],
              name: kw.name || unresolvedIds[i].slice(0, 8),
              summary_id: kw.summary_id || '',
              definition: kw.definition || null,
            };
          }
        });
      }

      // ── Phase 3: Fetch summary_id for externals resolved by Phase 1
      // but missing summary_id (backend without Fase A expanded join).
      // summary_id is required for cross-summary navigation.
      const missingSummaryId = Object.values(extMap).filter(
        (e) => !e.summary_id,
      );
      if (missingSummaryId.length > 0) {
        const results = await Promise.allSettled(
          missingSummaryId.map((e) => apiCall<any>(`/keywords/${e.id}`)),
        );
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value) {
            const kw = r.value;
            const existing = extMap[missingSummaryId[i].id];
            if (existing) {
              existing.summary_id = kw.summary_id || '';
              existing.definition = existing.definition || kw.definition || null;
            }
          }
        });
      }

      return { connections: conns, externalKws: extMap };
    },
    staleTime: CONNECTIONS_STALE,
  });

  // Derive Map from Record for backward compatibility
  const externalKws = useMemo(() => {
    const map = new Map<string, ExternalKeyword>();
    if (!connectionsQuery.data?.externalKws) return map;
    for (const [id, kw] of Object.entries(connectionsQuery.data.externalKws)) {
      map.set(id, kw);
    }
    return map;
  }, [connectionsQuery.data]);

  // ── 3. Student notes ────────────────────────────────────
  const notesQuery = useQuery({
    queryKey: queryKeys.kwNotes(keywordId),
    queryFn: async () => {
      const result = await studentApi.getKwStudentNotes(keywordId);
      return extractItems<KwStudentNote>(result).filter(
        (n) => !(n as any).deleted_at,
      );
    },
    staleTime: STUDENT_STALE,
  });

  // ── 4. Professor notes (read-only) ──────────────────────
  const profNotesQuery = useQuery({
    queryKey: queryKeys.kwProfNotes(keywordId),
    queryFn: async () => {
      const result = await apiCall<unknown>(
        `/kw-prof-notes?keyword_id=${keywordId}`,
      );
      return extractItems<KwProfNote>(result);
    },
    staleTime: PROFESSOR_STALE,
  });

  // ── 5. Action counts (flashcards + quiz questions) ──────
  const countsQuery = useQuery({
    // M-2 FIX: Use factory directly instead of manual spread
    queryKey: queryKeys.kwActionCounts(keywordId, summaryId),
    queryFn: async (): Promise<ActionCounts> => {
      const [fcResult, qResult] = await Promise.allSettled([
        apiCall<unknown>(`/flashcards?summary_id=${summaryId}&keyword_id=${keywordId}`),
        apiCall<unknown>(`/quiz-questions?summary_id=${summaryId}&keyword_id=${keywordId}`),
      ]);
      return {
        flashcards:
          fcResult.status === 'fulfilled'
            ? extractItems<unknown>(fcResult.value).length
            : 0,
        quizzes:
          qResult.status === 'fulfilled'
            ? extractItems<unknown>(qResult.value).length
            : 0,
      };
    },
    staleTime: PROFESSOR_STALE,
  });

  // ── Mutations: Student Notes ────────────────────────────

  const createNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      await studentApi.createKwStudentNote({
        keyword_id: keywordId,
        note,
      });
    },
    onSuccess: () => {
      toast.success('Nota añadida');
      queryClient.invalidateQueries({
        queryKey: queryKeys.kwNotes(keywordId),
      });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al añadir nota');
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, note }: { noteId: string; note: string }) => {
      await studentApi.updateKwStudentNote(noteId, { note });
    },
    onSuccess: () => {
      toast.success('Nota actualizada');
      queryClient.invalidateQueries({
        queryKey: queryKeys.kwNotes(keywordId),
      });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await studentApi.deleteKwStudentNote(noteId);
    },
    // Optimistic delete — instant UI feedback
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.kwNotes(keywordId),
      });
      const prev = queryClient.getQueryData<KwStudentNote[]>(
        queryKeys.kwNotes(keywordId),
      );
      queryClient.setQueryData<KwStudentNote[]>(
        queryKeys.kwNotes(keywordId),
        (old) => old?.filter((n) => n.id !== noteId) ?? [],
      );
      return { prev };
    },
    onSuccess: () => {
      toast.success('Nota eliminada');  // same in Spanish
    },
    onError: (err: unknown, _noteId, ctx) => {
      // Rollback on failure
      if (ctx?.prev) {
        queryClient.setQueryData(queryKeys.kwNotes(keywordId), ctx.prev);
      }
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.kwNotes(keywordId),
      });
    },
  });

  return {
    // Subtopics
    subtopics: subtopicsQuery.data ?? [],
    subtopicsLoading: subtopicsQuery.isLoading,

    // Connections
    connections: connectionsQuery.data?.connections ?? [],
    connectionsLoading: connectionsQuery.isLoading,
    externalKws,
    invalidateConnections: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.kwConnections(keywordId),
      });
      // Also invalidate mindmap graph cache so new connections show up
      invalidateGraphCache();
    },

    // Student notes
    notes: notesQuery.data ?? [],
    notesLoading: notesQuery.isLoading,
    createNote: async (note: string) => {
      await createNoteMutation.mutateAsync(note);
    },
    updateNote: async (noteId: string, note: string) => {
      await updateNoteMutation.mutateAsync({ noteId, note });
    },
    deleteNote: async (noteId: string) => {
      await deleteNoteMutation.mutateAsync(noteId);
    },
    isNoteMutating:
      createNoteMutation.isPending ||
      updateNoteMutation.isPending ||
      deleteNoteMutation.isPending,

    // Professor notes
    profNotes: profNotesQuery.data ?? [],
    profNotesLoading: profNotesQuery.isLoading,

    // Action counts
    flashcardCount: countsQuery.data?.flashcards ?? null,
    quizCount: countsQuery.data?.quizzes ?? null,
  };
}