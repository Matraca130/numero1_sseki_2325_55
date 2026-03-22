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
// P1-S01: AdaptiveQuizModal extracted to AdaptiveQuizModal.tsx
// P2-S02: useAdaptiveQuiz hook + QuizAnswerDetail extracted
// G4: XP earned estimate card (XP awarded server-side via afterWrite hooks)
// Q-UX1: Premium post-quiz feedback with server-confirmed XP + badges + level-up
//
// Design: teal accent, motion animations (matching QuizView)
// ============================================================

import React, { useState, useMemo, useRef } from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import type { SavedAnswer, GroupStat } from '@/app/components/student/quiz-types';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  Trophy, CheckCircle2, XCircle, RotateCw, ChevronLeft,
  Clock, AlertCircle, ChevronDown, ChevronRight,
  Sparkles, Brain, Flame,
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

// ── Hooks (P2-S02 extraction) ────────────────────────────
import { useAdaptiveQuiz } from '@/app/components/student/useAdaptiveQuiz';

// ── R13: QuizScoreCircle component ─────────────────────
import { QuizScoreCircle } from '@/app/components/student/QuizScoreCircle';

// ── Gamification bridge (G4 → Q-UX1 Premium) ────────────
// XP is awarded server-side via afterWrite hooks — frontend only DISPLAYS.
// Q-UX1: Now with server-confirmed XP, badge toasts, and level-up celebration.
import { XP_TABLE } from '@/app/types/gamification';
import { useGamification } from '@/app/context/GamificationContext';
import { useQuizGamificationFeedback } from '@/app/components/student/useQuizGamificationFeedback';
import { QuizXpConfirmedCard } from '@/app/components/student/QuizXpConfirmedCard';
import { BadgeEarnedToast } from '@/app/components/gamification/BadgeEarnedToast';
import { LevelUpCelebration } from '@/app/components/gamification/LevelUpCelebration';

// ── P-PERF: Stable style constants for streak badges ─────
const STREAK_STYLE_ACTIVE = {
  background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
  border: '1px solid #86efac',
  color: '#16a34a',
  fontWeight: 600,
} as const;

const STREAK_STYLE_AT_RISK = {
  background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
  border: '1px solid #fca5a5',
  color: '#dc2626',
  fontWeight: 600,
} as const;

const STREAK_STYLE_DEFAULT = {
  background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
  border: '1px solid #fdba74',
  color: '#ea580c',
  fontWeight: 600,
} as const;

// ── Props ────────────────────────────────────────────────

interface QuizResultsProps {
  questions: QuizQuestion[];
  savedAnswers: Record<number, SavedAnswer>;
  sessionStartTime: number;
  quizTitle: string;
  keywordMap?: Record<string, string>;
  /** Pre-computed stats from useQuizSession (avoids recomputation) */
  correctCount: number;
  wrongCount: number;
  answeredCount: number;
  onRestart: () => void;
  onBack: () => void;
  onReview?: () => void;
  onAdaptiveQuizReady?: (quizId: string, quizTitle: string) => void;
}

// ── Main Component ─────────────────────────────────────

export function QuizResults({
  questions, savedAnswers, sessionStartTime, quizTitle,
  keywordMap, correctCount, wrongCount, answeredCount,
  onRestart, onBack, onReview, onAdaptiveQuizReady,
}: QuizResultsProps) {
  const [showDetail, setShowDetail] = useState(false);

  // ── Adaptive quiz (P2-S02: extracted to hook) ───────────
  const adaptive = useAdaptiveQuiz();

  // Freeze duration at mount time
  const durationSecRef = useRef(Math.round((Date.now() - sessionStartTime) / 1000));

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
      return aPct - bPct;
    });
  }, [questions, savedAnswers, keywordMap]);

  const performanceMsg = pct >= 80 ? 'Excelente resultado!'
    : pct >= 60 ? 'Buen trabajo, sigue practicando!'
    : pct >= 40 ? 'Puedes mejorar. Revisa los temas debiles.'
    : 'Necesitas repasar este tema.';
  const performanceColor = pct >= 70 ? '#0d9488' : pct >= 40 ? '#f59e0b' : '#ef4444';

  // AI Practice modal state
  const [practiceTarget, setPracticeTarget] = useState<{
    summaryId: string; keywordId: string; keywordName: string;
    wrongAnswer: string; originalQuestion: string;
  } | null>(null);

  // ── G4 → Q-UX1: Gamification feedback (premium) ──────────
  const gamification = useGamification();
  const feedback = useQuizGamificationFeedback();
  const xpEstimate = useMemo(() => {
    const answerXp = answeredCount * (XP_TABLE.quiz_answer ?? 5);
    const correctXp = correctCount * (XP_TABLE.quiz_correct ?? 15);
    return answerXp + correctXp;
  }, [answeredCount, correctCount]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full overflow-y-auto custom-scrollbar-light bg-axon-page"
    >
      <div className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-2xl">

          {/* ── Trophy + Title ── */}
          <div className="text-center mb-8 relative">
            {pct >= 70 && <Confetti show />}

            {/* ── P9: Certificate (>=80%) ── */}
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
                pct >= 70 ? 'bg-gradient-to-br from-axon-ring-start to-axon-ring-end shadow-axon-ring-end/30' :
                pct >= 40 ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/25' :
                'bg-gradient-to-br from-rose-400 to-red-500 shadow-rose-500/25'
              )}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            >
              <Trophy size={44} className="text-white" />
            </motion.div>
            <h2 className="text-[clamp(1.25rem,2.5vw,1.5rem)] text-zinc-900 mb-2" style={{ fontWeight: 700 }}>
              {pct >= 80 ? 'Excelente!' : pct >= 60 ? 'Buen trabajo!' : 'Quiz completado'}
            </h2>
            <p className="text-sm text-zinc-500 mb-1">{quizTitle}</p>
            <p className="text-sm text-zinc-400 flex items-center justify-center gap-2">
              <Clock size={14} /> {minutes}m {seconds}s
            </p>
          </div>

          {/* ── Score Circle ── */}
          <div className="flex justify-center mb-8">
            <QuizScoreCircle
              percentage={pct}
              correctCount={correctCount}
              totalCount={total}
              color={performanceColor}
            />
          </div>

          {/* ── Q-UX1: XP Confirmed Card (replaces basic G4 card) ── */}
          <QuizXpConfirmedCard
            xpEstimate={xpEstimate}
            confirmedXp={feedback.confirmedXpDelta}
            isConfirmed={feedback.isConfirmed}
            isLoading={feedback.isLoading}
            answeredCount={answeredCount}
            correctCount={correctCount}
          />

          {/* ── G4: Streak Indicator ── */}
          {gamification.streak && !gamification.loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex items-center justify-center gap-2 mb-6"
            >
              {gamification.streak.studied_today ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]"
                  style={STREAK_STYLE_ACTIVE}
                >
                  <Flame size={12} />
                  <span>Racha: {gamification.streak.current_streak} {gamification.streak.current_streak === 1 ? 'dia' : 'dias'}</span>
                  <CheckCircle2 size={10} />
                </div>
              ) : gamification.streak.streak_at_risk ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]"
                  style={STREAK_STYLE_AT_RISK}
                >
                  <Flame size={12} />
                  <span>Racha en riesgo! Estudia hoy</span>
                </div>
              ) : gamification.streak.current_streak > 0 ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]"
                  style={STREAK_STYLE_DEFAULT}
                >
                  <Flame size={12} />
                  <span>Racha: {gamification.streak.current_streak} {gamification.streak.current_streak === 1 ? 'dia' : 'dias'}</span>
                </div>
              ) : null}
            </motion.div>
          )}

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
              className="flex items-center gap-2 text-sm text-axon-accent hover:text-axon-hover transition-colors mb-2 mx-auto px-4 py-2 rounded-xl hover:bg-axon-accent-10"
              style={{ fontWeight: 600 }}
            >
              Revisar respuestas
            </button>
          )}

          {/* ── Keyword Mastery Section ── */}
          <KeywordMasterySection questions={questions} keywordGroups={keywordGroups} />

          {/* ── Subtopic Grouping Section (P4) ── */}
          <SubtopicResultsSection
            questions={questions}
            savedAnswers={savedAnswers}
            keywordMap={keywordMap}
          />

          {/* ── Detail Toggle ── */}
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-2 text-sm text-axon-accent hover:text-axon-hover transition-colors mb-4 mx-auto px-4 py-2 rounded-xl hover:bg-axon-accent-10"
            style={{ fontWeight: 600 }}
          >
            {showDetail ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {showDetail ? 'Ocultar detalle' : 'Ver detalle de respuestas'}
          </button>

          {/* ── Detailed Answers (P2-S02: extracted) ── */}
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
                <ChevronLeft size={18} /> Volver
              </div>
            </motion.button>
            <motion.button
              onClick={onRestart}
              className={`px-8 py-3 rounded-xl text-white bg-axon-dark hover:bg-axon-hover shadow-lg shadow-axon-dark/25 transition-all inline-flex items-center gap-3 ${focusRing}`}
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
              className="flex justify-center pb-4"
            >
              <button
                onClick={() => adaptive.setPhase('config')}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm text-teal-600 bg-teal-50 border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-all"
                style={{ fontWeight: 600 }}
              >
                <Brain size={16} />
                Crear quiz adaptativo con IA
                <Sparkles size={14} className="text-teal-400" />
              </button>
            </motion.div>
          )}

          {/* ── Quiz History Panel (P4) ── */}
          <QuizHistoryPanel />
        </div>
      </div>

      {/* ── Adaptive Quiz Modal ── */}
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
                // Capture values before reset clears them
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

      {/* ── Q-UX1: Badge Earned Toast (premium) ── */}
      <BadgeEarnedToast
        badges={feedback.earnedBadges}
        onDismiss={feedback.dismissBadges}
      />

      {/* ── Q-UX1: Level Up Celebration (premium) ── */}
      <LevelUpCelebration
        newLevel={feedback.levelUp?.newLevel ?? 1}
        previousLevel={feedback.levelUp?.previousLevel ?? 1}
        show={feedback.showLevelCelebration}
        onClose={feedback.dismissLevelUp}
      />
    </motion.div>
  );
}

export default QuizResults;
