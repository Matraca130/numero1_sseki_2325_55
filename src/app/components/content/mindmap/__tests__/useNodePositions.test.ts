// ============================================================
// Tests — useNodePositions (localStorage persistence)
//
// Tests for loadPositions, saveNodePosition, clearPositions.
// Uses a mock localStorage since vitest runs in node env.
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
  loadPositions,
  saveNodePosition,
  clearPositions,
} from '../useNodePositions';

// ── Helpers ─────────────────────────────────────────────────

function resetStore() {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
}

// ── loadPositions ───────────────────────────────────────────

describe('loadPositions', () => {
  beforeEach(resetStore);

  it('returns empty map when nothing is stored', () => {
    const result = loadPositions('topic-1');
    expect(result.size).toBe(0);
  });

  it('loads valid positions from localStorage', () => {
    store['axon_node_pos_topic-1'] = JSON.stringify({
      nodeA: { x: 10, y: 20 },
      nodeB: { x: 30, y: 40 },
    });
    const result = loadPositions('topic-1');
    expect(result.size).toBe(2);
    expect(result.get('nodeA')).toEqual({ x: 10, y: 20 });
    expect(result.get('nodeB')).toEqual({ x: 30, y: 40 });
  });

  it('skips entries with invalid structure', () => {
    store['axon_node_pos_topic-2'] = JSON.stringify({
      good: { x: 1, y: 2 },
      bad1: { x: 'not-a-number', y: 2 },
      bad2: { x: 1 },
      bad3: 'string',
      bad4: null,
      bad5: { x: Infinity, y: 2 },
    });
    const result = loadPositions('topic-2');
    expect(result.size).toBe(1);
    expect(result.has('good')).toBe(true);
  });

  it('returns empty map on invalid JSON', () => {
    store['axon_node_pos_topic-3'] = 'not-json{{{';
    const result = loadPositions('topic-3');
    expect(result.size).toBe(0);
  });
});

// ── saveNodePosition ────────────────────────────────────────

describe('saveNodePosition', () => {
  beforeEach(resetStore);

  it('saves a single position', () => {
    saveNodePosition('topic-1', 'nodeA', { x: 100, y: 200 });
    const stored = JSON.parse(store['axon_node_pos_topic-1']);
    expect(stored.nodeA).toEqual({ x: 100, y: 200 });
  });

  it('merges with existing positions', () => {
    saveNodePosition('topic-1', 'nodeA', { x: 10, y: 20 });
    saveNodePosition('topic-1', 'nodeB', { x: 30, y: 40 });
    const stored = JSON.parse(store['axon_node_pos_topic-1']);
    expect(stored.nodeA).toEqual({ x: 10, y: 20 });
    expect(stored.nodeB).toEqual({ x: 30, y: 40 });
  });

  it('overwrites existing position for same node', () => {
    saveNodePosition('topic-1', 'nodeA', { x: 10, y: 20 });
    saveNodePosition('topic-1', 'nodeA', { x: 99, y: 88 });
    const stored = JSON.parse(store['axon_node_pos_topic-1']);
    expect(stored.nodeA).toEqual({ x: 99, y: 88 });
  });

  it('keeps separate storage per topic', () => {
    saveNodePosition('topic-1', 'nodeA', { x: 1, y: 1 });
    saveNodePosition('topic-2', 'nodeA', { x: 2, y: 2 });
    const s1 = JSON.parse(store['axon_node_pos_topic-1']);
    const s2 = JSON.parse(store['axon_node_pos_topic-2']);
    expect(s1.nodeA).toEqual({ x: 1, y: 1 });
    expect(s2.nodeA).toEqual({ x: 2, y: 2 });
  });
});

// ── clearPositions ──────────────────────────────────────────

describe('clearPositions', () => {
  beforeEach(resetStore);

  it('removes stored positions for a topic', () => {
    saveNodePosition('topic-1', 'nodeA', { x: 10, y: 20 });
    expect(store['axon_node_pos_topic-1']).toBeDefined();
    clearPositions('topic-1');
    expect(store['axon_node_pos_topic-1']).toBeUndefined();
  });

  it('does not affect other topics', () => {
    saveNodePosition('topic-1', 'nodeA', { x: 1, y: 1 });
    saveNodePosition('topic-2', 'nodeB', { x: 2, y: 2 });
    clearPositions('topic-1');
    expect(store['axon_node_pos_topic-1']).toBeUndefined();
    expect(store['axon_node_pos_topic-2']).toBeDefined();
  });

  it('does not throw when clearing non-existent topic', () => {
    expect(() => clearPositions('nonexistent')).not.toThrow();
  });

  it('also clears combo storage for the same topic', () => {
    store['axon_node_pos_t1'] = '{}';
    store['axon_combos_t1'] = '[]';
    clearPositions('t1');
    expect(store['axon_node_pos_t1']).toBeUndefined();
    expect(store['axon_combos_t1']).toBeUndefined();
  });
});

// ── LRU eviction (MAX_POSITIONS=500) ───────────────────────

describe('saveNodePosition LRU eviction', () => {
  beforeEach(resetStore);

  it('keeps the latest 500 positions and evicts the rest in insertion order', () => {
    for (let i = 0; i < 505; i++) {
      saveNodePosition('t', `n${i}`, { x: i, y: i });
    }
    const stored = JSON.parse(store['axon_node_pos_t']);
    const keys = Object.keys(stored);
    expect(keys.length).toBe(500);
    // First 5 nodes should have been evicted
    for (let i = 0; i < 5; i++) expect(stored[`n${i}`]).toBeUndefined();
    // Latest 5 must be present
    for (let i = 500; i < 505; i++) expect(stored[`n${i}`]).toEqual({ x: i, y: i });
  });

  it('updating an existing node moves it to the end (LRU touch)', () => {
    saveNodePosition('t', 'a', { x: 1, y: 1 });
    saveNodePosition('t', 'b', { x: 2, y: 2 });
    saveNodePosition('t', 'a', { x: 9, y: 9 }); // touch → moves to end
    const stored = JSON.parse(store['axon_node_pos_t']);
    const keys = Object.keys(stored);
    expect(keys[keys.length - 1]).toBe('a');
    expect(stored.a).toEqual({ x: 9, y: 9 });
  });
});

// ── MAX_TOPICS=50 eviction (touchTopicIndex) ───────────────

describe('Topic-level LRU (MAX_TOPICS=50)', () => {
  beforeEach(resetStore);

  it('evicts the oldest topic when the index grows past 50', () => {
    for (let i = 0; i < 52; i++) {
      saveNodePosition(`t${i}`, 'n', { x: 0, y: 0 });
    }
    expect(store['axon_node_pos_t0']).toBeUndefined();
    expect(store['axon_node_pos_t1']).toBeUndefined();
    expect(store['axon_node_pos_t51']).toBeDefined();
  });

  it('also drops the combo entry of the evicted topic', () => {
    // Pre-populate t0 combos
    store['axon_combos_t0'] = '[]';
    for (let i = 0; i < 51; i++) {
      saveNodePosition(`t${i}`, 'n', { x: 0, y: 0 });
    }
    expect(store['axon_combos_t0']).toBeUndefined();
  });

  it("touching an existing topic moves it to the end (won't be evicted next)", () => {
    for (let i = 0; i < 50; i++) {
      saveNodePosition(`t${i}`, 'n', { x: 0, y: 0 });
    }
    // Touch t0 (moves to end)
    saveNodePosition('t0', 'n', { x: 1, y: 1 });
    // Add one more topic — should evict t1, not t0
    saveNodePosition('t50', 'n', { x: 0, y: 0 });
    expect(store['axon_node_pos_t0']).toBeDefined();
    expect(store['axon_node_pos_t1']).toBeUndefined();
  });

  it('uses TOPIC_INDEX_KEY = "axon_node_pos_index"', () => {
    saveNodePosition('t1', 'n', { x: 0, y: 0 });
    expect(store['axon_node_pos_index']).toBeDefined();
    const ids = JSON.parse(store['axon_node_pos_index']);
    expect(ids).toEqual(['t1']);
  });

  // Cycle 57 regression guard: pre-refactor, a corrupted TOPIC_INDEX_KEY
  // payload would JSON.parse-throw → outer catch → abort the entire
  // saveNodePosition. After the storageHelpers extraction, safeGetJSON
  // returns null on corrupt JSON → self-heal by writing [topicId] and
  // continuing. Without this guard, a future "fix" that re-adds an outer
  // catch around saveNodePosition could silently re-introduce the abort.
  it('self-heals when TOPIC_INDEX_KEY payload is corrupted (cycle 57)', () => {
    store['axon_node_pos_index'] = '{not json';
    saveNodePosition('t1', 'n', { x: 5, y: 5 });
    // Self-healed: index now contains the new topic.
    const ids = JSON.parse(store['axon_node_pos_index']);
    expect(ids).toEqual(['t1']);
    // And the position itself was written, not silently dropped.
    expect(store['axon_node_pos_t1']).toBeDefined();
  });
});

// ── memoryCache hot path ───────────────────────────────────

describe('memoryCache hot path', () => {
  beforeEach(resetStore);

  it('persists positions through the cache without re-loading from storage', () => {
    saveNodePosition('t', 'a', { x: 1, y: 1 });
    saveNodePosition('t', 'b', { x: 2, y: 2 });
    saveNodePosition('t', 'c', { x: 3, y: 3 });
    const stored = JSON.parse(store['axon_node_pos_t']);
    expect(stored.a).toEqual({ x: 1, y: 1 });
    expect(stored.b).toEqual({ x: 2, y: 2 });
    expect(stored.c).toEqual({ x: 3, y: 3 });
  });

  it('clearPositions on the cached topic invalidates the cache', () => {
    saveNodePosition('t', 'a', { x: 1, y: 1 });
    clearPositions('t'); // resets memoryCache for 't'
    saveNodePosition('t', 'b', { x: 2, y: 2 });
    const stored = JSON.parse(store['axon_node_pos_t']);
    expect(stored.a).toBeUndefined(); // wiped
    expect(stored.b).toEqual({ x: 2, y: 2 });
  });

  it('switching topics rebuilds the cache from storage', () => {
    saveNodePosition('t1', 'a', { x: 1, y: 1 });
    saveNodePosition('t2', 'b', { x: 2, y: 2 });
    saveNodePosition('t1', 'c', { x: 3, y: 3 });
    const s1 = JSON.parse(store['axon_node_pos_t1']);
    expect(s1.a).toEqual({ x: 1, y: 1 });
    expect(s1.c).toEqual({ x: 3, y: 3 });
  });
});

// ── Combo persistence ─────────────────────────────────────

import { loadCombos, saveCombos } from '../useNodePositions';

describe('loadCombos / saveCombos', () => {
  beforeEach(resetStore);

  it('returns [] when nothing stored', () => {
    expect(loadCombos('t')).toEqual([]);
  });

  it('round-trips a list of combos', () => {
    const combos = [
      { id: 'c1', label: 'Group 1', nodeIds: ['a', 'b'], collapsed: false },
      { id: 'c2', label: 'Group 2', nodeIds: ['c', 'd'], collapsed: true },
    ];
    saveCombos('t', combos);
    expect(loadCombos('t')).toEqual(combos);
  });

  it('saving an empty array REMOVES the storage key (cleanup)', () => {
    saveCombos('t', [{ id: 'c', label: 'g', nodeIds: ['a'], collapsed: false }]);
    expect(store['axon_combos_t']).toBeDefined();
    saveCombos('t', []);
    expect(store['axon_combos_t']).toBeUndefined();
  });

  it('loadCombos validates each entry — drops invalid items', () => {
    store['axon_combos_t'] = JSON.stringify([
      { id: 'good', label: 'L', nodeIds: ['a'] },
      { id: 'no-label', nodeIds: ['x'] }, // missing label
      { label: 'no-id', nodeIds: ['x'] }, // missing id
      { id: 'bad-nodeIds', label: 'L', nodeIds: 'not-array' }, // wrong type
      null,
      'string',
    ]);
    const out = loadCombos('t');
    expect(out.length).toBe(1);
    expect(out[0].id).toBe('good');
  });

  it('returns [] on invalid JSON', () => {
    store['axon_combos_t'] = '{not json';
    expect(loadCombos('t')).toEqual([]);
  });

  it('isolates combos per topic', () => {
    saveCombos('t1', [{ id: 'c', label: 'A', nodeIds: ['a'], collapsed: false }]);
    saveCombos('t2', [{ id: 'd', label: 'B', nodeIds: ['b'], collapsed: false }]);
    expect(loadCombos('t1')[0].id).toBe('c');
    expect(loadCombos('t2')[0].id).toBe('d');
  });

  it('uses the axon_combos_ storage prefix', () => {
    saveCombos('xyz', [{ id: 'c', label: 'L', nodeIds: ['a'], collapsed: false }]);
    expect(store['axon_combos_xyz']).toBeDefined();
  });

  it('saveCombos also touches the topic index (keeps combos AND positions in sync)', () => {
    saveCombos('first-topic', [{ id: 'c', label: 'L', nodeIds: ['a'], collapsed: false }]);
    expect(store['axon_node_pos_index']).toBeDefined();
    expect(JSON.parse(store['axon_node_pos_index'])).toContain('first-topic');
  });
});

// ── Grid toggle persistence ────────────────────────────────

import { loadGridEnabled, saveGridEnabled } from '../useNodePositions';

describe('loadGridEnabled / saveGridEnabled', () => {
  beforeEach(resetStore);

  it('returns false when nothing stored', () => {
    expect(loadGridEnabled()).toBe(false);
  });

  it('round-trips true', () => {
    saveGridEnabled(true);
    expect(loadGridEnabled()).toBe(true);
  });

  it('round-trips false (explicit "0")', () => {
    saveGridEnabled(false);
    expect(loadGridEnabled()).toBe(false);
    expect(store['axon_grid_enabled']).toBe('0');
  });

  it('only "1" reads as true (any other value → false)', () => {
    store['axon_grid_enabled'] = 'yes';
    expect(loadGridEnabled()).toBe(false);
    store['axon_grid_enabled'] = '1';
    expect(loadGridEnabled()).toBe(true);
  });

  it('uses the axon_grid_enabled storage key (not topic-scoped)', () => {
    saveGridEnabled(true);
    expect(store['axon_grid_enabled']).toBeDefined();
  });
});

// ── Source-level invariants ────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';
const SOURCE_PATH = resolve(__dirname, '..', 'useNodePositions.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

describe('Source-level invariants', () => {
  it('STORAGE_PREFIX = "axon_node_pos_"', () => {
    expect(source).toMatch(/STORAGE_PREFIX\s*=\s*'axon_node_pos_'/);
  });

  it('COMBO_STORAGE_PREFIX = "axon_combos_"', () => {
    expect(source).toMatch(/COMBO_STORAGE_PREFIX\s*=\s*'axon_combos_'/);
  });

  it('TOPIC_INDEX_KEY = "axon_node_pos_index"', () => {
    expect(source).toMatch(/TOPIC_INDEX_KEY\s*=\s*'axon_node_pos_index'/);
  });

  it('GRID_STORAGE_KEY = "axon_grid_enabled"', () => {
    expect(source).toMatch(/GRID_STORAGE_KEY\s*=\s*'axon_grid_enabled'/);
  });

  it('MAX_POSITIONS = 500 (per-topic limit)', () => {
    expect(source).toMatch(/MAX_POSITIONS\s*=\s*500/);
  });

  it('MAX_TOPICS = 50 (cross-topic limit)', () => {
    expect(source).toMatch(/MAX_TOPICS\s*=\s*50/);
  });

  it('uses Number.isFinite to reject Infinity/NaN coordinates', () => {
    expect(source).toMatch(/Number\.isFinite\(\(val as NodePosition\)\.x\)/);
    expect(source).toMatch(/Number\.isFinite\(\(val as NodePosition\)\.y\)/);
  });

  it('delegates storage I/O to ./storageHelpers (Cycle 57 / 59 extractions)', () => {
    // Cycle 57: JSON I/O moved to safeGetJSON / safeSetJSON / safeRemoveItem.
    // Cycle 59: scalar grid pair migrated to safeGetItem / safeSetItem.
    expect(source).toContain("from './storageHelpers'");
    expect(source).toMatch(/safeGetJSON\(/);
    expect(source).toMatch(/safeSetJSON\(/);
    expect(source).toMatch(/safeGetItem\(/);
    expect(source).toMatch(/safeSetItem\(/);
    expect(source).toMatch(/safeRemoveItem\(/);
  });

  it('no longer issues raw JSON.parse calls (Cycle 57 negative guard)', () => {
    // Stronger evidence that the migration actually happened: every
    // JSON.parse must now live inside storageHelpers (or in tests).
    expect(source).not.toMatch(/JSON\.parse\(/);
  });

  it('no longer issues raw JSON.stringify calls (Cycle 57 negative guard)', () => {
    // After Cycle 57: every write goes through safeSetJSON (or safeSetItem
    // for scalars in cycle 59). Raw JSON.stringify should be entirely
    // absent from this file.
    expect(source).not.toMatch(/JSON\.stringify\(/);
  });

  it('grid pair delegates to safeGetItem / safeSetItem (Cycle 59 migration)', () => {
    // After Cycle 59: loadGridEnabled / saveGridEnabled no longer call
    // localStorage.getItem / localStorage.setItem directly. They go
    // through the storageHelpers scalar pair.
    expect(source).toMatch(/safeGetItem\(GRID_STORAGE_KEY\)\s*===\s*'1'/);
    expect(source).toMatch(/safeSetItem\(GRID_STORAGE_KEY/);
  });

  it('no longer issues raw localStorage.getItem / setItem calls (Cycle 59 negative guard)', () => {
    // Every storage access — JSON or scalar — now goes through helpers.
    expect(source).not.toMatch(/localStorage\.getItem\(/);
    expect(source).not.toMatch(/localStorage\.setItem\(/);
  });

  it('uses a single memoryCache for the active topic (avoids JSON.parse on rapid drag-end)', () => {
    expect(source).toContain('memoryCache');
    expect(source).toMatch(/memoryCache\s*=\s*\{\s*topicId,\s*map\s*\}/);
  });

  it('LRU is implemented via Map insertion-order trick (delete + set)', () => {
    expect(source).toMatch(/existing\.delete\(nodeId\)[\s\S]{0,80}existing\.set\(nodeId,\s*pos\)/);
  });
});
