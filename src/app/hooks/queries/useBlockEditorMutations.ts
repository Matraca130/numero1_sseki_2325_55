// ============================================================
// Axon — useBlockEditorMutations (Professor: Block Editor CRUD)
//
// React Query mutation hooks for the block-based summary editor:
//
//   1. useCreateBlockMutation   — POST   /summary-blocks
//   2. useUpdateBlockMutation   — PUT    /summary-blocks/:id
//   3. useDeleteBlockMutation   — DELETE /summary-blocks/:id
//   4. useReorderBlocksMutation — PUT    /reorder (table: summary_blocks)
//
// Cache key: queryKeys.summaryBlocks(summaryId)
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import * as api from '@/app/services/summariesApi';
import type { SummaryBlock, ReorderTable } from '@/app/services/summariesApi';

// ── 1. Create block mutation ──────────────────────────────

export function useCreateBlockMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      summary_id: string;
      type: string;
      content: Record<string, unknown>;
      order_index?: number;
    }) => api.createSummaryBlock(data as Parameters<typeof api.createSummaryBlock>[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.summaryBlocks(summaryId),
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al crear bloque');
    },
  });
}

// ── 2. Update block mutation ──────────────────────────────

export function useUpdateBlockMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      blockId: string;
      data: Partial<Pick<SummaryBlock, 'type' | 'content' | 'order_index' | 'is_active' | 'style' | 'metadata'>>;
    }) => api.updateSummaryBlock(vars.blockId, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.summaryBlocks(summaryId),
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al actualizar bloque');
    },
  });
}

// ── 3. Delete block mutation ──────────────────────────────

export function useDeleteBlockMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blockId: string) => api.deleteSummaryBlock(blockId),
    onSuccess: () => {
      toast.success('Bloque eliminado');
      queryClient.invalidateQueries({
        queryKey: queryKeys.summaryBlocks(summaryId),
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al eliminar bloque');
    },
  });
}

// ── 4. Reorder blocks mutation ────────────────────────────

export function useReorderBlocksMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: { id: string; order_index: number }[]) =>
      api.reorder('summary_blocks' as ReorderTable, items),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.summaryBlocks(summaryId),
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al reordenar bloques');
    },
  });
}
