// ============================================================
// Axon — Student Quiz: QuizProgressBar
//
// Clickable segmented progress bar showing answered/current
// question status with correct/wrong counters.
// Extracted from QuizTaker in Phase 3 refactor.
// ============================================================

import React from 'react';
import type { SavedAnswer } from '@/app/components/student/quiz-types';
import { CheckCircle2, X } from 'lucide-react';
import clsx from 'clsx';

// ── Props ────────────────────────────────────────────────

export interface QuizProgressBarProps {
  totalQuestions: number;
  savedAnswers: Record<number, SavedAnswer>;
  currentIdx: number;
  correctCount: number;
  wrongCount: number;
  onGoToQuestion: (idx: number, dir: 'forward' | 'back') => void;
}

// ── Component ────────────────────────────────────────────

export const QuizProgressBar = React.memo(function QuizProgressBar({
  totalQuestions,
  savedAnswers,
  currentIdx,
  correctCount,
  wrongCount,
  onGoToQuestion,
}: QuizProgressBarProps) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="flex-1 flex items-center gap-1">
        {Array.from({ length: totalQuestions }, (_, idx) => {
          const sa = savedAnswers[idx];
          let color = 'bg-zinc-200';
          if (sa?.answered && sa.correct) color = 'bg-emerald-500';
          else if (sa?.answered && !sa.correct) color = 'bg-rose-400';
          else if (idx === currentIdx) color = 'bg-teal-500';
          return (
            <button
              key={idx}
              onClick={() => onGoToQuestion(idx, idx < currentIdx ? 'back' : 'forward')}
              aria-label={`Pregunta ${idx + 1}${sa?.answered ? (sa.correct ? ', correcta' : ', incorrecta') : (idx === currentIdx ? ', actual' : ', sin responder')}`}
              className={clsx(
                'h-2 rounded-full flex-1 transition-all cursor-pointer hover:opacity-80',
                color,
                idx === currentIdx && 'ring-2 ring-teal-300 ring-offset-1'
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span className="text-xs text-zinc-500" style={{ fontWeight: 500 }}>
          {currentIdx + 1} de {totalQuestions}
        </span>
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
  );
});