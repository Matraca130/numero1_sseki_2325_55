// ============================================================
// @deprecated — Phase 14: This file was replaced by:
//   /student/QuizTaker.tsx + /student/useQuizSession.ts (session)
//   /student/QuizResults.tsx (results)
//
// Reasons for replacement:
//   - No BKT tracking (POST /bkt-states)
//   - No POST /reviews
//   - No Promise.allSettled (simple catch only)
//   - 629 monolithic lines (exceeds 500-line limit)
//   - No extracted sub-components
//
// QuizView.tsx now uses QuizTaker instead of this file.
// Keep in repo for historical reference.
// Delete on next code cleanup if no hidden consumers.
// ============================================================

// ============================================================
// Axon — Quiz Session View (extracted from QuizView)
//
// Handles: study session lifecycle, answer submission,
// question navigation, and rendering of all question types.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import * as quizApi from '@/app/services/quizApi';
import type { QuizQuestion } from '@/app/services/quizApi';
import { INT_TO_DIFFICULTY } from '@/app/services/quizConstants';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  CheckCircle2, XCircle, ChevronLeft, Lightbulb,
  BookOpen, X, Loader2, Clock,
} from 'lucide-react';
import { logger } from '@/app/lib/logger';

// ── Inlined from design-kit (file not in repo) ──────────
const focusRing = "focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none";

import {
  checkAnswer,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_ICONS,
  QUESTION_TYPE_COLORS,
  DIFFICULTY_LABELS,
  LETTERS,
  type SavedAnswer,
} from './quiz-helpers';
import { QuizResultsScreen } from './QuizResultsScreen';

// ── Props ────────────────────────────────────────────────

interface QuizSessionViewProps {
  questions: QuizQuestion[];
  summaryTitle: string;
  summaryId: string;
  onBack: () => void;
}

// ── Option Button (memoized for list performance) ────────

const OptionButton = React.memo(function OptionButton({
  option,
  letter,
  isSelected,
  isCorrectOption,
  showResult,
  disabled,
  onSelect,
  explanation,
}: {
  option: string;
  letter: string;
  isSelected: boolean;
  isCorrectOption: boolean;
  showResult: boolean;
  disabled: boolean;
  onSelect: () => void;
  explanation: string | null;
}) {
  const wasSelectedWrong = showResult && isSelected && !isCorrectOption;
  const wasCorrect = showResult && isCorrectOption;

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={clsx(
        "w-full text-left rounded-xl border-2 transition-all overflow-hidden",
        !showResult && !isSelected && "border-gray-200 hover:border-gray-300 bg-white",
        !showResult && isSelected && "border-teal-500 bg-teal-50/30",
        wasCorrect && "border-emerald-400 bg-emerald-50",
        wasSelectedWrong && "border-rose-300 bg-rose-50",
        showResult && !isCorrectOption && !isSelected && "border-gray-200 bg-white opacity-50"
      )}
    >
      <div className="px-5 py-4 flex items-start gap-3">
        <span className={clsx(
          "text-sm font-semibold shrink-0 mt-0.5",
          wasCorrect ? "text-emerald-600" : wasSelectedWrong ? "text-rose-500" : isSelected ? "text-teal-600" : "text-gray-400"
        )}>
          {letter}.
        </span>
        <span className={clsx(
          "text-sm",
          wasCorrect ? "text-gray-800" : wasSelectedWrong ? "text-gray-700" : isSelected ? "text-gray-800" : "text-gray-600"
        )}>
          {option}
        </span>
      </div>

      {wasSelectedWrong && (
        <div className="px-5 pb-4 pt-0">
          <div className="flex items-start gap-2">
            <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-rose-600 mb-1" style={{ fontWeight: 600 }}>Incorrecto</p>
              {explanation && <p className="text-xs text-zinc-500" style={{ lineHeight: '1.5' }}>{explanation}</p>}
            </div>
          </div>
        </div>
      )}
      {wasCorrect && showResult && (
        <div className="px-5 pb-4 pt-0">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-emerald-600 mb-1" style={{ fontWeight: 600 }}>Respuesta correcta</p>
              {explanation && <p className="text-xs text-zinc-500" style={{ lineHeight: '1.5' }}>{explanation}</p>}
            </div>
          </div>
        </div>
      )}
    </button>
  );
});

// ── Main Component ───────────────────────────────────────

export function QuizSessionView({
  questions,
  summaryTitle,
  summaryId,
  onBack,
}: QuizSessionViewProps) {
  // Per-question saved answers
  const [savedAnswers, setSavedAnswers] = useState<Record<number, SavedAnswer>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');

  // Live input state
  const [liveSelectedOption, setLiveSelectedOption] = useState<string | null>(null);
  const [liveTextInput, setLiveTextInput] = useState('');
  const [liveTFAnswer, setLiveTFAnswer] = useState<string | null>(null);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime] = useState<number>(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [closingSession, setClosingSession] = useState(false);

  // Create study session on mount
  useEffect(() => {
    quizApi.createStudySession({ session_type: 'quiz' })
      .then(s => {
        setSessionId(s.id);
        logger.debug('[Quiz] Session created:', s.id);
      })
      .catch(err => logger.error('[Quiz] Session create error:', err));
  }, []);

  // Reset question timer on navigate
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIdx]);

  // Empty state
  if (questions.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lightbulb size={40} className="text-teal-300" />
          </div>
          <h2 className="text-2xl text-zinc-900 mb-3" style={{ fontWeight: 700 }}>Quiz no disponible</h2>
          <p className="text-zinc-500 mb-4">No se encontraron preguntas con los filtros seleccionados.</p>
          <button onClick={onBack} className="text-teal-600 hover:underline" style={{ fontWeight: 700 }}>Volver a seleccion</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const saved = savedAnswers[currentIdx];
  const isReviewing = saved?.answered === true;

  // Counts
  const correctCount = Object.values(savedAnswers).filter(a => a.answered && a.correct).length;
  const wrongCount = Object.values(savedAnswers).filter(a => a.answered && !a.correct).length;
  const answeredCount = Object.values(savedAnswers).filter(a => a.answered).length;

  // Derived state
  const showResult = isReviewing;
  const selectedAnswer = isReviewing ? saved.selectedOption : liveSelectedOption;
  const textAnswer = isReviewing ? saved.textInput : liveTextInput;
  const tfAnswer = isReviewing ? saved.textInput : liveTFAnswer;
  const isCorrectResult = isReviewing ? saved.correct : false;

  // ── Submit handlers ──
  const submitAnswer = async (answer: string, optionText: string | null) => {
    if (isReviewing || submittingAnswer) return;
    setSubmittingAnswer(true);
    const timeTaken = Date.now() - questionStartTime;
    const correct = checkAnswer(currentQ, answer);

    setSavedAnswers(prev => ({
      ...prev,
      [currentIdx]: {
        selectedOption: optionText,
        textInput: answer,
        correct,
        answered: true,
        timeTakenMs: timeTaken,
      },
    }));

    // Record attempt to backend (fire-and-forget)
    quizApi.createQuizAttempt({
      quiz_question_id: currentQ.id,
      answer,
      is_correct: correct,
      session_id: sessionId || undefined,
      time_taken_ms: timeTaken,
    }).catch(err => logger.error('[Quiz] Attempt record error:', err));

    setSubmittingAnswer(false);
  };

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

  // ── Navigation ──
  const goToQuestion = (idx: number, direction: 'forward' | 'back') => {
    setNavDirection(direction);
    setCurrentIdx(idx);
    const savedForIdx = savedAnswers[idx];
    if (savedForIdx && savedForIdx.answered) {
      setLiveSelectedOption(savedForIdx.selectedOption);
      setLiveTextInput(savedForIdx.textInput);
      setLiveTFAnswer(savedForIdx.textInput);
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
    if (currentIdx > 0) {
      goToQuestion(currentIdx - 1, 'back');
    }
  };

  // ── Finish quiz ──
  const finishQuiz = async () => {
    setClosingSession(true);
    const totalCorrect = Object.values(savedAnswers).filter(a => a.answered && a.correct).length;
    const totalReviews = Object.values(savedAnswers).filter(a => a.answered).length;

    if (sessionId) {
      try {
        await quizApi.closeStudySession(sessionId, {
          completed_at: new Date().toISOString(),
          total_reviews: totalReviews,
          correct_reviews: totalCorrect,
        });
        logger.debug('[Quiz] Session closed');
      } catch (err) {
        logger.error('[Quiz] Session close error:', err);
      }
    }
    setClosingSession(false);
    setIsComplete(true);
  };

  const handleRestart = () => {
    setSavedAnswers({});
    setCurrentIdx(0);
    setIsComplete(false);
    setLiveSelectedOption(null);
    setLiveTextInput('');
    setLiveTFAnswer(null);
    setNavDirection('forward');
    // Create new session
    quizApi.createStudySession({ session_type: 'quiz' })
      .then(s => setSessionId(s.id))
      .catch(err => logger.error('[Quiz] Session create error:', err));
  };

  // ── Complete Screen ──
  if (isComplete) {
    const durationSec = Math.round((Date.now() - sessionStartTime) / 1000);
    return (
      <QuizResultsScreen
        score={correctCount}
        total={questions.length}
        correctCount={correctCount}
        wrongCount={wrongCount}
        answeredCount={answeredCount}
        durationSec={durationSec}
        onReview={() => { setIsComplete(false); goToQuestion(0, 'back'); }}
        onBack={onBack}
        onRestart={handleRestart}
      />
    );
  }

  // ── Animation variants ──
  const slideVariants = {
    enter: { opacity: 0, y: navDirection === 'forward' ? 16 : -16 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: navDirection === 'forward' ? -16 : 16 },
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col h-full bg-zinc-50 overflow-hidden">

      {/* Top Bar — Glass */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-zinc-200 shrink-0 bg-white/80 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 p-1.5 -ml-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
            <ChevronLeft size={18} />
            <span className="text-sm" style={{ fontWeight: 500 }}>Salir</span>
          </button>
          <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center shadow-sm">
            <BookOpen size={15} className="text-white" />
          </div>
          <span className="text-sm text-zinc-800 truncate max-w-[260px]" style={{ fontWeight: 600 }}>Quiz: {summaryTitle}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Difficulty badge */}
          {(() => {
            const diffKey = INT_TO_DIFFICULTY[currentQ.difficulty] || 'medium';
            return (
              <span className={clsx(
                'text-[9px] px-2.5 py-1 rounded-full border uppercase',
                diffKey === 'easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                diffKey === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                'bg-red-50 text-red-600 border-red-200'
              )} style={{ fontWeight: 700 }}>
                {DIFFICULTY_LABELS[diffKey]}
              </span>
            );
          })()}
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content (scrollable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-light">
        <div className="max-w-3xl mx-auto w-full px-6 md:px-10 py-6 md:py-8">

          {/* Progress Bar */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 flex items-center gap-1">
              {questions.map((_, idx) => {
                const sa = savedAnswers[idx];
                let color = 'bg-zinc-200';
                if (sa?.answered && sa.correct) color = 'bg-emerald-500';
                else if (sa?.answered && !sa.correct) color = 'bg-rose-400';
                else if (idx === currentIdx) color = 'bg-teal-500';
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={idx}
                    onClick={() => goToQuestion(idx, idx < currentIdx ? 'back' : 'forward')}
                    className={clsx(
                      "h-2 rounded-full flex-1 transition-all cursor-pointer hover:opacity-80",
                      color,
                      isCurrent && "ring-2 ring-teal-300 ring-offset-1"
                    )}
                    title={`Pregunta ${idx + 1}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-xs text-zinc-500" style={{ fontWeight: 500 }}>{currentIdx + 1} de {questions.length}</span>
              {wrongCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200" style={{ fontWeight: 600 }}>
                  <X size={10} /> {wrongCount}
                </span>
              )}
              {correctCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200" style={{ fontWeight: 600 }}>
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
              {/* Question type badge */}
              <div className="mb-4 flex items-center gap-2 flex-wrap">
                <span className={clsx(
                  'flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border',
                  QUESTION_TYPE_COLORS[currentQ.question_type]
                )} style={{ fontWeight: 600 }}>
                  {QUESTION_TYPE_ICONS[currentQ.question_type]}
                  {QUESTION_TYPE_LABELS[currentQ.question_type]}
                </span>
                {isReviewing && (
                  <span className="text-[10px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200" style={{ fontWeight: 600 }}>
                    Respondida
                  </span>
                )}
              </div>

              {/* Question text */}
              <div className="flex gap-4 mb-8">
                <span className="text-zinc-400 text-lg shrink-0" style={{ fontWeight: 600 }}>{currentIdx + 1}.</span>
                <h3 className="text-lg text-zinc-800" style={{ lineHeight: '1.6' }}>{currentQ.question}</h3>
              </div>

              {/* Multiple Choice Options */}
              {currentQ.question_type === 'mcq' && currentQ.options && (
                <div className="space-y-3 mb-6">
                  {currentQ.options.map((option, idx) => (
                    <OptionButton
                      key={idx}
                      option={option}
                      letter={LETTERS[idx]}
                      isSelected={selectedAnswer === option}
                      isCorrectOption={option === currentQ.correct_answer}
                      showResult={showResult}
                      disabled={isReviewing}
                      onSelect={() => !isReviewing && setLiveSelectedOption(option)}
                      explanation={currentQ.explanation}
                    />
                  ))}
                </div>
              )}

              {/* True/False */}
              {currentQ.question_type === 'true_false' && (
                <div className="space-y-3 mb-6">
                  {['true', 'false'].map(val => {
                    const label = val === 'true' ? 'Verdadero' : 'Falso';
                    const icon = val === 'true'
                      ? <CheckCircle2 size={20} />
                      : <XCircle size={20} />;
                    const isSelected = (isReviewing ? saved.textInput : liveTFAnswer) === val;
                    const isCorrectOption = val === currentQ.correct_answer;
                    const wasSelectedWrong = showResult && isSelected && !isCorrectOption;
                    const wasCorrect = showResult && isCorrectOption;

                    return (
                      <button
                        key={val}
                        onClick={() => !isReviewing && setLiveTFAnswer(val)}
                        disabled={isReviewing}
                        className={clsx(
                          "w-full text-left rounded-xl border-2 transition-all overflow-hidden",
                          !showResult && !isSelected && "border-gray-200 hover:border-gray-300 bg-white",
                          !showResult && isSelected && "border-teal-500 bg-teal-50/30",
                          wasCorrect && "border-emerald-400 bg-emerald-50",
                          wasSelectedWrong && "border-rose-300 bg-rose-50",
                          showResult && !isCorrectOption && !isSelected && "border-gray-200 bg-white opacity-50"
                        )}
                      >
                        <div className="px-5 py-4 flex items-center gap-3">
                          <span className={clsx(
                            "shrink-0",
                            wasCorrect ? "text-emerald-600" : wasSelectedWrong ? "text-rose-500" : isSelected ? "text-teal-600" : "text-gray-400"
                          )}>
                            {icon}
                          </span>
                          <span className={clsx(
                            "text-base font-semibold",
                            wasCorrect ? "text-gray-800" : wasSelectedWrong ? "text-gray-700" : isSelected ? "text-gray-800" : "text-gray-600"
                          )}>
                            {label}
                          </span>
                        </div>

                        {wasSelectedWrong && currentQ.explanation && (
                          <div className="px-5 pb-4 pt-0">
                            <div className="flex items-start gap-2">
                              <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                              <p className="text-xs text-zinc-500" style={{ lineHeight: '1.5' }}>{currentQ.explanation}</p>
                            </div>
                          </div>
                        )}
                        {wasCorrect && showResult && currentQ.explanation && (
                          <div className="px-5 pb-4 pt-0">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                              <p className="text-xs text-zinc-500" style={{ lineHeight: '1.5' }}>{currentQ.explanation}</p>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Open / Write-In */}
              {(currentQ.question_type === 'open' || currentQ.question_type === 'fill_blank') && (
                <div className="mb-6">
                  <div className={clsx(
                    "rounded-xl border-2 overflow-hidden transition-all",
                    showResult && isCorrectResult && "border-emerald-400 bg-emerald-50",
                    showResult && !isCorrectResult && "border-rose-300 bg-rose-50",
                    !showResult && "border-zinc-200 bg-white"
                  )}>
                    <textarea
                      value={textAnswer}
                      onChange={(e) => setLiveTextInput(e.target.value)}
                      disabled={isReviewing}
                      placeholder="Escribe tu respuesta aqui..."
                      className="w-full px-5 py-4 text-sm text-zinc-800 bg-transparent resize-none outline-none placeholder:text-zinc-400 min-h-[100px]"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isReviewing) { e.preventDefault(); handleSubmitOpen(); } }}
                    />

                    {showResult && (
                      <div className="px-5 pb-4">
                        <div className="flex items-start gap-2">
                          {isCorrectResult ? (
                            <>
                              <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-emerald-600 mb-1" style={{ fontWeight: 600 }}>Respuesta correcta</p>
                                {currentQ.explanation && <p className="text-xs text-zinc-500" style={{ lineHeight: '1.5' }}>{currentQ.explanation}</p>}
                              </div>
                            </>
                          ) : (
                            <>
                              <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs text-rose-600 mb-1" style={{ fontWeight: 600 }}>Incorrecto</p>
                                <p className="text-xs text-zinc-600 mb-1">Respuesta esperada: <span className="text-zinc-800" style={{ fontWeight: 600 }}>{currentQ.correct_answer}</span></p>
                                {currentQ.explanation && <p className="text-xs text-zinc-500" style={{ lineHeight: '1.5' }}>{currentQ.explanation}</p>}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="shrink-0 border-t border-zinc-200 bg-white px-6 md:px-10 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          {/* Left: Back */}
          <div>
            {currentIdx > 0 ? (
              <button onClick={handlePrev} className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 transition-colors" style={{ fontWeight: 600 }}>
                <ChevronLeft size={16} /> Anterior
              </button>
            ) : (
              <div />
            )}
          </div>

          {/* Right: Submit / Next */}
          <div>
            {closingSession ? (
              <div className="px-6 py-2.5 rounded-xl text-sm bg-zinc-200 text-zinc-500 flex items-center gap-2" style={{ fontWeight: 600 }}>
                <Loader2 size={14} className="animate-spin" /> Finalizando...
              </div>
            ) : isReviewing ? (
              <button onClick={handleNext} className="px-6 py-2.5 rounded-xl text-sm bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/25 transition-all active:scale-[0.97]" style={{ fontWeight: 600 }}>
                {currentIdx < questions.length - 1 ? 'Siguiente' : (answeredCount >= questions.length ? 'Ver Resultado' : 'Siguiente')}
              </button>
            ) : (
              <button
                onClick={
                  currentQ.question_type === 'mcq' ? handleSubmitMC :
                  currentQ.question_type === 'true_false' ? handleSubmitTF :
                  handleSubmitOpen
                }
                disabled={
                  submittingAnswer ||
                  (currentQ.question_type === 'mcq' ? liveSelectedOption === null :
                   currentQ.question_type === 'true_false' ? !liveTFAnswer :
                   !liveTextInput.trim())
                }
                className={clsx(
                  "px-6 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2",
                  (currentQ.question_type === 'mcq' ? liveSelectedOption !== null :
                   currentQ.question_type === 'true_false' ? !!liveTFAnswer :
                   liveTextInput.trim())
                    ? "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/25 active:scale-[0.97]"
                    : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                )}
                style={{ fontWeight: 600 }}
              >
                {submittingAnswer && <Loader2 size={14} className="animate-spin" />}
                Verificar
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}