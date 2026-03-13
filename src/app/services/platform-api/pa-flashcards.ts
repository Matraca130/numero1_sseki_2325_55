// ============================================================
// Axon — Platform API: Flashcards (Professor Management, KV-based)
// Extracted from platformApi.ts (zero functional changes)
// ============================================================

import { realRequest } from '@/app/services/apiConfig';
import type { UUID, ISODate } from '@/app/types/platform';

const request = realRequest;

// ============================================================
// FLASHCARDS
// ============================================================

export interface FlashcardCard {
  id: UUID;
  summary_id: UUID;
  keyword_id: UUID;
  subtopic_id?: UUID;
  institution_id?: UUID;
  front: string;
  back: string;
  image_url?: string | null;
  status: 'draft' | 'published' | 'active' | 'suspended' | 'deleted';
  source: 'ai' | 'manual' | 'imported' | 'professor';
  created_by?: string;
  created_at: ISODate;
}

export async function getFlashcardsBySummary(summaryId: UUID): Promise<FlashcardCard[]> {
  return request<FlashcardCard[]>(`/flashcards?summary_id=${summaryId}`);
}

/** Fetch all flashcards, optionally filtered by subtopic_id or status.
 *  Used by Phase 2 to build flashcard_id → subtopic_id mapping for FSRS. */
export async function getFlashcards(options?: {
  subtopic_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<FlashcardCard[]> {
  const params = new URLSearchParams();
  if (options?.subtopic_id) params.set('subtopic_id', options.subtopic_id);
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  const qs = params.toString() ? `?${params}` : '';
  const result = await request<{ items: FlashcardCard[] } | FlashcardCard[]>(`/flashcards${qs}`);
  if (Array.isArray(result)) return result;
  return (result as any)?.items || [];
}

export async function getFlashcardsByKeyword(keywordId: UUID): Promise<FlashcardCard[]> {
  return request<FlashcardCard[]>(`/flashcards?keyword_id=${keywordId}`);
}

export async function getFlashcard(cardId: UUID): Promise<FlashcardCard> {
  return request<FlashcardCard>(`/flashcards/${cardId}`);
}

export async function createFlashcard(data: Partial<FlashcardCard>): Promise<FlashcardCard> {
  return request<FlashcardCard>('/flashcards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFlashcard(cardId: UUID, data: Partial<FlashcardCard>): Promise<FlashcardCard> {
  return request<FlashcardCard>(`/flashcards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteFlashcard(cardId: UUID): Promise<void> {
  return request(`/flashcards/${cardId}`, { method: 'DELETE' });
}
