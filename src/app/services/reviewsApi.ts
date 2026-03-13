// ============================================================
// Axon — Reviews API (R1 domain extraction)
//
// POST for /reviews endpoint.
// Backend: routes/study/reviews.ts (custom, NOT CRUD factory)
// Required: session_id (UUID), item_id (UUID),
//           instrument_type (string), grade (0-5)
// Optional: response_time_ms (non-negative int)
//
// Extracted from quizApi.ts — all consumers continue to import
// from quizApi.ts barrel (backwards compatible).
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

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

// ── API Functions ─────────────────────────────────────────

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
