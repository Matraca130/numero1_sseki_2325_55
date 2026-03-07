// ============================================================
// Axon — Keyword Connections API (service layer)
//
// Pure API client for keyword connections CRUD + search.
// No React, no hooks — just async functions that call apiCall.
//
// Routes (all FLAT):
//   GET    /keyword-connections?keyword_id=xxx
//   POST   /keyword-connections { keyword_a_id, keyword_b_id, ... }
//   DELETE /keyword-connections/:id
//   GET    /keyword-search?q=xxx&exclude_summary_id=yyy
//
// Canonical order (keyword_a_id < keyword_b_id) must be enforced
// by the CALLER before constructing CreateConnectionInput.
// ============================================================

import { apiCall } from '@/app/lib/api';
import { extractItems } from '@/app/lib/api-helpers';
import type {
  KeywordConnection,
  CreateConnectionInput,
  SearchResultKeyword,
} from '@/app/types/keyword-connections';

// ── GET connections for a keyword ─────────────────────────

export async function getConnections(
  keywordId: string,
): Promise<KeywordConnection[]> {
  const result = await apiCall<unknown>(
    `/keyword-connections?keyword_id=${keywordId}`,
  );
  return extractItems<KeywordConnection>(result);
}

// ── POST create connection ────────────────────────────────

export async function createConnection(
  data: CreateConnectionInput,
): Promise<KeywordConnection> {
  return apiCall<KeywordConnection>('/keyword-connections', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── DELETE connection ─────────────────────────────────────

export async function deleteConnection(id: string): Promise<void> {
  await apiCall(`/keyword-connections/${id}`, { method: 'DELETE' });
}

// ── GET keyword search (cross-summary) ────────────────────

export async function searchKeywords(
  query: string,
  excludeSummaryId?: string,
): Promise<SearchResultKeyword[]> {
  const params = new URLSearchParams({ q: query.trim() });
  if (excludeSummaryId) params.set('exclude_summary_id', excludeSummaryId);
  const result = await apiCall<unknown>(
    `/keyword-search?${params.toString()}`,
  );
  return extractItems<SearchResultKeyword>(result);
}
