// ============================================================
// Axon — useQuestionCrud Hook (R4 extraction)
//
// Encapsulates CRUD modal state + handlers for quiz questions.
// Extracted from QuizQuestionsEditor to reduce component size
// and enable reuse.
//
// Owns: showModal, editingQuestion state
// Delegates: actual API calls to quizApi service layer
// ============================================================

import { useState, useCallback } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion } from '@/app/services/quizApi';
import { toast } from 'sonner';
import { getErrorMsg } from '@/app/lib/error-utils';

// ── Hook ──────────────────────────────────────────────────

export function useQuestionCrud(loadQuestions: () => Promise<void>) {
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await quizApi.deleteQuizQuestion(id);
      toast.success('Pregunta eliminada');
      await loadQuestions();
    } catch (err: unknown) {
      toast.error(getErrorMsg(err) || 'Error al eliminar');
    }
  }, [loadQuestions]);

  const handleRestore = useCallback(async (id: string) => {
    try {
      await quizApi.restoreQuizQuestion(id);
      toast.success('Pregunta restaurada');
      await loadQuestions();
    } catch (err: unknown) {
      toast.error(getErrorMsg(err) || 'Error al restaurar');
    }
  }, [loadQuestions]);

  const handleEdit = useCallback((q: QuizQuestion) => {
    setEditingQuestion(q);
    setShowModal(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingQuestion(null);
    setShowModal(true);
  }, []);

  const handleSaved = useCallback(() => {
    setShowModal(false);
    setEditingQuestion(null);
    loadQuestions();
  }, [loadQuestions]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingQuestion(null);
  }, []);

  return {
    showModal,
    editingQuestion,
    handleDelete,
    handleRestore,
    handleEdit,
    handleCreate,
    handleSaved,
    handleCloseModal,
  } as const;
}
