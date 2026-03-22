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
// Graceful error handling: shows error banner with fallback loading.
// R19 refactor: question loading extracted to useQuizQuestionsLoader.
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import type { KeywordRef } from '@/app/types/platform';
import { QuestionCard } from '@/app/components/professor/QuestionCard';
import { QuestionFormModal } from '@/app/components/professor/QuestionFormModal';
import { QuizFiltersBar } from '@/app/components/professor/QuizFiltersBar';
import { useQuestionCrud } from '@/app/components/professor/useQuestionCrud';
import { useQuizQuestionsLoader } from '@/app/components/professor/useQuizQuestionsLoader';
import { AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Plus,
  Loader2, AlertTriangle, HelpCircle,
  Sparkles,
} from 'lucide-react';
import type { Quiz } from '@/app/services/quizApi';
import { BANNER_WARNING } from '@/app/services/quizDesignTokens';
import { AiGeneratePanel } from '@/app/components/professor/AiGeneratePanel';
import { QuizErrorBoundary } from '@/app/components/shared/QuizErrorBoundary';
import { BulkEditToolbar } from '@/app/components/professor/BulkEditToolbar';
import { QuizExportImport } from '@/app/components/professor/QuizExportImport';
import { useQuizBulkOps } from '@/app/components/professor/useQuizBulkOps';
import { useQuizFilters } from '@/app/components/professor/useQuizFilters';
import clsx from 'clsx';

// ── Props ─────────────────────────────────────────────

interface QuizQuestionsEditorProps {
  quiz: Quiz;
  summaryId: string;
  keywords: KeywordRef[];
  onBack: () => void;
}

// ── Main Component ──────────────────────────────────────

export function QuizQuestionsEditor({
  quiz,
  summaryId,
  keywords,
  onBack,
}: QuizQuestionsEditorProps) {
  // AI Generate Panel
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Export/Import modal (P8)
  const [showExportImport, setShowExportImport] = useState(false);

  // ── Question loading (R19: shared hook with fallback) ───
  const quizFilters = useMemo(() => ({ quiz_id: quiz.id }), [quiz.id]);

  const {
    questions,
    loading,
    backendWarning,
    reload: loadQuestions,
  } = useQuizQuestionsLoader({
    summaryId,
    filters: quizFilters,
    fallbackOnError: true,
    label: 'QuizQuestionsEditor',
  });

  // ── CRUD handlers (R4: extracted to hook) ─────────────
  const crud = useQuestionCrud(loadQuestions);

  // ── Filters (M-4: extracted to hook) ────────────────
  const filters = useQuizFilters(questions);

  // ── Bulk operations (M-1: extracted to hook) ────────────
  const bulk = useQuizBulkOps(filters.filteredQuestions, loadQuestions);

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

  // ── Render ─────────────────────────────────────────
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
            onClick={crud.handleCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 text-white rounded-lg text-[12px] hover:bg-teal-700 active:scale-[0.97] transition-all shadow-sm"
            style={{ fontWeight: 600 }}
          >
            <Plus size={14} />
            Nueva pregunta
          </button>
          <button
            onClick={() => setShowAiPanel(prev => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] active:scale-[0.97] transition-all shadow-sm ${
              showAiPanel
                ? 'bg-teal-700 text-white shadow-teal-700/25'
                : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/25'
            }`}
            style={{ fontWeight: 600 }}
          >
            <Sparkles size={14} />
            Generar con IA
          </button>
          {/* P8: Export/Import */}
          <button
            onClick={() => setShowExportImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] text-zinc-500 hover:text-zinc-700 border border-zinc-200 hover:bg-zinc-50 active:scale-[0.97] transition-all"
            style={{ fontWeight: 600 }}
          >
            Exportar/Importar
          </button>
        </div>
      </div>

      {/* AI Generate Panel — positioned after header, before filters */}
      <AnimatePresence>
        {showAiPanel && (
          <QuizErrorBoundary label="Generacion IA" accentColor="purple">
            <AiGeneratePanel
              quizId={quiz.id}
              summaryId={summaryId}
              keywords={keywords}
              onClose={() => setShowAiPanel(false)}
              onGenerated={loadQuestions}
            />
          </QuizErrorBoundary>
        )}
      </AnimatePresence>

      {/* Backend warning */}
      {backendWarning && (
        <div className={`mx-5 mt-3 ${BANNER_WARNING}`}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="text-[12px]" style={{ fontWeight: 600 }}>Error de carga</p>
            <p className="text-[11px] text-amber-700 mt-0.5">{backendWarning}</p>
          </div>
        </div>
      )}

      {/* Filters (FIX: now includes difficulty filter for consistency with ProfessorQuizzesPage) */}
      <QuizFiltersBar
        filterType={filters.filterType}
        onFilterTypeChange={filters.setFilterType}
        filterDifficulty={filters.filterDifficulty}
        onFilterDifficultyChange={filters.setFilterDifficulty}
        filterKeywordId={filters.filterKeywordId}
        onFilterKeywordChange={filters.setFilterKeywordId}
        searchQuery={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        keywords={keywords}
      />

      {/* Bulk Edit Toolbar (P4) */}
      <BulkEditToolbar
        selectedIds={bulk.selectedIds}
        totalCount={filters.filteredQuestions.length}
        onSelectAll={bulk.handleSelectAll}
        onDeselectAll={bulk.handleDeselectAll}
        onBulkDelete={bulk.handleBulkDelete}
        onBulkRestore={bulk.handleBulkRestore}
        onMoveUp={bulk.handleMoveUp}
        onMoveDown={bulk.handleMoveDown}
        canMoveUp={bulk.canMoveUp}
        canMoveDown={bulk.canMoveDown}
      />

      {/* Questions list */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-teal-500" size={24} />
          </div>
        ) : filters.filteredQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <HelpCircle size={32} className="opacity-30" />
            <p className="text-sm">
              {questions.length === 0 ? 'No hay preguntas en este quiz' : 'Sin resultados para los filtros'}
            </p>
            {questions.length === 0 && (
              <button
                onClick={crud.handleCreate}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-[12px] hover:bg-teal-200 transition-colors"
                style={{ fontWeight: 600 }}
              >
                <Plus size={14} />
                Crear primera pregunta
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {bulk.orderedQuestions.map((q, idx) => (
              <div
                key={q.id}
                onClick={() => bulk.handleToggleSelect(q.id)}
                className={clsx(
                  'cursor-pointer rounded-2xl transition-all',
                  bulk.selectedIds.has(q.id) && 'ring-2 ring-teal-400 ring-offset-1',
                )}
              >
                <QuestionCard
                  question={q}
                  index={idx + 1}
                  keywordName={getKeywordName(q.keyword_id)}
                  onEdit={() => crud.handleEdit(q)}
                  onDelete={() => crud.handleDelete(q.id)}
                  onRestore={() => crud.handleRestore(q.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {crud.showModal && (
          <QuestionFormModal
            quizId={quiz.id}
            summaryId={summaryId}
            question={crud.editingQuestion}
            keywords={keywords}
            onClose={crud.handleCloseModal}
            onSaved={crud.handleSaved}
          />
        )}
      </AnimatePresence>

      {/* P8: Export/Import Modal */}
      <AnimatePresence>
        {showExportImport && (
          <QuizExportImport
            quizTitle={quiz.title}
            quizId={quiz.id}
            summaryId={summaryId}
            questions={questions}
            keywordId={keywords[0]?.id || ''}
            onClose={() => setShowExportImport(false)}
            onImported={() => { setShowExportImport(false); loadQuestions(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
