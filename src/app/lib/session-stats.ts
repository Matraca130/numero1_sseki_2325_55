// ============================================================
// Axon -- Shared session statistics helpers
//
// Extracted from CompletedScreen and AdaptivePartialSummary
// where these computations were duplicated.
//
// Pure functions, zero dependencies beyond types.
// ============================================================

import type { TopicMasterySummary } from '@/app/services/keywordMasteryApi';
import type { CardMasteryDelta } from '@/app/hooks/useFlashcardEngine';

export function countCorrect(ratings: number[]): number {
  return ratings.filter(s => s >= 3).length;
}

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

export interface DeltaStats {
  improved: number;
  declined: number;
  newlyMastered: number;
  total: number;
}

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
