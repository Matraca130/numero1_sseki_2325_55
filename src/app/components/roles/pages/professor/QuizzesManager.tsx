// ============================================================
// Axon — Professor: Quizzes Manager (EV-3 — Optimistic Frontend)
//
// BACKEND STATUS: /quizzes CRUD routes DO NOT EXIST YET.
// This component makes the correct API calls but gracefully
// handles 404s with a "backend pendiente" banner.
//
// Backend routes (when deployed):
//   GET    /quizzes?summary_id=xxx
//   POST   /quizzes { summary_id, title, description, source }
//   PUT    /quizzes/:id
//   DELETE /quizzes/:id (soft delete)
//
// Uses apiCall() from lib/api.ts
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/app/lib/api';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  ClipboardList, Plus, Pencil, Trash2, X, Check, AlertCircle,
  Loader2, AlertTriangle, BookOpen, Eye, EyeOff, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { QuizQuestionsEditor } from '@/app/components/professor/QuizQuestionsEditor';

// ── Types ─────────────────────────────────────────────────

export interface Quiz {
  id: string;
  summary_id: string;
  title: string;
  description: string | null;
  source: 'manual' | 'ai';
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

interface QuizListResponse {
  items: Quiz[];
  total: number;
  limit: number;
  offset: number;
}

// ── Props ─────────────────────────────────────────────────

interface QuizzesManagerProps {
  summaryId: string;
  summaryTitle?: string;
  keywords: Array<{ id: string; term?: string; name?: string }>;
}

// ── Main Component ────────────────────────────────────────

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

  // ── Load quizzes ────────────────────────────────────────
  const loadQuizzes = useCallback(async () => {
    if (!summaryId) return;
    setLoading(true);
    setBackendError(null);
    try {
      const res = await apiCall<QuizListResponse | Quiz[]>(
        `/quizzes?summary_id=${summaryId}`
      );
      // Handle both paginated and array responses
      if (Array.isArray(res)) {
        setQuizzes(res);
      } else if (res && typeof res === 'object' && 'items' in res) {
        setQuizzes(res.items || []);
      } else {
        setQuizzes([]);
      }
    } catch (err: any) {
      console.warn('[QuizzesManager] Load error:', err.message);
      if (err.message?.includes('404') || err.message?.includes('Not Found') || err.message?.includes('not found')) {
        setBackendError(
          'Las rutas CRUD de /quizzes aun no existen en el backend. ' +
          'Este componente esta listo para funcionar cuando se desplieguen.'
        );
      } else {
        setBackendError(err.message || 'Error al cargar quizzes');
      }
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, [summaryId]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  // ── Handlers ────────────────────────────────────────────
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
      await apiCall(`/quizzes/${id}`, { method: 'DELETE' });
      toast.success('Quiz eliminado');
      setDeletingId(null);
      await loadQuizzes();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar quiz');
    }
  };

  const handleToggleActive = async (quiz: Quiz) => {
    try {
      await apiCall(`/quizzes/${quiz.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !quiz.is_active }),
      });
      toast.success(quiz.is_active ? 'Quiz desactivado' : 'Quiz activado');
      await loadQuizzes();
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado');
    }
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditingQuiz(null);
    loadQuizzes();
  };

  const handleOpenQuestions = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
  };

  // ── If viewing questions editor ─────────────────────────
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

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Backend warning banner */}
      {backendError && (
        <div className="mx-4 mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="text-[12px]" style={{ fontWeight: 600 }}>Backend pendiente de actualizacion</p>
            <p className="text-[11px] text-amber-700 mt-0.5">{backendError}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <ClipboardList size={16} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-[14px] text-gray-900" style={{ fontWeight: 700 }}>
                Quizzes del resumen
              </h2>
              {summaryTitle && (
                <p className="text-[11px] text-gray-400 truncate max-w-[300px]">{summaryTitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!!backendError}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] transition-all shadow-sm',
              backendError
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-[0.97]'
            )}
            style={{ fontWeight: 600 }}
          >
            <Plus size={14} />
            Crear quiz
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-purple-500" size={24} />
          </div>
        ) : quizzes.length === 0 && !backendError ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <ClipboardList size={36} className="opacity-30" />
            <p className="text-sm">No hay quizzes en este resumen</p>
            <button
              onClick={handleCreate}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-[12px] hover:bg-purple-200 transition-colors"
              style={{ fontWeight: 600 }}
            >
              <Plus size={14} />
              Crear primer quiz
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {quizzes.map((quiz) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx(
                  'bg-white rounded-xl border px-4 py-3 transition-all',
                  quiz.is_active
                    ? 'border-gray-200 hover:border-purple-200 hover:shadow-sm'
                    : 'border-red-200 bg-red-50/30 opacity-75'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={clsx(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    quiz.is_active ? 'bg-purple-50' : 'bg-red-50'
                  )}>
                    <ClipboardList size={16} className={quiz.is_active ? 'text-purple-500' : 'text-red-400'} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-[13px] text-gray-800 truncate" style={{ fontWeight: 600 }}>
                        {quiz.title}
                      </h3>
                      <span className={clsx(
                        'px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider shrink-0',
                        quiz.source === 'ai'
                          ? 'bg-violet-100 text-violet-600'
                          : 'bg-gray-100 text-gray-500'
                      )} style={{ fontWeight: 700 }}>
                        {quiz.source}
                      </span>
                      {!quiz.is_active && (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[9px] uppercase shrink-0" style={{ fontWeight: 700 }}>
                          Inactivo
                        </span>
                      )}
                    </div>
                    {quiz.description && (
                      <p className="text-[11px] text-gray-400 truncate">{quiz.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Open questions */}
                    <button
                      onClick={() => handleOpenQuestions(quiz)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-purple-600 hover:bg-purple-50 transition-colors"
                      style={{ fontWeight: 600 }}
                      title="Editar preguntas"
                    >
                      <BookOpen size={13} />
                      Preguntas
                      <ChevronRight size={12} />
                    </button>

                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggleActive(quiz)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title={quiz.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {quiz.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(quiz)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeletingId(quiz.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Delete confirmation */}
                <AnimatePresence>
                  {deletingId === quiz.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-[11px] text-red-600">
                          Confirmar eliminacion de "{quiz.title}"?
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-2.5 py-1 rounded-lg text-[11px] text-gray-500 hover:bg-gray-100 transition-colors"
                            style={{ fontWeight: 500 }}
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleDelete(quiz.id)}
                            className="px-2.5 py-1 rounded-lg text-[11px] text-white bg-red-500 hover:bg-red-600 transition-colors"
                            style={{ fontWeight: 600 }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
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
    </div>
  );
}

// ── Quiz Create/Edit Modal ────────────────────────────────

function QuizFormModal({
  summaryId,
  quiz,
  onClose,
  onSaved,
}: {
  summaryId: string;
  quiz: Quiz | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!quiz;

  const [title, setTitle] = useState(quiz?.title || '');
  const [description, setDescription] = useState(quiz?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError('El titulo es obligatorio');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && quiz) {
        await apiCall(`/quizzes/${quiz.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
          }),
        });
        toast.success('Quiz actualizado');
      } else {
        await apiCall('/quizzes', {
          method: 'POST',
          body: JSON.stringify({
            summary_id: summaryId,
            title: title.trim(),
            description: description.trim() || null,
            source: 'manual',
          }),
        });
        toast.success('Quiz creado');
      }
      onSaved();
    } catch (err: any) {
      const msg = err.message || 'Error al guardar';
      if (msg.includes('404') || msg.includes('Not Found')) {
        setError('Ruta /quizzes aun no existe en el backend. Pendiente de despliegue.');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[480px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              {isEdit ? <Pencil size={16} className="text-purple-600" /> : <Plus size={16} className="text-purple-600" />}
            </div>
            <div>
              <h3 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
                {isEdit ? 'Editar quiz' : 'Nuevo quiz'}
              </h3>
              <p className="text-[10px] text-gray-400">
                {isEdit ? 'Modifica titulo y descripcion' : 'Crea un quiz para agrupar preguntas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px]">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div>
            <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
              Titulo *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Quiz de anatomia - Tema 3"
              className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 placeholder:text-gray-300"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
              Descripcion <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripcion breve del quiz..."
              rows={3}
              className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
            style={{ fontWeight: 500 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={clsx(
              'flex items-center gap-2 px-5 py-2 rounded-lg text-[12px] text-white transition-all shadow-sm',
              saving
                ? 'bg-purple-400 cursor-wait'
                : 'bg-purple-600 hover:bg-purple-700 active:scale-[0.97]'
            )}
            style={{ fontWeight: 600 }}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Guardando...</>
            ) : (
              <><Check size={14} /> {isEdit ? 'Guardar cambios' : 'Crear quiz'}</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default QuizzesManager;
