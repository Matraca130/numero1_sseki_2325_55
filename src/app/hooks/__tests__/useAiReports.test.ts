// ============================================================
// Unit tests for useAiReports hook.
//
// Coverage:
//   - fetchReports: guards (no institutionId, concurrent), loading state,
//     success + error paths, filter/offset overrides
//   - fetchStats: non-blocking failures, success path
//   - fetchAll: parallel dispatch
//   - submitReport: happy path, list insertion rules, duplicate 409 mapping
//   - resolveOrDismiss: optimistic update + server replacement + revert on error
//   - Pagination: goToPage, nextPage, prevPage, boundary clamping
//   - updateFilters: resets offset, triggers fetch
//   - Computed: currentPage, totalPages, hasNextPage, hasPrevPage
//
// Mocks: @/app/services/aiService (reportContent, resolveReport,
//                                   getReportStats, getReports)
//
// RUN: npx vitest run src/app/hooks/__tests__/useAiReports.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mocks BEFORE imports ────────────────────────────────────

const mockReportContent = vi.fn();
const mockResolveReport = vi.fn();
const mockGetReportStats = vi.fn();
const mockGetReports = vi.fn();

vi.mock('@/app/services/aiService', () => ({
  reportContent: (...args: unknown[]) => mockReportContent(...args),
  resolveReport: (...args: unknown[]) => mockResolveReport(...args),
  getReportStats: (...args: unknown[]) => mockGetReportStats(...args),
  getReports: (...args: unknown[]) => mockGetReports(...args),
}));

import { useAiReports } from '@/app/hooks/useAiReports';
import type { AiContentReport, ReportStats } from '@/app/services/aiService';

// ── Fixtures ─────────────────────────────────────────────────

const REPORT_1: AiContentReport = {
  id: 'rep-1',
  content_type: 'quiz_question',
  content_id: 'q-1',
  reported_by: 'stu-1',
  institution_id: 'inst-1',
  reason: 'incorrect',
  description: null,
  status: 'pending',
  resolved_by: null,
  resolved_at: null,
  resolution_note: null,
  created_at: '2026-04-18T10:00:00Z',
  updated_at: '2026-04-18T10:00:00Z',
};

const REPORT_2: AiContentReport = { ...REPORT_1, id: 'rep-2', content_id: 'q-2' };
const REPORT_3: AiContentReport = { ...REPORT_1, id: 'rep-3', content_id: 'q-3' };

const STATS: ReportStats = {
  total_reports: 3,
  pending_count: 3,
  reviewed_count: 0,
  resolved_count: 0,
  dismissed_count: 0,
  reason_incorrect: 3,
  reason_inappropriate: 0,
  reason_low_quality: 0,
  reason_irrelevant: 0,
  reason_other: 0,
  type_quiz_question: 3,
  type_flashcard: 0,
  avg_resolution_hours: 0,
  resolution_rate: 0,
};

// ── Setup ────────────────────────────────────────────────────

beforeEach(() => {
  mockReportContent.mockReset();
  mockResolveReport.mockReset();
  mockGetReportStats.mockReset();
  mockGetReports.mockReset();
});

// ══════════════════════════════════════════════════════════════
// Initial state
// ══════════════════════════════════════════════════════════════

describe('useAiReports — initial state', () => {
  it('starts in idle phase with no reports/stats', () => {
    const { result } = renderHook(() => useAiReports('inst-1'));
    expect(result.current.phase).toBe('idle');
    expect(result.current.reports).toEqual([]);
    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('starts with default pagination (limit=20, offset=0, total=0)', () => {
    const { result } = renderHook(() => useAiReports('inst-1'));
    expect(result.current.pagination).toEqual({ limit: 20, offset: 0, total: 0 });
  });

  it('computed values reflect empty state', () => {
    const { result } = renderHook(() => useAiReports('inst-1'));
    expect(result.current.currentPage).toBe(0);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPrevPage).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// fetchReports
// ══════════════════════════════════════════════════════════════

describe('fetchReports', () => {
  it('no-ops when institutionId is empty', async () => {
    const { result } = renderHook(() => useAiReports(''));
    await act(async () => {
      await result.current.fetchReports();
    });
    expect(mockGetReports).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('idle');
  });

  it('sets phase=loading then phase=ready on success', async () => {
    mockGetReports.mockResolvedValueOnce({
      items: [REPORT_1, REPORT_2],
      total: 2,
      limit: 20,
      offset: 0,
    });
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchReports();
    });
    expect(result.current.phase).toBe('ready');
    expect(result.current.reports).toHaveLength(2);
    expect(result.current.pagination.total).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('calls getReports with institutionId + current pagination + filters', async () => {
    mockGetReports.mockResolvedValueOnce({ items: [], total: 0, limit: 20, offset: 0 });
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchReports();
    });
    expect(mockGetReports).toHaveBeenCalledWith('inst-1', {
      status: undefined,
      reason: undefined,
      contentType: undefined,
      limit: 20,
      offset: 0,
    });
  });

  it('accepts overrideFilters and overrideOffset', async () => {
    mockGetReports.mockResolvedValueOnce({ items: [], total: 0, limit: 20, offset: 40 });
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchReports(
        { status: 'resolved', reason: 'incorrect', contentType: 'flashcard' },
        40
      );
    });
    expect(mockGetReports).toHaveBeenCalledWith('inst-1', {
      status: 'resolved',
      reason: 'incorrect',
      contentType: 'flashcard',
      limit: 20,
      offset: 40,
    });
  });

  it('sets phase=error and stores message on failure', async () => {
    mockGetReports.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchReports();
    });
    expect(result.current.phase).toBe('error');
    expect(result.current.error).toBe('boom');
  });

  it('falls back to generic error message when err.message is missing', async () => {
    mockGetReports.mockRejectedValueOnce({});
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchReports();
    });
    expect(result.current.error).toBe('Error al cargar reportes');
  });

  it('guards against concurrent fetches (fetchingRef)', async () => {
    let resolveFirst: (v: any) => void = () => {};
    mockGetReports.mockImplementationOnce(
      () => new Promise((r) => { resolveFirst = r; })
    );
    const { result } = renderHook(() => useAiReports('inst-1'));

    // Start first fetch (doesn't resolve)
    act(() => {
      result.current.fetchReports();
    });
    // Attempt second fetch — should be no-op'd
    await act(async () => {
      await result.current.fetchReports();
    });
    expect(mockGetReports).toHaveBeenCalledTimes(1);

    // Resolve the first one for cleanup
    await act(async () => {
      resolveFirst({ items: [], total: 0, limit: 20, offset: 0 });
    });
  });

  it('updates pagination offset + total from server response', async () => {
    mockGetReports.mockResolvedValueOnce({
      items: [REPORT_1],
      total: 99,
      limit: 20,
      offset: 60,
    });
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchReports(undefined, 60);
    });
    expect(result.current.pagination.offset).toBe(60);
    expect(result.current.pagination.total).toBe(99);
  });
});

// ══════════════════════════════════════════════════════════════
// fetchStats
// ══════════════════════════════════════════════════════════════

describe('fetchStats', () => {
  it('no-ops when institutionId is empty', async () => {
    const { result } = renderHook(() => useAiReports(''));
    await act(async () => {
      await result.current.fetchStats();
    });
    expect(mockGetReportStats).not.toHaveBeenCalled();
    expect(result.current.stats).toBeNull();
  });

  it('stores stats on success', async () => {
    mockGetReportStats.mockResolvedValueOnce(STATS);
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchStats();
    });
    expect(result.current.stats).toEqual(STATS);
  });

  it('passes date range to service when provided', async () => {
    mockGetReportStats.mockResolvedValueOnce(STATS);
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchStats({ from: '2026-01-01', to: '2026-04-01' });
    });
    expect(mockGetReportStats).toHaveBeenCalledWith(
      'inst-1',
      { from: '2026-01-01', to: '2026-04-01' }
    );
  });

  it('swallows errors (non-blocking) — stats stays null, phase unchanged', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetReportStats.mockRejectedValueOnce(new Error('stats error'));
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchStats();
    });
    expect(result.current.stats).toBeNull();
    expect(result.current.phase).toBe('idle');
    expect(result.current.error).toBeNull();
    spy.mockRestore();
  });
});

// ══════════════════════════════════════════════════════════════
// fetchAll
// ══════════════════════════════════════════════════════════════

describe('fetchAll', () => {
  it('dispatches fetchReports + fetchStats in parallel', async () => {
    mockGetReports.mockResolvedValueOnce({ items: [REPORT_1], total: 1, limit: 20, offset: 0 });
    mockGetReportStats.mockResolvedValueOnce(STATS);

    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchAll();
    });
    expect(mockGetReports).toHaveBeenCalledTimes(1);
    expect(mockGetReportStats).toHaveBeenCalledTimes(1);
    expect(result.current.reports).toHaveLength(1);
    expect(result.current.stats).toEqual(STATS);
  });

  it('propagates date range to stats only', async () => {
    mockGetReports.mockResolvedValueOnce({ items: [], total: 0, limit: 20, offset: 0 });
    mockGetReportStats.mockResolvedValueOnce(STATS);
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchAll({ from: '2026-01-01' });
    });
    expect(mockGetReportStats).toHaveBeenCalledWith('inst-1', { from: '2026-01-01' });
  });
});

// ══════════════════════════════════════════════════════════════
// submitReport
// ══════════════════════════════════════════════════════════════

describe('submitReport', () => {
  it('prepends new report to list when no status filter', async () => {
    mockReportContent.mockResolvedValueOnce(REPORT_3);
    const { result } = renderHook(() => useAiReports('inst-1'));

    // Seed the list with REPORT_1
    mockGetReports.mockResolvedValueOnce({
      items: [REPORT_1],
      total: 1,
      limit: 20,
      offset: 0,
    });
    await act(async () => {
      await result.current.fetchReports();
    });

    await act(async () => {
      await result.current.submitReport({
        contentType: 'quiz_question',
        contentId: 'q-3',
        reason: 'incorrect',
      });
    });
    expect(result.current.reports[0].id).toBe('rep-3');
    expect(result.current.reports).toHaveLength(2);
    expect(result.current.pagination.total).toBe(2);
  });

  it('prepends when filters.status === "pending"', async () => {
    mockReportContent.mockResolvedValueOnce(REPORT_3);
    mockGetReports.mockResolvedValueOnce({
      items: [REPORT_1],
      total: 1,
      limit: 20,
      offset: 0,
    });
    const { result } = renderHook(() => useAiReports('inst-1'));
    // Set the filter to pending
    await act(async () => {
      result.current.updateFilters({ status: 'pending' });
    });
    await act(async () => {
      await result.current.submitReport({
        contentType: 'quiz_question',
        contentId: 'q-3',
        reason: 'incorrect',
      });
    });
    expect(result.current.reports[0].id).toBe('rep-3');
  });

  it('does NOT prepend when filters.status differs from "pending"', async () => {
    mockReportContent.mockResolvedValueOnce(REPORT_3);
    mockGetReports.mockResolvedValueOnce({
      items: [REPORT_1],
      total: 1,
      limit: 20,
      offset: 0,
    });
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      result.current.updateFilters({ status: 'resolved' });
    });
    const initialCount = result.current.reports.length;
    await act(async () => {
      await result.current.submitReport({
        contentType: 'quiz_question',
        contentId: 'q-3',
        reason: 'incorrect',
      });
    });
    // List count unchanged because report wouldn't match the active filter
    expect(result.current.reports.length).toBe(initialCount);
  });

  it('returns the created report on success', async () => {
    mockReportContent.mockResolvedValueOnce(REPORT_3);
    const { result } = renderHook(() => useAiReports('inst-1'));
    let submitted: AiContentReport | null = null;
    await act(async () => {
      submitted = await result.current.submitReport({
        contentType: 'quiz_question',
        contentId: 'q-3',
        reason: 'incorrect',
      });
    });
    expect(submitted).toEqual(REPORT_3);
  });

  it('maps 409 error to Spanish "Ya has reportado..." message', async () => {
    mockReportContent.mockRejectedValueOnce(new Error('HTTP 409: duplicate'));
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await expect(
        result.current.submitReport({
          contentType: 'quiz_question',
          contentId: 'q-1',
          reason: 'incorrect',
        })
      ).rejects.toThrow('Ya has reportado este contenido.');
    });
  });

  it('maps "duplicate" (lowercase) error to Spanish message', async () => {
    mockReportContent.mockRejectedValueOnce(new Error('duplicate key constraint'));
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await expect(
        result.current.submitReport({
          contentType: 'flashcard',
          contentId: 'f-1',
          reason: 'low_quality',
        })
      ).rejects.toThrow('Ya has reportado este contenido.');
    });
  });

  it('rethrows non-409 errors unchanged', async () => {
    mockReportContent.mockRejectedValueOnce(new Error('HTTP 500: boom'));
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await expect(
        result.current.submitReport({
          contentType: 'quiz_question',
          contentId: 'q-1',
          reason: 'incorrect',
        })
      ).rejects.toThrow('HTTP 500: boom');
    });
  });
});

// ══════════════════════════════════════════════════════════════
// resolveOrDismiss — optimistic + rollback
// ══════════════════════════════════════════════════════════════

describe('resolveOrDismiss', () => {
  it('applies optimistic update immediately, then server value', async () => {
    mockGetReports.mockResolvedValueOnce({
      items: [REPORT_1, REPORT_2],
      total: 2,
      limit: 20,
      offset: 0,
    });
    const resolved = {
      ...REPORT_1,
      status: 'resolved' as const,
      resolved_by: 'prof-1',
      resolved_at: '2026-04-18T12:00:00Z',
      resolution_note: 'fixed',
    };
    mockResolveReport.mockResolvedValueOnce(resolved);

    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchReports();
    });
    await act(async () => {
      await result.current.resolveOrDismiss('rep-1', 'resolved', 'fixed');
    });

    const item = result.current.reports.find((r) => r.id === 'rep-1');
    expect(item?.status).toBe('resolved');
    expect(item?.resolution_note).toBe('fixed');
    expect(item?.resolved_by).toBe('prof-1');
  });

  it('reverts list on server error', async () => {
    mockGetReports.mockResolvedValueOnce({
      items: [REPORT_1, REPORT_2],
      total: 2,
      limit: 20,
      offset: 0,
    });
    mockResolveReport.mockRejectedValueOnce(new Error('HTTP 403: forbidden'));

    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchReports();
    });

    await act(async () => {
      await expect(
        result.current.resolveOrDismiss('rep-1', 'resolved', 'fixed')
      ).rejects.toThrow('forbidden');
    });

    // Revert: REPORT_1 should still be pending
    const item = result.current.reports.find((r) => r.id === 'rep-1');
    expect(item?.status).toBe('pending');
    expect(item?.resolution_note).toBeNull();
  });

  it('passes status + resolutionNote to service', async () => {
    mockGetReports.mockResolvedValueOnce({
      items: [REPORT_1],
      total: 1,
      limit: 20,
      offset: 0,
    });
    mockResolveReport.mockResolvedValueOnce({ ...REPORT_1, status: 'dismissed' });
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchReports();
    });
    await act(async () => {
      await result.current.resolveOrDismiss('rep-1', 'dismissed', 'invalid');
    });
    expect(mockResolveReport).toHaveBeenCalledWith('rep-1', {
      status: 'dismissed',
      resolutionNote: 'invalid',
    });
  });

  it('handles optional resolutionNote (undefined)', async () => {
    mockGetReports.mockResolvedValueOnce({
      items: [REPORT_1],
      total: 1,
      limit: 20,
      offset: 0,
    });
    mockResolveReport.mockResolvedValueOnce({ ...REPORT_1, status: 'reviewed' });
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchReports();
    });
    await act(async () => {
      await result.current.resolveOrDismiss('rep-1', 'reviewed');
    });
    expect(mockResolveReport).toHaveBeenCalledWith('rep-1', {
      status: 'reviewed',
      resolutionNote: undefined,
    });
  });
});

// ══════════════════════════════════════════════════════════════
// Pagination helpers + computed values
// ══════════════════════════════════════════════════════════════

describe('pagination', () => {
  async function seedWithTotal(total: number) {
    mockGetReports.mockResolvedValueOnce({
      items: [],
      total,
      limit: 20,
      offset: 0,
    });
    const hook = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await hook.result.current.fetchReports();
    });
    return hook;
  }

  it('goToPage triggers fetchReports with computed offset', async () => {
    const { result } = await seedWithTotal(100);
    // clear seed call
    mockGetReports.mockClear();
    mockGetReports.mockResolvedValueOnce({
      items: [],
      total: 100,
      limit: 20,
      offset: 40,
    });
    await act(async () => {
      result.current.goToPage(2);
    });
    await waitFor(() => {
      expect(mockGetReports).toHaveBeenCalledWith('inst-1', expect.objectContaining({ offset: 40 }));
    });
  });

  it('nextPage increments offset by limit when hasNextPage', async () => {
    const { result } = await seedWithTotal(100);
    mockGetReports.mockClear();
    mockGetReports.mockResolvedValueOnce({
      items: [],
      total: 100,
      limit: 20,
      offset: 20,
    });
    await act(async () => {
      result.current.nextPage();
    });
    await waitFor(() => {
      expect(mockGetReports).toHaveBeenCalledWith('inst-1', expect.objectContaining({ offset: 20 }));
    });
  });

  it('nextPage is no-op when already at the last page', async () => {
    // Seed with total=20, offset=0 → one page
    mockGetReports.mockResolvedValueOnce({
      items: [],
      total: 20,
      limit: 20,
      offset: 0,
    });
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      await result.current.fetchReports();
    });
    mockGetReports.mockClear();
    await act(async () => {
      result.current.nextPage();
    });
    expect(mockGetReports).not.toHaveBeenCalled();
  });

  it('prevPage clamps to offset=0 when on first page', async () => {
    const { result } = await seedWithTotal(100);
    mockGetReports.mockClear();
    mockGetReports.mockResolvedValueOnce({
      items: [],
      total: 100,
      limit: 20,
      offset: 0,
    });
    await act(async () => {
      result.current.prevPage();
    });
    await waitFor(() => {
      expect(mockGetReports).toHaveBeenCalledWith(
        'inst-1',
        expect.objectContaining({ offset: 0 })
      );
    });
  });

  it('computed: totalPages, hasNextPage, hasPrevPage reflect pagination', async () => {
    const { result } = await seedWithTotal(100);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.currentPage).toBe(0);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPrevPage).toBe(false);
  });

  it('computed: totalPages=0 when total is 0', () => {
    const { result } = renderHook(() => useAiReports('inst-1'));
    expect(result.current.totalPages).toBe(0);
    expect(result.current.hasNextPage).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// updateFilters
// ══════════════════════════════════════════════════════════════

describe('updateFilters', () => {
  it('resets offset to 0 and triggers fetchReports with new filters', async () => {
    mockGetReports.mockResolvedValueOnce({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      result.current.updateFilters({ status: 'resolved' });
    });
    await waitFor(() => {
      expect(mockGetReports).toHaveBeenCalledWith('inst-1', expect.objectContaining({
        status: 'resolved',
        offset: 0,
      }));
    });
  });

  it('replaces existing filters (does not merge)', async () => {
    mockGetReports.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    const { result } = renderHook(() => useAiReports('inst-1'));
    await act(async () => {
      result.current.updateFilters({ status: 'resolved', reason: 'incorrect' });
    });
    await waitFor(() => {
      expect(result.current.filters).toEqual({ status: 'resolved', reason: 'incorrect' });
    });
    await act(async () => {
      result.current.updateFilters({ status: 'pending' });
    });
    await waitFor(() => {
      expect(result.current.filters).toEqual({ status: 'pending' });
    });
  });
});
