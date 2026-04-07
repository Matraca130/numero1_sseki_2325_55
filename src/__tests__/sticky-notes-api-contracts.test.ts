// ============================================================
// Sticky Notes API Contract Guards
//
// PURPOSE: Verify the stickyNotesApi service constructs the correct
// URLs and payloads for /sticky-notes endpoints, without making real
// network requests.
//
// GUARDS AGAINST:
//   - URL construction bugs (encoding, query params)
//   - Method mismatch (GET/POST/DELETE)
//   - Payload shape changes that would break the backend contract
//   - Reintroducing the dead 404-handling code that the audit removed (Q3)
//
// APPROACH: Mock apiCall() and inspect URL/options. No network.
//
// RUN: npx vitest run src/__tests__/sticky-notes-api-contracts.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock apiCall BEFORE importing the service ────────────
const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: any[]) => mockApiCall(...args),
}));

import {
  getStickyNote,
  upsertStickyNote,
  deleteStickyNote,
  type StickyNote,
} from '@/app/services/stickyNotesApi';

const SAMPLE_ROW: StickyNote = {
  id: '11111111-1111-1111-1111-111111111111',
  student_id: '22222222-2222-2222-2222-222222222222',
  summary_id: '33333333-3333-3333-3333-333333333333',
  content: 'sample text',
  created_at: '2026-04-07T10:00:00Z',
  updated_at: '2026-04-07T10:00:00Z',
};

beforeEach(() => {
  mockApiCall.mockReset();
});

// ══════════════════════════════════════════════════════════════
// getStickyNote — URL construction + null handling
// ══════════════════════════════════════════════════════════════

describe('getStickyNote', () => {
  it('uses flat /sticky-notes route with summary_id query param', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_ROW);
    await getStickyNote('sum-123');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('/sticky-notes?');
    expect(url).toContain('summary_id=sum-123');
    expect(url).not.toMatch(/\/summaries\//);
  });

  it('URL-encodes the summary_id', async () => {
    mockApiCall.mockResolvedValueOnce(null);
    // A pathological id with reserved chars — must round-trip safely.
    await getStickyNote('a/b c?d&e');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent('a/b c?d&e'));
    expect(url).not.toContain('a/b c?d&e'); // raw form should NOT appear
  });

  it('uses GET (no options object with method)', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_ROW);
    await getStickyNote('sum-123');
    // First call's args: only the URL (no second arg, or if present, no method)
    const args = mockApiCall.mock.calls[0];
    if (args.length > 1 && args[1]) {
      expect(args[1].method).toBeUndefined();
    }
  });

  it('returns the row when apiCall resolves to a row', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_ROW);
    const result = await getStickyNote('sum-123');
    expect(result).toEqual(SAMPLE_ROW);
  });

  it('returns null when apiCall resolves to null (no row exists)', async () => {
    mockApiCall.mockResolvedValueOnce(null);
    const result = await getStickyNote('sum-123');
    expect(result).toBeNull();
  });

  it('does NOT swallow network errors (the dead 404-fallback was removed in audit Q3)', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Network down'));
    await expect(getStickyNote('sum-123')).rejects.toThrow('Network down');
  });
});

// ══════════════════════════════════════════════════════════════
// upsertStickyNote — URL, method, body
// ══════════════════════════════════════════════════════════════

describe('upsertStickyNote', () => {
  it('POSTs to /sticky-notes (no query string, no path nesting)', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_ROW);
    await upsertStickyNote({ summary_id: 'sum-123', content: 'hello' });
    const url: string = mockApiCall.mock.calls[0][0];
    const opts = mockApiCall.mock.calls[0][1];
    expect(url).toBe('/sticky-notes');
    expect(opts).toBeDefined();
    expect(opts.method).toBe('POST');
  });

  it('serializes body as JSON with summary_id and content', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_ROW);
    await upsertStickyNote({ summary_id: 'sum-456', content: 'note text' });
    const opts = mockApiCall.mock.calls[0][1];
    expect(typeof opts.body).toBe('string');
    const parsed = JSON.parse(opts.body);
    expect(parsed).toEqual({ summary_id: 'sum-456', content: 'note text' });
  });

  it('returns the upserted row from the server', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_ROW);
    const result = await upsertStickyNote({
      summary_id: 'sum-123',
      content: 'x',
    });
    expect(result).toEqual(SAMPLE_ROW);
  });

  it('preserves an empty content string in the payload (clear-via-empty case)', async () => {
    mockApiCall.mockResolvedValueOnce({ ...SAMPLE_ROW, content: '' });
    await upsertStickyNote({ summary_id: 'sum-123', content: '' });
    const opts = mockApiCall.mock.calls[0][1];
    const parsed = JSON.parse(opts.body);
    expect(parsed.content).toBe('');
  });

  it('propagates server errors (no swallow)', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('content exceeds max length (20000)'));
    await expect(
      upsertStickyNote({ summary_id: 'sum-123', content: 'x'.repeat(20001) }),
    ).rejects.toThrow(/max length/);
  });
});

// ══════════════════════════════════════════════════════════════
// deleteStickyNote — URL, method, idempotency
// ══════════════════════════════════════════════════════════════

describe('deleteStickyNote', () => {
  it('DELETEs /sticky-notes with summary_id query param', async () => {
    mockApiCall.mockResolvedValueOnce({ deleted: true });
    await deleteStickyNote('sum-123');
    const url: string = mockApiCall.mock.calls[0][0];
    const opts = mockApiCall.mock.calls[0][1];
    expect(url).toContain('/sticky-notes?');
    expect(url).toContain('summary_id=sum-123');
    expect(opts.method).toBe('DELETE');
  });

  it('URL-encodes the summary_id on DELETE', async () => {
    mockApiCall.mockResolvedValueOnce({ deleted: true });
    await deleteStickyNote('a/b c?d');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain(encodeURIComponent('a/b c?d'));
  });

  it('returns the {deleted: true} envelope from the server', async () => {
    mockApiCall.mockResolvedValueOnce({ deleted: true });
    const result = await deleteStickyNote('sum-123');
    expect(result).toEqual({ deleted: true });
  });

  it('propagates server errors (no swallow)', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('boom'));
    await expect(deleteStickyNote('sum-123')).rejects.toThrow('boom');
  });
});

// ══════════════════════════════════════════════════════════════
// Endpoint surface — guard against accidental new endpoints
// ══════════════════════════════════════════════════════════════

describe('endpoint surface', () => {
  it('only exports get / upsert / delete', async () => {
    const mod = await import('@/app/services/stickyNotesApi');
    const fns = Object.keys(mod).filter(
      (k) => typeof (mod as any)[k] === 'function',
    );
    expect(fns.sort()).toEqual(
      ['deleteStickyNote', 'getStickyNote', 'upsertStickyNote'].sort(),
    );
  });
});
