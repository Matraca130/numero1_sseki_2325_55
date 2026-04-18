// ============================================================
// quiz-utils.test.ts — Pure-logic tests for quiz utilities.
//
// Covers:
//   - LETTERS constant (A–H)
//   - normalizeText: lowercase, NFD accent strip, trim
//   - checkAnswer: MCQ exact match, true/false normalized, open
//     / fill_blank flexible substring match
//
// These are deterministic, no mocks.
// ============================================================

import { describe, it, expect } from 'vitest';

import { LETTERS, normalizeText, checkAnswer } from '@/app/lib/quiz-utils';
import type { QuizQuestion } from '@/app/services/quizApi';

// ── Fixture builders ─────────────────────────────────────

/** Build a minimal QuizQuestion fixture for checkAnswer tests. */
function makeQuestion(overrides: Partial<QuizQuestion> & { question_type: QuizQuestion['question_type']; correct_answer: string }): QuizQuestion {
  return {
    id: 'qq-test',
    summary_id: 'sum-1',
    keyword_id: 'kw-1',
    block_id: null,
    subtopic_id: null,
    question: 'Sample?',
    options: null,
    explanation: null,
    difficulty: 1,
    source: 'manual',
    is_active: true,
    created_at: '2026-04-18T00:00:00.000Z',
    updated_at: '2026-04-18T00:00:00.000Z',
    ...overrides,
  } as QuizQuestion;
}

// ══════════════════════════════════════════════════════════════
// LETTERS
// ══════════════════════════════════════════════════════════════

describe('LETTERS', () => {
  it('contains A through H in order', () => {
    expect(LETTERS).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  });

  it('has length 8', () => {
    expect(LETTERS.length).toBe(8);
  });

  it('is a readonly tuple (cannot be mutated via mutating method types)', () => {
    // Compile-time check via `as const`; at runtime the array is still
    // a normal array, but we can ensure the values are strings.
    LETTERS.forEach((letter) => {
      expect(typeof letter).toBe('string');
      expect(letter.length).toBe(1);
    });
  });
});

// ══════════════════════════════════════════════════════════════
// normalizeText
// ══════════════════════════════════════════════════════════════

describe('normalizeText', () => {
  it('lowercases ASCII input', () => {
    expect(normalizeText('HELLO')).toBe('hello');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('strips Spanish acute accents (NFD decomposition)', () => {
    expect(normalizeText('árbol')).toBe('arbol');
    expect(normalizeText('Árbol')).toBe('arbol');
    expect(normalizeText('José')).toBe('jose');
  });

  it('strips Spanish tilde (ñ → n)', () => {
    expect(normalizeText('mañana')).toBe('manana');
  });

  it('strips diaeresis (ü → u)', () => {
    expect(normalizeText('pingüino')).toBe('pinguino');
  });

  it('preserves internal spaces', () => {
    expect(normalizeText('Hola Mundo')).toBe('hola mundo');
  });

  it('returns empty string when input is whitespace only', () => {
    expect(normalizeText('   ')).toBe('');
  });

  it('returns empty string when input is empty', () => {
    expect(normalizeText('')).toBe('');
  });

  it('preserves numbers and punctuation', () => {
    expect(normalizeText('42!')).toBe('42!');
    expect(normalizeText('Hello, World.')).toBe('hello, world.');
  });

  it('is idempotent (f(f(x)) === f(x))', () => {
    const samples = ['Hola', '  árbol  ', 'MAÑANA', 'José María'];
    for (const s of samples) {
      expect(normalizeText(normalizeText(s))).toBe(normalizeText(s));
    }
  });
});

// ══════════════════════════════════════════════════════════════
// checkAnswer — MCQ
// ══════════════════════════════════════════════════════════════

describe('checkAnswer — MCQ', () => {
  const q = makeQuestion({ question_type: 'mcq', correct_answer: 'B' });

  it('returns true when answer exactly matches correct option key', () => {
    expect(checkAnswer(q, 'B')).toBe(true);
  });

  it('returns false when answer does not match correct option key', () => {
    expect(checkAnswer(q, 'A')).toBe(false);
    expect(checkAnswer(q, 'C')).toBe(false);
  });

  it('is case-sensitive for MCQ (exact match on option key)', () => {
    expect(checkAnswer(q, 'b')).toBe(false);
  });

  it('returns false for whitespace-padded option (no normalization for MCQ)', () => {
    expect(checkAnswer(q, ' B ')).toBe(false);
  });

  it('returns false when answer is empty', () => {
    expect(checkAnswer(q, '')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// checkAnswer — True/False
// ══════════════════════════════════════════════════════════════

describe('checkAnswer — true_false', () => {
  const q = makeQuestion({ question_type: 'true_false', correct_answer: 'True' });

  it('returns true on exact match', () => {
    expect(checkAnswer(q, 'True')).toBe(true);
  });

  it('returns true on case-insensitive match', () => {
    expect(checkAnswer(q, 'true')).toBe(true);
    expect(checkAnswer(q, 'TRUE')).toBe(true);
  });

  it('returns true ignoring leading/trailing whitespace', () => {
    expect(checkAnswer(q, '  true  ')).toBe(true);
  });

  it('returns false for the other value', () => {
    expect(checkAnswer(q, 'false')).toBe(false);
  });

  it('handles Spanish "Verdadero" correct_answer with accent-insensitive compare', () => {
    const qEs = makeQuestion({ question_type: 'true_false', correct_answer: 'Verdadero' });
    expect(checkAnswer(qEs, 'verdadero')).toBe(true);
    expect(checkAnswer(qEs, 'VERDADERO')).toBe(true);
    expect(checkAnswer(qEs, 'Falso')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// checkAnswer — fill_blank / open (flexible match)
// ══════════════════════════════════════════════════════════════

describe('checkAnswer — fill_blank', () => {
  const q = makeQuestion({ question_type: 'fill_blank', correct_answer: 'mitocondria' });

  it('returns true on exact normalized match', () => {
    expect(checkAnswer(q, 'mitocondria')).toBe(true);
  });

  it('returns true on case-insensitive match', () => {
    expect(checkAnswer(q, 'Mitocondria')).toBe(true);
  });

  it('returns true on accent-insensitive match', () => {
    const qAcc = makeQuestion({ question_type: 'fill_blank', correct_answer: 'árbol' });
    expect(checkAnswer(qAcc, 'arbol')).toBe(true);
  });

  it('returns true when expected is a substring of the answer', () => {
    // "la mitocondria" contains "mitocondria"
    expect(checkAnswer(q, 'la mitocondria')).toBe(true);
  });

  it('returns true when the answer is a substring of expected', () => {
    const qLong = makeQuestion({
      question_type: 'fill_blank',
      correct_answer: 'la mitocondria de la celula',
    });
    // "mitocondria" is a substring of the expected
    expect(checkAnswer(qLong, 'mitocondria')).toBe(true);
  });

  it('returns false on empty answer', () => {
    expect(checkAnswer(q, '')).toBe(false);
    expect(checkAnswer(q, '   ')).toBe(false);
  });

  it('returns false for unrelated answer', () => {
    expect(checkAnswer(q, 'nucleo')).toBe(false);
  });
});

describe('checkAnswer — open', () => {
  const q = makeQuestion({ question_type: 'open', correct_answer: 'Fotosintesis' });

  it('returns true on exact case-insensitive + accent-insensitive match', () => {
    expect(checkAnswer(q, 'fotosíntesis')).toBe(true);
  });

  it('returns true when the expected short answer is embedded in a longer response', () => {
    expect(checkAnswer(q, 'La fotosintesis es un proceso')).toBe(true);
  });

  it('returns false when neither direction contains the other', () => {
    expect(checkAnswer(q, 'respiracion celular')).toBe(false);
  });

  it('returns false on empty answer', () => {
    expect(checkAnswer(q, '')).toBe(false);
  });
});
