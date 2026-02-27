// ============================================================
// Axon — Quiz Questions API Service
//
// Endpoints (flat routes with query params):
//   GET    /quiz-questions?summary_id=xxx&keyword_id=xxx(op)&question_type=xxx(op)&difficulty=xxx(op)
//          → { data: { items: [...], total, limit, offset } }
//   GET    /quiz-questions/:id → { data: { ... } }
//   POST   /quiz-questions    → create
//   PUT    /quiz-questions/:id → update
//   DELETE /quiz-questions/:id → soft-delete
//   PUT    /quiz-questions/:id/restore → restore
//
// Uses apiCall() from lib/api.ts (handles Authorization + X-Access-Token)
//
// FIX RT-001 (2025-02-27):
//   - student_id (not user_id)
//   - completed_at (not ended_at)
//   - removed duration_seconds (column doesn't exist)
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'open';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionSource = 'manual' | 'ai';

export interface QuizQuestion {
  id: string;
  summary_id: string;
  keyword_id: string;
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
  name: string;
  summary_id: string;
  keyword_id: string;
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
    difficulty?: Difficulty;
    limit?: number;
    offset?: number;
  }
): Promise<QuizQuestionListResponse> {
  const params = new URLSearchParams();
  params.set('summary_id', summaryId);
  if (filters?.keyword_id) params.set('keyword_id', filters.keyword_id);
  if (filters?.question_type) params.set('question_type', filters.question_type);
  if (filters?.difficulty) params.set('difficulty', filters.difficulty);
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

// ── Study Sessions ────────────────────────────────────────

export interface StudySession {
  id: string;
  student_id?: string;
  session_type: string;
  course_id?: string;
  started_at: string;
  completed_at?: string | null;
  total_reviews?: number | null;
  correct_reviews?: number | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Create a new study session (e.g. session_type: "quiz").
 */
export async function createStudySession(data: {
  session_type: string;
  course_id?: string;
}): Promise<StudySession> {
  return apiCall<StudySession>('/study-sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Close a study session with final stats.
 */
export async function closeStudySession(id: string, data: {
  completed_at: string;
  total_reviews: number;
  correct_reviews: number;
}): Promise<StudySession> {
  return apiCall<StudySession>(`/study-sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get study sessions (e.g. for history).
 * Returns array plano: { data: [...] }
 */
export async function getStudySessions(filters?: {
  session_type?: string;
  course_id?: string;
  limit?: number;
}): Promise<StudySession[]> {
  const params = new URLSearchParams();
  if (filters?.session_type) params.set('session_type', filters.session_type);
  if (filters?.course_id) params.set('course_id', filters.course_id);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString() ? `?${params}` : '';
  return apiCall<StudySession[]>(`/study-sessions${qs}`);
}

// ── Quiz Attempts ─────────────────────────────────────────

export interface QuizAttempt {
  id: string;
  quiz_question_id: string;
  user_id?: string;
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
