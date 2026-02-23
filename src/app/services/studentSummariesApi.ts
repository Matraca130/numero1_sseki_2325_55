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

// ── Types ─────────────────────────────────────────────────

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

// ── Reading States ────────────────────────────────────────

export async function getReadingState(summaryId: string): Promise<ReadingState | null> {
  try {
    const result = await apiCall<ReadingState | null>(`/reading-states?summary_id=${summaryId}`);
    return result;
  } catch (err: any) {
    if (err.message?.includes('404') || err.status === 404) return null;
    throw err;
  }
}

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

// ── Text Annotations ──────────────────────────────────────

export async function getTextAnnotations(summaryId: string): Promise<PaginatedList<TextAnnotation>> {
  return apiCall<PaginatedList<TextAnnotation>>(`/text-annotations?summary_id=${summaryId}`);
}

export async function createTextAnnotation(data: {
  summary_id: string;
  start_offset: number;
  end_offset: number;
  color?: string;
  note?: string;
}): Promise<TextAnnotation> {
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

// ── Keyword Student Notes ─────────────────────────────────

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

// ── Video Notes ───────────────────────────────────────────

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
