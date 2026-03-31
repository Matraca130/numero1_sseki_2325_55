// ============================================================
// Axon — useTextAnnotations (block-scoped annotation management)
//
// Wraps the existing useAnnotationMutations (which handles API calls)
// with block-specific filtering and offset management.
//
// Flow: student selects text -> calculates offsets within block
//       -> POST annotation -> re-render highlights
// ============================================================
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queries/queryKeys';
import * as studentApi from '@/app/services/studentSummariesApi';
import {
  useCreateAnnotationMutation,
  useDeleteAnnotationMutation,
} from './queries/useAnnotationMutations';
import type { TextAnnotation } from '@/app/services/studentSummariesApi';

export function useTextAnnotations(summaryId: string, _blockId?: string) {
  // Fetch all annotations for this summary
  const { data } = useQuery({
    queryKey: queryKeys.summaryAnnotations(summaryId),
    queryFn: () => studentApi.getTextAnnotations(summaryId),
    staleTime: 30_000,
    enabled: !!summaryId,
  });

  // Filter to active (non-deleted) annotations
  const allAnnotations: TextAnnotation[] = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter(a => !a.deleted_at);
  }, [data]);

  const createMutation = useCreateAnnotationMutation(summaryId);
  const deleteMutation = useDeleteAnnotationMutation(summaryId);

  return {
    annotations: allAnnotations,
    createAnnotation: createMutation.mutate,
    deleteAnnotation: deleteMutation.mutate,
    isCreating: createMutation.isPending,
  };
}
