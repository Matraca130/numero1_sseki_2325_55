// ============================================================
// Axon — Quiz Selection (Sidebar tree + Right panel)
//
// Handles: content tree navigation, summary selection,
// quiz/question loading, filters, and delegates to QuizOverview.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useAuth } from '@/app/context/AuthContext';
import { getTopicSummaries } from '@/app/services/platformApi';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion, QuestionType, Difficulty, StudySession, QuizEntity, QuizEntityListResponse } from '@/app/services/quizApi';
import type { Summary } from '@/app/types/platform';
import { apiCall } from '@/app/lib/api';
import { logger } from '@/app/lib/logger';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  ChevronLeft, ChevronRight, ChevronDown,
  BookOpen, Loader2, FileText, Layers, Filter,
  Play, AlertCircle, ClipboardList,
} from 'lucide-react';
import { QuizOverview } from './QuizOverview';

// ── Props ────────────────────────────────────────────────

interface QuizSelectionProps {
  onStart: (questions: QuizQuestion[], summaryTitle: string, summaryId: string) => void;
  onBack: () => void;
}

// ── Sidebar summary item (memoized) ─────────────────────

const SidebarSummaryItem = React.memo(function SidebarSummaryItem({
  summary,
  isActive,
  onSelect,
}: {
  summary: Summary;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all',
        isActive
          ? 'bg-teal-500 text-white shadow-sm'
          : 'hover:bg-teal-50 text-zinc-600'
      )}
    >
      <FileText size={12} className={clsx('shrink-0', isActive ? 'text-teal-100' : 'text-zinc-400')} />
      <span className="text-[12px] truncate flex-1" style={{ fontWeight: isActive ? 600 : 400 }}>
        {summary.title || `Resumen ${summary.id.substring(0, 8)}`}
      </span>
      {isActive && (
        <ChevronRight size={12} className="text-teal-200 shrink-0" />
      )}
    </button>
  );
});

// ── Main Component ───────────────────────────────────────

export function QuizSelection({ onStart, onBack }: QuizSelectionProps) {
  const { tree, loading: treeLoading } = useContentTree();
  const { selectedInstitution } = useAuth();

  // Expanded state for sidebar tree
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Summaries cache per topic
  const [topicSummaries, setTopicSummaries] = useState<Record<string, Summary[]>>({});
  const [loadingTopics, setLoadingTopics] = useState<Set<string>>(new Set());

  // Selected summary for right panel
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);

  // Quiz loading for selected summary
  const [quizzesForSummary, setQuizzesForSummary] = useState<QuizEntity[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);
  const [loosePracticeCount, setLoosePracticeCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | ''>('');
  const [filterType, setFilterType] = useState<QuestionType | ''>('');
  const [maxQuestions, setMaxQuestions] = useState<number>(0); // 0 = all

  // Quiz history
  const [quizHistory, setQuizHistory] = useState<StudySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Active course/semester for sidebar header
  const [activeCourseIdx, setActiveCourseIdx] = useState(0);
  const [activeSemesterIdx, setActiveSemesterIdx] = useState(0);

  // Derive active course + semester
  const activeCourse = tree?.courses[activeCourseIdx] || null;
  const semesters = activeCourse?.semesters || [];
  const activeSemester = semesters[activeSemesterIdx] || null;

  // Load quiz history on mount
  useEffect(() => {
    setHistoryLoading(true);
    quizApi.getStudySessions({ session_type: 'quiz', limit: 10 })
      .then(sessions => {
        const arr = Array.isArray(sessions) ? sessions : [];
        setQuizHistory(arr.filter(s => s.completed_at));
      })
      .catch(err => {
        logger.error('[Quiz] History load error:', err);
        setQuizHistory([]);
      })
      .finally(() => setHistoryLoading(false));
  }, []);

  // Auto-expand all sections & topics when tree loads
  useEffect(() => {
    if (!treeLoading && tree && tree.courses.length > 0) {
      const course = tree.courses[activeCourseIdx] || tree.courses[0];
      const sem = course.semesters?.[activeSemesterIdx] || course.semesters?.[0];
      if (sem) {
        const allSectionIds = new Set(sem.sections.map(s => s.id));
        setExpandedSections(allSectionIds);
        const allTopicIds = new Set(sem.sections.flatMap(s => s.topics.map(t => t.id)));
        setExpandedTopics(allTopicIds);
      }
    }
  }, [treeLoading, tree, activeCourseIdx, activeSemesterIdx]);

  // Preload all topic summaries for the overview
  useEffect(() => {
    if (selectedSummary || !activeSemester) return;
    const allTopicIds = activeSemester.sections.flatMap(s => s.topics.map(t => t.id));
    const unloaded = allTopicIds.filter(id => !topicSummaries[id] && !loadingTopics.has(id));
    if (unloaded.length === 0) return;
    unloaded.forEach(async (topicId) => {
      setLoadingTopics(prev => new Set(prev).add(topicId));
      try {
        const s: any = await getTopicSummaries(topicId);
        const arr: Summary[] = Array.isArray(s) ? s : (s?.items || []);
        const published = arr.filter(x => x.status === 'published');
        setTopicSummaries(prev => ({
          ...prev,
          [topicId]: published.length > 0 ? published : arr,
        }));
      } catch {
        setTopicSummaries(prev => ({ ...prev, [topicId]: [] }));
      } finally {
        setLoadingTopics(prev => {
          const next = new Set(prev);
          next.delete(topicId);
          return next;
        });
      }
    });
  }, [selectedSummary, activeSemester]);

  // Load summaries when a topic is expanded
  const loadSummariesForTopic = useCallback(async (topicId: string) => {
    if (topicSummaries[topicId] || loadingTopics.has(topicId)) return;
    setLoadingTopics(prev => new Set(prev).add(topicId));
    try {
      const s: any = await getTopicSummaries(topicId);
      const arr: Summary[] = Array.isArray(s) ? s : (s?.items || []);
      const published = arr.filter(x => x.status === 'published');
      setTopicSummaries(prev => ({
        ...prev,
        [topicId]: published.length > 0 ? published : arr,
      }));
    } catch (err) {
      logger.error('[QuizView] Error loading summaries for topic:', topicId, err);
      setTopicSummaries(prev => ({ ...prev, [topicId]: [] }));
    } finally {
      setLoadingTopics(prev => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
    }
  }, [topicSummaries, loadingTopics]);

  // Toggle helpers
  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleTopic = useCallback((id: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        loadSummariesForTopic(id);
      }
      return next;
    });
  }, [loadSummariesForTopic]);

  // Select summary → load quizzes in right panel
  const handleSelectSummary = useCallback(async (summary: Summary) => {
    setSelectedSummary(summary);
    setQuizzesLoading(true);
    setLoadError(null);
    setQuizzesForSummary([]);
    setLoosePracticeCount(0);

    const [quizzesResult, questionsResult] = await Promise.allSettled([
      apiCall<QuizEntityListResponse | QuizEntity[]>(`/quizzes?summary_id=${summary.id}`),
      quizApi.getQuizQuestions(summary.id, { limit: 1 }),
    ]);

    let quizzes: QuizEntity[] = [];
    if (quizzesResult.status === 'fulfilled') {
      const res = quizzesResult.value;
      if (Array.isArray(res)) {
        quizzes = res;
      } else if (res && typeof res === 'object' && 'items' in res) {
        quizzes = res.items || [];
      }
      quizzes = quizzes.filter(q => q.is_active);
    }
    setQuizzesForSummary(quizzes);

    let qCount = 0;
    if (questionsResult.status === 'fulfilled') {
      const qRes = questionsResult.value;
      qCount = qRes.total || (qRes.items || []).length;
    }
    setLoosePracticeCount(qCount);

    if (quizzes.length === 0 && qCount === 0) {
      setLoadError('No hay quizzes ni preguntas para este resumen. El profesor aun no ha creado contenido de quiz aqui.');
    }
    setQuizzesLoading(false);
  }, []);

  // Start a specific quiz
  const handleStartQuizEntity = useCallback(async (quiz: QuizEntity) => {
    setLoadingQuizId(quiz.id);
    setLoadError(null);
    try {
      const res = await quizApi.getQuizQuestions(quiz.summary_id, { limit: 200 });
      let items = (res.items || []).filter(q => q.is_active);

      try {
        const filtered = await apiCall<any>(`/quiz-questions?summary_id=${quiz.summary_id}&quiz_id=${quiz.id}`);
        const filteredItems = Array.isArray(filtered) ? filtered : (filtered?.items || []);
        if (filteredItems.length > 0) {
          items = filteredItems.filter((q: any) => q.is_active);
        }
      } catch {
        // quiz_id filter failed, use all summary questions
      }

      if (items.length === 0) {
        setLoadError('Este quiz no tiene preguntas activas.');
        return;
      }
      items = items.sort(() => Math.random() - 0.5);
      if (maxQuestions > 0 && maxQuestions < items.length) {
        items = items.slice(0, maxQuestions);
      }
      onStart(items, quiz.title, quiz.summary_id);
    } catch (err: any) {
      setLoadError(err.message || 'Error al cargar preguntas del quiz');
    } finally {
      setLoadingQuizId(null);
    }
  }, [maxQuestions, onStart]);

  // Practice all questions for summary
  const handlePracticeAll = useCallback(async (summary: Summary) => {
    setLoadingQuizId('practice-all');
    setLoadError(null);
    try {
      const filters: any = { limit: 200 };
      if (filterDifficulty) filters.difficulty = filterDifficulty;
      if (filterType) filters.question_type = filterType;
      const res = await quizApi.getQuizQuestions(summary.id, filters);
      let items = (res.items || []).filter(q => q.is_active);
      if (items.length === 0) {
        setLoadError('Este resumen no tiene preguntas de quiz activas.');
        return;
      }
      items = items.sort(() => Math.random() - 0.5);
      if (maxQuestions > 0 && maxQuestions < items.length) {
        items = items.slice(0, maxQuestions);
      }
      onStart(items, summary.title || `Resumen ${summary.id.substring(0, 8)}`, summary.id);
    } catch (err: any) {
      setLoadError(err.message || 'Error al cargar preguntas');
    } finally {
      setLoadingQuizId(null);
    }
  }, [filterDifficulty, filterType, maxQuestions, onStart]);

  // ── Loading state ──
  if (treeLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-teal-500" size={32} />
      </div>
    );
  }

  if (!tree || tree.courses.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full py-20 text-zinc-400">
        <BookOpen size={40} className="mb-3 opacity-30" />
        <p className="text-sm" style={{ fontWeight: 600 }}>No hay cursos disponibles</p>
        <p className="text-[11px] text-zinc-300 mt-2 text-center max-w-sm">
          Verifica que tienes una institucion seleccionada y que el profesor ha creado cursos con contenido.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="flex h-full overflow-hidden">

      {/* ══ SIDEBAR (left) ══ */}
      <div className="w-[340px] shrink-0 bg-white border-r border-zinc-200 flex flex-col overflow-hidden">

        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors border-b border-zinc-100 shrink-0"
          style={{ fontWeight: 500 }}
        >
          <ChevronLeft size={14} />
          Volver al hub
        </button>

        {/* Sidebar Header: Course + Semester tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-zinc-100 shrink-0">
          {tree.courses.length > 1 ? (
            <div className="mb-2">
              <select
                value={activeCourseIdx}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setActiveCourseIdx(idx);
                  setActiveSemesterIdx(0);
                  setExpandedSections(new Set());
                  setExpandedTopics(new Set());
                  setSelectedSummary(null);
                }}
                className="w-full text-[13px] text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all cursor-pointer"
                style={{ fontWeight: 600 }}
              >
                {tree.courses.map((c, idx) => (
                  <option key={c.id} value={idx}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-[14px] text-zinc-900 truncate mb-2" style={{ fontWeight: 700 }}>
              {activeCourse?.name}
            </p>
          )}

          {/* Semester pills */}
          {semesters.length > 0 ? (
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              {semesters.map((sem, idx) => {
                const isActive = activeSemesterIdx === idx;
                return (
                  <button
                    key={sem.id}
                    onClick={() => {
                      setActiveSemesterIdx(idx);
                      setExpandedSections(new Set());
                      setExpandedTopics(new Set());
                      setSelectedSummary(null);
                    }}
                    className={clsx(
                      'px-3 py-1 rounded-full text-[11px] whitespace-nowrap transition-all shrink-0',
                      isActive
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
                    )}
                    style={{ fontWeight: isActive ? 600 : 500 }}
                  >
                    {sem.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-400 italic">Sin semestres</p>
          )}

          {/* Quick stats */}
          {activeSemester && (
            <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Layers size={11} className="text-zinc-400" />
                {activeSemester.sections.length} secciones
              </span>
              <span className="flex items-center gap-1">
                <FileText size={11} className="text-zinc-400" />
                {activeSemester.sections.reduce((a, s) => a + s.topics.length, 0)} temas
              </span>
            </div>
          )}
        </div>

        {/* Tree navigation */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light">
          {activeSemester ? (
            <div className="py-2">
              {activeSemester.sections.map((section, secIdx) => {
                const topicCount = section.topics.length;
                const isSectionExpanded = expandedSections.has(section.id);

                return (
                  <div key={section.id} className={clsx(secIdx > 0 && 'mt-0.5')}>
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-4 py-2 flex items-center gap-2 hover:bg-zinc-50/80 transition-colors text-left"
                    >
                      <ChevronRight size={13} className={clsx(
                        'shrink-0 transition-transform text-zinc-400',
                        isSectionExpanded && 'rotate-90'
                      )} />
                      <Layers size={13} className="text-teal-500 shrink-0" />
                      <span className="text-[12px] text-zinc-700 truncate flex-1" style={{ fontWeight: 600 }}>
                        {section.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 shrink-0 bg-zinc-100 px-1.5 py-0.5 rounded" style={{ fontWeight: 500 }}>
                        {topicCount}
                      </span>
                    </button>

                    {/* Topics + Summaries */}
                    <AnimatePresence initial={false}>
                      {isSectionExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-2 pb-1.5">
                            {topicCount === 0 ? (
                              <p className="text-[11px] text-zinc-300 px-4 py-2 italic">Sin temas</p>
                            ) : (
                              section.topics.map((topic) => {
                                const isTopicExpanded = expandedTopics.has(topic.id);
                                const summaries = topicSummaries[topic.id] || [];
                                const isLoadingSummaries = loadingTopics.has(topic.id);
                                const summaryCount = summaries.length;
                                const hasSelectedChild = summaries.some(s => selectedSummary?.id === s.id);

                                return (
                                  <div key={topic.id} className="mb-0.5">
                                    {/* Topic row */}
                                    <button
                                      onClick={() => toggleTopic(topic.id)}
                                      className={clsx(
                                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left',
                                        hasSelectedChild
                                          ? 'bg-teal-50/60'
                                          : isTopicExpanded
                                          ? 'bg-zinc-50'
                                          : 'hover:bg-zinc-50/80'
                                      )}
                                    >
                                      <ChevronRight size={11} className={clsx(
                                        'shrink-0 transition-transform',
                                        isTopicExpanded ? 'rotate-90 text-teal-500' : 'text-zinc-300'
                                      )} />
                                      <span className={clsx(
                                        'text-[12px] truncate flex-1',
                                        hasSelectedChild ? 'text-teal-700' : 'text-zinc-600'
                                      )} style={{ fontWeight: hasSelectedChild ? 600 : 500 }}>
                                        {topic.name}
                                      </span>
                                      {isLoadingSummaries && (
                                        <Loader2 size={11} className="animate-spin text-zinc-300 shrink-0" />
                                      )}
                                      {!isLoadingSummaries && summaryCount > 0 && (
                                        <span className={clsx(
                                          'text-[10px] px-1.5 py-0.5 rounded shrink-0',
                                          hasSelectedChild ? 'bg-teal-100 text-teal-600' : 'bg-zinc-100 text-zinc-400'
                                        )} style={{ fontWeight: 500 }}>
                                          {summaryCount}
                                        </span>
                                      )}
                                    </button>

                                    {/* Summaries */}
                                    <AnimatePresence initial={false}>
                                      {isTopicExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.12, ease: 'easeInOut' }}
                                          className="overflow-hidden"
                                        >
                                          <div className="ml-5 mr-1 mt-0.5 mb-1 border-l-2 border-teal-100 pl-2.5">
                                            {isLoadingSummaries ? (
                                              <div className="flex items-center gap-1.5 py-2 px-1">
                                                <Loader2 size={11} className="animate-spin text-zinc-400" />
                                                <span className="text-[11px] text-zinc-400">Cargando resumenes...</span>
                                              </div>
                                            ) : summaries.length === 0 ? (
                                              <p className="text-[11px] text-zinc-300 py-2 px-1 italic">Sin resumenes disponibles</p>
                                            ) : (
                                              summaries.map((summary) => (
                                                <SidebarSummaryItem
                                                  key={summary.id}
                                                  summary={summary}
                                                  isActive={selectedSummary?.id === summary.id}
                                                  onSelect={() => handleSelectSummary(summary)}
                                                />
                                              ))
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-300">
              <Layers size={24} className="mb-2 opacity-40" />
              <p className="text-[11px]">Sin semestres en este curso</p>
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50">

        {/* Top bar */}
        <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-200 shrink-0 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center shadow-sm">
              <ClipboardList size={15} className="text-white" />
            </div>
            <div>
              <h1 className="text-[14px] text-zinc-900" style={{ fontWeight: 700 }}>Quizzes</h1>
              <p className="text-[10px] text-zinc-400">
                {selectedSummary
                  ? selectedSummary.title || `Resumen ${selectedSummary.id.substring(0, 8)}`
                  : 'Selecciona un resumen del panel izquierdo'}
              </p>
            </div>
          </div>
          {selectedSummary && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-lg border border-teal-200">
              <BookOpen size={12} className="text-teal-600" />
              <span className="text-[11px] text-teal-700" style={{ fontWeight: 600 }}>
                {quizzesForSummary.length} quiz{quizzesForSummary.length !== 1 ? 'zes' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light">
          <div className="max-w-3xl mx-auto px-6 py-6">

            {/* Filters bar */}
            {selectedSummary && (
              <div className="flex items-center gap-3 mb-5 flex-wrap bg-white/70 backdrop-blur-sm rounded-xl border border-zinc-200 px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Filter size={12} />
                  <span className="text-[9px] uppercase tracking-wider" style={{ fontWeight: 700 }}>Filtros</span>
                </div>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value as QuestionType | '')}
                  className="text-[11px] border border-zinc-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
                >
                  <option value="">Todos los tipos</option>
                  <option value="mcq">Opcion multiple</option>
                  <option value="true_false">Verdadero / Falso</option>
                  <option value="fill_blank">Completar</option>
                  <option value="open">Respuesta abierta</option>
                </select>
                <select
                  value={filterDifficulty}
                  onChange={e => setFilterDifficulty(e.target.value as Difficulty | '')}
                  className="text-[11px] border border-zinc-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
                >
                  <option value="">Toda dificultad</option>
                  <option value="easy">Facil</option>
                  <option value="medium">Media</option>
                  <option value="hard">Dificil</option>
                </select>
                <select
                  value={maxQuestions}
                  onChange={e => setMaxQuestions(Number(e.target.value))}
                  className="text-[11px] border border-zinc-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
                >
                  <option value={0}>Todas las preguntas</option>
                  <option value={5}>5 preguntas</option>
                  <option value={10}>10 preguntas</option>
                  <option value={15}>15 preguntas</option>
                  <option value={20}>20 preguntas</option>
                </select>
              </div>
            )}

            {/* Error message */}
            {loadError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm mb-5">
                <AlertCircle size={16} className="shrink-0" />
                <span>{loadError}</span>
              </div>
            )}

            {/* No summary selected: Overview */}
            {!selectedSummary ? (
              <div className="py-2">
                {activeCourse && activeSemester && (
                  <QuizOverview
                    activeCourse={activeCourse}
                    activeSemester={activeSemester}
                    topicSummaries={topicSummaries}
                    loadingTopics={loadingTopics}
                    quizHistory={quizHistory}
                    showHistory={showHistory}
                    onToggleHistory={() => setShowHistory(prev => !prev)}
                    onSelectSummary={handleSelectSummary}
                  />
                )}
              </div>
            ) : (
              /* Summary selected: Show quizzes */
              <div>
                {quizzesLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin text-teal-500" size={24} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Professor quizzes */}
                    {quizzesForSummary.length > 0 && (
                      <>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2" style={{ fontWeight: 700 }}>
                          Quizzes del profesor ({quizzesForSummary.length})
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {quizzesForSummary.map(quiz => (
                            <button
                              key={quiz.id}
                              onClick={() => handleStartQuizEntity(quiz)}
                              disabled={loadingQuizId === quiz.id}
                              className="flex items-center gap-3 p-4 rounded-2xl border border-zinc-200 hover:border-teal-300 hover:bg-teal-50/30 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left group bg-white"
                            >
                              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 group-hover:bg-teal-500 transition-colors">
                                {loadingQuizId === quiz.id ? (
                                  <Loader2 size={18} className="animate-spin text-teal-600" />
                                ) : (
                                  <ClipboardList size={18} className="text-teal-600 group-hover:text-white transition-colors" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-zinc-800 truncate" style={{ fontWeight: 600 }}>{quiz.title}</p>
                                {quiz.description && (
                                  <p className="text-[11px] text-zinc-400 truncate">{quiz.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200" style={{ fontWeight: 600 }}>
                                    {quiz.source === 'ai' ? 'IA' : 'Manual'}
                                  </span>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-zinc-300 shrink-0 group-hover:text-teal-500" />
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* No quizzes message */}
                    {quizzesForSummary.length === 0 && loosePracticeCount === 0 && !loadError && (
                      <div className="flex flex-col items-center py-12 text-zinc-400">
                        <ClipboardList size={28} className="mb-2 opacity-40" />
                        <p className="text-sm">No hay quizzes disponibles para este resumen</p>
                        <p className="text-[11px] text-zinc-300 mt-1">El profesor aun no ha creado quizzes aqui</p>
                      </div>
                    )}

                    {/* Practice all loose questions */}
                    {loosePracticeCount > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-100">
                        <button
                          onClick={() => handlePracticeAll(selectedSummary)}
                          disabled={loadingQuizId === 'practice-all'}
                          className="w-full flex items-center gap-3 p-4 rounded-2xl border border-dashed border-zinc-300 hover:border-teal-300 hover:bg-teal-50/20 transition-all text-left group bg-white"
                        >
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-teal-500 transition-colors">
                            {loadingQuizId === 'practice-all' ? (
                              <Loader2 size={18} className="animate-spin text-zinc-500" />
                            ) : (
                              <Play size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-zinc-700" style={{ fontWeight: 600 }}>Practica libre</p>
                            <p className="text-[11px] text-zinc-400">
                              {loosePracticeCount} pregunta{loosePracticeCount !== 1 ? 's' : ''} disponible{loosePracticeCount !== 1 ? 's' : ''} en este resumen
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-zinc-300 shrink-0" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
