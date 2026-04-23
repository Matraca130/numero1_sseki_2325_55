// ============================================================
// Axon — SummariesBrowser (shared list renderer)
//
// God-component split (finding #24).
//
// SCOPE NOTE (important for reviewers):
//
//   StudentSummariesView and TopicSummariesView diverge at
//   almost every layer: different data hooks, different
//   breadcrumbs, different empty/error states, different card
//   renderers (Student delegates to <TopicSessionGrid/>, Topic
//   renders an inline summary-card list). The real overlap is
//   the summary-card row itself plus the time/date formatters.
//
//   Forcing a symmetric <SummariesBrowser source="student" | "topic"/>
//   that covers both layouts would require either duplicating
//   both render paths behind an `if (source === ...)` (violates
//   "NO cambiar lógica") or reshaping the wrappers' hook usage
//   (violates "NO cambiar lógica" and risks UX drift).
//
//   Instead this file is a presentational list renderer for the
//   Topic view's inline list. Student keeps delegating to
//   TopicSessionGrid unchanged. The shared module hosts:
//     - summaries-format.ts     (date / time formatters)
//     - SummariesBrowser.tsx    (Topic-style card list)
//   and can grow into a full source-parametrized component
//   when the two views converge on a single list grid.
// ============================================================
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  FileText, CheckCircle2, Clock, Layers, ArrowRight,
  Eye, Sparkles,
} from 'lucide-react';
import type { Summary } from '@/app/services/summariesApi';
import { ProgressBar, focusRing } from '@/app/components/design-kit';
import { formatTimeSpent, formatRelativeDate } from './summaries-format';

// Minimal subset of the EnrichedSummary shape used by the Topic view.
export interface BrowserItem {
  summary: Summary;
  readingState: {
    completed?: boolean | null;
    time_spent_seconds?: number | null;
    last_read_at?: string | null;
    scroll_position?: number | null;
  } | null;
  flashcardCount: number;
}

export interface SummariesBrowserProps {
  /** Source discriminator kept for forward compatibility. */
  source: 'student' | 'topic';
  items: BrowserItem[];
  nextUnreadId: string | null;
  onSelect: (summary: Summary) => void;
}

export function SummariesBrowser({ items, nextUnreadId, onSelect }: SummariesBrowserProps) {
  const shouldReduce = useReducedMotion();

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const { summary, readingState, flashcardCount } = item;
        const isCompleted = readingState?.completed === true;
        const isInProgress = !isCompleted && readingState != null && (readingState.time_spent_seconds ?? 0) > 0;
        const isNextUnread = nextUnreadId === summary.id;

        return (
          <motion.button
            key={summary.id}
            onClick={() => onSelect(summary)}
            className={`w-full bg-white border-2 rounded-xl p-5 text-left transition-all cursor-pointer relative overflow-hidden group ${focusRing} ${
              isCompleted
                ? 'border-emerald-200 hover:border-emerald-300'
                : isInProgress
                  ? 'border-teal-200 hover:border-teal-300 hover:shadow-md'
                  : 'border-zinc-200 hover:border-zinc-300 hover:shadow-md'
            }`}
            initial={shouldReduce ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.06 * idx }}
            whileHover={shouldReduce ? undefined : { y: -2 }}
          >
            {/* Accent bar */}
            {isCompleted && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            )}
            {isInProgress && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />
            )}

            <div className="flex items-start gap-4">
              {/* Status icon */}
              <div className="mt-0.5 shrink-0">
                {isCompleted ? (
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  </div>
                ) : isInProgress ? (
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center">
                    <Clock className="w-4.5 h-4.5 text-teal-600" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                    <FileText className="w-4.5 h-4.5 text-zinc-400" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm text-zinc-900 truncate" style={{ fontWeight: 600 }}>
                    {summary.title || `Resumen ${idx + 1}`}
                  </h3>

                  {isNextUnread && !isCompleted && !isInProgress && (
                    <motion.span
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-teal-600 text-white rounded-full shrink-0"
                      animate={shouldReduce ? undefined : { opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      style={{ fontWeight: 600 }}
                    >
                      <Sparkles className="w-3 h-3" />
                      Siguiente
                    </motion.span>
                  )}

                  {/* Status badge */}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    summary.status === 'published'
                      ? 'bg-emerald-100 text-emerald-700'
                      : summary.status === 'draft'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-zinc-100 text-zinc-500'
                  }`} style={{ fontWeight: 600 }}>
                    {summary.status === 'published' ? 'Publicado' : summary.status === 'draft' ? 'Borrador' : summary.status}
                  </span>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-xs text-zinc-500" style={{ fontWeight: 500 }}>
                  {flashcardCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {flashcardCount} flashcard{flashcardCount !== 1 ? 's' : ''}
                    </span>
                  )}

                  {isCompleted && (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Eye className="w-3 h-3" />
                      Leído
                    </span>
                  )}

                  {isInProgress && readingState?.time_spent_seconds && (
                    <span className="flex items-center gap-1 text-teal-600">
                      <Clock className="w-3 h-3" />
                      {formatTimeSpent(readingState.time_spent_seconds)}
                    </span>
                  )}

                  {readingState?.last_read_at && (
                    <span className="text-zinc-400">
                      {formatRelativeDate(readingState.last_read_at)}
                    </span>
                  )}
                </div>

                {/* Reading progress bar for in-progress summaries */}
                {isInProgress && readingState?.scroll_position != null && readingState.scroll_position > 0 && (
                  <div className="mt-2.5">
                    <ProgressBar
                      value={Math.min(readingState.scroll_position / 100, 1)}
                      color="bg-teal-500"
                      className="h-1.5"
                    />
                  </div>
                )}
              </div>

              {/* Hover arrow */}
              <div className="shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-4 h-4 text-zinc-400" />
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
