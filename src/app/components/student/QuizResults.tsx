// ============================================================
// Axon — Student: QuizResults (EV-3 Prompt B)
//
// Shows quiz results with:
//   - Score circle (X/Y + percentage)
//   - Grouped by keyword (and subtopic if available)
//   - Detail: each question with your answer vs correct
//   - BKT mastery level per keyword (green/yellow/red)
//   - "Practicar con IA" button per wrong answer
//   - Buttons: "Repetir quiz" / "Volver"
//
// Phase C additions:
//   - getBktStates() fetch on mount for mastery indicators
//   - getMasteryLevel() color mapping from aiApi
//   - AiPracticeModal for post-error practice
//
// Design: teal accent, motion animations (matching QuizView)
// ============================================================

import React, { useState, useMemo, useRef } from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import { generateSmartQuiz } from '@/app/services/quizApi';
import type { SmartGenerateResponse } from '@/app/services/quizApi';
import type { SavedAnswer, GroupStat } from '@/app/components/student/quiz-types';
import {
  QUESTION_TYPE_LABELS_SHORT,
  DIFFICULTY_LABELS,
  normalizeDifficulty,
  normalizeQuestionType,
} from '@/app/services/quizConstants';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  Trophy, CheckCircle2, XCircle, RotateCw, ChevronLeft,
  Clock, AlertCircle, ChevronDown, ChevronRight,
  Sparkles, Brain, X, Loader2, Minus, Plus,
} from 'lucide-react';
import { Confetti, focusRing } from '@/app/components/design-kit';
import { AiPracticeModal } from '@/app/components/student/AiPracticeModal';
import { AiReportButton } from '@/app/components/shared/AiReportButton';
import { KeywordMasterySection } from '@/app/components/student/KeywordMasterySection';
import { QuizErrorBoundary } from '@/app/components/student/QuizErrorBoundary';

// ── Props ────────────────────────────────────────────────

interface QuizResultsProps {
  questions: QuizQuestion[];
  savedAnswers: Record<number, SavedAnswer>;
  sessionStartTime: number;
  quizTitle: string;
  keywordMap?: Record<string, string>;
  onRestart: () => void;
  onBack: () => void;
  /** Optional: go back to session mode to review answered questions */
  onReview?: () => void;
  /** Optional: callback when adaptive quiz is generated and ready to start */
  onAdaptiveQuizReady?: (quizId: string, quizTitle: string) => void;
}

// ── Adaptive Quiz Modal States ───────────────────────────

type AdaptivePhase = 'idle' | 'config' | 'generating' | 'success' | 'error';

// ── Main Component ──────────────────────────────────────

export function QuizResults({
  questions,
  savedAnswers,
  sessionStartTime,
  quizTitle,
  keywordMap,
  onRestart,
  onBack,
  onReview,
  onAdaptiveQuizReady,
}: QuizResultsProps) {
  const [showDetail, setShowDetail] = useState(false);

  // ── Adaptive quiz state ─────────────────────────────
  const [adaptivePhase, setAdaptivePhase] = useState<AdaptivePhase>('idle');
  const [adaptiveCount, setAdaptiveCount] = useState(5);
  const [adaptiveResult, setAdaptiveResult] = useState<SmartGenerateResponse | null>(null);
  const [adaptiveError, setAdaptiveError] = useState('');
  const [adaptiveQuizId, setAdaptiveQuizId] = useState<string | null>(null);

  // Freeze duration at mount time so re-renders don't change it
  const durationSecRef = useRef(Math.round((Date.now() - sessionStartTime) / 1000));

  // Computed stats (single-pass memoized)
  const { correctCount, wrongCount, answeredCount } = useMemo(() => {
    let correct = 0, wrong = 0, answered = 0;
    for (const a of Object.values(savedAnswers)) {
      if (a.answered) {
        answered++;
        if (a.correct) correct++; else wrong++;
      }
    }
    return { correctCount: correct, wrongCount: wrong, answeredCount: answered };
  }, [savedAnswers]);

  const total = questions.length;
  const pct = total > 0 ? (correctCount / total) * 100 : 0;
  const durationSec = durationSecRef.current;
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;

  // Group by keyword_id
  const keywordGroups = useMemo(() => {
    const map = new Map<string, GroupStat>();

    questions.forEach((q, idx) => {
      const sa = savedAnswers[idx];
      const key = q.keyword_id || 'unknown';
      if (!map.has(key)) {
        const label = keywordMap?.[key] || `Keyword ${key.substring(0, 8)}`;
        map.set(key, { keywordId: key, label, total: 0, correct: 0 });
      }
      const entry = map.get(key)!;
      entry.total++;
      if (sa?.answered && sa.correct) entry.correct++;
    });

    return Array.from(map.values()).sort((a, b) => {
      const aPct = a.total > 0 ? a.correct / a.total : 0;
      const bPct = b.total > 0 ? b.correct / b.total : 0;
      return aPct - bPct; // weakest first
    });
  }, [questions, savedAnswers, keywordMap]);

  // Performance message
  const performanceMsg = pct >= 80
    ? 'Excelente resultado!'
    : pct >= 60
    ? 'Buen trabajo, sigue practicando!'
    : pct >= 40
    ? 'Puedes mejorar. Revisa los temas debiles.'
    : 'Necesitas repasar este tema.';

  const performanceColor = pct >= 70 ? '#0d9488' : pct >= 40 ? '#f59e0b' : '#ef4444';

  // AI Practice modal state
  const [practiceTarget, setPracticeTarget] = useState<{
    summaryId: string;
    keywordId: string;
    keywordName: string;
    wrongAnswer: string;
    originalQuestion: string;
  } | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full overflow-y-auto custom-scrollbar-light bg-zinc-50"
    >
      <div className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-2xl">

          {/* ── Trophy + Title ── */}
          <div className="text-center mb-8 relative">
            {/* Confetti for high scores */}
            {pct >= 70 && <Confetti show />}

            <motion.div
              className={clsx(
                'w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl',
                pct >= 70 ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/30' :
                pct >= 40 ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/25' :
                'bg-gradient-to-br from-rose-400 to-red-500 shadow-rose-500/25'
              )}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            >
              <Trophy size={44} className="text-white" />
            </motion.div>
            <h2 className="text-2xl text-zinc-900 mb-2" style={{ fontWeight: 700 }}>
              {pct >= 80 ? 'Excelente!' : pct >= 60 ? 'Buen trabajo!' : 'Quiz completado'}
            </h2>
            <p className="text-sm text-zinc-500 mb-1">{quizTitle}</p>
            <p className="text-sm text-zinc-400 flex items-center justify-center gap-2">
              <Clock size={14} /> {minutes}m {seconds}s
            </p>
          </div>

          {/* ── Score Circle ── */}
          <div className="flex justify-center mb-8">
            <motion.div
              className="relative w-48 h-48"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring' }}
            >
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="84" stroke="#e4e4e7" strokeWidth="12" fill="none" />
                <motion.circle
                  cx="96" cy="96" r="84"
                  stroke={performanceColor}
                  strokeWidth="12" fill="none" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 84}
                  initial={{ strokeDashoffset: 2 * Math.PI * 84 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 84 * (1 - pct / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  className="text-4xl text-zinc-900"
                  style={{ fontWeight: 700 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  {pct.toFixed(0)}%
                </motion.span>
                <span className="text-xs text-zinc-400 uppercase tracking-wider mt-1" style={{ fontWeight: 700 }}>
                  {correctCount}/{total}
                </span>
              </div>
            </motion.div>
          </div>

          {/* ── Summary Stats ── */}
          <motion.div
            className="flex items-center justify-center gap-4 mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm" style={{ fontWeight: 600 }}>
              <CheckCircle2 size={16} /> {correctCount} correctas
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-500 text-sm" style={{ fontWeight: 600 }}>
              <XCircle size={16} /> {wrongCount} incorrectas
            </div>
            {answeredCount < total && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-400 text-sm" style={{ fontWeight: 600 }}>
                <AlertCircle size={16} /> {total - answeredCount} sin respuesta
              </div>
            )}
          </motion.div>
          <p className="text-center text-sm text-zinc-500 mb-8">{performanceMsg}</p>

          {/* ── Review answers button ── */}
          {onReview && (
            <button
              onClick={onReview}
              className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 transition-colors mb-2 mx-auto px-4 py-2 rounded-xl hover:bg-teal-50"
              style={{ fontWeight: 600 }}
            >
              Revisar respuestas
            </button>
          )}

          {/* ── Keyword Mastery Section (BKT + keyword groups) ── */}
          <KeywordMasterySection
            questions={questions}
            keywordGroups={keywordGroups}
          />

          {/* ── Detail Toggle ── */}
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 transition-colors mb-4 mx-auto px-4 py-2 rounded-xl hover:bg-teal-50"
            style={{ fontWeight: 600 }}
          >
            {showDetail ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {showDetail ? 'Ocultar detalle' : 'Ver detalle de respuestas'}
          </button>

          {/* ── Detailed Answers ── */}
          <AnimatePresence>
            {showDetail && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 mb-8">
                  {questions.map((q, idx) => {
                    const sa = savedAnswers[idx];
                    const answered = sa?.answered;
                    const correct = sa?.correct;
                    const userAnswer = sa?.answer || '(sin respuesta)';
                    const diffKey = normalizeDifficulty(q.difficulty);
                    const questionTypeKey = normalizeQuestionType(q.question_type);

                    return (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={clsx(
                          'rounded-2xl border px-5 py-4 bg-white shadow-sm',
                          answered && correct ? 'border-emerald-200' :
                          answered && !correct ? 'border-rose-200' :
                          'border-zinc-200'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Status icon */}
                          <div className="mt-0.5 shrink-0">
                            {answered && correct ? (
                              <CheckCircle2 size={16} className="text-emerald-500" />
                            ) : answered && !correct ? (
                              <XCircle size={16} className="text-rose-500" />
                            ) : (
                              <AlertCircle size={16} className="text-gray-300" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded" style={{ fontWeight: 600 }}>
                                #{idx + 1}
                              </span>
                              <span className="text-[9px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200" style={{ fontWeight: 600 }}>
                                {QUESTION_TYPE_LABELS_SHORT[questionTypeKey]}
                              </span>
                              <span className={clsx(
                                'text-[9px] px-1.5 py-0.5 rounded border',
                                diffKey === 'easy' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                                diffKey === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                                'text-red-600 bg-red-50 border-red-200'
                              )} style={{ fontWeight: 600 }}>
                                {DIFFICULTY_LABELS[diffKey]}
                              </span>
                              {sa?.timeTakenMs && (
                                <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                                  <Clock size={9} /> {(sa.timeTakenMs / 1000).toFixed(1)}s
                                </span>
                              )}
                            </div>

                            {/* Question text */}
                            <p className="text-[12px] text-gray-800 mb-2" style={{ lineHeight: '1.5' }}>
                              {q.question}
                            </p>

                            {/* Answer comparison */}
                            {answered && (
                              <div className="space-y-1">
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] text-gray-400 shrink-0 mt-0.5 w-[70px]" style={{ fontWeight: 600 }}>
                                    Tu resp:
                                  </span>
                                  <span className={clsx(
                                    'text-[11px]',
                                    correct ? 'text-emerald-700' : 'text-rose-600'
                                  )} style={{ fontWeight: 500 }}>
                                    {q.question_type === 'true_false'
                                      ? (userAnswer === 'true' ? 'Verdadero' : 'Falso')
                                      : userAnswer
                                    }
                                  </span>
                                </div>
                                {!correct && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-[10px] text-gray-400 shrink-0 mt-0.5 w-[70px]" style={{ fontWeight: 600 }}>
                                      Correcta:
                                    </span>
                                    <span className="text-[11px] text-emerald-700" style={{ fontWeight: 600 }}>
                                      {q.question_type === 'true_false'
                                        ? (q.correct_answer === 'true' ? 'Verdadero' : 'Falso')
                                        : q.correct_answer
                                      }
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Explanation */}
                            {q.explanation && answered && !correct && (
                              <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-[11px] text-blue-700" style={{ lineHeight: '1.5' }}>
                                {q.explanation}
                              </div>
                            )}

                            {/* AI Practice button — only for wrong answers */}
                            {answered && !correct && q.summary_id && (
                              <button
                                onClick={() => setPracticeTarget({
                                  summaryId: q.summary_id,
                                  keywordId: q.keyword_id,
                                  keywordName: keywordMap?.[q.keyword_id] || 'Concepto',
                                  wrongAnswer: userAnswer,
                                  originalQuestion: q.question,
                                })}
                                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-violet-600 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors"
                                style={{ fontWeight: 600 }}
                              >
                                <Sparkles size={10} />
                                Practicar este error con IA
                              </button>
                            )}

                            {/* Fase D: Report button — only for AI-generated questions */}
                            <AiReportButton
                              contentId={q.id}
                              contentType="quiz_question"
                              source={q.source}
                            />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Action Buttons ── */}
          <div className="flex gap-4 justify-center pt-6 pb-4">
            <motion.button
              onClick={onBack}
              className={`px-6 py-3 rounded-xl text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 bg-white hover:shadow-md transition-all ${focusRing}`}
              style={{ fontWeight: 700 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="flex items-center gap-2">
                <ChevronLeft size={18} />
                Volver
              </div>
            </motion.button>
            <motion.button
              onClick={onRestart}
              className={`px-8 py-3 rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-600/25 transition-all inline-flex items-center gap-3 ${focusRing}`}
              style={{ fontWeight: 700 }}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <RotateCw size={18} /> Repetir quiz
            </motion.button>
          </div>

          {/* ── Adaptive Quiz CTA ── */}
          {onAdaptiveQuizReady && questions[0]?.summary_id && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="flex justify-center pb-8"
            >
              <button
                onClick={() => setAdaptivePhase('config')}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm text-violet-600 bg-violet-50 border border-violet-200 hover:bg-violet-100 hover:border-violet-300 transition-all"
                style={{ fontWeight: 600 }}
              >
                <Brain size={16} />
                Crear quiz adaptativo con IA
                <Sparkles size={14} className="text-violet-400" />
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Adaptive Quiz Modal ── */}
      <AnimatePresence>
        {adaptivePhase !== 'idle' && (
          <AdaptiveQuizModal
            phase={adaptivePhase}
            count={adaptiveCount}
            result={adaptiveResult}
            error={adaptiveError}
            summaryId={questions[0]?.summary_id || ''}
            onChangeCount={setAdaptiveCount}
            onGenerate={async () => {
              setAdaptivePhase('generating');
              setAdaptiveError('');
              try {
                const summaryId = questions[0]?.summary_id;
                if (!summaryId) throw new Error('No se pudo determinar el resumen.');

                // Fase 8G: Server-side quiz creation via auto_create_quiz
                const now = new Date();
                const title = `Quiz Adaptativo \u2014 ${now.toLocaleDateString('es', { day: '2-digit', month: 'short' })} ${now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;

                const result = await generateSmartQuiz({
                  action: 'quiz_question',
                  summary_id: summaryId,
                  count: adaptiveCount,
                  auto_create_quiz: true,
                  quiz_title: title,
                });

                setAdaptiveResult(result);

                const createdQuizId = result._meta?.quiz_id;
                if (createdQuizId) {
                  setAdaptiveQuizId(createdQuizId);
                }

                if (result.items.length === 0) {
                  let errorDetail = '';
                  if (result.errors && result.errors.length > 0) {
                    const uniqueErrors = [...new Set(result.errors.map(e => e.error))];
                    errorDetail = uniqueErrors.length === 1
                      ? uniqueErrors[0]
                      : uniqueErrors.map((e, i) => `${i + 1}. ${e}`).join('\n');
                  }

                  if (errorDetail.includes('rate limit') || errorDetail.includes('429')) {
                    setAdaptiveError('Limite de generacion alcanzado. Espera unos minutos antes de intentar de nuevo.');
                  } else if (errorDetail.includes('timeout') || errorDetail.includes('Timeout')) {
                    setAdaptiveError('La generacion tardo demasiado. Intenta con menos preguntas.');
                  } else if (errorDetail) {
                    setAdaptiveError(`No se pudieron generar preguntas: ${errorDetail}`);
                  } else {
                    setAdaptiveError(
                      `No se generaron preguntas (${result._meta?.total_attempted || 0} intentadas, ${result._meta?.total_failed || 0} fallidas). ` +
                      'Verifica que el resumen tenga keywords con subtopics asignados.'
                    );
                  }
                  setAdaptivePhase('error');
                } else if (!createdQuizId) {
                  setAdaptiveError('Quiz generado pero no se recibio quiz_id. Contacta soporte.');
                  setAdaptivePhase('error');
                } else {
                  setAdaptivePhase('success');
                }
              } catch (err) {
                const msg = err instanceof Error ? err.message : 'Error al generar el quiz.';
                if (msg.includes('429') || msg.includes('rate limit') || msg.includes('Rate limit')) {
                  setAdaptiveError('Limite de solicitudes alcanzado. Espera unos minutos e intenta de nuevo.');
                } else if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('aborted')) {
                  setAdaptiveError('La generacion tardo demasiado (>2 min). Intenta con menos preguntas o verifica tu conexion.');
                } else if (msg.includes('404') || msg.includes('not found') || msg.includes('No keywords')) {
                  setAdaptiveError('No se encontraron keywords o subtopics para este resumen. Pide a tu profesor que agregue contenido.');
                } else if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('permission')) {
                  setAdaptiveError('No tienes permisos para generar en este resumen. Verifica tu membresia.');
                } else {
                  setAdaptiveError(msg);
                }
                setAdaptivePhase('error');
              }
            }}
            onStart={() => {
              if (adaptiveQuizId && onAdaptiveQuizReady) {
                const title = adaptiveResult?._meta?.quiz_id
                  ? `Quiz Adaptativo (${adaptiveResult.items.length} preguntas)`
                  : 'Quiz Adaptativo';
                setAdaptivePhase('idle');
                onAdaptiveQuizReady(adaptiveQuizId, title);
              }
            }}
            onClose={() => {
              setAdaptivePhase('idle');
              setAdaptiveResult(null);
              setAdaptiveError('');
              setAdaptiveQuizId(null);
            }}
            onRetry={() => setAdaptivePhase('config')}
          />
        )}
      </AnimatePresence>

      {/* AI Practice Modal — wrapped with ErrorBoundary (FIX H8-6) */}
      <AnimatePresence>
        {practiceTarget && (
          <QuizErrorBoundary label="Practica con IA">
            <AiPracticeModal
              summaryId={practiceTarget.summaryId}
              keywordId={practiceTarget.keywordId}
              keywordName={practiceTarget.keywordName}
              wrongAnswer={practiceTarget.wrongAnswer}
              originalQuestion={practiceTarget.originalQuestion}
              onClose={() => setPracticeTarget(null)}
            />
          </QuizErrorBoundary>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Adaptive Quiz Modal (sub-component) ──────────────────

interface AdaptiveQuizModalProps {
  phase: AdaptivePhase;
  count: number;
  result: SmartGenerateResponse | null;
  error: string;
  summaryId: string;
  onChangeCount: (n: number) => void;
  onGenerate: () => void;
  onStart: () => void;
  onClose: () => void;
  onRetry: () => void;
}

function AdaptiveQuizModal({
  phase, count, result, error,
  onChangeCount, onGenerate, onStart, onClose, onRetry,
}: AdaptiveQuizModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && phase !== 'generating') onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm text-zinc-900" style={{ fontWeight: 700 }}>Quiz Adaptativo</h3>
              <p className="text-[11px] text-zinc-400">Generado por IA segun tu dominio BKT</p>
            </div>
          </div>
          {phase !== 'generating' && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              <X size={16} className="text-zinc-400" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* CONFIG phase */}
          {phase === 'config' && (
            <div className="space-y-5">
              <p className="text-[12px] text-zinc-500" style={{ lineHeight: '1.6' }}>
                La IA analizara tu perfil de dominio (BKT) y generara preguntas enfocadas
                en los subtemas donde mas necesitas practicar.
              </p>

              {/* Counter */}
              <div>
                <label className="text-[11px] text-zinc-500 mb-2 block" style={{ fontWeight: 600 }}>
                  Numero de preguntas
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onChangeCount(Math.max(1, count - 1))}
                    disabled={count <= 1}
                    className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-30 transition-all"
                  >
                    <Minus size={14} />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl text-zinc-900" style={{ fontWeight: 700 }}>{count}</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      ~{Math.ceil(count * 8)} seg de generacion
                    </p>
                  </div>
                  <button
                    onClick={() => onChangeCount(Math.min(10, count + 1))}
                    disabled={count >= 10}
                    className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 disabled:opacity-30 transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Info pills */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200" style={{ fontWeight: 600 }}>
                  Prioriza temas debiles
                </span>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200" style={{ fontWeight: 600 }}>
                  Dificultad adaptativa
                </span>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200" style={{ fontWeight: 600 }}>
                  Unico por sesion
                </span>
              </div>

              <button
                onClick={onGenerate}
                className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-600/25 transition-all inline-flex items-center justify-center gap-2"
                style={{ fontWeight: 700 }}
              >
                <Sparkles size={16} />
                Generar quiz adaptativo
              </button>
            </div>
          )}

          {/* GENERATING phase */}
          {phase === 'generating' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <Loader2 size={28} className="animate-spin text-violet-500" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles size={10} className="text-white" />
                </motion.div>
              </div>
              <div className="text-center">
                <p className="text-sm text-zinc-700" style={{ fontWeight: 600 }}>Generando preguntas...</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Analizando BKT y creando {count} preguntas adaptativas
                </p>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                  initial={{ width: '5%' }}
                  animate={{ width: '85%' }}
                  transition={{ duration: count * 6, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* SUCCESS phase */}
          {phase === 'success' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm text-emerald-700" style={{ fontWeight: 600 }}>
                    Quiz listo! {result.items.length} preguntas generadas
                  </p>
                  {result.errors.length > 0 && (
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      {result.errors.length} pregunta(s) no se pudieron generar
                    </p>
                  )}
                </div>
              </div>

              {/* Generated items summary */}
              <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar-light">
                {result.items.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 text-[11px]">
                    <span className="text-zinc-400" style={{ fontWeight: 600 }}>#{i + 1}</span>
                    <span className="text-zinc-600 truncate flex-1">{item.keyword_name}</span>
                    {item._smart.target_subtopic && (
                      <span className="text-violet-500 shrink-0 truncate max-w-[120px]" style={{ fontWeight: 500 }}>
                        {item._smart.target_subtopic}
                      </span>
                    )}
                    <span className={clsx(
                      'text-[9px] px-1.5 py-0.5 rounded-full shrink-0',
                      item._smart.p_know < 0.5 ? 'bg-red-50 text-red-500' :
                      item._smart.p_know < 0.8 ? 'bg-amber-50 text-amber-500' :
                      'bg-emerald-50 text-emerald-500'
                    )} style={{ fontWeight: 700 }}>
                      {Math.round(item._smart.p_know * 100)}%
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={onStart}
                className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-600/25 transition-all inline-flex items-center justify-center gap-2"
                style={{ fontWeight: 700 }}
              >
                Empezar quiz adaptativo
              </button>
            </div>
          )}

          {/* ERROR phase */}
          {phase === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200">
                <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-rose-700" style={{ fontWeight: 600 }}>Error al generar</p>
                  <p className="text-[11px] text-rose-500 mt-0.5">{error}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-all text-sm"
                  style={{ fontWeight: 600 }}
                >
                  Cerrar
                </button>
                <button
                  onClick={onRetry}
                  className="flex-1 py-2.5 rounded-xl text-white bg-violet-600 hover:bg-violet-700 transition-all text-sm inline-flex items-center justify-center gap-2"
                  style={{ fontWeight: 600 }}
                >
                  <RotateCw size={14} /> Reintentar
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default QuizResults;
