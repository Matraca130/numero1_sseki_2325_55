// ============================================================
// Axon — AnnotationContext (Student: text annotation mutations)
//
// Lifts the three annotation mutations (create / update / delete),
// the `summaryId`, and the current `annotations` array out of
// prop-drilling through ViewerBlock. SummaryViewer (or any other
// consumer wanting shared mutation instances) wraps its subtree
// with <AnnotationProvider> and ViewerBlock reads via
// `useAnnotations()` — which returns `null` if no provider is
// mounted, so rendering ViewerBlock standalone (tests, previews)
// keeps working with zero annotation capability.
// ============================================================
import React, { createContext, useContext, useMemo } from 'react';
import type {
  useCreateAnnotationMutation,
  useUpdateAnnotationMutation,
  useDeleteAnnotationMutation,
} from '@/app/hooks/queries/useAnnotationMutations';
import type { TextAnnotation } from '@/app/services/studentSummariesApi';

// ── Types ─────────────────────────────────────────────────
// Pull the exact return types of each mutation hook so the
// context is fully typed (no `Function`, no `any`). This gives
// ViewerBlock real IntelliSense on `.mutate(...)` payloads.

type CreateAnnotationMutation = ReturnType<typeof useCreateAnnotationMutation>;
type UpdateAnnotationMutation = ReturnType<typeof useUpdateAnnotationMutation>;
type DeleteAnnotationMutation = ReturnType<typeof useDeleteAnnotationMutation>;

export interface AnnotationContextValue {
  /** Summary the annotations belong to — required for create payloads. */
  summaryId: string;
  /** Current annotations for the summary (already-fetched by the parent). */
  annotations: TextAnnotation[];
  /** Shared create mutation (single instance for all blocks in the tree). */
  createAnnotationMutation: CreateAnnotationMutation;
  /** Shared update mutation for editing annotation notes / colors. */
  updateAnnotationMutation: UpdateAnnotationMutation;
  /** Shared delete mutation for removing individual annotations. */
  deleteAnnotationMutation: DeleteAnnotationMutation;
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────

export interface AnnotationProviderProps {
  summaryId: string;
  annotations: TextAnnotation[];
  createAnnotationMutation: CreateAnnotationMutation;
  updateAnnotationMutation: UpdateAnnotationMutation;
  deleteAnnotationMutation: DeleteAnnotationMutation;
  children: React.ReactNode;
}

export function AnnotationProvider({
  summaryId,
  annotations,
  createAnnotationMutation,
  updateAnnotationMutation,
  deleteAnnotationMutation,
  children,
}: AnnotationProviderProps) {
  const value = useMemo<AnnotationContextValue>(
    () => ({
      summaryId,
      annotations,
      createAnnotationMutation,
      updateAnnotationMutation,
      deleteAnnotationMutation,
    }),
    [
      summaryId,
      annotations,
      createAnnotationMutation,
      updateAnnotationMutation,
      deleteAnnotationMutation,
    ],
  );

  return (
    <AnnotationContext.Provider value={value}>
      {children}
    </AnnotationContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────

/**
 * Read the annotation context. Returns `null` when no
 * <AnnotationProvider> is mounted above — callers must treat
 * this as "annotations are disabled" (render read-only, no
 * highlight toolbar). This keeps ViewerBlock usable in isolated
 * test / preview contexts without a provider.
 */
export function useAnnotations(): AnnotationContextValue | null {
  return useContext(AnnotationContext);
}
