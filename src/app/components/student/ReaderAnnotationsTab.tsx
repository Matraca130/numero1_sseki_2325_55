// ============================================================
// Axon — ReaderAnnotationsTab (student text annotations CRUD)
//
// Extracted from StudentSummaryReader.tsx (Phase 2, Step 4b).
// Form state is LOCAL (optimistic reset on submit).
//
// Sections:
//   1. Header with "Agregar nota" button
//   2. Create annotation form (inline, animated)
//   3. Annotation list with color dots + delete (ConfirmDialog)
// ============================================================
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Loader2, StickyNote } from 'lucide-react';
import clsx from 'clsx';
import { Textarea } from '@/app/components/ui/textarea';
import type { TextAnnotation } from '@/app/services/studentSummariesApi';
import { focusRing } from '@/app/components/design-kit';
import { ListSkeleton } from '@/app/components/student/reader-atoms';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';

// ── Color map (sole consumer — co-located per D2) ────────

const ANNOTATION_COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  yellow: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
  blue:   { bg: 'bg-cyan-50',  border: 'border-cyan-200',  text: 'text-cyan-700',  dot: 'bg-cyan-400' },
  green:  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  pink:   { bg: 'bg-pink-50',  border: 'border-pink-200',  text: 'text-pink-700',  dot: 'bg-pink-400' },
};

// ── Props ─────────────────────────────────────────────────

export interface ReaderAnnotationsTabProps {
  annotations: TextAnnotation[];
  annotationsLoading: boolean;
  onCreateAnnotation: (note: string, color: string) => void;
  onDeleteAnnotation: (id: string) => void;
  savingAnnotation: boolean;
}

// ── Component (P-05 FIX: React.memo) ─────────────────────

export const ReaderAnnotationsTab = React.memo(function ReaderAnnotationsTab({
  annotations,
  annotationsLoading,
  onCreateAnnotation,
  onDeleteAnnotation,
  savingAnnotation,
}: ReaderAnnotationsTabProps) {
  // ── Local form state (optimistic reset on submit) ──
  const [showForm, setShowForm] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteColor, setNoteColor] = useState('yellow');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!noteText.trim()) return;
    onCreateAnnotation(noteText.trim(), noteColor);
    setNoteText('');
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setNoteText('');
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
        <div>
          <h3 className="text-sm text-zinc-700" style={{ fontWeight: 600 }}>Mis anotaciones</h3>
          <p className="text-[10px] text-zinc-400 mt-0.5">Tus notas privadas sobre este resumen</p>
        </div>
        <motion.button
          onClick={() => setShowForm(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs text-zinc-600 hover:bg-zinc-50 ${focusRing}`}
          style={{ fontWeight: 600 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus className="w-3.5 h-3.5" /> Agregar nota
        </motion.button>
      </div>

      <div className="p-4">
        {annotationsLoading ? (
          <ListSkeleton />
        ) : (
          <>
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
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Escribe tu nota o anotacion..."
                    className="min-h-[60px] mb-3 text-xs"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] text-zinc-400" style={{ fontWeight: 500 }}>Color:</span>
                    {Object.entries(ANNOTATION_COLOR_MAP).map(([color, styles]) => (
                      <button
                        key={color}
                        onClick={() => setNoteColor(color)}
                        aria-label={`Color ${color}`}
                        aria-pressed={noteColor === color}
                        className={clsx(
                          "w-5 h-5 rounded-full border-2 transition-all cursor-pointer",
                          styles.dot,
                          noteColor === color ? "border-zinc-800 scale-110" : "border-transparent hover:border-zinc-300"
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={savingAnnotation}
                      className={`px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 rounded-lg ${focusRing}`}
                      style={{ fontWeight: 500 }}
                    >
                      Cancelar
                    </button>
                    <motion.button
                      onClick={handleCreate}
                      disabled={savingAnnotation || !noteText.trim()}
                      className={`flex items-center gap-1.5 px-4 py-1.5 text-white rounded-lg text-xs disabled:opacity-50 ${focusRing}`}
                      style={{ backgroundColor: '#2a8c7a', fontWeight: 600 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {savingAnnotation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Crear
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Empty state ── */}
            {annotations.length === 0 && !showForm ? (
              <div className="text-center py-8">
                <StickyNote className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs text-zinc-500 mb-1" style={{ fontWeight: 600 }}>No tienes anotaciones</p>
                <p className="text-[10px] text-zinc-400 mb-3">Agrega notas para recordar puntos importantes</p>
                <motion.button
                  onClick={() => setShowForm(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs text-zinc-600 hover:bg-zinc-50 ${focusRing}`}
                  style={{ fontWeight: 600 }}
                  whileHover={{ scale: 1.03 }}
                >
                  <Plus className="w-3.5 h-3.5" /> Crear primera nota
                </motion.button>
              </div>
            ) : (
              /* ── Annotation list ── */
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {annotations.map(ann => {
                    const colorStyles = ANNOTATION_COLOR_MAP[ann.color || 'yellow'] || ANNOTATION_COLOR_MAP.yellow;
                    return (
                      <motion.div
                        key={ann.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 30 }}
                        className={clsx("group rounded-xl border p-3 transition-shadow hover:shadow-sm", colorStyles.bg, colorStyles.border)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={clsx("w-2 h-2 rounded-full mt-1.5 shrink-0", colorStyles.dot)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-600">{ann.note || '(sin nota)'}</p>
                            <span className="text-[10px] text-zinc-400 mt-1 inline-block">
                              {new Date(ann.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <button
                            onClick={() => setPendingDeleteId(ann.id)}
                            className={`p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity shrink-0 ${focusRing}`}
                            aria-label="Eliminar anotacion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={!!pendingDeleteId}
        onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}
        title="Eliminar anotacion?"
        description="Esta nota se eliminara permanentemente. Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => {
          if (pendingDeleteId) {
            onDeleteAnnotation(pendingDeleteId);
            setPendingDeleteId(null);
          }
        }}
      />
    </div>
  );
});
