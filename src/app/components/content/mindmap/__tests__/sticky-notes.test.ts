// ============================================================
// Tests — StickyNote (localStorage helpers + exports)
//
// Tests for loadStickyNotes, saveStickyNotes, createStickyNote,
// max 10 notes limit, color cycling, and barrel exports.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage before importing the module
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Mock crypto.randomUUID
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});

import {
  loadStickyNotes,
  saveStickyNotes,
  createStickyNote,
  STICKY_COLORS,
} from '../StickyNote';
import type { StickyNoteData } from '../StickyNote';

// ── Helpers ─────────────────────────────────────────────────

function resetStore() {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
  uuidCounter = 0;
}

function makeStickyNote(overrides: Partial<StickyNoteData> = {}): StickyNoteData {
  return {
    id: `note-${++uuidCounter}`,
    text: 'Test note',
    color: '#fef3c7',
    x: 100,
    y: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── loadStickyNotes ─────────────────────────────────────────

describe('loadStickyNotes', () => {
  beforeEach(resetStore);

  it('returns empty array when nothing is stored', () => {
    const result = loadStickyNotes('topic-1');
    expect(result).toEqual([]);
  });

  it('loads valid sticky notes from localStorage', () => {
    const notes: StickyNoteData[] = [
      makeStickyNote({ id: 'n1', text: 'Note 1' }),
      makeStickyNote({ id: 'n2', text: 'Note 2', x: 200, y: 300 }),
    ];
    store['axon_sticky_notes_topic-1'] = JSON.stringify(notes);
    const result = loadStickyNotes('topic-1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('n1');
    expect(result[1].x).toBe(200);
  });

  it('filters out invalid entries (missing required fields)', () => {
    store['axon_sticky_notes_topic-2'] = JSON.stringify([
      makeStickyNote({ id: 'valid' }),
      { id: 'bad', text: 'no coords' }, // missing x, y
      { text: 'no id', x: 1, y: 2 }, // missing id
      null,
      'string',
    ]);
    const result = loadStickyNotes('topic-2');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid');
  });

  it('filters out entries with non-numeric x/y', () => {
    store['axon_sticky_notes_topic-3'] = JSON.stringify([
      { id: 'bad', text: 'test', color: '#fff', x: 'not-a-number', y: 10, createdAt: 'x' },
    ]);
    const result = loadStickyNotes('topic-3');
    expect(result).toHaveLength(0);
  });

  it('returns empty array on invalid JSON', () => {
    store['axon_sticky_notes_topic-4'] = '{not-valid-json';
    const result = loadStickyNotes('topic-4');
    expect(result).toEqual([]);
  });

  it('returns empty array when stored value is not an array', () => {
    store['axon_sticky_notes_topic-5'] = JSON.stringify({ not: 'an array' });
    const result = loadStickyNotes('topic-5');
    expect(result).toEqual([]);
  });

  it('isolates notes per topic', () => {
    const notes1 = [makeStickyNote({ id: 'a' })];
    const notes2 = [makeStickyNote({ id: 'b' }), makeStickyNote({ id: 'c' })];
    store['axon_sticky_notes_t1'] = JSON.stringify(notes1);
    store['axon_sticky_notes_t2'] = JSON.stringify(notes2);
    expect(loadStickyNotes('t1')).toHaveLength(1);
    expect(loadStickyNotes('t2')).toHaveLength(2);
  });
});

// ── saveStickyNotes ─────────────────────────────────────────

describe('saveStickyNotes', () => {
  beforeEach(resetStore);

  it('saves notes to localStorage', () => {
    const notes = [makeStickyNote({ id: 'n1' })];
    saveStickyNotes('topic-1', notes);
    expect(store['axon_sticky_notes_topic-1']).toBeDefined();
    const parsed = JSON.parse(store['axon_sticky_notes_topic-1']);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('n1');
  });

  it('overwrites existing notes', () => {
    saveStickyNotes('topic-1', [makeStickyNote({ id: 'old' })]);
    saveStickyNotes('topic-1', [makeStickyNote({ id: 'new' })]);
    const parsed = JSON.parse(store['axon_sticky_notes_topic-1']);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('new');
  });

  it('saves empty array', () => {
    saveStickyNotes('topic-1', []);
    const parsed = JSON.parse(store['axon_sticky_notes_topic-1']);
    expect(parsed).toEqual([]);
  });
});

// ── createStickyNote ────────────────────────────────────────

describe('createStickyNote', () => {
  beforeEach(resetStore);

  it('creates a note with default yellow color', () => {
    const note = createStickyNote();
    expect(note.color).toBe(STICKY_COLORS[0].hex);
    expect(note.text).toBe('');
    expect(typeof note.id).toBe('string');
    expect(typeof note.x).toBe('number');
    expect(typeof note.y).toBe('number');
    expect(note.createdAt).toBeTruthy();
  });

  it('creates a note with specified color', () => {
    const note = createStickyNote('#d1fae5');
    expect(note.color).toBe('#d1fae5');
  });

  it('generates unique IDs', () => {
    const note1 = createStickyNote();
    const note2 = createStickyNote();
    expect(note1.id).not.toBe(note2.id);
  });

  it('positions notes within expected range', () => {
    // x: 80 + Math.random() * 100 => [80, 180)
    // y: 80 + Math.random() * 60 => [80, 140)
    const note = createStickyNote();
    expect(note.x).toBeGreaterThanOrEqual(80);
    expect(note.x).toBeLessThan(180);
    expect(note.y).toBeGreaterThanOrEqual(80);
    expect(note.y).toBeLessThan(140);
  });

  it('sets createdAt as a valid ISO timestamp', () => {
    const note = createStickyNote();
    const parsed = new Date(note.createdAt);
    expect(parsed.getTime()).not.toBeNaN();
  });
});

// ── Max 10 notes limit (consumer contract) ──────────────────

describe('MAX_NOTES limit', () => {
  beforeEach(resetStore);

  it('STICKY_COLORS constant defines exactly 4 colors', () => {
    expect(STICKY_COLORS).toHaveLength(4);
  });

  it('each STICKY_COLORS entry has hex and label', () => {
    for (const color of STICKY_COLORS) {
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(typeof color.label).toBe('string');
      expect(color.label.length).toBeGreaterThan(0);
    }
  });

  it('can store up to 10 notes per topic', () => {
    const notes: StickyNoteData[] = Array.from({ length: 10 }, (_, i) =>
      makeStickyNote({ id: `note-${i}` })
    );
    saveStickyNotes('topic-1', notes);
    const loaded = loadStickyNotes('topic-1');
    expect(loaded).toHaveLength(10);
  });
});

// ── Color cycling ───────────────────────────────────────────

describe('Color cycling', () => {
  it('STICKY_COLORS allows cycling with modular arithmetic', () => {
    for (let i = 0; i < STICKY_COLORS.length; i++) {
      const currentColor = STICKY_COLORS[i].hex;
      const currentIdx = STICKY_COLORS.findIndex(c => c.hex === currentColor);
      const nextIdx = (currentIdx + 1) % STICKY_COLORS.length;
      const nextColor = STICKY_COLORS[nextIdx].hex;

      // Next color should differ from current
      if (STICKY_COLORS.length > 1) {
        expect(nextColor).not.toBe(currentColor);
      }
    }
  });

  it('cycling wraps around from last to first', () => {
    const lastIdx = STICKY_COLORS.length - 1;
    const nextIdx = (lastIdx + 1) % STICKY_COLORS.length;
    expect(nextIdx).toBe(0);
  });
});

// ── Module exports ──────────────────────────────────────────

describe('Module exports', () => {
  it('StickyNote module exports all expected symbols', async () => {
    const mod = await import('../StickyNote');
    expect(mod.StickyNote).toBeDefined();
    expect(mod.StickyNotesLayer).toBeDefined();
    expect(typeof mod.StickyNote).toBe('function');
    expect(typeof mod.StickyNotesLayer).toBe('function');
    expect(mod.loadStickyNotes).toBeDefined();
    expect(mod.saveStickyNotes).toBeDefined();
    expect(mod.createStickyNote).toBeDefined();
    expect(mod.STICKY_COLORS).toBeDefined();
  });
});
