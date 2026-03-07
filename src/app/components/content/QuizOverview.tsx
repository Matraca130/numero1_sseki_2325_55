// ============================================================
// Axon — Quiz Overview (right panel when no summary selected)
//
// Shows: course header, section progress rings, topic cards
// with summary lists, and quiz history.
// ============================================================

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  CheckCircle2, ChevronRight, ChevronDown,
  BookOpen, Clock, FileText, Play, History,
  Loader2, Circle, Sparkles,
} from 'lucide-react';
import type { Summary } from '@/app/types/platform';
import type { TreeCourse, TreeSemester } from '@/app/services/contentTreeApi';
import type { StudySession } from '@/app/services/quizApi';
import { PLACEHOLDER_PROGRESS } from './quiz-helpers';

// ── Props ────────────────────────────────────────────────

interface QuizOverviewProps {
  activeCourse: TreeCourse;
  activeSemester: TreeSemester;
  topicSummaries: Record<string, Summary[]>;
  loadingTopics: Set<string>;
  quizHistory: StudySession[];
  showHistory: boolean;
  onToggleHistory: () => void;
  onSelectSummary: (summary: Summary) => void;
}

// ── Summary button (memoized) ────────────────────────────

const SummaryButton = React.memo(function SummaryButton({
  summary,
  isNext,
  sumIdx,
  onSelect,
}: {
  summary: Summary;
  isNext: boolean;
  sumIdx: number;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-50 hover:bg-teal-50 transition-colors text-left group"
    >
      <div className="w-10 h-10 rounded-lg bg-zinc-200 flex items-center justify-center shrink-0 group-hover:bg-teal-100 transition-colors">
        <BookOpen size={16} className="text-zinc-400 group-hover:text-teal-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-zinc-700 truncate group-hover:text-teal-700" style={{ fontWeight: 600 }}>
          {summary.title || `Resumen ${summary.id.substring(0, 8)}`}
        </p>
        {sumIdx === 0 && isNext && (
          <span className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
            <Clock size={10} /> En progreso
          </span>
        )}
      </div>
      <ChevronRight size={14} className="text-zinc-300 group-hover:text-teal-500 shrink-0" />
    </button>
  );
});

// ── History card (memoized) ──────────────────────────────

const HistoryCard = React.memo(function HistoryCard({ session }: { session: StudySession }) {
  const total = session.total_reviews ?? 0;
  const correct = session.correct_reviews ?? 0;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const date = new Date(session.completed_at || session.created_at);
  const dateStr = date.toLocaleDateString('es', { day: '2-digit', month: 'short' });
  const timeStr = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm flex items-center gap-3">
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="none" />
          <circle
            cx="24" cy="24" r="20"
            stroke={pct >= 70 ? '#0d9488' : pct >= 40 ? '#f59e0b' : '#ef4444'}
            strokeWidth="4" fill="none" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 20}
            strokeDashoffset={2 * Math.PI * 20 * (1 - pct / 100)}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-700" style={{ fontWeight: 700 }}>{pct}%</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-800" style={{ fontWeight: 600 }}>{correct}/{total} correctas</p>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span>{dateStr} {timeStr}</span>
        </div>
      </div>
    </div>
  );
});

// ── Main Component ───────────────────────────────────────

export function QuizOverview({
  activeCourse,
  activeSemester,
  topicSummaries,
  loadingTopics,
  quizHistory,
  showHistory,
  onToggleHistory,
  onSelectSummary,
}: QuizOverviewProps) {
  const totalTopics = activeSemester.sections.reduce((acc, s) => acc + s.topics.length, 0);

  // Find the "next recommended" topic
  let nextRecommendedTopicId: string | null = null;
  for (const sec of activeSemester.sections) {
    for (let i = 0; i < sec.topics.length; i++) {
      if (i === 1 || (activeSemester.sections.indexOf(sec) > 0 && i === 0)) {
        nextRecommendedTopicId = sec.topics[i].id;
        break;
      }
    }
    if (nextRecommendedTopicId) break;
  }

  const handleSelectSummary = useCallback((summary: Summary) => {
    onSelectSummary(summary);
  }, [onSelectSummary]);

  return (
    <div>
      {/* Course title + continue button */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-[22px] text-zinc-900" style={{ fontWeight: 800 }}>
            {activeCourse.name}
          </h2>
          <p className="text-[13px] text-zinc-400 mt-1">
            {activeSemester.name} · {totalTopics} temas
          </p>
        </div>
        {nextRecommendedTopicId && (() => {
          const nextSummaries = topicSummaries[nextRecommendedTopicId] || [];
          return nextSummaries.length > 0 ? (
            <button
              onClick={() => handleSelectSummary(nextSummaries[0])}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/25"
            >
              <Play size={16} fill="white" />
              <span className="text-[13px]" style={{ fontWeight: 700 }}>Continuar Estudiando</span>
            </button>
          ) : null;
        })()}
      </div>

      {/* Sections with their topics */}
      {activeSemester.sections.map((section, secIdx) => {
        const sectionProgress = PLACEHOLDER_PROGRESS[secIdx % 6] ?? 50;
        const circumference = 2 * Math.PI * 18;

        return (
          <div key={section.id} className="mb-8">
            {/* Section header row */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[15px] text-zinc-800" style={{ fontWeight: 700 }}>
                {section.name}
              </span>
              <div className="flex-1 h-px bg-zinc-200" />
              {/* Circular progress */}
              <div className="relative w-11 h-11 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="22" cy="22" r="18" stroke="#f1f5f9" strokeWidth="3" fill="none" />
                  <circle
                    cx="22" cy="22" r="18"
                    stroke={sectionProgress >= 70 ? '#0d9488' : sectionProgress >= 40 ? '#f59e0b' : '#d4d4d8'}
                    strokeWidth="3" fill="none" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - sectionProgress / 100)}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-700" style={{ fontWeight: 700 }}>
                  {sectionProgress}%
                </span>
              </div>
            </div>

            {/* Topic cards grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {section.topics.map((topic, topicIdx) => {
                const summaries = topicSummaries[topic.id] || [];
                const isLoading = loadingTopics.has(topic.id);
                const isNext = topic.id === nextRecommendedTopicId;
                const isDone = secIdx === 0 && topicIdx === 0;
                const topicProgress = isDone ? 100 : isNext ? 55 : 0;

                return (
                  <div
                    key={topic.id}
                    className={clsx(
                      'rounded-2xl border-2 p-5 transition-all',
                      isNext
                        ? 'border-teal-400 bg-white shadow-md'
                        : isDone
                        ? 'border-teal-400 bg-white'
                        : 'border-zinc-200 bg-white'
                    )}
                  >
                    {/* Topic header */}
                    <div className="flex items-start gap-3 mb-3">
                      <span className="mt-0.5 shrink-0">
                        {isDone
                          ? <CheckCircle2 size={22} className="text-emerald-500" />
                          : isNext
                          ? <Clock size={22} className="text-amber-500" />
                          : <Circle size={22} className="text-zinc-300" />
                        }
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] text-zinc-900 truncate" style={{ fontWeight: 700 }}>
                          {topic.name}
                        </p>
                        {isNext && (
                          <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] px-2.5 py-1 rounded-md bg-teal-600 text-white" style={{ fontWeight: 700 }}>
                            <Sparkles size={12} />
                            Siguiente recomendado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 rounded-full bg-zinc-100 overflow-hidden mb-3">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all',
                          isDone ? 'bg-gradient-to-r from-teal-400 to-emerald-500' :
                          isNext ? 'bg-gradient-to-r from-teal-400 to-teal-500' :
                          'bg-zinc-200'
                        )}
                        style={{ width: `${topicProgress}%` }}
                      />
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-[12px] text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <FileText size={13} className="text-zinc-300" />
                        {isLoading ? '...' : `${summaries.length} resumenes`}
                      </span>
                    </div>

                    {/* Summaries quick list */}
                    {summaries.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {summaries.slice(0, 3).map((summary, sumIdx) => (
                          <SummaryButton
                            key={summary.id}
                            summary={summary}
                            isNext={isNext}
                            sumIdx={sumIdx}
                            onSelect={() => handleSelectSummary(summary)}
                          />
                        ))}
                        {summaries.length > 3 && (
                          <p className="text-[11px] text-zinc-400 text-center pt-1">
                            +{summaries.length - 3} mas
                          </p>
                        )}
                      </div>
                    )}

                    {isLoading && (
                      <div className="flex items-center gap-2 mt-3 text-zinc-400">
                        <Loader2 size={14} className="animate-spin" />
                        <span className="text-[11px]">Cargando resumenes...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quiz History */}
      {quizHistory.length > 0 && (
        <div className="mt-6 pt-6 border-t border-zinc-100">
          <button
            onClick={onToggleHistory}
            className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
          >
            <History size={16} className="text-zinc-400" />
            <span className="text-[13px] text-zinc-500" style={{ fontWeight: 700 }}>
              Quizzes anteriores ({quizHistory.length})
            </span>
            {showHistory
              ? <ChevronDown size={14} className="text-gray-400" />
              : <ChevronRight size={14} className="text-gray-400" />
            }
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {quizHistory.map(session => (
                    <HistoryCard key={session.id} session={session} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
