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

import React, { useState, Component } from 'react';
import type { ReactNode } from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import type { QuizQuestion } from '@/app/services/quizApi';
import { AnimatePresence } from 'motion/react';
import { AlertCircle, RotateCw } from 'lucide-react';
import { QuizSelection } from './QuizSelection';
import { QuizTaker } from '@/app/components/student/QuizTaker';

// ── ErrorBoundary (for QuizSelection only) ───────────────

interface EBProps { children: ReactNode; label: string }
interface EBState { hasError: boolean; error: Error | null }

class QuizErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
            <AlertCircle size={32} className="text-rose-400" />
          </div>
          <h2 className="text-lg text-zinc-900 mb-2" style={{ fontWeight: 700 }}>
            Error en {this.props.label}
          </h2>
          <p className="text-sm text-zinc-500 mb-4 max-w-md">
            {this.state.error?.message || 'Algo salio mal. Intenta de nuevo.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2a8c7a] text-white text-sm hover:bg-[#244e47] font-semibold transition-colors"
            style={{ fontWeight: 600 }}
          >
            <RotateCw size={14} /> Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
          <QuizErrorBoundary key="sel-eb" label="Seleccion de Quiz">
            <QuizSelection
              key="selection"
              onStart={handleStartQuiz}
              onBack={handleBackToStudy}
            />
          </QuizErrorBoundary>
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
