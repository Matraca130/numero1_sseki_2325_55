// ============================================================
// Axon — StudySessionHistory Widget
//
// Shows a compact list of recent study sessions with stats.
// Useful for the student dashboard or FlashcardView summary.
//
// BACKEND: GET /study-sessions (via studySessionApi)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Brain,
  Loader2,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import * as sessionApi from '@/app/services/studySessionApi';
import type { StudySessionRecord } from '@/app/services/studySessionApi';

interface StudySessionHistoryProps {
  /** Max sessions to display */
  limit?: number;
  /** Compact mode for sidebar */
  compact?: boolean;
  /** Optional class name */
  className?: string;
}

export function StudySessionHistory({
  limit = 10,
  compact = false,
  className = '',
}: StudySessionHistoryProps) {
  const [sessions, setSessions] = useState<StudySessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const result = await sessionApi.getStudySessions({ limit });
      // Filter to only completed sessions
      const completed = result.filter(s => s.completed_at);
      setSessions(completed);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[StudySessionHistory] Failed to load:', err);
      }
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Derived stats ──
  const totalSessions = sessions.length;
  const totalReviews = sessions.reduce((acc, s) => acc + (s.total_reviews || 0), 0);
  const totalCorrect = sessions.reduce((acc, s) => acc + (s.correct_reviews || 0), 0);
  const overallAccuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;

  // ── Time formatting ──
  function formatSessionTime(session: StudySessionRecord): string {
    if (!session.completed_at || !session.created_at) return '—';
    const start = new Date(session.created_at).getTime();
    const end = new Date(session.completed_at).getTime();
    const diffMs = end - start;
    if (diffMs < 0) return '—';
    const mins = Math.floor(diffMs / 60_000);
    const secs = Math.floor((diffMs % 60_000) / 1000);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} dias`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  function getSessionAccuracy(s: StudySessionRecord): number {
    if (!s.total_reviews || s.total_reviews === 0) return 0;
    return Math.round(((s.correct_reviews || 0) / s.total_reviews) * 100);
  }

  const sessionTypeLabel: Record<string, string> = {
    flashcard: 'Flashcards',
    quiz: 'Quiz',
    reading: 'Lectura',
    mixed: 'Mixta',
  };

  const sessionTypeIcon: Record<string, React.ReactNode> = {
    flashcard: <Brain size={12} className="text-violet-500" />,
    quiz: <CheckCircle2 size={12} className="text-teal-500" />,
    reading: <BarChart3 size={12} className="text-blue-500" />,
    mixed: <TrendingUp size={12} className="text-amber-500" />,
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-100 overflow-hidden ${className}`}>
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-violet-500" />
          <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>
            Historial de Sesiones
          </span>
          {!loading && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {totalSessions}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!loading && totalSessions > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              overallAccuracy >= 80
                ? 'bg-emerald-50 text-emerald-600'
                : overallAccuracy >= 50
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-red-50 text-red-600'
            }`} style={{ fontWeight: 500 }}>
              {overallAccuracy}% avg
            </span>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {/* ── Content ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-violet-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-6 px-4">
                <p className="text-xs text-gray-400">
                  No hay sesiones de estudio completadas aun.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* ── Summary row ── */}
                <div className="px-4 py-2.5 bg-gray-50/50 flex items-center gap-4 text-[10px] text-gray-500">
                  <span>{totalReviews} revisiones totales</span>
                  <span>&middot;</span>
                  <span>{totalCorrect} correctas</span>
                  <span>&middot;</span>
                  <span>{overallAccuracy}% precision</span>
                </div>

                {/* ── Session rows ── */}
                {sessions.map((session) => {
                  const accuracy = getSessionAccuracy(session);
                  return (
                    <div
                      key={session.id}
                      className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
                    >
                      {/* Type icon */}
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        {sessionTypeIcon[session.session_type] || <Brain size={12} className="text-gray-400" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-gray-700 truncate" style={{ fontWeight: 500 }}>
                            {sessionTypeLabel[session.session_type] || 'Sesion'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            &middot; {session.total_reviews || 0} cards
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Calendar size={9} className="text-gray-300" />
                          <span className="text-[10px] text-gray-400">
                            {session.created_at ? formatRelativeDate(session.created_at) : '—'}
                          </span>
                          <span className="text-[10px] text-gray-300">&middot;</span>
                          <Clock size={9} className="text-gray-300" />
                          <span className="text-[10px] text-gray-400">
                            {formatSessionTime(session)}
                          </span>
                        </div>
                      </div>

                      {/* Accuracy badge */}
                      <div className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                        accuracy >= 80
                          ? 'bg-emerald-50 text-emerald-600'
                          : accuracy >= 50
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-red-50 text-red-600'
                      }`} style={{ fontWeight: 600 }}>
                        {accuracy}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
