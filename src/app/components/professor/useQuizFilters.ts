// ============================================================
// Axon — Professor: Quiz Filters Hook (M-4 Extraction)
//
// Extracted from QuizQuestionsEditor.tsx to decouple filter
// state/logic from the editor component.
//
// R4 Refactor: Added filterDifficulty + stats computation so
// ProfessorQuizzesPage can also consume this hook (DRY).
//
// Manages:
//   - Filter by question_type
//   - Filter by difficulty (optional, used by ProfessorQuizzesPage)
//   - Filter by keyword_id
//   - Search query (question text + correct_answer)
//   - Computed filteredQuestions memo
//   - Computed stats memo (total, active, byType, byDiff)
//
// Architecture: questions array in → filtered array + stats out
// ============================================================

import { useState, useMemo } from 'react';
import type { QuizQuestion, QuestionType } from '@/app/services/quizApi';
import { DIFFICULTY_TO_INT, normalizeDifficulty } from '@/app/services/quizConstants';
import type { Difficulty } from '@/app/services/quizConstants';

// ── Stats type ─────────────────────────────────────────

export interface QuizFilterStats {
  total: number;
  active: number;
  byType: Record<string, number>;
  byDiff: Record<string, number>;
}

// ── Return type ────────────────────────────────────────

export interface UseQuizFiltersReturn {
  filterType: QuestionType | '';
  setFilterType: (v: QuestionType | '') => void;
  filterDifficulty: Difficulty | '';
  setFilterDifficulty: (v: Difficulty | '') => void;
  filterKeywordId: string;
  setFilterKeywordId: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filteredQuestions: QuizQuestion[];
  stats: QuizFilterStats;
}

// ── Hook ───────────────────────────────────────────────

export function useQuizFilters(questions: QuizQuestion[]): UseQuizFiltersReturn {
  const [filterType, setFilterType] = useState<QuestionType | ''>('');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | ''>('');
  const [filterKeywordId, setFilterKeywordId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Filtered questions (client-side) ─────────────────
  const filteredQuestions = useMemo(() => {
    let result = questions;
    if (filterType) {
      result = result.filter(q => q.question_type === filterType);
    }
    if (filterDifficulty) {
      const diffInt = DIFFICULTY_TO_INT[filterDifficulty];
      if (diffInt != null) {
        result = result.filter(q => q.difficulty === diffInt);
      }
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
  }, [questions, filterType, filterDifficulty, filterKeywordId, searchQuery]);

  // ── Stats from raw questions (not filtered) ───────────
  const stats = useMemo<QuizFilterStats>(() => {
    const byType: Record<string, number> = { mcq: 0, true_false: 0, fill_blank: 0, open: 0 };
    const byDiff: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    let active = 0;
    for (const q of questions) {
      byType[q.question_type] = (byType[q.question_type] || 0) + 1;
      const diffKey = normalizeDifficulty(q.difficulty);
      byDiff[diffKey] = (byDiff[diffKey] || 0) + 1;
      if (q.is_active) active++;
    }
    return { total: questions.length, active, byType, byDiff };
  }, [questions]);

  return {
    filterType,
    setFilterType,
    filterDifficulty,
    setFilterDifficulty,
    filterKeywordId,
    setFilterKeywordId,
    searchQuery,
    setSearchQuery,
    filteredQuestions,
    stats,
  };
}
