// ============================================================
// Axon — Professor: Quizzes Manager (EV-3)
//
// Uses typed service functions from quizApi.ts
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { Quiz, QuizEntityListResponse } from '@/app/services/quizApi';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  ClipboardList, Plus, Pencil, Trash2,
  Loader2, AlertTriangle, BookOpen, Eye, EyeOff, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { BANNER_WARNING } from '@/app/services/quizDesignTokens';
import type { KeywordRef } from '@/app/types/platform';
import { QuizQuestionsEditor } from '@/app/components/professor/QuizQuestionsEditor';
import { logger } from '@/app/lib/logger';
import { ApiError, getErrorMsg } from '@/app/lib/error-utils';
import { QuizFormModal } from './QuizFormModal';
import { QuizAnalyticsPanel } from '@/app/components/professor/QuizAnalyticsPanel';
import { QuizErrorBoundary } from '@/app/components/shared/QuizErrorBoundary';

interface QuizzesManagerProps {
  summaryId: string;
  summaryTitle?: string;
  keywords: KeywordRef[];
}

export function QuizzesManager({ summaryId, summaryTitle, keywords }: QuizzesManagerProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [analyticsQuiz, setAnalyticsQuiz] = useState<Quiz | null>(null);

  const loadQuizzes = useCallback(async () => {
    if (!summaryId) return;
    setLoading(true); setBackendError(null);
    try {
      const res = await quizApi.getQuizzes(summaryId);
      if (Array.isArray(res)) setQuizzes(res);
      else if (res && typeof res === 'object' && 'items' in res) setQuizzes(res.items || []);
      else setQuizzes([]);
    } catch (err: unknown) {
      const errMsg = getErrorMsg(err);
      logger.warn('[QuizzesManager] Load error:', errMsg);
      if (err instanceof ApiError && err.status === 404) {
        setBackendError('Las rutas CRUD de /quizzes aun no existen en el backend. Este componente esta listo para funcionar cuando se desplieguen.');
      } else {
        setBackendError(errMsg || 'Error al cargar quizzes');
      }
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, [summaryId]);

  useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

  const handleCreate = () => { setEditingQuiz(null); setShowModal(true); };
  const handleEdit = (quiz: Quiz) => { setEditingQuiz(quiz); setShowModal(true); };
  const handleDelete = async (id: string) => {
    try { await quizApi.deleteQuiz(id); toast.success('Quiz eliminado'); setDeletingId(null); await loadQuizzes(); }
    catch (err: unknown) { toast.error(getErrorMsg(err) || 'Error al eliminar quiz'); }
  };
  const handleToggleActive = async (quiz: Quiz) => {
    try { await quizApi.updateQuiz(quiz.id, { is_active: !quiz.is_active }); toast.success(quiz.is_active ? 'Quiz desactivado' : 'Quiz activado'); await loadQuizzes(); }
    catch (err: unknown) { toast.error(getErrorMsg(err) || 'Error al cambiar estado'); }
  };
  const handleSaved = () => { setShowModal(false); setEditingQuiz(null); loadQuizzes(); };
  const handleOpenQuestions = (quiz: Quiz) => { setSelectedQuiz(quiz); };

  if (selectedQuiz) {
    return <QuizQuestionsEditor quiz={selectedQuiz} summaryId={summaryId} keywords={keywords} onBack={() => setSelectedQuiz(null)} />;
  }

  return (
    <QuizErrorBoundary label="Gestion de Quizzes" accentColor="purple">
      <div className="flex flex-col h-full">
        {backendError && (
          <div className={`mx-4 mt-4 ${BANNER_WARNING}`}>
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="text-[12px]" style={{ fontWeight: 600 }}>Backend pendiente de actualizacion</p>
              <p className="text-[11px] text-amber-700 mt-0.5">{backendError}</p>
            </div>
          </div>
        )}
        <div className="px-5 py-4 border-b border-zinc-200 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-sm"><ClipboardList size={17} className="text-white" /></div>
              <div>
                <h2 className="text-[14px] text-zinc-900" style={{ fontWeight: 700 }}>Quizzes del resumen</h2>
                {summaryTitle && <p className="text-[11px] text-zinc-400 truncate max-w-[300px]">{summaryTitle}</p>}
              </div>
            </div>
            <button onClick={handleCreate} disabled={!!backendError} className={clsx('flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] transition-all', backendError ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-[0.97] shadow-lg shadow-purple-600/25')} style={{ fontWeight: 600 }}>
              <Plus size={14} /> Crear quiz
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-5 bg-zinc-50">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-purple-500" size={24} /></div>
          ) : quizzes.length === 0 && !backendError ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <ClipboardList size={36} className="opacity-30" />
              <p className="text-sm">No hay quizzes en este resumen</p>
              <button onClick={handleCreate} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-[12px] hover:bg-purple-200 transition-colors" style={{ fontWeight: 600 }}><Plus size={14} /> Crear primer quiz</button>
            </div>
          ) : (
            <div className="space-y-3 max-w-3xl">
              {quizzes.map((quiz) => (
                <motion.div key={quiz.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className={clsx('bg-white rounded-2xl border px-5 py-4 transition-all', quiz.is_active ? 'border-zinc-200 hover:border-purple-200 hover:shadow-xl hover:shadow-zinc-900/5' : 'border-red-200 bg-red-50/30 opacity-75')}>
                  <div className="flex items-center gap-3">
                    <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', quiz.is_active ? 'bg-purple-50' : 'bg-red-50')}>
                      <ClipboardList size={17} className={quiz.is_active ? 'text-purple-500' : 'text-red-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-[13px] text-gray-800 truncate" style={{ fontWeight: 600 }}>{quiz.title}</h3>
                        <span className={clsx('px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider shrink-0', quiz.source === 'ai' ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500')} style={{ fontWeight: 700 }}>{quiz.source}</span>
                        {!quiz.is_active && <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[9px] uppercase shrink-0" style={{ fontWeight: 700 }}>Inactivo</span>}
                      </div>
                      {quiz.description && <p className="text-[11px] text-gray-400 truncate">{quiz.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleOpenQuestions(quiz)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-purple-600 hover:bg-purple-50 transition-colors" style={{ fontWeight: 600 }} title="Editar preguntas"><BookOpen size={13} /> Preguntas <ChevronRight size={12} /></button>
                      <button onClick={() => setAnalyticsQuiz(quiz)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Analytics"><Eye size={14} /></button>
                      <button onClick={() => handleToggleActive(quiz)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title={quiz.is_active ? 'Desactivar' : 'Activar'}>{quiz.is_active ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                      <button onClick={() => handleEdit(quiz)} className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors" title="Editar"><Pencil size={14} /></button>
                      <button onClick={() => setDeletingId(quiz.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {deletingId === quiz.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <p className="text-[11px] text-red-600">Confirmar eliminacion de "{quiz.title}"?</p>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setDeletingId(null)} className="px-2.5 py-1 rounded-lg text-[11px] text-gray-500 hover:bg-gray-100 transition-colors" style={{ fontWeight: 500 }}>Cancelar</button>
                            <button onClick={() => handleDelete(quiz.id)} className="px-2.5 py-1 rounded-lg text-[11px] text-white bg-red-500 hover:bg-red-600 transition-colors" style={{ fontWeight: 600 }}>Eliminar</button>
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
        <AnimatePresence>
          {showModal && (<QuizFormModal summaryId={summaryId} quiz={editingQuiz} onClose={() => { setShowModal(false); setEditingQuiz(null); }} onSaved={handleSaved} />)}
        </AnimatePresence>
        <AnimatePresence>
          {analyticsQuiz && (<QuizAnalyticsPanel quizId={analyticsQuiz.id} quizTitle={analyticsQuiz.title} summaryId={summaryId} onClose={() => setAnalyticsQuiz(null)} />)}
        </AnimatePresence>
      </div>
    </QuizErrorBoundary>
  );
}
