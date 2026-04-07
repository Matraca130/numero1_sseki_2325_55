// ============================================================
// Axon — StickyNotesPanel
//
// A floating, persistent "RAM-memory" notes panel that follows
// the user as they scroll through a summary. Acts like a sticky
// notepad: continuous text area, autosaved to localStorage,
// keyed by summaryId so each summary keeps its own scratchpad.
//
// Design intent (per Stitch / shadcn-ui guidance):
//   - Pinned to the right side of the viewport (position: fixed)
//   - Collapsible to a small icon when not in use
//   - Yellow paper aesthetic so it reads as a "sticky note"
//   - Uses existing shadcn/ui primitives where possible
// ============================================================
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StickyNote, X, Save, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface StickyNotesPanelProps {
  /** Identifier used to scope notes per summary. */
  summaryId: string | null | undefined;
  /** Optional label shown in the header. */
  contextLabel?: string;
}

const STORAGE_PREFIX = 'axon:sticky-notes:';

function readNote(summaryId: string): string {
  try {
    return localStorage.getItem(STORAGE_PREFIX + summaryId) || '';
  } catch {
    return '';
  }
}

function writeNote(summaryId: string, value: string) {
  try {
    if (value) {
      localStorage.setItem(STORAGE_PREFIX + summaryId, value);
    } else {
      localStorage.removeItem(STORAGE_PREFIX + summaryId);
    }
  } catch {
    /* localStorage not available */
  }
}

export function StickyNotesPanel({ summaryId, contextLabel }: StickyNotesPanelProps) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('axon:sticky-notes:open') !== '0';
    } catch {
      return true;
    }
  });
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Load note when summary changes
  useEffect(() => {
    if (!summaryId) {
      setValue('');
      return;
    }
    setValue(readNote(summaryId));
  }, [summaryId]);

  // Persist open/closed state
  useEffect(() => {
    try {
      localStorage.setItem('axon:sticky-notes:open', open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setValue(next);
      if (!summaryId) return;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        writeNote(summaryId, next);
        setSavedAt(Date.now());
      }, 400);
    },
    [summaryId],
  );

  const handleClear = useCallback(() => {
    if (!summaryId) return;
    if (!value) return;
    if (!window.confirm('¿Borrar todas las notas de este resumen?')) return;
    setValue('');
    writeNote(summaryId, '');
    setSavedAt(Date.now());
  }, [summaryId, value]);

  // Don't render anything if there's no summary context yet
  if (!summaryId) return null;

  return (
    <div
      className="fixed right-4 z-40 print:hidden"
      style={{ top: '6rem' }}
      aria-label="Notas rápidas"
    >
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col rounded-2xl border border-amber-200 bg-amber-50 shadow-lg"
            style={{
              width: expanded ? 420 : 280,
              maxHeight: 'calc(100vh - 8rem)',
              backgroundImage:
                'repeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(180, 130, 30, 0.08) 28px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200/70">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-lg bg-amber-200/60">
                  <StickyNote size={14} className="text-amber-700" />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-xs text-amber-900 truncate"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Notas rápidas
                  </p>
                  {contextLabel && (
                    <p className="text-[10px] text-amber-700/70 truncate">
                      {contextLabel}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-amber-700 hover:bg-amber-200/60"
                  onClick={() => setExpanded((v) => !v)}
                  aria-label={expanded ? 'Contraer' : 'Expandir'}
                  title={expanded ? 'Contraer' : 'Expandir'}
                >
                  {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-amber-700 hover:bg-amber-200/60"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar notas"
                  title="Cerrar"
                >
                  <X size={12} />
                </Button>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={value}
              onChange={handleChange}
              placeholder="Tu memoria RAM... escribe lo que necesites recordar mientras lees."
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-amber-950 placeholder:text-amber-700/40 focus:outline-none"
              style={{
                fontFamily: 'Georgia, serif',
                lineHeight: '28px',
                minHeight: 220,
              }}
              spellCheck
            />

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-amber-200/70 text-[10px] text-amber-700/80">
              <div className="flex items-center gap-1">
                <Save size={10} />
                <span>
                  {savedAt
                    ? `Guardado ${new Date(savedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : 'Autoguardado'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                disabled={!value}
                className="flex items-center gap-1 text-amber-700/80 hover:text-red-600 disabled:opacity-30 disabled:hover:text-amber-700/80"
              >
                <Trash2 size={10} />
                Limpiar
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="relative flex h-12 w-12 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 shadow-lg hover:bg-amber-100"
            aria-label="Abrir notas rápidas"
            title="Abrir notas rápidas"
          >
            <StickyNote size={18} />
            {value && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-50" />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StickyNotesPanel;
