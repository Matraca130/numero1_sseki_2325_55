// @deprecated v4.4.5 — Dead code. 0 importers. PATH B migration complete.
// FSRS helpers now live server-side in backend.
// Safe to delete in next cleanup PR.

/** @deprecated Backend handles FSRS scheduling. */
export function getNextReviewDate(): never {
  throw new Error('[fsrs-helpers] DEPRECATED: Backend handles FSRS scheduling via PATH B');
}
