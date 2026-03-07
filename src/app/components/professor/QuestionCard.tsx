// ============================================================
// Axon — Shared QuestionCard Component
//
// Used by both ProfessorQuizzesPage and QuizQuestionsEditor
// to display a quiz question with expandable details.
// ============================================================

import React, { useState } from 'react';
import type { QuizQuestion, QuestionType } from '@/app/services/quizApi';
import {
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  INT_TO_DIFFICULTY,
} from '@/app/services/quizConstants';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  Pencil, Trash2, RotateCcw, Check,
  CircleDot, CheckCircle2, MessageSquare,
  ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Question Type Icons ───────────────────────────────────

const QUESTION_TYPE_ICONS: Record<QuestionType, React.ReactNode> = {
  mcq: <CircleDot size={14} />,
  true_false: <CheckCircle2 size={14} />,
  fill_blank: <Pencil size={14} />,
  open: <MessageSquare size={14} />,
};

// ── Props ─────────────────────────────────────────────────

interface QuestionCardProps {
  question: QuizQuestion;
  index: number;
  keywordName: string;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
}

// ── Component ─────────────────────────────────────────────

export const QuestionCard = React.memo(function QuestionCard({
  question: q,
  index,
  keywordName,
  onEdit,
  onDelete,
  onRestore,
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const diffKey = INT_TO_DIFFICULTY[q.difficulty] || 'medium';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={q.is_active ? { y: -2 } : undefined}
      className={clsx(
        'bg-white rounded-2xl border transition-all',
        q.is_active
          ? 'border-zinc-200 hover:border-purple-200 hover:shadow-xl hover:shadow-zinc-900/5'
          : 'border-red-200 bg-red-50/30 opacity-75'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-purple-600 text-white text-[11px] shrink-0 mt-0.5 shadow-sm" style={{ fontWeight: 700 }}>
          {index}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {/* Type badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px]" style={{ fontWeight: 600 }}>
              {QUESTION_TYPE_ICONS[q.question_type]}
              {QUESTION_TYPE_LABELS[q.question_type]}
            </span>
            {/* Difficulty badge */}
            <span className={clsx('px-2 py-0.5 rounded-md border text-[10px]', DIFFICULTY_COLORS[diffKey])} style={{ fontWeight: 600 }}>
              {DIFFICULTY_LABELS[diffKey]}
            </span>
            {/* Keyword */}
            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px]" style={{ fontWeight: 500 }}>
              {keywordName}
            </span>
            {/* Source */}
            <span className={clsx(
              'px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider',
              q.source === 'ai' ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'
            )} style={{ fontWeight: 700 }}>
              {q.source}
            </span>
            {/* Inactive indicator */}
            {!q.is_active && (
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[9px] uppercase" style={{ fontWeight: 700 }}>
                Eliminada
              </span>
            )}
          </div>

          <p className="text-[13px] text-gray-800" style={{ lineHeight: '1.5' }}>{q.question}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            title={expanded ? 'Colapsar' : 'Expandir'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          {q.is_active ? (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <button
              onClick={onRestore}
              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Restaurar"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 ml-10 border-t border-gray-100 mt-1 pt-3 space-y-2.5">
              {/* Options (multiple choice) */}
              {q.question_type === 'mcq' && q.options && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5" style={{ fontWeight: 700 }}>Opciones</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        className={clsx(
                          'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] border',
                          opt === q.correct_answer
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-gray-50 border-gray-100 text-gray-600'
                        )}
                      >
                        {opt === q.correct_answer ? (
                          <Check size={12} className="text-emerald-600 shrink-0" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-gray-300 shrink-0" />
                        )}
                        <span style={{ fontWeight: opt === q.correct_answer ? 600 : 400 }}>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Correct answer (true/false, open, fill_blank) */}
              {q.question_type !== 'mcq' && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1" style={{ fontWeight: 700 }}>Respuesta correcta</p>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px]">
                    <Check size={12} />
                    <span style={{ fontWeight: 600 }}>
                      {q.question_type === 'true_false'
                        ? (q.correct_answer === 'true' ? 'Verdadero' : 'Falso')
                        : q.correct_answer
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Explanation */}
              {q.explanation && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1" style={{ fontWeight: 700 }}>Explicacion</p>
                  <div className="px-2.5 py-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-[12px]" style={{ lineHeight: '1.5' }}>
                    {q.explanation}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});