// ============================================================
// Axon — useKeywordDetailQueries
//
// React Query wrapper for the two on-demand keyword-level
// fetches in the L4 reader:
//   1. Subtopics (professor content, 10 min stale)
//   2. KW Student Notes (student data, 2 min stale)
//
// The hook takes the currently-expanded keywordId (or null).
// When the student expands a different keyword, the query key
// changes and React Query either serves from cache or fetches.
// Previously expanded keywords stay cached (gcTime) so
// re-expanding them is instant.
// ============================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import * as summariesApi from '@/app/services/summariesApi';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { Subtopic } from '@/app/services/summariesApi';
import type { KwStudentNote } from '@/app/services/studentSummariesApi';
import { extractItems } from '@/app/lib/api-helpers';
import { PROFESSOR_CONTENT_STALE, STUDENT_DATA_STALE } from './staleTimes';

// ── Hook ──────────────────────────────────────────────────

interface UseKeywordDetailResult {
  subtopics: Subtopic[];
  subtopicsLoading: boolean;
  kwNotes: KwStudentNote[];
  kwNotesLoading: boolean;
  /** Invalidate kw-notes cache for a specific keyword (after CRUD) */
  invalidateKwNotes: (keywordId: string) => void;
}

export function useKeywordDetailQueries(
  keywordId: string | null,
): UseKeywordDetailResult {
  const queryClient = useQueryClient();

  // 1. Subtopics — professor content, long cache
  const subtopicsQuery = useQuery({
    queryKey: queryKeys.kwSubtopics(keywordId!),
    queryFn: async () => {
      const result = await summariesApi.getSubtopics(keywordId!);
      return extractItems<Subtopic>(result)
        .filter(s => s.is_active !== false)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    enabled: !!keywordId,
    staleTime: PROFESSOR_CONTENT_STALE,
  });

  // 2. KW Student Notes — student data, shorter cache
  const kwNotesQuery = useQuery({
    queryKey: queryKeys.kwNotes(keywordId!),
    queryFn: async () => {
      const result = await studentApi.getKwStudentNotes(keywordId!);
      return extractItems<KwStudentNote>(result).filter(
        (n) => !(n as any).deleted_at,
      );
    },
    enabled: !!keywordId,
    staleTime: STUDENT_DATA_STALE,
  });

  return {
    subtopics: subtopicsQuery.data ?? [],
    subtopicsLoading: subtopicsQuery.isLoading,
    kwNotes: kwNotesQuery.data ?? [],
    kwNotesLoading: kwNotesQuery.isLoading,
    invalidateKwNotes: (kwId: string) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kwNotes(kwId) });
    },
  };
}