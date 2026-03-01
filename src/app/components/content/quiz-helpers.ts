// ============================================================
// Axon — Quiz Helpers & Constants (shared across quiz sub-components)
// ============================================================

import React from 'react';
import {
  ListChecks, ToggleLeft, Pencil, MessageSquare,
} from 'lucide-react';
import type { QuizQuestion, QuestionType, Difficulty } from '@/app/services/quizApi';

// ── Answer checking ──────────────────────────────────────

export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function checkAnswer(q: QuizQuestion, userAnswer: string): boolean {
  if (q.question_type === 'mcq') {
    return userAnswer === q.correct_answer;
  }
  if (q.question_type === 'true_false') {
    return normalizeText(userAnswer) === normalizeText(q.correct_answer);
  }
  // open / fill_blank: flexible match
  const norm = normalizeText(userAnswer);
  const expected = normalizeText(q.correct_answer);
  if (!norm) return false;
  return norm === expected || norm.includes(expected) || expected.includes(norm);
}

// ── Question type display ────────────────────────────────

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Opcion multiple',
  true_false: 'Verdadero / Falso',
  fill_blank: 'Completar',
  open: 'Respuesta abierta',
};

export const QUESTION_TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  mcq: React.createElement(ListChecks, { size: 10 }),
  true_false: React.createElement(ToggleLeft, { size: 10 }),
  fill_blank: React.createElement(Pencil, { size: 10 }),
  open: React.createElement(MessageSquare, { size: 10 }),
};

export const QUESTION_TYPE_COLORS: Record<QuestionType, string> = {
  mcq: 'text-teal-700 bg-teal-50 border-teal-200',
  true_false: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  fill_blank: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  open: 'text-amber-700 bg-amber-50 border-amber-200',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Facil',
  medium: 'Medio',
  hard: 'Dificil',
};

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// ── Per-question answer state ────────────────────────────

export interface SavedAnswer {
  selectedOption: string | null; // MC: the option text
  textInput: string;             // open / true_false
  correct: boolean;
  answered: boolean;
  timeTakenMs: number;
}

export function emptyAnswer(): SavedAnswer {
  return { selectedOption: null, textInput: '', correct: false, answered: false, timeTakenMs: 0 };
}

// ── Placeholder progress (decorative, not connected to BKT) ──

export const PLACEHOLDER_PROGRESS: Record<number, number> = {
  0: 75, 1: 60, 2: 45, 3: 30, 4: 10, 5: 0,
};
