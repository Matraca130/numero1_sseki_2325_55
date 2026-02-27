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
  user_id?: string;
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
    completed_at: string;
    total_reviews: number;
    correct_reviews: number;
  }
): Promise<StudySessionRecord> {
  return apiCall<StudySessionRecord>(`/study-sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── FSRS States ───────────────────────────────────────────

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

// ── Reviews ───────────────────────────────────────────────

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

// ── FSRS Simplified Algorithm (client-side) ───────────────

export interface FsrsUpdate {
  stability: number;
  difficulty: number;
  due_at: string;
  reps: number;
  lapses: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
}

export function computeFsrsUpdate(
  currentState: FsrsState | null,
  grade: number, // 0-5
): FsrsUpdate {
  const now = new Date();

  // New card (no prior state)
  if (!currentState || currentState.state === 'new') {
    if (grade >= 3) {
      const dueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
      return {
        stability: 1,
        difficulty: 5,
        due_at: dueAt.toISOString(),
        reps: 1,
        lapses: 0,
        state: 'learning',
      };
    } else {
      const dueAt = new Date(now.getTime() + 60 * 1000); // +1 min (retry)
      return {
        stability: 0.5,
        difficulty: 5,
        due_at: dueAt.toISOString(),
        reps: 0,
        lapses: 0,
        state: 'new',
      };
    }
  }

  // Existing card in review/learning/relearning
  const { stability, difficulty, reps, lapses } = currentState;

  if (grade >= 3) {
    // Success
    const newStability = stability * (1 + 0.5 * grade);
    const intervalMs = newStability * 24 * 60 * 60 * 1000;
    const dueAt = new Date(now.getTime() + intervalMs);
    return {
      stability: Math.round(newStability * 100) / 100,
      difficulty: Math.max(1, difficulty - 0.1 * (grade - 3)),
      due_at: dueAt.toISOString(),
      reps: reps + 1,
      lapses,
      state: 'review',
    };
  } else {
    // Failure
    const newStability = Math.max(0.5, stability * 0.5);
    const dueAt = new Date(now.getTime() + 10 * 60 * 1000); // +10 min
    return {
      stability: Math.round(newStability * 100) / 100,
      difficulty: Math.min(10, difficulty + 0.2),
      due_at: dueAt.toISOString(),
      reps,
      lapses: lapses + 1,
      state: 'relearning',
    };
  }
}
