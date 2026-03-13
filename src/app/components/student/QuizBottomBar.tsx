// ============================================================
// Axon — Student Quiz: QuizBottomBar
//
// Bottom navigation bar with Previous / Confirm / Next
// buttons. Handles all visual states (submitting, closing,
// reviewing, disabled).
// Extracted from QuizTaker in Phase 3 refactor.
// Q-A11Y: Enhanced aria-labels with question context, nav landmark
// ============================================================

import React from 'react';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { focusRing } from '@/app/components/design-kit';

// ── Props ────────────────────────────────────────────────

export interface QuizBottomBarProps {
  currentIdx: number;
  questionsLength: number;
  answeredCount: number;
  closingSession: boolean;
  isReviewing: boolean;
  submitting: boolean;
  canSubmit: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

// ── Component ────────────────────────────────────────────

export const QuizBottomBar = React.memo(function QuizBottomBar({
  currentIdx,
  questionsLength,
  answeredCount,
  closingSession,
  isReviewing,
  submitting,
  canSubmit,
  onPrev,
  onNext,
  onSubmit,
}: QuizBottomBarProps) {
  return (
    <nav className="shrink-0 border-t border-gray-200 bg-white px-6 md:px-10 py-4" aria-label="Controles del quiz">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div>
          {currentIdx > 0 ? (
            <button
              onClick={onPrev}
              aria-label={`Ir a pregunta ${currentIdx} de ${questionsLength}`}
              className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 transition-colors"
              style={{ fontWeight: 600 }}
            >
              <ChevronLeft size={16} /> Anterior
            </button>
          ) : <div />}
        </div>

        <div>
          {closingSession ? (
            <div className="px-6 py-2.5 rounded-lg text-sm bg-gray-200 text-gray-500 flex items-center gap-2" role="status" aria-label="Finalizando sesion" style={{ fontWeight: 600 }}>
              <Loader2 size={14} className="animate-spin" /> Finalizando...
            </div>
          ) : isReviewing ? (
            <button
              onClick={onNext}
              aria-label={currentIdx < questionsLength - 1
                ? `Ir a pregunta ${currentIdx + 2} de ${questionsLength}`
                : 'Ver resultados del quiz'
              }
              className={`px-6 py-2.5 rounded-lg text-sm bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-all ${focusRing}`}
              style={{ fontWeight: 600 }}
            >
              {currentIdx < questionsLength - 1
                ? 'Siguiente'
                : (answeredCount >= questionsLength ? 'Ver resultados' : 'Siguiente')
              }
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!canSubmit}
              aria-label={`Confirmar respuesta para pregunta ${currentIdx + 1}`}
              aria-busy={submitting}
              className={clsx(
                `px-6 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 ${focusRing}`,
                'bg-teal-600 text-white hover:bg-teal-700 shadow-sm',
                'disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed'
              )}
              style={{ fontWeight: 600 }}
            >
              {submitting ? (
                <><Loader2 size={14} className="animate-spin" /> Enviando...</>
              ) : (
                <><Check size={14} /> Confirmar</>
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
});
