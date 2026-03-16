// ============================================================
// Quiz Content Helpers Guards — Axon v4.4
//
// PURPOSE: Verify answer checking, text normalization, and
// display constant completeness from quiz-helpers.ts.
//
// GUARDS AGAINST:
//   - Answer checking regressions (MCQ, T/F, open, fill_blank)
//   - Unicode/accent normalization bugs (Spanish medical terms)
//   - Display map incompleteness (missing label/color for a type)
//   - emptyAnswer() factory producing wrong defaults
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect } from 'vitest';

// Mock lucide-react to avoid JSX dependency in pure-function tests
import { vi } from 'vitest';
vi.mock('lucide-react', () => ({
  ListChecks: 'ListChecks',
  ToggleLeft: 'ToggleLeft',
  Pencil: 'Pencil',
  MessageSquare: 'MessageSquare',
}));

import {
  normalizeText,
  checkAnswer,
  emptyAnswer,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_ICONS,
  QUESTION_TYPE_COLORS,
  DIFFICULTY_LABELS,
  LETTERS,
} from '@/app/components/content/quiz-helpers';
import type { QuestionType, Difficulty } from '@/app/services/quizApi';
import type { QuizQuestion } from '@/app/services/quizApi';

// ── Helper: build a minimal QuizQuestion for testing ─────
function makeQuestion(overrides: Partial<QuizQuestion>): QuizQuestion {
  return {
    id: 'q-test-001',
    quiz_id: 'quiz-001',
    summary_id: 'sum-001',
    keyword_id: 'kw-001',
    question_type: 'mcq',
    question_text: 'Test question?',
    correct_answer: 'Option A',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    difficulty: 2,
    priority: 2,
    explanation: null,
    is_active: true,
    source: 'manual',
    created_by: 'prof-001',
    created_at: '2026-03-16T00:00:00Z',
    ...overrides,
  } as QuizQuestion;
}

// ══════════════════════════════════════════════════════════════
// SUITE 1: normalizeText — Unicode & accent handling
// ══════════════════════════════════════════════════════════════

describe('normalizeText', () => {
  it('lowercases input', () => {
    expect(normalizeText('HELLO')).toBe('hello');
  });

  it('strips diacritical marks (NFD decomposition)', () => {
    expect(normalizeText('músculos glúteos')).toBe('musculos gluteos');
  });

  it('trims whitespace', () => {
    expect(normalizeText('  spaced  ')).toBe('spaced');
  });

  it('handles combined: uppercase + accents + whitespace', () => {
    expect(normalizeText('  Ángulo de Tréitz  ')).toBe('angulo de treitz');
  });

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: checkAnswer — all question types
// ══════════════════════════════════════════════════════════════

describe('checkAnswer', () => {
  // ── MCQ: exact match ────────────────────────────────────
  it('MCQ: correct when userAnswer === correct_answer', () => {
    const q = makeQuestion({ question_type: 'mcq', correct_answer: 'Option B' });
    expect(checkAnswer(q, 'Option B')).toBe(true);
  });

  it('MCQ: incorrect when userAnswer !== correct_answer', () => {
    const q = makeQuestion({ question_type: 'mcq', correct_answer: 'Option B' });
    expect(checkAnswer(q, 'Option A')).toBe(false);
  });

  // ── True/False: normalized match ───────────────────────
  it('true_false: correct with case-insensitive match', () => {
    const q = makeQuestion({ question_type: 'true_false', correct_answer: 'Verdadero' });
    expect(checkAnswer(q, 'verdadero')).toBe(true);
  });

  it('true_false: incorrect answer', () => {
    const q = makeQuestion({ question_type: 'true_false', correct_answer: 'Verdadero' });
    expect(checkAnswer(q, 'Falso')).toBe(false);
  });

  // ── Open: flexible match (includes/contained) ──────────
  it('open: exact match works', () => {
    const q = makeQuestion({ question_type: 'open', correct_answer: 'mitocondria' });
    expect(checkAnswer(q, 'mitocondria')).toBe(true);
  });

  it('open: partial match (user includes expected)', () => {
    const q = makeQuestion({ question_type: 'open', correct_answer: 'mitocondria' });
    expect(checkAnswer(q, 'la mitocondria es la powerhouse')).toBe(true);
  });

  it('open: partial match (expected includes user)', () => {
    const q = makeQuestion({ question_type: 'open', correct_answer: 'la mitocondria' });
    expect(checkAnswer(q, 'mitocondria')).toBe(true);
  });

  it('open: empty answer is always wrong', () => {
    const q = makeQuestion({ question_type: 'open', correct_answer: 'mitocondria' });
    expect(checkAnswer(q, '')).toBe(false);
    expect(checkAnswer(q, '   ')).toBe(false);
  });

  // ── Fill blank: same flexible logic as open ────────────
  it('fill_blank: accent-insensitive match', () => {
    const q = makeQuestion({ question_type: 'fill_blank', correct_answer: 'hígado' });
    expect(checkAnswer(q, 'higado')).toBe(true);
  });

  it('fill_blank: case-insensitive match', () => {
    const q = makeQuestion({ question_type: 'fill_blank', correct_answer: 'ATP' });
    expect(checkAnswer(q, 'atp')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: emptyAnswer factory
// ══════════════════════════════════════════════════════════════

describe('emptyAnswer', () => {
  it('returns correct default shape', () => {
    const ans = emptyAnswer();
    expect(ans).toEqual({
      selectedOption: null,
      textInput: '',
      correct: false,
      answered: false,
      timeTakenMs: 0,
    });
  });

  it('returns a new object each call (no shared reference)', () => {
    const a = emptyAnswer();
    const b = emptyAnswer();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: Display maps completeness
// ══════════════════════════════════════════════════════════════

describe('Display map completeness', () => {
  const ALL_TYPES: QuestionType[] = ['mcq', 'true_false', 'fill_blank', 'open'];
  const ALL_DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];

  it('QUESTION_TYPE_LABELS covers all 4 types', () => {
    for (const qt of ALL_TYPES) {
      expect(QUESTION_TYPE_LABELS[qt]).toBeDefined();
      expect(typeof QUESTION_TYPE_LABELS[qt]).toBe('string');
      expect(QUESTION_TYPE_LABELS[qt].length).toBeGreaterThan(0);
    }
  });

  it('QUESTION_TYPE_ICONS covers all 4 types', () => {
    for (const qt of ALL_TYPES) {
      expect(QUESTION_TYPE_ICONS[qt]).toBeDefined();
    }
  });

  it('QUESTION_TYPE_COLORS covers all 4 types with Tailwind classes', () => {
    for (const qt of ALL_TYPES) {
      expect(QUESTION_TYPE_COLORS[qt]).toBeDefined();
      expect(QUESTION_TYPE_COLORS[qt]).toMatch(/text-/);
      expect(QUESTION_TYPE_COLORS[qt]).toMatch(/bg-/);
    }
  });

  it('DIFFICULTY_LABELS covers all 3 difficulties', () => {
    for (const d of ALL_DIFFS) {
      expect(DIFFICULTY_LABELS[d]).toBeDefined();
      expect(typeof DIFFICULTY_LABELS[d]).toBe('string');
    }
  });

  it('LETTERS has at least 4 entries for MCQ options', () => {
    expect(LETTERS.length).toBeGreaterThanOrEqual(4);
    expect(LETTERS[0]).toBe('A');
    expect(LETTERS[1]).toBe('B');
    expect(LETTERS[2]).toBe('C');
    expect(LETTERS[3]).toBe('D');
  });
});
