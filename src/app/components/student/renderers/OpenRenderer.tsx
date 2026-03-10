// ============================================================
// Axon — Student Quiz: Open / Fill-Blank Renderer (M-3 Extraction)
//
// Renders a textarea input for open-ended and fill-in-the-blank
// question types, with correct/incorrect feedback.
//
// Extracted from QuestionRenderer.tsx for per-type extensibility.
// ============================================================

import React from 'react';
import clsx from 'clsx';
import { FeedbackBlock } from '@/app/components/student/FeedbackBlock';

// ── Props ──────────────────────────────────────────────

export interface OpenRendererProps {
  questionType: 'open' | 'fill_blank';
  correctAnswer: string;
  explanation?: string | null;
  textAnswer: string;
  showResult: boolean;
  isCorrectResult: boolean;
  isReviewing: boolean;
  onChangeText: (text: string) => void;
  onSubmitText: () => void;
}

// ── Component ────────────────────────────────────────────

export const OpenRenderer = React.memo(function OpenRenderer({
  questionType,
  correctAnswer,
  explanation,
  textAnswer,
  showResult,
  isCorrectResult,
  isReviewing,
  onChangeText,
  onSubmitText,
}: OpenRendererProps) {
  return (
    <div className="mb-6">
      <div className={clsx(
        'rounded-xl border-2 overflow-hidden transition-all',
        showResult && isCorrectResult && 'border-emerald-400 bg-emerald-50',
        showResult && !isCorrectResult && 'border-rose-300 bg-rose-50',
        !showResult && 'border-gray-200 bg-white'
      )}>
        <textarea
          value={textAnswer}
          onChange={e => onChangeText(e.target.value)}
          disabled={isReviewing}
          placeholder={questionType === 'fill_blank' ? 'Completa el espacio...' : 'Escribe tu respuesta...'}
          className="w-full px-5 py-4 text-sm text-gray-800 bg-transparent resize-none outline-none placeholder:text-gray-400 min-h-[100px]"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !isReviewing) {
              e.preventDefault();
              onSubmitText();
            }
          }}
        />
        {showResult && (
          <div className="px-5 pb-4">
            {isCorrectResult ? (
              <FeedbackBlock correct={true} explanation={explanation} />
            ) : (
              <FeedbackBlock correct={false} explanation={explanation} correctAnswer={correctAnswer} inline />
            )}
          </div>
        )}
      </div>
    </div>
  );
});
