// ============================================================
// Axon — Student Quiz: Session Lifecycle Hook
//
// Extracted from QuizTaker.tsx (Phase 6b).
// Manages: session init, answer submission (+ BKT fire-and-forget),
//          session close, restart, localStorage backup & recovery.
//
// savedAnswers lives HERE to avoid stale-closure issues in
// finishQuiz / submitAnswer.
//
// P1-S03: Added localStorage backup integration
// P3-S01: Init helpers extracted to quiz-session-helpers.ts
//
// The component owns: navigation, live-input state, rendering.
// ============================================================

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion } from '@/app/services/quizApi';
import type { SavedAnswer } from '@/app/components/student/quiz-types';
import { logger } from '@/app/lib/logger';
import { getErrorMsg } from '@/app/lib/error-utils';
import { checkAnswer } from '@/app/lib/quiz-utils';
import {
  saveQuizBackup, clearQuizBackup, cleanExpiredBackups,
} from '@/app/components/student/useQuizBackup';
import type { QuizBackupData } from '@/app/components/student/useQuizBackup';

// P3-S01: Pure helper functions (no React state)
import {
  loadAndNormalizeQuestions,
  checkAndProcessBackup,
  loadKeywordNames,
} from '@/app/components/student/quiz-session-helpers';
import { useQuizBkt } from '@/app/components/student/useQuizBkt';
import { useStudyPlanBridge } from '@/app/hooks/useStudyPlanBridge';

// ── Return type ──────────────────────────────────────────

export type QuizPhase = 'loading' | 'recovery' | 'session' | 'results' | 'error';

export interface UseQuizSessionReturn {
  // State
  phase: QuizPhase;
  questions: QuizQuestion[];
  sessionStartTime: number;
  errorMsg: string;
  backendWarning: string | null;
  submitting: boolean;
  closingSession: boolean;
  savedAnswers: Record<number, SavedAnswer>;

  // Keyword labels (loaded non-blocking for QuizResults display)
  keywordMap: Record<string, string>;

  // Computed
  correctCount: number;
  wrongCount: number;
  answeredCount: number;

  // Recovery (P1-S03)
  pendingBackup: QuizBackupData | null;
  restoreFromBackup: () => void;
  dismissBackup: () => void;

  // Actions
  submitAnswer: (
    question: QuizQuestion,
    answer: string,
    optionText: string | null,
    timeTakenMs: number,
    questionIdx: number,
  ) => Promise<void>;
  finishQuiz: () => Promise<void>;
  restartSession: () => void;
  reviewSession: () => void;
}

// ── Hook ─────────────────────────────────────────────────

export function useQuizSession(
  quizId: string | undefined,
  summaryId?: string,
  preloadedQuestions?: QuizQuestion[],
  quizTitle?: string,
): UseQuizSessionReturn {
  const [phase, setPhase] = useState<QuizPhase>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // E31 FIX: sessionStartTime must reset on adaptive quiz swap
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [errorMsg, setErrorMsg] = useState('');
  const [backendWarning, setBackendWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<Record<number, SavedAnswer>>({});

  // Keyword labels for QuizResults display (loaded non-blocking)
  const [keywordMap, setKeywordMap] = useState<Record<string, string>>({});

  // Recovery state (P1-S03)
  const [pendingBackup, setPendingBackup] = useState<QuizBackupData | null>(null);

  // BKT tracking (M-5: extracted to hook)
  const { handleBktUpdate, resetBkt } = useQuizBkt();
  const { markSessionComplete } = useStudyPlanBridge();

  // Immediate guard against double-submit (React state is async)
  const submittingRef = useRef(false);

  // Track preloaded questions ref to avoid re-trigger on same array
  const preloadedUsedRef = useRef(false);

  // Prevent double session-close
  const sessionClosedRef = useRef(false);

  // Ref-mirror for savedAnswers — avoids stale closures in submitAnswer (P1-S03)
  const savedAnswersRef = useRef<Record<number, SavedAnswer>>({});

  // ── Initialize: create session + load questions ─────────

  useEffect(() => {
    let cancelled = false;

    // Reset state when quizId changes (e.g. adaptive quiz navigation)
    setSavedAnswers({});
    savedAnswersRef.current = {};
    resetBkt();
    sessionClosedRef.current = false;
    setBackendWarning(null);
    setPendingBackup(null);
    setPhase('loading');
    // E31 FIX: reset session timer on quiz swap
    setSessionStartTime(Date.now());

    // Lazy cleanup of any expired localStorage backups (P1-S03)
    cleanExpiredBackups();

    (async () => {
      // FIX #807: track created session id so we can close it on cancel/error.
      // Promise.all rejection or cancellation could orphan a backend session
      // if loadAndNormalizeQuestions fails AFTER createStudySession resolves.
      let createdSessionId: string | null = null;
      const closeOrphanedSession = (id: string) => {
        quizApi
          .closeStudySession(id, {
            completed_at: new Date().toISOString(),
            total_reviews: 0,
            correct_reviews: 0,
          })
          .catch((closeErr) =>
            logger.error('[QuizTaker] Orphan session close error:', closeErr),
          );
      };

      try {
        // E16 FIX: Run session creation and question loading in PARALLEL
        // These are independent — questions don't need sessionId to load
        const sessionPromise = quizApi.createStudySession({ session_type: 'quiz' });
        const questionsPromise = loadAndNormalizeQuestions(
          quizId, summaryId, preloadedQuestions, preloadedUsedRef.current,
        );
        // Capture session id as soon as it resolves so a later questions
        // failure doesn't orphan the backend session.
        sessionPromise.then((s) => { createdSessionId = s.id; }).catch(() => {});
        const [session, result] = await Promise.all([sessionPromise, questionsPromise]);
        if (cancelled) {
          // FIX #807: close abandoned session (effect cleanup ran before resolve)
          closeOrphanedSession(session.id);
          return;
        }
        setSessionId(session.id);
        sessionClosedRef.current = false;
        preloadedUsedRef.current = result.usedPreloaded;
        if (result.warning) setBackendWarning(result.warning);

        let items = result.items;
        if (items.length === 0) {
          setErrorMsg('Este quiz no tiene preguntas activas.');
          setPhase('error');
          return;
        }

        // 3. Backup recovery check (P3-S01: extracted)
        let isRecovery = false;
        if (quizId) {
          const recovery = checkAndProcessBackup(quizId, items);
          if (recovery) {
            items = recovery.reorderedItems;
            setQuestions(items);
            setPendingBackup(recovery.backup);
            setPhase('recovery');
            isRecovery = true;
          }
        }

        if (!isRecovery) {
          setQuestions(items);
          setPhase('session');
        }

        // 4. Non-blocking: load keyword names (P3-S01: extracted)
        const effectiveSummaryId = summaryId || items[0]?.summary_id;
        if (effectiveSummaryId) {
          const kwMap = await loadKeywordNames(effectiveSummaryId);
          if (!cancelled) setKeywordMap(kwMap);
        }
      } catch (err: unknown) {
        // FIX #807: if session was already created, close it so we don't
        // leak a dangling open session on the backend.
        if (createdSessionId) {
          closeOrphanedSession(createdSessionId);
        }
        if (!cancelled) {
          setErrorMsg(getErrorMsg(err));
          setPhase('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [quizId, summaryId, preloadedQuestions]);

  // ── Computed (single-pass memoized) ─────────────────────

  const { correctCount, wrongCount, answeredCount } = useMemo(() => {
    let correct = 0,
      wrong = 0,
      answered = 0;
    for (const a of Object.values(savedAnswers)) {
      if (a.answered) {
        answered++;
        if (a.correct) correct++;
        else wrong++;
      }
    }
    return { correctCount: correct, wrongCount: wrong, answeredCount: answered };
  }, [savedAnswers]);

  // ── Submit answer ───────────────────────────────────────

  const submitAnswer = useCallback(
    async (
      question: QuizQuestion,
      answer: string,
      optionText: string | null,
      timeTakenMs: number,
      questionIdx: number,
    ) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);

      const correct = checkAnswer(question, answer);

      // Compute new savedAnswers from ref (avoids stale closure)
      const newAnswer: SavedAnswer = {
        answer,
        selectedOption: optionText,
        correct,
        answered: true,
        timeTakenMs,
      };
      const updatedAnswers = { ...savedAnswersRef.current, [questionIdx]: newAnswer };
      savedAnswersRef.current = updatedAnswers;
      setSavedAnswers(updatedAnswers);

      // P1-S03: Persist backup to localStorage (never throws)
      if (quizId) {
        saveQuizBackup({
          quizId,
          quizTitle: quizTitle || '',
          questionIds: questions.map(q => q.id),
          savedAnswers: updatedAnswers,
          currentIdx: questionIdx,
          savedAt: 0, // overwritten by saveQuizBackup
        });
      }

      // Fire-and-forget: attempt + review + BKT
      const attemptPromise = quizApi
        .createQuizAttempt({
          quiz_question_id: question.id,
          answer,
          is_correct: correct,
          session_id: sessionId || undefined,
          time_taken_ms: timeTakenMs,
        })
        .catch((err) => logger.error('[QuizTaker] Attempt error:', err));

      const reviewPromise = sessionId
        ? quizApi.createReview({
            session_id: sessionId,
            item_id: question.id,
            instrument_type: 'quiz',
            grade: correct ? 1 : 0,
          }).catch((err) => logger.error('[QuizTaker] Review error:', err))
        : Promise.resolve();

      const bktPromise = handleBktUpdate(question, correct);

      await Promise.allSettled([attemptPromise, reviewPromise, bktPromise]);
      submittingRef.current = false;
      setSubmitting(false);
    },
    [sessionId, quizId, quizTitle, questions],
  );

  // ── Finish quiz (close study session) ───────────────────

  const finishQuiz = useCallback(async () => {
    setClosingSession(true);

    // P1-S03: Clear backup — quiz completed successfully
    if (quizId) clearQuizBackup(quizId);

    // P-PERF: Use ref to avoid savedAnswers state in dependency array
    const currentAnswers = savedAnswersRef.current;
    const totalCorrect = Object.values(currentAnswers).filter(
      (a) => a.answered && a.correct,
    ).length;
    const totalReviews = Object.values(currentAnswers).filter(
      (a) => a.answered,
    ).length;

    if (sessionId && !sessionClosedRef.current) {
      sessionClosedRef.current = true;
      try {
        await quizApi.closeStudySession(sessionId, {
          completed_at: new Date().toISOString(),
          total_reviews: totalReviews,
          correct_reviews: totalCorrect,
        });
      } catch (err) {
        logger.error('[QuizTaker] Session close error:', err);
      }
    }

    setClosingSession(false);
    setPhase('results');
    markSessionComplete('quiz');
  }, [sessionId, quizId, markSessionComplete]);

  // ── Restart session ─────────────────────────────────────

  const restartSession = useCallback(() => {
    setSavedAnswers({});
    savedAnswersRef.current = {};
    resetBkt();
    sessionClosedRef.current = false;
    preloadedUsedRef.current = false;
    setBackendWarning(null);
    setPhase('session');

    // P1-S03: Clear backup — user chose fresh start
    if (quizId) clearQuizBackup(quizId);

    quizApi
      .createStudySession({ session_type: 'quiz' })
      .then((s) => setSessionId(s.id))
      .catch((err) => {
        // FIX H4-1: Show warning instead of silent fail
        logger.error('[QuizTaker] New session error:', err);
        setBackendWarning(
          'No se pudo crear una nueva sesion de estudio. Tus respuestas se registraran sin sesion asociada.',
        );
      });
  }, [quizId]);

  // ── Recovery actions (P1-S03) ───────────────────────────

  const restoreFromBackup = useCallback(() => {
    if (!pendingBackup) return;
    savedAnswersRef.current = pendingBackup.savedAnswers;
    setSavedAnswers(pendingBackup.savedAnswers);
    setPendingBackup(null);
    setPhase('session');
    logger.debug('[QuizSession] recovery accepted', pendingBackup.quizId,
      Object.values(pendingBackup.savedAnswers).filter(a => a.answered).length, 'answers restored');
  }, [pendingBackup]);

  const dismissBackup = useCallback(() => {
    if (quizId) clearQuizBackup(quizId);
    setPendingBackup(null);
    setPhase('session');
    logger.debug('[QuizSession] recovery dismissed, starting fresh');
  }, [quizId]);

  // ── Review session ──────────────────────────────────────

  const reviewSession = useCallback(() => {
    setPhase('session');
  }, []);

  // ── Return ──────────────────────────────────────────────

  return {
    phase,
    questions,
    sessionStartTime,
    errorMsg,
    backendWarning,
    submitting,
    closingSession,
    savedAnswers,
    keywordMap,
    correctCount,
    wrongCount,
    answeredCount,
    pendingBackup,
    restoreFromBackup,
    dismissBackup,
    submitAnswer,
    finishQuiz,
    restartSession,
    reviewSession,
  };
}
