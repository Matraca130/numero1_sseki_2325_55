// ============================================================
// Axon — Student: Quiz History Panel (P4 Feature)
//
// Agent: HISTORIAN
// Shows the student's past quiz sessions with score, date,
// and completion status. Fetched from /study-sessions.
//
// Design: teal accent, collapsible, sorted by date descending.
// P-PERF: Lazy loading — only fetches when panel is opened.
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { getStudySessions } from '@/app/services/quizApi';
import type { StudySession } from '@/app/services/quizApi';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  History, Clock, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Loader2, Trophy,
  CalendarDays,
} from 'lucide-react';
import { logger } from '@/app/lib/logger';
import { STUDENT_COLORS } from '@/app/services/quizDesignTokens';
import { ProgressTrendChart } from '@/app/components/student/ProgressTrendChart';

// ── Props ────────────────────────────────────────────────

interface QuizHistoryPanelProps {
  /** Force a refresh when this key changes (e.g. after completing a quiz) */
  refreshKey?: number;
}

// ── Helpers ──────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function durationLabel(started: string, completed?: string | null): string {
  if (!completed) return 'En progreso';
  const ms = new Date(completed).getTime() - new Date(started).getTime();
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

// ── Component ────────────────────────────────────────────

export const QuizHistoryPanel = React.memo(function QuizHistoryPanel({
  refreshKey,
}: QuizHistoryPanelProps) {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // P-PERF: Lazy load — only fetch when panel is opened
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    getStudySessions({ session_type: 'quiz', limit: 20 })
      .then(items => {
        if (!cancelled) {
          // Sort by date descending
          const sorted = [...items].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          setSessions(sorted);
        }
      })
      .catch(err => {
        logger.warn('[QuizHistory] Load failed (non-blocking):', err);
        if (!cancelled) setSessions([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey, open]);

  // Stats summary
  const stats = useMemo(() => {
    const completed = sessions.filter(s => s.completed_at);
    const totalCorrect = completed.reduce((sum, s) => sum + (s.correct_reviews || 0), 0);
    const totalReviews = completed.reduce((sum, s) => sum + (s.total_reviews || 0), 0);
    return {
      total: sessions.length,
      completed: completed.length,
      avgPct: totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0,
    };
  }, [sessions]);

  if (loading && !open) return null; // Don't show until data is ready

  return (
    <div className="mt-6">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-axon-accent hover:text-axon-hover transition-colors mx-auto px-4 py-2 rounded-xl hover:bg-axon-accent-10"
        style={{ fontWeight: 600 }}
      >
        <History size={16} />
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Historial de quizzes
        {stats.total > 0 && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STUDENT_COLORS.badge}`} style={{ fontWeight: 700 }}>
            {stats.total}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {/* P10: Progress Trend Chart */}
              {sessions.length >= 2 && <ProgressTrendChart sessions={sessions} />}

              {/* Summary bar */}
              {stats.total > 0 && (
                <div className="flex items-center justify-center gap-4 mb-3">
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <Trophy size={12} className="text-axon-accent" />
                    {stats.completed} completados
                  </span>
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    Promedio: {stats.avgPct}%
                  </span>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8 gap-2">
                  <Loader2 size={16} className="animate-spin text-axon-accent" />
                  <span className="text-[12px] text-zinc-400">Cargando historial...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <History size={24} className="text-zinc-300 mx-auto mb-2" />
                  <p className="text-[12px] text-zinc-400">No hay sesiones de quiz registradas</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar-light">
                  {sessions.map((session, i) => {
                    const isCompleted = !!session.completed_at;
                    const total = session.total_reviews || 0;
                    const correct = session.correct_reviews || 0;
                    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={clsx(
                          'flex items-center gap-3 px-4 py-3 rounded-xl border bg-white transition-all hover:shadow-sm',
                          isCompleted ? 'border-zinc-200' : 'border-amber-200 bg-amber-50/30',
                        )}
                      >
                        {/* Score circle */}
                        <div className={clsx(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[12px]',
                          !isCompleted ? 'bg-amber-100 text-amber-600' :
                          pct >= 70 ? 'bg-emerald-100 text-emerald-700' :
                          pct >= 40 ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-600',
                        )} style={{ fontWeight: 700 }}>
                          {isCompleted ? `${pct}%` : '...'}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] text-zinc-700 flex items-center gap-1" style={{ fontWeight: 600 }}>
                              <CalendarDays size={11} className="text-zinc-400" />
                              {formatDate(session.created_at)}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {formatTime(session.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                            {isCompleted ? (
                              <>
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 size={10} className="text-emerald-500" />
                                  {correct}/{total}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {durationLabel(session.started_at, session.completed_at)}
                                </span>
                              </>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-500" style={{ fontWeight: 600 }}>
                                <XCircle size={10} />
                                No completado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        {isCompleted && total > 0 && (
                          <div className="w-16 shrink-0">
                            <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                              <div
                                className={clsx(
                                  'h-full rounded-full transition-all',
                                  pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-400',
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
