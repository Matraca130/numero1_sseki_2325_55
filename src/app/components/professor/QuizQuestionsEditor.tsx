// ============================================================
// Axon — Professor: Quiz Questions Editor (EV-3 — Optimistic Frontend)
//
// BACKEND STATUS:
//   - GET /quiz-questions?quiz_id=xxx → SUPPORTED (quiz_id in optionalFilters)
//   - POST quiz_id in body → SUPPORTED (quiz_id in createFields)
//   - POST subtopic_id in body → SUPPORTED (subtopic_id in createFields)
//   - keyword_id → REQUIRED (NOT NULL in DB)
//   - created_by → AUTO from auth token
//   - difficulty → INTEGER (1/2/3)
//   - question_type → "mcq"|"true_false"|"fill_blank"|"open"
//
// Graceful error handling: shows "backend pendiente" banner on 404.
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiCall } from '@/app/lib/api';
import * as quizApi from '@/app/services/quizApi';
import type {
  QuizQuestion,
  QuestionType,
  QuizQuestionListResponse,
} from '@/app/services/quizApi';
import {
  QUESTION_TYPE_LABELS,
} from '@/app/services/quizConstants';
import { QuestionCard } from '@/app/components/professor/QuestionCard';
import { QuestionFormModal } from '@/app/components/professor/QuestionFormModal';
import { AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Plus,
  Loader2, AlertTriangle, HelpCircle,
  Search, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Quiz } from '@/app/services/quizApi';
import { logger } from '@/app/lib/logger';

// ── Props ─────────────────────────────────────────────────

interface QuizQuestionsEditorProps {
  quiz: Quiz;
  summaryId: string;
  keywords: Array<{ id: string; term?: string; name?: string }>;
  onBack: () => void;
}

// ── Main Component ────────────────────────────────────────

export function QuizQuestionsEditor({
  quiz,
  summaryId,
  keywords,
  onBack,
}: QuizQuestionsEditorProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendWarning, setBackendWarning] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<QuestionType | ''>('');
  const [filterKeywordId, setFilterKeywordId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  // ── Load questions ──────────────────────────────────────
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setBackendWarning(null);
    try {
      // summary_id is REQUIRED (parentKey), quiz_id is optional filter
      const res = await apiCall<QuizQuestionListResponse | QuizQuestion[]>(
        `/quiz-questions?summary_id=${summaryId}&quiz_id=${quiz.id}`
      );
      if (Array.isArray(res)) {
        setQuestions(res);
      } else if (res && typeof res === 'object' && 'items' in res) {
        setQuestions(res.items || []);
      } else {
        setQuestions([]);
      }
    } catch (err: unknown) {
      logger.warn('[QuizQuestionsEditor] quiz_id filter failed, trying summary_id fallback:', err instanceof Error ? err.message : String(err));
      // Fallback: load all questions for the summary
      // (quiz_id filter doesn't exist yet in optionalFilters)
      setBackendWarning(
        'El filtro quiz_id aun no existe en el backend. ' +
        'Se muestran todas las preguntas del resumen como fallback. ' +
        'Cuando se despliegue el cambio, solo se mostraran las del quiz seleccionado.'
      );
      try {
        const fallback = await quizApi.getQuizQuestions(summaryId, { limit: 200 });
        setQuestions(fallback.items || []);
      } catch (fallbackErr: unknown) {
        logger.error('[QuizQuestionsEditor] Fallback also failed:', fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
        setQuestions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [quiz.id, summaryId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // ── Filtered questions ──────────────────────────────────
  const filteredQuestions = useMemo(() => {
    let result = questions;
    if (filterType) {
      result = result.filter(q => q.question_type === filterType);
    }
    if (filterKeywordId) {
      result = result.filter(q => q.keyword_id === filterKeywordId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        qq => qq.question.toLowerCase().includes(q) ||
              qq.correct_answer.toLowerCase().includes(q)
      );
    }
    return result;
  }, [questions, filterType, filterKeywordId, searchQuery]);

  // ── CRUD handlers ───────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await quizApi.deleteQuizQuestion(id);
      toast.success('Pregunta eliminada');
      await loadQuestions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await quizApi.restoreQuizQuestion(id);
      toast.success('Pregunta restaurada');
      await loadQuestions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al restaurar');
    }
  };

  const handleEdit = (q: QuizQuestion) => {
    setEditingQuestion(q);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setShowModal(true);
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditingQuestion(null);
    loadQuestions();
  };

  // O(1) keyword lookup via Map (avoid .find() per question card)
  const keywordMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const kw of keywords) {
      map.set(kw.id, kw.term || kw.name || kw.id.substring(0, 8) + '...');
    }
    return map;
  }, [keywords]);

  const getKeywordName = useCallback((kwId: string) => {
    return keywordMap.get(kwId) || kwId.substring(0, 8) + '...';
  }, [keywordMap]);

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header with back button */}
      <div className="px-5 py-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] text-gray-900 truncate" style={{ fontWeight: 700 }}>
              {quiz.title}
            </h2>
            <p className="text-[11px] text-gray-400">
              Preguntas del quiz &middot; {questions.length} pregunta{questions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 text-white rounded-lg text-[12px] hover:bg-purple-700 active:scale-[0.97] transition-all shadow-sm"
            style={{ fontWeight: 600 }}
          >
            <Plus size={14} />
            Nueva pregunta
          </button>
        </div>
      </div>

      {/* Backend warning */}
      {backendWarning && (
        <div className="mx-5 mt-3 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="text-[12px]" style={{ fontWeight: 600 }}>Filtro quiz_id pendiente</p>
            <p className="text-[11px] text-amber-700 mt-0.5">{backendWarning}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-5 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Filter size={13} />
            <span className="text-[10px] uppercase tracking-wider" style={{ fontWeight: 700 }}>Filtros</span>
          </div>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as QuestionType | '')}
            className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 min-w-[130px]"
          >
            <option value="">Todos los tipos</option>
            {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={filterKeywordId}
            onChange={e => setFilterKeywordId(e.target.value)}
            className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 min-w-[140px] max-w-[200px]"
          >
            <option value="">Todas las keywords</option>
            {keywords.map(kw => (
              <option key={kw.id} value={kw.id}>{kw.term || kw.name}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[150px] max-w-[260px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en preguntas..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-[11px] border border-gray-200 rounded-lg pl-8 pr-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 placeholder:text-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Questions list */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-purple-500" size={24} />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <HelpCircle size={32} className="opacity-30" />
            <p className="text-sm">
              {questions.length === 0 ? 'No hay preguntas en este quiz' : 'Sin resultados para los filtros'}
            </p>
            {questions.length === 0 && (
              <button
                onClick={handleCreate}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-[12px] hover:bg-purple-200 transition-colors"
                style={{ fontWeight: 600 }}
              >
                <Plus size={14} />
                Crear primera pregunta
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {filteredQuestions.map((q, idx) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={idx + 1}
                keywordName={getKeywordName(q.keyword_id)}
                onEdit={() => handleEdit(q)}
                onDelete={() => handleDelete(q.id)}
                onRestore={() => handleRestore(q.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <QuestionFormModal
            quizId={quiz.id}
            summaryId={summaryId}
            question={editingQuestion}
            keywords={keywords}
            onClose={() => { setShowModal(false); setEditingQuestion(null); }}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default QuizQuestionsEditor;