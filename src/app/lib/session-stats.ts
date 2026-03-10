// ============================================================
// Axon -- Shared session statistics helpers
//
// Extracted from CompletedScreen (AdaptiveFlashcardView.tsx) and
// AdaptivePartialSummary.tsx where these computations were
// duplicated identically.
//
// Consumers:
//   - AdaptiveCompletedScreen.tsx
//   - AdaptivePartialSummary.tsx
//   - Any future session summary component
//
// Pure functions, zero dependencies beyond types.
// ============================================================

import type { TopicMasterySummary } from '@/app/services/keywordMasteryApi';
import type { CardMasteryDelta } from '@/app/hooks/useFlashcardEngine';

// ── Correct count ───────────────────────────────────────────

/**
 * Count ratings considered "correct" (grade >= 3).
 *
 * Centralizes the `ratings.filter(s => s >= 3).length` pattern
 * that was duplicated in 5+ locations across the codebase:
 *   - AdaptivePartialSummary, AdaptiveCompletedScreen (UI)
 *   - useAdaptiveSession finishCurrentRound, finishSession (hook)
 *   - closeStudySession correctReviews computation (hook)
 *
 * @returns Integer count of ratings >= 3
 */
export function countCorrect(ratings: number[]): number {
  return ratings.filter(s => s >= 3).length;
}

// ── Mastery percentage ──────────────────────────────────────

/**
 * Compute the overall mastery percentage from topic summary or rating fallback.
 *
 * Priority:
 *   1. topicSummary.overallMastery (real BKT-based keyword mastery)
 *   2. Average of allStats ratings mapped to 0-100% (rough fallback)
 *
 * @returns Integer percentage [0-100]
 */
export function computeMasteryPct(
  topicSummary: TopicMasterySummary | null,
  allStats: number[],
): number {
  if (topicSummary && topicSummary.keywordsTotal > 0) {
    return Math.round(topicSummary.overallMastery * 100);
  }
  if (allStats.length === 0) return 0;
  const avg = allStats.reduce((a, b) => a + b, 0) / allStats.length;
  return Math.round((avg / 5) * 100);
}

// ── Delta statistics ────────────────────────────────────────

export interface DeltaStats {
  improved: number;
  declined: number;
  newlyMastered: number;
  total: number;
}

/**
 * Compute aggregated mastery change statistics from per-card deltas.
 *
 * @returns null if no deltas exist, otherwise { improved, declined, newlyMastered, total }
 */
export function computeDeltaStats(
  masteryDeltas: CardMasteryDelta[],
): DeltaStats | null {
  if (masteryDeltas.length === 0) return null;

  let improved = 0;
  let declined = 0;
  let newlyMastered = 0;

  for (const d of masteryDeltas) {
    if (d.after > d.before) improved++;
    else if (d.after < d.before) declined++;
    if (d.before < 0.75 && d.after >= 0.75) newlyMastered++;
  }

  return { improved, declined, newlyMastered, total: masteryDeltas.length };
}
