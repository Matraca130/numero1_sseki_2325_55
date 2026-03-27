// ============================================================
// Axon — Professor: QuizCard (R11)
//
// Extracted from QuizzesManager inline quiz card.
// Displays quiz entity with actions (edit, delete, toggle, analytics).
// Uses React.memo for performance optimization.
// Q-UX2: Added time limit badge display.
// ============================================================

import React, { memo } from 'react';
import type { Quiz } from '@/app/services/quizApi';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  ClipboardList, Pencil, Trash2,
  Eye, EyeOff, ChevronRight, BookOpen, Clock,
} from 'lucide-react';

interface QuizCardProps {
  quiz: Quiz;
  deletingId: string | null;
  onEdit: (quiz: Quiz) => void;
  onDelete: (id: string) => void;
  onToggleActive: (quiz: Quiz) => void;
  onOpenQuestions: (quiz: Quiz) => void;
  onOpenAnalytics: (quiz: Quiz) => void;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
}

export const QuizCard = memo(function QuizCard({
  quiz,
  deletingId,
  onEdit,
  onDelete,
  onToggleActive,
  onOpenQuestions,
  onOpenAnalytics,
  onRequestDelete,
  onCancelDelete,
}: QuizCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={clsx(
        'bg-white rounded-2xl border px-5 py-4 transition-all',
        quiz.is_active
          ? 'border-zinc-200 hover:border-teal-200 hover:shadow-xl hover:shadow-zinc-900/5'
          : 'border-red-200 bg-red-50/30 opacity-75'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          quiz.is_active ? 'bg-teal-50' : 'bg-red-50'
        )}>
          <ClipboardList size={17} className={quiz.is_active ? 'text-teal-500' : 'text-red-400'} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[13px] text-gray-800 truncate" style={{ fontWeight: 600 }}>
              {quiz.title}
            </h3>
            <span className={clsx(
              'px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider shrink-0',
              quiz.source === 'ai'
                ? 'bg-violet-100 text-violet-600'
                : 'bg-gray-100 text-gray-500'
            )} style={{ fontWeight: 700 }}>
              {quiz.source}
            </span>
            {!quiz.is_active && (
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[9px] uppercase shrink-0" style={{ fontWeight: 700 }}>
                Inactivo
              </span>
            )}
            {/* Q-UX2: Time limit badge */}
            {quiz.time_limit_seconds != null && quiz.time_limit_seconds > 0 && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[9px] shrink-0" style={{ fontWeight: 600 }}>
                <Clock size={8} />
                {quiz.time_limit_seconds >= 60
                  ? `${Math.floor(quiz.time_limit_seconds / 60)}m${quiz.time_limit_seconds % 60 > 0 ? ` ${quiz.time_limit_seconds % 60}s` : ''}`
                  : `${quiz.time_limit_seconds}s`
                }
              </span>
            )}
          </div>
          {quiz.description && (
            <p className="text-[11px] text-gray-400 truncate">{quiz.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Open questions */}
          <button
            onClick={() => onOpenQuestions(quiz)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] text-[#2a8c7a] hover:bg-teal-50 transition-colors"
            style={{ fontWeight: 600 }}
            title="Editar preguntas"
          >
            <BookOpen size={13} />
            Preguntas
            <ChevronRight size={12} />
          </button>

          {/* Analytics */}
          <button
            onClick={() => onOpenAnalytics(quiz)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            title="Analytics"
          >
            <Eye size={14} />
          </button>

          {/* Toggle active */}
          <button
            onClick={() => onToggleActive(quiz)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title={quiz.is_active ? 'Desactivar' : 'Activar'}
          >
            {quiz.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          {/* Edit */}
          <button
            onClick={() => onEdit(quiz)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>

          {/* Delete */}
          <button
            onClick={() => onRequestDelete(quiz.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {deletingId === quiz.id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[11px] text-red-600">
                Confirmar eliminacion de "{quiz.title}"?
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onCancelDelete}
                  className="px-2.5 py-1 rounded-lg text-[11px] text-gray-500 hover:bg-gray-100 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onDelete(quiz.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] text-white bg-red-500 hover:bg-red-600 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
