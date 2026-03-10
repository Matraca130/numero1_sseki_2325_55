// ============================================================
// Axon — ReportsModeratorPanel (v4.5, Fase E-2)
//
// Full admin/professor page for moderating AI content reports.
// Features: KPI stats cards, filterable table, resolve actions.
//
// USAGE:
//   <ReportsModeratorPanel institutionId={institutionId} />
//
// BACKEND ROUTES:
//   GET  /ai/report-stats  — Aggregate metrics
//   GET  /ai/reports       — Paginated listing
//   PATCH /ai/report/:id   — Resolve/dismiss
//
// DEPENDENCIES:
//   - useAiReports hook
//   - design-system tokens
//   - shadcn Table, Badge, Select, Button
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  Flag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { useAiReports, type ReportFilters } from '@/app/hooks/useAiReports';
import type { AiContentReport, ReportStatus, ReportReason } from '@/app/services/aiService';
import { components, headingStyle, colors } from '@/app/design-system';
import { LoadingPage, ErrorState, EmptyState } from '@/app/components/shared/PageStates';

// ── Status / Reason config ─────────────────────────

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pendiente', color: 'bg-amber-100 text-amber-800',  icon: <Clock size={12} /> },
  reviewed: { label: 'Revisado',  color: 'bg-blue-100 text-blue-800',    icon: <Eye size={12} /> },
  resolved: { label: 'Resuelto',  color: 'bg-green-100 text-green-800',  icon: <CheckCircle2 size={12} /> },
  dismissed:{ label: 'Descartado',color: 'bg-gray-100 text-gray-600',    icon: <XCircle size={12} /> },
};

const REASON_LABELS: Record<ReportReason, string> = {
  incorrect: 'Incorrecto',
  inappropriate: 'Inapropiado',
  low_quality: 'Baja calidad',
  irrelevant: 'Irrelevante',
  other: 'Otro',
};

// ── Component ───────────────────────────────────────────

interface ReportsModeratorPanelProps {
  institutionId: string;
}

export function ReportsModeratorPanel({ institutionId }: ReportsModeratorPanelProps) {
  const {
    phase, reports, stats, error,
    filters, pagination,
    currentPage, totalPages, hasNextPage, hasPrevPage,
    fetchAll, updateFilters, resolveOrDismiss,
    nextPage, prevPage,
  } = useAiReports(institutionId);

  // ── Resolve dialog state ───────────────────────
  const [resolveTarget, setResolveTarget] = useState<AiContentReport | null>(null);
  const [resolveAction, setResolveAction] = useState<ReportStatus>('resolved');
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);

  // ── Initial fetch ────────────────────────────────
  useEffect(() => {
    if (institutionId) fetchAll();
  }, [institutionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter handlers ──────────────────────────────
  const handleStatusFilter = useCallback((value: string) => {
    const status = value === 'all' ? undefined : value as ReportStatus;
    updateFilters({ ...filters, status });
  }, [filters, updateFilters]);

  const handleReasonFilter = useCallback((value: string) => {
    const reason = value === 'all' ? undefined : value as ReportReason;
    updateFilters({ ...filters, reason });
  }, [filters, updateFilters]);

  // ── Resolve handler ──────────────────────────────
  const handleResolve = useCallback(async () => {
    if (!resolveTarget) return;
    setResolving(true);
    try {
      await resolveOrDismiss(resolveTarget.id, resolveAction, resolveNote.trim() || undefined);
      setResolveTarget(null);
      setResolveNote('');
    } catch (err: any) {
      console.error('Error resolving report:', err);
    } finally {
      setResolving(false);
    }
  }, [resolveTarget, resolveAction, resolveNote, resolveOrDismiss]);

  // ── Loading / Error states ───────────────────────
  if (phase === 'loading' && reports.length === 0) return <LoadingPage />;
  if (phase === 'error' && reports.length === 0) {
    return <ErrorState message={error || 'Error al cargar reportes'} onRetry={() => fetchAll()} />;
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Header ────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl text-gray-900 tracking-tight"
            style={{ ...headingStyle, fontWeight: 700 }}
          >
            Moderacion de Contenido IA
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Revisa y gestiona reportes de contenido generado por IA
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchAll()}
          className="gap-1.5"
        >
          <RefreshCw size={14} />
          Actualizar
        </Button>
      </div>

      {/* ── Stats KPI cards ─────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiMiniCard
            icon={<Clock size={18} />}
            label="Pendientes"
            value={stats.pending_count}
            colorClass="bg-amber-50 text-amber-600"
          />
          <KpiMiniCard
            icon={<Eye size={18} />}
            label="Revisados"
            value={stats.reviewed_count}
            colorClass="bg-blue-50 text-blue-600"
          />
          <KpiMiniCard
            icon={<CheckCircle2 size={18} />}
            label="Resueltos"
            value={stats.resolved_count}
            colorClass="bg-green-50 text-green-600"
          />
          <KpiMiniCard
            icon={<AlertTriangle size={18} />}
            label="Tasa resolucion"
            value={`${Math.round(stats.resolution_rate)}%`}
            colorClass="bg-teal-50 text-teal-600"
          />
        </div>
      )}

      {/* ── Filters ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={filters.status || 'all'}
          onValueChange={handleStatusFilter}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="reviewed">Revisado</SelectItem>
            <SelectItem value="resolved">Resuelto</SelectItem>
            <SelectItem value="dismissed">Descartado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.reason || 'all'}
          onValueChange={handleReasonFilter}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Motivo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los motivos</SelectItem>
            <SelectItem value="incorrect">Incorrecto</SelectItem>
            <SelectItem value="low_quality">Baja calidad</SelectItem>
            <SelectItem value="irrelevant">Irrelevante</SelectItem>
            <SelectItem value="inappropriate">Inapropiado</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Reports Table ─────────────────────── */}
      {reports.length === 0 ? (
        <EmptyState
          icon={<Flag size={40} className="text-gray-300" />}
          title="Sin reportes"
          description="No hay reportes que coincidan con los filtros seleccionados."
        />
      ) : (
        <div className={`${components.card.base} overflow-hidden`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Tipo</TableHead>
                <TableHead className="w-28">Motivo</TableHead>
                <TableHead className="w-28">Estado</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead className="w-36">Fecha</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {report.content_type === 'flashcard' ? 'Flashcard' : 'Quiz'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {REASON_LABELS[report.reason as ReportReason] || report.reason}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={report.status as ReportStatus} />
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                    {report.description || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {new Date(report.created_at).toLocaleDateString('es', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.status === 'pending' || report.status === 'reviewed' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResolveTarget(report);
                          setResolveAction('resolved');
                          setResolveNote('');
                        }}
                        className="text-teal-600 hover:text-teal-700"
                      >
                        Resolver
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              {pagination.total} reporte{pagination.total !== 1 ? 's' : ''} total
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevPage}
                disabled={!hasPrevPage}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-xs text-gray-600">
                {currentPage + 1} / {Math.max(totalPages, 1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={!hasNextPage}
                className="h-8 w-8 p-0"
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolve Dialog ──────────────────────── */}
      <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={headingStyle}>Resolver reporte</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm" style={{ fontWeight: 500 }}>Accion</label>
              <Select
                value={resolveAction}
                onValueChange={(v) => setResolveAction(v as ReportStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resolved">Resolver (confirmar problema)</SelectItem>
                  <SelectItem value="dismissed">Descartar (no es problema)</SelectItem>
                  <SelectItem value="reviewed">Marcar como revisado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm" style={{ fontWeight: 500 }}>Nota (opcional)</label>
              <Textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="Agrega una nota sobre la resolucion..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setResolveTarget(null)}
              disabled={resolving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResolve}
              disabled={resolving}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              {resolving ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-1.5" />
                  Procesando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────

function StatusBadge({ status }: { status: ReportStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.color}`} style={{ fontWeight: 500 }}>
      {config.icon}
      {config.label}
    </span>
  );
}

function KpiMiniCard({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  colorClass: string;
}) {
  return (
    <div className={components.kpiCard.base}>
      <div className="flex items-center gap-3">
        <div className={`${components.kpiCard.iconBg} ${colorClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg text-gray-900" style={{ fontWeight: 700 }}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
