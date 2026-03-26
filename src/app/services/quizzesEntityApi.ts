// ============================================================
// Axon — Quizzes Entity API (R1 domain extraction)
//
// CRUD for /quizzes endpoint.
// Backend: registerCrud({ table: "quizzes", slug: "quizzes",
//          parentKey: "summary_id" })
//
// Extracted from quizApi.ts — all consumers continue to import
// from quizApi.ts barrel (backwards compatible).
//
// Q-UX2: Added time_limit_seconds for per-question timer support.
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────

export interface QuizEntity {
  id: string;
  summary_id: string;
  title: string;
  description: string | null;
  source: 'manual' | 'ai';
  is_active: boolean;
  /** Q-UX2: Per-question time limit in seconds (null/0 = no limit) */
  time_limit_seconds?: number | null;
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

// Backend CRUD factory fields:
// requiredFields: ["title", "source"]
// createFields: ["title", "description", "source"]
// updateFields: ["title", "description", "is_active"]
// Q-UX2 NOTE: Backend needs to add "time_limit_seconds" to createFields + updateFields
// + ALTER TABLE quizzes ADD COLUMN time_limit_seconds INTEGER;

export interface CreateQuizPayload {
  summary_id: string;
  title: string;
  description?: string | null;
  source: 'manual' | 'ai';
  /** Q-UX2: Per-question time limit in seconds (null/0 = no limit) */
  time_limit_seconds?: number | null;
}

export interface UpdateQuizPayload {
  title?: string;
  description?: string | null;
  is_active?: boolean;
  /** Q-UX2: Per-question time limit in seconds (null/0 = no limit) */
  time_limit_seconds?: number | null;
}

// ── API Functions ─────────────────────────────────────

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
