// ============================================================
// Axon — Student Quiz: Navigation & Input Hook (R2 Extraction)
//
// Extracted from QuizTaker.tsx to isolate:
//   - Question navigation (currentIdx, direction)
//   - Live input state (selected option, text, T/F)
//   - Submit wrappers (delegates to useQuizSession.submitAnswer)
//   - Recovery/restart/review/adaptive handlers
//
// QuizTaker.tsx retains: phase rendering, layout, animation.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import type { UseQuizSessionReturn } from '@/app/components/student/useQuizSession';
import { clearQuizBackup, saveQuizBackup } from '@/app/components/student/useQuizBackup';

// ── Return type ──────────────────────────────────────────

export interface UseQuizNavigationReturn {
  // Navigation state
  currentIdx: number;
  navDirection: 'forward' | 'back';
  questionStartTime: number;

  // Live input state + setters
  liveSelectedOption: string | null;
  liveTextInput: string;
  liveTFAnswer: string | null;
  setLiveSelectedOption: (v: string | null) => void;
  setLiveTextInput: (v: string) => void;
  setLiveTFAnswer: (v: string | null) => void;

  // Computed
  currentQuestion: QuizQuestion | undefined;
  isReviewing: boolean;
  canSubmit: boolean;

  // Handlers
  handleSubmit: () => void;
  handleNext: () => void;
  handlePrev: () => void;
  goToQuestion: (idx: number, dir: 'forward' | 'back') => void;
  handleRestart: () => void;
  handleReview: () => void;
  handleAcceptRecovery: () => void;
  handleDismissRecovery: () => void;
  handleAdaptiveQuizReady: (newQuizId: string, newTitle: string) => void;
}

// ── Hook ───────────────────────────────────────────────

export function useQuizNavigation(
  session: UseQuizSessionReturn,
  activeQuizId: string | undefined,
  activeTitle: string,
  setActiveQuizId: (id: string) => void,
  setActiveTitle: (title: string) => void,
): UseQuizNavigationReturn {
  const {
    questions, savedAnswers, submitting, pendingBackup,
    submitAnswer, finishQuiz, restartSession, reviewSession,
    restoreFromBackup, dismissBackup,
  } = session;

  // ── Navigation state ────────────────────────────────────
  const [currentIdx, setCurrentIdx] = useState(0);
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');

  // ── Live input state ────────────────────────────────────
  const [liveSelectedOption, setLiveSelectedOption] = useState<string | null>(null);
  const [liveTextInput, setLiveTextInput] = useState('');
  const [liveTFAnswer, setLiveTFAnswer] = useState<string | null>(null);

  // ── Per-question timer ──────────────────────────────────
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIdx]);

  // ── Computed ───────────────────────────────────────────
  const currentQuestion = questions[currentIdx];
  const saved = savedAnswers[currentIdx];
  const isReviewing = saved?.answered === true;

  const canSubmit = !submitting && !!currentQuestion && (
    currentQuestion.question_type === 'mcq' ? liveSelectedOption !== null :
    currentQuestion.question_type === 'true_false' ? !!liveTFAnswer :
    !!liveTextInput.trim()
  );

  // ── Live input reset helper (DRY — P2-S02) ─────────────

  const resetLiveInputs = useCallback(
    (s?: { answered: boolean; selectedOption: string | null; answer: string }) => {
      if (s?.answered) {
        setLiveSelectedOption(s.selectedOption);
        setLiveTextInput(s.answer);
        setLiveTFAnswer(s.answer);
      } else {
        setLiveSelectedOption(null);
        setLiveTextInput('');
        setLiveTFAnswer(null);
      }
    },
    [],
  );

  // ── Submit wrappers (thin — delegate to session hook) ───

  const doSubmit = useCallback(
    (answer: string, optionText: string | null) => {
      const currentQ = questions[currentIdx];
      if (!currentQ || submitting) return;
      const timeTaken = Date.now() - questionStartTime;
      submitAnswer(currentQ, answer, optionText, timeTaken, currentIdx);
    },
    [questions, currentIdx, submitting, questionStartTime, submitAnswer],
  );

  const handleSubmitMC = useCallback(() => {
    if (liveSelectedOption !== null) doSubmit(liveSelectedOption, liveSelectedOption);
  }, [liveSelectedOption, doSubmit]);

  const handleSubmitTF = useCallback(() => {
    if (liveTFAnswer) doSubmit(liveTFAnswer, null);
  }, [liveTFAnswer, doSubmit]);

  const handleSubmitOpen = useCallback(() => {
    if (liveTextInput.trim()) doSubmit(liveTextInput.trim(), null);
  }, [liveTextInput, doSubmit]);

  // Unified submit — picks correct handler based on current question type
  const handleSubmit = useCallback(() => {
    const qt = questions[currentIdx];
    if (!qt) return;
    if (qt.question_type === 'mcq') handleSubmitMC();
    else if (qt.question_type === 'true_false') handleSubmitTF();
    else handleSubmitOpen();
  }, [questions, currentIdx, handleSubmitMC, handleSubmitTF, handleSubmitOpen]);

  // ── Navigation ──────────────────────────────────────────

  const goToQuestion = useCallback(
    (idx: number, dir: 'forward' | 'back') => {
      setNavDirection(dir);
      setCurrentIdx(idx);
      resetLiveInputs(savedAnswers[idx]);

      // P1-S03: Persist navigation position to backup
      if (activeQuizId && Object.keys(savedAnswers).length > 0) {
        saveQuizBackup({
          quizId: activeQuizId,
          quizTitle: activeTitle,
          questionIds: questions.map(q => q.id),
          savedAnswers,
          currentIdx: idx,
          savedAt: 0, // overwritten by saveQuizBackup
        });
      }
    },
    [savedAnswers, activeQuizId, activeTitle, questions, resetLiveInputs],
  );

  const handleNext = useCallback(() => {
    if (currentIdx < questions.length - 1) {
      goToQuestion(currentIdx + 1, 'forward');
    } else {
      finishQuiz();
    }
  }, [currentIdx, questions.length, goToQuestion, finishQuiz]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) goToQuestion(currentIdx - 1, 'back');
  }, [currentIdx, goToQuestion]);

  // ── Restart (hook resets session + local resets UI) ─────

  const handleRestart = useCallback(() => {
    setCurrentIdx(0);
    setNavDirection('forward');
    resetLiveInputs();
    restartSession();
  }, [restartSession, resetLiveInputs]);

  // ── Adaptive quiz swap ──────────────────────────────────

  const handleAdaptiveQuizReady = useCallback(
    (newQuizId: string, newTitle: string) => {
      // P1-S03: Clear old quiz backup before swapping
      if (activeQuizId) clearQuizBackup(activeQuizId);
      setCurrentIdx(0);
      setNavDirection('forward');
      resetLiveInputs();
      setActiveQuizId(newQuizId);
      setActiveTitle(newTitle);
      // useQuizSession's useEffect will auto-reset on quizId change
    },
    [activeQuizId, resetLiveInputs, setActiveQuizId, setActiveTitle],
  );

  // ── Recovery handlers (P1-S03) ─────────────────────────

  const handleAcceptRecovery = useCallback(() => {
    if (pendingBackup) {
      const idx = pendingBackup.currentIdx;
      setCurrentIdx(idx);
      setNavDirection('forward');
      resetLiveInputs(pendingBackup.savedAnswers[idx]);
    }
    restoreFromBackup();
  }, [pendingBackup, restoreFromBackup, resetLiveInputs]);

  const handleDismissRecovery = useCallback(() => {
    setCurrentIdx(0);
    setNavDirection('forward');
    resetLiveInputs();
    dismissBackup();
  }, [dismissBackup, resetLiveInputs]);

  // ── Review (go back to session from results) ───────────

  const handleReview = useCallback(() => {
    setCurrentIdx(0);
    setNavDirection('forward');
    resetLiveInputs(savedAnswers[0]);
    reviewSession();
  }, [savedAnswers, reviewSession, resetLiveInputs]);

  // ── Return ──────────────────────────────────────────────

  return {
    currentIdx,
    navDirection,
    questionStartTime,
    liveSelectedOption,
    liveTextInput,
    liveTFAnswer,
    setLiveSelectedOption,
    setLiveTextInput,
    setLiveTFAnswer,
    currentQuestion,
    isReviewing,
    canSubmit,
    handleSubmit,
    handleNext,
    handlePrev,
    goToQuestion,
    handleRestart,
    handleReview,
    handleAcceptRecovery,
    handleDismissRecovery,
    handleAdaptiveQuizReady,
  };
}
