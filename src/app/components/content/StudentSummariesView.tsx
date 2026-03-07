// ============================================================
// Axon — StudentSummariesView (Student: read-only summaries)
//
// Design: refined to match Figma prototypes with hero progress,
// summary cards with status badges, motivational messages.
// All E2E connections preserved.
// ============================================================
import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  FileText, RefreshCw,
  CheckCircle2, BookOpen, Clock, AlertCircle,
  ArrowRight, Sparkles,
} from 'lucide-react';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { StudentSummaryReader } from './StudentSummaryReader';
import { useQueryClient } from '@tanstack/react-query';
import { useTopicProgressRawQuery } from '@/app/hooks/queries/useTopicProgressRawQuery';
import { queryKeys } from '@/app/hooks/queries/queryKeys';
import type { TopicProgressResponse } from '@/app/services/topicProgressApi';
import {
  HeroSection,
  ProgressBar,
  ProgressRing,
  Breadcrumb,
  focusRing,
  useFadeUp,
} from '@/app/components/design-kit';
import { useApp } from '@/app/context/AppContext';
import { useKeywordNavigation } from '@/app/hooks/useKeywordNavigation';

// ── Strip markdown syntax for plain-text preview ──────────
function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')           // headers: # ## ###
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '') // images: ![alt](url)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links: [text](url) → text
    .replace(/(\*\*|__)(.*?)\1/g, '$2')     // bold: **text** or __text__
    .replace(/(\*|_)(.*?)\1/g, '$2')        // italic: *text* or _text_
    .replace(/~~(.*?)~~/g, '$1')            // strikethrough
    .replace(/`{1,3}[^`]*`{1,3}/g, '')     // inline/block code
    .replace(/^[-*+]\s+/gm, '')             // unordered list markers
    .replace(/^\d+\.\s+/gm, '')             // ordered list markers
    .replace(/^>\s+/gm, '')                 // blockquotes
    .replace(/^---+$/gm, '')                // horizontal rules
    .replace(/\|/g, ' ')                    // table pipes
    .replace(/\n+/g, ' ')                   // newlines → spaces
    .replace(/\s{2,}/g, ' ')               // collapse whitespace
    .trim();
}

// ── Motivational text based on progress ──────────────────
function getMotivation(progress: number, total: number): string {
  if (total === 0) return '';
  if (progress === 0) return 'Dale, empeza!';
  if (progress / total >= 1) return 'Excelente! Completaste todo!';
  if (progress / total >= 0.7) return 'Ya casi terminas!';
  if (progress / total >= 0.3) return 'Vas muy bien, segui asi!';
  return 'Buen comienzo!';
}

export function StudentSummariesView() {
  const { selectedTopicId, tree, selectTopic } = useContentTree();
  const { currentTopic } = useApp();
  const shouldReduce = useReducedMotion();

  const effectiveTopicId = selectedTopicId || currentTopic?.id || null;

  // Sync contexts
  React.useEffect(() => {
    if (!selectedTopicId && currentTopic?.id) {
      selectTopic(currentTopic.id);
    }
  }, [selectedTopicId, currentTopic?.id, selectTopic]);

  // ── React Query: topic progress (summaries + reading states) ──
  const { summaries, readingStates, isLoading, error, refetch } = useTopicProgressRawQuery(effectiveTopicId);
  const queryClient = useQueryClient();

  // ── Keyword navigation (SRP-3: extracted to hook) ──
  const { selectedSummaryId, setSelectedSummaryId, handleNavigateKeyword, isPendingNav } = useKeywordNavigation({
    summaries,
    effectiveTopicId,
    selectTopic,
  });
  const fadeUp = useFadeUp();

  // Resolve topic & section name
  const { topicName, sectionName, courseName } = (() => {
    if (!tree || !effectiveTopicId) return { topicName: '', sectionName: '', courseName: '' };
    for (const c of tree.courses) {
      for (const s of c.semesters) {
        for (const sec of s.sections) {
          for (const t of sec.topics) {
            if (t.id === effectiveTopicId) return { topicName: t.name, sectionName: sec.name, courseName: c.name };
          }
        }
      }
    }
    return { topicName: '', sectionName: '', courseName: '' };
  })();

  // ── Reader view ────────────────────────────────────────
  const selectedSummary = summaries.find(s => s.id === selectedSummaryId);
  if (selectedSummaryId && selectedSummary) {
    return (
      <StudentSummaryReader
        summary={selectedSummary}
        topicName={topicName}
        readingState={readingStates[selectedSummary.id] || null}
        onBack={() => setSelectedSummaryId(null)}
        onReadingStateChanged={(rs) => {
          queryClient.setQueryData<TopicProgressResponse>(
            queryKeys.topicProgress(effectiveTopicId!),
            (old) => old ? { ...old, reading_states: { ...old.reading_states, [selectedSummary.id]: rs } } : old,
          );
        }}
        onNavigateKeyword={handleNavigateKeyword}
      />
    );
  }

  // ── Cross-topic navigation in progress (prevents list flash) ──
  if (isPendingNav) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-zinc-50">
        <div className="w-10 h-10 rounded-full border-4 border-teal-200 border-t-teal-500 animate-spin mb-4" />
        <p className="text-sm text-zinc-500">Navegando al resumen conectado…</p>
      </div>
    );
  }

  // ── No topic selected ───────────────────────────────────
  if (!effectiveTopicId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-zinc-50">
        <motion.div
          className="w-20 h-20 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-5"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <BookOpen className="w-9 h-9 text-teal-300" />
        </motion.div>
        <p className="text-zinc-700 mb-1" style={{ fontWeight: 700 }}>Selecciona un topico</p>
        <p className="text-sm text-zinc-400 text-center max-w-xs">
          Usa el arbol de contenido a la izquierda para elegir que estudiar
        </p>
      </div>
    );
  }

  // Stats
  const completedCount = summaries.filter(s => readingStates[s.id]?.completed).length;
  const totalTimeMinutes = Object.values(readingStates).reduce(
    (acc, rs) => acc + (rs.time_spent_seconds || 0), 0
  ) / 60;
  const progress = summaries.length > 0 ? completedCount / summaries.length : 0;
  const motivation = getMotivation(completedCount, summaries.length);

  // Find the "next" summary to read
  const nextSummary = summaries.find(s => !readingStates[s.id]?.completed);

  return (
    <div className="h-full overflow-y-auto bg-zinc-50">
      {/* ── Hero ── */}
      <HeroSection>
        <div className="max-w-3xl mx-auto px-6 pt-8 pb-10">
          <motion.div {...fadeUp(0)}>
            <Breadcrumb
              items={[courseName, sectionName, topicName].filter(Boolean)}
              className="mb-4 text-zinc-400"
            />

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-teal-300" />
                </div>
                <div>
                  <h1 className="text-xl text-white tracking-tight" style={{ fontWeight: 700 }}>
                    {topicName}
                  </h1>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    {isLoading ? 'Cargando...' : `${summaries.length} resumen${summaries.length !== 1 ? 'es' : ''} · ${completedCount} completado${completedCount !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>

              {/* Progress ring */}
              {!isLoading && summaries.length > 0 && (
                <ProgressRing value={progress} size={52} stroke={4} />
              )}
            </div>

            {/* Progress bar + motivation */}
            {!isLoading && summaries.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-zinc-300" style={{ fontWeight: 500 }}>
                    {completedCount} de {summaries.length} completado{completedCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-teal-300" style={{ fontWeight: 700 }}>
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                <ProgressBar value={progress} animated dark color="bg-gradient-to-r from-teal-400 to-emerald-400" />
                <div className="flex items-center justify-between mt-2">
                  {motivation && (
                    <p className="text-[11px] text-amber-300" style={{ fontWeight: 600 }}>
                      {motivation}
                    </p>
                  )}
                  {totalTimeMinutes > 0 && (
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round(totalTimeMinutes)} min total
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </HeroSection>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Refresh */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm text-zinc-900" style={{ fontWeight: 700 }}>Resumenes</h3>
              {!isLoading && !error && (
                <p className="text-xs text-zinc-500">{summaries.length} disponible{summaries.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <button
            onClick={refetch}
            disabled={isLoading}
            className={`p-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors ${focusRing}`}
          >
            <RefreshCw className={`w-4 h-4 text-zinc-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-zinc-200 p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100" />
                  <div className="flex-1">
                    <div className="h-4 w-48 bg-zinc-100 rounded-lg mb-2" />
                    <div className="h-3 w-32 bg-zinc-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600 mb-3">{error?.message || 'Error al cargar resumenes'}</p>
            <button
              onClick={refetch}
              className={`px-4 py-2 text-sm bg-white border border-red-200 rounded-xl text-red-600 hover:bg-red-50 ${focusRing}`}
              style={{ fontWeight: 600 }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && summaries.length === 0 && (
          <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-teal-300" />
            </div>
            <p className="text-sm text-zinc-600 mb-1" style={{ fontWeight: 600 }}>
              No hay resumenes publicados
            </p>
            <p className="text-xs text-zinc-400">
              El profesor aun no ha publicado contenido en este topico
            </p>
          </div>
        )}

        {/* Summaries list */}
        {!isLoading && !error && summaries.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {summaries.map((s, index) => {
                const rs = readingStates[s.id];
                const isCompleted = rs?.completed === true;
                const isInProgress = rs && !isCompleted;
                const isNextToRead = nextSummary?.id === s.id && !isCompleted;

                return (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <motion.button
                      onClick={() => setSelectedSummaryId(s.id)}
                      className={`w-full text-left bg-white rounded-2xl border-2 p-5 transition-all group cursor-pointer ${focusRing} relative overflow-hidden ${
                        isCompleted
                          ? 'border-emerald-300 hover:border-emerald-400'
                          : isNextToRead
                            ? 'border-teal-300 ring-1 ring-teal-200 shadow-md hover:shadow-lg'
                            : isInProgress
                              ? 'border-teal-200 hover:border-teal-300 hover:shadow-md'
                              : 'border-zinc-200 hover:border-zinc-300 hover:shadow-md'
                      }`}
                      whileHover={shouldReduce ? undefined : { y: -3 }}
                    >
                      {/* Top accent */}
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        isCompleted ? 'bg-emerald-500' : isInProgress || isNextToRead ? 'bg-teal-500' : 'bg-zinc-200'
                      }`} />

                      {/* Next badge */}
                      {isNextToRead && (
                        <div className="flex items-center gap-1.5 mb-3">
                          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                          <span className="text-[10px] text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200" style={{ fontWeight: 700 }}>
                            Siguiente recomendado
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-50 border-emerald-200'
                            : isInProgress || isNextToRead
                              ? 'bg-teal-50 border-teal-200'
                              : 'bg-zinc-50 border-zinc-200'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : isInProgress ? (
                            <Clock className="w-5 h-5 text-teal-500" />
                          ) : (
                            <FileText className="w-5 h-5 text-zinc-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm text-zinc-900 truncate" style={{ fontWeight: 700 }}>
                              {s.title || 'Sin titulo'}
                            </h3>
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0" style={{ fontWeight: 600 }}>
                                <CheckCircle2 className="w-3 h-3" /> Leido
                              </span>
                            )}
                            {isInProgress && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 border border-amber-200 shrink-0" style={{ fontWeight: 600 }}>
                                <Clock className="w-3 h-3" /> En progreso
                              </span>
                            )}
                          </div>

                          {s.content_markdown && (() => {
                            const preview = stripMarkdown(s.content_markdown);
                            return preview ? (
                              <p className="text-xs text-zinc-500 line-clamp-2 max-w-md mb-2">
                                {preview.substring(0, 140)}{preview.length > 140 ? '...' : ''}
                              </p>
                            ) : null;
                          })()}

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-zinc-400">
                              {new Date(s.created_at).toLocaleDateString('es-MX', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </span>
                            {rs?.time_spent_seconds != null && rs.time_spent_seconds > 0 && (
                              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.round(rs.time_spent_seconds / 60)} min
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                          <ArrowRight className="w-4 h-4 text-zinc-600" />
                        </div>
                      </div>

                      {/* Progress bar for in-progress */}
                      {isInProgress && rs?.time_spent_seconds && (
                        <div className="mt-3 ml-14">
                          <ProgressBar value={Math.min((rs.time_spent_seconds || 0) / 300, 0.9)} color="bg-teal-500" className="h-1.5" />
                        </div>
                      )}
                    </motion.button>
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