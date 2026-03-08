// ============================================================
// Axon — Card Review Tracking (FSRS + BKT computation)
//
// Single source of truth for FSRS + BKT computation per card.
// Consumed by: useReviewBatch (which is used by
//   useFlashcardEngine, FlashcardReviewer, ReviewSessionView)
//
// v4.4.3: Extracted computeCardReviewData() as a pure
// computation function (no network). Used by useReviewBatch
// to compute FSRS+BKT locally without firing individual POSTs
// — the batch endpoint handles all persistence in a single
// request at session end.
//
// v4.4.5: Removed persistCardReview() (dead code, 0 importers).
// All consumers use the batch pattern via useReviewBatch.
// ============================================================

import { computeFsrsUpdate, getInitialFsrsState } from './fsrs-engine';
import type { FsrsState, FsrsUpdate } from './fsrs-engine';
import { updateBKT } from './bkt-engine';

// ── Params ────────────────────────────────────────────────

export interface ComputeCardReviewParams {
  flashcardId: string;
  subtopicId?: string | null;
  grade: 1 | 2 | 3 | 4;
  /** Existing FSRS state from the DB. If omitted, uses initial state. */
  existingFsrsState?: FsrsState;
  /**
   * Current BKT p_know for this subtopic (0-1).
   * If omitted, defaults to 0 (first review). Callers SHOULD pass the
   * real value from study-queue / masteryMap so BKT accumulates correctly.
   */
  currentPKnow?: number;
}

// ── Result type ───────────────────────────────────────────

/**
 * Pure FSRS + BKT computation for a single card review.
 * Returns computed values ONLY — no backend calls.
 *
 * Used by useReviewBatch.queueReview() to build BatchReviewItems.
 */
export interface ComputedCardReview {
  /** Computed FSRS scheduling state */
  fsrsUpdate: FsrsUpdate;
  /** New BKT p_know after this review (0-1) */
  newPKnow: number;
  /** Whether this review was graded as correct (grade >= 3) */
  isCorrect: boolean;
}

// ── Pure computation (no network) ───────────────────────

export function computeCardReviewData({
  flashcardId,
  subtopicId,
  grade,
  existingFsrsState,
  currentPKnow = 0,
}: ComputeCardReviewParams): ComputedCardReview {
  // FSRS update (card-level scheduling)
  const fsrsInput = existingFsrsState || getInitialFsrsState();
  const fsrsUpdate = computeFsrsUpdate(fsrsInput, grade);

  // BKT update (concept-level mastery)
  const isCorrect = grade >= 3;
  const newPKnow = subtopicId
    ? updateBKT(currentPKnow, isCorrect, 'flashcard')
    : currentPKnow;

  return { fsrsUpdate, newPKnow, isCorrect };
}
