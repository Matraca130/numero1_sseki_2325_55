// ============================================================
// Axon — Calendar v2 Constants & Design Tokens
//
// Centralized z-index, event color, and heatmap class maps.
// All Tailwind classes are STATIC strings — no template literals
// — so the Tailwind compiler can detect them for tree-shaking.
//
// IMPORTANT: Do NOT use backtick interpolation for class names.
// Tailwind v4 purges classes it cannot statically detect.
// ============================================================

// ── Z-Index Layers ──────────────────────────────────────────

export const ZINDEX = {
  /** Heatmap color overlay on day cells */
  overlay: 10,
  /** Streak dot indicator */
  streak: 20,
  /** Side panel (Sheet) */
  panel: 100,
  /** Mobile bottom drawer */
  drawer: 200,
} as const;

// ── Event Type Colors ───────────────────────────────────────
// Each entry maps an exam/event type to static Tailwind classes.
// Keys match the `exam_type` column in `exam_events` table.

export const EVENT_COLORS = {
  exam: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    dot: 'bg-red-500',
  },
  recovery: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    dot: 'bg-orange-500',
  },
  review: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  study: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    dot: 'bg-green-500',
  },
  quiz: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  reading: {
    bg: 'bg-teal-100',
    text: 'text-teal-800',
    border: 'border-teal-300',
    dot: 'bg-teal-500',
  },
  written: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    dot: 'bg-red-500',
  },
  oral: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-300',
    dot: 'bg-purple-500',
  },
  practical: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    border: 'border-cyan-300',
    dot: 'bg-cyan-500',
  },
} as const;

export type EventType = keyof typeof EVENT_COLORS;

// ── Heatmap Intensity Classes ───────────────────────────────
// 5 levels (0-4) matching GitHub-style contribution heatmap.
// Level 0 = no activity, Level 4 = max activity.

export const HEATMAP_CLASSES = [
  'bg-[var(--heat-0)]',         // Level 0 — no activity
  'bg-[var(--heat-1)]',         // Level 1 — light
  'bg-[var(--heat-2)]',         // Level 2 — moderate
  'bg-[var(--heat-3)]',         // Level 3 — high
  'bg-[var(--heat-4)]',         // Level 4 — max
] as const;

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

// ── Heatmap Labels (for accessibility / tooltips) ───────────

export const HEATMAP_LABELS = [
  'Sin actividad',
  'Actividad baja',
  'Actividad moderada',
  'Actividad alta',
  'Actividad muy alta',
] as const;

// ── Streak Threshold (G-02 Decision) ────────────────────────
// A day counts as "completed" for streak calculation when the
// student accumulates >= 30 minutes of study time.

export const STREAK_THRESHOLD_MINUTES = 30;
