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
// P2-S02: DRY live input reset helper
// P7: Countdown timer
// Q-UX2: Timer configurable per-question via quiz entity
// G4: Gamification bridge — refresh XP + check badges on quiz completion
// FIX: G5 celebrations REMOVED here — now handled exclusively by
//      QuizResults via useQuizGamificationFeedback (Q-UX1 premium layer)
//      to avoid duplicate toasts/modals.
// TD-7: onComplete prop now wired to fire on results phase.
// PALETTE: Axon Medical Academy brand colors applied.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeDifficulty } from '@/app/services/quizConstants';
import { QuizResults } from '@/app/components/student/QuizResults';
import type { QuizQuestion } from '@/app/services/quizApi';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Loader2, AlertTriangle, RotateCw } from 'lucide-react';
import { BANNER_WARNING } from '@/app/services/quizDesignTokens';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';

// ── Sub-components (Phase 3 extractions) ─────────────────
import { QuestionRenderer } from '@/app/components/student/QuestionRenderer';
import { QuizProgressBar } from '@/app/components/student/QuizProgressBar';
import { QuizTopBar } from '@/app/components/student/QuizTopBar';
import { QuizBottomBar } from '@/app/components/student/QuizBottomBar';

// ── Session hook (Phase 6b extraction) ───────────────────
import { useQuizSession } from '@/app/components/student/useQuizSession';

// ── Backup (P1-S03) ─────────────────────────────────────
import { clearQuizBackup, saveQuizBackup } from '@/app/components/student/useQuizBackup';

// ── Recovery prompt (P1-S03) ─────────────────────────────
import { QuizRecoveryPrompt } from '@/app/components/student/QuizRecoveryPrompt';

// ── Error boundary (Phase 7b) ────────────────────────────
import { QuizErrorBoundary } from '@/app/components/student/QuizErrorBoundary';

// ── Gamification bridge (G4) ─────────────────────────────
// NOTE: gamification refresh + badge check are handled EXCLUSIVELY
// by useQuizGamificationFeedback inside QuizResults (Q-UX1).
// useGamification import removed — no longer called in QuizTaker.

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
  /** Q-UX2: Per-question time limit in seconds (0 or undefined = no limit) */
  timeLimitSeconds?: number;
}

// ── Main Component ───────────────────────────────────────

export function QuizTaker({ quizId, preloadedQuestions, quizTitle, summaryId, onBack, onComplete, timeLimitSeconds }: QuizTakerProps) {
  // ── Adaptive quiz: allow in-place quiz swap ─────────────
  const [activeQuizId, setActiveQuizId] = useState(quizId);
  const [activeTitle, setActiveTitle] = useState(quizTitle);

  // ── G4: Guard for onComplete notification (fire once) ───
  const gamificationRefreshedRef = useRef(false);

  // ── Stable ref for onComplete to avoid useEffect dep churn ──
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // ── Session lifecycle (hook) ─────────────────────────────
  const {
    phase, questions, sessionStartTime, errorMsg, backendWarning,
    submitting, closingSession, savedAnswers, keywordMap,
    correctCount, wrongCount, answeredCount,
    pendingBackup, restoreFromBackup, dismissBackup,
    submitAnswer, finishQuiz, restartSession, reviewSession,
  } = useQuizSession(activeQuizId, summaryId, preloadedQuestions, activeTitle);

  // ── G4: Notify parent on quiz completion ─────────────────
  // NOTE: gamification refresh + badge check are handled EXCLUSIVELY
  // by useQuizGamificationFeedback inside QuizResults (Q-UX1).
  // That hook waits 800ms for backend afterWrite hooks to complete
  // before fetching, ensuring accurate XP data. Calling refresh()
  // here would be redundant (3 wasted API calls with stale data).
  // TD-7: onComplete callback still fires here immediately.
  useEffect(() => {
    if (phase !== 'results' || gamificationRefreshedRef.current) return;
    gamificationRefreshedRef.current = true;

    // TD-7: Notify parent that quiz reached results phase
    onCompleteRef.current?.();
  }, [phase]);

  // Reset gamification refresh flag when quiz restarts
  useEffect(() => {
    if (phase === 'session' || phase === 'loading') {
      gamificationRefreshedRef.current = false;
    }
  }, [phase]);

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

  // ── Live input reset helper (DRY — P2-S02) ─────────────

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

  // ── Navigation (P-PERF: wrapped in useCallback to preserve React.memo) ──

  const goToQuestion = useCallback((idx: number, dir: 'forward' | 'back') => {
    setNavDirection(dir);
    setCurrentIdx(idx);
    resetLiveInputs(savedAnswers[idx]);

    // P1-S03: Persist navigation position to backup (only if answers exist)
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
  }, [savedAnswers, activeQuizId, activeTitle, questions, resetLiveInputs]);

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

  // ── Adaptive quiz ready (swap to new quiz in-place) ────

  const handleAdaptiveQuizReady = useCallback((newQuizId: string, newTitle: string) => {
    // P1-S03: Clear old quiz backup before swapping
    if (activeQuizId) clearQuizBackup(activeQuizId);
    setCurrentIdx(0);
    setNavDirection('forward');
    resetLiveInputs();
    setActiveQuizId(newQuizId);
    setActiveTitle(newTitle);
    // useQuizSession's useEffect will auto-reset savedAnswers + load new questions
  }, [activeQuizId, resetLiveInputs]);

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

  // ── Review (go back to session from results to navigate answers) ──

  const handleReview = useCallback(() => {
    setCurrentIdx(0);
    setNavDirection('forward');
    resetLiveInputs(savedAnswers[0]);
    reviewSession();
  }, [savedAnswers, reviewSession, resetLiveInputs]);

  // ── Q-UX2: Countdown timeout handler ────────────────────
  // When the countdown reaches zero, auto-submit empty answer and advance
  const handleCountdownTimeout = useCallback(() => {
    const currentQ = questions[currentIdx];
    if (!currentQ) return;
    const saved = savedAnswers[currentIdx];
    if (saved?.answered) return; // Already answered — skip auto-submit

    // Auto-advance helper — must run regardless of submit outcome.
    // The student's time has already expired; a network/API failure on the
    // empty auto-submit must NOT trap them on a 0-second question (issue #757).
    const advance = () => {
      if (currentIdx < questions.length - 1) {
        setNavDirection('forward');
        setCurrentIdx(currentIdx + 1);
        resetLiveInputs();
      } else {
        finishQuiz();
      }
    };

    // Auto-submit with empty answer (marks as incorrect)
    const timeTaken = Date.now() - questionStartTime;
    submitAnswer(currentQ, '', null, timeTaken, currentIdx)
      .then(advance)
      .catch((err) => {
        // Time already expired; advance anyway to keep the quiz session alive.
        // Losing the empty-answer record is preferable to blocking the student.
        console.error('[QuizTaker] auto-submit on timeout failed; advancing anyway', err);
        advance();
      });
  }, [questions, currentIdx, savedAnswers, questionStartTime, submitAnswer, finishQuiz, resetLiveInputs]);

  // ── PHASE: loading ─────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="animate-spin text-axon-accent" size={32} />
        <p className="text-sm text-gray-500">Preparando quiz...</p>
      </div>
    );
  }

  // ── PHASE: error ────────────────────────────────────────

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-axon-accent-10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lightbulb size={40} className="text-axon-accent" />
          </div>
          <h2 className="text-xl text-gray-900 mb-3" style={{ fontWeight: 700 }}>Quiz no disponible</h2>
          <p className="text-gray-500 mb-6 text-sm">{errorMsg}</p>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => restartSession()}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-teal-500 text-white text-sm hover:bg-teal-600 transition-colors"
              style={{ fontWeight: 600 }}
            >
              <RotateCw size={14} />
              Reintentar
            </button>
            <button
              onClick={onBack}
              className="text-axon-accent hover:underline text-sm"
              style={{ fontWeight: 600 }}
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PHASE: recovery (P1-S03) ────────────────────────────

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

  // ── PHASE: results ──────────────────────────────────────
  // NOTE: Gamification celebrations (LevelUpCelebration, BadgeEarnedToast)
  // are rendered EXCLUSIVELY inside QuizResults via useQuizGamificationFeedback
  // (Q-UX1 premium layer). Do NOT add them here to avoid duplicates.

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
        className="flex flex-col h-full bg-axon-page overflow-hidden"
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
          questionStartTime={questionStartTime}
          isReviewing={isReviewing}
          onBack={onBack}
          answeredCount={answeredCount}
          totalQuestions={questions.length}
          sessionStartTime={sessionStartTime}
          countdownSec={timeLimitSeconds}
          countdownResetKey={currentIdx}
          onCountdownTimeout={handleCountdownTimeout}
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
                <ErrorBoundary
                  variant="minimal"
                  retry={() => {}}
                  fallback={(error, reset) => (
                    <div className="py-8 text-center">
                      <p className="text-red-500 text-sm mb-3">Esta pregunta no se pudo cargar</p>
                      <div className="flex items-center gap-3 justify-center">
                        <button
                          onClick={reset}
                          className="text-sm text-teal-600 hover:underline"
                          style={{ fontWeight: 600 }}
                        >
                          Reintentar
                        </button>
                        <button
                          onClick={handleNext}
                          className="text-sm text-zinc-500 hover:underline"
                        >
                          Saltar pregunta
                        </button>
                      </div>
                    </div>
                  )}
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
                </ErrorBoundary>
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
