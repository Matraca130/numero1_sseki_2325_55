// ============================================================
// @deprecated — PATH B MIGRATION (PR #30)
//
// This file has 0 importers after the PATH B migration.
// FSRS v4 Petrick is now computed SERVER-SIDE in
// batch-review.ts (backend). The frontend no longer
// schedules cards — it only sends grade + subtopic_id.
//
// Type exports (FsrsState, FsrsUpdate) are preserved for
// any transitive consumers or type-only imports.
// Function exports throw deprecation errors at runtime.
//
// Safe to delete once confirmed no external importers remain.
// ============================================================

/** @deprecated Backend computes FSRS server-side. */
export interface FsrsState {
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: string;
}

/** @deprecated Backend computes FSRS server-side. */
export interface FsrsUpdate extends FsrsState {
  due_at: string;
}

/** @deprecated PATH B: backend computes FSRS v4 Petrick server-side. */
export function computeFsrsUpdate(
  _currentState: FsrsState,
  _grade: 1 | 2 | 3 | 4
): FsrsUpdate {
  throw new Error(
    '[DEPRECATED] computeFsrsUpdate() removed in PATH B migration. ' +
    'Backend computes FSRS v4 Petrick server-side via POST /review-batch.'
  );
}

/** @deprecated PATH B: backend manages initial FSRS state. */
export function getInitialFsrsState(): FsrsState {
  throw new Error(
    '[DEPRECATED] getInitialFsrsState() removed in PATH B migration. ' +
    'Backend manages initial FSRS state server-side.'
  );
}
