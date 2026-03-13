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
// P1-S03: localStorage recovery UI (recovery phase)
// R2 refactor: navigation & input state extracted to useQuizNavigation hook
// ============================================================

import { useState } from 'react';
import { normalizeDifficulty } from '@/app/services/quizConstants';
import { QuizResults } from '@/app/components/student/QuizResults';
import type { QuizQuestion } from '@/app/services/quizApi';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Loader2, AlertTriangle } from 'lucide-react';
import { BANNER_WARNING } from '@/app/services/quizDesignTokens';

// ── Sub-components (Phase 3 extractions) ─────────────────
import { QuestionRenderer } from '@/app/components/student/QuestionRenderer';
import { QuizProgressBar } from '@/app/components/student/QuizProgressBar';
import { QuizTopBar } from '@/app/components/student/QuizTopBar';
import { QuizBottomBar } from '@/app/components/student/QuizBottomBar';

// ── Hooks (Phase 6b + R2) ───────────────────────────────
import { useQuizSession } from '@/app/components/student/useQuizSession';
import { useQuizNavigation } from '@/app/components/student/useQuizNavigation';

// ── Recovery prompt (P1-S03) ───────────────────────────
import { QuizRecoveryPrompt } from '@/app/components/student/QuizRecoveryPrompt';

// ── Error boundary (Phase 7b) ──────────────────────────
import { QuizErrorBoundary } from '@/app/components/student/QuizErrorBoundary';

// Re-export for backward compatibility (external consumers may import from here)
export type { SavedAnswer } from '@/app/components/student/quiz-types';

// ── Animation variants (stable reference) ────────────────────
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

// ── Main Component ─────────────────────────────────────

export function QuizTaker({ quizId, preloadedQuestions, quizTitle, summaryId, onBack, onComplete }: QuizTakerProps) {
  // ── Adaptive quiz: allow in-place quiz swap ───────────
  const [activeQuizId, setActiveQuizId] = useState(quizId);
  const [activeTitle, setActiveTitle] = useState(quizTitle);

  // ── Session lifecycle (hook) ─────────────────────────
  const session = useQuizSession(activeQuizId, summaryId, preloadedQuestions, activeTitle);

  // ── Navigation & input (R2 extraction) ─────────────────
  const nav = useQuizNavigation(session, activeQuizId, activeTitle, setActiveQuizId, setActiveTitle);

  const {
    phase, questions, sessionStartTime, errorMsg, backendWarning,
    submitting, closingSession, savedAnswers, keywordMap,
    correctCount, wrongCount, answeredCount,
    pendingBackup,
  } = session;

  // ── PHASE: loading ─────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="animate-spin text-teal-500" size={32} />
        <p className="text-sm text-gray-500">Preparando quiz...</p>
      </div>
    );
  }

  // ── PHASE: error ──────────────────────────────────────

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

  // ── PHASE: recovery (P1-S03) ──────────────────────────

  if (phase === 'recovery' && pendingBackup) {
    return (
      <QuizRecoveryPrompt
        backup={pendingBackup}
        onAccept={nav.handleAcceptRecovery}
        onDismiss={nav.handleDismissRecovery}
        onBack={onBack}
      />
    );
  }

  // ── PHASE: results ────────────────────────────────────

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
          onRestart={nav.handleRestart}
          onBack={onBack}
          onReview={nav.handleReview}
          onAdaptiveQuizReady={nav.handleAdaptiveQuizReady}
        />
      </QuizErrorBoundary>
    );
  }

  // ── PHASE: session ─────────────────────────────────────

  const { currentQuestion, isReviewing, currentIdx, navDirection } = nav;
  if (!currentQuestion) return null;

  const saved = savedAnswers[currentIdx];
  const showResult = isReviewing;
  const selectedAnswer = isReviewing ? saved?.selectedOption ?? null : nav.liveSelectedOption;
  const textAnswer = isReviewing ? saved?.answer ?? '' : nav.liveTextInput;
  const tfAnswer = isReviewing ? saved?.answer ?? null : nav.liveTFAnswer;
  const isCorrectResult = isReviewing ? (saved?.correct ?? false) : false;
  const diffKey = normalizeDifficulty(currentQuestion.difficulty);
  const slideVariants = SLIDE_VARIANTS[navDirection];

  return (
    <QuizErrorBoundary label="Sesion de Quiz">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col h-full bg-zinc-50 overflow-hidden"
      >
        {/* Backend warning */}
        {backendWarning && (
          <div className={`mx-4 mt-2 ${BANNER_WARNING} text-[11px]`}>
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            {backendWarning}
          </div>
        )}

        {/* ── Top Bar ── */}
        <QuizTopBar
          quizTitle={activeTitle}
          diffKey={diffKey}
          questionStartTime={nav.questionStartTime}
          isReviewing={isReviewing}
          onBack={onBack}
          answeredCount={answeredCount}
          totalQuestions={questions.length}
          sessionStartTime={sessionStartTime}
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
              onGoToQuestion={nav.goToQuestion}
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
                  question={currentQuestion}
                  questionIndex={currentIdx}
                  isReviewing={isReviewing}
                  showResult={showResult}
                  isCorrectResult={isCorrectResult}
                  selectedAnswer={selectedAnswer}
                  onSelectOption={nav.setLiveSelectedOption}
                  tfAnswer={tfAnswer}
                  onSelectTF={nav.setLiveTFAnswer}
                  textAnswer={textAnswer}
                  onChangeText={nav.setLiveTextInput}
                  onSubmitText={nav.handleSubmit}
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
          canSubmit={nav.canSubmit}
          onPrev={nav.handlePrev}
          onNext={nav.handleNext}
          onSubmit={nav.handleSubmit}
        />
      </motion.div>
    </QuizErrorBoundary>
  );
}
