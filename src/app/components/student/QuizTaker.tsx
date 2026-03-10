// ============================================================
// Axon — Student: QuizTaker (EV-3 Prompt B)
//
// Takes a specific quiz by quiz_id.
// Phase 3 refactor: renderers extracted to sub-components
// Phase 6b refactor: session lifecycle extracted to useQuizSession hook
// Phase 7b refactor: error boundary added
// P1-S03: localStorage recovery UI (recovery phase)
// P2-S02: DRY live input reset helper
// P7: Countdown timer
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { normalizeDifficulty } from '@/app/services/quizConstants';
import { QuizResults } from '@/app/components/student/QuizResults';
import type { QuizQuestion } from '@/app/services/quizApi';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Loader2, AlertTriangle } from 'lucide-react';
import { BANNER_WARNING } from '@/app/services/quizDesignTokens';

import { QuestionRenderer } from '@/app/components/student/QuestionRenderer';
import { QuizProgressBar } from '@/app/components/student/QuizProgressBar';
import { QuizTopBar } from '@/app/components/student/QuizTopBar';
import { QuizBottomBar } from '@/app/components/student/QuizBottomBar';

import { useQuizSession } from '@/app/components/student/useQuizSession';
import { clearQuizBackup, saveQuizBackup } from '@/app/components/student/useQuizBackup';
import { QuizRecoveryPrompt } from '@/app/components/student/QuizRecoveryPrompt';
import { QuizErrorBoundary } from '@/app/components/student/QuizErrorBoundary';

export type { SavedAnswer } from '@/app/components/student/quiz-types';

// ── Animation variants (stable reference) ────────────────
const SLIDE_VARIANTS = {
  forward: {
    enter: { opacity: 0, y: 16 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
  },
  back: {
    enter: { opacity: 0, y: -16 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 16 },
  },
} as const;

// ── Props ─────────────────────────────────────────────

interface QuizTakerProps {
  quizId?: string;
  preloadedQuestions?: QuizQuestion[];
  quizTitle: string;
  summaryId?: string;
  onBack: () => void;
  onComplete?: () => void;
}

// ── Main Component ───────────────────────────────────────

export function QuizTaker({ quizId, preloadedQuestions, quizTitle, summaryId, onBack, onComplete }: QuizTakerProps) {
  const [activeQuizId, setActiveQuizId] = useState(quizId);
  const [activeTitle, setActiveTitle] = useState(quizTitle);

  const {
    phase, questions, sessionStartTime, errorMsg, backendWarning,
    submitting, closingSession, savedAnswers, keywordMap,
    correctCount, wrongCount, answeredCount,
    pendingBackup, restoreFromBackup, dismissBackup,
    submitAnswer, finishQuiz, restartSession, reviewSession,
  } = useQuizSession(activeQuizId, summaryId, preloadedQuestions, activeTitle);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');

  const [liveSelectedOption, setLiveSelectedOption] = useState<string | null>(null);
  const [liveTextInput, setLiveTextInput] = useState('');
  const [liveTFAnswer, setLiveTFAnswer] = useState<string | null>(null);

  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIdx]);

  const resetLiveInputs = useCallback((saved?: { answered: boolean; selectedOption: string | null; answer: string }) => {
    if (saved?.answered) {
      setLiveSelectedOption(saved.selectedOption);
      setLiveTextInput(saved.answer);
      setLiveTFAnswer(saved.answer);
    } else {
      setLiveSelectedOption(null);
      setLiveTextInput('');
      setLiveTFAnswer(null);
    }
  }, []);

  const doSubmit = useCallback(
    (answer: string, optionText: string | null) => {
      const currentQ = questions[currentIdx];
      if (!currentQ || submitting) return;
      const timeTaken = Date.now() - questionStartTime;
      submitAnswer(currentQ, answer, optionText, timeTaken, currentIdx);
    },
    [questions, currentIdx, submitting, questionStartTime, submitAnswer],
  );

  const handleSubmitMC = () => {
    if (liveSelectedOption !== null) doSubmit(liveSelectedOption, liveSelectedOption);
  };

  const handleSubmitTF = () => {
    if (liveTFAnswer) doSubmit(liveTFAnswer, null);
  };

  const handleSubmitOpen = () => {
    if (liveTextInput.trim()) doSubmit(liveTextInput.trim(), null);
  };

  const goToQuestion = (idx: number, dir: 'forward' | 'back') => {
    setNavDirection(dir);
    setCurrentIdx(idx);
    resetLiveInputs(savedAnswers[idx]);

    if (activeQuizId && Object.keys(savedAnswers).length > 0) {
      saveQuizBackup({
        quizId: activeQuizId,
        quizTitle: activeTitle,
        questionIds: questions.map(q => q.id),
        savedAnswers,
        currentIdx: idx,
        savedAt: 0,
      });
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      goToQuestion(currentIdx + 1, 'forward');
    } else {
      finishQuiz();
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) goToQuestion(currentIdx - 1, 'back');
  };

  const handleRestart = useCallback(() => {
    setCurrentIdx(0);
    setNavDirection('forward');
    resetLiveInputs();
    restartSession();
  }, [restartSession, resetLiveInputs]);

  const handleAdaptiveQuizReady = useCallback((newQuizId: string, newTitle: string) => {
    if (activeQuizId) clearQuizBackup(activeQuizId);
    setCurrentIdx(0);
    setNavDirection('forward');
    resetLiveInputs();
    setActiveQuizId(newQuizId);
    setActiveTitle(newTitle);
  }, [activeQuizId, resetLiveInputs]);

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

  const handleReview = useCallback(() => {
    setCurrentIdx(0);
    setNavDirection('forward');
    resetLiveInputs(savedAnswers[0]);
    reviewSession();
  }, [savedAnswers, reviewSession, resetLiveInputs]);

  // ── PHASE: loading ─────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="animate-spin text-teal-500" size={32} />
        <p className="text-sm text-gray-500">Preparando quiz...</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lightbulb size={40} className="text-teal-300" />
          </div>
          <h2 className="text-xl text-gray-900 mb-3" style={{ fontWeight: 700 }}>Quiz no disponible</h2>
          <p className="text-gray-500 mb-6 text-sm">{errorMsg}</p>
          <button
            onClick={onBack}
            className="text-teal-600 hover:underline text-sm"
            style={{ fontWeight: 600 }}
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'recovery' && pendingBackup) {
    return (
      <QuizRecoveryPrompt
        backup={pendingBackup}
        onAccept={handleAcceptRecovery}
        onDismiss={handleDismissRecovery}
        onBack={onBack}
      />
    );
  }

  if (phase === 'results') {
    return (
      <QuizErrorBoundary label="Resultados de Quiz">
        <QuizResults
          questions={questions}
          savedAnswers={savedAnswers}
          sessionStartTime={sessionStartTime}
          quizTitle={activeTitle}
          keywordMap={keywordMap}
          correctCount={correctCount}
          wrongCount={wrongCount}
          answeredCount={answeredCount}
          onRestart={handleRestart}
          onBack={onBack}
          onReview={handleReview}
          onAdaptiveQuizReady={handleAdaptiveQuizReady}
        />
      </QuizErrorBoundary>
    );
  }

  // ── PHASE: session ─────────────────────────────────────

  const currentQ = questions[currentIdx];
  if (!currentQ) return null;

  const saved = savedAnswers[currentIdx];
  const isReviewing = saved?.answered === true;
  const showResult = isReviewing;

  const selectedAnswer = isReviewing ? saved.selectedOption : liveSelectedOption;
  const textAnswer = isReviewing ? saved.answer : liveTextInput;
  const tfAnswer = isReviewing ? saved.answer : liveTFAnswer;
  const isCorrectResult = isReviewing ? saved.correct : false;

  const diffKey = normalizeDifficulty(currentQ.difficulty);

  const slideVariants = SLIDE_VARIANTS[navDirection];

  const canSubmit = !submitting && (
    currentQ.question_type === 'mcq' ? liveSelectedOption !== null :
    currentQ.question_type === 'true_false' ? !!liveTFAnswer :
    !!liveTextInput.trim()
  );

  const handleSubmit =
    currentQ.question_type === 'mcq' ? handleSubmitMC :
    currentQ.question_type === 'true_false' ? handleSubmitTF :
    handleSubmitOpen;

  return (
    <QuizErrorBoundary label="Sesion de Quiz">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col h-full bg-zinc-50 overflow-hidden"
      >
        {backendWarning && (
          <div className={`mx-4 mt-2 ${BANNER_WARNING} text-[11px]`}>
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            {backendWarning}
          </div>
        )}

        <QuizTopBar
          quizTitle={activeTitle}
          diffKey={diffKey}
          questionStartTime={questionStartTime}
          isReviewing={isReviewing}
          onBack={onBack}
          answeredCount={answeredCount}
          totalQuestions={questions.length}
          sessionStartTime={sessionStartTime}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar-light">
          <div className="max-w-3xl mx-auto w-full px-6 md:px-10 py-6 md:py-8">
            <QuizProgressBar
              totalQuestions={questions.length}
              savedAnswers={savedAnswers}
              currentIdx={currentIdx}
              correctCount={correctCount}
              wrongCount={wrongCount}
              onGoToQuestion={goToQuestion}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={currentIdx}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25 }}
              >
                <QuestionRenderer
                  question={currentQ}
                  questionIndex={currentIdx}
                  isReviewing={isReviewing}
                  showResult={showResult}
                  isCorrectResult={isCorrectResult}
                  selectedAnswer={selectedAnswer}
                  onSelectOption={setLiveSelectedOption}
                  tfAnswer={tfAnswer}
                  onSelectTF={setLiveTFAnswer}
                  textAnswer={textAnswer}
                  onChangeText={setLiveTextInput}
                  onSubmitText={handleSubmitOpen}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <QuizBottomBar
          currentIdx={currentIdx}
          questionsLength={questions.length}
          answeredCount={answeredCount}
          closingSession={closingSession}
          isReviewing={isReviewing}
          submitting={submitting}
          canSubmit={canSubmit}
          onPrev={handlePrev}
          onNext={handleNext}
          onSubmit={handleSubmit}
        />
      </motion.div>
    </QuizErrorBoundary>
  );
}
