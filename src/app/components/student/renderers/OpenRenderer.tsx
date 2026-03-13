// ============================================================
// Axon — Student Quiz: Open / Fill-Blank Renderer (M-3 Extraction)
//
// Renders a textarea input for open-ended and fill-in-the-blank
// question types, with correct/incorrect feedback.
//
// Extracted from QuestionRenderer.tsx for per-type extensibility.
// Q-A11Y: Added aria-label, aria-describedby for screen readers
// ============================================================

import React from 'react';
import clsx from 'clsx';
import { FeedbackBlock } from '@/app/components/student/FeedbackBlock';

// ── Props ────────────────────────────────────────────────

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
  /** Q-A11Y: question index for aria-describedby linking */
  questionIndex?: number;
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
  questionIndex,
}: OpenRendererProps) {
  const feedbackId = questionIndex != null ? `open-feedback-${questionIndex}` : undefined;

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
          aria-label={questionType === 'fill_blank'
            ? `Completa el espacio para la pregunta ${(questionIndex ?? 0) + 1}`
            : `Escribe tu respuesta para la pregunta ${(questionIndex ?? 0) + 1}`
          }
          aria-describedby={showResult && feedbackId ? feedbackId : undefined}
          aria-invalid={showResult && !isCorrectResult ? true : undefined}
          className="w-full px-5 py-4 text-sm text-gray-800 bg-transparent resize-none outline-none placeholder:text-gray-400 min-h-[100px]"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !isReviewing) {
              e.preventDefault();
              onSubmitText();
            }
          }}
        />
        {showResult && (
          <div className="px-5 pb-4" id={feedbackId}>
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
