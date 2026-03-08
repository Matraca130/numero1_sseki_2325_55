// ============================================================
// Axon — Centralized stale-time constants for React Query
//
// Every useQuery hook MUST import from here instead of
// declaring its own local `const`. Prevents drift and makes
// tuning easy (one change, all hooks update).
// ============================================================

/** Professor-authored content: summaries, chunks, keywords, blocks, videos */
export const PROFESSOR_CONTENT_STALE = 10 * 60 * 1000; // 10 min

/** Student-generated data: annotations, reading states, notes */
export const STUDENT_DATA_STALE = 2 * 60 * 1000; // 2 min

/** Cross-keyword connections graph */
export const CONNECTIONS_STALE = 5 * 60 * 1000; // 5 min

/** Cross-summary keyword search results (ephemeral, short-lived) */
export const SEARCH_STALE = 30 * 1000; // 30s

/** Keyword suggestions from sibling summaries (same topic) */
export const SUGGESTIONS_STALE = 5 * 60 * 1000; // 5 min — same as connections

/** BKT mastery model snapshots */
export const STUDENT_BKT_STALE = 5 * 60 * 1000; // 5 min