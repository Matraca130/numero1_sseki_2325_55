// ============================================================
// Axon v4.5 — Grade Mapper Utility
//
// Pure functions that translate between grade scales used by
// different components of the Axon evaluation system.
//
// SCALES IN PLAY:
//   UI rating (flashcard buttons):  1-5  (1=again, 2=hard, 3=ok, 4=good, 5=perfect)
//   FSRS (backend spec):            1-4  (1=Again, 2=Hard, 3=Good, 4=Easy)
//   Continuous (spec v4.2):         0.0-1.0 (Again=0.0, Hard=0.35, Good=0.65, Easy=1.0)
//
// Axon does NOT use the SM-2 algorithm. The 1-5 scale is purely a
// UX granularity choice for the flashcard session screen. Real
// scheduling is FSRS v4 on the backend.
//
// isCorrect THRESHOLDS (per spec v4.2):
//   FSRS:     grade >= 2 (Hard counts as successful recall)
//   BKT:      grade >= 3 (only Good+ counts as knowledge demonstrated)
//   Exam:     grade >= 2 (same as FSRS)
//
// USAGE:
//   This module is the SINGLE SOURCE OF TRUTH for grade translation.
//   INTEGRATED (audit 2026-04-14, P0 #1): `useFlashcardEngine.ts`
//   imports `uiRatingToFsrsGrade()` to translate the 1-5 UI rating
//   to the 1-4 backend grade before it reaches `useReviewBatch` and
//   the backend `batch-review.ts` endpoint (PATH B).
//
// BACKEND PR: https://github.com/Matraca130/axon-backend/pull/60
//             (batch-review.ts PATH B, based on PR #59 libs)
// ============================================================

// ── Types ────────────────────────────────────────────────

/**
 * FSRS grade scale (1-4), as expected by the backend spec v4.2.
 * - 1 = Again (complete failure, lapse)
 * - 2 = Hard  (recalled with serious difficulty, NOT a lapse)
 * - 3 = Good  (recalled correctly)
 * - 4 = Easy  (recalled effortlessly)
 */
export type FsrsGrade = 1 | 2 | 3 | 4;

/**
 * UI rating scale (1-5) used by the flashcard session buttons.
 * Purely a UX granularity choice — Axon does NOT use the SM-2
 * algorithm. Scheduling is FSRS v4 on the backend.
 * - 1 = Again (blackout)
 * - 2 = Hard (incorrect but familiar)
 * - 3 = Good (correct with difficulty)
 * - 4 = Easy (correct quickly)
 * - 5 = Perfect (instant recall)
 */
export type SmRating = 1 | 2 | 3 | 4 | 5;

/**
 * Context for grade evaluation — different engines have different
 * thresholds for what counts as "correct".
 */
export type GradeContext = 'fsrs' | 'bkt' | 'exam';

// ── Constants ─────────────────────────────────────────────

/**
 * Mapping from FSRS discrete grade (1-4) to continuous float (0.0-1.0).
 * Per spec v4.2, section 6.1, amendment A3.
 */
export const FSRS_GRADE_TO_FLOAT: Record<FsrsGrade, number> = {
  1: 0.00,  // Again
  2: 0.35,  // Hard
  3: 0.65,  // Good
  4: 1.00,  // Easy
};

/**
 * isCorrect thresholds per engine context.
 * - FSRS: grade >= 2 means Hard is a successful recall (NOT a lapse)
 * - BKT:  grade >= 3 means only Good+ demonstrates knowledge
 * - Exam: grade >= 2 same as FSRS
 */
export const IS_CORRECT_THRESHOLD: Record<GradeContext, FsrsGrade> = {
  fsrs: 2,
  bkt: 3,
  exam: 2,
};

// ── Grade Translation Functions ──────────────────────────

/**
 * Convert the 1-5 UI rating from the flashcard session buttons
 * to the FSRS backend grade (1-4).
 *
 * Mapping rationale:
 *   UI 1 (again)   → FSRS 1 (Again)  — total failure
 *   UI 2 (hard)    → FSRS 2 (Hard)   — recalled but struggled
 *   UI 3 (ok)      → FSRS 3 (Good)   — standard correct recall
 *   UI 4 (good)    → FSRS 3 (Good)   — good recall (same FSRS bucket)
 *   UI 5 (perfect) → FSRS 4 (Easy)   — effortless recall
 *
 * Called by useFlashcardEngine.ts and any future consumer that
 * forwards ratings to the FSRS PATH B backend.
 */
export function uiRatingToFsrsGrade(rating: SmRating): FsrsGrade {
  switch (rating) {
    case 1: return 1; // Again → Again
    case 2: return 2; // Hard → Hard
    case 3: return 3; // OK → Good
    case 4: return 3; // Good → Good (FSRS doesn't distinguish OK vs Good)
    case 5: return 4; // Perfect → Easy
    default: {
      // Defensive: clamp unknown values
      const clamped = Math.max(1, Math.min(5, rating)) as SmRating;
      return uiRatingToFsrsGrade(clamped);
    }
  }
}

/**
 * @deprecated Use `uiRatingToFsrsGrade`. Kept as an alias to avoid
 * breaking external consumers during the SM-2 → UI rename.
 * Will be removed once all callers migrate.
 */
export const smRatingToFsrsGrade = uiRatingToFsrsGrade;

/**
 * Convert FSRS grade (1-4) to continuous float (0.0-1.0).
 * Used by the backend FSRS engine for stability/difficulty calculations.
 */
export function fsrsGradeToFloat(grade: FsrsGrade): number {
  return FSRS_GRADE_TO_FLOAT[grade] ?? 0.0;
}

/**
 * Check if a grade represents a "correct" answer in a given context.
 *
 * Critical: FSRS and BKT have DIFFERENT thresholds for what counts
 * as correct. This is intentional per spec v4.2:
 *   - FSRS treats Hard (2) as successful recall (stability increases)
 *   - BKT treats only Good+ (3+) as knowledge demonstrated
 *   - Exam mode uses FSRS threshold (2+)
 */
export function isCorrect(grade: FsrsGrade, context: GradeContext): boolean {
  return grade >= IS_CORRECT_THRESHOLD[context];
}

/**
 * Determine if a card is in "recovery" mode based on BKT state.
 * Recovery mode applies a 2.0x stability floor when the student
 * is re-learning something they previously knew.
 *
 * Per spec v4.2: isRecovering = max_p_know > 0.50 && p_know < max_p_know
 */
export function isRecovering(
  currentPKnow: number,
  maxPKnow: number,
  recoveryThreshold: number = 0.50
): boolean {
  return maxPKnow > recoveryThreshold && currentPKnow < maxPKnow;
}

// ── Convenience: Full pipeline ───────────────────────────

/**
 * Complete grade translation pipeline for a flashcard review.
 * Takes a 1-5 UI rating and returns all the grade representations
 * needed by different parts of the system.
 *
 * Usage example:
 * ```ts
 * const { fsrsGrade, continuousGrade, isCorrectFsrs, isCorrectBkt } =
 *   translateRating(userRating);
 *
 * // Send to backend:
 * await submitReview({ ...reviewData, grade: fsrsGrade });
 * ```
 */
export function translateRating(rating: SmRating) {
  const fsrsGrade = uiRatingToFsrsGrade(rating);
  const continuousGrade = fsrsGradeToFloat(fsrsGrade);

  return {
    /** Original 1-5 UI rating (kept under `smRating` key for
     *  backward compatibility with pre-rename consumers) */
    smRating: rating,
    /** FSRS grade for backend (1-4) */
    fsrsGrade,
    /** Continuous grade for calculations (0.0-1.0) */
    continuousGrade,
    /** Whether FSRS considers this a successful recall */
    isCorrectFsrs: isCorrect(fsrsGrade, 'fsrs'),
    /** Whether BKT considers this as knowledge demonstrated */
    isCorrectBkt: isCorrect(fsrsGrade, 'bkt'),
    /** Whether exam mode considers this correct */
    isCorrectExam: isCorrect(fsrsGrade, 'exam'),
  };
}
