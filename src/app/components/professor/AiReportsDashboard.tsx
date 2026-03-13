// ============================================================
// Axon — AI Reports Dashboard (Fase D: Feedback Analytics)
//
// Professor/admin dashboard for reviewing AI content reports.
// Displays aggregate quality metrics + filterable report list.
//
// BACKEND ENDPOINTS:
//   GET /ai/report-stats?institution_id=UUID — 14 aggregate columns
//   GET /ai/reports?institution_id=UUID&... — paginated listing
//   PATCH /ai/report/:id — resolve/dismiss reports
//
// ARCHITECTURE:
//   - Stats fetched once on mount + manual refresh
//   - Reports list fetched with filter changes (debounced)
//   - Resolve actions use post-success local sync (wait for backend, then update UI)
//   - All data scoped to institution_id (backend enforces role)
//
// DESIGN: Purple accent (professor theme), collapsible sections
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAiReportStats,
  getAiReports,
  resolveAiReport,
  REPORT_REASON_LABELS,
} from '@/app/services/aiApi';
import type {
  AiReportStats,
  AiContentReport,
  AiReportStatus,
  AiReportReason,
} from '@/app/services/aiApi';
import { ReportRow } from '@/app/components/professor/AiReportRow';
import { StatCard } from '@/app/components/professor/AiReportStatCard';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  Flag, BarChart3, Loader2, RefreshCw, AlertTriangle,
  CheckCircle2, Clock, Filter, ChevronDown,
  ChevronUp, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/app/lib/logger';
import { getErrorMsg, formatDateCompact } from '@/app/lib/error-utils';
import { BANNER_ERROR } from '@/app/services/quizDesignTokens';

// ── Props ─────────────────────────────────────────────────

interface AiReportsDashboardProps {
  /** Institution ID for scoping all queries */
  institutionId: string;
}

// ── Pagination Constants ────────────────────────────────

const PAGE_SIZE = 20;

// ── Main Component ──────────────────────────────────────

export function AiReportsDashboard({ institutionId }: AiReportsDashboardProps) {
  // ── Stats state ──────────────────────────────────────
  const [stats, setStats] = useState<AiReportStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');

  // ── Reports list state ─────────────────────────────────
  const [reports, setReports] = useState<AiContentReport[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsLoading, setReportsLoading] = useState(false);

  // ── Filters ──────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<AiReportStatus | ''>('');
  const [filterReason, setFilterReason] = useState<AiReportReason | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Sections collapse ──────────────────────────────────
  const [showStats, setShowStats] = useState(true);
  const [showList, setShowList] = useState(true);

  // ── Resolving state (track which report is being resolved) ──
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // ── Pagination ──────────────────────────────────────────
  const [page, setPage] = useState(0);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [filterStatus, filterReason]);

  // ── Fetch stats ──────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!institutionId) return;
    setStatsLoading(true);
    setStatsError('');
    try {
      const data = await getAiReportStats(institutionId);
      setStats(data);
    } catch (err: unknown) {
      const msg = getErrorMsg(err);
      logger.error('[AiReports] Stats fetch failed:', err);
      setStatsError(msg);
    } finally {
      setStatsLoading(false);
    }
  }, [institutionId]);

  // ── Fetch reports list ─────────────────────────────────
  const fetchReports = useCallback(async () => {
    if (!institutionId) return;
    setReportsLoading(true);
    try {
      const data = await getAiReports({
        institution_id: institutionId,
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterReason ? { reason: filterReason } : {}),
        content_type: 'quiz_question', // Scoped to quiz per Guidelines
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setReports(data.items || []);
      setReportsTotal(data.total || 0);
    } catch (err: unknown) {
      logger.error('[AiReports] Reports fetch failed:', err);
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, [institutionId, filterStatus, filterReason, page]);

  // Initial load
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Resolve/dismiss handler ────────────────────────────
  const handleResolve = useCallback(async (
    reportId: string,
    status: AiReportStatus,
    note?: string
  ) => {
    setResolvingId(reportId);
    try {
      await resolveAiReport(reportId, {
        status,
        ...(note ? { resolution_note: note } : {}),
      });

      // Post-success: sync local state with backend response.
      // NOT optimistic — we waited for the backend to confirm above.
      // Must mirror the backend's P7 logic for field resets:
      //   - Terminal states (resolved/dismissed) → set resolved_at
      //   - Re-open (pending) → clear resolved_at, resolved_by, resolution_note
      setReports(prev =>
        prev.map(r => {
          if (r.id !== reportId) return r;
          const isTerminal = status === 'resolved' || status === 'dismissed';
          return {
            ...r,
            status,
            resolved_at: isTerminal ? new Date().toISOString() : null,
            resolved_by: isTerminal ? r.resolved_by : null,
            resolution_note: isTerminal ? r.resolution_note : null,
          };
        })
      );

      toast.success(
        status === 'resolved' ? 'Reporte resuelto' :
        status === 'dismissed' ? 'Reporte descartado' :
        status === 'reviewed' ? 'Marcado como revisado' :
        'Reporte actualizado'
      );

      // Refresh stats to keep counts accurate
      fetchStats();
    } catch (err: unknown) {
      toast.error(getErrorMsg(err) || 'Error al actualizar reporte');
      logger.error('[AiReports] Resolve failed:', err);
    } finally {
      setResolvingId(null);
    }
  }, [fetchStats]);

  // ── Computed: has any data ─────────────────────────────
  const hasData = stats != null && stats.total_reports > 0;
  const pendingCount = stats?.pending_count || 0;

  // ── Reason breakdown for stats ─────────────────────────
  const reasonBreakdown = useMemo(() => {
    if (!stats) return [];
    return [
      { reason: 'incorrect' as const, count: stats.reason_incorrect, color: '#ef4444' },
      { reason: 'low_quality' as const, count: stats.reason_low_quality, color: '#f59e0b' },
      { reason: 'irrelevant' as const, count: stats.reason_irrelevant, color: '#8b5cf6' },
      { reason: 'inappropriate' as const, count: stats.reason_inappropriate, color: '#ec4899' },
      { reason: 'other' as const, count: stats.reason_other, color: '#6b7280' },
    ].filter(r => r.count > 0);
  }, [stats]);

  return (
    <div className="space-y-4">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag size={16} className="text-amber-500" />
          <h3 className="text-sm text-zinc-700" style={{ fontWeight: 700 }}>
            Reportes de contenido IA
          </h3>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] border border-amber-200" style={{ fontWeight: 700 }}>
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => { fetchStats(); fetchReports(); }}
          disabled={statsLoading || reportsLoading}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50"
          title="Actualizar"
        >
          <RefreshCw size={14} className={clsx(statsLoading && 'animate-spin')} />
        </button>
      </div>

      {/* ── Error state ── */}
      {statsError && (
        <div className={`${BANNER_ERROR} text-[11px]`}>
          <AlertTriangle size={14} className="shrink-0" />
          <span>Error al cargar estadisticas: {statsError}</span>
        </div>
      )}

      {/* ── Loading state ── */}
      {statsLoading && !stats && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-purple-400" size={20} />
        </div>
      )}

      {/* ── Empty state ── */}
      {stats && !hasData && !statsLoading && (
        <div className="flex flex-col items-center py-8 text-zinc-400 gap-2">
          <Flag size={24} className="opacity-30" />
          <p className="text-[12px]">No hay reportes de contenido IA en esta institucion</p>
          <p className="text-[10px] text-zinc-300">Los reportes aparecen cuando alumnos o profesores marcan preguntas IA con problemas</p>
        </div>
      )}

      {/* ── Stats Cards ── */}
      {hasData && (
        <>
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-700 transition-colors"
            style={{ fontWeight: 600 }}
          >
            <BarChart3 size={12} />
            Metricas
            {showStats ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <AnimatePresence initial={false}>
            {showStats && stats && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <StatCard
                    label="Total reportes"
                    value={stats.total_reports}
                    icon={<Flag size={15} />}
                    color="#f59e0b"
                  />
                  <StatCard
                    label="Pendientes"
                    value={stats.pending_count}
                    icon={<Clock size={15} />}
                    color="#ef4444"
                    subValue={stats.reviewed_count > 0 ? `${stats.reviewed_count} en revision` : undefined}
                  />
                  <StatCard
                    label="Resueltos"
                    value={stats.resolved_count}
                    icon={<CheckCircle2 size={15} />}
                    color="#22c55e"
                    subValue={stats.dismissed_count > 0 ? `${stats.dismissed_count} descartados` : undefined}
                  />
                  {/* Backend RPC returns resolution_rate in 0.0-1.0 scale (resolved/total) */}
                  <StatCard
                    label="Tasa resolucion"
                    value={`${Math.round((stats.resolution_rate || 0) * 100)}%`}
                    icon={<BarChart3 size={15} />}
                    color="#8b5cf6"
                    subValue={stats.avg_resolution_hours > 0
                      ? `~${Math.round(stats.avg_resolution_hours)}h promedio`
                      : undefined
                    }
                  />
                </div>

                {/* Reason breakdown */}
                {reasonBreakdown.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap px-1">
                    <span className="text-[9px] text-zinc-400" style={{ fontWeight: 600 }}>
                      Por motivo:
                    </span>
                    {reasonBreakdown.map(({ reason, count, color }) => (
                      <span
                        key={reason}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] border"
                        style={{
                          fontWeight: 600,
                          color,
                          backgroundColor: `${color}10`,
                          borderColor: `${color}30`,
                        }}
                      >
                        {REPORT_REASON_LABELS[reason]}: {count}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Reports List ── */}
          <div className="border-t border-zinc-100 pt-3 mt-2">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowList(!showList)}
                className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-700 transition-colors"
                style={{ fontWeight: 600 }}
              >
                <MessageSquare size={12} />
                Reportes ({reportsTotal})
                {showList ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-colors border',
                  (filterStatus || filterReason)
                    ? 'text-purple-600 bg-purple-50 border-purple-200'
                    : 'text-zinc-400 hover:text-zinc-600 border-transparent hover:border-zinc-200'
                )}
                style={{ fontWeight: 600 }}
              >
                <Filter size={10} />
                Filtros
                {(filterStatus || filterReason) && ' activos'}
              </button>
            </div>

            {/* Filters row */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-400" style={{ fontWeight: 600 }}>Estado:</span>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as AiReportStatus | '')}
                        className="text-[11px] border border-zinc-200 rounded-lg px-2 py-1 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-300/50"
                      >
                        <option value="">Todos</option>
                        <option value="pending">Pendiente</option>
                        <option value="reviewed">En revision</option>
                        <option value="resolved">Resuelto</option>
                        <option value="dismissed">Descartado</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-400" style={{ fontWeight: 600 }}>Motivo:</span>
                      <select
                        value={filterReason}
                        onChange={(e) => setFilterReason(e.target.value as AiReportReason | '')}
                        className="text-[11px] border border-zinc-200 rounded-lg px-2 py-1 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-300/50"
                      >
                        <option value="">Todos</option>
                        <option value="incorrect">Incorrecto</option>
                        <option value="low_quality">Baja calidad</option>
                        <option value="irrelevant">Irrelevante</option>
                        <option value="inappropriate">Inapropiado</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                    {(filterStatus || filterReason) && (
                      <button
                        onClick={() => { setFilterStatus(''); setFilterReason(''); }}
                        className="text-[10px] text-zinc-400 hover:text-zinc-600 underline"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reports list */}
            <AnimatePresence initial={false}>
              {showList && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {reportsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="animate-spin text-purple-400" size={18} />
                    </div>
                  ) : reports.length === 0 ? (
                    <p className="text-center text-[11px] text-zinc-400 py-6">
                      {(filterStatus || filterReason) ? 'Sin reportes para estos filtros' : 'Sin reportes'}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar-light pr-1">
                      {reports.map((report) => (
                        <ReportRow
                          key={report.id}
                          report={report}
                          resolving={resolvingId === report.id}
                          onResolve={handleResolve}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pagination UI — only shown when there are multiple pages */}
            {reportsTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-100">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0 || reportsLoading}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600 disabled:opacity-30 px-2 py-1 rounded hover:bg-zinc-50 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  Anterior
                </button>
                <span className="text-[9px] text-zinc-400">
                  {page * PAGE_SIZE + 1}\u2013{Math.min((page + 1) * PAGE_SIZE, reportsTotal)} de {reportsTotal}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= reportsTotal || reportsLoading}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600 disabled:opacity-30 px-2 py-1 rounded hover:bg-zinc-50 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}