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
// R4 refactor: inline filter state/stats replaced by useQuizFilters hook.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import * as quizApi from '@/app/services/quizApi';
import type {
  QuizQuestion,
  QuestionType,
} from '@/app/services/quizApi';
import {
  DIFFICULTY_TO_INT,
} from '@/app/services/quizConstants';
import { QuestionCard } from '@/app/components/professor/QuestionCard';
import { QuestionFormModal } from '@/app/components/professor/QuestionFormModal';
import { useQuestionCrud } from '@/app/components/professor/useQuestionCrud';
import { useQuizFilters } from '@/app/components/professor/useQuizFilters';
import { CascadeSelector } from '@/app/components/professor/CascadeSelector';
import { QuizStatsBar } from '@/app/components/professor/QuizStatsBar';
import { QuizFiltersBar } from '@/app/components/professor/QuizFiltersBar';
import { useQuizCascade } from './useQuizCascade';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, ChevronDown, ChevronUp, FileText,
  Plus, Check, Loader2, HelpCircle,
} from 'lucide-react';
import { Breadcrumb } from '@/app/components/design-kit';
import { AiReportsDashboard } from '@/app/components/professor/AiReportsDashboard';
import { QuizErrorBoundary } from '@/app/components/shared/QuizErrorBoundary';
import { logger } from '@/app/lib/logger';
import { getErrorMsg } from '@/app/lib/error-utils';

// ── Main Page ───────────────────────────────────────

export function ProfessorQuizzesPage() {
  // ── Auth: institution_id for dashboard ─────────
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id || null;

  // ── Cascade selection (hook) ────────────────────
  const {
    selectedSummaryId,
    selectedSummary,
    keywords,
    getKeywordName,
    cascadeLevels,
    breadcrumbItems,
  } = useQuizCascade();

  // ── Data state ────────────────────────────────────
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // ── Filters + Stats (R4: unified hook) ─────────────
  const filters = useQuizFilters(questions);

  // ── Sidebar collapse state ────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Reset keyword filter when summary changes ───────────
  useEffect(() => {
    filters.setFilterKeywordId('');
  }, [selectedSummaryId]);

  // ── Load quiz questions when summary/filters change ─────
  const loadQuestions = useCallback(async () => {
    if (!selectedSummaryId) {
      setQuestions([]);
      return;
    }
    setQuestionsLoading(true);
    try {
      const apiFilters: {
        question_type?: QuestionType;
        difficulty?: number;
        keyword_id?: string;
        limit?: number;
      } = {};
      if (filters.filterType) apiFilters.question_type = filters.filterType;
      if (filters.filterDifficulty) apiFilters.difficulty = DIFFICULTY_TO_INT[filters.filterDifficulty] || 2;
      if (filters.filterKeywordId) apiFilters.keyword_id = filters.filterKeywordId;
      apiFilters.limit = 200;
      const res = await quizApi.getQuizQuestions(selectedSummaryId, apiFilters);
      setQuestions(res.items || []);
    } catch (err: unknown) {
      logger.error('[Quiz] Questions load error:', err);
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, [selectedSummaryId, filters.filterType, filters.filterDifficulty, filters.filterKeywordId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // ── CRUD handlers (R4: extracted to hook) ─────────────
  const crud = useQuestionCrud(loadQuestions);

  // ── Render ────────────────────────────────────────

  return (
    <QuizErrorBoundary label="Gestion de Quizzes" accentColor="purple">
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
                    <div className="mt-2 px-3 py-2.5 rounded-lg bg-teal-50 border border-teal-100">
                      <div className="flex items-center gap-1.5 text-[10px] text-teal-600 mb-1" style={{ fontWeight: 700 }}>
                        <Check size={12} />
                        Resumen seleccionado
                      </div>
                      <p className="text-[11px] text-teal-800 truncate" style={{ fontWeight: 500 }}>
                        {selectedSummary?.title || selectedSummaryId.substring(0, 12)}
                      </p>
                    </div>
                  )}

                  {/* ── Fase D: AI Reports Dashboard (collapsible) ── */}
                  {institutionId && (
                    <div className="mt-4 pt-3 border-t border-zinc-100">
                      <AiReportsDashboard institutionId={institutionId} />
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
              <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
                <ClipboardList size={28} className="text-teal-300" />
              </div>
              <p className="text-sm">Selecciona un resumen desde el panel izquierdo</p>
              <p className="text-xs text-zinc-300">Curso \u2192 Semestre \u2192 Seccion \u2192 Topico \u2192 Resumen</p>
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
                  <FileText size={14} className="text-teal-500" />
                  <span className="text-[13px] text-gray-800" style={{ fontWeight: 600 }}>
                    {selectedSummary?.title || 'Resumen seleccionado'}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-1">
                    ({selectedSummary?.status || ''})
                  </span>
                </div>
              </div>

              {/* ── Stats bar ── */}
              <QuizStatsBar stats={filters.stats} />

              {/* ── Filters + Create button ── */}
              <QuizFiltersBar
                filterType={filters.filterType}
                filterDifficulty={filters.filterDifficulty}
                filterKeywordId={filters.filterKeywordId}
                searchQuery={filters.searchQuery}
                keywords={keywords}
                onFilterTypeChange={filters.setFilterType}
                onFilterDifficultyChange={filters.setFilterDifficulty}
                onFilterKeywordChange={filters.setFilterKeywordId}
                onSearchChange={filters.setSearchQuery}
                onCreate={crud.handleCreate}
              />

              {/* ── Questions list ── */}
              <div className="flex-1 overflow-y-auto custom-scrollbar-light p-5">
                {questionsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin text-teal-500" size={24} />
                  </div>
                ) : filters.filteredQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                    <HelpCircle size={32} className="opacity-30" />
                    <p className="text-sm">
                      {questions.length === 0 ? 'No hay preguntas en este resumen' : 'Sin resultados para los filtros aplicados'}
                    </p>
                    {questions.length === 0 && (
                      <button
                        onClick={crud.handleCreate}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full text-[12px] hover:bg-teal-200 transition-colors"
                        style={{ fontWeight: 600 }}
                      >
                        <Plus size={14} />
                        Crear primera pregunta
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 max-w-4xl">
                    {filters.filteredQuestions.map((q, idx) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        index={idx + 1}
                        keywordName={getKeywordName(q.keyword_id)}
                        onEdit={() => crud.handleEdit(q)}
                        onDelete={() => crud.handleDelete(q.id)}
                        onRestore={() => crud.handleRestore(q.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Create/Edit Modal ───────────────────────────────────────────────────────── */}

        <AnimatePresence>
          {crud.showModal && selectedSummaryId && (
            <QuestionFormModal
              summaryId={selectedSummaryId}
              question={crud.editingQuestion}
              keywords={keywords}
              onClose={crud.handleCloseModal}
              onSaved={crud.handleSaved}
            />
          )}
        </AnimatePresence>
      </div>
    </QuizErrorBoundary>
  );
}
