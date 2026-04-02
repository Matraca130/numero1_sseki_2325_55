// ============================================================
// Axon — useBlockNotes (React Query)
//
// Replaces localStorage block notes with API-backed persistence.
// On first load, migrates any existing localStorage notes to
// the API (one-time), then clears the localStorage key.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import * as api from '@/app/services/studentSummariesApi';
import type { BlockNote } from '@/app/services/studentSummariesApi';

export type { BlockNote };

export function useBlockNotes(summaryId: string, blockId: string) {
  const queryClient = useQueryClient();
  const migratedRef = useRef(false);

  const queryKey = [...queryKeys.blockNotes(summaryId), blockId] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.getBlockNotes(summaryId, blockId),
    staleTime: 30_000,
  });

  const notes: BlockNote[] = (data?.items ?? []).filter(n => !n.deleted_at);

  // One-time migration from localStorage
  useEffect(() => {
    if (migratedRef.current || !data) return;
    migratedRef.current = true;
    const storageKey = `axon-block-notes-${summaryId}-${blockId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const localNotes = JSON.parse(raw);
      if (!Array.isArray(localNotes) || localNotes.length === 0) return;
      Promise.all(localNotes.map((n: any) =>
        api.createBlockNote({ summary_id: summaryId, block_id: blockId, text: n.text }).catch(() => null)
      )).then(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.blockNotes(summaryId) });
        localStorage.removeItem(storageKey);
      });
    } catch { /* ignore migration errors */ }
  }, [data, summaryId, blockId, queryClient]);

  const createMutation = useMutation({
    mutationFn: (noteData: { text: string; color?: string }) =>
      api.createBlockNote({ summary_id: summaryId, block_id: blockId, ...noteData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blockNotes(summaryId) });
    },
    onError: (err: any) => toast.error(err.message || 'Error al crear nota'),
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => api.deleteBlockNote(noteId),
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((n: any) => n.id !== noteId) };
      });
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(queryKey, context.prev);
      }
      toast.error('Error al eliminar nota');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blockNotes(summaryId) });
    },
  });

  const create = useCallback((text: string, color?: string) => {
    createMutation.mutate({ text, color });
  }, [createMutation]);

  const remove = useCallback((noteId: string) => {
    deleteMutation.mutate(noteId);
  }, [deleteMutation]);

  return { notes, isLoading, create, remove };
}
