// ============================================================
// Axon — useTextAnnotations Hook
//
// Manages text annotations (highlights + notes) on summaries.
// CRUD operations with optimistic updates.
//
// Backend: text-annotations CRUD via textAnnotationsApi.ts
// UI Consumer: TextAnnotationsPanel.tsx
// ============================================================

import { useState, useCallback, useRef } from 'react';
import {
  getAnnotationsBySummary,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  type TextAnnotation,
  type CreateAnnotationInput,
  type UpdateAnnotationInput,
} from '@/app/services/textAnnotationsApi';

export type AnnotationsPhase = 'idle' | 'loading' | 'ready' | 'error';

export function useTextAnnotations() {
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [phase, setPhase] = useState<AnnotationsPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const activeSummaryRef = useRef<string | null>(null);

  // ── Load annotations for a summary ──────────────────────
  const loadAnnotations = useCallback(async (summaryId: string) => {
    activeSummaryRef.current = summaryId;
    setPhase('loading');
    setError(null);
    try {
      const result = await getAnnotationsBySummary(summaryId);
      if (activeSummaryRef.current !== summaryId) return;
      setAnnotations(result);
      setPhase('ready');
    } catch (err: any) {
      if (activeSummaryRef.current !== summaryId) return;
      setError(err.message || 'Error al cargar anotaciones');
      setPhase('error');
    }
  }, []);

  // ── Create annotation ───────────────────────────────
  const addAnnotation = useCallback(async (input: CreateAnnotationInput): Promise<TextAnnotation | null> => {
    try {
      const newAnnotation = await createAnnotation(input);
      setAnnotations(prev => [newAnnotation, ...prev]);
      return newAnnotation;
    } catch (err: any) {
      console.error('[useTextAnnotations] Create error:', err);
      return null;
    }
  }, []);

  // ── Update annotation ───────────────────────────────
  const editAnnotation = useCallback(async (id: string, input: UpdateAnnotationInput): Promise<boolean> => {
    try {
      const updated = await updateAnnotation(id, input);
      setAnnotations(prev => prev.map(a => a.id === id ? updated : a));
      return true;
    } catch (err: any) {
      console.error('[useTextAnnotations] Update error:', err);
      return false;
    }
  }, []);

  // ── Delete annotation ───────────────────────────────
  const removeAnnotation = useCallback(async (id: string): Promise<boolean> => {
    const previous = annotations;
    setAnnotations(prev => prev.filter(a => a.id !== id));
    try {
      await deleteAnnotation(id);
      return true;
    } catch (err: any) {
      console.error('[useTextAnnotations] Delete error:', err);
      setAnnotations(previous);
      return false;
    }
  }, [annotations]);

  // ── Reset ───────────────────────────────────────────────
  const reset = useCallback(() => {
    setAnnotations([]);
    setPhase('idle');
    setError(null);
    activeSummaryRef.current = null;
  }, []);

  return {
    annotations,
    phase,
    error,
    loadAnnotations,
    addAnnotation,
    editAnnotation,
    removeAnnotation,
    reset,
  };
}
