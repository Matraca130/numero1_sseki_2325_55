// ============================================================
// Axon — Student Summaries API Service
//
// Student-private endpoints: reading states, text annotations,
// keyword notes, video notes. ALL routes are FLAT with query params.
//
// Uses apiCall() from lib/api.ts — handles Authorization + X-Access-Token.
// The backend auto-filters by the authenticated student (JWT).
//
// Response conventions (after apiCall unwraps { data: ... }):
//   CRUD factory lists: { items: [...], total, limit, offset }
//   Single objects / upsert: { ... }
//   Nullable: { ... } | null
// ============================================================

import { apiCall } from '@/app/lib/api';
import type { PaginatedList } from '@/app/services/summariesApi';
import { getErrorMessage, hasHttpStatus } from '@/app/utils/getErrorMessage';

// ── Types ─────────────────────────────────────────────

export interface ReadingState {
  id: string;
  student_id: string;
  summary_id: string;
  scroll_position: number | null;
  time_spent_seconds: number | null;
  completed: boolean;
  last_read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TextAnnotation {
  id: string;
  student_id: string;
  summary_id: string;
  start_offset: number;
  end_offset: number;
  color: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  block_id?: string | null;
}

export interface KwStudentNote {
  id: string;
  student_id: string;
  keyword_id: string;
  note: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface VideoNote {
  id: string;
  student_id: string;
  video_id: string;
  timestamp_seconds: number | null;
  note: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// ── Reading States ──────────────────────────────────────

export async function getReadingState(summaryId: string): Promise<ReadingState | null> {
  try {
    const result = await apiCall<any>(`/reading-states?summary_id=${summaryId}`);
    // Handle both paginated { items: [...] } and direct object shapes
    if (result && Array.isArray(result.items)) {
      return result.items[0] ?? null;
    }
    if (Array.isArray(result)) {
      return result[0] ?? null;
    }
    // Direct object (custom endpoint or single-item response)
    return result ?? null;
  } catch (err: unknown) {
    if (getErrorMessage(err).includes('404') || hasHttpStatus(err, 404)) return null;
    throw err;
  }
}

/**
 * @deprecated Use useReadingStateQueue instead for batched, debounced updates.
 * This function is still supported for backward compatibility.
 */
export async function upsertReadingState(data: {
  summary_id: string;
  scroll_position?: number;
  time_spent_seconds?: number;
  completed?: boolean;
  last_read_at?: string;
}): Promise<ReadingState> {
  return apiCall<ReadingState>('/reading-states', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Text Annotations ────────────────────────────────────

export async function getTextAnnotations(summaryId: string): Promise<PaginatedList<TextAnnotation>> {
  return apiCall<PaginatedList<TextAnnotation>>(`/text-annotations?summary_id=${summaryId}`);
}

export async function createTextAnnotation(data: {
  summary_id: string;
  start_offset: number;
  end_offset: number;
  color?: string;
  note?: string;
  selected_text?: string;
  block_id?: string;
}): Promise<TextAnnotation> {
  // Use Supabase RPC when block_id is provided (enriched view)
  if (data.block_id) {
    const { supabase } = await import('@/app/lib/supabase');
    const { data: result, error } = await supabase.rpc('create_text_annotation', {
      p_summary_id: data.summary_id,
      p_start_offset: data.start_offset,
      p_end_offset: data.end_offset,
      p_color: data.color || 'yellow',
      p_note: data.note || null,
      p_block_id: data.block_id,
    });
    if (error) throw new Error(error.message);
    return result as TextAnnotation;
  }
  return apiCall<TextAnnotation>('/text-annotations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTextAnnotation(id: string, data: {
  color?: string;
  note?: string;
}): Promise<TextAnnotation> {
  return apiCall<TextAnnotation>(`/text-annotations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTextAnnotation(id: string): Promise<any> {
  return apiCall(`/text-annotations/${id}`, { method: 'DELETE' });
}

// ── Keyword Student Notes ───────────────────────────────

export async function getKwStudentNotes(keywordId: string): Promise<PaginatedList<KwStudentNote>> {
  return apiCall<PaginatedList<KwStudentNote>>(`/kw-student-notes?keyword_id=${keywordId}`);
}

export async function createKwStudentNote(data: {
  keyword_id: string;
  note: string;
}): Promise<KwStudentNote> {
  return apiCall<KwStudentNote>('/kw-student-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateKwStudentNote(id: string, data: {
  note?: string;
}): Promise<KwStudentNote> {
  return apiCall<KwStudentNote>(`/kw-student-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteKwStudentNote(id: string): Promise<any> {
  return apiCall(`/kw-student-notes/${id}`, { method: 'DELETE' });
}

// ── Video Notes ─────────────────────────────────────────

export async function getVideoNotes(videoId: string): Promise<PaginatedList<VideoNote>> {
  return apiCall<PaginatedList<VideoNote>>(`/video-notes?video_id=${videoId}`);
}

export async function createVideoNote(data: {
  video_id: string;
  timestamp_seconds?: number;
  note: string;
}): Promise<VideoNote> {
  return apiCall<VideoNote>('/video-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVideoNote(id: string, data: {
  timestamp_seconds?: number;
  note?: string;
}): Promise<VideoNote> {
  return apiCall<VideoNote>(`/video-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteVideoNote(id: string): Promise<any> {
  return apiCall(`/video-notes/${id}`, { method: 'DELETE' });
}

// ── Block Bookmarks ────────────────────────────────────

export interface BlockBookmark {
  id: string;
  summary_id: string;
  block_id: string;
  student_id: string;
  created_at: string;
}

export async function getBlockBookmarks(summaryId: string): Promise<PaginatedList<BlockBookmark>> {
  return apiCall<PaginatedList<BlockBookmark>>(`/block-bookmarks?summary_id=${summaryId}`);
}

export async function createBlockBookmark(data: { summary_id: string; block_id: string }): Promise<BlockBookmark> {
  return apiCall<BlockBookmark>('/block-bookmarks', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteBlockBookmark(id: string): Promise<any> {
  return apiCall(`/block-bookmarks/${id}`, { method: 'DELETE' });
}

// ── Block Notes ────────────────────────────────────────

export interface BlockNote {
  id: string;
  summary_id: string;
  block_id: string;
  student_id: string;
  text: string;
  color: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export async function getBlockNotes(summaryId: string, blockId?: string): Promise<PaginatedList<BlockNote>> {
  let url = `/block-notes?summary_id=${summaryId}`;
  if (blockId) url += `&block_id=${blockId}`;
  return apiCall<PaginatedList<BlockNote>>(url);
}

export async function createBlockNote(data: { summary_id: string; block_id: string; text: string; color?: string }): Promise<BlockNote> {
  return apiCall<BlockNote>('/block-notes', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateBlockNote(id: string, data: { text?: string; color?: string }): Promise<BlockNote> {
  return apiCall<BlockNote>(`/block-notes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteBlockNote(id: string): Promise<any> {
  return apiCall(`/block-notes/${id}`, { method: 'DELETE' });
}

// ── Bulk Reading States ─────────────────────────────────────

/**
 * Fetch reading states for a list of known summary IDs.
 *
 * The backend requires `summary_id` (valid UUID) on GET /reading-states —
 * there is no "list all" mode.  So we fan-out one request per summary and
 * run them concurrently with Promise.allSettled (non-blocking on individual
 * failures).
 *
 * Used by useStudyHubProgress for course-level mastery derivation.
 * Returns empty array when summaryIds is empty or on total failure.
 */
export async function getAllReadingStates(
  summaryIds: string[],
): Promise<ReadingState[]> {
  if (summaryIds.length === 0) return [];

  try {
    const results = await Promise.allSettled(
      summaryIds.map(id => getReadingState(id)),
    );

    const states: ReadingState[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        states.push(r.value);
      }
    }
    return states;
  } catch {
    return [];
  }
}
