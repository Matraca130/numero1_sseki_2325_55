// ============================================================
// Axon — Student Quiz: True/False Renderer (M-3 Extraction)
// ============================================================

import React from 'react';
import clsx from 'clsx';
import { CheckCircle2, XCircle } from 'lucide-react';
import { FeedbackBlock } from '@/app/components/student/FeedbackBlock';

export interface TrueFalseRendererProps {
  correctAnswer: string;
  explanation?: string | null;
  tfAnswer: string | null;
  showResult: boolean;
  isReviewing: boolean;
  onSelectTF: (val: string) => void;
}

export const TrueFalseRenderer = React.memo(function TrueFalseRenderer({
  correctAnswer, explanation, tfAnswer, showResult, isReviewing, onSelectTF,
}: TrueFalseRendererProps) {
  return (
    <div className="space-y-3 mb-6" role="radiogroup" aria-label="Verdadero o Falso">
      {['true', 'false'].map(val => {
        const label = val === 'true' ? 'Verdadero' : 'Falso';
        const icon = val === 'true' ? <CheckCircle2 size={20} /> : <XCircle size={20} />;
        const isSelected = tfAnswer === val;
        const isCorrectOption = val === correctAnswer;
        const wasSelectedWrong = showResult && isSelected && !isCorrectOption;
        const wasCorrect = showResult && isCorrectOption;
        return (
          <button
            key={val}
            onClick={() => !isReviewing && onSelectTF(val)}
            disabled={isReviewing}
            role="radio"
            aria-checked={isSelected}
            aria-label={label}
            className={clsx(
              'w-full text-left rounded-xl border-2 transition-all overflow-hidden',
              !showResult && !isSelected && 'border-gray-200 hover:border-gray-300 bg-white',
              !showResult && isSelected && 'border-teal-500 bg-teal-50/30',
              wasCorrect && 'border-emerald-400 bg-emerald-50',
              wasSelectedWrong && 'border-rose-300 bg-rose-50',
              showResult && !isCorrectOption && !isSelected && 'border-gray-200 bg-white opacity-50'
            )}
          >
            <div className="px-5 py-4 flex items-center gap-3">
              <span className={clsx(
                'shrink-0',
                wasCorrect ? 'text-emerald-600' : wasSelectedWrong ? 'text-rose-500' : isSelected ? 'text-teal-600' : 'text-gray-400'
              )}>{icon}</span>
              <span className={clsx(
                'text-base',
                wasCorrect ? 'text-gray-800' : wasSelectedWrong ? 'text-gray-700' : isSelected ? 'text-gray-800' : 'text-gray-600'
              )} style={{ fontWeight: 600 }}>{label}</span>
            </div>
            {wasSelectedWrong && <FeedbackBlock correct={false} explanation={explanation} correctAnswer={correctAnswer === 'true' ? 'Verdadero' : 'Falso'} />}
            {wasCorrect && showResult && <FeedbackBlock correct={true} explanation={explanation} />}
          </button>
        );
      })}
    </div>
  );
});