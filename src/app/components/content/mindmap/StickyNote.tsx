// ============================================================
// Axon — StickyNote
//
// Virtual post-it note that floats above the knowledge graph.
// Draggable, editable, deletable. Persisted in localStorage.
// Max 10 notes per topic.
// ============================================================

import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { safeReleasePointerCapture } from './graphHelpers';
import { safeGetJSON, safeSetJSON } from './storageHelpers';

// ── Types ───────────────────────────────────────────────────

export interface StickyNoteData {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  createdAt: string;
}

// ── Constants ───────────────────────────────────────────────

const STORAGE_PREFIX = 'axon_sticky_notes_';
const MAX_NOTES = 10;

export const STICKY_COLORS = [
  { hex: '#fef3c7', label: 'Amarillo' },
  { hex: '#d1fae5', label: 'Verde' },
  { hex: '#dbeafe', label: 'Azul' },
  { hex: '#fce7f3', label: 'Rosa' },
] as const;

const BORDER_COLORS: Record<string, string> = {
  '#fef3c7': '#fbbf24',
  '#d1fae5': '#34d399',
  '#dbeafe': '#60a5fa',
  '#fce7f3': '#f472b6',
};

// ── Storage helpers ─────────────────────────────────────────

export function loadStickyNotes(topicId: string): StickyNoteData[] {
  const arr = safeGetJSON(STORAGE_PREFIX + topicId);
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (n: unknown): n is StickyNoteData =>
      typeof n === 'object' && n !== null &&
      'id' in n && 'text' in n && 'color' in n &&
      'x' in n && 'y' in n &&
      typeof (n as StickyNoteData).x === 'number' &&
      typeof (n as StickyNoteData).y === 'number',
  );
}

export function saveStickyNotes(topicId: string, notes: StickyNoteData[]): void {
  safeSetJSON(STORAGE_PREFIX + topicId, notes);
}

export function createStickyNote(color?: string): StickyNoteData {
  return {
    id: crypto.randomUUID(),
    text: '',
    color: color || STICKY_COLORS[0].hex,
    x: 80 + Math.random() * 100,
    y: 80 + Math.random() * 60,
    createdAt: new Date().toISOString(),
  };
}

// ── Props ───────────────────────────────────────────────────

interface StickyNoteProps {
  note: StickyNoteData;
  onUpdate: (updated: StickyNoteData) => void;
  onDelete: (id: string) => void;
}

// ── Component ───────────────────────────────────────────────

export const StickyNote = memo(function StickyNote({ note, onUpdate, onDelete }: StickyNoteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // Local drag offset — avoids re-rendering other notes during drag
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number } | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, noteX: 0, noteY: 0 });
  const noteRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const noteDataRef = useRef(note);
  noteDataRef.current = note;

  const borderColor = BORDER_COLORS[note.color] || '#d1d5db';

  // ── Drag handlers ───────────────────────────────────────

  const captureRef = useRef<{ el: HTMLElement; pid: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag from the header area (not from textarea)
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragOffset({ dx: 0, dy: 0 });
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      noteX: noteDataRef.current.x,
      noteY: noteDataRef.current.y,
    };
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    captureRef.current = { el, pid: e.pointerId };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    // Only update local offset — no parent re-render during drag
    setDragOffset({ dx, dy });
  }, [isDragging]);

  const handlePointerUp = useCallback((_e: React.PointerEvent) => {
    if (!isDragging) return;
    // Commit final position to parent on drag end
    const ds = dragStartRef.current;
    // Clamp to keep note within parent container bounds
    const parent = noteRef.current?.parentElement;
    const maxX = parent ? Math.max(0, parent.clientWidth - 160) : Infinity;
    const maxY = parent ? Math.max(0, parent.clientHeight - 100) : Infinity;
    const finalX = Math.min(maxX, Math.max(0, ds.noteX + (dragOffset?.dx ?? 0)));
    const finalY = Math.min(maxY, Math.max(0, ds.noteY + (dragOffset?.dy ?? 0)));
    onUpdateRef.current({ ...noteDataRef.current, x: finalX, y: finalY });
    setDragOffset(null);
    setIsDragging(false);
    if (captureRef.current) {
      safeReleasePointerCapture(captureRef.current.el, captureRef.current.pid, 'StickyNote');
      captureRef.current = null;
    }
  }, [isDragging, dragOffset]);

  // ── Keyboard move (a11y — Arrow keys move note by 10px) ──

  const MOVE_STEP = 10;
  const kbMoveRafRef = useRef<number>(0);
  const kbPendingRef = useRef<{ dx: number; dy: number } | null>(null);

  // Cleanup rAF on unmount
  useEffect(() => () => { if (kbMoveRafRef.current) cancelAnimationFrame(kbMoveRafRef.current); }, []);

  const handleKeyboardMove = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 50 : MOVE_STEP; // Shift = larger jumps
    let dx = 0, dy = 0;
    if (e.key === 'ArrowLeft') dx = -step;
    else if (e.key === 'ArrowRight') dx = step;
    else if (e.key === 'ArrowUp') dy = -step;
    else if (e.key === 'ArrowDown') dy = step;
    else return;
    e.preventDefault();
    e.stopPropagation();
    // Accumulate delta and batch via rAF to avoid excessive re-renders
    const prev = kbPendingRef.current;
    kbPendingRef.current = { dx: (prev?.dx ?? 0) + dx, dy: (prev?.dy ?? 0) + dy };
    if (!kbMoveRafRef.current) {
      kbMoveRafRef.current = requestAnimationFrame(() => {
        kbMoveRafRef.current = 0;
        const delta = kbPendingRef.current;
        kbPendingRef.current = null;
        if (!delta) return;
        const parent = noteRef.current?.parentElement;
        const maxX = parent ? Math.max(0, parent.clientWidth - 160) : Infinity;
        const maxY = parent ? Math.max(0, parent.clientHeight - 100) : Infinity;
        const newX = Math.min(maxX, Math.max(0, noteDataRef.current.x + delta.dx));
        const newY = Math.min(maxY, Math.max(0, noteDataRef.current.y + delta.dy));
        onUpdateRef.current({ ...noteDataRef.current, x: newX, y: newY });
      });
    }
  }, []);

  // ── Text change ─────────────────────────────────────────

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value.slice(0, 200); // Max 200 chars
    onUpdateRef.current({ ...noteDataRef.current, text });
  }, []);

  // ── Color cycle on double-click header ──────────────────

  const handleHeaderDoubleClick = useCallback(() => {
    const currentIdx = STICKY_COLORS.findIndex(c => c.hex === noteDataRef.current.color);
    const nextIdx = (currentIdx + 1) % STICKY_COLORS.length;
    onUpdateRef.current({ ...noteDataRef.current, color: STICKY_COLORS[nextIdx].hex });
  }, []);

  // Auto-focus textarea on creation (empty text)
  useEffect(() => {
    if (note.text === '' && textareaRef.current) {
      textareaRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-focus only on mount, not when note.text changes
  }, []);

  return (
    <div
      ref={noteRef}
      className="absolute select-none"
      role="group"
      aria-label={`Nota adhesiva: ${note.text || 'vacía'}`}
      style={{
        left: dragOffset ? Math.max(0, dragStartRef.current.noteX + dragOffset.dx) : note.x,
        top: dragOffset ? Math.max(0, dragStartRef.current.noteY + dragOffset.dy) : note.y,
        zIndex: isDragging ? 18 : 15,
        width: 150,
        touchAction: 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      <div
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: note.color,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor,
          boxShadow: isDragging
            ? '0 8px 25px rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.08)'
            : '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
          transform: isDragging ? 'scale(1.04) rotate(-1deg)' : 'scale(1)',
          transition: isDragging ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        {/* Header — drag handle + delete */}
        <div
          className="flex items-center justify-between px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ax-primary-500/40 rounded-t-lg"
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            borderBottom: `1px solid ${borderColor}40`,
          }}
          tabIndex={0}
          aria-roledescription="elemento arrastrable"
          aria-label="Mover nota (usa las flechas del teclado)"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleHeaderDoubleClick}
          onKeyDown={handleKeyboardMove}
        >
          <div
            className="flex gap-0.5"
            aria-hidden="true"
          >
            {/* Drag indicator dots */}
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: borderColor, opacity: 0.5 }} />
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: borderColor, opacity: 0.5 }} />
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: borderColor, opacity: 0.5 }} />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            className="rounded-full transition-opacity flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              opacity: isHovered ? 0.8 : 0.5,
            }}
            tabIndex={0}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            aria-label="Eliminar nota"
          >
            <X className="w-3 h-3" style={{ color: borderColor }} />
          </button>
        </div>

        {/* Editable text area */}
        <textarea
          ref={textareaRef}
          value={note.text}
          onChange={handleTextChange}
          placeholder="Escribe aquí..."
          className="w-full bg-transparent resize-none outline-none px-2 py-1.5 font-sans"
          style={{
            fontSize: 'clamp(0.6875rem, 1.1vw, 0.75rem)',
            lineHeight: 1.4,
            color: '#374151',
            minHeight: 72,
            maxHeight: 96,
          }}
          maxLength={200}
          aria-label="Texto de la nota"
        />
      </div>
    </div>
  );
});

// ── StickyNotesLayer ────────────────────────────────────────

interface StickyNotesLayerProps {
  topicId: string | undefined;
  notes: StickyNoteData[];
  onNotesChange: (notes: StickyNoteData[]) => void;
}

/**
 * Renders all sticky notes for a topic as an absolute overlay.
 * Parent must be position: relative.
 */
export const StickyNotesLayer = memo(function StickyNotesLayer({ topicId, notes, onNotesChange }: StickyNotesLayerProps) {
  // Debounce localStorage writes to avoid jank during drag (M-1 perf fix)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSave = useCallback((tid: string, data: StickyNoteData[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveStickyNotes(tid, data), 150);
  }, []);
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  const notesRef = useRef(notes);
  notesRef.current = notes;
  // Ref-stabilize onNotesChange to avoid stale closure in toast undo handler
  const onNotesChangeRef = useRef(onNotesChange);
  onNotesChangeRef.current = onNotesChange;

  const handleUpdate = useCallback((updated: StickyNoteData) => {
    const next = notesRef.current.map(n => n.id === updated.id ? updated : n);
    onNotesChangeRef.current(next);
    if (topicId) debouncedSave(topicId, next);
  }, [topicId, debouncedSave]);

  const handleDelete = useCallback((id: string) => {
    const deleted = notesRef.current.find(n => n.id === id);
    const next = notesRef.current.filter(n => n.id !== id);
    onNotesChangeRef.current(next);
    if (topicId) saveStickyNotes(topicId, next);
    // Toast with undo — restore the note if user clicks "Deshacer"
    if (deleted) {
      toast('Nota eliminada', {
        action: {
          label: 'Deshacer',
          onClick: () => {
            const restored = [...notesRef.current, deleted];
            onNotesChangeRef.current(restored);
            if (topicId) saveStickyNotes(topicId, restored);
          },
        },
        duration: 5000,
      });
    }
  }, [topicId]);

  if (notes.length === 0) return null;

  return (
    <>
      {notes.map(note => (
        <StickyNote
          key={note.id}
          note={note}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ))}
    </>
  );
});
