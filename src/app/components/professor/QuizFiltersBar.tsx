// ============================================================
// Axon — Professor: QuizFiltersBar
//
// Filter dropdowns (type, difficulty, keyword), search input,
// and "Nueva pregunta" create button. Controlled component —
// state lives in parent.
// Extracted from ProfessorQuizzesPage in Phase 4 refactor.
//
// R4: filterDifficulty/onFilterDifficultyChange/onCreate now
// optional — QuizQuestionsEditor doesn't use difficulty filter
// or the inline create button.
// C3: kw.term → kw.name || kw.term for DB column compatibility
// ============================================================

import React from 'react';
import type { QuestionType } from '@/app/services/quizApi';
import {
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS,
} from '@/app/services/quizConstants';
import type { Difficulty } from '@/app/services/quizConstants';
import { Filter, Search, Plus } from 'lucide-react';

// ── Props ───────────────────────────────────────────────

export interface QuizFiltersBarProps {
  filterType: QuestionType | '';
  filterDifficulty?: Difficulty | '';     // optional: omitted in QuizQuestionsEditor
  filterKeywordId: string;
  searchQuery: string;
  keywords: ReadonlyArray<{ id: string; name?: string; term?: string }>;  // C3: added name?
  onFilterTypeChange: (v: QuestionType | '') => void;
  onFilterDifficultyChange?: (v: Difficulty | '') => void;  // optional
  onFilterKeywordChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onCreate?: () => void;  // optional: omitted in QuizQuestionsEditor
}

// ── Component ───────────────────────────────────────────

export const QuizFiltersBar = React.memo(function QuizFiltersBar({
  filterType,
  filterDifficulty,
  filterKeywordId,
  searchQuery,
  keywords,
  onFilterTypeChange,
  onFilterDifficultyChange,
  onFilterKeywordChange,
  onSearchChange,
  onCreate,
}: QuizFiltersBarProps) {
  return (
    <div className="bg-white border-b border-zinc-200 px-5 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Filter size={13} />
          <span className="text-[10px] uppercase tracking-wider" style={{ fontWeight: 700 }}>Filtros</span>
        </div>

        <select
          value={filterType}
          onChange={e => onFilterTypeChange(e.target.value as QuestionType | '')}
          className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 min-w-[130px]"
        >
          <option value="">Todos los tipos</option>
          {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Difficulty filter — only rendered when props provided */}
        {onFilterDifficultyChange && (
          <select
            value={filterDifficulty ?? ''}
            onChange={e => onFilterDifficultyChange(e.target.value as Difficulty | '')}
            className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 min-w-[110px]"
          >
            <option value="">Toda dificultad</option>
            {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        )}

        <select
          value={filterKeywordId}
          onChange={e => onFilterKeywordChange(e.target.value)}
          className="text-[11px] border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 min-w-[140px] max-w-[200px]"
        >
          <option value="">Todas las keywords</option>
          {keywords.map(kw => (
            <option key={kw.id} value={kw.id}>{kw.name || kw.term}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[150px] max-w-[260px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar en preguntas..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full text-[11px] border border-gray-200 rounded-lg pl-8 pr-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 placeholder:text-gray-300"
          />
        </div>

        <div className="flex-1" />

        {/* Create button — only rendered when callback provided */}
        {onCreate && (
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-[11px] hover:bg-purple-700 active:scale-[0.97] transition-all shadow-lg shadow-purple-600/25"
            style={{ fontWeight: 600 }}
          >
            <Plus size={14} />
            Nueva pregunta
          </button>
        )}
      </div>
    </div>
  );
});
