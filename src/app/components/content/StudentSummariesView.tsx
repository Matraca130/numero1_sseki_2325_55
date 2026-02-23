// ============================================================
// Axon — StudentSummariesView (Student: read-only summaries)
//
// Shows published summaries for the selected topic from the
// content tree. Clicking a summary opens StudentSummaryReader.
// Reading states are fetched to show progress badges.
//
// All data from real backend via summariesApi + studentSummariesApi.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, ChevronRight, Loader2, RefreshCw,
  CheckCircle2, BookOpen, Clock, ArrowLeft, AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { StudentSummaryReader } from './StudentSummaryReader';
import * as summariesApi from '@/app/services/summariesApi';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';

// ── Helper: extract items from CRUD factory response ──────
function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

export function StudentSummariesView() {
  const { selectedTopicId, tree } = useContentTree();

  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [readingStates, setReadingStates] = useState<Record<string, ReadingState>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);

  // Resolve topic name from tree
  const topicName = (() => {
    if (!tree || !selectedTopicId) return '';
    for (const c of tree.courses) {
      for (const s of c.semesters) {
        for (const sec of s.sections) {
          for (const t of sec.topics) {
            if (t.id === selectedTopicId) return t.name;
          }
        }
      }
    }
    return '';
  })();

  // ── Fetch summaries ─────────────────────────────────────
  const fetchSummaries = useCallback(async () => {
    if (!selectedTopicId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await summariesApi.getSummaries(selectedTopicId);
      const items = extractItems<Summary>(result);
      // Students only see published summaries
      const published = items.filter(s => s.status === 'published' && s.is_active);
      setSummaries(published.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));

      // Fetch reading states for all summaries (in parallel, ignore errors)
      const statesMap: Record<string, ReadingState> = {};
      await Promise.allSettled(
        published.map(async (s) => {
          try {
            const state = await studentApi.getReadingState(s.id);
            if (state) statesMap[s.id] = state;
          } catch { /* ignore */ }
        })
      );
      setReadingStates(statesMap);
    } catch (err: any) {
      console.error('[StudentSummaries] Load error:', err);
      setError(err.message || 'Error al cargar resumenes');
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTopicId]);

  useEffect(() => {
    setSelectedSummaryId(null);
    fetchSummaries();
  }, [selectedTopicId, fetchSummaries]);

  // ── If reading a summary → show reader ──────────────────
  const selectedSummary = summaries.find(s => s.id === selectedSummaryId);
  if (selectedSummaryId && selectedSummary) {
    return (
      <StudentSummaryReader
        summary={selectedSummary}
        topicName={topicName}
        readingState={readingStates[selectedSummary.id] || null}
        onBack={() => setSelectedSummaryId(null)}
        onReadingStateChanged={(rs) => {
          setReadingStates(prev => ({ ...prev, [selectedSummary.id]: rs }));
        }}
      />
    );
  }

  // ── No topic selected ───────────────────────────────────
  if (!selectedTopicId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
          <BookOpen size={28} className="text-teal-300" />
        </div>
        <p className="text-gray-500 mb-1">Selecciona un topico</p>
        <p className="text-xs text-gray-400">
          Usa el arbol de contenido a la izquierda para navegar
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="max-w-3xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
              <BookOpen size={20} className="text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
                <span>Resumenes</span>
                <ChevronRight size={12} />
                <span className="text-gray-600">{topicName}</span>
              </div>
              <h2 className="text-gray-900">{topicName}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {loading ? 'Cargando...' : `${summaries.length} resumen${summaries.length !== 1 ? 'es' : ''} disponible${summaries.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchSummaries}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchSummaries} className="mt-3">
              Reintentar
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && summaries.length === 0 && (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-teal-300" />
            </div>
            <p className="text-sm text-gray-500 mb-1">
              No hay resumenes publicados en este topico
            </p>
            <p className="text-xs text-gray-400">
              El profesor aun no ha publicado contenido aqui
            </p>
          </div>
        )}

        {/* Summaries list */}
        {!loading && !error && summaries.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {summaries.map((s, index) => {
                const rs = readingStates[s.id];
                const isCompleted = rs?.completed === true;

                return (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                    className="group bg-white rounded-xl border border-gray-200 hover:border-teal-200 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => setSelectedSummaryId(s.id)}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={clsx(
                            "w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5",
                            isCompleted
                              ? "bg-emerald-50 border-emerald-200"
                              : "bg-teal-50 border-teal-100"
                          )}>
                            {isCompleted ? (
                              <CheckCircle2 size={14} className="text-emerald-500" />
                            ) : (
                              <FileText size={14} className="text-teal-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm text-gray-900 truncate">
                                {s.title || 'Sin titulo'}
                              </h3>
                              {isCompleted && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                  <CheckCircle2 size={10} /> Leido
                                </span>
                              )}
                              {rs && !isCompleted && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                                  <Clock size={10} /> En progreso
                                </span>
                              )}
                            </div>
                            {s.content_markdown && (
                              <p className="text-xs text-gray-400 truncate max-w-md">
                                {s.content_markdown.substring(0, 120)}
                                {s.content_markdown.length > 120 ? '...' : ''}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[10px] text-gray-300">
                                {new Date(s.created_at).toLocaleDateString('es-MX', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                })}
                              </span>
                              {rs?.time_spent_seconds != null && rs.time_spent_seconds > 0 && (
                                <span className="text-[10px] text-gray-300 flex items-center gap-1">
                                  <Clock size={9} />
                                  {Math.round(rs.time_spent_seconds / 60)} min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <ChevronRight size={14} className="text-gray-300 group-hover:text-teal-400 transition-colors shrink-0 mt-2 ml-3" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
