// ============================================================
// Axon — SummaryHeader (shared summary title + breadcrumb)
//
// Shows title, breadcrumb trail, metadata (status, dates).
// Used by SummaryView for both professor and student roles.
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, ChevronRight, BookOpen, CheckCircle2, Clock,
  FileText, AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import type { Summary } from '@/app/services/summariesApi';

interface Breadcrumb {
  courseName?: string;
  sectionName?: string;
  topicName: string;
}

interface SummaryHeaderProps {
  summary: Summary;
  breadcrumb: Breadcrumb;
  isCompleted?: boolean;
  timeSpentSeconds?: number;
  onBack: () => void;
  /** Extra actions (e.g., "Mark as read" button) rendered on the right */
  actions?: React.ReactNode;
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  published: { label: 'Publicado', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  draft:     { label: 'Borrador',  bg: 'bg-amber-50',   text: 'text-amber-700' },
  rejected:  { label: 'Rechazado', bg: 'bg-red-50',     text: 'text-red-700' },
};

export function SummaryHeader({
  summary,
  breadcrumb,
  isCompleted,
  timeSpentSeconds,
  onBack,
  actions,
}: SummaryHeaderProps) {
  const status = statusConfig[summary.status] || statusConfig.draft;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-4 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Volver</span>
        </button>
        {breadcrumb.courseName && (
          <>
            <ChevronRight size={14} className="text-gray-300 shrink-0" />
            <span className="truncate max-w-[120px]">{breadcrumb.courseName}</span>
          </>
        )}
        {breadcrumb.sectionName && (
          <>
            <ChevronRight size={14} className="text-gray-300 shrink-0" />
            <span className="truncate max-w-[120px]">{breadcrumb.sectionName}</span>
          </>
        )}
        <ChevronRight size={14} className="text-gray-300 shrink-0" />
        <span className="truncate max-w-[150px]">{breadcrumb.topicName}</span>
        <ChevronRight size={14} className="text-gray-300 shrink-0" />
        <span className="text-gray-600 truncate max-w-[200px]">{summary.title || 'Sin titulo'}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={clsx(
              "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
              isCompleted
                ? "bg-emerald-50 border-emerald-200"
                : "bg-teal-50 border-teal-100"
            )}>
              {isCompleted ? (
                <CheckCircle2 size={20} className="text-emerald-500" />
              ) : (
                <BookOpen size={20} className="text-teal-600" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-gray-900 truncate">{summary.title || 'Sin titulo'}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={clsx(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border",
                  status.bg, status.text
                )}>
                  {status.label}
                </span>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={10} /> Leido
                  </span>
                )}
                <span className="text-[10px] text-gray-300">
                  {new Date(summary.created_at).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </span>
                {timeSpentSeconds != null && timeSpentSeconds > 0 && (
                  <span className="text-[10px] text-gray-300 flex items-center gap-1">
                    <Clock size={9} />
                    {Math.round(timeSpentSeconds / 60)} min de lectura
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right-side actions */}
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </div>

        {/* Markdown preview */}
        {summary.content_markdown && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 whitespace-pre-wrap">
              {summary.content_markdown}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
