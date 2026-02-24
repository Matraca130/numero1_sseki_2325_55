// ============================================================
// Axon — Student: QuizResults (EV-3 Prompt B)
//
// Shows quiz results with:
//   - Score circle (X/Y + percentage)
//   - Grouped by keyword (and subtopic if available)
//   - Detail: each question with your answer vs correct
//   - Buttons: "Repetir quiz" / "Volver"
//
// Design: teal accent, motion animations (matching QuizView)
// ============================================================

import React, { useState, useMemo } from 'react';
import type { QuizQuestion, QuestionType } from '@/app/services/quizApi';
import type { SavedAnswer } from '@/app/components/student/QuizTaker';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  Trophy, CheckCircle2, XCircle, RotateCw, ChevronLeft,
  Clock, AlertCircle, ChevronDown, ChevronRight, Target,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard';
const INT_TO_DIFFICULTY: Record<number, Difficulty> = { 1: 'easy', 2: 'medium', 3: 'hard' };
const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Facil', medium: 'Media', hard: 'Dificil' };

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: 'Opcion multiple',
  true_false: 'V/F',
  fill_blank: 'Completar',
  open: 'Abierta',
};

// ── Props ────────────────────────────────────────────────

interface QuizResultsProps {
  questions: QuizQuestion[];
  savedAnswers: Record<number, SavedAnswer>;
  sessionStartTime: number;
  quizTitle: string;
  onRestart: () => void;
  onBack: () => void;
}

// ── Grouped stats ────────────────────────────────────────

interface GroupStat {
  label: string;
  total: number;
  correct: number;
}

// ── Main Component ───────────────────────────────────────

export function QuizResults({
  questions,
  savedAnswers,
  sessionStartTime,
  quizTitle,
  onRestart,
  onBack,
}: QuizResultsProps) {
  const [showDetail, setShowDetail] = useState(false);

  // Computed stats
  const correctCount = Object.values(savedAnswers).filter(a => a.answered && a.correct).length;
  const wrongCount = Object.values(savedAnswers).filter(a => a.answered && !a.correct).length;
  const answeredCount = Object.values(savedAnswers).filter(a => a.answered).length;
  const total = questions.length;
  const pct = total > 0 ? (correctCount / total) * 100 : 0;
  const durationSec = Math.round((Date.now() - sessionStartTime) / 1000);
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;

  // Group by keyword_id
  const keywordGroups = useMemo(() => {
    const map = new Map<string, GroupStat>();

    questions.forEach((q, idx) => {
      const sa = savedAnswers[idx];
      const key = q.keyword_id || 'unknown';
      if (!map.has(key)) {
        // We don't have keyword names here — use a truncated ID
        // In production, pass keywords from parent for labels
        map.set(key, { label: `Keyword ${key.substring(0, 8)}`, total: 0, correct: 0 });
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
  }, [questions, savedAnswers]);

  // Performance message
  const performanceMsg = pct >= 80
    ? 'Excelente resultado!'
    : pct >= 60
    ? 'Buen trabajo, sigue practicando!'
    : pct >= 40
    ? 'Puedes mejorar. Revisa los temas debiles.'
    : 'Necesitas repasar este tema.';

  const performanceColor = pct >= 70 ? '#0d9488' : pct >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full overflow-y-auto bg-white"
    >
      <div className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-2xl">

          {/* ── Trophy + Title ── */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Trophy size={40} className="text-white" />
            </div>
            <h2 className="text-2xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
              Quiz completado!
            </h2>
            <p className="text-sm text-gray-500 mb-1">{quizTitle}</p>
            <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
              <Clock size={14} /> {minutes}m {seconds}s
            </p>
          </div>

          {/* ── Score Circle ── */}
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="84" stroke="#f1f5f9" strokeWidth="12" fill="none" />
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
                <span className="text-4xl text-gray-900" style={{ fontWeight: 700 }}>
                  {pct.toFixed(0)}%
                </span>
                <span className="text-xs text-gray-400 uppercase tracking-wider mt-1" style={{ fontWeight: 700 }}>
                  {correctCount}/{total}
                </span>
              </div>
            </div>
          </div>

          {/* ── Summary Stats ── */}
          <div className="flex items-center justify-center gap-6 mb-3">
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm" style={{ fontWeight: 600 }}>
              <CheckCircle2 size={16} /> {correctCount} correctas
            </div>
            <div className="flex items-center gap-1.5 text-rose-500 text-sm" style={{ fontWeight: 600 }}>
              <XCircle size={16} /> {wrongCount} incorrectas
            </div>
            {answeredCount < total && (
              <div className="flex items-center gap-1.5 text-gray-400 text-sm" style={{ fontWeight: 600 }}>
                <AlertCircle size={16} /> {total - answeredCount} sin respuesta
              </div>
            )}
          </div>
          <p className="text-center text-sm text-gray-500 mb-8">{performanceMsg}</p>

          {/* ── Grouped by Keyword ── */}
          {keywordGroups.length > 1 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} className="text-teal-500" />
                <h3 className="text-sm text-gray-700" style={{ fontWeight: 700 }}>Resultado por keyword</h3>
              </div>
              <div className="space-y-2">
                {keywordGroups.map((group, gi) => {
                  const groupPct = group.total > 0 ? (group.correct / group.total) * 100 : 0;
                  return (
                    <div key={gi} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] text-gray-700 truncate" style={{ fontWeight: 600 }}>
                            {group.label}
                          </span>
                          <span className={clsx(
                            'text-[11px] shrink-0',
                            groupPct >= 70 ? 'text-emerald-600' : groupPct >= 40 ? 'text-amber-600' : 'text-rose-500'
                          )} style={{ fontWeight: 700 }}>
                            {group.correct}/{group.total}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className={clsx(
                              'h-full rounded-full',
                              groupPct >= 70 ? 'bg-emerald-500' : groupPct >= 40 ? 'bg-amber-500' : 'bg-rose-400'
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${groupPct}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: gi * 0.1 }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Detail Toggle ── */}
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 transition-colors mb-4 mx-auto"
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
                    const diffKey = INT_TO_DIFFICULTY[q.difficulty] || 'medium';

                    return (
                      <div
                        key={q.id}
                        className={clsx(
                          'rounded-xl border px-4 py-3',
                          answered && correct ? 'border-emerald-200 bg-emerald-50/50' :
                          answered && !correct ? 'border-rose-200 bg-rose-50/50' :
                          'border-gray-200 bg-gray-50'
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
                                {QUESTION_TYPE_LABELS[q.question_type]}
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
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Action Buttons ── */}
          <div className="flex gap-4 justify-center pt-4 pb-8">
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              style={{ fontWeight: 700 }}
            >
              <div className="flex items-center gap-2">
                <ChevronLeft size={18} />
                Volver
              </div>
            </button>
            <button
              onClick={onRestart}
              className="px-8 py-3 rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-lg hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-3"
              style={{ fontWeight: 700 }}
            >
              <RotateCw size={18} /> Repetir quiz
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default QuizResults;
