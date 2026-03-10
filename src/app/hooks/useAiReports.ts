// ============================================================
// Axon — useAiReports Hook (v4.5)
//
// Manages AI content quality reports: submit reports, fetch
// paginated list, aggregate stats, and resolve/dismiss reports.
//
// BACKEND ROUTES:
//   POST  /ai/report         — Submit a report (any member)
//   PATCH /ai/report/:id     — Resolve/dismiss (CONTENT_WRITE_ROLES)
//   GET   /ai/report-stats   — Aggregate metrics (CONTENT_WRITE_ROLES)
//   GET   /ai/reports        — Paginated listing (CONTENT_WRITE_ROLES)
//
// PATTERN:
//   - Fetch + cache stats & reports for an institution
//   - Optimistic status update on resolve (revert on failure)
//   - Pagination via offset/limit with URLSearchParams
//   - Filter by status, reason, content_type
//
// DEPENDENCIES:
//   - aiService: reportContent, resolveReport, getReportStats, getReports
//   - Types: AiContentReport, ReportStats, ReportListResponse,
//            ReportReason, ReportStatus, ReportContentType
// ============================================================

import { useState, useCallback, useRef } from 'react';
import {
  reportContent,
  resolveReport,
  getReportStats,
  getReports,
  type AiContentReport,
  type ReportStats,
  type ReportReason,
  type ReportStatus,
  type ReportContentType,
} from '@/app/services/aiService';

// ── Types ─────────────────────────────────────────────────

export type ReportsPhase = 'idle' | 'loading' | 'ready' | 'error';

export interface ReportFilters {
  status?: ReportStatus;
  reason?: ReportReason;
  contentType?: ReportContentType;
}

export interface ReportPagination {
  limit: number;
  offset: number;
  total: number;
}

// ── Hook ──────────────────────────────────────────────────

export function useAiReports(institutionId: string) {
  // ── State ──────────────────────────────────────────
  const [phase, setPhase] = useState<ReportsPhase>('idle');
  const [reports, setReports] = useState<AiContentReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [pagination, setPagination] = useState<ReportPagination>({
    limit: 20,
    offset: 0,
    total: 0,
  });

  // Prevent concurrent fetches
  const fetchingRef = useRef(false);

  // ── Fetch reports (paginated + filtered) ───────────

  const fetchReports = useCallback(async (
    overrideFilters?: ReportFilters,
    overrideOffset?: number
  ) => {
    if (!institutionId) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const activeFilters = overrideFilters ?? filters;
    const activeOffset = overrideOffset ?? pagination.offset;

    setPhase('loading');
    setError(null);

    try {
      const result = await getReports(institutionId, {
        status: activeFilters.status,
        reason: activeFilters.reason,
        contentType: activeFilters.contentType,
        limit: pagination.limit,
        offset: activeOffset,
      });

      setReports(result.items);
      setPagination(prev => ({
        ...prev,
        offset: result.offset,
        total: result.total,
      }));
      setPhase('ready');
    } catch (err: any) {
      setError(err.message || 'Error al cargar reportes');
      setPhase('error');
    } finally {
      fetchingRef.current = false;
    }
  }, [institutionId, filters, pagination.limit, pagination.offset]);

  // ── Fetch stats ────────────────────────────────────

  const fetchStats = useCallback(async (
    dateRange?: { from?: string; to?: string }
  ) => {
    if (!institutionId) return;

    try {
      const result = await getReportStats(institutionId, dateRange);
      setStats(result);
    } catch (err: any) {
      console.error('[useAiReports] Stats fetch failed:', err.message);
      // Non-blocking: stats failure shouldn't break the reports list
    }
  }, [institutionId]);

  // ── Fetch both reports + stats ─────────────────────

  const fetchAll = useCallback(async (
    dateRange?: { from?: string; to?: string }
  ) => {
    await Promise.all([
      fetchReports(),
      fetchStats(dateRange),
    ]);
  }, [fetchReports, fetchStats]);

  // ── Submit a new report ──────────────────────────

  const submitReport = useCallback(async (
    params: {
      contentType: ReportContentType;
      contentId: string;
      reason: ReportReason;
      description?: string;
    }
  ): Promise<AiContentReport | null> => {
    try {
      const report = await reportContent(params);
      // Append to local list if viewing unfiltered or matching status
      if (!filters.status || filters.status === 'pending') {
        setReports(prev => [report, ...prev]);
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      }
      return report;
    } catch (err: any) {
      // 409 = duplicate report (unique constraint)
      if (err.message?.includes('409') || err.message?.includes('duplicate')) {
        throw new Error('Ya has reportado este contenido.');
      }
      throw err;
    }
  }, [filters.status]);

  // ── Resolve/dismiss a report (optimistic) ──────────

  const resolveOrDismiss = useCallback(async (
    reportId: string,
    status: ReportStatus,
    resolutionNote?: string
  ): Promise<AiContentReport | null> => {
    // Optimistic update
    const previousReports = [...reports];
    setReports(prev => prev.map(r =>
      r.id === reportId
        ? { ...r, status, resolution_note: resolutionNote || null }
        : r
    ));

    try {
      const updated = await resolveReport(reportId, {
        status,
        resolutionNote,
      });

      // Replace with server response (has resolved_by, resolved_at)
      setReports(prev => prev.map(r =>
        r.id === reportId ? updated : r
      ));

      return updated;
    } catch (err: any) {
      // Revert on failure
      setReports(previousReports);
      throw err;
    }
  }, [reports]);

  // ── Pagination helpers ───────────────────────────

  const goToPage = useCallback((page: number) => {
    const newOffset = page * pagination.limit;
    setPagination(prev => ({ ...prev, offset: newOffset }));
    fetchReports(undefined, newOffset);
  }, [pagination.limit, fetchReports]);

  const nextPage = useCallback(() => {
    const newOffset = pagination.offset + pagination.limit;
    if (newOffset < pagination.total) {
      goToPage(Math.floor(newOffset / pagination.limit));
    }
  }, [pagination, goToPage]);

  const prevPage = useCallback(() => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit);
    goToPage(Math.floor(newOffset / pagination.limit));
  }, [pagination, goToPage]);

  // ── Filter update ────────────────────────────────

  const updateFilters = useCallback((newFilters: ReportFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, offset: 0 }));
    fetchReports(newFilters, 0);
  }, [fetchReports]);

  // ── Computed ───────────────────────────────────────

  const currentPage = Math.floor(pagination.offset / pagination.limit);
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const hasNextPage = pagination.offset + pagination.limit < pagination.total;
  const hasPrevPage = pagination.offset > 0;

  return {
    // State
    phase,
    reports,
    stats,
    error,
    filters,
    pagination,

    // Computed
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,

    // Actions
    fetchReports,
    fetchStats,
    fetchAll,
    submitReport,
    resolveOrDismiss,
    updateFilters,
    goToPage,
    nextPage,
    prevPage,
  };
}
