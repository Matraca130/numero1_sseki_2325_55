// ============================================================
// Axon — Professor: Quiz Create/Edit Modal
//
// Extracted from QuizzesManager.tsx (Phase 6a).
// Handles creating and editing Quiz entities (NOT questions).
// ============================================================

import { useState } from 'react';
import * as quizApi from '@/app/services/quizApi';
import { motion } from 'motion/react';
import clsx from 'clsx';
import { MODAL_OVERLAY, MODAL_CARD, MODAL_HEADER, MODAL_FOOTER, BTN_PRIMARY, BTN_GHOST, BTN_CLOSE, INPUT_BASE, TEXTAREA_BASE, LABEL, BANNER_ERROR, PROFESSOR_COLORS } from '@/app/services/quizDesignTokens';
import {
  Plus, Pencil, X, Check, AlertCircle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { QuizEntity } from '@/app/services/quizApi';
import { getErrorMsg } from '@/app/lib/error-utils';

export interface QuizFormModalProps {
  summaryId: string;
  quiz: QuizEntity | null;
  onClose: () => void;
  onSaved: () => void;
}

export function QuizFormModal({ summaryId, quiz, onClose, onSaved }: QuizFormModalProps) {
  const isEdit = !!quiz;
  const [title, setTitle] = useState(quiz?.title || '');
  const [description, setDescription] = useState(quiz?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) { setError('El titulo es obligatorio'); return; }
    setSaving(true);
    try {
      if (isEdit && quiz) {
        await quizApi.updateQuiz(quiz.id, { title: title.trim(), description: description.trim() || null });
        toast.success('Quiz actualizado');
      } else {
        await quizApi.createQuiz({ summary_id: summaryId, title: title.trim(), description: description.trim() || null, source: 'manual' });
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={MODAL_OVERLAY} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 12 }} transition={{ duration: 0.2 }} onClick={e => e.stopPropagation()} className={`${MODAL_CARD} w-full max-w-[480px] flex flex-col overflow-hidden`}>
        <div className={MODAL_HEADER}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              {isEdit ? <Pencil size={16} className="text-purple-600" /> : <Plus size={16} className="text-purple-600" />}
            </div>
            <div>
              <h3 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{isEdit ? 'Editar quiz' : 'Nuevo quiz'}</h3>
              <p className="text-[10px] text-gray-400">{isEdit ? 'Modifica titulo y descripcion' : 'Crea un quiz para agrupar preguntas'}</p>
            </div>
          </div>
          <button onClick={onClose} className={BTN_CLOSE}><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {error && (<div className={BANNER_ERROR}><AlertCircle size={14} />{error}</div>)}
          <div>
            <label className={LABEL} style={{ fontWeight: 600 }}>Titulo *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Quiz de anatomia - Tema 3" className={`${INPUT_BASE} ${PROFESSOR_COLORS.ring}`} autoFocus />
          </div>
          <div>
            <label className={LABEL} style={{ fontWeight: 600 }}>Descripcion <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripcion breve del quiz..." rows={3} className={`${TEXTAREA_BASE} ${PROFESSOR_COLORS.ring}`} />
          </div>
        </div>
        <div className={MODAL_FOOTER}>
          <button onClick={onClose} className={BTN_GHOST} style={{ fontWeight: 500 }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className={clsx(BTN_PRIMARY, saving ? PROFESSOR_COLORS.primaryDisabled : `${PROFESSOR_COLORS.primary} ${PROFESSOR_COLORS.primaryHover} active:scale-[0.97]`)} style={{ fontWeight: 600 }}>
            {saving ? (<><Loader2 size={14} className="animate-spin" /> Guardando...</>) : (<><Check size={14} /> {isEdit ? 'Guardar cambios' : 'Crear quiz'}</>)}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
