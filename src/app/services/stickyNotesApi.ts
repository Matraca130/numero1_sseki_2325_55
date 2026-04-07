// ============================================================
// Axon — Sticky Notes API Service
//
// Per-student "RAM-memory" scratchpad, one note per summary.
// Backed by table public.sticky_notes (RLS-protected by student_id).
//
// Endpoints (mounted under /server in Edge Functions):
//   GET    /sticky-notes?summary_id=xxx
//   POST   /sticky-notes        body: { summary_id, content }
//   DELETE /sticky-notes?summary_id=xxx
// ============================================================

import { apiCall } from '@/app/lib/api';
import { getErrorMessage, hasHttpStatus } from '@/app/utils/getErrorMessage';

export interface StickyNote {
  id: string;
  student_id: string;
  summary_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function getStickyNote(summaryId: string): Promise<StickyNote | null> {
  try {
    const result = await apiCall<StickyNote | null>(
      `/sticky-notes?summary_id=${encodeURIComponent(summaryId)}`,
    );
    return result ?? null;
  } catch (e: unknown) {
    if (getErrorMessage(e).includes('404') || hasHttpStatus(e, 404)) return null;
    throw e;
  }
}

export async function upsertStickyNote(data: {
  summary_id: string;
  content: string;
}): Promise<StickyNote> {
  return apiCall<StickyNote>('/sticky-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteStickyNote(summaryId: string): Promise<{ deleted: boolean }> {
  return apiCall<{ deleted: boolean }>(
    `/sticky-notes?summary_id=${encodeURIComponent(summaryId)}`,
    { method: 'DELETE' },
  );
}
