// ============================================================
// Axon — Quiz Shared Constants & Types
//
// Single source of truth for quiz-related types, labels,
// mappings, and display constants used across all quiz views.
//
// NOTE: Types are defined HERE to avoid circular dependencies.
// quizApi.ts re-exports them for backwards compatibility.
//
// AUD-01 FIX: Backend AI endpoints (generate.ts, pre-generate.ts,
// generate-smart.ts) ask Gemini for "multiple_choice" but our
// QuestionType uses "mcq". We handle this with a normalizer.
//
// AUD-02 FIX: Backend AI inserts difficulty as STRING ("easy"/"medium"/"hard")
// but manual CRUD uses INTEGER (1/2/3). We handle both with
// normalizeDifficulty().
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

// ── AUD-01 FIX: question_type normalizer ────────────────────

const QUESTION_TYPE_ALIASES: Record<string, QuestionType> = {
  mcq: 'mcq',
  true_false: 'true_false',
  fill_blank: 'fill_blank',
  open: 'open',
  multiple_choice: 'mcq',
  'multiple-choice': 'mcq',
  true_or_false: 'true_false',
  'true/false': 'true_false',
  fill_in_blank: 'fill_blank',
  fill_in_the_blank: 'fill_blank',
  open_ended: 'open',
};

export function normalizeQuestionType(raw: string | undefined | null): QuestionType {
  if (!raw) return 'mcq';
  const normalized = QUESTION_TYPE_ALIASES[raw.toLowerCase().trim()];
  return normalized || 'mcq';
}

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

// ── Difficulty <-> Integer Mapping (DB stores 1/2/3) ────────

export const DIFFICULTY_TO_INT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
export const INT_TO_DIFFICULTY: Record<number, Difficulty> = { 1: 'easy', 2: 'medium', 3: 'hard' };

// ── AUD-02 FIX: difficulty normalizer ───────────────────────

const STRING_TO_DIFFICULTY: Record<string, Difficulty> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
  facil: 'easy',
  media: 'medium',
  dificil: 'hard',
};

export function normalizeDifficulty(raw: number | string | undefined | null): Difficulty {
  if (raw == null) return 'medium';
  if (typeof raw === 'number') {
    return INT_TO_DIFFICULTY[raw] || 'medium';
  }
  const normalized = STRING_TO_DIFFICULTY[raw.toLowerCase().trim()];
  return normalized || 'medium';
}
