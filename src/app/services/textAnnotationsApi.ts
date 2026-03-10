// ============================================================
// Axon — Text Annotations API Service (text-annotations CRUD)
//
// Backend: routes-student.tsx → text-annotations
//   GET    /text-annotations?summary_id=xxx
//   POST   /text-annotations
//   PUT    /text-annotations/:id
//   DELETE /text-annotations/:id
//
// Students can highlight text and add notes on summaries.
// Annotations are private to each student (RLS enforced).
//
// Uses apiCall() from lib/api.ts (double-token convention).
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export interface TextAnnotation {
  id: string;
  student_id: string;
  summary_id: string;
  /** The original selected text from the summary */
  selected_text: string;
  /** Student's note/comment on the selection */
  note: string;
  /** Type of annotation */
  annotation_type: 'highlight' | 'note' | 'question';
  /** Highlight color */
  color: 'yellow' | 'blue' | 'green' | 'pink';
  /** Character offset start in the summary chunk */
  start_offset?: number;
  /** Character offset end in the summary chunk */
  end_offset?: number;
  /** Chunk ID within the summary (for long summaries) */
  chunk_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnotationInput {
  summary_id: string;
  selected_text: string;
  note?: string;
  annotation_type?: 'highlight' | 'note' | 'question';
  color?: 'yellow' | 'blue' | 'green' | 'pink';
  start_offset?: number;
  end_offset?: number;
  chunk_id?: string;
}

export interface UpdateAnnotationInput {
  note?: string;
  color?: 'yellow' | 'blue' | 'green' | 'pink';
  annotation_type?: 'highlight' | 'note' | 'question';
}

// ── Helpers ───────────────────────────────────────────────

function unwrapItems(result: unknown): TextAnnotation[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'items' in result) {
    return (result as { items: TextAnnotation[] }).items || [];
  }
  if (result && typeof result === 'object' && 'data' in result) {
    const data = (result as { data: unknown }).data;
    if (Array.isArray(data)) return data;
  }
  return [];
}

// ── API Functions ─────────────────────────────────────────

/**
 * Get all annotations for a summary.
 * Returns annotations by the current student (RLS scoped).
 */
export async function getAnnotationsBySummary(summaryId: string): Promise<TextAnnotation[]> {
  const result = await apiCall<unknown>(`/text-annotations?summary_id=${summaryId}`);
  return unwrapItems(result);
}

/**
 * Create a new text annotation.
 */
export async function createAnnotation(input: CreateAnnotationInput): Promise<TextAnnotation> {
  return apiCall<TextAnnotation>('/text-annotations', {
    method: 'POST',
    body: JSON.stringify({
      summary_id: input.summary_id,
      selected_text: input.selected_text,
      note: input.note || '',
      annotation_type: input.annotation_type || 'highlight',
      color: input.color || 'yellow',
      start_offset: input.start_offset,
      end_offset: input.end_offset,
      chunk_id: input.chunk_id,
    }),
  });
}

/**
 * Update an existing annotation.
 */
export async function updateAnnotation(
  annotationId: string,
  input: UpdateAnnotationInput,
): Promise<TextAnnotation> {
  return apiCall<TextAnnotation>(`/text-annotations/${annotationId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/**
 * Delete an annotation (soft delete).
 */
export async function deleteAnnotation(annotationId: string): Promise<void> {
  await apiCall(`/text-annotations/${annotationId}`, { method: 'DELETE' });
}
