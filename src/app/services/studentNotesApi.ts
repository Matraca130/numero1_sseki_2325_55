// ============================================================
// Axon — Student Notes API Service (kw-student-notes CRUD)
//
// Backend: routes-student.tsx → kw-student-notes
//   GET    /kw-student-notes?keyword_id=xxx
//   POST   /kw-student-notes
//   PUT    /kw-student-notes/:id
//   DELETE /kw-student-notes/:id
//
// Students can create personal notes on keywords during study.
// Notes are private to each student (RLS enforced).
//
// Uses apiCall() from lib/api.ts (double-token convention).
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────

export interface StudentNote {
  id: string;
  student_id: string;
  keyword_id: string;
  content: string;
  note_type: 'note' | 'question' | 'mnemonic';
  created_at: string;
  updated_at: string;
}

export interface CreateStudentNoteInput {
  keyword_id: string;
  content: string;
  note_type?: 'note' | 'question' | 'mnemonic';
}

export interface UpdateStudentNoteInput {
  content?: string;
  note_type?: 'note' | 'question' | 'mnemonic';
}

// ── Helpers ───────────────────────────────────────────

function unwrapItems(result: unknown): StudentNote[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'items' in result) {
    return (result as { items: StudentNote[] }).items || [];
  }
  if (result && typeof result === 'object' && 'data' in result) {
    const data = (result as { data: unknown }).data;
    if (Array.isArray(data)) return data;
  }
  return [];
}

// ── API Functions ─────────────────────────────────────

/**
 * Get all student notes for a keyword.
 * Returns notes created by the current student (RLS scoped).
 */
export async function getNotesByKeyword(keywordId: string): Promise<StudentNote[]> {
  const result = await apiCall<unknown>(`/kw-student-notes?keyword_id=${keywordId}`);
  return unwrapItems(result);
}

/**
 * Get all student notes (no keyword filter).
 * Useful for "My Notes" dashboard view.
 */
export async function getAllNotes(opts?: {
  limit?: number;
  offset?: number;
}): Promise<StudentNote[]> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  const qs = params.toString();
  const result = await apiCall<unknown>(`/kw-student-notes${qs ? `?${qs}` : ''}`);
  return unwrapItems(result);
}

/**
 * Create a new student note on a keyword.
 */
export async function createNote(input: CreateStudentNoteInput): Promise<StudentNote> {
  return apiCall<StudentNote>('/kw-student-notes', {
    method: 'POST',
    body: JSON.stringify({
      keyword_id: input.keyword_id,
      content: input.content,
      note_type: input.note_type || 'note',
    }),
  });
}

/**
 * Update an existing student note.
 */
export async function updateNote(noteId: string, input: UpdateStudentNoteInput): Promise<StudentNote> {
  return apiCall<StudentNote>(`/kw-student-notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/**
 * Delete a student note (soft delete).
 */
export async function deleteNote(noteId: string): Promise<void> {
  await apiCall(`/kw-student-notes/${noteId}`, { method: 'DELETE' });
}
