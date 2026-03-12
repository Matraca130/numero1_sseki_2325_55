// ============================================================
// Axon — Professor: Quiz Filters Hook (M-4 Extraction)
//
// Extracted from QuizQuestionsEditor.tsx to decouple filter
// state/logic from the editor component.
//
// Manages:
//   - Filter by question_type
//   - Filter by keyword_id
//   - Search query (question text + correct_answer)
//   - Computed filteredQuestions memo
//
// Architecture: questions array in → filtered array out
// ============================================================

import { useState, useMemo } from 'react';
import type { QuizQuestion, QuestionType } from '@/app/services/quizApi';

// ── Return type ──────────────────────────────────────────

export interface UseQuizFiltersReturn {
  filterType: QuestionType | '';
  setFilterType: (v: QuestionType | '') => void;
  filterKeywordId: string;
  setFilterKeywordId: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filteredQuestions: QuizQuestion[];
}

// ── Hook ─────────────────────────────────────────────────

export function useQuizFilters(questions: QuizQuestion[]): UseQuizFiltersReturn {
  const [filterType, setFilterType] = useState<QuestionType | ''>('');
  const [filterKeywordId, setFilterKeywordId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  return {
    filterType,
    setFilterType,
    filterKeywordId,
    setFilterKeywordId,
    searchQuery,
    setSearchQuery,
    filteredQuestions,
  };
}
