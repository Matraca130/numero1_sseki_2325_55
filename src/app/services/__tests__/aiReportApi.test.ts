// ============================================================
// Unit tests for aiReportApi service.
//
// Covers:
//   - createAiReport (POST /ai/report)
//   - resolveAiReport (PATCH /ai/report/:id)
//   - getAiReportStats (GET /ai/report-stats)
//   - getAiReports (GET /ai/reports with filters)
//   - Display constants integrity
//
// Mocks: @/app/lib/api (apiCall)
//
// RUN: npx vitest run src/app/services/__tests__/aiReportApi.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock apiCall BEFORE importing the service ───────────────
const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

import {
  createAiReport,
  resolveAiReport,
  getAiReportStats,
  getAiReports,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
  type AiContentReport,
  type AiReportStats,
  type AiReportsListResponse,
} from '@/app/services/aiReportApi';

// ── Fixtures ─────────────────────────────────────────────────

const SAMPLE_REPORT: AiContentReport = {
  id: 'rep-1',
  content_type: 'quiz_question',
  content_id: 'q-1',
  reported_by: 'stu-1',
  institution_id: 'inst-1',
  reason: 'incorrect',
  description: 'La respuesta correcta es A no B',
  status: 'pending',
  resolved_by: null,
  resolved_at: null,
  resolution_note: null,
  created_at: '2026-04-18T10:00:00Z',
};

const SAMPLE_STATS: AiReportStats = {
  total_reports: 42,
  pending_count: 12,
  reviewed_count: 5,
  resolved_count: 20,
  dismissed_count: 5,
  reason_incorrect: 30,
  reason_inappropriate: 2,
  reason_low_quality: 5,
  reason_irrelevant: 3,
  reason_other: 2,
  type_quiz_question: 30,
  type_flashcard: 12,
  avg_resolution_hours: 4.2,
  resolution_rate: 0.68,
};

beforeEach(() => {
  mockApiCall.mockReset();
});

// ══════════════════════════════════════════════════════════════
// createAiReport — POST /ai/report
// ══════════════════════════════════════════════════════════════

describe('createAiReport', () => {
  it('calls POST /ai/report with correct URL and method', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_REPORT);
    await createAiReport({
      content_type: 'quiz_question',
      content_id: 'q-1',
      reason: 'incorrect',
    });
    expect(mockApiCall).toHaveBeenCalledTimes(1);
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/ai/report');
    expect(opts.method).toBe('POST');
  });

  it('serializes full body including description', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_REPORT);
    await createAiReport({
      content_type: 'flashcard',
      content_id: 'f-1',
      reason: 'low_quality',
      description: 'muy vago',
    });
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).toEqual({
      content_type: 'flashcard',
      content_id: 'f-1',
      reason: 'low_quality',
      description: 'muy vago',
    });
  });

  it('serializes minimal body without description', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_REPORT);
    await createAiReport({
      content_type: 'quiz_question',
      content_id: 'q-1',
      reason: 'irrelevant',
    });
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.description).toBeUndefined();
  });

  it('returns the created report', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_REPORT);
    const out = await createAiReport({
      content_type: 'quiz_question',
      content_id: 'q-1',
      reason: 'incorrect',
    });
    expect(out).toEqual(SAMPLE_REPORT);
  });

  it('propagates 409 duplicate error', async () => {
    mockApiCall.mockRejectedValueOnce(
      new Error('HTTP 409: duplicate key value violates unique constraint')
    );
    await expect(
      createAiReport({
        content_type: 'quiz_question',
        content_id: 'q-1',
        reason: 'incorrect',
      })
    ).rejects.toThrow('409');
  });

  it('propagates 404 content-not-found error', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('HTTP 404: Content not found'));
    await expect(
      createAiReport({
        content_type: 'flashcard',
        content_id: 'nope',
        reason: 'incorrect',
      })
    ).rejects.toThrow('not found');
  });
});

// ══════════════════════════════════════════════════════════════
// resolveAiReport — PATCH /ai/report/:id
// ══════════════════════════════════════════════════════════════

describe('resolveAiReport', () => {
  it('builds PATCH URL with reportId', async () => {
    mockApiCall.mockResolvedValueOnce({ ...SAMPLE_REPORT, status: 'resolved' });
    await resolveAiReport('rep-abc', { status: 'resolved' });
    const [url, opts] = mockApiCall.mock.calls[0];
    expect(url).toBe('/ai/report/rep-abc');
    expect(opts.method).toBe('PATCH');
  });

  it('serializes body with status and resolution_note', async () => {
    mockApiCall.mockResolvedValueOnce({ ...SAMPLE_REPORT, status: 'dismissed' });
    await resolveAiReport('rep-1', {
      status: 'dismissed',
      resolution_note: 'not a valid complaint',
    });
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).toEqual({
      status: 'dismissed',
      resolution_note: 'not a valid complaint',
    });
  });

  it('serializes body with status only (optional resolution_note)', async () => {
    mockApiCall.mockResolvedValueOnce({ ...SAMPLE_REPORT, status: 'reviewed' });
    await resolveAiReport('rep-1', { status: 'reviewed' });
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.resolution_note).toBeUndefined();
    expect(body.status).toBe('reviewed');
  });

  it('accepts re-opening (any → pending) as a valid transition in the surface', async () => {
    mockApiCall.mockResolvedValueOnce({ ...SAMPLE_REPORT, status: 'pending' });
    await resolveAiReport('rep-1', { status: 'pending' });
    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.status).toBe('pending');
  });

  it('returns the updated report', async () => {
    const updated = {
      ...SAMPLE_REPORT,
      status: 'resolved' as const,
      resolved_by: 'prof-1',
      resolved_at: '2026-04-18T12:00:00Z',
      resolution_note: 'Fixed the question',
    };
    mockApiCall.mockResolvedValueOnce(updated);
    const out = await resolveAiReport('rep-1', {
      status: 'resolved',
      resolution_note: 'Fixed the question',
    });
    expect(out).toEqual(updated);
  });

  it('propagates 403 (non-content-writer attempts PATCH)', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('HTTP 403: forbidden'));
    await expect(
      resolveAiReport('rep-1', { status: 'resolved' })
    ).rejects.toThrow('forbidden');
  });

  it('propagates 404 when reportId does not exist', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('HTTP 404: report not found'));
    await expect(
      resolveAiReport('nope', { status: 'reviewed' })
    ).rejects.toThrow('not found');
  });

  it('encodes reportId into URL path as-is (no double encoding by service)', async () => {
    // Service passes the id directly in template literal; this documents behavior.
    mockApiCall.mockResolvedValueOnce(SAMPLE_REPORT);
    await resolveAiReport('uuid-with-dashes-1234', { status: 'reviewed' });
    expect(mockApiCall.mock.calls[0][0]).toBe('/ai/report/uuid-with-dashes-1234');
  });
});

// ══════════════════════════════════════════════════════════════
// getAiReportStats — GET /ai/report-stats
// ══════════════════════════════════════════════════════════════

describe('getAiReportStats', () => {
  it('builds URL with institution_id query param', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_STATS);
    await getAiReportStats('inst-1');
    expect(mockApiCall).toHaveBeenCalledTimes(1);
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url.startsWith('/ai/report-stats?')).toBe(true);
    expect(url).toContain('institution_id=inst-1');
  });

  it('appends from date when provided', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_STATS);
    await getAiReportStats('inst-1', '2026-01-01');
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).toContain('from=2026-01-01');
  });

  it('appends both from and to when both provided', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_STATS);
    await getAiReportStats('inst-1', '2026-01-01', '2026-04-01');
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).toContain('from=2026-01-01');
    expect(url).toContain('to=2026-04-01');
  });

  it('omits from/to when not provided', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_STATS);
    await getAiReportStats('inst-1');
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).not.toContain('from=');
    expect(url).not.toContain('to=');
  });

  it('appends only to when from is undefined and to is provided', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_STATS);
    await getAiReportStats('inst-1', undefined, '2026-04-01');
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).toContain('to=2026-04-01');
    expect(url).not.toContain('from=');
  });

  it('percent-encodes special chars in institution_id', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_STATS);
    await getAiReportStats('inst with space');
    const url = mockApiCall.mock.calls[0][0] as string;
    // URLSearchParams uses + for spaces
    expect(url).toMatch(/institution_id=inst(\+|%20)with(\+|%20)space/);
  });

  it('returns the stats object', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_STATS);
    const out = await getAiReportStats('inst-1');
    expect(out).toEqual(SAMPLE_STATS);
  });

  it('uses GET (no method option → apiCall default)', async () => {
    mockApiCall.mockResolvedValueOnce(SAMPLE_STATS);
    await getAiReportStats('inst-1');
    // No second argument means no init → GET default in apiCall
    expect(mockApiCall.mock.calls[0].length).toBe(1);
  });

  it('propagates errors from the RPC', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('HTTP 500: RPC failed'));
    await expect(getAiReportStats('inst-1')).rejects.toThrow('RPC failed');
  });
});

// ══════════════════════════════════════════════════════════════
// getAiReports — GET /ai/reports (filters + pagination)
// ══════════════════════════════════════════════════════════════

describe('getAiReports', () => {
  const EMPTY_LIST: AiReportsListResponse = { items: [], total: 0, limit: 20, offset: 0 };
  const LIST_WITH_ITEM: AiReportsListResponse = {
    items: [SAMPLE_REPORT],
    total: 1,
    limit: 20,
    offset: 0,
  };

  it('builds URL with just institution_id when no filters', async () => {
    mockApiCall.mockResolvedValueOnce(EMPTY_LIST);
    await getAiReports({ institution_id: 'inst-1' });
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url.startsWith('/ai/reports?')).toBe(true);
    expect(url).toContain('institution_id=inst-1');
    expect(url).not.toContain('status=');
    expect(url).not.toContain('reason=');
    expect(url).not.toContain('content_type=');
    expect(url).not.toContain('limit=');
    expect(url).not.toContain('offset=');
  });

  it('includes status filter when provided', async () => {
    mockApiCall.mockResolvedValueOnce(LIST_WITH_ITEM);
    await getAiReports({ institution_id: 'inst-1', status: 'pending' });
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).toContain('status=pending');
  });

  it('includes reason filter when provided', async () => {
    mockApiCall.mockResolvedValueOnce(LIST_WITH_ITEM);
    await getAiReports({ institution_id: 'inst-1', reason: 'incorrect' });
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).toContain('reason=incorrect');
  });

  it('includes content_type filter when provided', async () => {
    mockApiCall.mockResolvedValueOnce(LIST_WITH_ITEM);
    await getAiReports({ institution_id: 'inst-1', content_type: 'flashcard' });
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).toContain('content_type=flashcard');
  });

  it('includes limit and offset when provided', async () => {
    mockApiCall.mockResolvedValueOnce(LIST_WITH_ITEM);
    await getAiReports({ institution_id: 'inst-1', limit: 50, offset: 100 });
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).toContain('limit=50');
    expect(url).toContain('offset=100');
  });

  it('combines all filters in a single URL', async () => {
    mockApiCall.mockResolvedValueOnce(LIST_WITH_ITEM);
    await getAiReports({
      institution_id: 'inst-1',
      status: 'resolved',
      reason: 'low_quality',
      content_type: 'quiz_question',
      limit: 10,
      offset: 20,
    });
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).toContain('institution_id=inst-1');
    expect(url).toContain('status=resolved');
    expect(url).toContain('reason=low_quality');
    expect(url).toContain('content_type=quiz_question');
    expect(url).toContain('limit=10');
    expect(url).toContain('offset=20');
  });

  it('omits offset=0 because falsy (documents current behavior)', async () => {
    // The service uses `if (params.offset)` which is falsy for 0 → NOT appended.
    // This test locks that behavior so a refactor that changes it is visible.
    mockApiCall.mockResolvedValueOnce(LIST_WITH_ITEM);
    await getAiReports({ institution_id: 'inst-1', offset: 0 });
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).not.toContain('offset=');
  });

  it('omits limit=0 because falsy (documents current behavior)', async () => {
    mockApiCall.mockResolvedValueOnce(LIST_WITH_ITEM);
    await getAiReports({ institution_id: 'inst-1', limit: 0 });
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).not.toContain('limit=');
  });

  it('returns empty list when backend returns no items', async () => {
    mockApiCall.mockResolvedValueOnce(EMPTY_LIST);
    const out = await getAiReports({ institution_id: 'inst-1' });
    expect(out.items).toEqual([]);
    expect(out.total).toBe(0);
  });

  it('returns paginated response with items', async () => {
    mockApiCall.mockResolvedValueOnce(LIST_WITH_ITEM);
    const out = await getAiReports({ institution_id: 'inst-1' });
    expect(out.items).toHaveLength(1);
    expect(out.items[0]).toEqual(SAMPLE_REPORT);
  });

  it('propagates backend errors', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('HTTP 500: database error'));
    await expect(
      getAiReports({ institution_id: 'inst-1' })
    ).rejects.toThrow('database error');
  });
});

// ══════════════════════════════════════════════════════════════
// Display Constants — sanity checks
// ══════════════════════════════════════════════════════════════

describe('Display Constants', () => {
  it('REPORT_REASON_LABELS covers all 5 reasons', () => {
    expect(Object.keys(REPORT_REASON_LABELS)).toHaveLength(5);
    expect(REPORT_REASON_LABELS.incorrect).toBeTruthy();
    expect(REPORT_REASON_LABELS.inappropriate).toBeTruthy();
    expect(REPORT_REASON_LABELS.low_quality).toBeTruthy();
    expect(REPORT_REASON_LABELS.irrelevant).toBeTruthy();
    expect(REPORT_REASON_LABELS.other).toBeTruthy();
  });

  it('REPORT_STATUS_LABELS covers all 4 statuses', () => {
    expect(Object.keys(REPORT_STATUS_LABELS)).toHaveLength(4);
    expect(REPORT_STATUS_LABELS.pending).toBeTruthy();
    expect(REPORT_STATUS_LABELS.reviewed).toBeTruthy();
    expect(REPORT_STATUS_LABELS.resolved).toBeTruthy();
    expect(REPORT_STATUS_LABELS.dismissed).toBeTruthy();
  });

  it('REPORT_STATUS_COLORS covers all 4 statuses with tailwind classes', () => {
    expect(Object.keys(REPORT_STATUS_COLORS)).toHaveLength(4);
    // Each value should be a tailwind-ish class string
    expect(REPORT_STATUS_COLORS.pending).toContain('amber');
    expect(REPORT_STATUS_COLORS.reviewed).toContain('blue');
    expect(REPORT_STATUS_COLORS.resolved).toContain('emerald');
    expect(REPORT_STATUS_COLORS.dismissed).toContain('zinc');
  });
});
