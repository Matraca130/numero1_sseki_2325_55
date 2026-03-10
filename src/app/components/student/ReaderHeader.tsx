// ============================================================
// Axon — ReaderHeader (breadcrumb + header card + paginated preview)
//
// Extracted from StudentSummaryReader.tsx (Phase 2, Step 3).
// Pure presentational component — all data and handlers via props.
//
// Sections:
//   1. XP Toast overlay
//   2. Breadcrumb (back + topic + summary title)
//   3. Summary header card (icon, title, date, reading time, mark read)
//   4. Paginated content preview (HTML or plain text with keyword highlighting)
//   5. Completion card (when summary is marked completed)
// ============================================================
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ChevronRight,
  CheckCircle2, Clock, Loader2,
  BookOpen, Layers,
} from 'lucide-react';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import {
  PageNavigation,
  CompletionCard,
  XpToast,
  focusRing,
  proseClasses,
} from '@/app/components/design-kit';
import { KeywordHighlighterInline } from '@/app/components/student/KeywordHighlighterInline';
import { renderPlainLine } from '@/app/lib/summary-content-helpers';

// ── Props ─────────────────────────────────────────────────

export interface ReaderHeaderProps {
  summary: Summary;
  topicName: string;
  readingState: ReadingState | null;
  onBack: () => void;
  // Mutations
  onMarkCompleted: () => void;
  onUnmarkCompleted: () => void;
  markingRead: boolean;
  showXpToast: boolean;
  // Pagination
  isHtmlContent: boolean;
  htmlPages: string[];
  textPages: string[][];
  safePage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // Keyword navigation (for KeywordHighlighterInline)
  onNavigateKeyword: (keywordId: string, summaryId: string) => void;
  // Tab switching (CompletionCard action → switch to keywords tab)
  onSwitchTab: (tab: string) => void;
}

// ── Component ─────────────────────────────────────────────

export function ReaderHeader({
  summary,
  topicName,
  readingState,
  onBack,
  onMarkCompleted,
  onUnmarkCompleted,
  markingRead,
  showXpToast,
  isHtmlContent,
  htmlPages,
  textPages,
  safePage,
  totalPages,
  onPageChange,
  onNavigateKeyword,
  onSwitchTab,
}: ReaderHeaderProps) {
  const isCompleted = readingState?.completed === true;

  return (
    <>
      {/* XP Toast */}
      <XpToast amount={15} show={showXpToast} />

      {/* ── Breadcrumb + back ── */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={onBack}
          className={`flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors ${focusRing} rounded-lg px-2 py-1`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span style={{ fontWeight: 500 }}>Resumenes</span>
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-sm text-zinc-400">{topicName}</span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-sm text-zinc-700 truncate max-w-[200px]" style={{ fontWeight: 600 }}>
          {summary.title || 'Sin titulo'}
        </span>
      </div>

      {/* ── Summary header card ── */}
      <div className="bg-white rounded-2xl border-2 border-zinc-200 shadow-sm mb-6 overflow-hidden">
        {/* Accent bar */}
        <div className={`h-1 ${isCompleted ? 'bg-emerald-500' : 'bg-teal-500'}`} />

        {/* Title bar */}
        <div className="px-6 sm:px-8 py-6 border-b border-zinc-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${
                isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-teal-50 border-teal-200'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <BookOpen className="w-6 h-6 text-teal-600" />
                )}
              </div>
              <div>
                <h2 className="text-zinc-900 text-lg tracking-tight" style={{ fontWeight: 700 }}>
                  {summary.title || 'Sin titulo'}
                </h2>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-700 border border-emerald-200" style={{ fontWeight: 600 }}>
                      <CheckCircle2 className="w-3 h-3" /> Completado
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-400">
                    {new Date(summary.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  {readingState?.time_spent_seconds != null && readingState.time_spent_seconds > 0 && (
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round(readingState.time_spent_seconds / 60)} min de lectura
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mark as read/unread */}
            <motion.button
              onClick={isCompleted ? onUnmarkCompleted : onMarkCompleted}
              disabled={markingRead}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm shrink-0 transition-all cursor-pointer ${focusRing} ${
                isCompleted
                  ? 'bg-white border-2 border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/25'
              }`}
              style={{ fontWeight: 600 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {markingRead ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isCompleted ? (
                <><CheckCircle2 className="w-4 h-4" /> Marcar no leido</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Marcar como leido</>
              )}
            </motion.button>
          </div>
        </div>

        {/* ── Paginated content preview ── */}
        {summary.content_markdown && (
          <div className="px-6 sm:px-8 py-6">
            <div className="min-h-[180px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={safePage}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {isHtmlContent ? (
                    <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={onNavigateKeyword}>
                      <div className={proseClasses} dangerouslySetInnerHTML={{ __html: htmlPages[safePage] || '' }} />
                    </KeywordHighlighterInline>
                  ) : (
                    <KeywordHighlighterInline summaryId={summary.id} onNavigateKeyword={onNavigateKeyword}>
                      <div className="axon-prose max-w-none">
                        {textPages[safePage]?.map((line, i) => renderPlainLine(line, i))}
                      </div>
                    </KeywordHighlighterInline>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <PageNavigation
                currentPage={safePage}
                totalPages={totalPages}
                onPrev={() => onPageChange(Math.max(0, safePage - 1))}
                onNext={() => onPageChange(Math.min(totalPages - 1, safePage + 1))}
                onPageClick={(i) => onPageChange(i)}
              />
            )}
          </div>
        )}

        {/* Completion card when read */}
        {isCompleted && (
          <div className="px-6 sm:px-8 pb-6">
            <CompletionCard
              title="Resumen completado!"
              subtitle={`Has leido "${summary.title || 'este resumen'}"`}
              xpEarned={15}
              actions={[
                { label: `Flashcards`, icon: Layers, onClick: () => onSwitchTab('keywords'), variant: 'secondary' },
              ]}
            />
          </div>
        )}
      </div>
    </>
  );
}
