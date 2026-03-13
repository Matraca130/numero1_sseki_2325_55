// @deprecated v4.4.5 — Dead code. 0 importers. PATH B migration complete.
// All review tracking goes through useReviewBatch.ts → POST /review-batch.
// Safe to delete in next cleanup PR.

/** @deprecated Use useReviewBatch.ts instead */
export function computeCardReviewData(): never {
  throw new Error('[tracking] DEPRECATED: Use useReviewBatch + backend PATH B');
}

/** @deprecated Use useReviewBatch.ts instead */
export function persistCardReview(): never {
  throw new Error('[tracking] DEPRECATED: Use useReviewBatch + backend PATH B');
}
