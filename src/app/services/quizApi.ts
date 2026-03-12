// ============================================================
// Axon — Quiz API Service (unified)
//
// Endpoints (flat routes with query params):
//   /quiz-questions — CRUD via factory (summary_id parentKey)
//   /quizzes        — CRUD via factory (summary_id parentKey)
//   /quiz-attempts  — Custom POST/GET (routes/study/reviews.ts)
//   /reviews        — Custom POST/GET (routes/study/reviews.ts)
//
// Study Sessions & BKT States extracted to separate files (P2-S01):
//   /study-sessions → studySessionApi.ts
//   /bkt-states     → bktApi.ts
// Re-exported here for backwards compatibility.
//
// Uses apiCall() from lib/api.ts (handles Authorization + X-Access-Token)
// ============================================================

import { apiCall } from '@/app/lib/api';
import { DIFFICULTY_TO_INT } from '@/app/services/quizConstants';
import type { QuestionType, Difficulty } from '@/app/services/quizConstants';

// ── Re-exports for backwards compatibility (P2-S01) ──────
// StudySessionRecord is the canonical type in studySessionApi.ts;
// we alias it as StudySession for quiz-domain consumers.
export type { StudySessionRecord as StudySession } from '@/app/services/studySessionApi';
export { createStudySession, closeStudySession, getStudySessions } from '@/app/services/studySessionApi';
export type { BktStatePayload, BktState } from '@/app/services/bktApi';
export { upsertBktState, getBktStates } from '@/app/services/bktApi';

// ── Types ─────────────────────────────────────────────────

// Re-export from quizConstants for backwards compatibility
export type { QuestionType, Difficulty } from '@/app/services/quizConstants';
export type QuestionSource = 'manual' | 'ai';

// ── Quiz Entity (matches backend /quizzes) ────────────
export interface QuizEntity {
  id: string;
  summary_id: string;
  title: string;
  description: string | null;
  source: 'manual' | 'ai';
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

/** Convenience alias used by QuizQuestionsEditor and other consumers */
export type Quiz = QuizEntity;

export interface QuizEntityListResponse {
  items: QuizEntity[];
  total: number;
  limit: number;
  offset: number;
}

export interface QuizQuestion {
  id: string;
  summary_id: string;
  keyword_id: string;
  subtopic_id?: string | null;  // null when DB column is NULL, undefined when field absent
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
  // FIX BA-01: removed 'name' — quiz_questions table has NO 'name' column
  summary_id: string;
  keyword_id: string;
  subtopic_id?: string;  // optional — omit if no subtopic selected
  quiz_id?: string;      // FIX BA-04: backend accepts quiz_id in createFields
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

// ── Quizzes (entity CRUD) ───────────────────────────────
// Backend: routes-student.tsx registerCrud({ table: "quizzes", slug: "quizzes", parentKey: "summary_id" })
// requiredFields: ["title", "source"]
// createFields: ["title", "description", "source"]
// updateFields: ["title", "description", "is_active"]

export interface CreateQuizPayload {
  summary_id: string;
  title: string;
  description?: string | null;
  source: 'manual' | 'ai';
}

export interface UpdateQuizPayload {
  title?: string;
  description?: string | null;
  is_active?: boolean;
}

/**
 * List quizzes for a summary.
 * CRUD factory returns { items, total, limit, offset }.
 */
export async function getQuizzes(
  summaryId: string,
  filters?: { source?: string; is_active?: boolean; limit?: number; offset?: number }
): Promise<QuizEntityListResponse> {
  const params = new URLSearchParams();
  params.set('summary_id', summaryId);
  if (filters?.source) params.set('source', filters.source);
  if (filters?.is_active != null) params.set('is_active', String(filters.is_active));
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));
  return apiCall<QuizEntityListResponse>(`/quizzes?${params}`);
}

/**
 * Create a new quiz entity.
 */
export async function createQuiz(data: CreateQuizPayload): Promise<QuizEntity> {
  return apiCall<QuizEntity>('/quizzes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a quiz entity.
 */
export async function updateQuiz(id: string, data: UpdateQuizPayload): Promise<QuizEntity> {
  return apiCall<QuizEntity>(`/quizzes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Soft-delete a quiz entity.
 */
export async function deleteQuiz(id: string): Promise<void> {
  await apiCall(`/quizzes/${id}`, { method: 'DELETE' });
}

/**
 * Restore a soft-deleted quiz entity.
 */
export async function restoreQuiz(id: string): Promise<QuizEntity> {
  return apiCall<QuizEntity>(`/quizzes/${id}/restore`, {
    method: 'PUT',
  });
}

// ── Quiz Attempts ─────────────────────────────────────────

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

// ── Reviews ─────────────────────────────────────────────
// Backend: routes/study/reviews.ts (custom, NOT CRUD factory)
// Required: session_id (UUID), item_id (UUID), instrument_type (string), grade (0-5)
// Optional: response_time_ms (non-negative int)

export interface ReviewPayload {
  session_id: string;
  item_id: string;
  instrument_type: string;
  grade: number;
  response_time_ms?: number;
}

export interface Review {
  id: string;
  session_id: string;
  item_id: string;
  instrument_type: string;
  grade: number;
  response_time_ms?: number | null;
  created_at: string;
}

/**
 * Create a review record for a study session item.
 * Backend verifies session ownership (O-3 FIX).
 */
export async function createReview(data: ReviewPayload): Promise<Review> {
  return apiCall<Review>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Smart (Adaptive) Quiz Generation ────────────────────
// Backend: routes/ai/generate-smart.ts (Fase 8A + 8E)
// Uses RPC get_smart_generate_target() → picks weakest subtopics by BKT
// Then generates AI quiz questions scoped to those subtopics

export interface SmartGenerateParams {
  action: 'quiz_question' | 'flashcard';
  institution_id?: string;
  summary_id?: string;
  count?: number;    // 1-10, default 1
  quiz_id?: string;  // auto-link generated questions to quiz entity
  auto_create_quiz?: boolean;  // Fase 8G: server-side quiz creation
  quiz_title?: string;         // Fase 8G: title for auto-created quiz
}

export interface SmartGenerateItem {
  type: string;
  id: string;
  keyword_id: string;
  keyword_name: string;
  summary_id: string;
  _smart: {
    p_know: number;
    need_score: number;
    primary_reason: string;
    target_subtopic: string | null;
  };
}

export interface SmartGenerateError {
  keyword_id: string;
  keyword_name: string;
  error: string;
}

export interface SmartGenerateResponse {
  items: SmartGenerateItem[];
  errors: SmartGenerateError[];
  _meta: {
    model: string;
    action: string;
    summary_id?: string;
    quiz_id?: string;
    total_attempted: number;
    total_generated: number;
    total_failed: number;
    total_targets_available: number;
  };
}

/**
 * Generate adaptive quiz questions using AI.
 * Backend auto-selects weakest subtopics via BKT analysis.
 *
 * Flow:
 *   1. Create a quiz entity via createQuiz()
 *   2. Call generateSmartQuiz() with the quiz_id + count
 *   3. Backend generates questions and auto-links them to the quiz
 *   4. Navigate to QuizTaker with the quiz_id
 *
 * Timeout is 120s (bulk AI generation can be slow).
 */
export async function generateSmartQuiz(params: SmartGenerateParams): Promise<SmartGenerateResponse> {
  // FIX: apiCall does NOT support timeoutMs — implement AbortController timeout
  // for bulk AI generation which can take 60-120s
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2 min

  try {
    return await apiCall<SmartGenerateResponse>('/ai/generate-smart', {
      method: 'POST',
      body: JSON.stringify(params),
      signal: controller.signal,
    });
  } catch (err) {
    // Convert AbortError to a more descriptive timeout message
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Timeout: la generacion adaptativa tardo mas de 2 minutos. Intenta con menos preguntas.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}