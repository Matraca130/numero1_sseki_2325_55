// ============================================================
// Axon — useSummaryReaderMutations
//
// Extracted from StudentSummaryReader.tsx (Phase 2, Step 2).
// Encapsulates all 7 mutations + thin handlers + derived flags.
//
// Design:
//   - Handlers take values as parameters (not read from state)
//   - Form state reset delegated via callbacks (onAnnotationCreated, etc.)
//   - showXpToast managed internally (mutation side effect)
//   - Optimistic deletes for annotations and kw-notes
//
// Consumer: StudentSummaryReader.tsx (orchestrator)
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { ReadingState, TextAnnotation, KwStudentNote } from '@/app/services/studentSummariesApi';
import { createStudySession, closeStudySession } from '@/app/services/studySessionApi';
import { queryKeys } from '@/app/hooks/queries/queryKeys';
import { useStudyPlanBridge } from '@/app/hooks/useStudyPlanBridge';

// ── Args ──────────────────────────────────────────────────

export interface UseSummaryReaderMutationsArgs {
  summaryId: string;
  topicId: string;
  /** Atomic snapshot from useReadingTimeTracker — captures total AND resets session clock */
  snapshotForExternalSave: () => number;
  /** Propagate reading state changes back to parent (React Query cache refresh) */
  onReadingStateChanged: (rs: ReadingState) => void;
  /** Invalidate annotations query cache (from useSummaryReaderQueries) */
  invalidateAnnotations: () => void;
  /** Invalidate kw-notes query cache for a specific keyword (from useKeywordDetailQueries) */
  invalidateKwNotes: (keywordId: string) => void;
  // ── Form state reset callbacks (invoked in onSuccess) ──
  /** Called after annotation created — consumer resets form state */
  onAnnotationCreated: () => void;
  /** Called after kw-note created — consumer resets input */
  onKwNoteCreated: () => void;
  /** Called after kw-note updated — consumer exits edit mode */
  onKwNoteUpdated: () => void;
}

// ── Return ────────────────────────────────────────────────

export interface UseSummaryReaderMutationsReturn {
  handleMarkCompleted: () => void;
  handleUnmarkCompleted: () => void;
  /** Create annotation — values passed as params (not read from state) */
  handleCreateAnnotation: (note: string, color: string) => void;
  handleDeleteAnnotation: (id: string) => void;
  /** Create keyword note — values passed as params */
  handleCreateKwNote: (keywordId: string, note: string) => void;
  /** Update keyword note — values passed as params */
  handleUpdateKwNote: (noteId: string, keywordId: string, note: string) => void;
  handleDeleteKwNote: (noteId: string, keywordId: string) => void;
  // Derived loading flags
  markingRead: boolean;
  savingAnnotation: boolean;
  savingKwNote: boolean;
  /** XP toast visibility — auto-clears after 3s */
  showXpToast: boolean;
}

// ── Hook ──────────────────────────────────────────────────

export function useSummaryReaderMutations({
  summaryId,
  topicId,
  snapshotForExternalSave,
  onReadingStateChanged,
  invalidateAnnotations,
  invalidateKwNotes,
  onAnnotationCreated,
  onKwNoteCreated,
  onKwNoteUpdated,
}: UseSummaryReaderMutationsArgs): UseSummaryReaderMutationsReturn {
  const rqClient = useQueryClient();
  const { markSessionComplete } = useStudyPlanBridge();

  // ── Study session lifecycle ─────────────────────────────
  const sessionIdRef = useRef<string | null>(null);
  const sessionClosedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    createStudySession({ session_type: 'reading' })
      .then((session) => {
        if (!cancelled) sessionIdRef.current = session.id;
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('[SummaryReader] Failed to create study session:', err);
      });

    return () => {
      cancelled = true;
      if (sessionIdRef.current && !sessionClosedRef.current) {
        sessionClosedRef.current = true;
        closeStudySession(sessionIdRef.current, {
          completed_at: new Date().toISOString(),
          total_reviews: 0,
          correct_reviews: 0,
        }).catch(() => {});
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── XP Toast state (mutation side effect) ───────────────
  const [showXpToast, setShowXpToast] = useState(false);

  // ── 1. Mark as completed ────────────────────────────
  const markCompletedMutation = useMutation({
    mutationFn: () => {
      // Atomic snapshot: captures total AND resets session clock
      // so periodic save won't race with this call
      const totalTime = snapshotForExternalSave();
      return studentApi.upsertReadingState({
        summary_id: summaryId,
        completed: true,
        time_spent_seconds: totalTime,
        last_read_at: new Date().toISOString(),
      });
    },
    onSuccess: (rs) => {
      onReadingStateChanged(rs);
      setShowXpToast(true);
      setTimeout(() => setShowXpToast(false), 3000);
      toast.success('Resumen marcado como leido');
      rqClient.invalidateQueries({ queryKey: queryKeys.topicProgress(topicId) });
      markSessionComplete('reading');
      // Close the study session so it appears in history with XP
      if (sessionIdRef.current && !sessionClosedRef.current) {
        sessionClosedRef.current = true;
        closeStudySession(sessionIdRef.current, {
          completed_at: new Date().toISOString(),
          total_reviews: 0,
          correct_reviews: 0,
        }).catch(() => {});
      }
    },
    onError: (err: any) => toast.error(err.message || 'Error al marcar como leido'),
  });

  // ── 2. Unmark completed ─────────────────────────────
  const unmarkCompletedMutation = useMutation({
    mutationFn: () => studentApi.upsertReadingState({ summary_id: summaryId, completed: false }),
    onSuccess: (rs) => {
      onReadingStateChanged(rs);
      toast.success('Marcado como no leido');
      rqClient.invalidateQueries({ queryKey: queryKeys.topicProgress(topicId) });
    },
    onError: (err: any) => toast.error(err.message || 'Error al actualizar'),
  });

  // ── 3. Annotation create ────────────────────────────
  const createAnnotationMutation = useMutation({
    mutationFn: (vars: { note: string; color: string }) =>
      studentApi.createTextAnnotation({
        summary_id: summaryId,
        start_offset: 0, end_offset: 0,
        color: vars.color,
        note: vars.note,
      }),
    onSuccess: () => {
      toast.success('Anotacion creada');
      onAnnotationCreated();
      invalidateAnnotations();
    },
    onError: (err: any) => toast.error(err.message || 'Error al crear anotacion'),
  });

  // ── 4. Annotation delete (optimistic) ───────────────
  const deleteAnnotationMutation = useMutation({
    mutationFn: (id: string) => studentApi.deleteTextAnnotation(id),
    onMutate: async (id) => {
      await rqClient.cancelQueries({ queryKey: queryKeys.summaryAnnotations(summaryId) });
      const previous = rqClient.getQueryData<TextAnnotation[]>(queryKeys.summaryAnnotations(summaryId));
      rqClient.setQueryData<TextAnnotation[]>(
        queryKeys.summaryAnnotations(summaryId),
        (old) => old?.filter(a => a.id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) rqClient.setQueryData(queryKeys.summaryAnnotations(summaryId), context.previous);
      toast.error('Error al eliminar anotacion');
    },
    onSuccess: () => toast.success('Anotacion eliminada'),
    onSettled: () => invalidateAnnotations(),
  });

  // ── 5. KW Note create ───────────────────────────────
  const createKwNoteMutation = useMutation({
    mutationFn: (vars: { keywordId: string; note: string }) =>
      studentApi.createKwStudentNote({ keyword_id: vars.keywordId, note: vars.note }),
    onSuccess: (_data, vars) => {
      toast.success('Nota agregada');
      onKwNoteCreated();
      invalidateKwNotes(vars.keywordId);
    },
    onError: (err: any) => toast.error(err.message || 'Error al crear nota'),
  });

  // ── 6. KW Note update ──────────────────────────────
  const updateKwNoteMutation = useMutation({
    mutationFn: (vars: { noteId: string; keywordId: string; note: string }) =>
      studentApi.updateKwStudentNote(vars.noteId, { note: vars.note }),
    onSuccess: (_data, vars) => {
      toast.success('Nota actualizada');
      onKwNoteUpdated();
      invalidateKwNotes(vars.keywordId);
    },
    onError: (err: any) => toast.error(err.message || 'Error al actualizar'),
  });

  // ── 7. KW Note delete (optimistic) ─────────────────
  const deleteKwNoteMutation = useMutation({
    mutationFn: (vars: { noteId: string; keywordId: string }) =>
      studentApi.deleteKwStudentNote(vars.noteId),
    onMutate: async (vars) => {
      await rqClient.cancelQueries({ queryKey: queryKeys.kwNotes(vars.keywordId) });
      const previous = rqClient.getQueryData<KwStudentNote[]>(queryKeys.kwNotes(vars.keywordId));
      rqClient.setQueryData<KwStudentNote[]>(
        queryKeys.kwNotes(vars.keywordId),
        (old) => old?.filter(n => n.id !== vars.noteId) ?? [],
      );
      return { previous };
    },
    onError: (_err, vars, context) => {
      if (context?.previous) rqClient.setQueryData(queryKeys.kwNotes(vars.keywordId), context.previous);
      toast.error('Error al eliminar nota');
    },
    onSuccess: () => toast.success('Nota eliminada'),
    onSettled: (_d, _e, vars) => invalidateKwNotes(vars.keywordId),
  });

  // ── Derived loading flags ────────────────────────────
  const markingRead = markCompletedMutation.isPending || unmarkCompletedMutation.isPending;
  const savingAnnotation = createAnnotationMutation.isPending;
  const savingKwNote = createKwNoteMutation.isPending || updateKwNoteMutation.isPending;

  // ── Thin handlers ──────────────────────────────────
  // Values received as parameters — decoupled from component form state.

  const handleMarkCompleted = () => markCompletedMutation.mutate();
  const handleUnmarkCompleted = () => unmarkCompletedMutation.mutate();

  const handleCreateAnnotation = (note: string, color: string) => {
    if (!note.trim()) return;
    createAnnotationMutation.mutate({ note: note.trim(), color });
  };

  const handleDeleteAnnotation = (id: string) => deleteAnnotationMutation.mutate(id);

  const handleCreateKwNote = (keywordId: string, note: string) => {
    if (!note.trim()) return;
    createKwNoteMutation.mutate({ keywordId, note: note.trim() });
  };

  const handleUpdateKwNote = (noteId: string, keywordId: string, note: string) => {
    if (!note.trim()) return;
    updateKwNoteMutation.mutate({ noteId, keywordId, note: note.trim() });
  };

  const handleDeleteKwNote = (noteId: string, keywordId: string) =>
    deleteKwNoteMutation.mutate({ noteId, keywordId });

  return {
    handleMarkCompleted,
    handleUnmarkCompleted,
    handleCreateAnnotation,
    handleDeleteAnnotation,
    handleCreateKwNote,
    handleUpdateKwNote,
    handleDeleteKwNote,
    markingRead,
    savingAnnotation,
    savingKwNote,
    showXpToast,
  };
}
