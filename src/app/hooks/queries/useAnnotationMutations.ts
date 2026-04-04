// ============================================================
// Axon — Annotation Mutations (React Query)
//
// CRUD mutations for text annotations in TextHighlighter.
// Each mutation invalidates the summaryAnnotations cache so
// every observer (SummaryView, StudentSummaryReader, etc.)
// re-renders automatically.
//
// Toast success for create is handled INLINE at the call site
// because the two create paths differ (C1 shows toast, C2 does
// not — it opens the note editor instead).
// ============================================================
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import * as studentApi from '@/app/services/studentSummariesApi';

// ── Create annotation ─────────────────────────────────────
// Returns the created TextAnnotation so call sites can use it
// (e.g. to open the note editor immediately after creation).
export function useCreateAnnotationMutation(summaryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      summary_id: string;
      start_offset: number;
      end_offset: number;
      color?: string;
      note?: string;
      selected_text?: string;
    }) => studentApi.createTextAnnotation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.summaryAnnotations(summaryId),
      });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al crear subrayado');
    },
  });
}

// ── Update annotation (note / color) ──────────────────────
export function useUpdateAnnotationMutation(summaryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      data: { color?: string; note?: string | null };
    }) => studentApi.updateTextAnnotation(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.summaryAnnotations(summaryId),
      });
      toast.success('Nota guardada');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al guardar nota');
    },
  });
}

// ── Delete annotation (soft-delete) ───────────────────────
export function useDeleteAnnotationMutation(summaryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => studentApi.deleteTextAnnotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.summaryAnnotations(summaryId),
      });
      toast.success('Subrayado eliminado');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al eliminar');
    },
  });
}
