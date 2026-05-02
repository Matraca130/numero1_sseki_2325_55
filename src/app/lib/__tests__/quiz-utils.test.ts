// ============================================================
// Tests for quiz-utils.ts — Quiz answer-checking helpers
//
// Pure functions. No mocks needed.
// ============================================================
import { describe, it, expect } from 'vitest';
import { LETTERS, normalizeText, checkAnswer } from '@/app/lib/quiz-utils';
import type { QuizQuestion } from '@/app/services/quizApi';

function makeQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: 'q1',
    summary_id: 's1',
    keyword_id: null,
    question_type: 'mcq',
    question: 'What?',
    options: ['A', 'B', 'C', 'D'],
    correct_answer: 'A',
    explanation: null,
    difficulty: 1,
    source: 'manual',
    is_active: true,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as QuizQuestion;
}

describe('LETTERS', () => {
  it('contains 8 letters A through H in order', () => {
    expect(LETTERS).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  });
});

describe('normalizeText', () => {
  it('lowercases input', () => {
    expect(normalizeText('HELLO')).toBe('hello');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeText('  hi  ')).toBe('hi');
  });

  it('strips diacritical marks', () => {
    expect(normalizeText('árbol')).toBe('arbol');
    expect(normalizeText('Ñandú')).toBe('nandu');
    expect(normalizeText('café')).toBe('cafe');
  });

  it('preserves spaces between words', () => {
    expect(normalizeText('Hola Mundo')).toBe('hola mundo');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeText('   ')).toBe('');
  });
});

describe('checkAnswer', () => {
  describe('mcq', () => {
    it('returns true on exact option-key match', () => {
      const q = makeQuestion({ question_type: 'mcq', correct_answer: 'B' });
      expect(checkAnswer(q, 'B')).toBe(true);
    });

    it('returns false on different option', () => {
      const q = makeQuestion({ question_type: 'mcq', correct_answer: 'B' });
      expect(checkAnswer(q, 'A')).toBe(false);
    });

    it('is case-sensitive (does not normalize)', () => {
      const q = makeQuestion({ question_type: 'mcq', correct_answer: 'B' });
      expect(checkAnswer(q, 'b')).toBe(false);
    });
  });

  describe('true_false', () => {
    it('matches case-insensitively', () => {
      const q = makeQuestion({ question_type: 'true_false', correct_answer: 'true' });
      expect(checkAnswer(q, 'TRUE')).toBe(true);
    });

    it('matches with accent differences ignored', () => {
      const q = makeQuestion({ question_type: 'true_false', correct_answer: 'verdadero' });
      expect(checkAnswer(q, 'Verdádero')).toBe(true);
    });

    it('returns false for wrong value', () => {
      const q = makeQuestion({ question_type: 'true_false', correct_answer: 'true' });
      expect(checkAnswer(q, 'false')).toBe(false);
    });
  });

  describe('open / fill_blank', () => {
    it('returns true on exact normalized match', () => {
      const q = makeQuestion({ question_type: 'open', correct_answer: 'mitosis' });
      expect(checkAnswer(q, 'Mitosis')).toBe(true);
    });

    it('returns true when user answer contains expected', () => {
      const q = makeQuestion({ question_type: 'open', correct_answer: 'mitosis' });
      expect(checkAnswer(q, 'la mitosis ocurre')).toBe(true);
    });

    it('returns true when expected contains user answer', () => {
      const q = makeQuestion({ question_type: 'open', correct_answer: 'la mitosis celular' });
      expect(checkAnswer(q, 'mitosis')).toBe(true);
    });

    it('strips accents before comparing', () => {
      const q = makeQuestion({ question_type: 'open', correct_answer: 'célula' });
      expect(checkAnswer(q, 'celula')).toBe(true);
    });

    it('returns false for empty user answer', () => {
      const q = makeQuestion({ question_type: 'open', correct_answer: 'mitosis' });
      expect(checkAnswer(q, '')).toBe(false);
      expect(checkAnswer(q, '   ')).toBe(false);
    });

    it('returns false on unrelated answer', () => {
      const q = makeQuestion({ question_type: 'open', correct_answer: 'mitosis' });
      expect(checkAnswer(q, 'meiosis')).toBe(false);
    });

    it('handles fill_blank the same way as open', () => {
      const q = makeQuestion({ question_type: 'fill_blank', correct_answer: 'enzima' });
      expect(checkAnswer(q, 'Enzima')).toBe(true);
      expect(checkAnswer(q, 'la enzima')).toBe(true);
      expect(checkAnswer(q, 'protein')).toBe(false);
    });
  });
});
