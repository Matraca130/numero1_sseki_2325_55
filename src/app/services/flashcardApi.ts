// ============================================================
// Axon — Flashcard API Service (FLAT routes)
//
// Backend uses FLAT routes with query params, NOT nested routes.
// Uses apiCall() from lib/api.ts (handles Auth headers).
//
// Response patterns:
//   List:   { data: { items: [...], total, limit, offset } }
//   Single: { data: { ... } }
//   apiCall() unwraps the { data: ... } envelope automatically.
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export interface FlashcardItem {
  id: string;
  summary_id: string;
  keyword_id: string;
  subtopic_id?: string | null;
  front: string;
  back: string;
  source: 'ai' | 'manual' | 'imported';
  is_active: boolean;
  deleted_at: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FlashcardListResponse {
  items: FlashcardItem[];
  total: number;
  limit: number;
  offset: number;
}

// ── GET /flashcards?summary_id=xxx&keyword_id=xxx ─────────

export async function getFlashcards(
  summaryId: string,
  keywordId?: string,
  opts?: { limit?: number; offset?: number }
): Promise<FlashcardListResponse> {
  const params = new URLSearchParams();
  params.set('summary_id', summaryId);
  if (keywordId) params.set('keyword_id', keywordId);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  return apiCall<FlashcardListResponse>(`/flashcards?${params}`);
}

// ── GET /flashcards/:id ───────────────────────────────────

export async function getFlashcard(id: string): Promise<FlashcardItem> {
  return apiCall<FlashcardItem>(`/flashcards/${id}`);
}

// ── POST /flashcards ──────────────────────────────────────

export async function createFlashcard(data: {
  summary_id: string;
  keyword_id: string;
  subtopic_id?: string | null;
  front: string;
  back: string;
  source?: 'manual' | 'ai';
}): Promise<FlashcardItem> {
  return apiCall<FlashcardItem>('/flashcards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── PUT /flashcards/:id ───────────────────────────────────

export async function updateFlashcard(
  id: string,
  data: { front?: string; back?: string; source?: string; subtopic_id?: string | null; is_active?: boolean }
): Promise<FlashcardItem> {
  return apiCall<FlashcardItem>(`/flashcards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── DELETE /flashcards/:id (soft-delete) ──────────────────

export async function deleteFlashcard(id: string): Promise<void> {
  await apiCall(`/flashcards/${id}`, { method: 'DELETE' });
}

// ── PUT /flashcards/:id/restore ───────────────────────────

export async function restoreFlashcard(id: string): Promise<FlashcardItem> {
  return apiCall<FlashcardItem>(`/flashcards/${id}/restore`, {
    method: 'PUT',
  });
}