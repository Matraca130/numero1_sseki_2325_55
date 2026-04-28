// ============================================================
// Contract test — StickyNote (helpers + module shape)
//
// Covers the pure helpers exported from StickyNote.tsx that
// have no rendering surface: loadStickyNotes / saveStickyNotes
// / createStickyNote / STICKY_COLORS, plus a source-level
// contract check on the React components.
//
// localStorage is stubbed in-memory so tests are deterministic.
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'StickyNote.tsx');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── In-memory localStorage stub ──────────────────────────────

class MemoryStorage {
  store = new Map<string, string>();
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  get length() { return this.store.size; }
}

let memStore: MemoryStorage;

beforeEach(() => {
  memStore = new MemoryStorage();
  vi.stubGlobal('localStorage', memStore);
  // crypto.randomUUID — provide a stable but unique stub
  let counter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `uuid-${++counter}`,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Import AFTER stubs are in place — but the helpers don't read globals at
// import-time, so order is not strictly required. We import lazily per test.
async function importHelpers() {
  return await import('../StickyNote');
}

// ── Module exports / source contract ─────────────────────────

describe('StickyNote module contract', () => {
  it('exports StickyNoteData interface', () => {
    expect(source).toContain('export interface StickyNoteData');
  });

  it('exports STICKY_COLORS constant', () => {
    expect(source).toContain('export const STICKY_COLORS');
  });

  it('exports loadStickyNotes helper', () => {
    expect(source).toContain('export function loadStickyNotes');
  });

  it('exports saveStickyNotes helper', () => {
    expect(source).toContain('export function saveStickyNotes');
  });

  it('exports createStickyNote helper', () => {
    expect(source).toContain('export function createStickyNote');
  });

  it('exports memoized StickyNote component', () => {
    expect(source).toContain('export const StickyNote = memo(');
  });

  it('exports memoized StickyNotesLayer component', () => {
    expect(source).toContain('export const StickyNotesLayer = memo(');
  });

  it('uses safeReleasePointerCapture for capture cleanup', () => {
    expect(source).toContain('safeReleasePointerCapture');
  });

  it('caps text length at 200 characters', () => {
    expect(source).toMatch(/maxLength=\{?200\}?|slice\(0,\s*200\)/);
  });

  it('limits notes-per-topic to 10 (MAX_NOTES)', () => {
    expect(source).toMatch(/MAX_NOTES\s*=\s*10/);
  });

  it('debounces saveStickyNotes during drag (M-1 perf fix)', () => {
    expect(source).toContain('saveTimerRef');
    expect(source).toContain('debouncedSave');
  });
});

// ── STICKY_COLORS shape ──────────────────────────────────────

describe('STICKY_COLORS', () => {
  it('exposes 4 color presets', async () => {
    const { STICKY_COLORS } = await importHelpers();
    expect(STICKY_COLORS).toHaveLength(4);
  });

  it('each entry has hex + label', async () => {
    const { STICKY_COLORS } = await importHelpers();
    for (const c of STICKY_COLORS) {
      expect(c).toHaveProperty('hex');
      expect(c).toHaveProperty('label');
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(typeof c.label).toBe('string');
      expect(c.label.length).toBeGreaterThan(0);
    }
  });

  it('all hex values are unique', async () => {
    const { STICKY_COLORS } = await importHelpers();
    const hexes = STICKY_COLORS.map(c => c.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
  });
});

// ── createStickyNote ─────────────────────────────────────────

describe('createStickyNote', () => {
  it('returns a note with all required fields', async () => {
    const { createStickyNote } = await importHelpers();
    const n = createStickyNote();
    expect(n.id).toBeTruthy();
    expect(n.text).toBe('');
    expect(typeof n.color).toBe('string');
    expect(typeof n.x).toBe('number');
    expect(typeof n.y).toBe('number');
    expect(typeof n.createdAt).toBe('string');
  });

  it('defaults to first STICKY_COLORS hex when no color passed', async () => {
    const { createStickyNote, STICKY_COLORS } = await importHelpers();
    const n = createStickyNote();
    expect(n.color).toBe(STICKY_COLORS[0].hex);
  });

  it('uses caller-provided color when given', async () => {
    const { createStickyNote } = await importHelpers();
    const n = createStickyNote('#abcdef');
    expect(n.color).toBe('#abcdef');
  });

  it('places note inside the visible canvas (positive coords)', async () => {
    const { createStickyNote } = await importHelpers();
    for (let i = 0; i < 10; i++) {
      const n = createStickyNote();
      expect(n.x).toBeGreaterThanOrEqual(80);
      expect(n.x).toBeLessThan(80 + 100 + 1);
      expect(n.y).toBeGreaterThanOrEqual(80);
      expect(n.y).toBeLessThan(80 + 60 + 1);
    }
  });

  it('produces ISO-8601 createdAt strings', async () => {
    const { createStickyNote } = await importHelpers();
    const n = createStickyNote();
    expect(() => new Date(n.createdAt).toISOString()).not.toThrow();
    expect(new Date(n.createdAt).toISOString()).toBe(n.createdAt);
  });
});

// ── saveStickyNotes / loadStickyNotes round-trip ─────────────

describe('saveStickyNotes / loadStickyNotes', () => {
  it('round-trips a list of notes by topicId', async () => {
    const { saveStickyNotes, loadStickyNotes, createStickyNote } = await importHelpers();
    const notes = [createStickyNote(), createStickyNote('#dbeafe')];
    saveStickyNotes('topic-A', notes);
    const loaded = loadStickyNotes('topic-A');
    expect(loaded).toEqual(notes);
  });

  it('returns [] for an unknown topic id', async () => {
    const { loadStickyNotes } = await importHelpers();
    expect(loadStickyNotes('nope')).toEqual([]);
  });

  it('isolates notes per topic id', async () => {
    const { saveStickyNotes, loadStickyNotes, createStickyNote } = await importHelpers();
    saveStickyNotes('A', [createStickyNote()]);
    saveStickyNotes('B', [createStickyNote(), createStickyNote()]);
    expect(loadStickyNotes('A')).toHaveLength(1);
    expect(loadStickyNotes('B')).toHaveLength(2);
  });

  it('uses the axon_sticky_notes_ storage prefix', async () => {
    const { saveStickyNotes, createStickyNote } = await importHelpers();
    saveStickyNotes('topic-X', [createStickyNote()]);
    const keys = Array.from(memStore.store.keys());
    expect(keys.some(k => k === 'axon_sticky_notes_topic-X')).toBe(true);
  });

  it('returns [] when stored payload is not JSON', async () => {
    const { loadStickyNotes } = await importHelpers();
    memStore.setItem('axon_sticky_notes_corrupted', '{not-json}');
    expect(loadStickyNotes('corrupted')).toEqual([]);
  });

  it('returns [] when stored payload is not an array', async () => {
    const { loadStickyNotes } = await importHelpers();
    memStore.setItem('axon_sticky_notes_obj', JSON.stringify({ id: 'x' }));
    expect(loadStickyNotes('obj')).toEqual([]);
  });

  it('filters out malformed entries on load', async () => {
    const { loadStickyNotes, createStickyNote } = await importHelpers();
    const valid = createStickyNote();
    const mixed = [
      valid,
      { id: 'broken' }, // missing fields
      null,
      'string-not-object',
      { ...valid, id: 'no-coords-1', x: 'a' },
      { ...valid, id: 'no-coords-2', y: undefined },
    ];
    memStore.setItem('axon_sticky_notes_mix', JSON.stringify(mixed));
    const loaded = loadStickyNotes('mix');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(valid.id);
  });

  it('overwriting saves the new value (no append)', async () => {
    const { saveStickyNotes, loadStickyNotes, createStickyNote } = await importHelpers();
    saveStickyNotes('topic', [createStickyNote(), createStickyNote()]);
    saveStickyNotes('topic', []);
    expect(loadStickyNotes('topic')).toEqual([]);
  });

  it('does not throw when localStorage.setItem throws (quota / disabled)', async () => {
    const { saveStickyNotes, createStickyNote } = await importHelpers();
    const broken = {
      getItem: () => null,
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
    vi.stubGlobal('localStorage', broken);
    expect(() => saveStickyNotes('t', [createStickyNote()])).not.toThrow();
  });

  it('does not throw when localStorage.getItem throws', async () => {
    const { loadStickyNotes } = await importHelpers();
    const broken = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
    vi.stubGlobal('localStorage', broken);
    expect(loadStickyNotes('t')).toEqual([]);
  });
});

// ── Drag handlers (replicated final-position logic) ────────

describe('Drag final-position clamp (replicated)', () => {
  // Mirrors handlePointerUp's clamp-to-parent-bounds logic.
  function clampDrop(
    noteX: number, noteY: number,
    dx: number, dy: number,
    parentW: number, parentH: number,
  ) {
    const maxX = Math.max(0, parentW - 160);
    const maxY = Math.max(0, parentH - 100);
    const finalX = Math.min(maxX, Math.max(0, noteX + dx));
    const finalY = Math.min(maxY, Math.max(0, noteY + dy));
    return { x: finalX, y: finalY };
  }

  it('clamps to (0, 0) when dropped above/left of origin', () => {
    expect(clampDrop(50, 50, -100, -100, 800, 600)).toEqual({ x: 0, y: 0 });
  });

  it('clamps to (parentW-160, parentH-100) max position', () => {
    expect(clampDrop(700, 500, 200, 200, 800, 600)).toEqual({ x: 640, y: 500 });
  });

  it('preserves position when drop is in bounds', () => {
    expect(clampDrop(100, 100, 50, 30, 800, 600)).toEqual({ x: 150, y: 130 });
  });

  it('handles tiny parent (parentW < 160) by clamping to 0', () => {
    expect(clampDrop(10, 10, 50, 50, 100, 50)).toEqual({ x: 0, y: 0 });
  });

  it('matches the source pattern: maxX = parent.clientWidth - 160', () => {
    expect(source).toMatch(/parent\.clientWidth\s*-\s*160/);
  });

  it('matches the source pattern: maxY = parent.clientHeight - 100', () => {
    expect(source).toMatch(/parent\.clientHeight\s*-\s*100/);
  });
});

// ── Keyboard movement (replicated) ─────────────────────────

describe('Keyboard arrow movement (replicated)', () => {
  // Mirrors handleKeyboardMove's step + clamp logic.
  const MOVE_STEP = 10;

  function computeDelta(key: string, shiftKey: boolean): { dx: number; dy: number } | null {
    const step = shiftKey ? 50 : MOVE_STEP;
    if (key === 'ArrowLeft') return { dx: -step, dy: 0 };
    if (key === 'ArrowRight') return { dx: step, dy: 0 };
    if (key === 'ArrowUp') return { dx: 0, dy: -step };
    if (key === 'ArrowDown') return { dx: 0, dy: step };
    return null;
  }

  it('regular arrow uses MOVE_STEP=10', () => {
    expect(computeDelta('ArrowRight', false)).toEqual({ dx: 10, dy: 0 });
    expect(computeDelta('ArrowLeft', false)).toEqual({ dx: -10, dy: 0 });
    expect(computeDelta('ArrowUp', false)).toEqual({ dx: 0, dy: -10 });
    expect(computeDelta('ArrowDown', false)).toEqual({ dx: 0, dy: 10 });
  });

  it('Shift+arrow uses 50px step (5× larger jump)', () => {
    expect(computeDelta('ArrowRight', true)).toEqual({ dx: 50, dy: 0 });
    expect(computeDelta('ArrowLeft', true)).toEqual({ dx: -50, dy: 0 });
    expect(computeDelta('ArrowUp', true)).toEqual({ dx: 0, dy: -50 });
    expect(computeDelta('ArrowDown', true)).toEqual({ dx: 0, dy: 50 });
  });

  it('non-arrow keys return null (no movement)', () => {
    expect(computeDelta('Enter', false)).toBeNull();
    expect(computeDelta('a', false)).toBeNull();
    expect(computeDelta('Escape', false)).toBeNull();
  });

  it('source declares MOVE_STEP = 10', () => {
    expect(source).toMatch(/MOVE_STEP\s*=\s*10/);
  });

  it('source uses 50 as the Shift step (no constant — inline)', () => {
    expect(source).toMatch(/e\.shiftKey\s*\?\s*50\s*:\s*MOVE_STEP/);
  });

  it('arrow handlers call preventDefault + stopPropagation', () => {
    expect(source).toMatch(/handleKeyboardMove[\s\S]{0,400}e\.preventDefault\(\)/);
    expect(source).toMatch(/handleKeyboardMove[\s\S]{0,500}e\.stopPropagation\(\)/);
  });

  it('rAF-batches accumulated deltas (kbPendingRef + kbMoveRafRef)', () => {
    expect(source).toContain('kbPendingRef');
    expect(source).toContain('kbMoveRafRef');
    expect(source).toMatch(/kbPendingRef\.current\s*=\s*\{\s*dx:\s*\(prev\?\.dx\s*\?\?\s*0\)\s*\+\s*dx,\s*dy:\s*\(prev\?\.dy\s*\?\?\s*0\)\s*\+\s*dy\s*\}/);
  });

  it('rAF cleanup on unmount cancels pending frame', () => {
    // useEffect(() => () => { ... }, []) — cleanup-only effect
    expect(source).toMatch(/useEffect\(\(\)\s*=>\s*\(\)\s*=>\s*\{\s*if\s*\(kbMoveRafRef\.current\)\s*cancelAnimationFrame\(kbMoveRafRef\.current\)/);
  });
});

// ── Color cycle on header dblclick (replicated) ────────────

describe('Color cycle on header double-click (replicated)', () => {
  const COLORS = ['#fef3c7', '#d1fae5', '#dbeafe', '#fce7f3'];

  function nextColor(currentHex: string): string {
    const currentIdx = COLORS.findIndex(c => c === currentHex);
    const nextIdx = (currentIdx + 1) % COLORS.length;
    return COLORS[nextIdx];
  }

  it('cycles forward through STICKY_COLORS', () => {
    expect(nextColor('#fef3c7')).toBe('#d1fae5');
    expect(nextColor('#d1fae5')).toBe('#dbeafe');
    expect(nextColor('#dbeafe')).toBe('#fce7f3');
  });

  it('wraps from last back to first', () => {
    expect(nextColor('#fce7f3')).toBe('#fef3c7');
  });

  it('treats unknown color as -1 → cycles to index 0 (first preset)', () => {
    // (-1 + 1) % 4 = 0
    expect(nextColor('#unknown')).toBe('#fef3c7');
  });

  it('source uses modulo cycling: (currentIdx + 1) % STICKY_COLORS.length', () => {
    expect(source).toMatch(/\(currentIdx\s*\+\s*1\)\s*%\s*STICKY_COLORS\.length/);
  });

  it('handler is bound to onDoubleClick on the header', () => {
    expect(source).toMatch(/onDoubleClick=\{handleHeaderDoubleClick\}/);
  });
});

// ── Text change (replicated 200-char clamp) ────────────────

describe('Text change clamp (replicated)', () => {
  function clampText(input: string): string {
    return input.slice(0, 200);
  }

  it('passes through text under 200 chars unchanged', () => {
    expect(clampText('hello world')).toBe('hello world');
  });

  it('truncates at exactly 200 chars', () => {
    const long = 'a'.repeat(250);
    expect(clampText(long).length).toBe(200);
  });

  it('source clamps via .slice(0, 200) and not maxLength only', () => {
    expect(source).toMatch(/e\.target\.value\.slice\(0,\s*200\)/);
  });

  it('the textarea also has maxLength=200 attribute (defensive double-guard)', () => {
    expect(source).toMatch(/maxLength=\{200\}/);
  });
});

// ── Auto-focus on creation ─────────────────────────────────

describe('Auto-focus on creation (empty text)', () => {
  it('focuses textarea via mount-only effect', () => {
    expect(source).toMatch(/if\s*\(note\.text\s*===\s*''\s*&&\s*textareaRef\.current\)\s*\{\s*textareaRef\.current\.focus\(\)/);
  });

  it('eslint-disable on the deps array (intentional mount-only)', () => {
    expect(source).toMatch(/eslint-disable-next-line\s+react-hooks\/exhaustive-deps[\s\S]{0,200}\}, \[\]\)/);
  });
});

// ── Header drag-handle a11y ────────────────────────────────

describe('Header drag-handle accessibility', () => {
  it('uses tabIndex={0} so it can be focused', () => {
    expect(source).toMatch(/tabIndex=\{0\}/);
  });

  it("declares aria-roledescription='elemento arrastrable'", () => {
    expect(source).toContain('aria-roledescription="elemento arrastrable"');
  });

  it('aria-label hints arrow-key alternative', () => {
    expect(source).toContain('Mover nota (usa las flechas del teclado)');
  });

  it('cursor flips between grab and grabbing based on drag state', () => {
    expect(source).toMatch(/isDragging\s*\?\s*'grabbing'\s*:\s*'grab'/);
  });
});

// ── StickyNotesLayer behaviors ─────────────────────────────

describe('StickyNotesLayer behaviors', () => {
  it('debounces saveStickyNotes by 150ms (M-1 perf fix)', () => {
    expect(source).toMatch(/setTimeout\(\(\)\s*=>\s*saveStickyNotes\(tid,\s*data\),\s*150\)/);
  });

  it('clears prior debounce timer before scheduling new (no stacked saves)', () => {
    expect(source).toMatch(/if\s*\(saveTimerRef\.current\)\s*clearTimeout\(saveTimerRef\.current\)/);
  });

  it('cleanup return cancels pending save on unmount', () => {
    // Same useEffect-cleanup-only pattern as the rAF cleanup
    expect(source).toMatch(/useEffect\(\(\)\s*=>\s*\(\)\s*=>\s*\{\s*if\s*\(saveTimerRef\.current\)\s*clearTimeout\(saveTimerRef\.current\)/);
  });

  it('delete fires undo toast with restore action', () => {
    expect(source).toMatch(/toast\('Nota eliminada',\s*\{[\s\S]*?action:\s*\{[\s\S]*?label:\s*'Deshacer'/);
  });

  it('undo restores by appending the deleted note back', () => {
    expect(source).toMatch(/const restored\s*=\s*\[\.\.\.notesRef\.current,\s*deleted\]/);
  });

  it('undo persists via saveStickyNotes (immediate, not debounced)', () => {
    expect(source).toMatch(/onClick:\s*\(\)\s*=>\s*\{[\s\S]*?onNotesChangeRef\.current\(restored\)[\s\S]*?saveStickyNotes\(topicId,\s*restored\)/);
  });

  it('undo toast duration is 5000ms', () => {
    expect(source).toMatch(/duration:\s*5000/);
  });

  it('renders null when notes array is empty (no DOM)', () => {
    expect(source).toMatch(/if\s*\(notes\.length\s*===\s*0\)\s*return\s+null/);
  });

  it('uses ref-stabilized onNotesChangeRef to avoid stale closures in toast undo', () => {
    expect(source).toContain('onNotesChangeRef');
    expect(source).toMatch(/onNotesChangeRef\.current\s*=\s*onNotesChange/);
  });
});

// ── BORDER_COLORS palette (internal) ───────────────────────

describe('BORDER_COLORS palette (internal)', () => {
  it('declares one border color per STICKY_COLORS entry', () => {
    expect(source).toMatch(/'#fef3c7':\s*'#fbbf24'/);
    expect(source).toMatch(/'#d1fae5':\s*'#34d399'/);
    expect(source).toMatch(/'#dbeafe':\s*'#60a5fa'/);
    expect(source).toMatch(/'#fce7f3':\s*'#f472b6'/);
  });

  it('falls back to neutral #d1d5db when sticky color is unknown', () => {
    expect(source).toMatch(/BORDER_COLORS\[note\.color\]\s*\|\|\s*'#d1d5db'/);
  });
});

// ── Pointer drag math ──────────────────────────────────────

describe('Pointer drag tracking', () => {
  it('captures start position into dragStartRef.current on pointerdown', () => {
    expect(source).toMatch(/dragStartRef\.current\s*=\s*\{[\s\S]*?x:\s*e\.clientX[\s\S]*?y:\s*e\.clientY/);
  });

  it('skips drag if pointer started in TEXTAREA (allows native text selection)', () => {
    expect(source).toMatch(/if\s*\(\(e\.target\s+as\s+HTMLElement\)\.tagName\s*===\s*'TEXTAREA'\)\s*return/);
  });

  it('uses setPointerCapture during drag, releases via safeReleasePointerCapture', () => {
    expect(source).toContain('setPointerCapture(e.pointerId)');
    expect(source).toContain("safeReleasePointerCapture(captureRef.current.el, captureRef.current.pid, 'StickyNote')");
  });

  it('drag offset is committed to parent on pointerup (not during drag — local-only)', () => {
    expect(source).toMatch(/onUpdateRef\.current\(\{\s*\.\.\.noteDataRef\.current,\s*x:\s*finalX,\s*y:\s*finalY\s*\}\)/);
  });

  it('z-index lifts to 18 during drag, baseline 15', () => {
    expect(source).toMatch(/zIndex:\s*isDragging\s*\?\s*18\s*:\s*15/);
  });

  it('scale + rotate effect applies during drag (scale 1.04, rotate -1deg)', () => {
    expect(source).toMatch(/scale\(1\.04\)\s+rotate\(-1deg\)/);
  });
});
