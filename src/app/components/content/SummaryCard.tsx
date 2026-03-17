// ============================================================
// Axon — SummaryCard (Sprint 1: extracted from StudentSummariesView)
//
// Pure renderer: receives summary + reading state, renders a
// card with status badges, markdown preview, and progress bar.
// All colors from @/app/lib/palette — zero generic Tailwind colors.
// ============================================================
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  FileText, CheckCircle2, Clock, ArrowRight, Sparkles,
} from 'lucide-react';
import { ProgressBar, focusRing } from '@/app/components/design-kit';
import { axon, tint } from '@/app/lib/palette';
import { stripMarkdown } from './summary-helpers';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';

export interface SummaryCardProps {
  summary: Summary;
  readingState: ReadingState | null;
  isNextToRead: boolean;
  index: number;
  onSelect: (id: string) => void;
}

export const SummaryCard = React.memo(function SummaryCard({
  summary: s,
  readingState: rs,
  isNextToRead,
  index,
  onSelect,
}: SummaryCardProps) {
  const shouldReduce = useReducedMotion();
  const isCompleted = rs?.completed === true;
  const isInProgress = !!rs && !isCompleted;

  // ── Palette-derived colors ──────────────────────────────
  const borderColor = isCompleted
    ? tint.successBorder
    : (isNextToRead || isInProgress)
      ? tint.tealBorder
      : tint.neutralBorder;

  const accentColor = isCompleted
    ? tint.successAccent
    : (isInProgress || isNextToRead)
      ? axon.tealAccent
      : tint.neutralBorder;

  const iconBg = isCompleted
    ? tint.successBg
    : (isInProgress || isNextToRead)
      ? tint.tealBg
      : tint.neutralBg;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04 }}
    >
      <motion.button
        onClick={() => onSelect(s.id)}
        className={`w-full text-left rounded-2xl border-2 p-5 transition-all group cursor-pointer ${focusRing} relative overflow-hidden`}
        style={{
          backgroundColor: axon.cardBg,
          borderColor,
          ...(isNextToRead ? { boxShadow: `0 4px 14px ${tint.tealBorder}44` } : {}),
        }}
        whileHover={shouldReduce ? undefined : { y: -3 }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: accentColor }}
        />

        {/* "Next" badge */}
        {isNextToRead && (
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3.5 h-3.5" style={{ color: axon.tealAccent }} />
            <span
              className="text-[10px] px-2 py-0.5 rounded-full border"
              style={{
                fontWeight: 700,
                color: axon.darkTeal,
                backgroundColor: tint.tealBg,
                borderColor: tint.tealBorder,
              }}
            >
              Siguiente recomendado
            </span>
          </div>
        )}

        <div className="flex items-start gap-4">
          {/* Status icon */}
          <div
            className="w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg, borderColor }}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5" style={{ color: tint.successAccent }} />
            ) : isInProgress ? (
              <Clock className="w-5 h-5" style={{ color: axon.tealAccent }} />
            ) : (
              <FileText className="w-5 h-5" style={{ color: tint.neutralText }} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm truncate" style={{ fontWeight: 700, color: axon.darkTeal }}>
                {s.title || 'Sin titulo'}
              </h3>
              {isCompleted && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border shrink-0"
                  style={{
                    fontWeight: 600,
                    backgroundColor: tint.successBg,
                    color: tint.successText,
                    borderColor: tint.successBorder,
                  }}
                >
                  <CheckCircle2 className="w-3 h-3" /> Leido
                </span>
              )}
              {isInProgress && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border shrink-0"
                  style={{
                    fontWeight: 600,
                    backgroundColor: tint.amberBg,
                    color: tint.amberText,
                    borderColor: tint.amberBorder,
                  }}
                >
                  <Clock className="w-3 h-3" /> En progreso
                </span>
              )}
            </div>

            {/* Markdown preview */}
            {s.content_markdown && (() => {
              const preview = stripMarkdown(s.content_markdown);
              return preview ? (
                <p className="text-xs line-clamp-2 max-w-md mb-2" style={{ color: tint.subtitleText }}>
                  {preview.substring(0, 140)}{preview.length > 140 ? '...' : ''}
                </p>
              ) : null;
            })()}

            {/* Meta row */}
            <div className="flex items-center gap-3">
              <span className="text-[10px]" style={{ color: tint.neutralText }}>
                {new Date(s.created_at).toLocaleDateString('es-MX', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </span>
              {rs?.time_spent_seconds != null && rs.time_spent_seconds > 0 && (
                <span className="text-[10px] flex items-center gap-1" style={{ color: tint.neutralText }}>
                  <Clock className="w-3 h-3" />
                  {Math.round(rs.time_spent_seconds / 60)} min
                </span>
              )}
            </div>
          </div>

          {/* Hover arrow */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1"
            style={{ backgroundColor: tint.neutralBg }}
          >
            <ArrowRight className="w-4 h-4" style={{ color: tint.subtitleText }} />
          </div>
        </div>

        {/* Progress bar for in-progress summaries */}
        {isInProgress && rs?.time_spent_seconds && (
          <div className="mt-3 ml-14">
            <ProgressBar
              value={Math.min((rs.time_spent_seconds || 0) / 300, 0.9)}
              color="bg-[#2a8c7a]"
              className="h-1.5"
            />
          </div>
        )}
      </motion.button>
    </motion.div>
  );
});
