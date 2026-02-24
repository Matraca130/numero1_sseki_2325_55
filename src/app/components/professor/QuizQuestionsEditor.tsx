// ============================================================
// Axon — Professor: Quiz Questions Editor (EV-3 — Optimistic Frontend)
//
// BACKEND STATUS:
//   - GET /quiz-questions?quiz_id=xxx → filter NOT YET in optionalFilters (will 404 or return all)
//   - POST quiz_id in body → NOT YET in createFields (will be ignored)
//   - POST subtopic_id in body → NOT YET in createFields (will be ignored)
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
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  ArrowLeft, Plus, Pencil, Trash2, RotateCcw, X, Check,
  AlertCircle, Loader2, AlertTriangle, HelpCircle,
  CircleDot, CheckCircle2, MessageSquare, ChevronDown,
  ChevronUp, Search, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Quiz } from '@/app/components/roles/pages/professor/QuizzesManager';

// ── Types ─────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard';

interface Subtopic {
  id: string;
  name: string;
  keyword_id: string;
  order_index: number;
}

// ── Helpers ───────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Opcion multiple',
  true_false: 'Verdadero / Falso',
  fill_blank: 'Completar',
  open: 'Respuesta abierta',
};

const QUESTION_TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  mcq: <CircleDot size={14} />,
  true_false: <CheckCircle2 size={14} />,
  fill_blank: <Pencil size={14} />,
  open: <MessageSquare size={14} />,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Facil',
  medium: 'Media',
  hard: 'Dificil',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-red-100 text-red-700 border-red-200',
};

const DIFFICULTY_TO_INT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
const INT_TO_DIFFICULTY: Record<number, Difficulty> = { 1: 'easy', 2: 'medium', 3: 'hard' };

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
      // Try quiz_id filter first (optimistic — may not exist yet)
      const res = await apiCall<QuizQuestionListResponse | QuizQuestion[]>(
        `/quiz-questions?quiz_id=${quiz.id}`
      );
      if (Array.isArray(res)) {
        setQuestions(res);
      } else if (res && typeof res === 'object' && 'items' in res) {
        setQuestions(res.items || []);
      } else {
        setQuestions([]);
      }
    } catch (err: any) {
      console.warn('[QuizQuestionsEditor] quiz_id filter failed, trying summary_id fallback:', err.message);
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
      } catch (fallbackErr: any) {
        console.error('[QuizQuestionsEditor] Fallback also failed:', fallbackErr.message);
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
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await quizApi.restoreQuizQuestion(id);
      toast.success('Pregunta restaurada');
      await loadQuestions();
    } catch (err: any) {
      toast.error(err.message || 'Error al restaurar');
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

  const getKeywordName = (kwId: string) => {
    const kw = keywords.find(k => k.id === kwId);
    return kw?.term || kw?.name || kwId.substring(0, 8) + '...';
  };

  // ── Render ──────────────────────────────────────────────
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

// ── Question Card ─────────────────────────────────────────

function QuestionCard({
  question: q,
  index,
  keywordName,
  onEdit,
  onDelete,
  onRestore,
}: {
  question: QuizQuestion;
  index: number;
  keywordName: string;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'bg-white rounded-xl border transition-all',
        q.is_active
          ? 'border-gray-200 hover:border-purple-200 hover:shadow-sm'
          : 'border-red-200 bg-red-50/30 opacity-75'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 text-purple-600 text-[11px] shrink-0 mt-0.5" style={{ fontWeight: 700 }}>
          {index}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px]" style={{ fontWeight: 600 }}>
              {QUESTION_TYPE_ICONS[q.question_type]}
              {QUESTION_TYPE_LABELS[q.question_type]}
            </span>
            <span className={clsx('px-2 py-0.5 rounded-md border text-[10px]', DIFFICULTY_COLORS[INT_TO_DIFFICULTY[q.difficulty] || 'medium'])} style={{ fontWeight: 600 }}>
              {DIFFICULTY_LABELS[INT_TO_DIFFICULTY[q.difficulty] || 'medium']}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px]" style={{ fontWeight: 500 }}>
              {keywordName}
            </span>
            <span className={clsx(
              'px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider',
              q.source === 'ai' ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'
            )} style={{ fontWeight: 700 }}>
              {q.source}
            </span>
            {!q.is_active && (
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[9px] uppercase" style={{ fontWeight: 700 }}>
                Eliminada
              </span>
            )}
          </div>
          <p className="text-[13px] text-gray-800" style={{ lineHeight: '1.5' }}>{q.question}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
          >
            <Pencil size={14} />
          </button>
          {q.is_active ? (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <button
              onClick={onRestore}
              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 ml-10 border-t border-gray-100 mt-1 pt-3 space-y-2.5">
              {q.question_type === 'mcq' && q.options && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5" style={{ fontWeight: 700 }}>Opciones</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        className={clsx(
                          'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] border',
                          opt === q.correct_answer
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-gray-50 border-gray-100 text-gray-600'
                        )}
                      >
                        {opt === q.correct_answer ? (
                          <Check size={12} className="text-emerald-600 shrink-0" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
                        )}
                        <span style={{ fontWeight: opt === q.correct_answer ? 600 : 400 }}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {q.question_type !== 'mcq' && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1" style={{ fontWeight: 700 }}>Respuesta correcta</p>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px]">
                    <Check size={12} />
                    <span style={{ fontWeight: 600 }}>
                      {q.question_type === 'true_false'
                        ? (q.correct_answer === 'true' ? 'Verdadero' : 'Falso')
                        : q.correct_answer
                      }
                    </span>
                  </div>
                </div>
              )}

              {q.explanation && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1" style={{ fontWeight: 700 }}>Explicacion</p>
                  <div className="px-2.5 py-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-[12px]" style={{ lineHeight: '1.5' }}>
                    {q.explanation}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Question Create/Edit Modal ────────────────────────────

function QuestionFormModal({
  quizId,
  summaryId,
  question,
  keywords,
  onClose,
  onSaved,
}: {
  quizId: string;
  summaryId: string;
  question: QuizQuestion | null;
  keywords: Array<{ id: string; term?: string; name?: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!question;

  // Form state
  const [questionType, setQuestionType] = useState<QuestionType>(question?.question_type || 'mcq');
  const [questionText, setQuestionText] = useState(question?.question || '');
  const [keywordId, setKeywordId] = useState(question?.keyword_id || '');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    question?.difficulty != null ? (INT_TO_DIFFICULTY[question.difficulty] || 'medium') : 'medium'
  );
  const [explanation, setExplanation] = useState(question?.explanation || '');
  const [correctAnswer, setCorrectAnswer] = useState(question?.correct_answer || '');
  const [options, setOptions] = useState<string[]>(
    question?.options || ['', '', '', '']
  );

  // Subtopic state (double dropdown)
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [subtopicId, setSubtopicId] = useState('');
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load subtopics when keyword changes ─────────────────
  useEffect(() => {
    setSubtopics([]);
    setSubtopicId('');
    if (!keywordId) return;

    let cancelled = false;
    setLoadingSubtopics(true);
    (async () => {
      try {
        const res = await apiCall<any>(`/subtopics?keyword_id=${keywordId}`);
        const items = res?.items || (Array.isArray(res) ? res : []);
        if (!cancelled) setSubtopics(items);
      } catch (err) {
        console.warn('[QuizQuestionsEditor] Subtopics load error:', err);
        if (!cancelled) setSubtopics([]);
      } finally {
        if (!cancelled) setLoadingSubtopics(false);
      }
    })();
    return () => { cancelled = true; };
  }, [keywordId]);

  // Reset options when type changes
  useEffect(() => {
    if (!isEdit) {
      if (questionType === 'mcq') {
        setOptions(['', '', '', '']);
        setCorrectAnswer('');
      } else if (questionType === 'true_false') {
        setOptions([]);
        setCorrectAnswer('true');
      } else {
        setOptions([]);
        setCorrectAnswer('');
      }
    }
  }, [questionType, isEdit]);

  const handleOptionChange = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const next = options.filter((_, i) => i !== index);
      if (options[index] === correctAnswer) setCorrectAnswer('');
      setOptions(next);
    }
  };

  // ── Submit ──────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!keywordId) {
      setError('La keyword es obligatoria (REQUIRED en la DB)');
      return;
    }
    if (!questionText.trim()) {
      setError('La pregunta es obligatoria');
      return;
    }
    if (!correctAnswer.trim() && questionType !== 'true_false') {
      setError('La respuesta correcta es obligatoria');
      return;
    }
    if (questionType === 'mcq') {
      const validOpts = options.filter(o => o.trim());
      if (validOpts.length < 2) {
        setError('Minimo 2 opciones con texto');
        return;
      }
      if (!validOpts.includes(correctAnswer)) {
        setError('La respuesta correcta debe ser una de las opciones');
        return;
      }
    }

    setSaving(true);
    try {
      if (isEdit && question) {
        const payload: any = {
          question_type: questionType,
          question: questionText.trim(),
          correct_answer: correctAnswer.trim(),
          difficulty: DIFFICULTY_TO_INT[difficulty] || 2,
          explanation: explanation.trim() || undefined,
        };
        if (questionType === 'mcq') {
          payload.options = options.filter(o => o.trim());
        } else {
          payload.options = null;
        }
        await quizApi.updateQuizQuestion(question.id, payload);
        toast.success('Pregunta actualizada');
      } else {
        // Build create payload
        // NOTE: quiz_id and subtopic_id are included optimistically.
        // Backend will IGNORE them until createFields is updated.
        const payload: any = {
          summary_id: summaryId,
          keyword_id: keywordId,
          question_type: questionType,
          question: questionText.trim(),
          correct_answer: correctAnswer.trim(),
          difficulty: DIFFICULTY_TO_INT[difficulty] || 2,
          source: 'manual',
          // Optimistic fields — backend ignores until deployed:
          quiz_id: quizId,
        };
        if (subtopicId) {
          payload.subtopic_id = subtopicId;
        }
        if (explanation.trim()) {
          payload.explanation = explanation.trim();
        }
        if (questionType === 'mcq') {
          payload.options = options.filter(o => o.trim());
        }

        await apiCall('/quiz-questions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Pregunta creada');
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
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
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[640px] max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              {isEdit ? <Pencil size={16} className="text-purple-600" /> : <Plus size={16} className="text-purple-600" />}
            </div>
            <div>
              <h3 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
                {isEdit ? 'Editar pregunta' : 'Nueva pregunta'}
              </h3>
              <p className="text-[10px] text-gray-400">
                {isEdit ? 'Modifica la pregunta' : 'Vinculada al quiz: selecciona keyword y subtopic'}
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
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px]">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Row: Type + Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>Tipo de pregunta *</label>
              <select
                value={questionType}
                onChange={e => setQuestionType(e.target.value as QuestionType)}
                disabled={isEdit}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>Dificultad *</label>
              <div className="flex gap-1.5">
                {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setDifficulty(k)}
                    className={clsx(
                      'flex-1 py-2 rounded-lg text-[11px] border transition-all',
                      difficulty === k
                        ? DIFFICULTY_COLORS[k] + ' shadow-sm'
                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                    )}
                    style={{ fontWeight: difficulty === k ? 700 : 500 }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Double dropdown: Keyword (required) → Subtopic (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
                Keyword * <span className="text-red-400" style={{ fontWeight: 400 }}>(obligatoria)</span>
              </label>
              <select
                value={keywordId}
                onChange={e => setKeywordId(e.target.value)}
                disabled={isEdit}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Seleccionar keyword --</option>
                {keywords.map(kw => (
                  <option key={kw.id} value={kw.id}>{kw.term || kw.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
                Subtopic{' '}
                <span className="text-gray-400" style={{ fontWeight: 400 }}>
                  (opcional{!keywordId ? ' — elige keyword primero' : ''})
                </span>
              </label>
              {loadingSubtopics ? (
                <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-gray-400">
                  <Loader2 size={12} className="animate-spin" />
                  Cargando subtopics...
                </div>
              ) : (
                <select
                  value={subtopicId}
                  onChange={e => setSubtopicId(e.target.value)}
                  disabled={!keywordId || isEdit || subtopics.length === 0}
                  className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!keywordId
                      ? '-- Elige keyword primero --'
                      : subtopics.length === 0
                        ? '-- Sin subtopics --'
                        : '-- Sin subtopic --'
                    }
                  </option>
                  {subtopics.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Optimistic backend note */}
          {!isEdit && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-[10px]">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span>
                <strong>Nota:</strong> quiz_id y subtopic_id se envian al backend pero seran ignorados hasta que se actualicen los createFields.
                La pregunta se creara vinculada al summary + keyword.
              </span>
            </div>
          )}

          {/* Question text */}
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>Pregunta *</label>
            <textarea
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              placeholder="Escribe la pregunta aqui..."
              rows={3}
              className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none placeholder:text-gray-300"
            />
          </div>

          {/* Dynamic answer section */}
          {questionType === 'mcq' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] text-gray-500" style={{ fontWeight: 600 }}>
                  Opciones * <span className="text-gray-400" style={{ fontWeight: 400 }}>(clic en el radio para marcar correcta)</span>
                </label>
                {options.length < 6 && (
                  <button
                    onClick={addOption}
                    className="text-[10px] text-purple-600 hover:text-purple-800 flex items-center gap-0.5 transition-colors"
                    style={{ fontWeight: 600 }}
                  >
                    <Plus size={11} /> Agregar
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      onClick={() => setCorrectAnswer(opt)}
                      className={clsx(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                        opt && correctAnswer === opt
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-300 hover:border-purple-400'
                      )}
                      disabled={!opt.trim()}
                    >
                      {opt && correctAnswer === opt && <Check size={11} className="text-white" />}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => handleOptionChange(i, e.target.value)}
                      placeholder={`Opcion ${String.fromCharCode(65 + i)}`}
                      className="flex-1 text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 placeholder:text-gray-300"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => removeOption(i)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {questionType === 'true_false' && (
            <div>
              <label className="text-[11px] text-gray-500 mb-2 block" style={{ fontWeight: 600 }}>Respuesta correcta *</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCorrectAnswer('true')}
                  className={clsx(
                    'flex-1 py-2.5 rounded-lg text-[13px] border transition-all',
                    correctAnswer === 'true'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  )}
                  style={{ fontWeight: correctAnswer === 'true' ? 700 : 500 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Check size={14} />
                    Verdadero
                  </div>
                </button>
                <button
                  onClick={() => setCorrectAnswer('false')}
                  className={clsx(
                    'flex-1 py-2.5 rounded-lg text-[13px] border transition-all',
                    correctAnswer === 'false'
                      ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  )}
                  style={{ fontWeight: correctAnswer === 'false' ? 700 : 500 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <X size={14} />
                    Falso
                  </div>
                </button>
              </div>
            </div>
          )}

          {(questionType === 'open' || questionType === 'fill_blank') && (
            <div>
              <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>Respuesta correcta *</label>
              <textarea
                value={correctAnswer}
                onChange={e => setCorrectAnswer(e.target.value)}
                placeholder={questionType === 'fill_blank' ? 'Texto que completa el espacio...' : 'Respuesta esperada...'}
                rows={2}
                className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none placeholder:text-gray-300"
              />
            </div>
          )}

          {/* Explanation */}
          <div>
            <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
              Explicacion <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="Por que esta es la respuesta correcta..."
              rows={2}
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
              <><Check size={14} /> {isEdit ? 'Guardar cambios' : 'Crear pregunta'}</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default QuizQuestionsEditor;
