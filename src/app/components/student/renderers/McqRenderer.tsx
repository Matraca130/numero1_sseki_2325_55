// ============================================================
// Axon — Student Quiz: MCQ Renderer (M-3 Extraction)
// ============================================================

import React from 'react';
import clsx from 'clsx';
import { FeedbackBlock } from '@/app/components/student/FeedbackBlock';
import { LETTERS } from '@/app/lib/quiz-utils';

export interface McqRendererProps {
  options: string[];
  correctAnswer: string;
  explanation?: string | null;
  selectedAnswer: string | null;
  showResult: boolean;
  isReviewing: boolean;
  onSelectOption: (option: string) => void;
}

export const McqRenderer = React.memo(function McqRenderer({
  options, correctAnswer, explanation, selectedAnswer,
  showResult, isReviewing, onSelectOption,
}: McqRendererProps) {
  return (
    <div className="space-y-3 mb-6" role="radiogroup" aria-label="Opciones de respuesta">
      {options.map((option, oi) => {
        const isSelected = selectedAnswer === option;
        const isCorrectOption = option === correctAnswer;
        const wasSelectedWrong = showResult && isSelected && !isCorrectOption;
        const wasCorrect = showResult && isCorrectOption;
        return (
          <button
            key={oi}
            onClick={() => !isReviewing && onSelectOption(option)}
            disabled={isReviewing}
            role="radio"
            aria-checked={isSelected}
            aria-label={`Opcion ${LETTERS[oi]}: ${option}`}
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
              )} style={{ fontWeight: 600 }}>{LETTERS[oi]}.</span>
              <span className={clsx(
                'text-sm',
                wasCorrect ? 'text-gray-800' : wasSelectedWrong ? 'text-gray-700' : isSelected ? 'text-gray-800' : 'text-gray-600'
              )}>{option}</span>
            </div>
            {wasSelectedWrong && <FeedbackBlock correct={false} explanation={explanation} correctAnswer={correctAnswer} />}
            {wasCorrect && showResult && <FeedbackBlock correct={true} explanation={explanation} />}
          </button>
        );
      })}
    </div>
  );
});