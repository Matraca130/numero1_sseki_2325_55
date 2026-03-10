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
// P1-S01: AdaptiveQuizModal extracted to AdaptiveQuizModal.tsx
// P2-S02: useAdaptiveQuiz hook + QuizAnswerDetail extracted
// ============================================================

import React, { useState, useMemo, useRef } from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import type { SavedAnswer, GroupStat } from '@/app/components/student/quiz-types';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  Trophy, CheckCircle2, XCircle, RotateCw, ChevronLeft,
  Clock, AlertCircle, ChevronDown, ChevronRight,
  Sparkles, Brain,
} from 'lucide-react';
import { Confetti, focusRing } from '@/app/components/design-kit';
import { AiPracticeModal } from '@/app/components/student/AiPracticeModal';
import { KeywordMasterySection } from '@/app/components/student/KeywordMasterySection';
import { QuizErrorBoundary } from '@/app/components/student/QuizErrorBoundary';
import { AdaptiveQuizModal } from '@/app/components/student/AdaptiveQuizModal';
import { QuizAnswerDetail } from '@/app/components/student/QuizAnswerDetail';
import { SubtopicResultsSection } from '@/app/components/student/SubtopicResultsSection';
import { QuizHistoryPanel } from '@/app/components/student/QuizHistoryPanel';
import { QuizCertificate } from '@/app/components/student/QuizCertificate';

import { useAdaptiveQuiz } from '@/app/components/student/useAdaptiveQuiz';

// ── Props ──────────────────────────────────────────────

interface QuizResultsProps {
  questions: QuizQuestion[];
  savedAnswers: Record<number, SavedAnswer>;
  sessionStartTime: number;
  quizTitle: string;
  keywordMap?: Record<string, string>;
  correctCount: number;
  wrongCount: number;
  answeredCount: number;
  onRestart: () => void;
  onBack: () => void;
  onReview?: () => void;
  onAdaptiveQuizReady?: (quizId: string, quizTitle: string) => void;
}

// ── Main Component ───────────────────────────────────────

export function QuizResults({
  questions, savedAnswers, sessionStartTime, quizTitle,
  keywordMap, correctCount, wrongCount, answeredCount,
  onRestart, onBack, onReview, onAdaptiveQuizReady,
}: QuizResultsProps) {
  const [showDetail, setShowDetail] = useState(false);
  const adaptive = useAdaptiveQuiz();
  const durationSecRef = useRef(Math.round((Date.now() - sessionStartTime) / 1000));

  const total = questions.length;
  const pct = total > 0 ? (correctCount / total) * 100 : 0;
  const durationSec = durationSecRef.current;
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;

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
      return aPct - bPct;
    });
  }, [questions, savedAnswers, keywordMap]);

  const performanceMsg = pct >= 80 ? 'Excelente resultado!'
    : pct >= 60 ? 'Buen trabajo, sigue practicando!'
    : pct >= 40 ? 'Puedes mejorar. Revisa los temas debiles.'
    : 'Necesitas repasar este tema.';
  const performanceColor = pct >= 70 ? '#0d9488' : pct >= 40 ? '#f59e0b' : '#ef4444';

  const [practiceTarget, setPracticeTarget] = useState<{
    summaryId: string; keywordId: string; keywordName: string;
    wrongAnswer: string; originalQuestion: string;
  } | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full overflow-y-auto custom-scrollbar-light bg-zinc-50"
    >
      <div className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-2xl">

          {/* Trophy + Title */}
          <div className="text-center mb-8 relative">
            {pct >= 70 && <Confetti show />}

            <QuizCertificate
              quizTitle={quizTitle}
              score={Math.round(pct)}
              correctCount={correctCount}
              totalQuestions={total}
              durationSec={durationSec}
            />

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

          {/* Score Circle */}
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

          {/* Summary Stats */}
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

          {onReview && (
            <button
              onClick={onReview}
              className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 transition-colors mb-2 mx-auto px-4 py-2 rounded-xl hover:bg-teal-50"
              style={{ fontWeight: 600 }}
            >
              Revisar respuestas
            </button>
          )}

          <KeywordMasterySection questions={questions} keywordGroups={keywordGroups} />

          <SubtopicResultsSection
            questions={questions}
            savedAnswers={savedAnswers}
            keywordMap={keywordMap}
          />

          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 transition-colors mb-4 mx-auto px-4 py-2 rounded-xl hover:bg-teal-50"
            style={{ fontWeight: 600 }}
          >
            {showDetail ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {showDetail ? 'Ocultar detalle' : 'Ver detalle de respuestas'}
          </button>

          <AnimatePresence>
            {showDetail && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <QuizAnswerDetail
                  questions={questions}
                  savedAnswers={savedAnswers}
                  keywordMap={keywordMap}
                  onPractice={setPracticeTarget}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center pt-6 pb-4">
            <motion.button
              onClick={onBack}
              className={`px-6 py-3 rounded-xl text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 bg-white hover:shadow-md transition-all ${focusRing}`}
              style={{ fontWeight: 700 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="flex items-center gap-2">
                <ChevronLeft size={18} /> Volver
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

          {/* Adaptive Quiz CTA */}
          {onAdaptiveQuizReady && questions[0]?.summary_id && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="flex justify-center pb-4"
            >
              <button
                onClick={() => adaptive.setPhase('config')}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm text-violet-600 bg-violet-50 border border-violet-200 hover:bg-violet-100 hover:border-violet-300 transition-all"
                style={{ fontWeight: 600 }}
              >
                <Brain size={16} />
                Crear quiz adaptativo con IA
                <Sparkles size={14} className="text-violet-400" />
              </button>
            </motion.div>
          )}

          <QuizHistoryPanel />
        </div>
      </div>

      {/* Adaptive Quiz Modal */}
      <AnimatePresence>
        {adaptive.phase !== 'idle' && (
          <AdaptiveQuizModal
            phase={adaptive.phase}
            count={adaptive.count}
            result={adaptive.result}
            error={adaptive.error}
            onChangeCount={adaptive.setCount}
            onGenerate={() => adaptive.generate(questions[0]?.summary_id || '')}
            onStart={() => {
              if (adaptive.quizId && onAdaptiveQuizReady) {
                const id = adaptive.quizId;
                const title = adaptive.result?.items.length
                  ? `Quiz Adaptativo (${adaptive.result.items.length} preguntas)`
                  : 'Quiz Adaptativo';
                adaptive.reset();
                onAdaptiveQuizReady(id, title);
              }
            }}
            onClose={adaptive.reset}
            onRetry={() => adaptive.setPhase('config')}
          />
        )}
      </AnimatePresence>

      {/* AI Practice Modal */}
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

export default QuizResults;
