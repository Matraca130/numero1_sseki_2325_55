// ============================================================
// Axon — Student Quiz: QuizProgressBar
//
// Clickable segmented progress bar showing answered/current
// question status with correct/wrong counters.
// Extracted from QuizTaker in Phase 3 refactor.
// Q-A11Y: Added keyboard navigation, role toolbar, improved aria-labels
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
    <div className="flex items-center gap-3 mb-8" role="toolbar" aria-label="Navegacion de preguntas">
      <div className="flex-1 flex items-center gap-1" role="group" aria-label={`Progreso: pregunta ${currentIdx + 1} de ${totalQuestions}`}>
        {Array.from({ length: totalQuestions }, (_, idx) => {
          const sa = savedAnswers[idx];
          let color = 'bg-zinc-200';
          let statusLabel = 'sin responder';
          if (sa?.answered && sa.correct) { color = 'bg-emerald-500'; statusLabel = 'correcta'; }
          else if (sa?.answered && !sa.correct) { color = 'bg-rose-400'; statusLabel = 'incorrecta'; }
          else if (idx === currentIdx) { color = 'bg-teal-500'; statusLabel = 'actual'; }
          return (
            <button
              key={idx}
              onClick={() => onGoToQuestion(idx, idx < currentIdx ? 'back' : 'forward')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' && idx < totalQuestions - 1) {
                  e.preventDefault();
                  onGoToQuestion(idx + 1, 'forward');
                } else if (e.key === 'ArrowLeft' && idx > 0) {
                  e.preventDefault();
                  onGoToQuestion(idx - 1, 'back');
                }
              }}
              aria-label={`Pregunta ${idx + 1}: ${statusLabel}`}
              aria-current={idx === currentIdx ? 'step' : undefined}
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
