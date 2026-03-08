// ============================================================
// Axon — Student: QuizTaker (EV-3 Prompt B)
//
// Takes a specific quiz by quiz_id.
// Flow:
//   1. POST /study-sessions { session_type: "quiz" } → session_id
//   2. GET /quiz-questions?quiz_id=xxx → questions
//   3. Show question-by-question with timer
//   4. On confirm:
//      a. POST /quiz-attempts { quiz_question_id, answer, is_correct, session_id, time_taken_ms }
//      b. POST /reviews { session_id, item_id, instrument_type: "quiz", grade: 0|1 }
//   5. Immediate feedback (correct/incorrect + explanation)
//   6. When done → QuizResults
//
// Design: teal accent (matching existing QuizView), motion animations
//
// Phase 3 refactor: renderers extracted to sub-components
// Phase 6b refactor: session lifecycle extracted to useQuizSession hook
// Phase 7b refactor: error boundary added
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { normalizeDifficulty } from '@/app/services/quizConstants';
import { QuizResults } from '@/app/components/student/QuizResults';
import type { QuizQuestion } from '@/app/services/quizApi';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Loader2, AlertTriangle } from 'lucide-react';

// ── Sub-components (Phase 3 extractions) ─────────────────
import { QuestionRenderer } from '@/app/components/student/QuestionRenderer';
import { QuizProgressBar } from '@/app/components/student/QuizProgressBar';
import { QuizTopBar } from '@/app/components/student/QuizTopBar';
import { QuizBottomBar } from '@/app/components/student/QuizBottomBar';

// ── Session hook (Phase 6b extraction) ───────────────────
import { useQuizSession } from '@/app/components/student/useQuizSession';

// ── Error boundary (Phase 7b) ────────────────────────────
import { QuizErrorBoundary } from '@/app/components/student/QuizErrorBoundary';

// Re-export for backward compatibility (external consumers may import from here)
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

// ── Props ───────────────────────────────────────────────

interface QuizTakerProps {
  /** Standalone mode: load questions by quizId */
  quizId?: string;
  /** Preloaded mode: pass questions directly (from QuizSelection) */
  preloadedQuestions?: QuizQuestion[];
  quizTitle: string;
  summaryId?: string;
  onBack: () => void;
  onComplete?: () => void;
}

// ── Main Component ───────────────────────────────────────

export function QuizTaker({ quizId, preloadedQuestions, quizTitle, summaryId, onBack, onComplete }: QuizTakerProps) {
  // ── Adaptive quiz: allow in-place quiz swap ─────────────
  const [activeQuizId, setActiveQuizId] = useState(quizId);
  const [activeTitle, setActiveTitle] = useState(quizTitle);

  // ── Session lifecycle (hook) ─────────────────────────────
  const {
    phase, questions, sessionStartTime, errorMsg, backendWarning,
    submitting, closingSession, savedAnswers, keywordMap,
    correctCount, wrongCount, answeredCount,
    submitAnswer, finishQuiz, restartSession, reviewSession,
  } = useQuizSession(activeQuizId, summaryId, preloadedQuestions);

  // ── Local UI state (navigation + live input) ────────────
  const [currentIdx, setCurrentIdx] = useState(0);
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');

  const [liveSelectedOption, setLiveSelectedOption] = useState<string | null>(null);
  const [liveTextInput, setLiveTextInput] = useState('');
  const [liveTFAnswer, setLiveTFAnswer] = useState<string | null>(null);

  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // Reset timer on question change
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIdx]);

  // ── Submit wrappers (thin — delegate to hook) ──────────

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

  // ── Navigation ──────────────────────────────────────────

  const goToQuestion = (idx: number, dir: 'forward' | 'back') => {
    setNavDirection(dir);
    setCurrentIdx(idx);
    const s = savedAnswers[idx];
    if (s?.answered) {
      setLiveSelectedOption(s.selectedOption);
      setLiveTextInput(s.answer);
      setLiveTFAnswer(s.answer);
    } else {
      setLiveSelectedOption(null);
      setLiveTextInput('');
      setLiveTFAnswer(null);
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

  // ── Restart (hook resets session + local resets UI) ─────

  const handleRestart = useCallback(() => {
    setCurrentIdx(0);
    setNavDirection('forward');
    setLiveSelectedOption(null);
    setLiveTextInput('');
    setLiveTFAnswer(null);
    restartSession();
  }, [restartSession]);

  // ── Adaptive quiz ready (swap to new quiz in-place) ────

  const handleAdaptiveQuizReady = useCallback((newQuizId: string, newTitle: string) => {
    setCurrentIdx(0);
    setNavDirection('forward');
    setLiveSelectedOption(null);
    setLiveTextInput('');
    setLiveTFAnswer(null);
    setActiveQuizId(newQuizId);
    setActiveTitle(newTitle);
    // useQuizSession's useEffect will auto-reset savedAnswers + load new questions
  }, []);

  // ── Review (go back to session from results to navigate answers) ──

  const handleReview = useCallback(() => {
    setCurrentIdx(0);
    setNavDirection('forward');
    // Restore first question's saved state
    const s = savedAnswers[0];
    if (s?.answered) {
      setLiveSelectedOption(s.selectedOption);
      setLiveTextInput(s.answer);
      setLiveTFAnswer(s.answer);
    } else {
      setLiveSelectedOption(null);
      setLiveTextInput('');
      setLiveTFAnswer(null);
    }
    reviewSession();
  }, [savedAnswers, reviewSession]);

  // ── PHASE: loading ─────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="animate-spin text-teal-500" size={32} />
        <p className="text-sm text-gray-500">Preparando quiz...</p>
      </div>
    );
  }

  // ── PHASE: error ────────────────────────────────────────

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

  // ── PHASE: results ──────────────────────────────────────

  if (phase === 'results') {
    return (
      <QuizErrorBoundary label="Resultados de Quiz">
        <QuizResults
          questions={questions}
          savedAnswers={savedAnswers}
          sessionStartTime={sessionStartTime}
          quizTitle={activeTitle}
          keywordMap={keywordMap}
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

  // Compute canSubmit for bottom bar (decouples it from question type)
  const canSubmit = !submitting && (
    currentQ.question_type === 'mcq' ? liveSelectedOption !== null :
    currentQ.question_type === 'true_false' ? !!liveTFAnswer :
    !!liveTextInput.trim()
  );

  // Compute unified submit handler for bottom bar
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
        {/* Backend warning */}
        {backendWarning && (
          <div className="mx-4 mt-2 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px]">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            {backendWarning}
          </div>
        )}

        {/* ── Top Bar ── */}
        <QuizTopBar
          quizTitle={activeTitle}
          diffKey={diffKey}
          questionStartTime={questionStartTime}
          isReviewing={isReviewing}
          onBack={onBack}
        />

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light">
          <div className="max-w-3xl mx-auto w-full px-6 md:px-10 py-6 md:py-8">

            {/* Progress Bar */}
            <QuizProgressBar
              totalQuestions={questions.length}
              savedAnswers={savedAnswers}
              currentIdx={currentIdx}
              correctCount={correctCount}
              wrongCount={wrongCount}
              onGoToQuestion={goToQuestion}
            />

            {/* Question */}
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

        {/* ── Bottom Bar ── */}
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