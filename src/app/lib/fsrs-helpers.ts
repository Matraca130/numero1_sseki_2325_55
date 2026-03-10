// ============================================================
// Axon — FSRS Shared Helpers
//
// Extracted from useFlashcardEngine and useAdaptiveSession where
// buildExistingFsrs was duplicated identically (15 lines each).
//
// Single source of truth for building FsrsState from:
//   1. Study-queue masteryMap (real FSRS values from backend)
//   2. Card's fsrs_state field (from enrichment)
//   3. undefined (new card, computeCardReviewData uses initial state)
//
// Consumers:
//   - useFlashcardEngine.ts (standard session)
//   - useAdaptiveSession.ts (adaptive multi-round session)
// ============================================================

import type { FsrsState } from './fsrs-engine';

/**
 * Minimal interface for study-queue items used by buildExistingFsrs.
 * Accepts both StudyQueueItem (full) and any object with these fields.
 */
export interface FsrsMasterySource {
  stability: number;
  difficulty: number;
  fsrs_state: string;
}

/**
 * Minimal interface for cards used by buildExistingFsrs.
 * Accepts both Flashcard (UI type) and any object with these fields.
 */
export interface FsrsCardSource {
  id: string;
  fsrs_state?: string;
}

/**
 * Build an FsrsState from available data sources.
 *
 * Priority:
 *   1. masteryMap (real FSRS values from study-queue / backend)
 *   2. card.fsrs_state (from enrichment or API response)
 *   3. undefined (new card — computeCardReviewData will use getInitialFsrsState)
 *
 * @param card - Card with id and optional fsrs_state
 * @param masteryMap - Map of card ID → mastery source (study-queue item)
 * @returns FsrsState if data available, undefined for new cards
 */
export function buildExistingFsrs(
  card: FsrsCardSource,
  masteryMap?: Map<string, FsrsMasterySource>,
): FsrsState | undefined {
  // 1. Try masteryMap (real values from study-queue)
  const sq = masteryMap?.get(card.id);
  if (sq) {
    return {
      stability: sq.stability,
      difficulty: sq.difficulty,
      reps: 0,     // study-queue doesn't expose reps/lapses; backend will merge
      lapses: 0,
      state: sq.fsrs_state,
    };
  }

  // 2. Fallback: use card.fsrs_state if set (from enrichment)
  if (card.fsrs_state) {
    return {
      stability: 1,
      difficulty: 5,
      reps: 0,
      lapses: 0,
      state: card.fsrs_state,
    };
  }

  // 3. No data → undefined (computeCardReviewData will use initial state)
  return undefined;
}
