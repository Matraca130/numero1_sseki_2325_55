// ============================================================
// Axon — Quiz Utility Functions (canonical source)
//
// Phase 8a: deduplicated from useQuizSession.ts + QuestionRenderer.tsx
//
// NOTE: /content/quiz-helpers.ts maintains its own copies of
// normalizeText, checkAnswer, and LETTERS. These will be unified
// when the /content/ directory enters scope.
// ============================================================

import type { QuizQuestion } from '@/app/services/quizApi';

// ── Constants ────────────────────────────────────────────

/** Letter labels for MCQ options (A–H) */
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

// ── Text normalization ───────────────────────────────────

/** Lowercase, strip accents (NFD), trim */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// ── Answer checking ──────────────────────────────────────

/**
 * Frontend-side answer correctness check.
 * - MCQ: exact match on option key
 * - True/False: normalized comparison
 * - Open / Fill-blank: flexible substring match
 */
export function checkAnswer(q: QuizQuestion, userAnswer: string): boolean {
  if (q.question_type === 'mcq') return userAnswer === q.correct_answer;
  if (q.question_type === 'true_false') {
    return normalizeText(userAnswer) === normalizeText(q.correct_answer);
  }
  const norm = normalizeText(userAnswer);
  const expected = normalizeText(q.correct_answer);
  if (!norm) return false;
  return norm === expected || norm.includes(expected) || expected.includes(norm);
}
