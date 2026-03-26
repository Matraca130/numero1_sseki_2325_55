// ============================================================
// Axon — Professor: Quizzes Manager (EV-3)
//
// BACKEND STATUS: /quizzes CRUD routes ARE LIVE.
//   GET    /quizzes?summary_id=xxx
//   POST   /quizzes { summary_id, title, description, source }
//   PUT    /quizzes/:id
//   DELETE /quizzes/:id (soft delete)
//
// Uses typed service functions from quizApi.ts
// R5 refactor: QuizEntityCard extracted with React.memo
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { Quiz } from '@/app/services/quizApi';
import { AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  ClipboardList, Plus,
  Loader2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { BANNER_WARNING } from '@/app/services/quizDesignTokens';
import type { KeywordRef } from '@/app/types/platform';
import { QuizQuestionsEditor } from '@/app/components/professor/QuizQuestionsEditor';
import { logger } from '@/app/lib/logger';
import { ApiError, getErrorMsg } from '@/app/lib/error-utils';
import { QuizFormModal } from './QuizFormModal';
import { QuizAnalyticsPanel } from '@/app/components/professor/QuizAnalyticsPanel';
import { QuizEntityCard } from './QuizEntityCard';

// ── Error boundary (Phase 7c) ────────────────────
import { QuizErrorBoundary } from '@/app/components/shared/QuizErrorBoundary';

// ── Props ───────────────────────────────────────────────

interface QuizzesManagerProps {
  summaryId: string;
  summaryTitle?: string;
  keywords: KeywordRef[];
}

// ── Main Component ──────────────────────────────────────

export function QuizzesManager({ summaryId, summaryTitle, keywords }: QuizzesManagerProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Questions editor
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

  // Analytics modal (P4)
  const [analyticsQuiz, setAnalyticsQuiz] = useState<Quiz | null>(null);

  // ── Load quizzes ───────────────────────────────────
  const loadQuizzes = useCallback(async () => {
    if (!summaryId) return;
    setLoading(true);
    setBackendError(null);
    try {
      const res = await quizApi.getQuizzes(summaryId);
      if (Array.isArray(res)) {
        setQuizzes(res);
      } else if (res && typeof res === 'object' && 'items' in res) {
        setQuizzes(res.items || []);
      } else {
        setQuizzes([]);
      }
    } catch (err: unknown) {
      const errMsg = getErrorMsg(err);
      logger.warn('[QuizzesManager] Load error:', errMsg);
      if (err instanceof ApiError && err.status === 404) {
        setBackendError(
          'Las rutas CRUD de /quizzes aun no existen en el backend. ' +
          'Este componente esta listo para funcionar cuando se desplieguen.'
        );
      } else {
        setBackendError(errMsg || 'Error al cargar quizzes');
      }
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, [summaryId]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  // ── Handlers ──────────────────────────────────────
  const handleCreate = () => {
    setEditingQuiz(null);
    setShowModal(true);
  };

  const handleEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await quizApi.deleteQuiz(id);
      toast.success('Quiz eliminado');
      setDeletingId(null);
      await loadQuizzes();
    } catch (err: unknown) {
      toast.error(getErrorMsg(err) || 'Error al eliminar quiz');
    }
  };

  const handleToggleActive = async (quiz: Quiz) => {
    try {
      await quizApi.updateQuiz(quiz.id, { is_active: !quiz.is_active });
      toast.success(quiz.is_active ? 'Quiz desactivado' : 'Quiz activado');
      await loadQuizzes();
    } catch (err: unknown) {
      toast.error(getErrorMsg(err) || 'Error al cambiar estado');
    }
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditingQuiz(null);
    loadQuizzes();
  };

  // ── If viewing questions editor ─────────────────────
  if (selectedQuiz) {
    return (
      <QuizQuestionsEditor
        quiz={selectedQuiz}
        summaryId={summaryId}
        keywords={keywords}
        onBack={() => setSelectedQuiz(null)}
      />
    );
  }

  // ── Render ──────────────────────────────────────────
  return (
    <QuizErrorBoundary label="Gestion de Quizzes" accentColor="purple">
      <div className="flex flex-col h-full">
        {/* Backend warning banner */}
        {backendError && (
          <div className={`mx-4 mt-4 ${BANNER_WARNING}`}>
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="text-[12px]" style={{ fontWeight: 600 }}>Backend pendiente de actualizacion</p>
              <p className="text-[11px] text-amber-700 mt-0.5">{backendError}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#2a8c7a] flex items-center justify-center shadow-sm">
                <ClipboardList size={17} className="text-white" />
              </div>
              <div>
                <h2 className="text-[14px] text-zinc-900" style={{ fontWeight: 700 }}>
                  Quizzes del resumen
                </h2>
                {summaryTitle && (
                  <p className="text-[11px] text-zinc-400 truncate max-w-[300px]">{summaryTitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!!backendError}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[12px] transition-all',
                backendError
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'bg-[#2a8c7a] text-white hover:bg-[#244e47] active:scale-[0.97] shadow-lg shadow-[#2a8c7a]/25'
              )}
              style={{ fontWeight: 600 }}
            >
              <Plus size={14} />
              Crear quiz
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-5 bg-zinc-50">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-teal-500" size={24} />
            </div>
          ) : quizzes.length === 0 && !backendError ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <ClipboardList size={36} className="opacity-30" />
              <p className="text-sm">No hay quizzes en este resumen</p>
              <button
                onClick={handleCreate}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full text-[12px] hover:bg-teal-200 transition-colors"
                style={{ fontWeight: 600 }}
              >
                <Plus size={14} />
                Crear primer quiz
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-w-3xl">
              {quizzes.map((quiz) => (
                <QuizEntityCard
                  key={quiz.id}
                  quiz={quiz}
                  isDeleting={deletingId === quiz.id}
                  onOpenQuestions={() => setSelectedQuiz(quiz)}
                  onAnalytics={() => setAnalyticsQuiz(quiz)}
                  onToggleActive={() => handleToggleActive(quiz)}
                  onEdit={() => handleEdit(quiz)}
                  onRequestDelete={() => setDeletingId(quiz.id)}
                  onConfirmDelete={() => handleDelete(quiz.id)}
                  onCancelDelete={() => setDeletingId(null)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {showModal && (
            <QuizFormModal
              summaryId={summaryId}
              quiz={editingQuiz}
              onClose={() => { setShowModal(false); setEditingQuiz(null); }}
              onSaved={handleSaved}
            />
          )}
        </AnimatePresence>

        {/* Analytics Modal (P4) */}
        <AnimatePresence>
          {analyticsQuiz && (
            <QuizAnalyticsPanel
              quizId={analyticsQuiz.id}
              quizTitle={analyticsQuiz.title}
              summaryId={summaryId}
              onClose={() => setAnalyticsQuiz(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </QuizErrorBoundary>
  );
}
