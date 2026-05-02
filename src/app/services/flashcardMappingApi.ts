// ============================================================
// Axon — Flashcard Mapping API Service (T-01)
//
// GET /flashcard-mappings — lightweight flashcard→subtopic→keyword mapping
// Returns ONLY { id, subtopic_id, keyword_id } per card (~10x lighter
// than full flashcard objects). Used by useTopicMastery for FSRS
// per-topic aggregation without loading card content.
//
// Backend: routes/content/flashcard-mappings.ts
// Uses apiCall() from lib/api.ts (handles Auth headers).
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export interface FlashcardMapping {
  id: string;
  subtopic_id: string | null;
  keyword_id: string;
}

export interface FlashcardMappingResponse {
  data: FlashcardMapping[];
  total: number;
  limit: number;
  offset: number;
}

// ── API call ──────────────────────────────────────────────

/**
 * Get lightweight flashcard mappings (id, subtopic_id, keyword_id only).
 *
 * Backend: GET /flashcard-mappings
 * Filters: is_active=true, deleted_at IS NULL
 *
 * @param opts.status - Optional status filter (e.g. 'published')
 * @param opts.limit  - Max results (default 500, max 1000)
 * @param opts.offset - Pagination offset (default 0)
 */
export async function getFlashcardMappings(
  opts?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<FlashcardMappingResponse> {
  const params = new URLSearchParams();
  if (opts?.status) params.set('status', opts.status);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset != null) params.set('offset', String(opts.offset));

  const qs = params.toString();
  return apiCall<FlashcardMappingResponse>(
    `/flashcard-mappings${qs ? `?${qs}` : ''}`
  );
}

/**
 * Get ALL flashcard mappings (auto-paginated).
 * Useful for building a complete flashcard_id → subtopic_id lookup map.
 *
 * Returns a Map<flashcard_id, { subtopic_id, keyword_id }> for O(1) lookups.
 */
export async function getAllFlashcardMappings(): Promise<
  Map<string, { subtopic_id: string | null; keyword_id: string }>
> {
  const result = new Map<string, { subtopic_id: string | null; keyword_id: string }>();
  let offset = 0;
  const limit = 1000;

  while (true) {
    const response = await getFlashcardMappings({ limit, offset });
    const items = response.data || [];

    for (const item of items) {
      result.set(item.id, {
        subtopic_id: item.subtopic_id,
        keyword_id: item.keyword_id,
      });
    }

    if (items.length < limit) break; // last page
    offset += limit;
  }

  return result;
}
