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

// ── Return type ──────────────────────────────────────────

export type QuizPhase = 'loading' | 'recovery' | 'session' | 'results' | 'error';

export interface UseQuizSessionReturn {
  phase: QuizPhase;
  questions: QuizQuestion[];
  sessionStartTime: number;
  errorMsg: string;
  backendWarning: string | null;
  submitting: boolean;
  closingSession: boolean;
  savedAnswers: Record<number, SavedAnswer>;
  keywordMap: Record<string, string>;
  correctCount: number;
  wrongCount: number;
  answeredCount: number;
  pendingBackup: QuizBackupData | null;
  restoreFromBackup: () => void;
  dismissBackup: () => void;
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

// ── Hook ─────────────────────────────────────────────

export function useQuizSession(
  quizId: string | undefined,
  summaryId?: string,
  preloadedQuestions?: QuizQuestion[],
  quizTitle?: string,
): UseQuizSessionReturn {
  const [phase, setPhase] = useState<QuizPhase>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [errorMsg, setErrorMsg] = useState('');
  const [backendWarning, setBackendWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<Record<number, SavedAnswer>>({});
  const [keywordMap, setKeywordMap] = useState<Record<string, string>>({});
  const [pendingBackup, setPendingBackup] = useState<QuizBackupData | null>(null);

  const { handleBktUpdate, resetBkt } = useQuizBkt();
  const submittingRef = useRef(false);
  const preloadedUsedRef = useRef(false);
  const sessionClosedRef = useRef(false);
  const savedAnswersRef = useRef<Record<number, SavedAnswer>>({});

  // ── Initialize: create session + load questions ─────────

  useEffect(() => {
    let cancelled = false;

    setSavedAnswers({});
    savedAnswersRef.current = {};
    resetBkt();
    sessionClosedRef.current = false;
    setBackendWarning(null);
    setPendingBackup(null);
    setPhase('loading');
    setSessionStartTime(Date.now());
    cleanExpiredBackups();

    (async () => {
      try {
        const [session, result] = await Promise.all([
          quizApi.createStudySession({ session_type: 'quiz' }),
          loadAndNormalizeQuestions(
            quizId, summaryId, preloadedQuestions, preloadedUsedRef.current,
          ),
        ]);
        if (cancelled) return;
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

        const effectiveSummaryId = summaryId || items[0]?.summary_id;
        if (effectiveSummaryId) {
          const kwMap = await loadKeywordNames(effectiveSummaryId);
          if (!cancelled) setKeywordMap(kwMap);
        }
      } catch (err: unknown) {
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

      if (quizId) {
        saveQuizBackup({
          quizId,
          quizTitle: quizTitle || '',
          questionIds: questions.map(q => q.id),
          savedAnswers: updatedAnswers,
          currentIdx: questionIdx,
          savedAt: 0,
        });
      }

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
    if (quizId) clearQuizBackup(quizId);

    const totalCorrect = Object.values(savedAnswers).filter(
      (a) => a.answered && a.correct,
    ).length;
    const totalReviews = Object.values(savedAnswers).filter(
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
  }, [savedAnswers, sessionId, quizId]);

  // ── Restart session ─────────────────────────────────────

  const restartSession = useCallback(() => {
    setSavedAnswers({});
    savedAnswersRef.current = {};
    resetBkt();
    sessionClosedRef.current = false;
    preloadedUsedRef.current = false;
    setBackendWarning(null);
    setPhase('session');
    if (quizId) clearQuizBackup(quizId);

    quizApi
      .createStudySession({ session_type: 'quiz' })
      .then((s) => setSessionId(s.id))
      .catch((err) => {
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

  const reviewSession = useCallback(() => {
    setPhase('session');
  }, []);

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
