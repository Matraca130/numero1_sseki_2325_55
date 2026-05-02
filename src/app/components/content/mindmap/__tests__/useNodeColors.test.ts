// ============================================================
// Tests — useNodeColors (localStorage persistence)
//
// Tests for loadNodeColors, saveNodeColor, removeNodeColor,
// per-topic isolation, and palette exports.
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

import {
  loadNodeColors,
  saveNodeColor,
  removeNodeColor,
  NODE_COLOR_PALETTE,
  NODE_COLOR_FILL,
} from '../useNodeColors';

// ── Helpers ─────────────────────────────────────────────────

function resetStore() {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
}

// ── loadNodeColors ──────────────────────────────────────────

describe('loadNodeColors', () => {
  beforeEach(resetStore);

  it('returns empty map when nothing is stored', () => {
    const result = loadNodeColors('topic-1');
    expect(result.size).toBe(0);
  });

  it('loads valid hex colors from localStorage', () => {
    store['axon_node_colors_topic-1'] = JSON.stringify({
      nodeA: '#ef4444',
      nodeB: '#3b82f6',
    });
    const result = loadNodeColors('topic-1');
    expect(result.size).toBe(2);
    expect(result.get('nodeA')).toBe('#ef4444');
    expect(result.get('nodeB')).toBe('#3b82f6');
  });

  it('filters out non-string values', () => {
    store['axon_node_colors_topic-2'] = JSON.stringify({
      good: '#ef4444',
      bad1: 123,
      bad2: null,
      bad3: true,
    });
    const result = loadNodeColors('topic-2');
    expect(result.size).toBe(1);
    expect(result.has('good')).toBe(true);
  });

  it('filters out strings that do not start with #', () => {
    store['axon_node_colors_topic-3'] = JSON.stringify({
      good: '#abc123',
      bad: 'rgb(255,0,0)',
      alsobad: 'red',
    });
    const result = loadNodeColors('topic-3');
    expect(result.size).toBe(1);
    expect(result.get('good')).toBe('#abc123');
  });

  it('returns empty map on invalid JSON', () => {
    store['axon_node_colors_topic-4'] = 'not-valid-json!!!';
    const result = loadNodeColors('topic-4');
    expect(result.size).toBe(0);
  });

  it('returns empty map when stored value is not an object', () => {
    store['axon_node_colors_topic-5'] = JSON.stringify([1, 2, 3]);
    // JSON.parse returns an array, Object.entries works on arrays but
    // values are numbers, not strings starting with #
    const result = loadNodeColors('topic-5');
    expect(result.size).toBe(0);
  });
});

// ── saveNodeColor ───────────────────────────────────────────

describe('saveNodeColor', () => {
  beforeEach(resetStore);

  it('saves a single node color', () => {
    saveNodeColor('topic-1', 'nodeA', '#ef4444');
    const stored = JSON.parse(store['axon_node_colors_topic-1']);
    expect(stored.nodeA).toBe('#ef4444');
  });

  it('merges with existing colors', () => {
    saveNodeColor('topic-1', 'nodeA', '#ef4444');
    saveNodeColor('topic-1', 'nodeB', '#3b82f6');
    const stored = JSON.parse(store['axon_node_colors_topic-1']);
    expect(stored.nodeA).toBe('#ef4444');
    expect(stored.nodeB).toBe('#3b82f6');
  });

  it('overwrites existing color for same node', () => {
    saveNodeColor('topic-1', 'nodeA', '#ef4444');
    saveNodeColor('topic-1', 'nodeA', '#8b5cf6');
    const stored = JSON.parse(store['axon_node_colors_topic-1']);
    expect(stored.nodeA).toBe('#8b5cf6');
  });
});

// ── removeNodeColor ─────────────────────────────────────────

describe('removeNodeColor', () => {
  beforeEach(resetStore);

  it('removes a specific node color', () => {
    saveNodeColor('topic-1', 'nodeA', '#ef4444');
    saveNodeColor('topic-1', 'nodeB', '#3b82f6');
    removeNodeColor('topic-1', 'nodeA');
    const result = loadNodeColors('topic-1');
    expect(result.has('nodeA')).toBe(false);
    expect(result.has('nodeB')).toBe(true);
  });

  it('removes the storage key entirely when last color is removed', () => {
    saveNodeColor('topic-1', 'nodeA', '#ef4444');
    removeNodeColor('topic-1', 'nodeA');
    expect(store['axon_node_colors_topic-1']).toBeUndefined();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('axon_node_colors_topic-1');
  });

  it('does not throw when removing non-existent node', () => {
    expect(() => removeNodeColor('topic-1', 'nonexistent')).not.toThrow();
  });
});

// ── Per-topic isolation ─────────────────────────────────────

describe('Per-topic isolation', () => {
  beforeEach(resetStore);

  it('keeps separate colors per topic', () => {
    saveNodeColor('topic-1', 'nodeA', '#ef4444');
    saveNodeColor('topic-2', 'nodeA', '#3b82f6');
    expect(loadNodeColors('topic-1').get('nodeA')).toBe('#ef4444');
    expect(loadNodeColors('topic-2').get('nodeA')).toBe('#3b82f6');
  });

  it('removing from one topic does not affect another', () => {
    saveNodeColor('topic-1', 'nodeA', '#ef4444');
    saveNodeColor('topic-2', 'nodeA', '#3b82f6');
    removeNodeColor('topic-1', 'nodeA');
    expect(loadNodeColors('topic-1').size).toBe(0);
    expect(loadNodeColors('topic-2').get('nodeA')).toBe('#3b82f6');
  });
});

// ── NODE_COLOR_PALETTE ──────────────────────────────────────

describe('NODE_COLOR_PALETTE', () => {
  it('has exactly 6 colors', () => {
    expect(NODE_COLOR_PALETTE).toHaveLength(6);
  });

  it('each entry has hex and label', () => {
    for (const swatch of NODE_COLOR_PALETTE) {
      expect(swatch.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(typeof swatch.label).toBe('string');
      expect(swatch.label.length).toBeGreaterThan(0);
    }
  });

  it('all hex values are unique', () => {
    const hexes = NODE_COLOR_PALETTE.map(s => s.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
  });
});

// ── NODE_COLOR_FILL ─────────────────────────────────────────

describe('NODE_COLOR_FILL', () => {
  it('has a light fill for every palette color', () => {
    for (const swatch of NODE_COLOR_PALETTE) {
      expect(NODE_COLOR_FILL[swatch.hex]).toBeDefined();
      expect(NODE_COLOR_FILL[swatch.hex]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('light fills differ from their stroke colors', () => {
    for (const swatch of NODE_COLOR_PALETTE) {
      expect(NODE_COLOR_FILL[swatch.hex]).not.toBe(swatch.hex);
    }
  });
});

// ── Module exports ──────────────────────────────────────────

describe('Module exports', () => {
  it('all useNodeColors exports are available from the module', async () => {
    const mod = await import('../useNodeColors');
    expect(mod.loadNodeColors).toBeDefined();
    expect(mod.saveNodeColor).toBeDefined();
    expect(mod.removeNodeColor).toBeDefined();
    expect(mod.NODE_COLOR_PALETTE).toBeDefined();
    expect(mod.NODE_COLOR_FILL).toBeDefined();
  });
});

// ── Hex regex boundaries (3-8 char range) ───────────────────

describe('Hex regex boundaries on load', () => {
  beforeEach(resetStore);

  it('accepts 3-char hex (#abc)', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#abc' });
    expect(loadNodeColors('t').get('n')).toBe('#abc');
  });

  it('accepts 4-char hex (#abcd)', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#abcd' });
    expect(loadNodeColors('t').get('n')).toBe('#abcd');
  });

  it('accepts 5-char hex (#abcde)', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#abcde' });
    expect(loadNodeColors('t').get('n')).toBe('#abcde');
  });

  it('accepts 6-char hex (#abcdef)', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#abcdef' });
    expect(loadNodeColors('t').get('n')).toBe('#abcdef');
  });

  it('accepts 7-char hex (#abcdef1)', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#abcdef1' });
    expect(loadNodeColors('t').get('n')).toBe('#abcdef1');
  });

  it('accepts 8-char hex (#abcdef12) — RGBA', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#abcdef12' });
    expect(loadNodeColors('t').get('n')).toBe('#abcdef12');
  });

  it('rejects 2-char hex (#ab)', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#ab' });
    expect(loadNodeColors('t').size).toBe(0);
  });

  it('rejects 9-char hex (#abcdef123)', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#abcdef123' });
    expect(loadNodeColors('t').size).toBe(0);
  });

  it('rejects empty string', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '' });
    expect(loadNodeColors('t').size).toBe(0);
  });

  it('rejects bare # (no chars)', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#' });
    expect(loadNodeColors('t').size).toBe(0);
  });

  it('accepts uppercase hex letters', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#ABCDEF' });
    expect(loadNodeColors('t').get('n')).toBe('#ABCDEF');
  });

  it('accepts mixed-case hex letters', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#aBcDeF' });
    expect(loadNodeColors('t').get('n')).toBe('#aBcDeF');
  });

  it('rejects non-hex characters inside (#abcxyz)', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#abcxyz' });
    expect(loadNodeColors('t').size).toBe(0);
  });

  it('rejects internal whitespace (#ab cdef)', () => {
    store['axon_node_colors_t'] = JSON.stringify({ n: '#ab cdef' });
    expect(loadNodeColors('t').size).toBe(0);
  });
});

// ── saveNodeColor validation gate ───────────────────────────

describe('saveNodeColor validation gate', () => {
  beforeEach(resetStore);

  it('does not call localStorage.setItem for invalid color', () => {
    saveNodeColor('topic-1', 'nodeA', 'red');
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('does not call localStorage.setItem for empty string', () => {
    saveNodeColor('topic-1', 'nodeA', '');
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('does not call localStorage.setItem for rgb()', () => {
    saveNodeColor('topic-1', 'nodeA', 'rgb(255,0,0)');
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('does not call localStorage.setItem for hex without #', () => {
    saveNodeColor('topic-1', 'nodeA', 'ef4444');
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('does not erase existing entries when called with invalid color', () => {
    saveNodeColor('topic-1', 'nodeA', '#ef4444');
    saveNodeColor('topic-1', 'nodeA', 'not-a-color');
    expect(loadNodeColors('topic-1').get('nodeA')).toBe('#ef4444');
  });

  it('accepts 3-char hex on save', () => {
    saveNodeColor('topic-1', 'nodeA', '#fff');
    expect(loadNodeColors('topic-1').get('nodeA')).toBe('#fff');
  });

  it('accepts 8-char hex on save', () => {
    saveNodeColor('topic-1', 'nodeA', '#ff0000aa');
    expect(loadNodeColors('topic-1').get('nodeA')).toBe('#ff0000aa');
  });
});

// ── LRU eviction at MAX_COLORS=200 ──────────────────────────

describe('LRU eviction at MAX_COLORS', () => {
  beforeEach(resetStore);

  it('caps at 200 colors when adding 201 distinct nodes', () => {
    for (let i = 0; i < 201; i++) {
      saveNodeColor('t', `node${i}`, '#ef4444');
    }
    const stored = loadNodeColors('t');
    expect(stored.size).toBe(200);
  });

  it('evicts the oldest (first-inserted) entry when over limit', () => {
    for (let i = 0; i < 201; i++) {
      saveNodeColor('t', `node${i}`, '#ef4444');
    }
    const stored = loadNodeColors('t');
    // node0 (first inserted) should have been evicted
    expect(stored.has('node0')).toBe(false);
    // node200 (latest) should be present
    expect(stored.has('node200')).toBe(true);
  });

  it('keeps the most recent 200 entries', () => {
    for (let i = 0; i < 250; i++) {
      saveNodeColor('t', `node${i}`, '#3b82f6');
    }
    const stored = loadNodeColors('t');
    expect(stored.size).toBe(200);
    // node0..node49 should all be evicted (50 oldest dropped)
    for (let i = 0; i < 50; i++) {
      expect(stored.has(`node${i}`)).toBe(false);
    }
    // node50..node249 should remain
    for (let i = 50; i < 250; i++) {
      expect(stored.has(`node${i}`)).toBe(true);
    }
  });

  it('re-saving existing node at cap does not evict (still 200)', () => {
    for (let i = 0; i < 200; i++) {
      saveNodeColor('t', `node${i}`, '#ef4444');
    }
    expect(loadNodeColors('t').size).toBe(200);
    // Re-save existing node — moves it to end, no eviction
    saveNodeColor('t', 'node0', '#3b82f6');
    const stored = loadNodeColors('t');
    expect(stored.size).toBe(200);
    expect(stored.has('node0')).toBe(true);
    expect(stored.get('node0')).toBe('#3b82f6');
  });
});

// ── Insertion order / LRU reorder via delete+set ────────────

describe('Insertion-order semantics', () => {
  beforeEach(resetStore);

  it('iteration order is insertion order on first save', () => {
    saveNodeColor('t', 'A', '#ef4444');
    saveNodeColor('t', 'B', '#3b82f6');
    saveNodeColor('t', 'C', '#8b5cf6');
    const keys = Array.from(loadNodeColors('t').keys());
    expect(keys).toEqual(['A', 'B', 'C']);
  });

  it('re-saving moves entry to end of iteration order', () => {
    saveNodeColor('t', 'A', '#ef4444');
    saveNodeColor('t', 'B', '#3b82f6');
    saveNodeColor('t', 'C', '#8b5cf6');
    saveNodeColor('t', 'A', '#f97316'); // re-save A
    const keys = Array.from(loadNodeColors('t').keys());
    expect(keys).toEqual(['B', 'C', 'A']);
  });

  it('JSON serialization preserves Map insertion order', () => {
    saveNodeColor('t', 'A', '#ef4444');
    saveNodeColor('t', 'B', '#3b82f6');
    saveNodeColor('t', 'A', '#8b5cf6'); // move A to end
    const raw = store['axon_node_colors_t'];
    const parsedKeys = Object.keys(JSON.parse(raw));
    expect(parsedKeys).toEqual(['B', 'A']);
  });
});

// ── localStorage failure modes ──────────────────────────────

describe('localStorage failure modes', () => {
  beforeEach(resetStore);

  it('loadNodeColors returns empty Map when getItem throws', () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new Error('storage disabled');
    });
    const result = loadNodeColors('topic-1');
    expect(result.size).toBe(0);
  });

  it('saveNodeColor swallows quota errors silently', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveNodeColor('topic-1', 'nodeA', '#ef4444')).not.toThrow();
  });

  it('removeNodeColor swallows setItem errors silently', () => {
    saveNodeColor('topic-1', 'nodeA', '#ef4444');
    saveNodeColor('topic-1', 'nodeB', '#3b82f6');
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('quota');
    });
    expect(() => removeNodeColor('topic-1', 'nodeA')).not.toThrow();
  });

  it('removeNodeColor swallows removeItem errors silently', () => {
    saveNodeColor('topic-1', 'nodeA', '#ef4444');
    localStorageMock.removeItem.mockImplementationOnce(() => {
      throw new Error('storage disabled');
    });
    expect(() => removeNodeColor('topic-1', 'nodeA')).not.toThrow();
  });
});

// ── JSON.parse edge cases ───────────────────────────────────

describe('loadNodeColors JSON edge cases', () => {
  beforeEach(resetStore);

  it('returns empty Map when stored value is "null"', () => {
    store['axon_node_colors_t'] = 'null';
    const result = loadNodeColors('t');
    expect(result.size).toBe(0);
  });

  it('returns empty Map when stored value is a number primitive', () => {
    store['axon_node_colors_t'] = '123';
    const result = loadNodeColors('t');
    expect(result.size).toBe(0);
  });

  it('returns empty Map when stored value is a string primitive', () => {
    store['axon_node_colors_t'] = '"hello"';
    const result = loadNodeColors('t');
    expect(result.size).toBe(0);
  });

  it('returns empty Map when stored value is boolean true', () => {
    store['axon_node_colors_t'] = 'true';
    const result = loadNodeColors('t');
    expect(result.size).toBe(0);
  });

  it('rejects nested object values (not string)', () => {
    store['axon_node_colors_t'] = JSON.stringify({
      good: '#ef4444',
      bad: { nested: '#abc' },
    });
    const result = loadNodeColors('t');
    expect(result.size).toBe(1);
    expect(result.has('good')).toBe(true);
    expect(result.has('bad')).toBe(false);
  });

  it('rejects array values (not string)', () => {
    store['axon_node_colors_t'] = JSON.stringify({
      bad: ['#ef4444'],
    });
    expect(loadNodeColors('t').size).toBe(0);
  });

  it('returns empty Map when raw is empty string', () => {
    store['axon_node_colors_t'] = '';
    // Empty string is falsy → early return new Map()
    const result = loadNodeColors('t');
    expect(result.size).toBe(0);
  });
});

// ── Storage key literal ─────────────────────────────────────

describe('Storage key construction', () => {
  beforeEach(resetStore);

  it('uses exact prefix "axon_node_colors_"', () => {
    saveNodeColor('myTopic', 'nodeA', '#ef4444');
    expect(store['axon_node_colors_myTopic']).toBeDefined();
  });

  it('concatenates topicId raw without encoding', () => {
    saveNodeColor('topic with spaces', 'nodeA', '#ef4444');
    expect(store['axon_node_colors_topic with spaces']).toBeDefined();
  });

  it('preserves slashes in topicId without encoding', () => {
    saveNodeColor('a/b/c', 'nodeA', '#ef4444');
    expect(store['axon_node_colors_a/b/c']).toBeDefined();
  });

  it('preserves colons in topicId without encoding', () => {
    saveNodeColor('topic:1:2', 'nodeA', '#ef4444');
    expect(store['axon_node_colors_topic:1:2']).toBeDefined();
  });
});

// ── Edge-case IDs ───────────────────────────────────────────

describe('Edge-case IDs', () => {
  beforeEach(resetStore);

  it('handles empty topicId (key = prefix only)', () => {
    saveNodeColor('', 'nodeA', '#ef4444');
    expect(store['axon_node_colors_']).toBeDefined();
    expect(loadNodeColors('').get('nodeA')).toBe('#ef4444');
  });

  it('handles empty nodeId', () => {
    saveNodeColor('t', '', '#ef4444');
    expect(loadNodeColors('t').get('')).toBe('#ef4444');
  });

  it('handles nodeId with special chars (dots, slashes, spaces)', () => {
    saveNodeColor('t', 'a.b/c d', '#ef4444');
    expect(loadNodeColors('t').get('a.b/c d')).toBe('#ef4444');
  });
});

// ── Palette specifics (regression catches) ──────────────────

describe('Palette pinned values', () => {
  it('palette has exact 6 hex values in order', () => {
    expect(NODE_COLOR_PALETTE.map(s => s.hex)).toEqual([
      '#2a8c7a',
      '#ef4444',
      '#3b82f6',
      '#8b5cf6',
      '#f97316',
      '#ec4899',
    ]);
  });

  it('palette has Spanish labels in order', () => {
    expect(NODE_COLOR_PALETTE.map(s => s.label)).toEqual([
      'Turquesa',
      'Rojo',
      'Azul',
      'Morado',
      'Naranja',
      'Rosa',
    ]);
  });

  it('NODE_COLOR_FILL has exactly 6 keys (no extras)', () => {
    expect(Object.keys(NODE_COLOR_FILL)).toHaveLength(6);
  });

  it('every fill key exists in palette', () => {
    const paletteHexes = new Set(NODE_COLOR_PALETTE.map(s => s.hex));
    for (const fillKey of Object.keys(NODE_COLOR_FILL)) {
      expect(paletteHexes.has(fillKey)).toBe(true);
    }
  });

  it('all fill values are 6-char hex starting with #', () => {
    for (const fillVal of Object.values(NODE_COLOR_FILL)) {
      expect(fillVal).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

// ── Round-trip integrity ────────────────────────────────────

describe('Round-trip integrity', () => {
  beforeEach(resetStore);

  it('save N colors → load returns the same map', () => {
    const inputs: Array<[string, string]> = [
      ['n1', '#ef4444'],
      ['n2', '#3b82f6'],
      ['n3', '#8b5cf6'],
      ['n4', '#abc'],
      ['n5', '#ABCDEF12'],
    ];
    for (const [id, c] of inputs) saveNodeColor('t', id, c);
    const loaded = loadNodeColors('t');
    for (const [id, c] of inputs) {
      expect(loaded.get(id)).toBe(c);
    }
    expect(loaded.size).toBe(inputs.length);
  });

  it('save → remove all → load returns empty (no orphan key)', () => {
    saveNodeColor('t', 'a', '#ef4444');
    saveNodeColor('t', 'b', '#3b82f6');
    removeNodeColor('t', 'a');
    removeNodeColor('t', 'b');
    expect(loadNodeColors('t').size).toBe(0);
    expect(store['axon_node_colors_t']).toBeUndefined();
  });

  it('removing one of many leaves storage key intact', () => {
    saveNodeColor('t', 'a', '#ef4444');
    saveNodeColor('t', 'b', '#3b82f6');
    removeNodeColor('t', 'a');
    expect(store['axon_node_colors_t']).toBeDefined();
    expect(loadNodeColors('t').size).toBe(1);
  });
});

// ── Cycle 56: source contract for HEX_COLOR_RE extraction ──

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('useNodeColors source contract (cycle 56)', () => {
  const source = readFileSync(
    resolve(__dirname, '../useNodeColors.ts'),
    'utf-8'
  );

  it('declares HEX_COLOR_RE as a module-level constant (no inline regex dups)', () => {
    expect(source).toMatch(/const\s+HEX_COLOR_RE\s*=\s*\/\^#\[0-9a-fA-F\]\{3,8\}\$\//);
  });

  it('uses HEX_COLOR_RE in load (read path) — no inline regex literal', () => {
    // Cycle 56: extracted to share between load and save paths.
    const inlineMatches = source.match(/\/\^#\[0-9a-fA-F\]\{3,8\}\$\//g) ?? [];
    // Exactly ONE occurrence (the const declaration); both call sites use HEX_COLOR_RE.test().
    expect(inlineMatches.length).toBe(1);
    expect((source.match(/HEX_COLOR_RE\.test\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

// ── Cycle 57: storage I/O delegation to ./storageHelpers ────

describe('useNodeColors source contract (cycle 57 — storage extraction)', () => {
  const source = readFileSync(
    resolve(__dirname, '../useNodeColors.ts'),
    'utf-8'
  );

  it("imports the storage helpers from './storageHelpers'", () => {
    expect(source).toContain("from './storageHelpers'");
  });

  it('uses safeGetJSON for the read path', () => {
    expect(source).toMatch(/safeGetJSON\(/);
  });

  it('uses safeSetJSON for the write path', () => {
    expect(source).toMatch(/safeSetJSON\(/);
  });

  it('uses safeRemoveItem for the cleanup path', () => {
    expect(source).toMatch(/safeRemoveItem\(/);
  });

  it('no longer issues raw JSON.parse calls (negative guard)', () => {
    // Stronger evidence: the migration moved every JSON.parse into the helper.
    expect(source).not.toMatch(/JSON\.parse\(/);
  });

  it('no longer issues raw JSON.stringify calls (negative guard)', () => {
    expect(source).not.toMatch(/JSON\.stringify\(/);
  });

  it('no longer issues raw localStorage.setItem / .removeItem calls', () => {
    // useNodeColors only reads/writes JSON; after migration no raw storage call survives.
    expect(source).not.toMatch(/localStorage\.setItem\(/);
    expect(source).not.toMatch(/localStorage\.removeItem\(/);
    expect(source).not.toMatch(/localStorage\.getItem\(/);
  });
});
