// ============================================================
// Axon — BlockAnnotationsPanel (per-block notes with localStorage)
//
// Wave 3: Student interaction — block-level annotations panel.
// Persists notes to localStorage keyed by summaryId + blockId.
// ============================================================
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, StickyNote } from 'lucide-react';
import { Textarea } from '@/app/components/ui/textarea';
import { focusRing } from '@/app/components/design-kit';

// ── Types ─────────────────────────────────────────────────

interface BlockNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface BlockAnnotationsPanelProps {
  blockId: string;
  summaryId: string;
}

// ── localStorage helpers ──────────────────────────────────

function storageKey(summaryId: string, blockId: string): string {
  return `axon-block-notes-${summaryId}-${blockId}`;
}

function loadNotes(summaryId: string, blockId: string): BlockNote[] {
  try {
    const raw = localStorage.getItem(storageKey(summaryId, blockId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotes(summaryId: string, blockId: string, notes: BlockNote[]): void {
  localStorage.setItem(storageKey(summaryId, blockId), JSON.stringify(notes));
}

// ── Component ─────────────────────────────────────────────

export const BlockAnnotationsPanel = React.memo(function BlockAnnotationsPanel({
  blockId,
  summaryId,
}: BlockAnnotationsPanelProps) {
  const [notes, setNotes] = useState<BlockNote[]>(() => loadNotes(summaryId, blockId));
  const [draft, setDraft] = useState('');
  const [showForm, setShowForm] = useState(false);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notes],
  );

  const handleAdd = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const newNote: BlockNote = {
      id: crypto.randomUUID(),
      text,
      createdAt: new Date().toISOString(),
    };
    const updated = [...notes, newNote];
    setNotes(updated);
    saveNotes(summaryId, blockId, updated);
    setDraft('');
    setShowForm(false);
  }, [draft, notes, summaryId, blockId]);

  const handleDelete = useCallback(
    (id: string) => {
      const updated = notes.filter((n) => n.id !== id);
      setNotes(updated);
      saveNotes(summaryId, blockId, updated);
    },
    [notes, summaryId, blockId],
  );

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setDraft('');
  }, []);

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-teal-500" />
          <span className="text-sm text-zinc-700" style={{ fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
            Mis notas ({sortedNotes.length})
          </span>
        </div>
        <motion.button
          onClick={() => setShowForm(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 rounded-full text-xs text-zinc-600 hover:bg-zinc-50 ${focusRing}`}
          style={{ fontWeight: 600 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus className="w-3.5 h-3.5" /> Agregar
        </motion.button>
      </div>

      <div className="p-4">
        {/* ── Create form ── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 border rounded-xl p-4"
              style={{ borderColor: '#b3ddd2', backgroundColor: 'rgba(232,245,241,0.3)' }}
            >
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escribe tu nota..."
                className="min-h-[60px] mb-3 text-xs"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className={`px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 rounded-full ${focusRing}`}
                  style={{ fontWeight: 500 }}
                >
                  Cancelar
                </button>
                <motion.button
                  onClick={handleAdd}
                  disabled={!draft.trim()}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-white rounded-full text-xs disabled:opacity-50 ${focusRing}`}
                  style={{ backgroundColor: '#14b8a6', fontWeight: 600 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Plus className="w-3 h-3" />
                  Agregar
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ── */}
        {sortedNotes.length === 0 && !showForm ? (
          <div className="text-center py-8">
            <StickyNote className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 mb-1" style={{ fontWeight: 600 }}>
              Sin notas para este bloque
            </p>
            <p className="text-[10px] text-zinc-400 mb-3">
              Agrega notas para recordar puntos importantes
            </p>
            <motion.button
              onClick={() => setShowForm(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 rounded-full text-xs text-zinc-600 hover:bg-zinc-50 ${focusRing}`}
              style={{ fontWeight: 600 }}
              whileHover={{ scale: 1.03 }}
            >
              <Plus className="w-3.5 h-3.5" /> Crear primera nota
            </motion.button>
          </div>
        ) : (
          /* ── Notes list ── */
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {sortedNotes.map((note) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  className="group rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-teal-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-600">{note.text}</p>
                      <span className="text-[10px] text-zinc-400 mt-1 inline-block">
                        {new Date(note.createdAt).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className={`p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity shrink-0 ${focusRing}`}
                      aria-label="Eliminar nota"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
});
