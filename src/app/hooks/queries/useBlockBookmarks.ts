// ============================================================
// Axon — useBlockBookmarks (React Query)
//
// Replaces localStorage useBookmarks hook with API-backed
// block bookmarks. Provides the same interface:
//   { bookmarks, toggle, remove, isBookmarked }
//
// On first load, migrates any existing localStorage bookmarks
// to the API (one-time), then clears the localStorage key.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import * as api from '@/app/services/studentSummariesApi';

export function useBlockBookmarks(summaryId: string) {
  const queryClient = useQueryClient();
  const migratedRef = useRef(false);

  // Fetch bookmarks from API
  const { data } = useQuery({
    queryKey: queryKeys.blockBookmarks(summaryId),
    queryFn: () => api.getBlockBookmarks(summaryId),
    staleTime: 30_000,
  });

  const bookmarkItems = data?.items ?? [];
  const bookmarkBlockIds = bookmarkItems.map(b => b.block_id);

  // One-time migration from localStorage
  useEffect(() => {
    if (migratedRef.current || !data) return;
    migratedRef.current = true;
    const storageKey = `axon-bookmarks-${summaryId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const localIds: string[] = JSON.parse(raw);
      if (!Array.isArray(localIds) || localIds.length === 0) return;
      const existingBlockIds = new Set(bookmarkBlockIds);
      const toMigrate = localIds.filter(id => !existingBlockIds.has(id));
      if (toMigrate.length > 0) {
        Promise.all(toMigrate.map(blockId =>
          api.createBlockBookmark({ summary_id: summaryId, block_id: blockId }).catch(() => null)
        )).then(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.blockBookmarks(summaryId) });
          localStorage.removeItem(storageKey);
        });
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch { /* ignore migration errors */ }
  }, [data, summaryId, bookmarkBlockIds, queryClient]);

  // Create mutation (optimistic)
  const createMutation = useMutation({
    mutationFn: (blockId: string) => api.createBlockBookmark({ summary_id: summaryId, block_id: blockId }),
    onMutate: async (blockId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.blockBookmarks(summaryId) });
      const prev = queryClient.getQueryData(queryKeys.blockBookmarks(summaryId));
      queryClient.setQueryData(queryKeys.blockBookmarks(summaryId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: [...old.items, {
            id: `temp-${blockId}`,
            block_id: blockId,
            summary_id: summaryId,
            student_id: '',
            created_at: new Date().toISOString(),
          }],
        };
      });
      return { prev };
    },
    onError: (_err, _blockId, context) => {
      if (context?.prev) queryClient.setQueryData(queryKeys.blockBookmarks(summaryId), context.prev);
      toast.error('Error al guardar marcador');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blockBookmarks(summaryId) });
    },
  });

  // Delete mutation (optimistic)
  const deleteMutation = useMutation({
    mutationFn: (bookmarkId: string) => api.deleteBlockBookmark(bookmarkId),
    onMutate: async (bookmarkId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.blockBookmarks(summaryId) });
      const prev = queryClient.getQueryData(queryKeys.blockBookmarks(summaryId));
      queryClient.setQueryData(queryKeys.blockBookmarks(summaryId), (old: any) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((b: any) => b.id !== bookmarkId) };
      });
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(queryKeys.blockBookmarks(summaryId), context.prev);
      toast.error('Error al quitar marcador');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blockBookmarks(summaryId) });
    },
  });

  const toggle = useCallback((blockId: string) => {
    const existing = bookmarkItems.find(b => b.block_id === blockId);
    if (existing) {
      deleteMutation.mutate(existing.id);
    } else {
      createMutation.mutate(blockId);
    }
  }, [bookmarkItems, createMutation, deleteMutation]);

  const remove = useCallback((blockId: string) => {
    const existing = bookmarkItems.find(b => b.block_id === blockId);
    if (existing) deleteMutation.mutate(existing.id);
  }, [bookmarkItems, deleteMutation]);

  const isBookmarked = useCallback((blockId: string) => {
    return bookmarkBlockIds.includes(blockId);
  }, [bookmarkBlockIds]);

  return { bookmarks: bookmarkBlockIds, toggle, remove, isBookmarked };
}
