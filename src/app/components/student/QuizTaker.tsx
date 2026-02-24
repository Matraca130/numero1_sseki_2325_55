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
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiCall } from '@/app/lib/api';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion, QuestionType } from '@/app/services/quizApi';
import { QuizResults } from '@/app/components/student/QuizResults';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  CheckCircle2, XCircle, ChevronLeft, Lightbulb,
  BookOpen, X, Loader2, Clock, Check, AlertTriangle,
} from 'lucide-react';
import { updateBKT } from '@/app/lib/bkt-engine';

// ── Helpers ──────────────────────────────────────────────

function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function checkAnswer(q: QuizQuestion, userAnswer: string): boolean {
  if (q.question_type === 'mcq') return userAnswer === q.correct_answer;
  if (q.question_type === 'true_false') return normalizeText(userAnswer) === normalizeText(q.correct_answer);
  const norm = normalizeText(userAnswer);
  const expected = normalizeText(q.correct_answer);
  if (!norm) return false;
  return norm === expected || norm.includes(expected) || expected.includes(norm);
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Opcion multiple',
  true_false: 'Verdadero / Falso',
  fill_blank: 'Completar',
  open: 'Respuesta abierta',
};

type Difficulty = 'easy' | 'medium' | 'hard';
const INT_TO_DIFFICULTY: Record<number, Difficulty> = { 1: 'easy', 2: 'medium', 3: 'hard' };
const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Facil', medium: 'Media', hard: 'Dificil' };
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// ── Per-question answer state ────────────────────────────

export interface SavedAnswer {
  answer: string;
  selectedOption: string | null;
  correct: boolean;
  answered: boolean;
  timeTakenMs: number;
}

function emptyAnswer(): SavedAnswer {
  return { answer: '', selectedOption: null, correct: false, answered: false, timeTakenMs: 0 };
}

// ── Props ────────────────────────────────────────────────

interface QuizTakerProps {
  quizId: string;
  quizTitle: string;
  onBack: () => void;
  onComplete?: () => void;
}

// ── Main Component ───────────────────────────────────────

export function QuizTaker({ quizId, quizTitle, onBack, onComplete }: QuizTakerProps) {
  const [phase, setPhase] = useState<'loading' | 'session' | 'results' | 'error'>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime] = useState(Date.now());
  const [errorMsg, setErrorMsg] = useState('');
  const [backendWarning, setBackendWarning] = useState<string | null>(null);

  // Question navigation
  const [currentIdx, setCurrentIdx] = useState(0);
  const [savedAnswers, setSavedAnswers] = useState<Record<number, SavedAnswer>>({});
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');

  // Live input
  const [liveSelectedOption, setLiveSelectedOption] = useState<string | null>(null);
  const [liveTextInput, setLiveTextInput] = useState('');
  const [liveTFAnswer, setLiveTFAnswer] = useState<string | null>(null);

  // Timer
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [closingSession, setClosingSession] = useState(false);

  // ── Initialize: create session + load questions ─────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Create study session (student_id auto from auth)
        const session = await quizApi.createStudySession({ session_type: 'quiz' });
        if (cancelled) return;
        setSessionId(session.id);

        // Load questions by quiz_id
        let items: QuizQuestion[] = [];
        try {
          const res = await apiCall<any>(`/quiz-questions?quiz_id=${quizId}`);
          if (Array.isArray(res)) {
            items = res;
          } else if (res?.items) {
            items = res.items;
          }
        } catch (err: any) {
          // quiz_id filter might not work yet — show warning
          console.warn('[QuizTaker] quiz_id filter failed:', err.message);
          setBackendWarning(
            'El filtro quiz_id puede no estar disponible aun. ' +
            'Intentando cargar preguntas...'
          );
          items = [];
        }

        // Filter to active only, shuffle
        items = items.filter(q => q.is_active);
        items = items.sort(() => Math.random() - 0.5);

        if (cancelled) return;

        if (items.length === 0) {
          setErrorMsg('Este quiz no tiene preguntas activas.');
          setPhase('error');
          return;
        }

        setQuestions(items);
        setPhase('session');
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err.message || 'Error al iniciar el quiz');
          setPhase('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [quizId]);

  // Reset timer on question change
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIdx]);

  // ── Computed ────────────────────────────────────────────
  const correctCount = Object.values(savedAnswers).filter(a => a.answered && a.correct).length;
  const wrongCount = Object.values(savedAnswers).filter(a => a.answered && !a.correct).length;
  const answeredCount = Object.values(savedAnswers).filter(a => a.answered).length;

  // ── BKT update (fire-and-forget) ────────────────────────
  const handleBktUpdate = async (question: QuizQuestion, isCorrect: boolean) => {
    // Only update BKT if the question has subtopic_id
    if (!(question as any).subtopic_id) return;

    const newP = updateBKT(0, isCorrect, 'quiz');
    // p_know default is 0.0 — first time always starts from 0

    try {
      await apiCall('/bkt-states', {
        method: 'POST',
        body: JSON.stringify({
          subtopic_id: (question as any).subtopic_id,
          p_know: newP,
          p_transit: 0.1,
          p_slip: 0.1,
          p_guess: 0.25,
          delta: newP - 0,
          total_attempts: 1,
          correct_attempts: isCorrect ? 1 : 0,
          last_attempt_at: new Date().toISOString(),
        }),
      });
      // UPSERT atomico — student_id se auto-set desde auth (scopeToUser)
    } catch (err) {
      console.error('[QuizTaker] BKT update failed (non-blocking):', err);
    }
  };

  // ── Submit answer ───────────────────────────────────────
  const submitAnswer = async (answer: string, optionText: string | null) => {
    if (submitting) return;
    const currentQ = questions[currentIdx];
    if (!currentQ) return;

    setSubmitting(true);
    const timeTaken = Date.now() - questionStartTime;
    const correct = checkAnswer(currentQ, answer);

    setSavedAnswers(prev => ({
      ...prev,
      [currentIdx]: {
        answer,
        selectedOption: optionText,
        correct,
        answered: true,
        timeTakenMs: timeTaken,
      },
    }));

    // Fire-and-forget: record attempt + review
    const attemptPromise = quizApi.createQuizAttempt({
      quiz_question_id: currentQ.id,
      answer,
      is_correct: correct,
      session_id: sessionId || undefined,
      time_taken_ms: timeTaken,
    }).catch(err => console.error('[QuizTaker] Attempt error:', err));

    const reviewPromise = sessionId ? apiCall('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        item_id: currentQ.id,
        instrument_type: 'quiz',
        grade: correct ? 1 : 0,
      }),
    }).catch(err => console.error('[QuizTaker] Review error:', err)) : Promise.resolve();

    // Fire-and-forget: BKT update (only if question has subtopic_id)
    const bktPromise = handleBktUpdate(currentQ, correct);

    await Promise.allSettled([attemptPromise, reviewPromise, bktPromise]);
    setSubmitting(false);
  };

  // Submit handlers per type
  const handleSubmitMC = () => {
    if (liveSelectedOption === null) return;
    submitAnswer(liveSelectedOption, liveSelectedOption);
  };

  const handleSubmitTF = () => {
    if (!liveTFAnswer) return;
    submitAnswer(liveTFAnswer, null);
  };

  const handleSubmitOpen = () => {
    if (!liveTextInput.trim()) return;
    submitAnswer(liveTextInput.trim(), null);
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

  // ── Finish quiz ─────────────────────────────────────────
  const finishQuiz = async () => {
    setClosingSession(true);
    const totalCorrect = Object.values(savedAnswers).filter(a => a.answered && a.correct).length;
    const totalReviews = Object.values(savedAnswers).filter(a => a.answered).length;
    const durationSec = Math.round((Date.now() - sessionStartTime) / 1000);

    if (sessionId) {
      try {
        await quizApi.closeStudySession(sessionId, {
          ended_at: new Date().toISOString(),
          duration_seconds: durationSec,
          total_reviews: totalReviews,
          correct_reviews: totalCorrect,
        });
      } catch (err) {
        console.error('[QuizTaker] Session close error:', err);
      }
    }
    setClosingSession(false);
    setPhase('results');
  };

  // ── Restart ─────────────────────────────────────────────
  const handleRestart = () => {
    setSavedAnswers({});
    setCurrentIdx(0);
    setLiveSelectedOption(null);
    setLiveTextInput('');
    setLiveTFAnswer(null);
    setNavDirection('forward');
    setPhase('session');
    // New session
    quizApi.createStudySession({ session_type: 'quiz' })
      .then(s => setSessionId(s.id))
      .catch(err => console.error('[QuizTaker] New session error:', err));
  };

  // ── PHASE: loading ──────────────────────────────────────
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
      <QuizResults
        questions={questions}
        savedAnswers={savedAnswers}
        sessionStartTime={sessionStartTime}
        quizTitle={quizTitle}
        onRestart={handleRestart}
        onBack={onBack}
      />
    );
  }

  // ── PHASE: session ──────────────────────────────────────
  const currentQ = questions[currentIdx];
  if (!currentQ) return null;

  const saved = savedAnswers[currentIdx];
  const isReviewing = saved?.answered === true;
  const showResult = isReviewing;

  const selectedAnswer = isReviewing ? saved.selectedOption : liveSelectedOption;
  const textAnswer = isReviewing ? saved.answer : liveTextInput;
  const tfAnswer = isReviewing ? saved.answer : liveTFAnswer;
  const isCorrectResult = isReviewing ? saved.correct : false;

  const diffKey = INT_TO_DIFFICULTY[currentQ.difficulty] || 'medium';

  const slideVariants = {
    enter: { opacity: 0, y: navDirection === 'forward' ? 16 : -16 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: navDirection === 'forward' ? -16 : 16 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-white overflow-hidden"
    >
      {/* Backend warning */}
      {backendWarning && (
        <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px]">
          <AlertTriangle size={13} className="shrink-0" />
          {backendWarning}
        </div>
      )}

      {/* ── Top Bar ── */}
      <div className="h-12 flex items-center justify-between px-5 border-b border-gray-200 shrink-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 p-1.5 -ml-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={18} />
            <span className="text-sm" style={{ fontWeight: 500 }}>Salir</span>
          </button>
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <BookOpen size={14} className="text-teal-600" />
          </div>
          <span className="text-sm text-gray-800 truncate max-w-[260px]" style={{ fontWeight: 600 }}>
            {quizTitle}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Difficulty badge */}
          <span className={clsx(
            'text-[9px] px-2 py-0.5 rounded-full border uppercase',
            diffKey === 'easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
            diffKey === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
            'bg-red-50 text-red-600 border-red-200'
          )} style={{ fontWeight: 700 }}>
            {DIFFICULTY_LABELS[diffKey]}
          </span>
          {/* Timer display */}
          <TimerDisplay startTime={questionStartTime} paused={isReviewing} />
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-6 md:px-10 py-6 md:py-8">

          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 flex items-center gap-[3px]">
              {questions.map((_, idx) => {
                const sa = savedAnswers[idx];
                let color = 'bg-gray-200';
                if (sa?.answered && sa.correct) color = 'bg-emerald-500';
                else if (sa?.answered && !sa.correct) color = 'bg-rose-400';
                else if (idx === currentIdx) color = 'bg-teal-500';
                return (
                  <button
                    key={idx}
                    onClick={() => goToQuestion(idx, idx < currentIdx ? 'back' : 'forward')}
                    className={clsx(
                      'h-1.5 rounded-full flex-1 transition-all cursor-pointer hover:opacity-80',
                      color,
                      idx === currentIdx && 'ring-2 ring-teal-300 ring-offset-1'
                    )}
                    title={`Pregunta ${idx + 1}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-xs text-gray-500" style={{ fontWeight: 500 }}>
                {currentIdx + 1} de {questions.length}
              </span>
              {wrongCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                  <X size={10} /> {wrongCount}
                </span>
              )}
              {correctCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
                  <CheckCircle2 size={10} /> {correctCount}
                </span>
              )}
            </div>
          </div>

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
              {/* Type badge */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full border text-teal-700 bg-teal-50 border-teal-200" style={{ fontWeight: 600 }}>
                  {QUESTION_TYPE_LABELS[currentQ.question_type]}
                </span>
                {isReviewing && (
                  <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200" style={{ fontWeight: 600 }}>
                    Respondida
                  </span>
                )}
              </div>

              {/* Question text */}
              <div className="flex gap-4 mb-8">
                <span className="text-gray-400 text-lg shrink-0" style={{ fontWeight: 600 }}>{currentIdx + 1}.</span>
                <h3 className="text-lg text-gray-800" style={{ lineHeight: '1.6' }}>{currentQ.question}</h3>
              </div>

              {/* ── MCQ Options ── */}
              {currentQ.question_type === 'mcq' && currentQ.options && (
                <div className="space-y-3 mb-6">
                  {currentQ.options.map((option, oi) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrectOption = option === currentQ.correct_answer;
                    const wasSelectedWrong = showResult && isSelected && !isCorrectOption;
                    const wasCorrect = showResult && isCorrectOption;

                    return (
                      <button
                        key={oi}
                        onClick={() => !isReviewing && setLiveSelectedOption(option)}
                        disabled={isReviewing}
                        className={clsx(
                          'w-full text-left rounded-xl border-2 transition-all overflow-hidden',
                          !showResult && !isSelected && 'border-gray-200 hover:border-gray-300 bg-white',
                          !showResult && isSelected && 'border-teal-500 bg-teal-50/30',
                          wasCorrect && 'border-emerald-400 bg-emerald-50',
                          wasSelectedWrong && 'border-rose-300 bg-rose-50',
                          showResult && !isCorrectOption && !isSelected && 'border-gray-200 bg-white opacity-50'
                        )}
                      >
                        <div className="px-5 py-4 flex items-start gap-3">
                          <span className={clsx(
                            'text-sm shrink-0 mt-0.5',
                            wasCorrect ? 'text-emerald-600' : wasSelectedWrong ? 'text-rose-500' : isSelected ? 'text-teal-600' : 'text-gray-400'
                          )} style={{ fontWeight: 600 }}>
                            {LETTERS[oi]}.
                          </span>
                          <span className={clsx(
                            'text-sm',
                            wasCorrect ? 'text-gray-800' : wasSelectedWrong ? 'text-gray-700' : isSelected ? 'text-gray-800' : 'text-gray-600'
                          )}>
                            {option}
                          </span>
                        </div>

                        {wasSelectedWrong && (
                          <FeedbackBlock correct={false} explanation={currentQ.explanation} correctAnswer={currentQ.correct_answer} />
                        )}
                        {wasCorrect && showResult && (
                          <FeedbackBlock correct={true} explanation={currentQ.explanation} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── True/False ── */}
              {currentQ.question_type === 'true_false' && (
                <div className="space-y-3 mb-6">
                  {['true', 'false'].map(val => {
                    const label = val === 'true' ? 'Verdadero' : 'Falso';
                    const icon = val === 'true' ? <CheckCircle2 size={20} /> : <XCircle size={20} />;
                    const isSelected = (isReviewing ? saved.answer : liveTFAnswer) === val;
                    const isCorrectOption = val === currentQ.correct_answer;
                    const wasSelectedWrong = showResult && isSelected && !isCorrectOption;
                    const wasCorrect = showResult && isCorrectOption;

                    return (
                      <button
                        key={val}
                        onClick={() => !isReviewing && setLiveTFAnswer(val)}
                        disabled={isReviewing}
                        className={clsx(
                          'w-full text-left rounded-xl border-2 transition-all overflow-hidden',
                          !showResult && !isSelected && 'border-gray-200 hover:border-gray-300 bg-white',
                          !showResult && isSelected && 'border-teal-500 bg-teal-50/30',
                          wasCorrect && 'border-emerald-400 bg-emerald-50',
                          wasSelectedWrong && 'border-rose-300 bg-rose-50',
                          showResult && !isCorrectOption && !isSelected && 'border-gray-200 bg-white opacity-50'
                        )}
                      >
                        <div className="px-5 py-4 flex items-center gap-3">
                          <span className={clsx(
                            'shrink-0',
                            wasCorrect ? 'text-emerald-600' : wasSelectedWrong ? 'text-rose-500' : isSelected ? 'text-teal-600' : 'text-gray-400'
                          )}>
                            {icon}
                          </span>
                          <span className={clsx(
                            'text-base',
                            wasCorrect ? 'text-gray-800' : wasSelectedWrong ? 'text-gray-700' : isSelected ? 'text-gray-800' : 'text-gray-600'
                          )} style={{ fontWeight: 600 }}>
                            {label}
                          </span>
                        </div>
                        {wasSelectedWrong && currentQ.explanation && (
                          <FeedbackBlock correct={false} explanation={currentQ.explanation} />
                        )}
                        {wasCorrect && showResult && currentQ.explanation && (
                          <FeedbackBlock correct={true} explanation={currentQ.explanation} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Open / Fill Blank ── */}
              {(currentQ.question_type === 'open' || currentQ.question_type === 'fill_blank') && (
                <div className="mb-6">
                  <div className={clsx(
                    'rounded-xl border-2 overflow-hidden transition-all',
                    showResult && isCorrectResult && 'border-emerald-400 bg-emerald-50',
                    showResult && !isCorrectResult && 'border-rose-300 bg-rose-50',
                    !showResult && 'border-gray-200 bg-white'
                  )}>
                    <textarea
                      value={textAnswer}
                      onChange={e => setLiveTextInput(e.target.value)}
                      disabled={isReviewing}
                      placeholder={currentQ.question_type === 'fill_blank' ? 'Completa el espacio...' : 'Escribe tu respuesta...'}
                      className="w-full px-5 py-4 text-sm text-gray-800 bg-transparent resize-none outline-none placeholder:text-gray-400 min-h-[100px]"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey && !isReviewing) {
                          e.preventDefault();
                          handleSubmitOpen();
                        }
                      }}
                    />
                    {showResult && (
                      <div className="px-5 pb-4">
                        {isCorrectResult ? (
                          <FeedbackBlock correct={true} explanation={currentQ.explanation} />
                        ) : (
                          <FeedbackBlock correct={false} explanation={currentQ.explanation} correctAnswer={currentQ.correct_answer} inline />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 md:px-10 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            {currentIdx > 0 ? (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 transition-colors"
                style={{ fontWeight: 600 }}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
            ) : <div />}
          </div>

          <div>
            {closingSession ? (
              <div className="px-6 py-2.5 rounded-lg text-sm bg-gray-200 text-gray-500 flex items-center gap-2" style={{ fontWeight: 600 }}>
                <Loader2 size={14} className="animate-spin" /> Finalizando...
              </div>
            ) : isReviewing ? (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-lg text-sm bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-all"
                style={{ fontWeight: 600 }}
              >
                {currentIdx < questions.length - 1
                  ? 'Siguiente'
                  : (answeredCount >= questions.length ? 'Ver resultados' : 'Siguiente')
                }
              </button>
            ) : (
              <button
                onClick={
                  currentQ.question_type === 'mcq' ? handleSubmitMC :
                  currentQ.question_type === 'true_false' ? handleSubmitTF :
                  handleSubmitOpen
                }
                disabled={
                  submitting ||
                  (currentQ.question_type === 'mcq' ? liveSelectedOption === null :
                   currentQ.question_type === 'true_false' ? !liveTFAnswer :
                   !liveTextInput.trim())
                }
                className={clsx(
                  'px-6 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2',
                  'bg-teal-600 text-white hover:bg-teal-700 shadow-sm',
                  'disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed'
                )}
                style={{ fontWeight: 600 }}
              >
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                ) : (
                  <><Check size={14} /> Confirmar</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Feedback Block ────────────────────────────────────────

function FeedbackBlock({
  correct,
  explanation,
  correctAnswer,
  inline,
}: {
  correct: boolean;
  explanation?: string | null;
  correctAnswer?: string;
  inline?: boolean;
}) {
  const Wrapper = inline ? React.Fragment : ({ children }: { children: React.ReactNode }) => (
    <div className="px-5 pb-4 pt-0">{children}</div>
  );

  return (
    <Wrapper>
      <div className="flex items-start gap-2">
        {correct ? (
          <>
            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-emerald-600 mb-1" style={{ fontWeight: 600 }}>Respuesta correcta</p>
              {explanation && <p className="text-xs text-gray-500" style={{ lineHeight: '1.5' }}>{explanation}</p>}
            </div>
          </>
        ) : (
          <>
            <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-rose-600 mb-1" style={{ fontWeight: 600 }}>Incorrecto</p>
              {correctAnswer && (
                <p className="text-xs text-gray-600 mb-1">
                  Respuesta esperada: <span className="text-gray-800" style={{ fontWeight: 600 }}>{correctAnswer}</span>
                </p>
              )}
              {explanation && <p className="text-xs text-gray-500" style={{ lineHeight: '1.5' }}>{explanation}</p>}
            </div>
          </>
        )}
      </div>
    </Wrapper>
  );
}

// ── Timer Display ─────────────────────────────────────────

function TimerDisplay({ startTime, paused }: { startTime: number; paused: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, paused]);

  useEffect(() => {
    setElapsed(0);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <span className="flex items-center gap-1 text-[11px] text-gray-400 tabular-nums">
      <Clock size={11} />
      {mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${secs}s`}
    </span>
  );
}

export default QuizTaker;