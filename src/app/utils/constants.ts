// ============================================================
// Axon — Shared Constants
//
// Single source of truth for values used across multiple files.
// ============================================================

/**
 * Axon's reference "today" date for the demo environment.
 * Used by: wizard, schedule view, reschedule engine, time estimates.
 *
 * IMPORTANT: When moving to production, replace with `new Date()`.
 */
export const AXON_TODAY = new Date(2026, 1, 7); // Feb 7, 2026

/**
 * Returns a fresh copy of AXON_TODAY to avoid mutation issues.
 * Use this when you need to call .setDate() or similar mutating methods.
 */
export function getAxonToday(): Date {
  return new Date(AXON_TODAY);
}

// ── Method Time Defaults ─────────────────────────────────────
// Single source of truth for per-method time estimates (minutes).
// Used by: wizard, useStudyPlans (backend mapping), rescheduleEngine,
//          useStudyTimeEstimates (static fallback).
//
// These values represent the "cold start" estimate before real
// session data overrides them via useStudyTimeEstimates.

export const METHOD_TIME_DEFAULTS: Record<string, number> = {
  flashcard: 20,
  quiz: 15,
  video: 35,
  resumo: 40,
  '3d': 15,
  reading: 30,
};

// ── Method → Backend session_type mapping ────────────────────
// The DB `study_plan_tasks.item_type` CHECK constraint accepts:
//   'flashcard' | 'quiz' | 'reading' | 'keyword'
// Wizard methods 'video', 'resumo', '3d' must map to valid values
// when persisted to backend.

export const METHOD_TO_BACKEND_ITEM_TYPE: Record<string, string> = {
  flashcard: 'flashcard',
  quiz: 'quiz',
  resumo: 'reading',   // resumo = reading-based study
  video: 'reading',     // video is reading-type in backend
  '3d': 'reading',      // 3d has no direct mapping, fallback to reading
  reading: 'reading',
};

// ── Backend item_type → Display method mapping ───────────────
// Inverse of above for backend→frontend reconstruction.
// Since multiple frontend methods map to 'reading', we can't
// perfectly reconstruct — default to 'reading' for ambiguous.

export const BACKEND_ITEM_TYPE_TO_METHOD: Record<string, string> = {
  flashcard: 'flashcard',
  quiz: 'quiz',
  reading: 'resumo',   // 'reading' has no UI entry; resumo is closest match (FileText icon)
  keyword: 'resumo',    // keyword maps to reading-like activities
};

// ── Priority threshold for interleave algorithm ──────────────
// Topics with priority >= this value are considered "high priority"
// and get 2:1 interleave ratio vs normal priority topics.

export const HIGH_PRIORITY_THRESHOLD = 60;
