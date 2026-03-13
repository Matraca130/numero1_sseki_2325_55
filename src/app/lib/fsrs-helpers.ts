// ============================================================
// @deprecated — PATH B MIGRATION (PR #30)
//
// This file has 0 importers after the PATH B migration.
// buildExistingFsrs() was used by useFlashcardEngine and
// useAdaptiveSession to build FsrsState from masteryMap.
// In PATH B, the backend reads FSRS state from the DB
// directly — the frontend never sends FSRS state.
//
// Type exports preserved. Function throws deprecation error.
//
// Safe to delete once confirmed no external importers remain.
// ============================================================

import type { FsrsState } from './fsrs-engine';

/** @deprecated PATH B: backend reads FSRS state from DB. */
export interface FsrsMasterySource {
  stability: number;
  difficulty: number;
  fsrs_state: string;
}

/** @deprecated PATH B: backend reads FSRS state from DB. */
export interface FsrsCardSource {
  id: string;
  fsrs_state?: string;
}

/** @deprecated PATH B: backend reads FSRS state from DB directly. */
export function buildExistingFsrs(
  _card: FsrsCardSource,
  _masteryMap?: Map<string, FsrsMasterySource>,
): FsrsState | undefined {
  throw new Error(
    '[DEPRECATED] buildExistingFsrs() removed in PATH B migration. ' +
    'Backend reads FSRS state from fsrs_states table directly.'
  );
}
