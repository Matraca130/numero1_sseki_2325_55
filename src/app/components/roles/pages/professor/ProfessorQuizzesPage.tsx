// ============================================================
// Axon — Professor: Quizzes (connected to real backend)
//
// Backend routes (flat with query params):
//   GET /memberships → filter professor courses
//   GET /semesters?course_id=xxx
//   GET /sections?semester_id=xxx
//   GET /topics?section_id=xxx
//   GET /summaries?topic_id=xxx
//   GET /keywords?summary_id=xxx
//   GET/POST/PUT/DELETE /quiz-questions
//   PUT /quiz-questions/:id/restore
//
// Data flow:
//   Cascade selectors → pick course → semester → section →
//   topic → summary → load quiz questions → CRUD
//
// Phase 4 refactor: cascade logic extracted to useQuizCascade,
// filters/stats extracted to QuizFiltersBar/QuizStatsBar.
// ============================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type {
  QuizQuestion,
  QuestionType,
} from '@/app/services/quizApi';
import {
  DIFFICULTY_TO_INT,
  INT_TO_DIFFICULTY,
} from '@/app/services/quizConstants';
import type { Difficulty } from '@/app/services/quizConstants';
import { QuestionCard } from '@/app/components/professor/QuestionCard';
import { QuestionFormModal } from '@/app/components/professor/QuestionFormModal';
import { CascadeSelector } from '@/app/components/professor/CascadeSelector';
import { QuizStatsBar } from '@/app/components/professor/QuizStatsBar';
import { QuizFiltersBar } from '@/app/components/professor/QuizFiltersBar';
import { useQuizCascade } from './useQuizCascade';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, ChevronDown, ChevronUp, FileText,
  Plus, Check, Loader2, HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumb } from '@/app/components/design-kit';
import { logger } from '@/app/lib/logger';

// ── Helpers ───────────────────────────────────────────────

/** Safe error message extraction from unknown catch value */
function getErrorMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ── Main Page ─────────────────────────────────────────────

export function ProfessorQuizzesPage() {
  // ── Cascade selection (hook) ────────────────────────────
  const {
    selectedSummaryId,
    selectedSummary,
    keywords,
    getKeywordName,
    cascadeLevels,
    breadcrumbItems,
  } = useQuizCascade();

  // ── Data state ──────────────────────────────────────────
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // ── Filters ─────────────────────────────────────────────
  const [filterType, setFilterType] = useState<QuestionType | ''>('');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | ''>('');
  const [filterKeywordId, setFilterKeywordId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Modal state ─────────────────────────────────────────
  const [showCreateEdit, setShowCreateEdit] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  // ── Sidebar collapse state ──────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Reset keyword filter when summary changes ───────────
  useEffect(() => {
    setFilterKeywordId('');
  }, [selectedSummaryId]);

  // ── Load quiz questions when summary/filters change ─────
  const loadQuestions = useCallback(async () => {
    if (!selectedSummaryId) {
      setQuestions([]);
      return;
    }
    setQuestionsLoading(true);
    try {
      const filters: {
        question_type?: QuestionType;
        difficulty?: number;
        keyword_id?: string;
        limit?: number;
      } = {};
      if (filterType) filters.question_type = filterType;
      if (filterDifficulty) filters.difficulty = DIFFICULTY_TO_INT[filterDifficulty] || 2;
      if (filterKeywordId) filters.keyword_id = filterKeywordId;
      filters.limit = 200;
      const res = await quizApi.getQuizQuestions(selectedSummaryId, filters);
      setQuestions(res.items || []);
    } catch (err: unknown) {
      logger.error('[Quiz] Questions load error:', err);
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, [selectedSummaryId, filterType, filterDifficulty, filterKeywordId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // ── Filtered by search ──────────────────────────────────
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter(
      qq => qq.question.toLowerCase().includes(q) ||
            qq.correct_answer.toLowerCase().includes(q)
    );
  }, [questions, searchQuery]);

  // ── Stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const byType: Record<string, number> = { mcq: 0, true_false: 0, fill_blank: 0, open: 0 };
    const byDiff: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    let active = 0;
    for (const q of questions) {
      byType[q.question_type] = (byType[q.question_type] || 0) + 1;
      const diffKey = INT_TO_DIFFICULTY[q.difficulty] || 'medium';
      byDiff[diffKey] = (byDiff[diffKey] || 0) + 1;
      if (q.is_active) active++;
    }
    return { total: questions.length, active, byType, byDiff };
  }, [questions]);

  // ── CRUD handlers ───────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await quizApi.deleteQuizQuestion(id);
      toast.success('Pregunta eliminada');
      await loadQuestions();
    } catch (err: unknown) {
      toast.error(getErrorMsg(err) || 'Error al eliminar');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await quizApi.restoreQuizQuestion(id);
      toast.success('Pregunta restaurada');
      await loadQuestions();
    } catch (err: unknown) {
      toast.error(getErrorMsg(err) || 'Error al restaurar');
    }
  };

  const handleEdit = (q: QuizQuestion) => {
    setEditingQuestion(q);
    setShowCreateEdit(true);
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setShowCreateEdit(true);
  };

  const handleSaved = () => {
    setShowCreateEdit(false);
    setEditingQuestion(null);
    loadQuestions();
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* ── Left Panel: Cascade Selectors ── */}
      <div className="shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden w-[300px]">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="px-4 py-3 border-b border-gray-100 w-full text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={16} className="text-purple-600" />
            <h2 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>Quizzes</h2>
            <div className="flex-1" />
            <span className="text-gray-400 transition-transform">
              {sidebarOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Navega la jerarquia para gestionar preguntas</p>
        </button>

        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto py-1 px-3">
                <CascadeSelector levels={cascadeLevels} />

                {/* ── Selection indicator ── */}
                {selectedSummaryId && (
                  <div className="mt-2 px-3 py-2.5 rounded-lg bg-purple-50 border border-purple-100">
                    <div className="flex items-center gap-1.5 text-[10px] text-purple-600 mb-1" style={{ fontWeight: 700 }}>
                      <Check size={12} />
                      Resumen seleccionado
                    </div>
                    <p className="text-[11px] text-purple-800 truncate" style={{ fontWeight: 500 }}>
                      {selectedSummary?.title || selectedSummaryId.substring(0, 12)}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right Panel: Questions ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-50">
        {!selectedSummaryId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center">
              <ClipboardList size={28} className="text-purple-300" />
            </div>
            <p className="text-sm">Selecciona un resumen desde el panel izquierdo</p>
            <p className="text-xs text-zinc-300">Curso &rarr; Semestre &rarr; Seccion &rarr; Topico &rarr; Resumen</p>
          </div>
        ) : (
          <>
            {/* ── Header with breadcrumb ── */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-5 py-3">
              {/* Breadcrumb */}
              <Breadcrumb
                items={breadcrumbItems}
                className="mb-1.5 text-[10px]"
              />
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-purple-500" />
                <span className="text-[13px] text-gray-800" style={{ fontWeight: 600 }}>
                  {selectedSummary?.title || 'Resumen seleccionado'}
                </span>
                <span className="text-[10px] text-gray-400 ml-1">
                  ({selectedSummary?.status || ''})
                </span>
              </div>
            </div>

            {/* ── Stats bar ── */}
            <QuizStatsBar stats={stats} />

            {/* ── Filters + Create button ── */}
            <QuizFiltersBar
              filterType={filterType}
              filterDifficulty={filterDifficulty}
              filterKeywordId={filterKeywordId}
              searchQuery={searchQuery}
              keywords={keywords}
              onFilterTypeChange={setFilterType}
              onFilterDifficultyChange={setFilterDifficulty}
              onFilterKeywordChange={setFilterKeywordId}
              onSearchChange={setSearchQuery}
              onCreate={handleCreate}
            />

            {/* ── Questions list ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-light p-5">
              {questionsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-purple-500" size={24} />
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <HelpCircle size={32} className="opacity-30" />
                  <p className="text-sm">
                    {questions.length === 0 ? 'No hay preguntas en este resumen' : 'Sin resultados para los filtros aplicados'}
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
          </>
        )}
      </div>

      {/* ── Create/Edit Modal ───────────────────────────────────── */}

      <AnimatePresence>
        {showCreateEdit && selectedSummaryId && (
          <QuestionFormModal
            summaryId={selectedSummaryId}
            question={editingQuestion}
            keywords={keywords}
            onClose={() => { setShowCreateEdit(false); setEditingQuestion(null); }}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
