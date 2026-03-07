// ============================================================
// Axon — Student Quiz: FeedbackBlock
//
// Shows correct/incorrect feedback with optional explanation.
// Extracted from QuizTaker in Phase 3 refactor.
// ============================================================

import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

// ── Props ────────────────────────────────────────────────

export interface FeedbackBlockProps {
  correct: boolean;
  explanation?: string | null;
  correctAnswer?: string;
  inline?: boolean;
}

// ── Component ────────────────────────────────────────────

export function FeedbackBlock({
  correct,
  explanation,
  correctAnswer,
  inline,
}: FeedbackBlockProps) {
  const Wrapper = inline ? React.Fragment : ({ children }: { children: React.ReactNode }) => (
    <div className="px-5 pb-4 pt-0">{children}</div>
  );

  return (
    <Wrapper>
      <div className="flex items-start gap-2">
        {correct ? (
          <>
            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-emerald-600 mb-1" style={{ fontWeight: 600 }}>Respuesta correcta</p>
              {explanation && <p className="text-xs text-gray-500" style={{ lineHeight: '1.5' }}>{explanation}</p>}
            </div>
          </>
        ) : (
          <>
            <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-rose-600 mb-1" style={{ fontWeight: 600 }}>Incorrecto</p>
              {correctAnswer && (
                <p className="text-xs text-gray-600 mb-1">
                  Respuesta esperada: <span className="text-gray-800" style={{ fontWeight: 600 }}>{correctAnswer}</span>
                </p>
              )}
              {explanation && <p className="text-xs text-gray-500" style={{ lineHeight: '1.5' }}>{explanation}</p>}
            </div>
          </>
        )}
      </div>
    </Wrapper>
  );
}
