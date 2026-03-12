// ============================================================
// Axon — Student Quiz: QuizTopBar
//
// Session header with back button, quiz title, difficulty
// badge, per-question timer, and close button.
// Extracted from QuizTaker in Phase 3 refactor.
// ============================================================

import React from 'react';
import type { Difficulty } from '@/app/services/quizConstants';
import { DIFFICULTY_LABELS } from '@/app/services/quizConstants';
import { ChevronLeft, BookOpen, X } from 'lucide-react';
import clsx from 'clsx';
import { TimerDisplay } from '@/app/components/student/TimerDisplay';

// ── Props ────────────────────────────────────────────

export interface QuizTopBarProps {
  quizTitle: string;
  diffKey: Difficulty;
  questionStartTime: number;
  isReviewing: boolean;
  onBack: () => void;
}

// ── Component ────────────────────────────────────────

export const QuizTopBar = React.memo(function QuizTopBar({
  quizTitle,
  diffKey,
  questionStartTime,
  isReviewing,
  onBack,
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
        {/* Difficulty badge */}
        <span className={clsx(
          'text-[9px] px-2.5 py-1 rounded-full border uppercase',
          diffKey === 'easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
          diffKey === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
          'bg-red-50 text-red-600 border-red-200'
        )} style={{ fontWeight: 700 }}>
          {DIFFICULTY_LABELS[diffKey]}
        </span>
        {/* Timer display */}
        <TimerDisplay startTime={questionStartTime} paused={isReviewing} />
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
          <X size={18} />
        </button>
      </div>
    </div>
  );
});
