// ============================================================
// Axon — SummaryView (shared: professor + student reader)
//
// Entry point: /professor/summary/:topicId or /student/summary/:topicId
//
// 1. Fetches summaries for the topicId from URL params
// 2. Shows summary list (if multiple) or auto-selects (if one)
// 3. Renders SummaryHeader + ChunkRenderer
// 4. Professor: KeywordsManager section (CRUD)
// 5. Student: invisible reading_states tracking
//
// Routes used (all FLAT):
//   GET /summaries?topic_id=xxx
//   GET /chunks?summary_id=xxx
//   GET /reading-states?summary_id=xxx (student)
//   POST /reading-states (student, UPSERT)
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  FileText, ChevronRight, Loader2, RefreshCw, ArrowLeft,
  CheckCircle2, BookOpen, Clock, AlertCircle, Layers, Tag,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useAuth } from '@/app/context/AuthContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { SummaryHeader } from '@/app/components/summary/SummaryHeader';
import { ChunkRenderer } from '@/app/components/summary/ChunkRenderer';
import { KeywordsManager } from '@/app/components/professor/KeywordsManager';
import { VideosManager } from '@/app/components/professor/VideosManager';
import { KeywordBadges } from '@/app/components/student/KeywordBadges';
import { VideoPlayer } from '@/app/components/student/VideoPlayer';
import { TextHighlighter } from '@/app/components/student/TextHighlighter';
import * as summariesApi from '@/app/services/summariesApi';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { Summary, Chunk } from '@/app/services/summariesApi';
import type { SummaryKeyword } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import type { TextAnnotation } from '@/app/services/studentSummariesApi';

// ── Helper ────────────────────────────────────────────────
function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

// ── Breadcrumb resolution from content tree ───────────────
function resolveBreadcrumb(tree: any, topicId: string): {
  courseName?: string;
  sectionName?: string;
  topicName: string;
} {
  if (!tree) return { topicName: 'Tema' };
  const courses = tree.courses || (Array.isArray(tree) ? tree : []);
  for (const c of courses) {
    for (const sem of (c.semesters || [])) {
      for (const sec of (sem.sections || [])) {
        for (const t of (sec.topics || [])) {
          if (t.id === topicId) {
            return {
              courseName: c.name,
              sectionName: sec.name,
              topicName: t.name,
            };
          }
        }
      }
    }
  }
  return { topicName: 'Tema' };
}

export function SummaryView() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const { activeMembership } = useAuth();
  const { tree } = useContentTree();

  const isProfessor = activeMembership?.role === 'professor'
    || activeMembership?.role === 'owner'
    || activeMembership?.role === 'admin';

  // ── State ───────────────────────────────────────────────
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);

  // Chunks for selected summary
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);

  // Reading state (student only)
  const [readingState, setReadingState] = useState<ReadingState | null>(null);
  const [showResume, setShowResume] = useState(false);

  // Text annotations (student only)
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);

  // Reading tracking refs (student only)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(Date.now());
  const accumulatedTimeRef = useRef(0);
  const lastSaveRef = useRef(0);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Breadcrumb
  const breadcrumb = resolveBreadcrumb(tree, topicId || '');
  const selectedSummary = summaries.find(s => s.id === selectedSummaryId) || null;

  // ── Fetch summaries ─────────────────────────────────────
  const fetchSummaries = useCallback(async () => {
    if (!topicId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await summariesApi.getSummaries(topicId);
      const items = extractItems<Summary>(result)
        .filter(s => isProfessor || s.status === 'published')
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setSummaries(items);

      // Auto-select if only one
      if (items.length === 1) {
        setSelectedSummaryId(items[0].id);
      }
    } catch (err: any) {
      console.error('[SummaryView] fetch error:', err);
      setError(err.message || 'Error al cargar resumenes');
    } finally {
      setLoading(false);
    }
  }, [topicId, isProfessor]);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  // ── Fetch chunks when summary selected ──────────────────
  useEffect(() => {
    if (!selectedSummaryId) {
      setChunks([]);
      return;
    }
    let cancelled = false;
    setChunksLoading(true);
    summariesApi.getChunks(selectedSummaryId)
      .then(result => {
        if (!cancelled) {
          setChunks(
            extractItems<Chunk>(result).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          );
        }
      })
      .catch(err => {
        console.error('[SummaryView] chunks error:', err);
        if (!cancelled) setChunks([]);
      })
      .finally(() => { if (!cancelled) setChunksLoading(false); });

    return () => { cancelled = true; };
  }, [selectedSummaryId]);

  // ── Fetch reading state (student only) ──────────────────
  useEffect(() => {
    if (isProfessor || !selectedSummaryId) return;
    let cancelled = false;

    studentApi.getReadingState(selectedSummaryId)
      .then(rs => {
        if (cancelled) return;
        if (rs) {
          // Handle factory response shape
          const state: ReadingState | null = Array.isArray(rs)
            ? (rs as any)[0] || null
            : (rs as any)?.items
              ? (rs as any).items[0] || null
              : rs;
          setReadingState(state);
          if (state && state.scroll_position != null && state.scroll_position > 0 && state.scroll_position < 0.90) {
            setShowResume(true);
          }
          if (state?.time_spent_seconds) {
            accumulatedTimeRef.current = state.time_spent_seconds;
          }
        }
      })
      .catch(() => { /* silent — no reading state yet */ });

    return () => { cancelled = true; };
  }, [selectedSummaryId, isProfessor]);

  // ── Fetch text annotations (student only) ───────────────
  const fetchAnnotations = useCallback(async () => {
    if (isProfessor || !selectedSummaryId) return;
    try {
      const result = await studentApi.getTextAnnotations(selectedSummaryId);
      setAnnotations(extractItems<TextAnnotation>(result).filter(a => !a.deleted_at));
    } catch {
      setAnnotations([]);
    }
  }, [selectedSummaryId, isProfessor]);

  useEffect(() => { fetchAnnotations(); }, [fetchAnnotations]);

  // ── Reading tracking: periodic save (student only) ──────
  useEffect(() => {
    if (isProfessor || !selectedSummaryId) return;
    startTimeRef.current = Date.now();
    lastSaveRef.current = Date.now();

    const timer = setInterval(() => {
      saveReadingProgress();
    }, 30000); // every 30 seconds
    intervalRef.current = timer;

    return () => {
      clearInterval(timer);
      intervalRef.current = null;
      // Final save on unmount
      saveReadingProgress(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSummaryId, isProfessor]);

  // ── Reading tracking: scroll listener (student only) ────
  useEffect(() => {
    if (isProfessor || !selectedSummaryId) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
      scrollDebounceRef.current = setTimeout(() => {
        saveReadingProgress();
      }, 2000); // 2s debounce
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSummaryId, isProfessor]);

  // ── Save reading progress helper ───────────────────────
  function saveReadingProgress(isFinal = false) {
    if (isProfessor || !selectedSummaryId) return;

    const now = Date.now();
    const sessionSeconds = Math.round((now - startTimeRef.current) / 1000);
    const totalSeconds = accumulatedTimeRef.current + sessionSeconds;

    // Calculate scroll position
    let scrollPos = 0;
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      scrollPos = scrollHeight > clientHeight
        ? Math.min(1, scrollTop / (scrollHeight - clientHeight))
        : 1;
    }

    const completed = scrollPos >= 0.90;

    const payload: any = {
      summary_id: selectedSummaryId,
      scroll_position: Math.round(scrollPos * 1000) / 1000,
      time_spent_seconds: totalSeconds,
      last_read_at: new Date().toISOString(),
    };
    if (completed) payload.completed = true;

    // Fire and forget
    studentApi.upsertReadingState(payload)
      .then(rs => {
        if (rs) setReadingState(rs);
      })
      .catch(() => { /* silent */ });
  }

  // ── Resume scroll position ──────────────────────────────
  const handleResumeScroll = () => {
    setShowResume(false);
    if (readingState?.scroll_position != null && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const targetScroll = readingState.scroll_position * (container.scrollHeight - container.clientHeight);
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  };

  // ── Back handler ────────────────────────────────────────
  const handleBack = () => {
    if (selectedSummaryId && summaries.length > 1) {
      setSelectedSummaryId(null);
    } else {
      navigate(-1);
    }
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50/50">
        <div className="max-w-4xl mx-auto p-8">
          <Skeleton className="h-4 w-48 mb-6" />
          <Skeleton className="h-24 w-full rounded-xl mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50/50">
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center py-16">
            <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft size={13} className="mr-1" /> Volver
              </Button>
              <Button size="sm" onClick={fetchSummaries}>
                <RefreshCw size={13} className="mr-1" /> Reintentar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50/50">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-gray-600 transition-colors">
              <ArrowLeft size={14} /> Volver
            </button>
            <ChevronRight size={14} className="text-gray-300" />
            <span>{breadcrumb.topicName}</span>
          </div>
          <div className="text-center py-16">
            <FileText size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No hay resumenes para este tema</p>
            <p className="text-xs text-gray-400 mt-1">
              {isProfessor
                ? 'Crea el primer resumen desde la vista de Curriculum'
                : 'El profesor aun no ha publicado resumenes'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Summary list (when multiple and none selected) ──────
  if (!selectedSummaryId) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50/50">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-gray-600 transition-colors">
              <ArrowLeft size={14} /> Volver
            </button>
            {breadcrumb.courseName && (
              <>
                <ChevronRight size={14} className="text-gray-300" />
                <span className="truncate max-w-[120px]">{breadcrumb.courseName}</span>
              </>
            )}
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-gray-600">{breadcrumb.topicName}</span>
          </div>

          <h2 className="text-gray-800 mb-4">Resumenes</h2>

          <div className="space-y-2">
            {summaries.map((s, idx) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => setSelectedSummaryId(s.id)}
                className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-violet-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                    <BookOpen size={16} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate group-hover:text-violet-700 transition-colors">
                      {s.title || 'Sin titulo'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {isProfessor && (
                        <span className={clsx(
                          "text-[10px] px-1.5 py-0.5 rounded-full",
                          s.status === 'published' ? 'bg-emerald-50 text-emerald-700' :
                          s.status === 'draft' ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        )}>
                          {s.status === 'published' ? 'Publicado' : s.status === 'draft' ? 'Borrador' : 'Rechazado'}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-300">
                        {new Date(s.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-violet-400 transition-colors" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Selected summary: reader view ───────────────────────
  if (!selectedSummary) return null;

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto bg-gray-50/50"
    >
      <div className="max-w-4xl mx-auto p-8">
        {/* Resume prompt (student only) */}
        <AnimatePresence>
          {showResume && !isProfessor && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-violet-50 border border-violet-200 rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-violet-600" />
                <span className="text-xs text-violet-700">Continuar donde dejaste?</span>
                {readingState?.time_spent_seconds != null && readingState.time_spent_seconds > 0 && (
                  <span className="text-[10px] text-violet-400">
                    ({Math.round(readingState.time_spent_seconds / 60)} min acumulados)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="h-6 text-[10px] text-violet-500" onClick={() => setShowResume(false)}>
                  Desde el inicio
                </Button>
                <Button size="sm" className="h-6 text-[10px] bg-violet-600 hover:bg-violet-700 text-white" onClick={handleResumeScroll}>
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <SummaryHeader
          summary={selectedSummary}
          breadcrumb={breadcrumb}
          isCompleted={readingState?.completed === true}
          timeSpentSeconds={readingState?.time_spent_seconds ?? undefined}
          onBack={handleBack}
          actions={
            !isProfessor ? (
              <Button
                size="sm"
                variant={readingState?.completed ? 'outline' : 'default'}
                onClick={() => {
                  const newCompleted = !readingState?.completed;
                  studentApi.upsertReadingState({
                    summary_id: selectedSummary.id,
                    completed: newCompleted,
                    last_read_at: new Date().toISOString(),
                  }).then(rs => {
                    setReadingState(rs);
                    toast.success(newCompleted ? 'Marcado como leido' : 'Marcado como no leido');
                  }).catch(err => toast.error(err.message || 'Error'));
                }}
                className={clsx(
                  !readingState?.completed && "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                <CheckCircle2 size={13} className="mr-1" />
                {readingState?.completed ? 'Marcar no leido' : 'Marcar como leido'}
              </Button>
            ) : undefined
          }
        />

        {/* Chunks content */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm text-gray-700 flex items-center gap-1.5">
              <Layers size={14} className="text-teal-500" />
              Contenido
              {!chunksLoading && (
                <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
                  {chunks.length}
                </span>
              )}
            </h3>
          </div>
          {/* Student: TextHighlighter wraps content for highlights */}
          {!isProfessor && selectedSummaryId ? (
            <TextHighlighter
              chunks={chunks}
              loading={chunksLoading}
              summaryId={selectedSummaryId}
              annotations={annotations}
              onAnnotationsChanged={fetchAnnotations}
            />
          ) : (
            <ChunkRenderer chunks={chunks} loading={chunksLoading} />
          )}
        </div>

        {/* Professor: Keywords Manager */}
        {isProfessor && selectedSummaryId && (
          <div className="mb-6">
            <KeywordsManager summaryId={selectedSummaryId} />
          </div>
        )}

        {/* Student: Keyword Badges */}
        {!isProfessor && selectedSummaryId && (
          <div className="mb-6">
            <KeywordBadges summaryId={selectedSummaryId} />
          </div>
        )}

        {/* Professor: Videos Manager */}
        {isProfessor && selectedSummaryId && (
          <div className="mb-6">
            <VideosManager summaryId={selectedSummaryId} />
          </div>
        )}

        {/* Student: Video Player */}
        {!isProfessor && selectedSummaryId && (
          <div className="mb-6">
            <VideoPlayer summaryId={selectedSummaryId} />
          </div>
        )}
      </div>
    </div>
  );
}