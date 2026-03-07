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
//   - instrument_type: 'flashcard' | 'quiz' (was 'flashcard' only)
//   - removed response_time_ms from reviews (column doesn't exist)
//
// FIX BA-03,BA-05 (2026-03-01):
//   - getStudySessions: handle CRUD factory paginated response
//   - FsrsState: user_id → student_id (matches DB column)
//
// PERF v4.4.3 (2026-03-07):
//   - Added BatchReviewItem, BatchReviewResponse types
//   - Added submitReviewBatch() — single POST for all reviews
//     in a session instead of 3×N individual POSTs.
//   - Added fallbackToIndividualPosts() for resilience
//   - computeFsrsUpdate moved to lib/fsrs-engine.ts (canonical)
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export interface StudySessionRecord {
  id: string;
  student_id?: string;
  session_type: 'flashcard' | 'quiz' | 'reading' | 'mixed';
  course_id?: string;
  started_at: string;
  completed_at?: string | null;
  total_reviews?: number;
  correct_reviews?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FsrsState {
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
  created_at?: string;
}

// ── PERF M1: Batch Review Submission ──────────────────────

export interface BatchReviewItem {
  item_id: string;
  instrument_type: 'flashcard';
  grade: number;
  response_time_ms?: number;
  fsrs_update?: {
    stability: number;
    difficulty: number;
    due_at: string;
    last_review_at: string;
    reps: number;
    lapses: number;
    state: 'new' | 'learning' | 'review' | 'relearning';
  };
  bkt_update?: {
    subtopic_id: string;
    p_know: number;
    p_transit: number;
    p_slip: number;
    p_guess: number;
    delta: number;
    total_attempts: number;
    correct_attempts: number;
    last_attempt_at: string;
  };
}

export interface BatchReviewResponse {
  processed: number;
  reviews_created: number;
  fsrs_updated: number;
  bkt_updated: number;
  errors?: { index: number; step: string; message: string }[];
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

// ── FSRS States ─────────────────────────────────────────

export async function getFsrsStates(params?: {
  due_before?: string;
  state?: string;
  limit?: number;
}): Promise<FsrsState[]> {
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
}): Promise<FsrsState> {
  return apiCall<FsrsState>('/fsrs-states', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Reviews ─────────────────────────────────────────────

export async function submitReview(data: {
  session_id: string;
  item_id: string;
  instrument_type: 'flashcard' | 'quiz';
  grade: number;
}): Promise<ReviewRecord> {
  return apiCall<ReviewRecord>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Fallback: fire individual POSTs when batch fails ──────
// Maps BatchReviewItems back to the 3 individual endpoints.
// All calls are fire-and-forget with error logging.
// Shared by useFlashcardEngine, useReviewBatch, and any
// future consumer of the batch submission pattern.

export async function fallbackToIndividualPosts(
  sessionId: string,
  items: BatchReviewItem[],
): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const item of items) {
    // POST /reviews
    promises.push(
      submitReview({
        session_id: sessionId,
        item_id: item.item_id,
        instrument_type: 'flashcard',
        grade: item.grade,
      }).catch(err => {
        if (import.meta.env.DEV) console.warn('[Fallback] review failed:', err);
      }) as Promise<void>,
    );

    // POST /fsrs-states
    if (item.fsrs_update) {
      promises.push(
        upsertFsrsState({
          flashcard_id: item.item_id,
          ...item.fsrs_update,
        }).catch(err => {
          if (import.meta.env.DEV) console.warn('[Fallback] FSRS failed:', err);
        }) as Promise<void>,
      );
    }

    // POST /bkt-states
    if (item.bkt_update) {
      promises.push(
        apiCall('/bkt-states', {
          method: 'POST',
          body: JSON.stringify(item.bkt_update),
        }).catch(err => {
          if (import.meta.env.DEV) console.warn('[Fallback] BKT failed:', err);
        }) as Promise<void>,
      );
    }
  }

  await Promise.allSettled(promises);
}

// ── FSRS Algorithm ────────────────────────────────────────
// DEPRECATED inline: The old computeFsrsUpdate that lived here used a DIFFERENT
// formula than lib/fsrs-engine.ts, causing scheduling inconsistencies.
// All consumers now use the canonical implementation from lib/fsrs-engine.ts.
// Re-exported here ONLY for backward compatibility.
export type { FsrsUpdate } from '@/app/lib/fsrs-engine';
export { computeFsrsUpdate } from '@/app/lib/fsrs-engine';
