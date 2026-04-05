// ============================================================
// Axon — Quiz Questions API (R1 domain extraction)
//
// CRUD for /quiz-questions endpoint.
// Uses apiCall() from lib/api.ts (handles Authorization + X-Access-Token)
//
// Extracted from quizApi.ts — all consumers continue to import
// from quizApi.ts barrel (backwards compatible).
// ============================================================

import { apiCall } from '@/app/lib/api';
import { DIFFICULTY_TO_INT } from '@/app/services/quizConstants';
import type { QuestionType, Difficulty } from '@/app/services/quizConstants';

// ── Types ─────────────────────────────────────────────────

export type QuestionSource = 'manual' | 'ai';

export interface QuizQuestion {
  id: string;
  summary_id: string;
  keyword_id: string | null;
  block_id?: string | null;      // ADR-001: per-block quiz linkage
  subtopic_id?: string | null;   // null when DB column is NULL, undefined when field absent
  question_type: QuestionType;
  question: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  difficulty: number;
  source: QuestionSource;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestionListResponse {
  items: QuizQuestion[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateQuizQuestionPayload {
  summary_id: string;
  keyword_id?: string;     // optional — per-block questions may not need keyword
  block_id?: string;       // ADR-001: link question to specific block
  subtopic_id?: string;    // optional — omit if no subtopic selected
  quiz_id?: string;        // backend accepts quiz_id in createFields
  question_type: QuestionType;
  question: string;
  correct_answer: string;
  options?: string[];
  explanation?: string;
  difficulty?: number;
  source?: QuestionSource;
}

export interface UpdateQuizQuestionPayload {
  question_type?: QuestionType;
  question?: string;
  options?: string[] | null;
  correct_answer?: string;
  explanation?: string;
  difficulty?: number;
  source?: QuestionSource;
  is_active?: boolean;
  subtopic_id?: string;  // FIX BA-05: backend accepts in updateFields
  quiz_id?: string;      // FIX BA-05: backend accepts in updateFields
}

// ── API Functions ─────────────────────────────────────────

/**
 * List quiz questions for a summary, with optional filters.
 * Backend returns { data: { items, total, limit, offset } }.
 * apiCall() unwraps .data, so we get { items, total, limit, offset }.
 */
export async function getQuizQuestions(
  summaryId: string,
  filters?: {
    keyword_id?: string;
    block_id?: string;           // ADR-001: filter by block
    question_type?: QuestionType;
    difficulty?: Difficulty | number;
    quiz_id?: string;
    limit?: number;
    offset?: number;
  }
): Promise<QuizQuestionListResponse> {
  const params = new URLSearchParams();
  params.set('summary_id', summaryId);
  if (filters?.keyword_id) params.set('keyword_id', filters.keyword_id);
  if (filters?.block_id) params.set('block_id', filters.block_id);
  if (filters?.question_type) params.set('question_type', filters.question_type);
  if (filters?.difficulty != null) {
    // Accept both string ('easy') and integer (1) — always send integer to backend
    const diffInt = typeof filters.difficulty === 'number'
      ? filters.difficulty
      : DIFFICULTY_TO_INT[filters.difficulty as Difficulty];
    if (diffInt != null) params.set('difficulty', String(diffInt));
  }
  if (filters?.quiz_id) params.set('quiz_id', filters.quiz_id);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));
  return apiCall<QuizQuestionListResponse>(`/quiz-questions?${params}`);
}

/**
 * Get a single quiz question by ID.
 */
export async function getQuizQuestion(id: string): Promise<QuizQuestion> {
  return apiCall<QuizQuestion>(`/quiz-questions/${id}`);
}

/**
 * Create a new quiz question.
 */
export async function createQuizQuestion(data: CreateQuizQuestionPayload): Promise<QuizQuestion> {
  return apiCall<QuizQuestion>('/quiz-questions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing quiz question.
 */
export async function updateQuizQuestion(id: string, data: UpdateQuizQuestionPayload): Promise<QuizQuestion> {
  return apiCall<QuizQuestion>(`/quiz-questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Soft-delete a quiz question.
 */
export async function deleteQuizQuestion(id: string): Promise<void> {
  await apiCall(`/quiz-questions/${id}`, { method: 'DELETE' });
}

/**
 * Restore a soft-deleted quiz question.
 */
export async function restoreQuizQuestion(id: string): Promise<QuizQuestion> {
  return apiCall<QuizQuestion>(`/quiz-questions/${id}/restore`, {
    method: 'PUT',
  });
}
