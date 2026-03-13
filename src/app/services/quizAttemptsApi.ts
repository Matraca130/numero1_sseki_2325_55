// ============================================================
// Axon — Quiz Attempts API (R1 domain extraction)
//
// POST/GET for /quiz-attempts endpoint.
// is_correct is computed FRONTEND-side.
//
// Extracted from quizApi.ts — all consumers continue to import
// from quizApi.ts barrel (backwards compatible).
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export interface QuizAttempt {
  id: string;
  quiz_question_id: string;
  student_id?: string;
  answer: string;
  is_correct: boolean;
  session_id?: string | null;
  time_taken_ms?: number | null;
  created_at: string;
}

// ── API Functions ─────────────────────────────────────────

/**
 * Record a quiz attempt.
 * is_correct is computed FRONTEND-side by comparing answer vs correct_answer.
 */
export async function createQuizAttempt(data: {
  quiz_question_id: string;
  answer: string;
  is_correct: boolean;
  session_id?: string;
  time_taken_ms?: number;
}): Promise<QuizAttempt> {
  return apiCall<QuizAttempt>('/quiz-attempts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get quiz attempts (array plano).
 */
export async function getQuizAttempts(filters: {
  session_id?: string;
  quiz_question_id?: string;
}): Promise<QuizAttempt[]> {
  const params = new URLSearchParams();
  if (filters.session_id) params.set('session_id', filters.session_id);
  if (filters.quiz_question_id) params.set('quiz_question_id', filters.quiz_question_id);
  return apiCall<QuizAttempt[]>(`/quiz-attempts?${params}`);
}
