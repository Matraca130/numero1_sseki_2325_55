// ============================================================
// Axon — Search API Service (T-02)
//
// GET /search?q=texto&type=all|summaries|keywords|videos
// Backend uses RPC search_scoped() — results scoped to user's
// accessible institutions via auth.uid().
//
// Uses apiCall() from lib/api.ts (handles Auth headers).
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────

export type SearchType = 'all' | 'summaries' | 'keywords' | 'videos';

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  snippet: string;
  parent_path: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

// ── API call ──────────────────────────────────────────

/**
 * Search across content (summaries, keywords, videos).
 * Backend: GET /search
 *
 * Results are scoped to the caller's accessible institutions
 * via the search_scoped() RPC.
 *
 * @param q    - Search query (min 2 chars)
 * @param type - Filter by content type (default: 'all')
 */
export async function search(
  q: string,
  type: SearchType = 'all'
): Promise<SearchResult[]> {
  if (!q || q.trim().length < 2) return [];

  const params = new URLSearchParams();
  params.set('q', q.trim());
  if (type !== 'all') params.set('type', type);

  const response = await apiCall<SearchResponse>(`/search?${params.toString()}`);
  return response.results || [];
}
