// ============================================================
// Axon — useAiReports Hook (v4.5)
//
// Manages AI content quality reports: submit, list, stats, resolve.
// BACKEND: POST /ai/report, PATCH /ai/report/:id,
//          GET /ai/report-stats, GET /ai/reports
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

export function useAiReports(institutionId: string) {
  const [phase, setPhase] = useState<ReportsPhase>('idle');
  const [reports, setReports] = useState<AiContentReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({});
  const [pagination, setPagination] = useState<ReportPagination>({
    limit: 20, offset: 0, total: 0,
  });
  const fetchingRef = useRef(false);

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
      setPagination(prev => ({ ...prev, offset: result.offset, total: result.total }));
      setPhase('ready');
    } catch (err: any) {
      setError(err.message || 'Error al cargar reportes');
      setPhase('error');
    } finally {
      fetchingRef.current = false;
    }
  }, [institutionId, filters, pagination.limit, pagination.offset]);

  const fetchStats = useCallback(async (dateRange?: { from?: string; to?: string }) => {
    if (!institutionId) return;
    try {
      const result = await getReportStats(institutionId, dateRange);
      setStats(result);
    } catch (err: any) {
      console.error('[useAiReports] Stats fetch failed:', err.message);
    }
  }, [institutionId]);

  const fetchAll = useCallback(async (dateRange?: { from?: string; to?: string }) => {
    await Promise.all([fetchReports(), fetchStats(dateRange)]);
  }, [fetchReports, fetchStats]);

  const submitReport = useCallback(async (params: {
    contentType: ReportContentType;
    contentId: string;
    reason: ReportReason;
    description?: string;
  }): Promise<AiContentReport | null> => {
    try {
      const report = await reportContent(params);
      if (!filters.status || filters.status === 'pending') {
        setReports(prev => [report, ...prev]);
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      }
      return report;
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('duplicate')) {
        throw new Error('Ya has reportado este contenido.');
      }
      throw err;
    }
  }, [filters.status]);

  const resolveOrDismiss = useCallback(async (
    reportId: string,
    status: ReportStatus,
    resolutionNote?: string
  ): Promise<AiContentReport | null> => {
    const previousReports = [...reports];
    setReports(prev => prev.map(r =>
      r.id === reportId ? { ...r, status, resolution_note: resolutionNote || null } : r
    ));
    try {
      const updated = await resolveReport(reportId, { status, resolutionNote });
      setReports(prev => prev.map(r => r.id === reportId ? updated : r));
      return updated;
    } catch (err: any) {
      setReports(previousReports);
      throw err;
    }
  }, [reports]);

  const goToPage = useCallback((page: number) => {
    const newOffset = page * pagination.limit;
    setPagination(prev => ({ ...prev, offset: newOffset }));
    fetchReports(undefined, newOffset);
  }, [pagination.limit, fetchReports]);

  const nextPage = useCallback(() => {
    const newOffset = pagination.offset + pagination.limit;
    if (newOffset < pagination.total) goToPage(Math.floor(newOffset / pagination.limit));
  }, [pagination, goToPage]);

  const prevPage = useCallback(() => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit);
    goToPage(Math.floor(newOffset / pagination.limit));
  }, [pagination, goToPage]);

  const updateFilters = useCallback((newFilters: ReportFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, offset: 0 }));
    fetchReports(newFilters, 0);
  }, [fetchReports]);

  const currentPage = Math.floor(pagination.offset / pagination.limit);
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const hasNextPage = pagination.offset + pagination.limit < pagination.total;
  const hasPrevPage = pagination.offset > 0;

  return {
    phase, reports, stats, error, filters, pagination,
    currentPage, totalPages, hasNextPage, hasPrevPage,
    fetchReports, fetchStats, fetchAll,
    submitReport, resolveOrDismiss, updateFilters,
    goToPage, nextPage, prevPage,
  };
}
