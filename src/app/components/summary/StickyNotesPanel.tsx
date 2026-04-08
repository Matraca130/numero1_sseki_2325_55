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
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
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
  Underline as UnderlineIcon,
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
const POSITION_STORAGE_KEY = 'axon:sticky-notes:position';
const SLOT_COUNT = 4;
const DEFAULT_SLOT_LABELS = ['Nota 1', 'Nota 2', 'Nota 3', 'Nota 4'];
const MAX_TITLE_LENGTH = 40;

// Approximate widget size used for bounds-clamping before layout is measured
const ESTIMATED_WIDGET_WIDTH = 280;
const ESTIMATED_WIDGET_HEIGHT = 360;
const EDGE_MARGIN = 8;

interface Position {
  x: number;
  y: number;
}

function loadSavedPosition(): Position | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Position>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

function clampToViewport(pos: Position, width: number, height: number): Position {
  if (typeof window === 'undefined') return pos;
  const maxX = Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN);
  const maxY = Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN);
  return {
    x: Math.min(Math.max(EDGE_MARGIN, pos.x), maxX),
    y: Math.min(Math.max(EDGE_MARGIN, pos.y), maxY),
  };
}

interface Slot {
  title: string;
  content: string;
}
type Slots = [Slot, Slot, Slot, Slot];
type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline';

// ── Rich-text helpers ────────────────────────────────────
// Note bodies are stored as HTML so users can underline (<u>) text. We keep
// the allowed-tag set extremely small (<u>, <br>) to avoid XSS surface area
// and to keep notes free of stray formatting from clipboard pastes.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Detects whether a stored note is in our HTML format (new) or legacy plain
// text. New notes always contain a <br>, <u>, or </u> tag once edited.
function isHtmlContent(content: string): boolean {
  return /<br\s*\/?>|<u>|<\/u>/i.test(content);
}

// Convert legacy plain text into our HTML format (escape entities and turn
// newlines into <br> tags) so old notes still render after the textarea →
// contentEditable migration.
function plainTextToHtml(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, '<br>');
}

// Idempotent migration helper used during parseSlots.
function ensureHtml(content: string): string {
  if (!content) return '';
  return isHtmlContent(content) ? content : plainTextToHtml(content);
}

// Strip everything except <u> and <br>. Block-ish elements (<div>, <p>) are
// flattened into trailing <br>s so the user's visual line structure is kept
// even when the browser inserts wrapper tags on Enter or paste.
function sanitizeNoteHtml(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') return html;
  const root = document.createElement('div');
  root.innerHTML = html;
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent ?? '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(node.childNodes).map(walk).join('');
    if (tag === 'u') return `<u>${inner}</u>`;
    if (tag === 'br') return '<br>';
    if (tag === 'div' || tag === 'p') {
      return inner.length ? `${inner}<br>` : '<br>';
    }
    return inner;
  };
  return Array.from(root.childNodes).map(walk).join('');
}

// Extract plain text from our HTML format for the picker preview.
function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html.replace(/<br\s*\/?>/gi, '\n');
  return tmp.textContent ?? '';
}

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
  const plain = isHtmlContent(text) ? htmlToPlainText(text) : text;
  const firstLine = plain.split('\n').find((l) => l.trim().length > 0) ?? '';
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
          out[i] = { title: '', content: ensureHtml(item) };
        } else if (item && typeof item === 'object') {
          const rawContent =
            typeof item.content === 'string' ? item.content : '';
          out[i] = {
            title: typeof item.title === 'string' ? item.title : '',
            content: ensureHtml(rawContent),
          };
        }
      }
      return out;
    }
  } catch {
    /* legacy plain text */
  }
  const out = emptySlots();
  out[0] = { title: '', content: ensureHtml(String(raw)) };
  return out;
}

function serializeSlots(slots: Slots): string {
  // If every slot is entirely empty (no title, no content) we persist an
  // empty string so the clear/delete semantics keep working with the backend.
  if (slots.every((s) => !s.title && !s.content)) return '';
  // Defense in depth: sanitize note bodies before persistence so anything
  // the contentEditable produced (browser-injected wrappers, paste leftovers)
  // is reduced to the allowed <u>/<br> subset.
  const cleaned = slots.map((s) => ({
    title: s.title,
    content: sanitizeNoteHtml(s.content),
  }));
  return JSON.stringify(cleaned);
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

// ── Rich-text editor ─────────────────────────────────────
// A small contentEditable wrapper used as a near-drop-in replacement for the
// previous <textarea>. Supports underline (via Ctrl+U or the toolbar button
// in the parent). Bold/italic shortcuts are intentionally swallowed since
// the panel only exposes the underline action.
//
// React + contentEditable interop: we update the DOM imperatively only when
// the `value` prop changes externally (e.g. when the user switches slots),
// so the user's caret position is preserved while typing.
interface NoteEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

const NoteEditor = forwardRef<HTMLDivElement, NoteEditorProps>(
  function NoteEditor(
    { value, onChange, placeholder, className, style },
    forwardedRef,
  ) {
    const localRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardedRef, () => localRef.current as HTMLDivElement);
    // Tracks the last innerHTML we (or the user) committed. Used to avoid
    // re-setting innerHTML on every render, which would clobber the caret.
    const lastValueRef = useRef<string>(value);

    useEffect(() => {
      const el = localRef.current;
      if (!el) return;
      if (value !== lastValueRef.current) {
        el.innerHTML = value;
        lastValueRef.current = value;
      }
    }, [value]);

    const handleInput = useCallback(
      (e: React.FormEvent<HTMLDivElement>) => {
        const html = e.currentTarget.innerHTML;
        lastValueRef.current = html;
        onChange(html);
      },
      [onChange],
    );

    // Block bold/italic shortcuts. Underline (Ctrl+U) is the browser default
    // and continues to work — that's exactly what we want.
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (
          (e.metaKey || e.ctrlKey) &&
          (e.key === 'b' || e.key === 'B' || e.key === 'i' || e.key === 'I')
        ) {
          e.preventDefault();
        }
      },
      [],
    );

    // Plain-text paste only — keeps notes free of foreign formatting and
    // means the sanitizer never has to deal with surprise tags.
    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (text) document.execCommand('insertText', false, text);
      },
      [],
    );

    const isEmpty = useMemo(() => {
      if (!value) return true;
      if (typeof document === 'undefined') return false;
      const tmp = document.createElement('div');
      tmp.innerHTML = value;
      return (tmp.textContent ?? '').trim() === '';
    }, [value]);

    return (
      <div className="relative flex flex-1 flex-col">
        <div
          ref={localRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Contenido de la nota"
          spellCheck
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={className}
          style={style}
        />
        {isEmpty && placeholder && (
          <div
            className="pointer-events-none absolute left-4 top-3 text-sm text-amber-700/40"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {placeholder}
          </div>
        )}
      </div>
    );
  },
);

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
  // Imperative handle to the contentEditable so the toolbar can call
  // execCommand against it when the underline button is pressed.
  const editorRef = useRef<HTMLDivElement>(null);

  // ── Draggable position state ─────────────────────────
  // `position` is null until the user drags; until then we use the original
  // top:7.5rem / right:1rem CSS anchor so first-time users see the panel
  // exactly where it used to be.
  const [position, setPosition] = useState<Position | null>(() => loadSavedPosition());
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 });
  const didDragRef = useRef(false);

  const handleDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore drags that start on interactive children (buttons, inputs, etc.)
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, [contenteditable="true"]')) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    didDragRef.current = false;
    setIsDragging(true);
    // Seed position from current on-screen rect so the first move is smooth
    // even when we were still using the default top/right CSS.
    setPosition({ x: rect.left, y: rect.top });
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const handleDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const container = containerRef.current;
    const width = container?.offsetWidth ?? ESTIMATED_WIDGET_WIDTH;
    const height = container?.offsetHeight ?? ESTIMATED_WIDGET_HEIGHT;
    const next = clampToViewport(
      {
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      },
      width,
      height,
    );
    didDragRef.current = true;
    setPosition(next);
  }, [isDragging]);

  const handleDragPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if pointer was not captured
    }
    if (didDragRef.current && position) {
      try {
        window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
      } catch {
        // localStorage unavailable — silently ignore
      }
    }
  }, [isDragging, position]);

  // Re-clamp on window resize and on expand toggle (panel width changes
  // 280 → 420 when expanded, so the right edge can fall off-screen).
  useEffect(() => {
    if (!position) return;
    const reclamp = () => {
      const container = containerRef.current;
      const width = container?.offsetWidth ?? ESTIMATED_WIDGET_WIDTH;
      const height = container?.offsetHeight ?? ESTIMATED_WIDGET_HEIGHT;
      setPosition((prev) => (prev ? clampToViewport(prev, width, height) : prev));
    };
    // Defer to next frame so offsetWidth reflects the new expanded layout
    const id = window.requestAnimationFrame(reclamp);
    window.addEventListener('resize', reclamp);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', reclamp);
    };
  }, [position, expanded]);

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

  // If the user has dragged the panel we use absolute x/y; otherwise we fall
  // back to the original top:7.5rem / right:1rem CSS anchor so first-time
  // users see the panel where it used to be.
  const wrapperPositionStyle: React.CSSProperties = position
    ? { left: `${position.x}px`, top: `${position.y}px`, zIndex: 1000 }
    : { top: '7.5rem', right: '1rem', zIndex: 1000 };

  // Render into a portal at document.body so we escape any ancestor
  // stacking context (transformed motion.div, layout headers with z-index,
  // overflow:hidden containers, etc.) and stay on top of the app header.
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
              onPointerDown={handleDragPointerDown}
              onPointerMove={handleDragPointerMove}
              onPointerUp={handleDragPointerUp}
              onPointerCancel={handleDragPointerUp}
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
                <NoteEditor
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
