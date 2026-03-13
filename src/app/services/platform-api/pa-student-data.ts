// ============================================================
// Axon — Platform API: Student Data (Reviews, Stats, BKT, FSRS)
// Extracted from platformApi.ts (zero functional changes)
// ============================================================

import { apiCall } from '@/app/lib/api';
import type { UUID } from '@/app/types/platform';
import { hasHttpStatus } from '@/app/utils/getErrorMessage';

const request = apiCall;

// ============================================================
// REVIEWS & SPACED REPETITION
// ============================================================

export interface ReviewRequest {
  session_id: UUID;
  item_id: UUID;
  instrument_type: 'flashcard' | 'quiz';
  grade: number;
}

export interface ReviewResponse {
  id: string;
  session_id: string;
  item_id: string;
  instrument_type: string;
  grade: number;
  created_at: string;
}

export async function submitReview(data: ReviewRequest): Promise<ReviewResponse> {
  return request<ReviewResponse>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// DAILY ACTIVITIES
// ============================================================

export interface DailyActivityRecord {
  id?: string;
  student_id?: string;
  activity_date: string;
  reviews_count: number;
  correct_count: number;
  time_spent_seconds: number;
  sessions_count: number;
  created_at?: string;
  updated_at?: string;
}

export async function getDailyActivities(
  from: string,
  to: string,
  limit = 90,
  offset = 0
): Promise<DailyActivityRecord[]> {
  const params = new URLSearchParams({ from, to, limit: String(limit), offset: String(offset) });
  const result = await request<DailyActivityRecord[]>(`/daily-activities?${params}`);
  return result || [];
}

export async function upsertDailyActivity(
  data: Partial<DailyActivityRecord> & { activity_date: string }
): Promise<DailyActivityRecord> {
  return request<DailyActivityRecord>('/daily-activities', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// STUDENT STATS
// ============================================================

export interface StudentStatsRecord {
  id?: string;
  student_id?: string;
  current_streak: number;
  longest_streak: number;
  total_reviews: number;
  total_time_seconds: number;
  total_sessions: number;
  last_study_date: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getStudentStatsReal(): Promise<StudentStatsRecord | null> {
  try {
    return await request<StudentStatsRecord | null>('/student-stats');
  } catch (err: unknown) {
    if (hasHttpStatus(err, 404)) return null;
    throw err;
  }
}

export async function upsertStudentStats(
  data: Partial<StudentStatsRecord>
): Promise<StudentStatsRecord> {
  return request<StudentStatsRecord>('/student-stats', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// BKT STATES
// ============================================================

export interface BktStateRecord {
  id?: string;
  student_id?: string;
  subtopic_id: string;
  p_know: number;
  p_transit: number;
  p_slip: number;
  p_guess: number;
  delta: number;
  total_attempts: number;
  correct_attempts: number;
  last_attempt_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getAllBktStates(
  subtopicId?: string,
  limit = 200,
  offset = 0
): Promise<BktStateRecord[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (subtopicId) params.set('subtopic_id', subtopicId);
  const result = await request<BktStateRecord[]>(`/bkt-states?${params}`);
  return result || [];
}

export async function upsertBktState(
  data: Partial<BktStateRecord> & { subtopic_id: string }
): Promise<BktStateRecord> {
  return request<BktStateRecord>('/bkt-states', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// FSRS STATES
// ============================================================

export interface FsrsStateRecord {
  id: string;
  student_id?: string;
  flashcard_id?: string | null;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: 'new' | 'learning' | 'review' | 'relearning';
  due?: string | null;
  last_review?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getFsrsStates(options?: {
  flashcard_id?: string;
  state?: 'new' | 'learning' | 'review' | 'relearning';
  due_before?: string;
  limit?: number;
  offset?: number;
}): Promise<FsrsStateRecord[]> {
  const params = new URLSearchParams();
  if (options?.flashcard_id) params.set('flashcard_id', options.flashcard_id);
  if (options?.state) params.set('state', options.state);
  if (options?.due_before) params.set('due_before', options.due_before);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  const qs = params.toString() ? `?${params}` : '';
  const result = await request<{ items: FsrsStateRecord[] } | FsrsStateRecord[]>(
    `/fsrs-states${qs}`
  );
  if (Array.isArray(result)) return result;
  return (result as any)?.items || [];
}

export async function upsertFsrsState(
  data: {
    flashcard_id: string;
    stability?: number;
    difficulty?: number;
    due_at?: string;
    last_review_at?: string;
    reps?: number;
    lapses?: number;
    state?: 'new' | 'learning' | 'review' | 'relearning';
  }
): Promise<FsrsStateRecord> {
  return request<FsrsStateRecord>('/fsrs-states', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
