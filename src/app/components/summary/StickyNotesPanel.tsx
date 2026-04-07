// ============================================================
// Axon — StickyNotesPanel
//
// A floating, persistent "RAM-memory" notes panel that follows
// the user as they scroll through a summary. Acts like a sticky
// notepad divided into 4 independent "slices" (slots), each one
// its own note. Opens on a 2x2 picker grid; clicking a slot
// enters the editor for that slot. Back / prev / next navigation
// is supported and the last-opened slot is persisted per summary.
//
// Storage:
//   - Backend `content` field stores a JSON-serialized array of 4
//     `{ title, content }` objects. Legacy formats (plain text or a
//     4-string array) are migrated automatically on first load.
//   - localStorage mirrors the same JSON for instant reads and
//     offline fallback.
//   - The last-opened slot is persisted per summary under
//     `axon:sticky-notes:active:<summaryId>`.
// ============================================================
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  StickyNote,
  X,
  Save,
  Trash2,
  Maximize2,
  Minimize2,
  CloudOff,
  Cloud,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  getStickyNote,
  upsertStickyNote,
  deleteStickyNote,
} from '@/app/services/stickyNotesApi';

interface StickyNotesPanelProps {
  /** Identifier used to scope notes per summary. */
  summaryId: string | null | undefined;
  /** Optional label shown in the header. */
  contextLabel?: string;
}

const STORAGE_PREFIX = 'axon:sticky-notes:';
const ACTIVE_SLOT_PREFIX = 'axon:sticky-notes:active:';
const SLOT_COUNT = 4;
const DEFAULT_SLOT_LABELS = ['Nota 1', 'Nota 2', 'Nota 3', 'Nota 4'];
const MAX_TITLE_LENGTH = 40;

interface Slot {
  title: string;
  content: string;
}
type Slots = [Slot, Slot, Slot, Slot];
type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline';

function emptySlot(): Slot {
  return { title: '', content: '' };
}

function emptySlots(): Slots {
  return [emptySlot(), emptySlot(), emptySlot(), emptySlot()];
}

function displayTitle(slot: Slot, index: number): string {
  return slot.title.trim() || DEFAULT_SLOT_LABELS[index];
}

// First non-empty line of a note body, used as preview text in the picker.
function slotPreview(text: string): string {
  const firstLine = text.split('\n').find((l) => l.trim().length > 0) ?? '';
  return firstLine.trim();
}

/**
 * Parse a persisted content string into a 4-slot tuple.
 * Back-compat:
 *   - Plain-text legacy notes → placed into slot 0 content.
 *   - Array of strings (previous format) → wrapped with empty titles.
 *   - Array of `{title, content}` (current format) → used directly.
 */
function parseSlots(raw: string | null | undefined): Slots {
  if (!raw) return emptySlots();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const out = emptySlots();
      for (let i = 0; i < SLOT_COUNT; i++) {
        const item = parsed[i];
        if (typeof item === 'string') {
          out[i] = { title: '', content: item };
        } else if (item && typeof item === 'object') {
          out[i] = {
            title: typeof item.title === 'string' ? item.title : '',
            content: typeof item.content === 'string' ? item.content : '',
          };
        }
      }
      return out;
    }
  } catch {
    /* legacy plain text */
  }
  const out = emptySlots();
  out[0] = { title: '', content: String(raw) };
  return out;
}

function serializeSlots(slots: Slots): string {
  // If every slot is entirely empty (no title, no content) we persist an
  // empty string so the clear/delete semantics keep working with the backend.
  if (slots.every((s) => !s.title && !s.content)) return '';
  return JSON.stringify(slots);
}

function readLocalSlots(summaryId: string): Slots {
  try {
    return parseSlots(localStorage.getItem(STORAGE_PREFIX + summaryId));
  } catch {
    return emptySlots();
  }
}

function writeLocalSlots(summaryId: string, slots: Slots) {
  try {
    const serialized = serializeSlots(slots);
    if (serialized) {
      localStorage.setItem(STORAGE_PREFIX + summaryId, serialized);
    } else {
      localStorage.removeItem(STORAGE_PREFIX + summaryId);
    }
  } catch {
    /* localStorage not available */
  }
}

function readActiveSlot(summaryId: string): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SLOT_PREFIX + summaryId);
    if (raw === null) return null;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0 && n < SLOT_COUNT) return n;
    return null;
  } catch {
    return null;
  }
}

function writeActiveSlot(summaryId: string, slot: number | null) {
  try {
    if (slot === null) {
      localStorage.removeItem(ACTIVE_SLOT_PREFIX + summaryId);
    } else {
      localStorage.setItem(ACTIVE_SLOT_PREFIX + summaryId, String(slot));
    }
  } catch {
    /* ignore */
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
  const [slots, setSlots] = useState<Slots>(emptySlots);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const debounceRef = useRef<number | null>(null);
  // Tracks the summaryId for which the latest async load is valid (race-safety)
  const loadTokenRef = useRef<string | null>(null);

  // Load notes when summary changes — local first (instant), then backend (truth).
  useEffect(() => {
    if (!summaryId) {
      setSlots(emptySlots());
      setActiveSlot(null);
      return;
    }
    // Optimistic: show cached values immediately
    setSlots(readLocalSlots(summaryId));
    setActiveSlot(readActiveSlot(summaryId));
    setSyncStatus('idle');
    loadTokenRef.current = summaryId;

    (async () => {
      try {
        const remote = await getStickyNote(summaryId);
        // Bail if the user switched summaries while we were fetching
        if (loadTokenRef.current !== summaryId) return;
        const remoteSlots = parseSlots(remote?.content ?? '');
        setSlots(remoteSlots);
        writeLocalSlots(summaryId, remoteSlots);
      } catch {
        // Network/auth error → keep the localStorage value as fallback
        if (loadTokenRef.current !== summaryId) return;
        setSyncStatus('offline');
      }
    })();
  }, [summaryId]);

  // Persist open/closed state
  useEffect(() => {
    try {
      localStorage.setItem('axon:sticky-notes:open', open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open]);

  // Persist last-opened slot per summary. Skip writes until after the
  // load effect has populated state for this summaryId, otherwise the
  // previous summary's activeSlot leaks into the new summary's key.
  const activeSlotHydratedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!summaryId) return;
    if (activeSlotHydratedRef.current !== summaryId) {
      activeSlotHydratedRef.current = summaryId;
      return;
    }
    writeActiveSlot(summaryId, activeSlot);
  }, [summaryId, activeSlot]);

  const scheduleSave = useCallback(
    (nextSlots: Slots) => {
      if (!summaryId) return;
      // Local mirror is synchronous → never lose typing
      writeLocalSlots(summaryId, nextSlots);
      setSyncStatus('saving');
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(async () => {
        try {
          await upsertStickyNote({
            summary_id: summaryId,
            content: serializeSlots(nextSlots),
          });
          setSyncStatus('saved');
          setSavedAt(Date.now());
        } catch {
          setSyncStatus('offline');
        }
      }, 600);
    },
    [summaryId],
  );

  const handleSlotChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (activeSlot === null) return;
      const next = e.target.value;
      setSlots((prev) => {
        const updated = [...prev] as Slots;
        updated[activeSlot] = { ...updated[activeSlot], content: next };
        scheduleSave(updated);
        return updated;
      });
    },
    [activeSlot, scheduleSave],
  );

  const handleTitleChange = useCallback(
    (index: number, rawTitle: string) => {
      const next = rawTitle.slice(0, MAX_TITLE_LENGTH);
      setSlots((prev) => {
        const updated = [...prev] as Slots;
        updated[index] = { ...updated[index], title: next };
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave],
  );

  const handleClearCurrent = useCallback(async () => {
    if (activeSlot === null) return;
    const current = slots[activeSlot];
    if (!current.title && !current.content) return;
    if (!window.confirm(`¿Borrar "${displayTitle(current, activeSlot)}"?`)) return;
    setSlots((prev) => {
      const updated = [...prev] as Slots;
      updated[activeSlot] = emptySlot();
      scheduleSave(updated);
      return updated;
    });
  }, [activeSlot, slots, scheduleSave]);

  const handleClearAll = useCallback(async () => {
    if (!summaryId) return;
    if (slots.every((s) => !s.title && !s.content)) return;
    if (!window.confirm('¿Borrar TODAS las notas rápidas de este resumen?')) return;
    const cleared = emptySlots();
    setSlots(cleared);
    writeLocalSlots(summaryId, cleared);
    setSyncStatus('saving');
    try {
      await deleteStickyNote(summaryId);
      setSyncStatus('saved');
      setSavedAt(Date.now());
    } catch {
      setSyncStatus('offline');
    }
  }, [summaryId, slots]);

  // Flush pending debounced save on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const goBackToPicker = useCallback(() => setActiveSlot(null), []);
  const goPrevSlot = useCallback(() => {
    setActiveSlot((s) => (s === null ? null : (s + SLOT_COUNT - 1) % SLOT_COUNT));
  }, []);
  const goNextSlot = useCallback(() => {
    setActiveSlot((s) => (s === null ? null : (s + 1) % SLOT_COUNT));
  }, []);

  const hasAnyContent = useMemo(
    () => slots.some((s) => s.content.length > 0 || s.title.length > 0),
    [slots],
  );

  // Don't render anything if there's no summary context yet
  if (!summaryId) return null;
  // SSR / non-browser: bail
  if (typeof document === 'undefined') return null;

  const width = expanded ? 420 : 280;
  const activeSlotValue: Slot =
    activeSlot === null ? emptySlot() : slots[activeSlot];

  // Render into a portal at document.body so we escape any ancestor
  // stacking context (transformed motion.div, layout headers with z-index,
  // overflow:hidden containers, etc.) and stay on top of the app header.
  return createPortal(
    <div
      className="fixed right-4 print:hidden"
      style={{ top: '7.5rem', zIndex: 1000 }}
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
              width,
              maxHeight: 'calc(100vh - 8rem)',
              backgroundImage:
                'repeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(180, 130, 30, 0.08) 28px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200/70">
              <div className="flex items-center gap-2 min-w-0">
                {activeSlot !== null ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-amber-700 hover:bg-amber-200/60"
                    onClick={goBackToPicker}
                    aria-label="Volver"
                    title="Volver"
                  >
                    <ArrowLeft size={14} />
                  </Button>
                ) : (
                  <div className="p-1.5 rounded-lg bg-amber-200/60">
                    <StickyNote size={14} className="text-amber-700" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {activeSlot === null ? (
                    <p
                      className="text-xs text-amber-900 truncate"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      Notas rápidas
                    </p>
                  ) : (
                    <input
                      type="text"
                      value={activeSlotValue.title}
                      onChange={(e) => handleTitleChange(activeSlot, e.target.value)}
                      placeholder={DEFAULT_SLOT_LABELS[activeSlot]}
                      maxLength={MAX_TITLE_LENGTH}
                      aria-label="Nombre de la nota"
                      title="Cambiar nombre de la nota"
                      className="w-full bg-transparent text-xs text-amber-900 placeholder:text-amber-700/50 focus:outline-none focus:ring-1 focus:ring-amber-400/60 rounded px-1 -mx-1"
                      style={{ fontFamily: 'Georgia, serif' }}
                    />
                  )}
                  {contextLabel && (
                    <p className="text-[10px] text-amber-700/70 truncate">
                      {contextLabel}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {activeSlot !== null && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-amber-700 hover:bg-amber-200/60"
                      onClick={goPrevSlot}
                      aria-label="Nota anterior"
                      title="Nota anterior"
                    >
                      <ChevronLeft size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-amber-700 hover:bg-amber-200/60"
                      onClick={goNextSlot}
                      aria-label="Siguiente nota"
                      title="Siguiente nota"
                    >
                      <ChevronRight size={12} />
                    </Button>
                  </>
                )}
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

            {/* Body: picker (4 slices) or editor for one slot */}
            {activeSlot === null ? (
              <div
                className="grid grid-cols-2 gap-2 p-3"
                style={{ minHeight: 220 }}
                role="list"
                aria-label="Elegir nota"
              >
                {slots.map((slot, i) => {
                  const preview = slotPreview(slot.content);
                  const label = displayTitle(slot, i);
                  return (
                    <div
                      key={i}
                      className="group relative flex flex-col items-stretch gap-1 rounded-xl border border-amber-200/80 bg-amber-100/40 px-3 py-2 transition hover:bg-amber-100 hover:shadow-sm focus-within:ring-2 focus-within:ring-amber-400/60"
                      style={{ minHeight: 96 }}
                      role="listitem"
                    >
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={slot.title}
                          onChange={(e) => handleTitleChange(i, e.target.value)}
                          placeholder={DEFAULT_SLOT_LABELS[i]}
                          maxLength={MAX_TITLE_LENGTH}
                          aria-label={`Nombre de ${DEFAULT_SLOT_LABELS[i]}`}
                          title="Cambiar nombre"
                          className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-amber-800 placeholder:text-amber-700/50 focus:outline-none focus:ring-1 focus:ring-amber-400/60 rounded px-1 -mx-1"
                          style={{ fontFamily: 'Georgia, serif' }}
                        />
                        <Pencil
                          size={10}
                          className="text-amber-700/40 group-hover:text-amber-700/80 shrink-0"
                          aria-hidden
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSlot(i)}
                        className="flex-1 text-left focus:outline-none"
                        aria-label={`Abrir ${label}${preview ? `: ${preview}` : ' (vacía)'}`}
                      >
                        <span
                          className="line-clamp-3 text-[11px] leading-snug text-amber-900/80"
                          style={{ fontFamily: 'Georgia, serif' }}
                        >
                          {preview || (
                            <span className="italic text-amber-700/50">
                              Vacía — tocá para escribir
                            </span>
                          )}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={activeSlotValue.content}
                onChange={handleSlotChange}
                placeholder={`Tu memoria RAM... ${displayTitle(activeSlotValue, activeSlot)}`}
                className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-amber-950 placeholder:text-amber-700/40 focus:outline-none"
                style={{
                  fontFamily: 'Georgia, serif',
                  lineHeight: '28px',
                  minHeight: 220,
                }}
                spellCheck
              />
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-amber-200/70 text-[10px] text-amber-700/80">
              <div className="flex items-center gap-1">
                {syncStatus === 'offline' ? (
                  <>
                    <CloudOff size={10} className="text-amber-700/60" />
                    <span title="Guardado localmente — sin conexión al servidor">
                      Solo local
                    </span>
                  </>
                ) : syncStatus === 'saving' ? (
                  <>
                    <Save size={10} />
                    <span>Guardando...</span>
                  </>
                ) : savedAt ? (
                  <>
                    <Cloud size={10} />
                    <span>
                      Guardado{' '}
                      {new Date(savedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </>
                ) : (
                  <>
                    <Save size={10} />
                    <span>Autoguardado en la nube</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={activeSlot === null ? handleClearAll : handleClearCurrent}
                disabled={
                  activeSlot === null
                    ? !hasAnyContent
                    : !slots[activeSlot].content && !slots[activeSlot].title
                }
                className="flex items-center gap-1 text-amber-700/80 hover:text-red-600 disabled:opacity-30 disabled:hover:text-amber-700/80"
                title={activeSlot === null ? 'Borrar todas' : 'Borrar esta nota'}
              >
                <Trash2 size={10} />
                {activeSlot === null ? 'Limpiar todo' : 'Limpiar'}
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
            {hasAnyContent && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-50" />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

export default StickyNotesPanel;
