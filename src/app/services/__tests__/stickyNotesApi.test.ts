// ============================================================
// Unit tests for stickyNotesApi service (adjacent to source).
//
// NOTE: There's a broader contract test at
// src/__tests__/sticky-notes-api-contracts.test.ts covering endpoint
// surface + dead-code audit guards. THIS file is the focused adjacent
// test for URL/body/method/error flows.
//
// Mocks: @/app/lib/api (apiCall)
//
// RUN: npx vitest run src/app/services/__tests__/stickyNotesApi.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

import {
  getStickyNote,
  upsertStickyNote,
  deleteStickyNote,
  type StickyNote,
} from '@/app/services/stickyNotesApi';

const ROW: StickyNote = {
  id: 'sn-1',
  student_id: 'stu-1',
  summary_id: 'sum-1',
  content: 'hello',
  created_at: '2026-04-18T09:00:00Z',
  updated_at: '2026-04-18T09:00:00Z',
};

beforeEach(() => {
  mockApiCall.mockReset();
});

// ══════════════════════════════════════════════════════════════
// getStickyNote
// ══════════════════════════════════════════════════════════════

describe('getStickyNote', () => {
  it('builds URL with encoded summary_id query param', async () => {
    mockApiCall.mockResolvedValueOnce(ROW);
    await getStickyNote('sum-1');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/sticky-notes?summary_id=sum-1');
  });

  it('percent-encodes special chars in summary_id', async () => {
    mockApiCall.mockResolvedValueOnce(null);
    await getStickyNote('a b/c?d&e');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent('a b/c?d&e'));
  });

  it('returns the row when apiCall resolves', async () => {
    mockApiCall.mockResolvedValueOnce(ROW);
    expect(await getStickyNote('sum-1')).toEqual(ROW);
  });

  it('returns null when apiCall resolves to null', async () => {
    mockApiCall.mockResolvedValueOnce(null);
    expect(await getStickyNote('sum-1')).toBeNull();
  });

  it('returns null when apiCall resolves to undefined', async () => {
    mockApiCall.mockResolvedValueOnce(undefined);
    expect(await getStickyNote('sum-1')).toBeNull();
  });

  it('returns null on 404-message error', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('HTTP 404: not found'));
    expect(await getStickyNote('sum-1')).toBeNull();
  });

  it('returns null on status-404 error', async () => {
    mockApiCall.mockRejectedValueOnce(Object.assign(new Error('nf'), { status: 404 }));
    expect(await getStickyNote('sum-1')).toBeNull();
  });

  it('rethrows non-404 errors', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('500 server down'));
    await expect(getStickyNote('sum-1')).rejects.toThrow('500 server down');
  });
});

// ══════════════════════════════════════════════════════════════
// upsertStickyNote
// ══════════════════════════════════════════════════════════════

describe('upsertStickyNote', () => {
  it('POSTs /sticky-notes with JSON body', async () => {
    mockApiCall.mockResolvedValueOnce(ROW);
    await upsertStickyNote({ summary_id: 'sum-1', content: 'hi' });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/sticky-notes');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ summary_id: 'sum-1', content: 'hi' });
  });

  it('preserves empty content (clear-via-empty)', async () => {
    mockApiCall.mockResolvedValueOnce({ ...ROW, content: '' });
    await upsertStickyNote({ summary_id: 'sum-1', content: '' });
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.content).toBe('');
  });

  it('propagates server errors', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('413 too big'));
    await expect(
      upsertStickyNote({ summary_id: 'sum-1', content: 'x' }),
    ).rejects.toThrow('413 too big');
  });
});

// ══════════════════════════════════════════════════════════════
// deleteStickyNote
// ══════════════════════════════════════════════════════════════

describe('deleteStickyNote', () => {
  it('DELETEs /sticky-notes with encoded summary_id query', async () => {
    mockApiCall.mockResolvedValueOnce({ deleted: true });
    await deleteStickyNote('sum-1');
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/sticky-notes?summary_id=sum-1');
    expect(opts.method).toBe('DELETE');
  });

  it('encodes special chars on delete', async () => {
    mockApiCall.mockResolvedValueOnce({ deleted: true });
    await deleteStickyNote('a/b?c');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent('a/b?c'));
  });

  it('returns {deleted:true} envelope from server', async () => {
    mockApiCall.mockResolvedValueOnce({ deleted: true });
    expect(await deleteStickyNote('sum-1')).toEqual({ deleted: true });
  });

  it('propagates server errors', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('403 forbidden'));
    await expect(deleteStickyNote('sum-1')).rejects.toThrow('403 forbidden');
  });
});
