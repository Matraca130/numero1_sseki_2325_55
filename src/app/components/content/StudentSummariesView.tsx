// ============================================================
// Axon — StudentSummariesView (Student: read-only summaries)
//
// Sprint 1 AUDIT: palette → Axon, extracted SummaryCard,
// extracted helpers to summary-helpers.ts.
//
// This file is now a ~210-line orchestrator.
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import {
  FileText, RefreshCw, BookOpen, Clock, AlertCircle,
} from 'lucide-react';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { StudentSummaryReader } from './StudentSummaryReader';
import { TopicSessionGrid } from '@/app/components/student/TopicSessionGrid';
import { getMotivation } from './summary-helpers';
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
import { useNavigation } from '@/app/context/NavigationContext';
import { useKeywordNavigation } from '@/app/hooks/useKeywordNavigation';
import { axon, tint } from '@/app/lib/palette';

export function StudentSummariesView() {
  const { selectedTopicId, tree, selectTopic } = useContentTree();
  const { currentTopic } = useNavigation();

  const effectiveTopicId = selectedTopicId || currentTopic?.id || null;

  // Sync contexts
  React.useEffect(() => {
    if (!selectedTopicId && currentTopic?.id) {
      selectTopic(currentTopic.id);
    }
  }, [selectedTopicId, currentTopic?.id, selectTopic]);

  // Auto-select first topic when entering with nothing selected
  React.useEffect(() => {
    if (effectiveTopicId || !tree) return;
    for (const c of tree.courses) {
      for (const s of c.semesters) {
        for (const sec of s.sections) {
          if (sec.topics.length > 0) {
            selectTopic(sec.topics[0].id);
            return;
          }
        }
      }
    }
  }, [effectiveTopicId, tree, selectTopic]);

  // ── React Query: topic progress (summaries + reading states) ──
  const { summaries, readingStates, isLoading, error, refetch } = useTopicProgressRawQuery(effectiveTopicId);
  const queryClient = useQueryClient();

  // ── Keyword navigation (SRP-3: extracted to hook) ──
  const { selectedSummaryId, setSelectedSummaryId, handleNavigateKeyword, isPendingNav } = useKeywordNavigation({
    summaries,
    effectiveTopicId,
    selectTopic,
  });
  const [initialTab, setInitialTab] = React.useState<string | undefined>(undefined);
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
        onBack={() => { setSelectedSummaryId(null); setInitialTab(undefined); }}
        onReadingStateChanged={(rs) => {
          queryClient.setQueryData<TopicProgressResponse>(
            queryKeys.topicProgress(effectiveTopicId!),
            (old) => old ? { ...old, reading_states: { ...old.reading_states, [selectedSummary.id]: rs } } : old,
          );
        }}
        onNavigateKeyword={handleNavigateKeyword}
        initialTab={initialTab}
      />
    );
  }

  // ── Cross-topic navigation in progress ──
  if (isPendingNav) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8" style={{ backgroundColor: axon.pageBg }}>
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin mb-4"
          style={{ borderColor: tint.tealBg, borderTopColor: axon.tealAccent }}
        />
        <p className="text-sm" style={{ color: tint.subtitleText }}>Navegando al resumen conectado…</p>
      </div>
    );
  }

  // ── No topic selected ───────────────────────────────────
  if (!effectiveTopicId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8" style={{ backgroundColor: axon.pageBg }}>
        <motion.div
          className="w-20 h-20 rounded-2xl border flex items-center justify-center mb-5"
          style={{ backgroundColor: tint.tealBg, borderColor: tint.tealBorder }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <BookOpen className="w-9 h-9" style={{ color: tint.tealBorder }} />
        </motion.div>
        <p className="mb-1" style={{ fontWeight: 700, color: axon.darkTeal }}>Selecciona un topico</p>
        <p className="text-sm text-center max-w-xs" style={{ color: tint.neutralText }}>
          Usa el arbol de contenido a la izquierda para elegir que estudiar
        </p>
      </div>
    );
  }

  // ── Stats ──
  const completedCount = summaries.filter(s => readingStates[s.id]?.completed).length;
  const totalTimeMinutes = Object.values(readingStates).reduce(
    (acc, rs) => acc + (rs.time_spent_seconds || 0), 0
  ) / 60;
  const progress = summaries.length > 0 ? completedCount / summaries.length : 0;
  const motivation = getMotivation(completedCount, summaries.length);
  const nextSummary = summaries.find(s => !readingStates[s.id]?.completed);

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: axon.pageBg }}>
      {/* ── Hero ── */}
      <HeroSection>
        <div className="max-w-[210mm] mx-auto px-6 pt-8 pb-10">
          <motion.div {...fadeUp(0)}>
            <Breadcrumb
              items={[courseName, sectionName, topicName].filter(Boolean)}
              className="mb-4"
            />

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" style={{ color: axon.progressStart }} />
                </div>
                <div>
                  <h1 className="text-xl text-white tracking-tight" style={{ fontWeight: 700 }}>
                    {topicName}
                  </h1>
                  <p className="text-sm mt-0.5" style={{ color: tint.neutralText }}>
                    {isLoading ? 'Cargando...' : `${summaries.length} resumen${summaries.length !== 1 ? 'es' : ''} · ${completedCount} completado${completedCount !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>

              {!isLoading && summaries.length > 0 && (
                <ProgressRing value={progress} size={52} stroke={4} />
              )}
            </div>

            {/* Progress bar + motivation */}
            {!isLoading && summaries.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span style={{ fontWeight: 500, color: axon.sidebarText }}>
                    {completedCount} de {summaries.length} completado{completedCount !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontWeight: 700, color: axon.progressStart }}>
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                <ProgressBar
                  value={progress}
                  animated
                  dark
                  color="bg-gradient-to-r from-[#2dd4a8] to-[#0d9488]"
                />
                <div className="flex items-center justify-between mt-2">
                  {motivation && (
                    <p className="text-[11px] text-amber-300" style={{ fontWeight: 600 }}>
                      {motivation}
                    </p>
                  )}
                  {totalTimeMinutes > 0 && (
                    <p className="text-[11px] flex items-center gap-1" style={{ color: tint.subtitleText }}>
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
      <div className="max-w-[210mm] mx-auto px-6 py-6">
        {/* Section heading + refresh */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: axon.darkTeal }}
            >
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm" style={{ fontWeight: 700, color: axon.darkTeal }}>Resumenes</h3>
              {!isLoading && !error && (
                <p className="text-xs" style={{ color: tint.subtitleText }}>
                  {summaries.length} disponible{summaries.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={refetch}
            disabled={isLoading}
            className={`p-2 rounded-lg border transition-colors ${focusRing}`}
            style={{
              borderColor: tint.neutralBorder,
              backgroundColor: axon.cardBg,
            }}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              style={{ color: tint.subtitleText }}
            />
          </button>
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="rounded-2xl border p-5 animate-pulse"
                style={{ backgroundColor: axon.cardBg, borderColor: tint.neutralBorder }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: tint.neutralBg }} />
                  <div className="flex-1">
                    <div className="h-4 w-48 rounded-lg mb-2" style={{ backgroundColor: tint.neutralBg }} />
                    <div className="h-3 w-32 rounded" style={{ backgroundColor: tint.neutralBg }} />
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
          <div
            className="border-2 border-dashed rounded-2xl p-12 text-center"
            style={{ backgroundColor: axon.cardBg, borderColor: tint.neutralBorder }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: tint.tealBg }}
            >
              <FileText className="w-6 h-6" style={{ color: tint.tealBorder }} />
            </div>
            <p className="text-sm mb-1" style={{ fontWeight: 600, color: tint.subtitleText }}>
              No hay resumenes publicados
            </p>
            <p className="text-xs" style={{ color: tint.neutralText }}>
              El profesor aun no ha publicado contenido en este topico
            </p>
          </div>
        )}

        {/* Summaries grid — premium split cards (summary / video) */}
        {!isLoading && !error && summaries.length > 0 && (
          <TopicSessionGrid
            summaries={summaries}
            readingStates={readingStates}
            nextSummaryId={nextSummary?.id ?? null}
            onSelectSummary={(id, tab) => {
              setInitialTab(tab);
              setSelectedSummaryId(id);
            }}
          />
        )}
      </div>
    </div>
  );
}
