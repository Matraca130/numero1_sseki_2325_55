// ============================================================
// Axon — AI Report Row (Fase D: extracted sub-component)
//
// Displays a single AI content report in the dashboard list.
// Supports expand/collapse for details, quick resolve/dismiss
// actions, and re-open for already-resolved reports.
//
// Extracted from AiReportsDashboard.tsx to keep under 500 lines.
// ============================================================

import React, { useState } from 'react';
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
} from '@/app/services/aiApi';
import type {
  AiContentReport,
  AiReportStatus,
} from '@/app/services/aiApi';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  ChevronDown, ChevronUp, Eye, CheckCircle2,
  XCircle, RotateCcw, Loader2,
} from 'lucide-react';
import { formatDateCompact } from '@/app/lib/date-utils';

// ── Props ─────────────────────────────────────────────────

export interface ReportRowProps {
  report: AiContentReport;
  resolving: boolean;
  onResolve: (id: string, status: AiReportStatus, note?: string) => void;
}

// ── Component ─────────────────────────────────────────────

export const ReportRow = React.memo(function ReportRow({
  report,
  resolving,
  onResolve,
}: ReportRowProps) {
  const [expanded, setExpanded] = useState(false);
  const isActionable = report.status === 'pending' || report.status === 'reviewed';

  return (
    <div className={clsx(
      'rounded-xl border bg-white transition-all',
      isActionable ? 'border-zinc-200' : 'border-zinc-100 opacity-75'
    )}>
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {/* Reason badge */}
        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0" style={{ fontWeight: 600 }}>
          {REPORT_REASON_LABELS[report.reason]}
        </span>

        {/* Status badge */}
        <span className={clsx(
          'text-[9px] px-1.5 py-0.5 rounded border shrink-0',
          REPORT_STATUS_COLORS[report.status]
        )} style={{ fontWeight: 700 }}>
          {REPORT_STATUS_LABELS[report.status]}
        </span>

        {/* Content ID (truncated) */}
        <span className="text-[9px] text-zinc-300 truncate flex-1 min-w-0">
          {report.content_type === 'quiz_question' ? 'Pregunta' : 'Flashcard'}: {report.content_id.substring(0, 8)}...
        </span>

        {/* Date */}
        <span className="text-[9px] text-zinc-400 shrink-0">
          {formatDateCompact(report.created_at)}
        </span>

        {/* Quick actions — only for actionable reports */}
        {isActionable && !resolving && (
          <div className="flex items-center gap-0.5 shrink-0">
            {report.status === 'pending' && (
              <button
                onClick={(e) => { e.stopPropagation(); onResolve(report.id, 'reviewed'); }}
                className="p-1 rounded text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Marcar como revisado"
              >
                <Eye size={12} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onResolve(report.id, 'resolved'); }}
              className="p-1 rounded text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Resolver"
            >
              <CheckCircle2 size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onResolve(report.id, 'dismissed'); }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              title="Descartar"
            >
              <XCircle size={12} />
            </button>
          </div>
        )}

        {/* Resolved: re-open button */}
        {(report.status === 'resolved' || report.status === 'dismissed') && !resolving && (
          <button
            onClick={(e) => { e.stopPropagation(); onResolve(report.id, 'pending'); }}
            className="p-1 rounded text-zinc-300 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title="Re-abrir"
          >
            <RotateCcw size={12} />
          </button>
        )}

        {resolving && (
          <Loader2 size={12} className="animate-spin text-purple-400 shrink-0" />
        )}
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 border-t border-zinc-100 space-y-2">
              {report.description && (
                <div>
                  <p className="text-[9px] text-zinc-400 uppercase tracking-wider mb-0.5" style={{ fontWeight: 700 }}>Descripcion</p>
                  <p className="text-[11px] text-zinc-600" style={{ lineHeight: '1.5' }}>{report.description}</p>
                </div>
              )}
              {report.resolution_note && (
                <div>
                  <p className="text-[9px] text-zinc-400 uppercase tracking-wider mb-0.5" style={{ fontWeight: 700 }}>Nota de resolucion</p>
                  <p className="text-[11px] text-zinc-600" style={{ lineHeight: '1.5' }}>{report.resolution_note}</p>
                </div>
              )}
              <div className="flex items-center gap-4 text-[9px] text-zinc-400">
                <span>ID contenido: <code className="bg-zinc-100 px-1 rounded">{report.content_id}</code></span>
                <span>Tipo: {report.content_type === 'quiz_question' ? 'Pregunta' : 'Flashcard'}</span>
                {report.resolved_at && (
                  <span>Resuelto: {formatDateCompact(report.resolved_at)}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});