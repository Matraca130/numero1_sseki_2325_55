// ============================================================
// @deprecated — PATH B MIGRATION (PR #30)
//
// This file has 0 importers after the PATH B migration.
// BKT v4 Recovery is now computed SERVER-SIDE in
// batch-review.ts (backend). The frontend only uses a
// lightweight BKT heuristic in useReviewBatch for
// visual feedback (NOT persisted).
//
// Type exports preserved. Function throws deprecation error.
//
// Safe to delete once confirmed no external importers remain.
// ============================================================

/** @deprecated Backend computes BKT v4 Recovery server-side. */
export interface BktParams {
  currentMastery: number;
  isCorrect: boolean;
  instrumentType: 'flashcard' | 'quiz';
  previousMaxMastery?: number;
}

/** @deprecated PATH B: backend computes BKT v4 Recovery server-side. */
export function updateBKT(
  _currentMastery: number,
  _isCorrect: boolean,
  _instrumentType: 'flashcard' | 'quiz',
  _previousMaxMastery?: number
): number {
  throw new Error(
    '[DEPRECATED] updateBKT() removed in PATH B migration. ' +
    'Backend computes BKT v4 Recovery server-side via POST /review-batch. ' +
    'For visual-only feedback, use the BKT heuristic in useReviewBatch.'
  );
}
