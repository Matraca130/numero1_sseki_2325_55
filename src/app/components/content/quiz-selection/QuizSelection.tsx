/**
 * QuizSelection — Main component.
 * State management and composition of QuizSidebar + QuizRightPanel.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useContentTree } from '@/app/context/ContentTreeContext';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion, QuestionType, Difficulty, StudySession, QuizEntity } from '@/app/services/quizApi';
import type { Summary } from '@/app/types/platform';
import { logger } from '@/app/lib/logger';
import { motion } from 'motion/react';
import { GraduationCap } from 'lucide-react';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { SkeletonCard } from '@/app/components/shared/SkeletonCard';
import { loadSummariesForTopicFn, loadQuizzesForSummary, loadQuizQuestions, loadPracticeQuestions, loadBlocksForSummary, loadBlockPracticeQuestions } from './quiz-data-loading';
import { QuizSidebar } from './QuizSidebar';
import { QuizRightPanel } from './QuizRightPanel';

interface QuizSelectionProps {
  onStart: (questions: QuizQuestion[], summaryTitle: string, summaryId: string, timeLimitSeconds?: number) => void;
  onBack: () => void;
}

export function QuizSelection({ onStart, onBack }: QuizSelectionProps) {
  const { tree, loading: treeLoading } = useContentTree();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [topicSummaries, setTopicSummaries] = useState<Record<string, Summary[]>>({});
  const [loadingTopics, setLoadingTopics] = useState<Set<string>>(new Set());
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [quizzesForSummary, setQuizzesForSummary] = useState<QuizEntity[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);
  const [loosePracticeCount, setLoosePracticeCount] = useState(0);
  const [summaryBlocks, setSummaryBlocks] = useState<{ id: string; title: string; type: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | ''>('');
  const [filterType, setFilterType] = useState<QuestionType | ''>('');
  const [maxQuestions, setMaxQuestions] = useState<number>(0);
  const [quizHistory, setQuizHistory] = useState<StudySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeCourseIdx, setActiveCourseIdx] = useState(0);
  const [activeSemesterIdx, setActiveSemesterIdx] = useState(0);

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
      .catch(err => { logger.error('[Quiz] History load error:', err); setQuizHistory([]); })
      .finally(() => setHistoryLoading(false));
  }, []);

  // Auto-expand all sections & topics when tree loads
  useEffect(() => {
    if (!treeLoading && tree && tree.courses.length > 0) {
      const course = tree.courses[activeCourseIdx] || tree.courses[0];
      const sem = course.semesters?.[activeSemesterIdx] || course.semesters?.[0];
      if (sem) {
        setExpandedSections(new Set(sem.sections.map((s: any) => s.id)));
        setExpandedTopics(new Set(sem.sections.flatMap((s: any) => s.topics.map((t: any) => t.id))));
      }
    }
  }, [treeLoading, tree, activeCourseIdx, activeSemesterIdx]);

  // Preload all topic summaries
  useEffect(() => {
    if (selectedSummary || !activeSemester) return;
    const allTopicIds = activeSemester.sections.flatMap((s: any) => s.topics.map((t: any) => t.id));
    const unloaded = allTopicIds.filter((id: string) => !topicSummaries[id] && !loadingTopics.has(id));
    if (unloaded.length === 0) return;
    unloaded.forEach(async (topicId: string) => {
      setLoadingTopics(prev => new Set(prev).add(topicId));
      const summaries = await loadSummariesForTopicFn(topicId);
      setTopicSummaries(prev => ({ ...prev, [topicId]: summaries }));
      setLoadingTopics(prev => { const next = new Set(prev); next.delete(topicId); return next; });
    });
  }, [selectedSummary, activeSemester]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleTopic = useCallback((id: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!topicSummaries[id] && !loadingTopics.has(id)) {
          setLoadingTopics(p => new Set(p).add(id));
          loadSummariesForTopicFn(id).then(summaries => {
            setTopicSummaries(p => ({ ...p, [id]: summaries }));
            setLoadingTopics(p => { const n = new Set(p); n.delete(id); return n; });
          });
        }
      }
      return next;
    });
  }, [topicSummaries, loadingTopics]);

  const handleSelectSummary = useCallback(async (summary: Summary) => {
    setSelectedSummary(summary);
    setQuizzesLoading(true);
    setLoadError(null);
    const result = await loadQuizzesForSummary(summary.id);
    setQuizzesForSummary(result.quizzes);
    setLoosePracticeCount(result.practiceCount);
    setLoadError(result.error);
    setQuizzesLoading(false);
    // Load blocks for per-block quiz
    loadBlocksForSummary(summary.id).then(setSummaryBlocks);
  }, []);

  const handleStartQuizEntity = useCallback(async (quiz: QuizEntity) => {
    setLoadingQuizId(quiz.id);
    setLoadError(null);
    try {
      const result = await loadQuizQuestions(quiz, maxQuestions);
      if (result.error) { setLoadError(result.error); return; }
      onStart(result.items, quiz.title, quiz.summary_id, quiz.time_limit_seconds);
    } catch (err: any) {
      setLoadError(err.message || 'Error al cargar preguntas del quiz');
    } finally {
      setLoadingQuizId(null);
    }
  }, [maxQuestions, onStart]);

  const handlePracticeAll = useCallback(async (summary: Summary) => {
    setLoadingQuizId('practice-all');
    setLoadError(null);
    try {
      const result = await loadPracticeQuestions(summary.id, { difficulty: filterDifficulty, type: filterType }, maxQuestions);
      if (result.error) { setLoadError(result.error); return; }
      onStart(result.items, summary.title || `Resumen ${summary.id.substring(0, 8)}`, summary.id);
    } catch (err: any) {
      setLoadError(err.message || 'Error al cargar preguntas');
    } finally {
      setLoadingQuizId(null);
    }
  }, [filterDifficulty, filterType, maxQuestions, onStart]);

  const handleBlockPractice = useCallback(async (blockId: string, blockTitle: string) => {
    if (!selectedSummary) return;
    setLoadingQuizId(`block-${blockId}`);
    setLoadError(null);
    try {
      const result = await loadBlockPracticeQuestions(selectedSummary.id, blockId, { difficulty: filterDifficulty, type: filterType }, maxQuestions);
      if (result.error) { setLoadError(result.error); return; }
      onStart(result.items, blockTitle, selectedSummary.id);
    } catch (err: any) {
      setLoadError(err.message || 'Error al cargar preguntas del bloque');
    } finally {
      setLoadingQuizId(null);
    }
  }, [selectedSummary, filterDifficulty, filterType, maxQuestions, onStart]);

  const handleCourseChange = useCallback((idx: number) => {
    setActiveCourseIdx(idx);
    setActiveSemesterIdx(0);
    setExpandedSections(new Set());
    setExpandedTopics(new Set());
    setSelectedSummary(null);
  }, []);

  const handleSemesterChange = useCallback((idx: number) => {
    setActiveSemesterIdx(idx);
    setExpandedSections(new Set());
    setExpandedTopics(new Set());
    setSelectedSummary(null);
  }, []);

  if (treeLoading) {
    return <div className="p-6"><SkeletonCard variant="content" count={4} className="grid grid-cols-1 md:grid-cols-2 gap-4" /></div>;
  }

  if (!tree || tree.courses.length === 0) {
    return <EmptyState icon={GraduationCap} title="Sin quizzes disponibles" description="No hay quizzes para este tema aun" action={{ label: 'Volver', onClick: onBack }} />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="flex h-full overflow-hidden">
      <QuizSidebar
        tree={tree} activeCourseIdx={activeCourseIdx} activeSemesterIdx={activeSemesterIdx}
        expandedSections={expandedSections} expandedTopics={expandedTopics}
        topicSummaries={topicSummaries} loadingTopics={loadingTopics}
        selectedSummary={selectedSummary} onBack={onBack}
        onCourseChange={handleCourseChange} onSemesterChange={handleSemesterChange}
        onToggleSection={toggleSection} onToggleTopic={toggleTopic}
        onSelectSummary={handleSelectSummary}
      />
      <QuizRightPanel
        selectedSummary={selectedSummary} quizzesForSummary={quizzesForSummary}
        quizzesLoading={quizzesLoading} loadingQuizId={loadingQuizId}
        loosePracticeCount={loosePracticeCount} loadError={loadError}
        filterDifficulty={filterDifficulty} filterType={filterType} maxQuestions={maxQuestions}
        activeCourse={activeCourse} activeSemester={activeSemester}
        topicSummaries={topicSummaries} loadingTopics={loadingTopics}
        quizHistory={quizHistory} showHistory={showHistory}
        onFilterDifficulty={setFilterDifficulty} onFilterType={setFilterType} onMaxQuestions={setMaxQuestions}
        onToggleHistory={() => setShowHistory(prev => !prev)}
        onSelectSummary={handleSelectSummary} onStartQuiz={handleStartQuizEntity} onPracticeAll={handlePracticeAll}
        summaryBlocks={summaryBlocks} onBlockPractice={handleBlockPractice}
      />
    </motion.div>
  );
}
