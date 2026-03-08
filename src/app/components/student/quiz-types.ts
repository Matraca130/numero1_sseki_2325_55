// ============================================================
// Axon — Student Quiz: Shared Types
//
// Centralizes types used across QuizTaker sub-components
// and QuizResults. Extracted in Phase 3 refactor.
// ============================================================

/** Persisted answer state per question index */
export interface SavedAnswer {
  answer: string;
  selectedOption: string | null;
  correct: boolean;
  answered: boolean;
  timeTakenMs: number;
}

/** Aggregated stats per keyword group (used by QuizResults + KeywordMasterySection) */
export interface GroupStat {
  keywordId: string;
  label: string;
  total: number;
  correct: number;
}