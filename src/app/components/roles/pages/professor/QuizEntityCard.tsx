// ============================================================
// Axon — Professor: Quiz Entity Card (R5 Extraction)
//
// Extracted from QuizzesManager.tsx — renders a single quiz
// entity in the quizzes list with all action buttons and
// inline delete confirmation.
//
// React.memo prevents re-renders of unchanged cards when
// the list updates (e.g. after create/delete/toggle).
// ============================================================

import React from 'react';
import type { Quiz } from '@/app/services/quizApi';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  ClipboardList, Pencil, Trash2,
  BookOpen, Eye, EyeOff, ChevronRight,
} from 'lucide-react';

// ── Props ───────────────────────────────────────────────

export interface QuizEntityCardProps {
  quiz: Quiz;
  isDeleting: boolean;
  onOpenQuestions: () => void;
  onAnalytics: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

// ── Component ───────────────────────────────────────────

export const QuizEntityCard = React.memo(function QuizEntityCard({
  quiz,
  isDeleting,
  onOpenQuestions,
  onAnalytics,
  onToggleActive,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: QuizEntityCardProps) {
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
          </div>
          {quiz.description && (
            <p className="text-[11px] text-gray-400 truncate">{quiz.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenQuestions}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] text-[#2a8c7a] hover:bg-teal-50 transition-colors"
            style={{ fontWeight: 600 }}
            title="Editar preguntas"
          >
            <BookOpen size={13} />
            Preguntas
            <ChevronRight size={12} />
          </button>

          <button
            onClick={onAnalytics}
            className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            title="Analytics"
          >
            <Eye size={14} />
          </button>

          <button
            onClick={onToggleActive}
            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
            title={quiz.is_active ? 'Desactivar' : 'Activar'}
          >
            {quiz.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>

          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>

          <button
            onClick={onRequestDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {isDeleting && (
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
                  className="px-2.5 py-1 rounded-full text-[11px] text-gray-500 hover:bg-gray-100 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirmDelete}
                  className="px-2.5 py-1 rounded-full text-[11px] text-white bg-red-500 hover:bg-red-600 transition-colors"
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
