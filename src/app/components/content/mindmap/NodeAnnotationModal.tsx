// ============================================================
// Axon — Node Annotation Modal
//
// Allows students to add/edit micro-annotations on graph nodes.
// Persists to backend via kw-student-notes API.
// Obsidian-inspired: quick note attached to a concept.
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { apiCall } from '@/app/lib/api';
import type { MapNode } from '@/app/types/mindmap';
import { MASTERY_HEX } from '@/app/types/mindmap';
import { headingStyle } from '@/app/design-system';

// ── Types ───────────────────────────────────────────────────

interface NodeAnnotationModalProps {
  node: MapNode | null;
  onClose: () => void;
  onSaved?: () => void;
}

interface StudentNote {
  id: string;
  keyword_id: string;
  content: string;
  created_at: string;
}

// ── Component ───────────────────────────────────────────────

export function NodeAnnotationModal({ node, onClose, onSaved }: NodeAnnotationModalProps) {
  const [content, setContent] = useState('');
  const [existingNote, setExistingNote] = useState<StudentNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch existing note when node changes
  useEffect(() => {
    if (!node) return;

    let cancelled = false;
    setLoading(true);
    apiCall<any>(`/kw-student-notes?keyword_id=${node.id}`)
      .then((result) => {
        if (cancelled) return;
        const notes = Array.isArray(result) ? result : result?.items || [];
        if (notes.length > 0) {
          setExistingNote(notes[0]);
          setContent(notes[0].content || '');
        } else {
          setExistingNote(null);
          setContent('');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setExistingNote(null);
        setContent('');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [node]);

  // Close on Escape key + prevent body scroll
  useEffect(() => {
    if (!node) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [node, onClose]);

  const handleSave = useCallback(async () => {
    if (!node || !content.trim()) return;

    setSaving(true);
    try {
      if (existingNote) {
        // Update existing note
        await apiCall(`/kw-student-notes/${existingNote.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ content: content.trim() }),
        });
      } else {
        // Create new note
        await apiCall('/kw-student-notes', {
          method: 'POST',
          body: JSON.stringify({
            keyword_id: node.id,
            content: content.trim(),
          }),
        });
      }
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar anotação');
    } finally {
      setSaving(false);
    }
  }, [node, content, existingNote, onClose, onSaved]);

  const handleDelete = useCallback(async () => {
    if (!existingNote) return;

    setSaving(true);
    try {
      await apiCall(`/kw-student-notes/${existingNote.id}`, { method: 'DELETE' });
      setContent('');
      setExistingNote(null);
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao apagar anotação');
    } finally {
      setSaving(false);
    }
  }, [existingNote, onClose, onSaved]);

  return (
    <AnimatePresence>
      {node && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 w-full max-w-md bg-white shadow-xl border border-gray-200 bottom-0 left-0 right-0 rounded-t-2xl sm:rounded-2xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[90vw] max-h-[90dvh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={`Anotação para ${node.label}`}
          >
            {/* Mobile drag handle */}
            <div className="flex sm:hidden justify-center pt-2 pb-0">
              <div className="w-8 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: MASTERY_HEX[node.masteryColor] }}
                />
                <h3
                  className="font-medium text-gray-900"
                  style={{ ...headingStyle, fontSize: 'clamp(0.9rem, 1.5vw, 1rem)' }}
                >
                  {node.label}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {loading ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[#2a8c7a] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <label htmlFor="node-annotation" className="block text-xs font-medium text-gray-500 mb-2">
                    Sua anotação pessoal
                  </label>
                  <textarea
                    id="node-annotation"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Adicione notas sobre este conceito..."
                    className="w-full h-32 px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a] placeholder:text-gray-400"
                    maxLength={1000}
                    autoFocus
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">
                      {content.length}/1000
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              {existingNote ? (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Apagar
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={handleSave}
                disabled={saving || !content.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#2a8c7a] hover:bg-[#244e47] disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
