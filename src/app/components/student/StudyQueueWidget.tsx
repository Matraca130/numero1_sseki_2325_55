// ============================================================
// Axon — StudyQueueWidget (Student Sidebar Widget)
//
// Compact widget showing pending flashcards from study queue.
// Uses GET /study-queue?course_id=xxx&limit=20.
// Auto-refreshes every 60s or on window refocus.
//
// Design: Light theme (bg-white, gray borders) for sidebar.
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Play, Loader2, RefreshCw, AlertCircle,
  Flame, Tag, Clock, Image as ImageIcon,
} from 'lucide-react';
import { getStudyQueue } from '@/app/lib/studyQueueApi';
import type { StudyQueueItem, StudyQueueMeta } from '@/app/lib/studyQueueApi';

// ── Props ─────────────────────────────────────────────────

interface StudyQueueWidgetProps {
  courseId?: string;
  onStartSession: (queue: StudyQueueItem[]) => void;
  className?: string;
}

// ── Time helpers ──────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

// ── Mastery color helpers ─────────────────────────────────

function masteryBorderColor(color: string): string {
  switch (color) {
    case 'green': return 'border-l-emerald-500';
    case 'yellow': return 'border-l-amber-500';
    case 'red': return 'border-l-red-500';
    default: return 'border-l-gray-300';
  }
}

// ── Component ─────────────────────────────────────────────

export function StudyQueueWidget({
  courseId,
  onStartSession,
  className = '',
}: StudyQueueWidgetProps) {
  const [queue, setQueue] = useState<StudyQueueItem[]>([]);
  const [meta, setMeta] = useState<StudyQueueMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch queue ─────────────────────────────────────────
  const fetchQueue = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const result = await getStudyQueue({ course_id: courseId, limit: 20 });
      setQueue(result.queue || []);
      setMeta(result.meta || null);
    } catch (err: any) {
      console.error('[StudyQueueWidget] Error:', err);
      setError(err.message || 'Error al cargar cola');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  // ── Initial load + auto-refresh ─────────────────────────
  useEffect(() => {
    fetchQueue();

    // Auto-refresh every 60s
    refreshTimerRef.current = setInterval(() => {
      fetchQueue(false);
    }, 60000);

    // Refresh on window focus
    const onFocus = () => fetchQueue(false);
    window.addEventListener('focus', onFocus);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchQueue]);

  // ── Derived stats ───────────────────────────────────────
  const totalDue = meta?.total_due || 0;
  const totalNew = meta?.total_new || 0;
  const totalInQueue = meta?.total_in_queue || 0;
  const totalReview = Math.max(0, totalInQueue - totalDue - totalNew);
  const nextCard = queue[0] || null;

  // ── Loading state ───────────────────────────────────────
  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-violet-500" />
            <span className="text-sm font-semibold text-gray-700">Cola de Estudio</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {/* Skeleton count cards */}
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-8 mx-auto mb-1" />
                <div className="h-3 bg-gray-200 rounded w-12 mx-auto" />
              </div>
            ))}
          </div>
          {/* Skeleton preview */}
          <div className="bg-gray-50 rounded-lg p-3 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          {/* Skeleton button */}
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────
  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-violet-500" />
            <span className="text-sm font-semibold text-gray-700">Cola de Estudio</span>
          </div>
        </div>
        <div className="p-4 flex flex-col items-center text-center py-6">
          <AlertCircle size={24} className="text-red-400 mb-2" />
          <p className="text-sm text-gray-600 mb-3">Error al cargar cola</p>
          <button
            onClick={() => fetchQueue()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-all"
          >
            <RefreshCw size={12} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────
  if (totalInQueue === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-violet-500" />
            <span className="text-sm font-semibold text-gray-700">Cola de Estudio</span>
          </div>
        </div>
        <div className="p-4 flex flex-col items-center text-center py-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <span className="text-xl">🎉</span>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Todo al dia!</p>
          <p className="text-xs text-gray-400">No hay tarjetas pendientes por revisar.</p>
        </div>
      </div>
    );
  }

  // ── Data state ──────────────────────────────────────────
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-violet-500" />
            <span className="text-sm font-semibold text-gray-700">Cola de Estudio</span>
          </div>
          <button
            onClick={() => fetchQueue(false)}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            title="Actualizar"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Count breakdown cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{totalDue}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Vencidas</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-500">{totalNew}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Nuevas</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">{totalReview}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Revision</p>
          </div>
        </div>

        {/* Total count */}
        <p className="text-xs text-gray-500 text-center">
          {totalInQueue} tarjeta{totalInQueue !== 1 ? 's' : ''} en cola
        </p>

        {/* Next card preview */}
        {nextCard && (
          <div className={`bg-gray-50 rounded-lg p-3 border-l-[3px] ${masteryBorderColor(nextCard.mastery_color)}`}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Proxima:
            </p>
            <div className="flex items-start gap-2">
              {/* Thumbnail if has image */}
              {nextCard.front_image_url && (
                <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                  <img
                    src={nextCard.front_image_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-700 line-clamp-2 leading-snug">
                  {nextCard.front}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  {nextCard.is_new && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                      Nueva
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    Score: {(nextCard.need_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Urgency bar */}
            <div className="mt-2">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    nextCard.need_score > 0.7 ? 'bg-red-500'
                    : nextCard.need_score > 0.4 ? 'bg-amber-500'
                    : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(nextCard.need_score * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Start session button */}
        <button
          onClick={() => onStartSession(queue)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-all shadow-sm"
        >
          <Play size={16} />
          Comenzar sesion ({totalInQueue})
        </button>

        {/* Footer info */}
        {meta?.generated_at && (
          <p className="text-[10px] text-gray-400 text-center">
            Actualizado {timeAgo(meta.generated_at)}
          </p>
        )}
      </div>
    </div>
  );
}

export default StudyQueueWidget;
