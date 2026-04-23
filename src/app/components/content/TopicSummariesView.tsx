// ============================================================
// Axon — TopicSummariesView
//
// Route: /student/topic-summaries?topicId=xxx
//
// Level 3 in student navigation flow:
//   Landing → Study Plan → **Lista de Resumenes** → Lector
//
// Shows all summaries for a specific topic, with:
//   - Real summaries from getTopicSummaries(topicId)
//   - Reading states per summary (completed, time_spent, last_read)
//   - Flashcard counts per summary (getFlashcardsBySummary)
//   - Status badges (published/draft)
//   - CTA to open each summary in the reader
//   - Section breadcrumb navigation back to study-plan
//
// Data: 100% real backend via apiCall() with double token.
// ============================================================

import React, { useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useNavigation } from '@/app/context/NavigationContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { motion, useReducedMotion } from 'motion/react';
import {
  BookOpen, ChevronRight, ChevronLeft, Play,
  Loader2, AlertCircle,
} from 'lucide-react';
import type { Summary } from '@/app/services/summariesApi';
import { ProgressBar, focusRing } from '@/app/components/design-kit';
import { useTopicProgressQuery } from '@/app/hooks/queries/useTopicProgressQuery';

// God-component split (finding #24): shared summaries module.
import { SummariesBrowser } from './summaries/SummariesBrowser';
import { formatTimeSpent } from './summaries/summaries-format';

// ── Main Component ────────────────────────────────────────

export function TopicSummariesView() {
  const [searchParams] = useSearchParams();
  const topicId = searchParams.get('topicId');
  const navigate = useNavigate();
  const { setCurrentTopic } = useNavigation();
  const { navigateTo } = useStudentNav();
  const { tree, loading: treeLoading, error: treeError, selectTopic } = useContentTree();
  const shouldReduce = useReducedMotion();

  // ── React Query: cached topic progress (L3) ──
  const {
    enrichedSummaries,
    isLoading: summariesLoading,
    error: summariesError,
  } = useTopicProgressQuery(topicId);

  const loading = summariesLoading;
  const error = summariesError?.message ?? null;

  // ── Resolve topic & section from content tree ──
  const course = tree?.courses?.[0] ?? null;

  const { topic, section, semesterName } = useMemo(() => {
    if (!course || !topicId) return { topic: null, section: null, semesterName: '' };
    for (const sem of course.semesters ?? []) {
      for (const sec of sem.sections ?? []) {
        for (const t of sec.topics ?? []) {
          if (t.id === topicId) {
            return { topic: t, section: sec, semesterName: sem.name };
          }
        }
      }
    }
    return { topic: null, section: null, semesterName: '' };
  }, [course, topicId]);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const total = enrichedSummaries.length;
    const completed = enrichedSummaries.filter(e => e.readingState?.completed).length;
    const totalFlashcards = enrichedSummaries.reduce((a, e) => a + e.flashcardCount, 0);
    const totalTimeSeconds = enrichedSummaries.reduce(
      (a, e) => a + (e.readingState?.time_spent_seconds ?? 0), 0
    );
    return { total, completed, totalFlashcards, totalTimeSeconds };
  }, [enrichedSummaries]);

  // ── Handlers ──
  const handleSummaryClick = useCallback((summary: Summary) => {
    if (topic) {
      selectTopic(topic.id);
      setCurrentTopic({ id: topic.id, title: topic.name } as any);
    }
    // Navigate to the existing SummaryView reader for this topic
    // passing summaryId as query param for future auto-selection
    navigate(`/student/summary/${topic?.id ?? topicId}${summary.id ? `?summaryId=${summary.id}` : ''}`);
  }, [topic, topicId, selectTopic, setCurrentTopic, navigate]);

  const handleBackToStudyPlan = useCallback(() => {
    if (section) {
      navigate(`/student/study-plan?sectionId=${section.id}`);
    } else {
      navigateTo('study-hub');
    }
  }, [section, navigate, navigateTo]);

  const handleBackToHub = useCallback(() => {
    navigateTo('study-hub');
  }, [navigateTo]);

  // ── Loading ──
  if (treeLoading || loading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          <p className="text-sm text-zinc-500">Cargando resumenes...</p>
        </div>
      </div>
    );
  }

  // ── Error / Not Found ──
  if (treeError || error || !topic) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-zinc-50 gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-red-500">{treeError || error || 'Tema no encontrado'}</p>
        <button
          onClick={handleBackToHub}
          className={`text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1.5 ${focusRing} rounded-lg px-3 py-2`}
          style={{ fontWeight: 600 }}
        >
          <ChevronLeft className="w-4 h-4" /> Volver al inicio
        </button>
      </div>
    );
  }

  // ── Find first unread summary for CTA ──
  const nextUnread = enrichedSummaries.find(e => !e.readingState?.completed);

  return (
    <div className="min-h-full bg-zinc-50">
      {/* ── Breadcrumb bar ── */}
      <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center gap-1.5 text-xs text-zinc-500">
        <button
          className={`hover:text-zinc-800 cursor-pointer ${focusRing} rounded px-1`}
          style={{ fontWeight: 500 }}
          onClick={handleBackToHub}
        >
          Inicio
        </button>
        <ChevronRight className="w-3 h-3" />
        <button
          className={`hover:text-zinc-800 cursor-pointer ${focusRing} rounded px-1`}
          style={{ fontWeight: 500 }}
          onClick={handleBackToStudyPlan}
        >
          {section?.name || 'Seccion'}
        </button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-800" style={{ fontWeight: 600 }}>{topic.name}</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* ── Topic header ── */}
        <motion.div
          className="mb-8"
          initial={shouldReduce ? false : { y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl text-zinc-900 mb-1" style={{ fontWeight: 700 }}>
                {topic.name}
              </h1>
              <p className="text-sm text-zinc-500" style={{ fontWeight: 500 }}>
                {stats.completed} de {stats.total} resumenes leidos
                {stats.totalFlashcards > 0 && ` · ${stats.totalFlashcards} flashcards`}
                {stats.totalTimeSeconds > 0 && ` · ${formatTimeSpent(stats.totalTimeSeconds)} de lectura`}
              </p>
            </div>

            {nextUnread && (
              <motion.button
                onClick={() => handleSummaryClick(nextUnread.summary)}
                className={`flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-teal-600/25 shrink-0 ${focusRing}`}
                style={{ fontWeight: 600 }}
                whileHover={shouldReduce ? undefined : { scale: 1.03, y: -1 }}
                whileTap={shouldReduce ? undefined : { scale: 0.97 }}
              >
                <Play className="w-4 h-4" />
                {stats.completed > 0 ? 'Continuar leyendo' : 'Empezar a leer'}
              </motion.button>
            )}
          </div>

          {/* Topic progress bar */}
          <div className="mt-4">
            <ProgressBar
              value={stats.total > 0 ? stats.completed / stats.total : 0}
              className="h-2.5"
              animated
            />
          </div>
        </motion.div>

        {/* ── Summary cards list (extracted to shared SummariesBrowser) ── */}
        <SummariesBrowser
          source="topic"
          items={enrichedSummaries}
          nextUnreadId={nextUnread?.summary.id ?? null}
          onSelect={handleSummaryClick}
        />

        {/* ── Empty state ── */}
        {enrichedSummaries.length === 0 && !loading && (
          <motion.div
            className="flex flex-col items-center justify-center py-20 gap-4"
            initial={shouldReduce ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-zinc-300" />
            </div>
            <p className="text-sm text-zinc-500">Este tema aun no tiene resumenes</p>
            <button
              onClick={handleBackToStudyPlan}
              className={`text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1.5 ${focusRing} rounded-lg px-3 py-2`}
              style={{ fontWeight: 600 }}
            >
              <ChevronLeft className="w-4 h-4" /> Volver a la seccion
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}