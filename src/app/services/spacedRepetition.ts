// ============================================================
// @deprecated — Axon v4.4.7 Cleanup (C1+C6)
//
// This file contained the old SM-2 spaced repetition algorithm
// (16KB). It was superseded by:
//   - PATH B: backend computes FSRS v4 + BKT v4 (PR #30)
//   - useReviewBatch.ts: batch submission hook
//   - studySessionApi.ts: submitReviewBatch()
//
// 0 importers confirmed via GitHub code search.
// Safe to delete entirely in next cleanup PR.
// ============================================================

/** @deprecated Use backend PATH B computation instead */
export type KeywordState = {
  keyword: string;
  mastery: number;
  stability_days: number;
  due_at: string;
  lapses: number;
  exposures: number;
  card_coverage: number;
  last_review_at: string | null;
  color: 'red' | 'yellow' | 'green';
  color_stability_counter: number;
};

/** @deprecated Dead code — 0 importers. Use backend PATH B. */
export function createKeywordState(): never {
  throw new Error('[spacedRepetition] DEPRECATED: Use backend PATH B computation');
}

/** @deprecated Dead code — 0 importers. Use backend PATH B. */
export function calculateNeedScore(): never {
  throw new Error('[spacedRepetition] DEPRECATED: Use backend PATH B computation');
}

/** @deprecated Dead code — 0 importers. Use backend PATH B. */
export function sm2Review(): never {
  throw new Error('[spacedRepetition] DEPRECATED: Use backend PATH B computation');
}
