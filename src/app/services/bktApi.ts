// ============================================================
// Axon — BKT States API Service
//
// Extracted from quizApi.ts (P2-S01) to keep quizApi under the
// 500-line Architecture Practices limit.
//
// Endpoints (flat routes with query params):
//   /bkt-states — Custom POST/GET upsert (routes/study/spaced-rep.ts)
//
// Uses apiCall() from lib/api.ts (handles Authorization + X-Access-Token)
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export interface BktStatePayload {
  subtopic_id: string;
  p_know: number;
  p_transit: number;
  p_slip: number;
  p_guess: number;
  delta: number;
  total_attempts: number;
  correct_attempts: number;
  last_attempt_at: string;
}

export interface BktState {
  id: string;
  student_id: string;
  subtopic_id: string;
  p_know: number;
  p_transit: number;
  p_slip: number;
  p_guess: number;
  delta: number;
  total_attempts: number;
  correct_attempts: number;
  last_attempt_at: string;
  created_at: string;
  updated_at: string;
}

// ── API Functions ─────────────────────────────────────────

/**
 * Upsert a BKT state for a subtopic.
 * Backend increments total_attempts/correct_attempts (M-1 FIX).
 * student_id is auto-set from auth token.
 */
export async function upsertBktState(data: BktStatePayload): Promise<BktState> {
  return apiCall<BktState>('/bkt-states', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Fetch BKT states for the authenticated student.
 *
 * Supports two filter modes (mutually exclusive per backend M-5 FIX):
 * - subtopic_id: single subtopic filter
 * - subtopic_ids: batch filter (comma-separated, max 200)
 *
 * The batch mode (subtopic_ids) is preferred for quiz results:
 * instead of fetching ALL student BKT states and filtering client-side,
 * send only the subtopic IDs relevant to the current quiz/summary.
 *
 * @example
 * // Single subtopic
 * const states = await getBktStates({ subtopic_id: '...' });
 *
 * @example
 * // Batch for quiz results (all subtopics from a summary)
 * const states = await getBktStates({
 *   subtopic_ids: ['uuid1', 'uuid2', 'uuid3'],
 *   limit: 200,
 * });
 */
export async function getBktStates(filters?: {
  subtopic_id?: string;
  subtopic_ids?: string[];
  limit?: number;
  offset?: number;
}): Promise<BktState[]> {
  const params = new URLSearchParams();
  if (filters?.subtopic_id) params.set('subtopic_id', filters.subtopic_id);
  if (filters?.subtopic_ids && filters.subtopic_ids.length > 0) {
    params.set('subtopic_ids', filters.subtopic_ids.join(','));
  }
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.offset) params.set('offset', String(filters.offset));
  const qs = params.toString() ? `?${params}` : '';
  return apiCall<BktState[]>(`/bkt-states${qs}`);
}

/**
 * Fetch ALL BKT states for the current student (1 HTTP call).
 * The backend auto-filters by JWT (scopeToUser).
 * Used by useStudyHubProgress for course-level mastery derivation.
 *
 * Returns empty array on failure (non-blocking — graceful degradation).
 */
export async function getAllBktStates(): Promise<BktState[]> {
  try {
    return await apiCall<BktState[]>('/bkt-states?limit=1000');
  } catch {
    return [];
  }
}