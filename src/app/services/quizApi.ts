// ============================================================
// Axon — Quiz API Service (unified)
//
// Endpoints (flat routes with query params):
//   /quiz-questions — CRUD via factory (summary_id parentKey)
//   /quizzes        — CRUD via factory (summary_id parentKey)
//   /quiz-attempts  — Custom POST/GET (routes/study/reviews.ts)
//   /reviews        — Custom POST/GET (routes/study/reviews.ts)
//
// Study Sessions: kept INLINE here for backward compatibility.
//   DO NOT extract to studySessionApi.ts — that file belongs to the
//   flashcard domain and contains FSRS/Reviews/BatchReview.
//
// BKT States: extracted to bktApi.ts (P2-S01), re-exported here.
//
// Uses apiCall() from lib/api.ts (handles Authorization + X-Access-Token)
// ============================================================

import { apiCall } from '@/app/lib/api';
import { DIFFICULTY_TO_INT } from '@/app/services/quizConstants';
import type { QuestionType, Difficulty } from '@/app/services/quizConstants';

// ── Re-exports: BKT States (from bktApi.ts, P2-S01) ────────
export type { BktStatePayload, BktState } from '@/app/services/bktApi';
export { upsertBktState, getBktStates } from '@/app/services/bktApi';

// ── Study Sessions (inline — shared with flashcard consumers) ──

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

export async function createStudySession(data: {
  session_type: string;
  course_id?: string;
}): Promise<StudySession> {
  return apiCall<StudySession>('/study-sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

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
  const result = await apiCall<{ items: StudySession[]; total: number } | StudySession[]>(`/study-sessions${qs}`);
  return Array.isArray(result) ? result : result?.items || [];
}

// ── Types ─────────────────────────────────────────────────

// Re-export from quizConstants for backwards compatibility
export type { QuestionType, Difficulty } from '@/app/services/quizConstants';
export type QuestionSource = 'manual' | 'ai';

// ── Quiz Entity (matches backend /quizzes) ────────────────
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
  subtopic_id?: string | null;
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
  keyword_id: string;
  subtopic_id?: string;
  quiz_id?: string;
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
  subtopic_id?: string;
  quiz_id?: string;
}

// ── API Functions ─────────────────────────────────────────

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
    const diffInt = typeof filters.difficulty === 'number'
      ? filters.difficulty
      : DIFFICULTY_TO_INT[filters.difficulty as Difficulty];
    if (diffInt) params.set('difficulty', String(diffInt));
  }
  if (filters?.quiz_id) params.set('quiz_id', filters.quiz_id);
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));
  return apiCall<QuizQuestionListResponse>(`/quiz-questions?${params}`);
}

export async function getQuizQuestion(id: string): Promise<QuizQuestion> {
  return apiCall<QuizQuestion>(`/quiz-questions/${id}`);
}

export async function createQuizQuestion(data: CreateQuizQuestionPayload): Promise<QuizQuestion> {
  return apiCall<QuizQuestion>('/quiz-questions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateQuizQuestion(id: string, data: UpdateQuizQuestionPayload): Promise<QuizQuestion> {
  return apiCall<QuizQuestion>(`/quiz-questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteQuizQuestion(id: string): Promise<void> {
  await apiCall(`/quiz-questions/${id}`, { method: 'DELETE' });
}

export async function restoreQuizQuestion(id: string): Promise<QuizQuestion> {
  return apiCall<QuizQuestion>(`/quiz-questions/${id}/restore`, {
    method: 'PUT',
  });
}

// ── Quizzes (entity CRUD) ─────────────────────────────────

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

export async function createQuiz(data: CreateQuizPayload): Promise<QuizEntity> {
  return apiCall<QuizEntity>('/quizzes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateQuiz(id: string, data: UpdateQuizPayload): Promise<QuizEntity> {
  return apiCall<QuizEntity>(`/quizzes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteQuiz(id: string): Promise<void> {
  await apiCall(`/quizzes/${id}`, { method: 'DELETE' });
}

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

export async function createReview(data: ReviewPayload): Promise<Review> {
  return apiCall<Review>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Smart (Adaptive) Quiz Generation ──────────────────────

export interface SmartGenerateParams {
  action: 'quiz_question' | 'flashcard';
  institution_id?: string;
  summary_id?: string;
  count?: number;
  quiz_id?: string;
  auto_create_quiz?: boolean;
  quiz_title?: string;
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

export async function generateSmartQuiz(params: SmartGenerateParams): Promise<SmartGenerateResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    return await apiCall<SmartGenerateResponse>('/ai/generate-smart', {
      method: 'POST',
      body: JSON.stringify(params),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Timeout: la generacion adaptativa tardo mas de 2 minutos. Intenta con menos preguntas.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
