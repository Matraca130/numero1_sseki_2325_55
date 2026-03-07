// ============================================================
// Axon — Quiz Shared Constants & Types
//
// Single source of truth for quiz-related types, labels,
// mappings, and display constants used across all quiz views.
//
// NOTE: Types are defined HERE to avoid circular dependencies.
// quizApi.ts re-exports them for backwards compatibility.
// ============================================================

// ── Core Types ────────────────────────────────────────────

export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'open';
export type Difficulty = 'easy' | 'medium' | 'hard';

// ── Question Type Labels ──────────────────────────────────

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Opcion multiple',
  true_false: 'Verdadero / Falso',
  fill_blank: 'Completar',
  open: 'Respuesta abierta',
};

/** Compact labels for tight UI (badges, results detail) */
export const QUESTION_TYPE_LABELS_SHORT: Record<QuestionType, string> = {
  mcq: 'Opcion multiple',
  true_false: 'V/F',
  fill_blank: 'Completar',
  open: 'Abierta',
};

// ── Difficulty Labels & Colors ────────────────────────────

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Facil',
  medium: 'Media',
  hard: 'Dificil',
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-red-100 text-red-700 border-red-200',
};

// ── Difficulty ↔ Integer Mapping (DB stores 1/2/3) ────────

export const DIFFICULTY_TO_INT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
export const INT_TO_DIFFICULTY: Record<number, Difficulty> = { 1: 'easy', 2: 'medium', 3: 'hard' };
