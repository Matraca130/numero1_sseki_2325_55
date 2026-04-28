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
