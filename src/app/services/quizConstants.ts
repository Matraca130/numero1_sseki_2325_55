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

// Canonical `QuestionType` lives in types/platform.ts (audit 2026-04-23).
// Imported + re-exported so quizApi.ts / quizQuestionsApi.ts / tests
// that `import { QuestionType } from '@/app/services/quizConstants'`
// keep working.
import type { QuestionType } from '@/app/types/platform';
export type { QuestionType };

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

// ── AUD-01 FIX: question_type normalizer ──────────────────
//
// WHY: Backend AI endpoints generate.ts, pre-generate.ts, and
// generate-smart.ts all prompt Gemini with:
//   "question_type": "multiple_choice"
// and store: g.question_type || "multiple_choice"
//
// But our type system uses "mcq" (from the original schema).
// This map handles the backend→frontend translation without
// touching the backend code (which is in a separate repo).
//
// The DB may contain BOTH "mcq" (from manual CRUD) AND
// "multiple_choice" (from AI generation). This normalizer
// ensures both render correctly.

const QUESTION_TYPE_ALIASES: Record<string, QuestionType> = {
  // Standard types (pass-through)
  mcq: 'mcq',
  true_false: 'true_false',
  fill_blank: 'fill_blank',
  open: 'open',
  // Backend AI aliases
  multiple_choice: 'mcq',
  'multiple-choice': 'mcq',  // defensive: in case of slug-format
  // Other possible Gemini outputs (defensive)
  true_or_false: 'true_false',
  'true/false': 'true_false',
  fill_in_blank: 'fill_blank',
  fill_in_the_blank: 'fill_blank',
  open_ended: 'open',
};

/**
 * Normalize a question_type from the database to our QuestionType enum.
 * Handles both standard types ("mcq") and AI-generated aliases ("multiple_choice").
 *
 * @example
 * normalizeQuestionType("multiple_choice") // → "mcq"
 * normalizeQuestionType("mcq")             // → "mcq"
 * normalizeQuestionType("true_false")      // → "true_false"
 * normalizeQuestionType("banana")          // → "mcq" (safe fallback)
 */
export function normalizeQuestionType(raw: string | undefined | null): QuestionType {
  if (!raw) return 'mcq';
  const normalized = QUESTION_TYPE_ALIASES[raw.toLowerCase().trim()];
  return normalized || 'mcq'; // fallback to mcq for unknown types
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

// ── Difficulty ↔ Integer Mapping (DB stores 1/2/3) ────────

export const DIFFICULTY_TO_INT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
export const INT_TO_DIFFICULTY: Record<number, Difficulty> = { 1: 'easy', 2: 'medium', 3: 'hard' };

// ── AUD-02 FIX: difficulty normalizer ─────────────────────
//
// WHY: The DB may contain BOTH formats:
//   - INTEGER (1/2/3) from manual CRUD via QuestionFormModal
//   - STRING ("easy"/"medium"/"hard") from AI generation
//
// The backend AI endpoints insert: g.difficulty || "medium"
// where Gemini returns string values. The CRUD manual path
// converts via DIFFICULTY_TO_INT before sending.
//
// This normalizer handles both formats so components don't
// need to care about the source of the question.

const STRING_TO_DIFFICULTY: Record<string, Difficulty> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
  // Possible Spanish variants from Gemini (defensive)
  facil: 'easy',
  media: 'medium',
  dificil: 'hard',
};

/**
 * Normalize a difficulty value (int OR string) to our Difficulty type.
 *
 * @example
 * normalizeDifficulty(1)         // → "easy"
 * normalizeDifficulty(2)         // → "medium"
 * normalizeDifficulty("hard")    // → "hard"
 * normalizeDifficulty("medium")  // → "medium"
 * normalizeDifficulty(undefined) // → "medium" (safe fallback)
 */
export function normalizeDifficulty(raw: number | string | undefined | null): Difficulty {
  if (raw == null) return 'medium';

  // Integer path (manual CRUD)
  if (typeof raw === 'number') {
    return INT_TO_DIFFICULTY[raw] || 'medium';
  }

  // String path (AI generation)
  const normalized = STRING_TO_DIFFICULTY[raw.toLowerCase().trim()];
  return normalized || 'medium';
}
