// ============================================================
// Axon — Professor: QuizFiltersBar
//
// Filter dropdowns (type, difficulty, keyword), search input,
// and optional "Nueva pregunta" create button.
// D2-FIX: Made difficulty + create optional so QuizQuestionsEditor
// can reuse this component without duplicating filter UI.
// ============================================================

import React from 'react';
import type { QuestionType } from '@/app/services/quizApi';
import {
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS,
} from '@/app/services/quizConstants';
import type { Difficulty } from '@/app/services/quizConstants';
import type { KeywordRef } from '@/app/types/platform';
import { FILTER_SELECT } from '@/app/services/quizDesignTokens';
import { Filter, Search, Plus } from 'lucide-react';

export interface QuizFiltersBarProps {
  filterType: QuestionType | '';
  searchQuery: string;
  keywords: readonly KeywordRef[];
  onFilterTypeChange: (v: QuestionType | '') => void;
  onSearchChange: (v: string) => void;
  filterKeywordId?: string;
  onFilterKeywordChange?: (v: string) => void;
  filterDifficulty?: Difficulty | '';
  onFilterDifficultyChange?: (v: Difficulty | '') => void;
  onCreate?: () => void;
  createLabel?: string;
}

export const QuizFiltersBar = React.memo(function QuizFiltersBar({
  filterType, filterDifficulty, filterKeywordId, searchQuery, keywords,
  onFilterTypeChange, onFilterDifficultyChange, onFilterKeywordChange, onSearchChange,
  onCreate, createLabel = 'Nueva pregunta',
}: QuizFiltersBarProps) {
  return (
    <div className="bg-white border-b border-zinc-200 px-5 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Filter size={13} />
          <span className="text-[10px] uppercase tracking-wider" style={{ fontWeight: 700 }}>Filtros</span>
        </div>
        <select value={filterType} onChange={e => onFilterTypeChange(e.target.value as QuestionType | '')} className={`${FILTER_SELECT} focus:ring-purple-500/20 min-w-[130px]`}>
          <option value="">Todos los tipos</option>
          {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
        {filterDifficulty != null && onFilterDifficultyChange && (
          <select value={filterDifficulty} onChange={e => onFilterDifficultyChange(e.target.value as Difficulty | '')} className={`${FILTER_SELECT} focus:ring-purple-500/20 min-w-[110px]`}>
            <option value="">Toda dificultad</option>
            {(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        )}
        {filterKeywordId != null && onFilterKeywordChange && (
          <select value={filterKeywordId} onChange={e => onFilterKeywordChange(e.target.value)} className={`${FILTER_SELECT} focus:ring-purple-500/20 min-w-[140px] max-w-[200px]`}>
            <option value="">Todas las keywords</option>
            {keywords.map(kw => (<option key={kw.id} value={kw.id}>{kw.term || kw.name}</option>))}
          </select>
        )}
        <div className="relative flex-1 min-w-[150px] max-w-[260px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar en preguntas..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} className="w-full text-[11px] border border-gray-200 rounded-lg pl-8 pr-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 placeholder:text-gray-300" />
        </div>
        <div className="flex-1" />
        {onCreate && (
          <button onClick={onCreate} className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-[11px] hover:bg-purple-700 active:scale-[0.97] transition-all shadow-lg shadow-purple-600/25" style={{ fontWeight: 600 }}>
            <Plus size={14} /> {createLabel}
          </button>
        )}
      </div>
    </div>
  );
});
