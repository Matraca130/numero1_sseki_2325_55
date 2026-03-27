// ============================================================
// Axon — Student QuizView (orchestrator)
//
// Thin state-machine that switches between:
//   1. QuizSelection — sidebar tree + quiz picker
//   2. QuizTaker — active quiz session (Phase 11: unified system)
//
// Q-UX2: Threads timeLimitSeconds from QuizSelection to QuizTaker.
// All logic lives in sub-components. This file stays < 100 lines.
// ============================================================

import { useState } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import type { QuizQuestion } from '@/app/services/quizApi';
import { AnimatePresence } from 'motion/react';
import { QuizSelection } from './QuizSelection';
import { QuizTaker } from '@/app/components/student/QuizTaker';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';

// ── Main QuizView ──────────────────────────────────────

export function QuizView() {
  const { navigateTo } = useStudentNav();
  const [viewState, setViewState] = useState<'selection' | 'session'>('selection');
  const [sessionQuestions, setSessionQuestions] = useState<QuizQuestion[]>([]);
  const [sessionSummaryTitle, setSessionSummaryTitle] = useState('');
  const [sessionSummaryId, setSessionSummaryId] = useState('');
  const [sessionTimeLimitSeconds, setSessionTimeLimitSeconds] = useState<number | undefined>(undefined);

  const handleStartQuiz = (questions: QuizQuestion[], summaryTitle: string, summaryId: string, timeLimitSeconds?: number) => {
    setSessionQuestions(questions);
    setSessionSummaryTitle(summaryTitle);
    setSessionSummaryId(summaryId);
    setSessionTimeLimitSeconds(timeLimitSeconds ?? undefined);
    setViewState('session');
  };

  const handleBackToStudy = () => {
    navigateTo('study-hub');
  };

  return (
    <div className="h-full bg-zinc-50 overflow-hidden">
      <AnimatePresence mode="wait">
        {viewState === 'selection' ? (
          <ErrorBoundary key="sel-eb" variant="section" retry={() => {}}>
            <QuizSelection
              key="selection"
              onStart={handleStartQuiz}
              onBack={handleBackToStudy}
            />
          </ErrorBoundary>
        ) : (
          <QuizTaker
            key="session"
            preloadedQuestions={sessionQuestions}
            quizTitle={`Quiz: ${sessionSummaryTitle}`}
            summaryId={sessionSummaryId}
            timeLimitSeconds={sessionTimeLimitSeconds}
            onBack={() => setViewState('selection')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default QuizView;
