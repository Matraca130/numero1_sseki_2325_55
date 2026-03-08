// ============================================================
// Axon — Student Quiz: Session Lifecycle Hook
//
// Extracted from QuizTaker.tsx (Phase 6b).
// Manages: session init, answer submission (+ BKT fire-and-forget),
//          session close, restart.
//
// savedAnswers lives HERE to avoid stale-closure issues in
// finishQuiz / submitAnswer.
//
// The component owns: navigation, live-input state, rendering.
// ============================================================

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { apiCall } from '@/app/lib/api';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion, QuizQuestionListResponse } from '@/app/services/quizApi';
import type { SavedAnswer } from '@/app/components/student/quiz-types';
import { updateBKT } from '@/app/lib/bkt-engine';
import { logger } from '@/app/lib/logger';
import { checkAnswer } from '@/app/lib/quiz-utils';
import { normalizeQuestionType, normalizeDifficulty } from '@/app/services/quizConstants';

// ── Return type ──────────────────────────────────────────

export type QuizPhase = 'loading' | 'session' | 'results' | 'error';

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
): UseQuizSessionReturn {
  const [phase, setPhase] = useState<QuizPhase>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime] = useState(Date.now());
  const [errorMsg, setErrorMsg] = useState('');
  const [backendWarning, setBackendWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState<Record<number, SavedAnswer>>({});

  // Keyword labels for QuizResults display (loaded non-blocking)
  const [keywordMap, setKeywordMap] = useState<Record<string, string>>({});

  // Running BKT mastery per subtopic (accumulates across questions)
  const bktMasteryRef = useRef<Record<string, number>>({});
  const bktMaxMasteryRef = useRef<Record<string, number>>({});

  // Immediate guard against double-submit (React state is async)
  const submittingRef = useRef(false);

  // Track preloaded questions ref to avoid re-trigger on same array
  const preloadedUsedRef = useRef(false);

  // Prevent double session-close
  const sessionClosedRef = useRef(false);

  // ── Initialize: create session + load questions ─────────

  useEffect(() => {
    let cancelled = false;

    // Reset state when quizId changes (e.g. adaptive quiz navigation)
    setSavedAnswers({});
    bktMasteryRef.current = {};
    bktMaxMasteryRef.current = {};
    sessionClosedRef.current = false;
    setBackendWarning(null);
    setPhase('loading');

    (async () => {
      try {
        // 1. Create study session (always)
        const session = await quizApi.createStudySession({ session_type: 'quiz' });
        if (cancelled) return;
        setSessionId(session.id);
        sessionClosedRef.current = false;

        // 2. Get questions: preloaded mode OR fetch by quizId
        let items: QuizQuestion[] = [];

        if (preloadedQuestions && preloadedQuestions.length > 0 && !preloadedUsedRef.current) {
          // PRELOADED MODE: use questions passed directly
          preloadedUsedRef.current = true;
          items = [...preloadedQuestions];
        } else if (quizId) {
          // STANDALONE MODE: fetch by quizId
          try {
            const qs = summaryId
              ? `/quiz-questions?summary_id=${summaryId}&quiz_id=${quizId}`
              : `/quiz-questions?quiz_id=${quizId}`;
            const res = await apiCall<QuizQuestionListResponse | QuizQuestion[]>(qs);
            if (Array.isArray(res)) {
              items = res;
            } else if (res?.items) {
              items = res.items;
            }
          } catch (err: unknown) {
            logger.warn(
              '[QuizTaker] quiz_id filter failed:',
              err instanceof Error ? err.message : String(err),
            );
            setBackendWarning(
              'El filtro quiz_id puede no estar disponible aun. Intentando cargar preguntas...',
            );
            items = [];
          }
        } else if (!preloadedQuestions || preloadedQuestions.length === 0) {
          // Neither preloaded nor quizId
          if (!preloadedUsedRef.current) {
            setErrorMsg('No se proporcionaron preguntas ni quiz ID.');
            setPhase('error');
            return;
          }
          return; // Already initialized via preloaded
        }

        // 3. Filter active + normalize + shuffle
        // FIX H-CRIT-1: Normalize question_type and difficulty at the DATA LAYER
        // so all downstream logic (QuestionRenderer branching, checkAnswer,
        // QuizTaker canSubmit/handleSubmit) uses canonical values.
        // Without this, AI-generated questions with "multiple_choice" type
        // would not match === 'mcq' checks and render as open text inputs.
        items = items
          .filter((q) => q.is_active)
          .map((q) => ({
            ...q,
            question_type: normalizeQuestionType(q.question_type),
            difficulty: typeof q.difficulty === 'string'
              ? ({ easy: 1, medium: 2, hard: 3 }[q.difficulty as string] ?? 2)
              : q.difficulty,
          }));
        items = items.sort(() => Math.random() - 0.5);

        if (cancelled) return;

        if (items.length === 0) {
          setErrorMsg('Este quiz no tiene preguntas activas.');
          setPhase('error');
          return;
        }

        setQuestions(items);
        setPhase('session');

        // 4. Non-blocking: load keyword names for QuizResults display
        const effectiveSummaryId = summaryId || (items[0]?.summary_id);
        if (effectiveSummaryId) {
          try {
            const kwRes = await apiCall<
              { items: Array<{ id: string; term: string }> } | Array<{ id: string; term: string }>
            >(`/keywords?summary_id=${effectiveSummaryId}`);
            const kwItems = Array.isArray(kwRes) ? kwRes : kwRes?.items || [];
            const map: Record<string, string> = {};
            for (const kw of kwItems) {
              map[kw.id] = kw.term || kw.id.substring(0, 8);
            }
            if (!cancelled) setKeywordMap(map);
          } catch {
            // Non-blocking — QuizResults falls back to truncated IDs
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Error al iniciar el quiz');
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

  // ── BKT update (fire-and-forget helper) ─────────────────

  const handleBktUpdate = async (question: QuizQuestion, isCorrect: boolean) => {
    const subtopicId = question.subtopic_id;
    if (!subtopicId) return;

    const prevMastery = bktMasteryRef.current[subtopicId] ?? 0;
    const prevMax = bktMaxMasteryRef.current[subtopicId] ?? 0;
    const newP = updateBKT(
      prevMastery,
      isCorrect,
      'quiz',
      prevMax > prevMastery ? prevMax : undefined,
    );
    bktMasteryRef.current[subtopicId] = newP;
    bktMaxMasteryRef.current[subtopicId] = Math.max(prevMax, newP);

    try {
      await quizApi.upsertBktState({
        subtopic_id: subtopicId,
        p_know: newP,
        p_transit: 0.1,
        p_slip: 0.1,
        p_guess: 0.25,
        delta: newP - prevMastery,
        total_attempts: 1,
        correct_attempts: isCorrect ? 1 : 0,
        last_attempt_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('[QuizTaker] BKT update failed (non-blocking):', err);
    }
  };

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

      // Persist in local state
      setSavedAnswers((prev) => ({
        ...prev,
        [questionIdx]: {
          answer,
          selectedOption: optionText,
          correct,
          answered: true,
          timeTakenMs,
        },
      }));

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
    [sessionId],
  );

  // ── Finish quiz (close study session) ───────────────────

  const finishQuiz = useCallback(async () => {
    setClosingSession(true);

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
  }, [savedAnswers, sessionId]);

  // ── Restart session ─────────────────────────────────────

  const restartSession = useCallback(() => {
    setSavedAnswers({});
    bktMasteryRef.current = {};
    bktMaxMasteryRef.current = {};
    sessionClosedRef.current = false;
    preloadedUsedRef.current = false;
    setBackendWarning(null);
    setPhase('session');
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
  }, []);

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
    submitAnswer,
    finishQuiz,
    restartSession,
    reviewSession,
  };
}