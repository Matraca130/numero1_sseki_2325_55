// ============================================================
// Quiz Constants Guards — Axon v4.4
//
// PURPOSE: Prevent regressions in quiz type normalization,
// difficulty mapping, and label completeness.
//
// GUARDS AGAINST:
//   - AUD-01: Backend AI returns "multiple_choice" instead of "mcq"
//   - AUD-02: Difficulty as string vs integer mismatch
//   - Guidelines Rule 3: difficulty must be INTEGER (1/2/3)
//   - Guidelines Rule 4: question_type enum integrity
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  normalizeQuestionType,
  normalizeDifficulty,
  DIFFICULTY_TO_INT,
  INT_TO_DIFFICULTY,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_LABELS_SHORT,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
} from '@/app/services/quizConstants';
import type { QuestionType, Difficulty } from '@/app/services/quizConstants';

// ══════════════════════════════════════════════════════════════
// SUITE 1: normalizeQuestionType (AUD-01 guard)
// ══════════════════════════════════════════════════════════════

describe('normalizeQuestionType', () => {
  const STANDARD_TYPES: QuestionType[] = ['mcq', 'true_false', 'fill_blank', 'open'];

  it.each(STANDARD_TYPES)('passes through standard type "%s"', (type) => {
    expect(normalizeQuestionType(type)).toBe(type);
  });

  it('normalizes "multiple_choice" → "mcq" (AI generate.ts output)', () => {
    expect(normalizeQuestionType('multiple_choice')).toBe('mcq');
  });

  it('normalizes "multiple-choice" → "mcq" (slug format)', () => {
    expect(normalizeQuestionType('multiple-choice')).toBe('mcq');
  });

  it('normalizes "true_or_false" → "true_false"', () => {
    expect(normalizeQuestionType('true_or_false')).toBe('true_false');
  });

  it('normalizes "fill_in_the_blank" → "fill_blank"', () => {
    expect(normalizeQuestionType('fill_in_the_blank')).toBe('fill_blank');
  });

  it('normalizes "open_ended" → "open"', () => {
    expect(normalizeQuestionType('open_ended')).toBe('open');
  });

  it('handles null → "mcq" (safe fallback)', () => {
    expect(normalizeQuestionType(null)).toBe('mcq');
  });

  it('handles undefined → "mcq" (safe fallback)', () => {
    expect(normalizeQuestionType(undefined)).toBe('mcq');
  });

  it('handles unknown string → "mcq" (safe fallback)', () => {
    expect(normalizeQuestionType('banana')).toBe('mcq');
  });

  it('is case-insensitive', () => {
    expect(normalizeQuestionType('MCQ')).toBe('mcq');
    expect(normalizeQuestionType('Multiple_Choice')).toBe('mcq');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: normalizeDifficulty (AUD-02 guard + Guidelines Rule 3)
// ══════════════════════════════════════════════════════════════

describe('normalizeDifficulty', () => {
  it('normalizes 1 → "easy"', () => {
    expect(normalizeDifficulty(1)).toBe('easy');
  });

  it('normalizes 2 → "medium"', () => {
    expect(normalizeDifficulty(2)).toBe('medium');
  });

  it('normalizes 3 → "hard"', () => {
    expect(normalizeDifficulty(3)).toBe('hard');
  });

  it('normalizes "easy" → "easy"', () => {
    expect(normalizeDifficulty('easy')).toBe('easy');
  });

  it('normalizes "hard" → "hard"', () => {
    expect(normalizeDifficulty('hard')).toBe('hard');
  });

  it('normalizes "facil" → "easy" (Spanish)', () => {
    expect(normalizeDifficulty('facil')).toBe('easy');
  });

  it('normalizes "dificil" → "hard" (Spanish)', () => {
    expect(normalizeDifficulty('dificil')).toBe('hard');
  });

  it('handles null → "medium" (safe fallback)', () => {
    expect(normalizeDifficulty(null)).toBe('medium');
  });

  it('handles undefined → "medium" (safe fallback)', () => {
    expect(normalizeDifficulty(undefined)).toBe('medium');
  });

  it('handles unknown int → "medium" (safe fallback)', () => {
    expect(normalizeDifficulty(99)).toBe('medium');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: Mapping integrity (bidirectional)
// ══════════════════════════════════════════════════════════════

describe('Difficulty ↔ Integer mapping', () => {
  it('DIFFICULTY_TO_INT covers all 3 difficulties', () => {
    expect(Object.keys(DIFFICULTY_TO_INT).sort()).toEqual(['easy', 'hard', 'medium']);
  });

  it('INT_TO_DIFFICULTY covers 1, 2, 3', () => {
    expect(Object.keys(INT_TO_DIFFICULTY).sort()).toEqual(['1', '2', '3']);
  });

  it('round-trip: difficulty → int → difficulty', () => {
    const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
    for (const d of diffs) {
      const intVal = DIFFICULTY_TO_INT[d];
      const backToDiff = INT_TO_DIFFICULTY[intVal];
      expect(backToDiff).toBe(d);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: Label maps completeness
// ══════════════════════════════════════════════════════════════

describe('Label maps are complete', () => {
  const ALL_QUESTION_TYPES: QuestionType[] = ['mcq', 'true_false', 'fill_blank', 'open'];
  const ALL_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

  it('QUESTION_TYPE_LABELS has entry for every QuestionType', () => {
    for (const qt of ALL_QUESTION_TYPES) {
      expect(QUESTION_TYPE_LABELS[qt]).toBeDefined();
      expect(typeof QUESTION_TYPE_LABELS[qt]).toBe('string');
    }
  });

  it('QUESTION_TYPE_LABELS_SHORT has entry for every QuestionType', () => {
    for (const qt of ALL_QUESTION_TYPES) {
      expect(QUESTION_TYPE_LABELS_SHORT[qt]).toBeDefined();
    }
  });

  it('DIFFICULTY_LABELS has entry for every Difficulty', () => {
    for (const d of ALL_DIFFICULTIES) {
      expect(DIFFICULTY_LABELS[d]).toBeDefined();
    }
  });

  it('DIFFICULTY_COLORS has entry for every Difficulty', () => {
    for (const d of ALL_DIFFICULTIES) {
      expect(DIFFICULTY_COLORS[d]).toBeDefined();
      expect(DIFFICULTY_COLORS[d]).toMatch(/bg-/);
      expect(DIFFICULTY_COLORS[d]).toMatch(/text-/);
    }
  });
});
