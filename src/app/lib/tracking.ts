// ============================================================
// Axon — Card Review Tracking (FSRS + BKT persistence)
//
// Single source of truth for post-review backend updates.
// Consumed by: useFlashcardEngine, FlashcardReviewer,
//   ReviewSessionView
//
// Backend POSTs are non-blocking (fire-and-forget with error logging).
// The function NOW RETURNS computed values so callers can apply
// optimistic local updates without waiting for backend round-trip.
//
// FIX v4.4.1: BKT now receives real currentPKnow instead of
// hardcoded 0. Without this, mastery never accumulates — every
// review starts from zero, producing incorrect keyword colors.
//
// FIX v4.4.2: Returns { fsrsUpdate, newPKnow, networkPromise }
// so useFlashcardEngine can (a) update mastery locally and
// (b) await all POSTs before refreshing from backend.
//
// PERF v4.4.3: Extracted computeCardReviewData() as a pure
// computation function (no network). Used by useFlashcardEngine
// in batch mode (M1) to compute FSRS+BKT locally without
// firing individual POSTs — the batch endpoint handles all
// persistence in a single request at session end.
// persistCardReview() now delegates to computeCardReviewData()
// internally — zero behavior change for existing consumers.
// ============================================================

import { apiCall } from './api';
import { computeFsrsUpdate, getInitialFsrsState } from './fsrs-engine';
import type { FsrsState } from './fsrs-engine';
import type { FsrsUpdate } from './fsrs-engine';
import { updateBKT } from './bkt-engine';

// ── Params ────────────────────────────────────────────────

export interface PersistCardReviewParams {
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

export interface PersistCardReviewResult {
  /** Computed FSRS scheduling state (same values sent to backend) */
  fsrsUpdate: FsrsUpdate;
  /** New BKT p_know after this review (0-1). Same value sent to backend. */
  newPKnow: number;
  /** Promise that resolves when ALL backend POSTs complete (or fail). */
  networkPromise: Promise<void>;
}

// ── Pure computation (no network) ─────────────────────────

/**
 * Pure FSRS + BKT computation for a single card review.
 * Returns computed values ONLY — no backend calls.
 *
 * Used by:
 *   - persistCardReview() (delegates here, then fires POSTs)
 *   - useFlashcardEngine batch mode (collects results, sends
 *     a single POST /review-batch at session end)
 */
export interface ComputedCardReview {
  /** Computed FSRS scheduling state */
  fsrsUpdate: FsrsUpdate;
  /** New BKT p_know after this review (0-1) */
  newPKnow: number;
  /** Whether this review was graded as correct (grade >= 3) */
  isCorrect: boolean;
}

export function computeCardReviewData({
  flashcardId,
  subtopicId,
  grade,
  existingFsrsState,
  currentPKnow = 0,
}: PersistCardReviewParams): ComputedCardReview {
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

// ── Main function (computation + network) ─────────────────

/**
 * Persist FSRS scheduling update + BKT concept mastery update
 * after a card review.
 *
 * Returns computed values SYNCHRONOUSLY (before POSTs finish)
 * so callers can apply optimistic updates immediately.
 * The `networkPromise` can be awaited when the caller needs to
 * guarantee backend persistence (e.g. before refreshing mastery).
 *
 * Delegates computation to computeCardReviewData() — the same
 * pure function used by useFlashcardEngine's batch mode.
 */
export function persistCardReview(params: PersistCardReviewParams): PersistCardReviewResult {
  const { flashcardId, subtopicId, currentPKnow = 0 } = params;
  const computed = computeCardReviewData(params);

  // Fire backend POSTs (non-blocking)
  const networkPromise = (async () => {
    // POST FSRS state
    try {
      await apiCall('/fsrs-states', {
        method: 'POST',
        body: JSON.stringify({
          flashcard_id: flashcardId,
          stability: computed.fsrsUpdate.stability,
          difficulty: computed.fsrsUpdate.difficulty,
          state: computed.fsrsUpdate.state,
          reps: computed.fsrsUpdate.reps,
          lapses: computed.fsrsUpdate.lapses,
          due_at: computed.fsrsUpdate.due_at,
          last_review_at: new Date().toISOString(),
        }),
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[Tracking] FSRS update failed (non-blocking):', err);
      }
    }

    // POST BKT state (only if subtopic exists)
    if (subtopicId) {
      try {
        await apiCall('/bkt-states', {
          method: 'POST',
          body: JSON.stringify({
            subtopic_id: subtopicId,
            p_know: computed.newPKnow,
            p_transit: 0.1,
            p_slip: 0.1,
            p_guess: 0.25,
            delta: computed.newPKnow - currentPKnow,
            total_attempts: 1,
            correct_attempts: computed.isCorrect ? 1 : 0,
            last_attempt_at: new Date().toISOString(),
          }),
        });
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[Tracking] BKT update failed (non-blocking):', err);
        }
      }
    }
  })();

  return { fsrsUpdate: computed.fsrsUpdate, newPKnow: computed.newPKnow, networkPromise };
}