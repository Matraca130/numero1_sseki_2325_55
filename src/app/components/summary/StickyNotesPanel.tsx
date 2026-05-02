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
// This file is the composition shell. The responsibilities have been
// extracted to focused modules under `./stickyNotes/`:
//
//   - `./stickyNotes/noteHtml.ts` .............. HTML sanitization helpers
//   - `./stickyNotes/slots.ts` .................. slot model + persistence
//   - `./stickyNotes/useStickyNotesPosition.ts` . drag/position hook
//   - `./stickyNotes/StickyNoteEditor.tsx` ...... contentEditable wrapper
//   - `./stickyNotes/StickyNotesPicker.tsx` ..... 2x2 picker grid
//
// The public API (named export `StickyNotesPanel` + default export, props
// `{ summaryId, contextLabel }`) is preserved exactly.
// ============================================================
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type React from 'react';
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
  Underline as UnderlineIcon,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  getStickyNote,
  upsertStickyNote,
  deleteStickyNote,
} from '@/app/services/stickyNotesApi';
import {
  DEFAULT_SLOT_LABELS,
  MAX_TITLE_LENGTH,
  OPEN_STORAGE_KEY,
  SLOT_COUNT,
  displayTitle,
  emptySlot,
  emptySlots,
  parseSlots,
  readActiveSlot,
  readLocalSlots,
  serializeSlots,
  writeActiveSlot,
  writeLocalSlots,
  type Slot,
  type Slots,
  type SyncStatus,
} from './stickyNotes/slots';
import { useStickyNotesPosition } from './stickyNotes/useStickyNotesPosition';
import { StickyNoteEditor } from './stickyNotes/StickyNoteEditor';
import { StickyNotesPicker } from './stickyNotes/StickyNotesPicker';
import { useAuth } from '@/app/context/AuthContext';

interface StickyNotesPanelProps {
  /** Identifier used to scope notes per summary. */
  summaryId: string | null | undefined;
  /** Optional label shown in the header. */
  contextLabel?: string;
  /** Controlled open state. When omitted, falls back to legacy localStorage
   *  behavior (panel self-manages via OPEN_STORAGE_KEY). The reader shell
   *  passes this to tie open/close to a toolbar button and avoid the
   *  permanent corner FAB. */
  open?: boolean;
  /** Called when the user presses X / clicks the FAB to close. Required
   *  whenever `open` is provided — the parent owns the state. */
  onOpenChange?: (next: boolean) => void;
}

const STORAGE_PREFIX = 'axon:sticky-notes:';
export const STICKY_NOTES_DEBOUNCE_MS = 600;

type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline';

function readLocalNote(summaryId: string): string {
  try {
    return localStorage.getItem(STORAGE_PREFIX + summaryId) || '';
  } catch {
    return '';
  }
}

function writeLocalNote(summaryId: string, value: string) {
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

export function StickyNotesPanel({
  summaryId,
  contextLabel,
  open: controlledOpen,
  onOpenChange,
}: StickyNotesPanelProps) {
  const isControlled = typeof controlledOpen === 'boolean';
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(OPEN_STORAGE_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setUncontrolledOpen(next);
    }
  };
  const [expanded, setExpanded] = useState(false);
  const [slots, setSlots] = useState<Slots>(emptySlots);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const debounceRef = useRef<number | null>(null);
  // Tracks the summaryId for which the latest async load is valid (race-safety)
  const loadTokenRef = useRef<string | null>(null);
  // Imperative handle to the contentEditable so the toolbar can call
  // execCommand against it when the underline button is pressed.
  const editorRef = useRef<HTMLDivElement>(null);

  // Draggable position state / handlers live in a dedicated hook. The
  // userId scopes the persisted position per user so on shared devices
  // user A's panel position doesn't leak to user B (issue #723).
  const { user } = useAuth();
  const {
    containerRef,
    wrapperPositionStyle,
    isDragging,
    dragHandlers,
  } = useStickyNotesPosition(expanded, user?.id ?? null);

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

  // Persist open/closed state (uncontrolled mode only — in controlled mode
  // the reader shell owns the state and won't want localStorage side effects).
  useEffect(() => {
    if (isControlled) return;
    try {
      localStorage.setItem(OPEN_STORAGE_KEY, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [open, isControlled]);

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
      }, STICKY_NOTES_DEBOUNCE_MS);
    },
    [summaryId],
  );

  const handleSlotContentChange = useCallback(
    (html: string) => {
      if (activeSlot === null) return;
      setSlots((prev) => {
        const updated = [...prev] as Slots;
        updated[activeSlot] = { ...updated[activeSlot], content: html };
        scheduleSave(updated);
        return updated;
      });
    },
    [activeSlot, scheduleSave],
  );

  // Toolbar action: toggle <u> on the current selection. We preventDefault
  // on mouseDown so the button click doesn't steal focus from the editor —
  // otherwise execCommand would have no live selection to act on.
  const handleToggleUnderline = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const editor = editorRef.current;
      if (!editor) return;
      if (document.activeElement !== editor) editor.focus();
      document.execCommand('underline');
      // Belt-and-suspenders: not every browser fires `input` for execCommand,
      // so propagate the new HTML manually as well.
      handleSlotContentChange(editor.innerHTML);
    },
    [handleSlotContentChange],
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
  //
  // Controlled + closed: render nothing (parent's toolbar toggle owns the UI).
  // Uncontrolled + closed: render the legacy corner FAB.
  if (isControlled && !open) return null;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed print:hidden"
      style={wrapperPositionStyle}
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
            className={`flex flex-col rounded-2xl border border-amber-200 bg-amber-50 shadow-lg ${isDragging ? 'select-none shadow-xl' : ''}`}
            style={{
              width,
              maxHeight: 'calc(100vh - 8rem)',
              backgroundImage:
                'repeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(180, 130, 30, 0.08) 28px)',
            }}
          >
            {/* Header — doubles as drag handle */}
            <div
              className="flex items-center justify-between px-3 py-2 border-b border-amber-200/70 cursor-grab active:cursor-grabbing touch-none"
              {...dragHandlers}
              onPointerCancel={dragHandlers.onPointerUp}
              title="Arrastrar para mover"
            >
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
              <StickyNotesPicker
                slots={slots}
                onTitleChange={handleTitleChange}
                onOpenSlot={setActiveSlot}
              />
            ) : (
              <div className="flex flex-1 flex-col">
                {/* Formatting toolbar — only underline for now. */}
                <div
                  className="flex items-center gap-1 border-b border-amber-200/70 px-2 py-1"
                  role="toolbar"
                  aria-label="Formato de la nota"
                >
                  <button
                    type="button"
                    onMouseDown={handleToggleUnderline}
                    className="flex h-6 w-6 items-center justify-center rounded text-amber-700 hover:bg-amber-200/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/60"
                    aria-label="Subrayar (Ctrl+U)"
                    title="Subrayar (Ctrl+U)"
                  >
                    <UnderlineIcon size={12} />
                  </button>
                </div>
                <StickyNoteEditor
                  ref={editorRef}
                  value={activeSlotValue.content}
                  onChange={handleSlotContentChange}
                  placeholder={`Tu memoria RAM... ${displayTitle(activeSlotValue, activeSlot)}`}
                  className="flex-1 overflow-auto bg-transparent px-4 py-3 text-sm text-amber-950 focus:outline-none"
                  style={{
                    fontFamily: 'Georgia, serif',
                    lineHeight: '28px',
                    minHeight: 220,
                    whiteSpace: 'pre-wrap',
                  }}
                />
              </div>
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
              <span
                data-testid="sticky-notes-fab-badge"
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-50"
              />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

export default StickyNotesPanel;
