// ============================================================
// Axon — AnswerEditor
//
// Renders the answer input UI based on question type:
//   - MCQ: radio-based options with add/remove
//   - True/False: toggle buttons
//   - Open / Fill Blank: textarea
//
// Pure presentational, no state — all controlled via props.
// Extracted from QuestionFormModal in Phase 5 refactor.
// ============================================================

import React from 'react';
import type { QuestionType } from '@/app/services/quizApi';
import clsx from 'clsx';
import { Plus, X, Check } from 'lucide-react';

// ── Props ─────────────────────────────────────────────────

export interface AnswerEditorProps {
  questionType: QuestionType;
  correctAnswer: string;
  options: string[];
  /** Stable per-row IDs aligned by index with `options`. Used as React keys
   *  so removing an MCQ option does not shift sibling <input> state into
   *  the wrong row. Optional for back-compat; falls back to index. */
  optionIds?: string[];
  onCorrectAnswerChange: (v: string) => void;
  onOptionChange: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
}

// ── Component ─────────────────────────────────────────────

export const AnswerEditor = React.memo(function AnswerEditor({
  questionType,
  correctAnswer,
  options,
  optionIds,
  onCorrectAnswerChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
}: AnswerEditorProps) {

  // ── MCQ ─────────────────────────────────────────────────
  if (questionType === 'mcq') {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] text-gray-500" style={{ fontWeight: 600 }}>
            Opciones * <span className="text-gray-400" style={{ fontWeight: 400 }}>(haz clic en el radio para marcar la correcta)</span>
          </label>
          {options.length < 6 && (
            <button
              onClick={onAddOption}
              className="text-[10px] text-purple-600 hover:text-purple-800 flex items-center gap-0.5 transition-colors"
              style={{ fontWeight: 600 }}
            >
              <Plus size={11} /> Agregar opcion
            </button>
          )}
        </div>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={optionIds?.[i] ?? `option-${i}`} className="flex items-center gap-2">
              <button
                onClick={() => onCorrectAnswerChange(opt)}
                className={clsx(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                  opt && correctAnswer === opt
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-gray-300 hover:border-purple-400',
                )}
                title="Marcar como correcta"
                disabled={!opt.trim()}
              >
                {opt && correctAnswer === opt && <Check size={11} className="text-white" />}
              </button>
              <input
                type="text"
                value={opt}
                onChange={e => onOptionChange(i, e.target.value)}
                placeholder={`Opcion ${String.fromCharCode(65 + i)}`}
                className="flex-1 text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 placeholder:text-gray-300"
              />
              {options.length > 2 && (
                <button
                  onClick={() => onRemoveOption(i)}
                  className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── True / False ────────────────────────────────────────
  if (questionType === 'true_false') {
    return (
      <div>
        <label className="text-[11px] text-gray-500 mb-2 block" style={{ fontWeight: 600 }}>Respuesta correcta *</label>
        <div className="flex gap-2">
          <button
            onClick={() => onCorrectAnswerChange('true')}
            className={clsx(
              'flex-1 py-2.5 rounded-lg text-[13px] border transition-all',
              correctAnswer === 'true'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100',
            )}
            style={{ fontWeight: correctAnswer === 'true' ? 700 : 500 }}
          >
            <div className="flex items-center justify-center gap-2">
              <Check size={14} />
              Verdadero
            </div>
          </button>
          <button
            onClick={() => onCorrectAnswerChange('false')}
            className={clsx(
              'flex-1 py-2.5 rounded-lg text-[13px] border transition-all',
              correctAnswer === 'false'
                ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100',
            )}
            style={{ fontWeight: correctAnswer === 'false' ? 700 : 500 }}
          >
            <div className="flex items-center justify-center gap-2">
              <X size={14} />
              Falso
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── Open / Fill Blank ───────────────────────────────────
  if (questionType === 'open' || questionType === 'fill_blank') {
    return (
      <div>
        <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>Respuesta correcta *</label>
        <textarea
          value={correctAnswer}
          onChange={e => onCorrectAnswerChange(e.target.value)}
          placeholder={questionType === 'fill_blank' ? 'Palabra o frase que completa el espacio...' : 'Respuesta esperada...'}
          rows={2}
          className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none placeholder:text-gray-300"
        />
      </div>
    );
  }

  return null;
});
