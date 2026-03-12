// ============================================================
// Axon — Student Quiz: QuizTopBar
//
// Session header with back button, quiz title, difficulty
// badge, per-question timer, global session timer, question
// count badge, and close button.
// Extracted from QuizTaker in Phase 3 refactor.
// P4-S01: Added question count badge (answered/total)
// P4-S02: Added global session timer
// P7: Added per-question countdown timer
// ============================================================

import React, { useState, useEffect } from 'react';
import type { Difficulty } from '@/app/services/quizConstants';
import { DIFFICULTY_LABELS } from '@/app/services/quizConstants';
import { ChevronLeft, BookOpen, X, Clock, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { TimerDisplay } from '@/app/components/student/TimerDisplay';
import { QuizCountdownTimer } from '@/app/components/student/QuizCountdownTimer';

// ── Props ────────────────────────────────────────────────

export interface QuizTopBarProps {
  quizTitle: string;
  diffKey: Difficulty;
  questionStartTime: number;
  isReviewing: boolean;
  onBack: () => void;
  /** P4-S01: question count badge */
  answeredCount?: number;
  totalQuestions?: number;
  /** P4-S02: global session timer */
  sessionStartTime?: number;
  /** P7: per-question countdown (seconds). 0 = disabled */
  countdownSec?: number;
  /** P7: reset key for countdown (changes per question) */
  countdownResetKey?: number;
  /** P7: called when countdown reaches zero */
  onCountdownTimeout?: () => void;
}

// ── Global Timer (P4-S02) ──────────────────────────────

function SessionTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <span className="flex items-center gap-1 text-[10px] text-zinc-400 tabular-nums bg-zinc-100 px-2 py-0.5 rounded-full">
      <Clock size={10} />
      {mins}:{String(secs).padStart(2, '0')}
    </span>
  );
}

// ── Component ────────────────────────────────────────────

export const QuizTopBar = React.memo(function QuizTopBar({
  quizTitle,
  diffKey,
  questionStartTime,
  isReviewing,
  onBack,
  answeredCount,
  totalQuestions,
  sessionStartTime,
  countdownSec,
  countdownResetKey,
  onCountdownTimeout,
}: QuizTopBarProps) {
  return (
    <div className="h-14 flex items-center justify-between px-5 border-b border-zinc-200 shrink-0 bg-white/80 backdrop-blur-xl z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 p-1.5 -ml-1 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <ChevronLeft size={18} />
          <span className="text-sm" style={{ fontWeight: 500 }}>Salir</span>
        </button>
        <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center shadow-sm">
          <BookOpen size={15} className="text-white" />
        </div>
        <span className="text-sm text-zinc-800 truncate max-w-[260px]" style={{ fontWeight: 600 }}>
          {quizTitle}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        {/* P4-S01: Question count badge */}
        {answeredCount != null && totalQuestions != null && (
          <span className="flex items-center gap-1 text-[10px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200" style={{ fontWeight: 600 }}>
            <CheckCircle2 size={10} />
            {answeredCount}/{totalQuestions}
          </span>
        )}
        {/* P4-S02: Global session timer */}
        {sessionStartTime != null && <SessionTimer startTime={sessionStartTime} />}
        {/* Difficulty badge */}
        <span className={clsx(
          'text-[9px] px-2.5 py-1 rounded-full border uppercase',
          diffKey === 'easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
          diffKey === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
          'bg-red-50 text-red-600 border-red-200'
        )} style={{ fontWeight: 700 }}>
          {DIFFICULTY_LABELS[diffKey]}
        </span>
        {/* Per-question timer */}
        <TimerDisplay startTime={questionStartTime} paused={isReviewing} />
        {/* P7: Countdown timer (optional) */}
        {countdownSec != null && countdownSec > 0 && countdownResetKey != null && onCountdownTimeout && (
          <QuizCountdownTimer
            timeLimitSec={countdownSec}
            resetKey={countdownResetKey}
            onTimeout={onCountdownTimeout}
            paused={isReviewing}
            compact
          />
        )}
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>
  );
});