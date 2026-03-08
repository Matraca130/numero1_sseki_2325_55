// ============================================================
// Axon — Professor: Quiz Create/Edit Modal
//
// Extracted from QuizzesManager.tsx (Phase 6a).
// Handles creating and editing Quiz entities (NOT questions).
//
// Props:
//   summaryId — parent summary to attach quiz to
//   quiz      — null = create mode, Quiz = edit mode
//   onClose   — dismiss modal
//   onSaved   — callback after successful create/update
// ============================================================

import { useState } from 'react';
import { apiCall } from '@/app/lib/api';
import { motion } from 'motion/react';
import clsx from 'clsx';
import {
  Plus, Pencil, X, Check, AlertCircle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { QuizEntity } from '@/app/services/quizApi';

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError('El titulo es obligatorio');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && quiz) {
        await apiCall(`/quizzes/${quiz.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
          }),
        });
        toast.success('Quiz actualizado');
      } else {
        await apiCall('/quizzes', {
          method: 'POST',
          body: JSON.stringify({
            summary_id: summaryId,
            title: title.trim(),
            description: description.trim() || null,
            source: 'manual',
          }),
        });
        toast.success('Quiz creado');
      }
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      if (msg.includes('404') || msg.includes('Not Found')) {
        setError('Ruta /quizzes aun no existe en el backend. Pendiente de despliegue.');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-[480px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              {isEdit ? <Pencil size={16} className="text-purple-600" /> : <Plus size={16} className="text-purple-600" />}
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
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px]">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div>
            <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
              Titulo *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Quiz de anatomia - Tema 3"
              className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 placeholder:text-gray-300"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[11px] text-gray-500 mb-1 block" style={{ fontWeight: 600 }}>
              Descripcion <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descripcion breve del quiz..."
              rows={3}
              className="w-full text-[12px] border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 resize-none placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] text-gray-500 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
            style={{ fontWeight: 500 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={clsx(
              'flex items-center gap-2 px-5 py-2 rounded-lg text-[12px] text-white transition-all shadow-sm',
              saving
                ? 'bg-purple-400 cursor-wait'
                : 'bg-purple-600 hover:bg-purple-700 active:scale-[0.97]'
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

export default QuizFormModal;
