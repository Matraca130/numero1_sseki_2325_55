// @deprecated v4.4.5 — Dead code. 0 importers. PATH B migration complete.
// FSRS computation now runs server-side in backend batch-review.ts.
// Safe to delete in next cleanup PR.

export interface FsrsState {
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
  due?: string | null;
  last_review?: string | null;
}

/** @deprecated Backend computes FSRS v4 Petrick. */
export function computeFsrsUpdate(): never {
  throw new Error('[fsrs-engine] DEPRECATED: Backend computes FSRS v4 via PATH B');
}

/** @deprecated Backend initializes FSRS state. */
export function getInitialFsrsState(): never {
  throw new Error('[fsrs-engine] DEPRECATED: Backend initializes FSRS via PATH B');
}
