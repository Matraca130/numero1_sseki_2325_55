// ============================================================
// Unit tests for studentSummariesApi service
//
// Covers URL construction, method, body, query params, error handling,
// and special cases (404 fallback, paginated normalization, supabase RPC
// branch for block_id annotations).
//
// Mocks:
//   - @/app/lib/api (apiCall)
//   - @/app/lib/supabase (for create_text_annotation RPC branch)
//
// RUN: npx vitest run src/app/services/__tests__/studentSummariesApi.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock apiCall BEFORE importing the service ───────────────
const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

// Mock supabase (dynamic import inside createTextAnnotation when block_id provided)
const mockSupabaseRpc = vi.fn();
vi.mock('@/app/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockSupabaseRpc(...args),
  },
}));

import {
  getReadingState,
  upsertReadingState,
  getTextAnnotations,
  createTextAnnotation,
  updateTextAnnotation,
  deleteTextAnnotation,
  getKwStudentNotes,
  createKwStudentNote,
  updateKwStudentNote,
  deleteKwStudentNote,
  getVideoNotes,
  createVideoNote,
  updateVideoNote,
  deleteVideoNote,
  getBlockBookmarks,
  createBlockBookmark,
  deleteBlockBookmark,
  getBlockNotes,
  createBlockNote,
  updateBlockNote,
  deleteBlockNote,
  getAllReadingStates,
  type ReadingState,
  type TextAnnotation,
} from '@/app/services/studentSummariesApi';

const SAMPLE_READING_STATE: ReadingState = {
  id: 'rs-1',
  student_id: 'stu-1',
  summary_id: 'sum-1',
  scroll_position: 50,
  time_spent_seconds: 300,
  completed: false,
  last_read_at: '2026-04-18T10:00:00Z',
  created_at: '2026-04-18T09:00:00Z',
  updated_at: '2026-04-18T10:00:00Z',
};

const SAMPLE_ANNOTATION: TextAnnotation = {
  id: 'ann-1',
  student_id: 'stu-1',
  summary_id: 'sum-1',
  start_offset: 10,
  end_offset: 20,
  color: 'yellow',
  note: 'important',
  created_at: '2026-04-18T09:00:00Z',
  updated_at: '2026-04-18T09:00:00Z',
};

beforeEach(() => {
  mockApiCall.mockReset();
  mockSupabaseRpc.mockReset();
});

// ══════════════════════════════════════════════════════════════
// getReadingState
// ══════════════════════════════════════════════════════════════

describe('getReadingState', () => {
  it('GETs /reading-states with summary_id query param', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [SAMPLE_READING_STATE], total: 1, limit: 10, offset: 0 });
    await getReadingState('sum-1');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/reading-states?summary_id=sum-1');
  });

  it('returns first item of paginated response', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [SAMPLE_READING_STATE], total: 1, limit: 10, offset: 0 });
    const result = await getReadingState('sum-1');
    expect(result).toEqual(SAMPLE_READING_STATE);
  });

  it('returns null when items array is empty', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 10, offset: 0 });
    const result = await getReadingState('sum-1');
    expect(result).toBeNull();
  });

  it('handles plain array response', async () => {
    mockApiCall.mockResolvedValueOnce([SAMPLE_READING_STATE]);
    const result = await getReadingState('sum-1');
    expect(result).toEqual(SAMPLE_READING_STATE);
  });

  it('handles direct object response', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_READING_STATE);
    const result = await getReadingState('sum-1');
    expect(result).toEqual(SAMPLE_READING_STATE);
  });

  it('returns null on 404 error (message-based)', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('HTTP 404: not found'));
    const result = await getReadingState('sum-1');
    expect(result).toBeNull();
  });

  it('returns null on 404 error (status-based)', async () => {
    const err = Object.assign(new Error('not found'), { status: 404 });
    mockApiCall.mockRejectedValueOnce(err);
    const result = await getReadingState('sum-1');
    expect(result).toBeNull();
  });

  it('rethrows non-404 errors', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Network down'));
    await expect(getReadingState('sum-1')).rejects.toThrow('Network down');
  });
});

// ══════════════════════════════════════════════════════════════
// upsertReadingState
// ══════════════════════════════════════════════════════════════

describe('upsertReadingState', () => {
  it('POSTs to /reading-states with JSON body', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_READING_STATE);
    await upsertReadingState({
      summary_id: 'sum-1',
      scroll_position: 60,
      time_spent_seconds: 400,
      completed: true,
      last_read_at: '2026-04-18T11:00:00Z',
    });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/reading-states');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({
      summary_id: 'sum-1',
      scroll_position: 60,
      time_spent_seconds: 400,
      completed: true,
      last_read_at: '2026-04-18T11:00:00Z',
    });
  });

  it('propagates server errors', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('boom'));
    await expect(upsertReadingState({ summary_id: 'sum-1' })).rejects.toThrow('boom');
  });
});

// ══════════════════════════════════════════════════════════════
// Text Annotations
// ══════════════════════════════════════════════════════════════

describe('getTextAnnotations', () => {
  it('GETs /text-annotations?summary_id=...', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [SAMPLE_ANNOTATION], total: 1, limit: 50, offset: 0 });
    const result = await getTextAnnotations('sum-1');
    expect(mockApiCall.mock.calls[0][0]).toBe('/text-annotations?summary_id=sum-1');
    expect(result.items).toHaveLength(1);
  });
});

describe('createTextAnnotation', () => {
  it('POSTs via apiCall when block_id is NOT provided', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_ANNOTATION);
    await createTextAnnotation({
      summary_id: 'sum-1',
      start_offset: 10,
      end_offset: 20,
      color: 'yellow',
      note: 'hi',
    });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/text-annotations');
    expect(opts.method).toBe('POST');
    expect(mockSupabaseRpc).not.toHaveBeenCalled();
  });

  it('uses supabase.rpc(create_text_annotation) when block_id is provided', async () => {
    mockSupabaseRpc.mockResolvedValueOnce({ data: SAMPLE_ANNOTATION, error: null });
    const result = await createTextAnnotation({
      summary_id: 'sum-1',
      start_offset: 10,
      end_offset: 20,
      color: 'red',
      note: 'x',
      block_id: 'blk-1',
    });
    expect(mockSupabaseRpc).toHaveBeenCalledWith('create_text_annotation', {
      p_summary_id: 'sum-1',
      p_start_offset: 10,
      p_end_offset: 20,
      p_color: 'red',
      p_note: 'x',
      p_block_id: 'blk-1',
    });
    expect(mockApiCall).not.toHaveBeenCalled();
    expect(result).toEqual(SAMPLE_ANNOTATION);
  });

  it('defaults color=yellow and note=null in RPC when omitted', async () => {
    mockSupabaseRpc.mockResolvedValueOnce({ data: SAMPLE_ANNOTATION, error: null });
    await createTextAnnotation({
      summary_id: 'sum-1',
      start_offset: 0,
      end_offset: 5,
      block_id: 'blk-1',
    });
    const args = mockSupabaseRpc.mock.calls[0][1];
    expect(args.p_color).toBe('yellow');
    expect(args.p_note).toBeNull();
  });

  it('throws with RPC error message when supabase returns error', async () => {
    mockSupabaseRpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });
    await expect(
      createTextAnnotation({
        summary_id: 'sum-1',
        start_offset: 0,
        end_offset: 5,
        block_id: 'blk-1',
      }),
    ).rejects.toThrow('rpc failed');
  });
});

describe('updateTextAnnotation', () => {
  it('PUTs /text-annotations/:id with JSON body', async () => {
    mockApiCall.mockResolvedValueOnce({ ...SAMPLE_ANNOTATION, color: 'green' });
    await updateTextAnnotation('ann-1', { color: 'green', note: 'updated' });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/text-annotations/ann-1');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body)).toEqual({ color: 'green', note: 'updated' });
  });
});

describe('deleteTextAnnotation', () => {
  it('DELETEs /text-annotations/:id', async () => {
    mockApiCall.mockResolvedValueOnce({ deleted: true });
    await deleteTextAnnotation('ann-1');
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/text-annotations/ann-1');
    expect(opts.method).toBe('DELETE');
  });
});

// ══════════════════════════════════════════════════════════════
// Keyword Student Notes
// ══════════════════════════════════════════════════════════════

describe('Keyword Student Notes', () => {
  it('GETs /kw-student-notes with keyword_id query', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 10, offset: 0 });
    await getKwStudentNotes('kw-1');
    expect(mockApiCall.mock.calls[0][0]).toBe('/kw-student-notes?keyword_id=kw-1');
  });

  it('POSTs a new kw note', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'kn-1' });
    await createKwStudentNote({ keyword_id: 'kw-1', note: 'hello' });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/kw-student-notes');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ keyword_id: 'kw-1', note: 'hello' });
  });

  it('PUTs an existing kw note by id', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'kn-1', note: 'new' });
    await updateKwStudentNote('kn-1', { note: 'new' });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/kw-student-notes/kn-1');
    expect(opts.method).toBe('PUT');
  });

  it('DELETEs a kw note by id', async () => {
    mockApiCall.mockResolvedValueOnce(undefined);
    await deleteKwStudentNote('kn-1');
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/kw-student-notes/kn-1');
    expect(opts.method).toBe('DELETE');
  });
});

// ══════════════════════════════════════════════════════════════
// Video Notes
// ══════════════════════════════════════════════════════════════

describe('Video Notes', () => {
  it('GETs /video-notes with video_id query', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 10, offset: 0 });
    await getVideoNotes('vid-1');
    expect(mockApiCall.mock.calls[0][0]).toBe('/video-notes?video_id=vid-1');
  });

  it('POSTs a new video note with optional timestamp', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'vn-1' });
    await createVideoNote({ video_id: 'vid-1', timestamp_seconds: 42, note: 'aha' });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/video-notes');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({
      video_id: 'vid-1',
      timestamp_seconds: 42,
      note: 'aha',
    });
  });

  it('PUTs + DELETEs a video note by id', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'vn-1', note: 'u' });
    await updateVideoNote('vn-1', { note: 'u' });
    expect(mockApiCall.mock.calls[0][0]).toBe('/video-notes/vn-1');
    expect(mockApiCall.mock.calls[0][1].method).toBe('PUT');

    mockApiCall.mockResolvedValueOnce(undefined);
    await deleteVideoNote('vn-1');
    expect(mockApiCall.mock.calls[1][0]).toBe('/video-notes/vn-1');
    expect(mockApiCall.mock.calls[1][1].method).toBe('DELETE');
  });
});

// ══════════════════════════════════════════════════════════════
// Block Bookmarks & Notes
// ══════════════════════════════════════════════════════════════

describe('Block Bookmarks', () => {
  it('GETs /block-bookmarks with summary_id', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 10, offset: 0 });
    await getBlockBookmarks('sum-1');
    expect(mockApiCall.mock.calls[0][0]).toBe('/block-bookmarks?summary_id=sum-1');
  });

  it('POSTs a new bookmark and DELETEs by id', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'bm-1' });
    await createBlockBookmark({ summary_id: 'sum-1', block_id: 'blk-1' });
    expect(mockApiCall.mock.calls[0][0]).toBe('/block-bookmarks');
    expect(JSON.parse(mockApiCall.mock.calls[0][1].body)).toEqual({
      summary_id: 'sum-1',
      block_id: 'blk-1',
    });

    mockApiCall.mockResolvedValueOnce({ deleted: true });
    await deleteBlockBookmark('bm-1');
    expect(mockApiCall.mock.calls[1][0]).toBe('/block-bookmarks/bm-1');
    expect(mockApiCall.mock.calls[1][1].method).toBe('DELETE');
  });
});

describe('Block Notes', () => {
  it('GETs /block-notes with summary_id only when block_id omitted', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 10, offset: 0 });
    await getBlockNotes('sum-1');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/block-notes?summary_id=sum-1');
    expect(url).not.toContain('block_id=');
  });

  it('GETs /block-notes with summary_id AND block_id when both provided', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [], total: 0, limit: 10, offset: 0 });
    await getBlockNotes('sum-1', 'blk-1');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('summary_id=sum-1');
    expect(url).toContain('block_id=blk-1');
  });

  it('POSTs, PUTs, DELETEs block notes correctly', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'bn-1' });
    await createBlockNote({ summary_id: 'sum-1', block_id: 'blk-1', text: 't', color: 'blue' });
    const postBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(postBody).toEqual({ summary_id: 'sum-1', block_id: 'blk-1', text: 't', color: 'blue' });

    mockApiCall.mockResolvedValueOnce({ id: 'bn-1' });
    await updateBlockNote('bn-1', { text: 'u' });
    expect(mockApiCall.mock.calls[1][0]).toBe('/block-notes/bn-1');
    expect(mockApiCall.mock.calls[1][1].method).toBe('PUT');

    mockApiCall.mockResolvedValueOnce(undefined);
    await deleteBlockNote('bn-1');
    expect(mockApiCall.mock.calls[2][0]).toBe('/block-notes/bn-1');
    expect(mockApiCall.mock.calls[2][1].method).toBe('DELETE');
  });
});

// ══════════════════════════════════════════════════════════════
// getAllReadingStates — fan-out + Promise.allSettled
// ══════════════════════════════════════════════════════════════

describe('getAllReadingStates', () => {
  it('returns empty array when summaryIds is empty', async () => {
    const result = await getAllReadingStates([]);
    expect(result).toEqual([]);
    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it('fans out one apiCall per summaryId', async () => {
    mockApiCall
      .mockResolvedValueOnce({ items: [SAMPLE_READING_STATE], total: 1, limit: 10, offset: 0 })
      .mockResolvedValueOnce({ items: [{ ...SAMPLE_READING_STATE, summary_id: 'sum-2' }], total: 1, limit: 10, offset: 0 });
    const result = await getAllReadingStates(['sum-1', 'sum-2']);
    expect(mockApiCall).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('skips failed requests without throwing (Promise.allSettled behaviour)', async () => {
    mockApiCall
      .mockResolvedValueOnce({ items: [SAMPLE_READING_STATE], total: 1, limit: 10, offset: 0 })
      .mockRejectedValueOnce(new Error('Network down'));
    const result = await getAllReadingStates(['sum-1', 'sum-2']);
    expect(result).toHaveLength(1);
    expect(result[0].summary_id).toBe('sum-1');
  });

  it('skips null/missing items (404 converted to null by getReadingState)', async () => {
    mockApiCall
      .mockResolvedValueOnce({ items: [], total: 0, limit: 10, offset: 0 })
      .mockResolvedValueOnce({ items: [SAMPLE_READING_STATE], total: 1, limit: 10, offset: 0 });
    const result = await getAllReadingStates(['sum-1', 'sum-2']);
    expect(result).toHaveLength(1);
  });
});
