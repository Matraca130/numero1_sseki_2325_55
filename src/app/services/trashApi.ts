// ============================================================
// Axon — Trash & Restore API Service (T-10)
//
// GET  /trash?type=all|summaries|keywords|flashcards|quiz-questions|videos
// POST /restore/:table/:id
//
// Backend uses search/trash-restore.ts with institution scoping
// via trash_scoped() RPC and resolve_summary_institution() RPC.
//
// Uses apiCall() from lib/api.ts (handles Auth headers).
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export type TrashType = 'all' | 'summaries' | 'keywords' | 'flashcards' | 'quiz-questions' | 'videos';

export interface TrashItem {
  id: string;
  type: string;
  title: string;
  deleted_at: string;
}

export interface TrashResponse {
  items: TrashItem[];
}

export interface RestoreResponse {
  restored: boolean;
  item: Record<string, unknown>;
}

// ── API calls ─────────────────────────────────────────────

/**
 * List soft-deleted items (institution-scoped).
 * Backend: GET /trash
 *
 * @param type - Filter by content type (default: 'all')
 */
export async function getTrash(
  type: TrashType = 'all'
): Promise<TrashItem[]> {
  const params = new URLSearchParams();
  if (type !== 'all') params.set('type', type);

  const qs = params.toString();
  const response = await apiCall<TrashResponse>(
    `/trash${qs ? `?${qs}` : ''}`
  );
  return response.items || [];
}

/**
 * Restore a soft-deleted item.
 * Backend: POST /restore/:table/:id
 *
 * Requires CONTENT_WRITE_ROLES in the item's institution.
 * For tables with is_active (summaries, keywords, videos),
 * also sets is_active = true.
 *
 * @param table - Table name (summaries, keywords, flashcards, quiz-questions, videos)
 * @param id    - UUID of the item to restore
 */
export async function restoreItem(
  table: string,
  id: string
): Promise<RestoreResponse> {
  return apiCall<RestoreResponse>(`/restore/${table}/${id}`, {
    method: 'POST',
  });
}
