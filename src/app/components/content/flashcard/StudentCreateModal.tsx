// ============================================================
// StudentCreateModal — Simple modal for students to create flashcards
//
// Uses POST /my-flashcards (student-scoped endpoint, NOT /flashcards).
// Follows Axon design system: rounded-2xl white modal, teal CTA.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, X, Loader2 } from 'lucide-react';
import { apiCall } from '@/app/lib/api';

export interface StudentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  summaryId: string;
  keywords: Array<{ id: string; name: string }>;
}

export function StudentCreateModal({
  isOpen,
  onClose,
  onCreated,
  summaryId,
  keywords,
}: StudentCreateModalProps) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [keywordId, setKeywordId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setFront('');
      setBack('');
      setKeywordId(keywords[0]?.id || '');
      setError(null);
    }
  }, [isOpen, keywords]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const canSubmit = front.trim().length > 0 && back.trim().length > 0 && !loading;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      await apiCall('/my-flashcards', {
        method: 'POST',
        body: JSON.stringify({
          summary_id: summaryId,
          keyword_id: keywordId || undefined,
          front: front.trim(),
          back: back.trim(),
          source: 'manual',
        }),
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear flashcard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [canSubmit, summaryId, keywordId, front, back, onCreated, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />

          {/* Modal */}
          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Layers size={16} className="text-teal-500" />
                </div>
                <h3 className="text-lg text-gray-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 700 }}>
                  Nueva Flashcard
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Front textarea */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Frente (pregunta)
              </label>
              <textarea
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="Escribe la pregunta..."
                rows={3}
                className="w-full rounded-xl bg-[#F0F2F5] border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a]/30 transition-all"
              />
            </div>

            {/* Back textarea */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Reverso (respuesta)
              </label>
              <textarea
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Escribe la respuesta..."
                rows={3}
                className="w-full rounded-xl bg-[#F0F2F5] border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a]/30 transition-all"
              />
            </div>

            {/* Keyword select */}
            {keywords.length > 0 && (
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Keyword (opcional)
                </label>
                <select
                  value={keywordId}
                  onChange={(e) => setKeywordId(e.target.value)}
                  className="w-full rounded-xl bg-[#F0F2F5] border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a]/30 transition-all"
                >
                  {keywords.map((kw) => (
                    <option key={kw.id} value={kw.id}>
                      {kw.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-4 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-90 active:scale-[0.98]"
                style={{ backgroundColor: '#1B3B36', fontWeight: 600 }}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Crear Flashcard
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
