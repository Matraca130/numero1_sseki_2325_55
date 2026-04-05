// ============================================================
// Axon — Study Session API Service (FLAT routes)
//
// Covers: study-sessions, reviews, fsrs-states
// Uses apiCall() from lib/api.ts (handles Auth headers).
//
// FIX RT-001..RT-003 (2025-02-27):
//   - student_id (not user_id)
//   - completed_at (not ended_at)
//   - removed duration_seconds (column doesn't exist)
//   - added 'reading' to session_type
//   - instrument_type: 'flashcard' | 'quiz'
//
// FIX BA-03,BA-05 (2026-03-01):
//   - getStudySessions: handle CRUD factory paginated response
//   - FsrsStateRow: user_id → student_id (matches DB column)
//
// PERF v4.4.3:
//   [M1] Added submitReviewBatch() — single POST for all reviews
//        in a session instead of 3×N individual POSTs.
//   [M1] Added fallbackToIndividualPosts() — graceful degradation.
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export interface StudySessionRecord {
  id: string;
  student_id?: string;  // FIX BA-05: was 'user_id', real DB column is 'student_id'
  session_type: 'flashcard' | 'quiz' | 'reading' | 'mixed';
  course_id?: string | null;
  started_at: string;
  completed_at?: string | null;  // FIX RT-001: was 'ended_at', real DB column is 'completed_at'
  total_reviews?: number;
  correct_reviews?: number;
  created_at?: string;
  updated_at?: string;
  // NOTE: duration_seconds does NOT exist in DB — computed from
  // created_at → completed_at on read if needed.
}

export interface FsrsStateRow {
  id: string;
  student_id?: string;  // FIX BA-05: was 'user_id', real DB column is 'student_id'
  flashcard_id: string;
  stability: number;
  difficulty: number;
  due_at: string;
  last_review_at?: string | null;
  reps: number;
  lapses: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
  created_at?: string;
  updated_at?: string;
}

export interface ReviewRecord {
  id?: string;
  session_id: string;
  item_id: string;
  instrument_type: 'flashcard' | 'quiz';
  grade: number;
  response_time_ms?: number;
  created_at?: string;
}

// ── PERF M1: Batch Review Submission ──────────────────────

export interface BatchReviewItem {
  item_id: string;
  instrument_type: 'flashcard' | 'quiz';
  grade: number;
  response_time_ms?: number;
  /** Subtopic ID for server-side BKT computation (PATH B) */
  subtopic_id?: string;
  // PATH B: NO enviamos fsrs_update ni bkt_update.
  // El backend lee el estado actual de fsrs_states/bkt_states
  // y computa FSRS v4 Petrick + BKT v4 Recovery server-side.
}

export interface BatchComputedResult {
  item_id: string;
  fsrs?: {
    stability: number;
    difficulty: number;
    due_at: string;
    state: string;
    reps: number;
    lapses: number;
    consecutive_lapses: number;
    is_leech: boolean;
  };
  bkt?: {
    subtopic_id: string;
    p_know: number;
    max_p_know: number;
    delta: number;
  };
}

export interface BatchReviewResponse {
  processed: number;
  reviews_created: number;
  fsrs_updated: number;
  bkt_updated: number;
  errors?: { index: number; step: string; message: string }[];
  /** Per-item computed values (only present for PATH B items) */
  results?: BatchComputedResult[];
}

export async function submitReviewBatch(
  sessionId: string,
  reviews: BatchReviewItem[],
): Promise<BatchReviewResponse> {
  return apiCall<BatchReviewResponse>('/review-batch', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, reviews }),
  });
}

// ── Study Sessions ────────────────────────────────────────

export async function createStudySession(data: {
  session_type: 'flashcard' | 'quiz' | 'reading' | 'mixed';
  course_id?: string;
}): Promise<StudySessionRecord> {
  return apiCall<StudySessionRecord>('/study-sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function closeStudySession(
  sessionId: string,
  data: {
    completed_at: string;        // FIX RT-001: was 'ended_at'
    total_reviews: number;
    correct_reviews: number;
    // NOTE: duration_seconds removed — column doesn't exist in DB.
  }
): Promise<StudySessionRecord> {
  return apiCall<StudySessionRecord>(`/study-sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Get study sessions with optional filters.
 * FIX BA-03: study-sessions is CRUD factory → returns { items, total, limit, offset }
 * after apiCall unwraps .data. Handle both formats defensively.
 */
export async function getStudySessions(filters?: {
  session_type?: string;
  course_id?: string;
  limit?: number;
}): Promise<StudySessionRecord[]> {
  const qs = new URLSearchParams();
  if (filters?.session_type) qs.set('session_type', filters.session_type);
  if (filters?.course_id) qs.set('course_id', filters.course_id);
  if (filters?.limit) qs.set('limit', String(filters.limit));
  const query = qs.toString();
  const result = await apiCall<any>(`/study-sessions${query ? `?${query}` : ''}`);
  // CRUD factory returns { items, total, limit, offset }, not a plain array
  return Array.isArray(result) ? result : result?.items || [];
}

// ── FSRS States ──────────────────────────────────────────

export async function getFsrsStates(params?: {
  due_before?: string;
  state?: string;
  limit?: number;
}): Promise<FsrsStateRow[]> {
  const qs = new URLSearchParams();
  if (params?.due_before) qs.set('due_before', params.due_before);
  if (params?.state) qs.set('state', params.state);
  if (params?.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const result = await apiCall<any>(`/fsrs-states${query ? `?${query}` : ''}`);
  // Handle both { items: [...] } and plain array
  return Array.isArray(result) ? result : result?.items || [];
}

export async function upsertFsrsState(data: {
  flashcard_id: string;
  stability: number;
  difficulty: number;
  due_at: string;
  last_review_at: string;
  reps: number;
  lapses: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
}): Promise<FsrsStateRow> {
  return apiCall<FsrsStateRow>('/fsrs-states', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Reviews ─────────────────────────────────────────────

export async function submitReview(data: {
  session_id: string;
  item_id: string;
  instrument_type: 'flashcard';
  grade: number;
  response_time_ms?: number;
}): Promise<ReviewRecord> {
  return apiCall<ReviewRecord>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Fallback: fire individual POSTs when batch fails ──────
// PATH B fallback: only submits reviews (no FSRS/BKT).
// FSRS+BKT are recomputed on next normal batch session.

export async function fallbackToIndividualPosts(
  sessionId: string,
  items: BatchReviewItem[],
): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const item of items) {
    // POST /reviews — lo unico que el fallback puede hacer en PATH B
    // (FSRS y BKT se pierden — aceptable para fallback de emergencia;
    //  se recomputan en la proxima sesion normal via PATH B batch)
    promises.push(
      submitReview({
        session_id: sessionId,
        item_id: item.item_id,
        instrument_type: 'flashcard',
        grade: item.grade,
        response_time_ms: item.response_time_ms,
      }).catch(err => {
        if (import.meta.env.DEV) console.warn('[Fallback] review failed:', err);
      }) as Promise<void>,
    );
  }

  await Promise.allSettled(promises);
}
