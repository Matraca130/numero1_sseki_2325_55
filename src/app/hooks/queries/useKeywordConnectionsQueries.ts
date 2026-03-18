// ============================================================
// Axon — useKeywordConnectionsQueries
//
// React Query hooks for keyword connections CRUD + search.
// Shared by professor (KeywordConnectionsPanel) and potentially
// the Quick Connect Builder session.
//
// Hooks (4):
//   1. useConnectionsQuery           — GET connections list
//   2. useCreateConnectionMutation   — POST new connection
//   3. useDeleteConnectionMutation   — DELETE connection
//   4. useKeywordSearchQuery         — GET cross-summary search
//
// Cache key: queryKeys.kwConnections(keywordId) — SHARED with
// useKeywordPopupQueries (student side). This means:
//   - If professor creates a connection, student cache is also
//     invalidated (same QueryClient).
//   - No duplicate caches for the same keyword's connections.
//
// Canonical order (a < b) is NOT enforced here. The caller
// must construct CreateConnectionInput with correct order.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import { CONNECTIONS_STALE, SEARCH_STALE } from './staleTimes';
import * as connectionsApi from '@/app/services/keywordConnectionsApi';
import type {
  KeywordConnection,
  CreateConnectionInput,
} from '@/app/types/keyword-connections';

// ── 1. Connections list (per keyword) ─────────────────────

export function useConnectionsQuery(keywordId: string) {
  return useQuery<KeywordConnection[]>({
    queryKey: queryKeys.kwConnections(keywordId),
    queryFn: () => connectionsApi.getConnections(keywordId),
    staleTime: CONNECTIONS_STALE,
    enabled: !!keywordId,
  });
}

// ── 2. Create connection mutation ─────────────────────────

export function useCreateConnectionMutation(keywordId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConnectionInput) =>
      connectionsApi.createConnection(data),
    onSuccess: (_result, variables) => {
      toast.success('Conexión creada');
      // Invalidate BOTH sides of the connection so any open
      // panel/popup for either keyword refreshes automatically.
      queryClient.invalidateQueries({
        queryKey: queryKeys.kwConnections(keywordId),
      });
      const targetId =
        variables.keyword_a_id === keywordId
          ? variables.keyword_b_id
          : variables.keyword_a_id;
      queryClient.invalidateQueries({
        queryKey: queryKeys.kwConnections(targetId),
      });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al crear conexión');
    },
  });
}

// ── 3. Delete connection mutation ─────────────────────────

export function useDeleteConnectionMutation(keywordId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { connectionId: string; otherKeywordId: string }) =>
      connectionsApi.deleteConnection(args.connectionId),
    onSuccess: (_result, variables) => {
      toast.success('Conexión eliminada');
      // Invalidate BOTH sides so any open panel/popup refreshes.
      // Mirrors useCreateConnectionMutation bilateral invalidation.
      queryClient.invalidateQueries({
        queryKey: queryKeys.kwConnections(keywordId),
      });
      if (variables.otherKeywordId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.kwConnections(variables.otherKeywordId),
        });
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar conexión');
    },
  });
}

// ── 4. Cross-summary keyword search ──────────────────────

export function useKeywordSearchQuery(
  query: string,
  excludeSummaryId?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.kwSearch(query, excludeSummaryId),
    queryFn: () => connectionsApi.searchKeywords(query, excludeSummaryId),
    enabled: (options?.enabled ?? true) && query.trim().length >= 2,
    staleTime: SEARCH_STALE, // 30s — search results are ephemeral
    refetchOnWindowFocus: false,
  });
}