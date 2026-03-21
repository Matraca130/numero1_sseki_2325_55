// ============================================================
// Axon — Professor: Quiz Create/Edit Modal
//
// Extracted from QuizzesManager.tsx (Phase 6a).
// Handles creating and editing Quiz entities (NOT questions).
//
// Q-UX2: Added time_limit_seconds configuration (per-question timer).
//
// Props:
//   summaryId — parent summary to attach quiz to
//   quiz      — null = create mode, Quiz = edit mode
//   onClose   — dismiss modal
//   onSaved   — callback after successful create/update
// ============================================================

import { useState } from 'react';
import * as quizApi from '@/app/services/quizApi';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { MODAL_OVERLAY, MODAL_CARD, MODAL_HEADER, MODAL_FOOTER, BTN_PRIMARY, BTN_GHOST, BTN_CLOSE, INPUT_BASE, TEXTAREA_BASE, LABEL, BANNER_ERROR, PROFESSOR_COLORS } from '@/app/services/quizDesignTokens';
import {
  Plus, Pencil, X, Check, AlertCircle, Loader2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { QuizEntity } from '@/app/services/quizApi';
import { getErrorMsg } from '@/app/lib/error-utils';

// ── Props ─────────────────────────────────────────────────

export interface QuizFormModalProps {
  summaryId: string;
  quiz: QuizEntity | null;
  onClose: () => void;
  onSaved: () => void;
}

// ── Component ─────────────────────────────────────────────

export function QuizFormModal({
  summaryId,
  quiz,
  onClose,
  onSaved,
}: QuizFormModalProps) {
  const isEdit = !!quiz;

  const [title, setTitle] = useState(quiz?.title || '');
  const [description, setDescription] = useState(quiz?.description || '');
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(
    (quiz?.time_limit_seconds ?? 0) > 0
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    Math.floor((quiz?.time_limit_seconds ?? 0) / 60)
  );
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(
    (quiz?.time_limit_seconds ?? 0) % 60
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computedTimeLimitSeconds = timeLimitEnabled
    ? timeLimitMinutes * 60 + timeLimitSeconds
    : null;

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError('El titulo es obligatorio');
      return;
    }
    if (timeLimitEnabled && (timeLimitMinutes * 60 + timeLimitSeconds) < 5) {
      setError('El tiempo minimo por pregunta es 5 segundos');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && quiz) {
        await quizApi.updateQuiz(quiz.id, {
          title: title.trim(),
          description: description.trim() || null,
          time_limit_seconds: computedTimeLimitSeconds,
        });
        toast.success('Quiz actualizado');
      } else {
        await quizApi.createQuiz({
          summary_id: summaryId,
          title: title.trim(),
          description: description.trim() || null,
          source: 'manual',
          time_limit_seconds: computedTimeLimitSeconds,
        });
        toast.success('Quiz creado');
      }
      onSaved();
    } catch (err: unknown) {
      setError(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={MODAL_OVERLAY}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className={`${MODAL_CARD} w-full max-w-[480px] flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className={MODAL_HEADER}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              {isEdit ? <Pencil size={16} className="text-teal-600" /> : <Plus size={16} className="text-teal-600" />}
            </div>
            <div>
              <h3 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
                {isEdit ? 'Editar quiz' : 'Nuevo quiz'}
              </h3>
              <p className="text-[10px] text-gray-400">
                {isEdit ? 'Modifica titulo y descripcion' : 'Crea un quiz para agrupar preguntas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={BTN_CLOSE}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className={BANNER_ERROR}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div>
            <label className={LABEL} style={{ fontWeight: 600 }}>
              Titulo *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Quiz de anatomia - Tema 3"
              className={`${INPUT_BASE} ${PROFESSOR_COLORS.ring}`}
              autoFocus
            />
          </div>

          <div>
            <label className={LABEL} style={{ fontWeight: 600 }}>
              Descripcion <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripcion breve del quiz..."
              rows={3}
              className={`${TEXTAREA_BASE} ${PROFESSOR_COLORS.ring}`}
            />
          </div>

          {/* Q-UX2: Time limit per question */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={LABEL} style={{ fontWeight: 600 }}>
                <Clock size={12} className="inline mr-1 text-teal-500" />
                Tiempo por pregunta
              </label>
              <button
                type="button"
                onClick={() => setTimeLimitEnabled(!timeLimitEnabled)}
                className={clsx(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                  timeLimitEnabled ? 'bg-[#2a8c7a]' : 'bg-gray-300'
                )}
                aria-label={timeLimitEnabled ? 'Desactivar limite de tiempo' : 'Activar limite de tiempo'}
              >
                <span
                  className={clsx(
                    'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm',
                    timeLimitEnabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  )}
                />
              </button>
            </div>

            {timeLimitEnabled && (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={timeLimitMinutes}
                    onChange={e => setTimeLimitMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className={`w-16 text-center text-sm py-1.5 rounded-lg border border-gray-200 ${PROFESSOR_COLORS.ring}`}
                    aria-label="Minutos"
                  />
                  <span className="text-[11px] text-gray-500">min</span>
                </div>
                <span className="text-gray-400">:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={timeLimitSeconds}
                    onChange={e => setTimeLimitSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className={`w-16 text-center text-sm py-1.5 rounded-lg border border-gray-200 ${PROFESSOR_COLORS.ring}`}
                    aria-label="Segundos"
                  />
                  <span className="text-[11px] text-gray-500">seg</span>
                </div>
                {(timeLimitMinutes > 0 || timeLimitSeconds > 0) && (
                  <span className="text-[10px] text-teal-500 ml-1" style={{ fontWeight: 500 }}>
                    = {timeLimitMinutes * 60 + timeLimitSeconds}s por pregunta
                  </span>
                )}
              </div>
            )}

            {!timeLimitEnabled && (
              <p className="text-[10px] text-gray-400 mt-1">Sin limite — los alumnos responden a su ritmo</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={MODAL_FOOTER}>
          <button
            onClick={onClose}
            className={BTN_GHOST}
            style={{ fontWeight: 500 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={clsx(
              BTN_PRIMARY,
              saving
                ? PROFESSOR_COLORS.primaryDisabled
                : `${PROFESSOR_COLORS.primary} ${PROFESSOR_COLORS.primaryHover} active:scale-[0.97]`
            )}
            style={{ fontWeight: 600 }}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Guardando...</>
            ) : (
              <><Check size={14} /> {isEdit ? 'Guardar cambios' : 'Crear quiz'}</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
