// ============================================================
// @deprecated — PATH B MIGRATION (PR #30)
//
// This file has 0 importers after the PATH B migration.
// All FSRS + BKT computation is now done SERVER-SIDE via
// POST /review-batch (batch-review.ts on backend).
//
// Frontend consumers now use:
//   - useReviewBatch.ts (BKT heuristic for visual feedback only)
//   - studySessionApi.ts (submitReviewBatch → 1 POST)
//
// Type exports are preserved for any transitive consumers.
// Function exports throw deprecation errors at runtime.
//
// Safe to delete once confirmed no external importers remain.
// ============================================================

/** @deprecated Use useReviewBatch instead. */
export interface PersistCardReviewParams {
  flashcardId: string;
  subtopicId?: string | null;
  grade: 1 | 2 | 3 | 4;
  existingFsrsState?: any;
  currentPKnow?: number;
}

/** @deprecated Use useReviewBatch instead. */
export interface PersistCardReviewResult {
  fsrsUpdate: any;
  newPKnow: number;
  networkPromise: Promise<void>;
}

/** @deprecated Use useReviewBatch instead. */
export interface ComputedCardReview {
  fsrsUpdate: any;
  newPKnow: number;
  isCorrect: boolean;
}

/** @deprecated PATH B: backend computes FSRS+BKT server-side. Use useReviewBatch.queueReview() instead. */
export function computeCardReviewData(_params: PersistCardReviewParams): ComputedCardReview {
  throw new Error(
    '[DEPRECATED] computeCardReviewData() removed in PATH B migration. ' +
    'Use useReviewBatch.queueReview() instead — backend computes FSRS+BKT server-side.'
  );
}

/** @deprecated PATH B: backend computes FSRS+BKT server-side. Use useReviewBatch.queueReview() instead. */
export function persistCardReview(_params: PersistCardReviewParams): PersistCardReviewResult {
  throw new Error(
    '[DEPRECATED] persistCardReview() removed in PATH B migration. ' +
    'Use useReviewBatch.queueReview() + submitBatch() instead.'
  );
}
