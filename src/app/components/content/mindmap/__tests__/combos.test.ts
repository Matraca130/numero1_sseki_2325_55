// ============================================================
// Tests — Combos / Clusters (localStorage persistence)
//
// Tests for loadCombos, saveCombos, and MapCombo type structure.
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
  loadCombos,
  saveCombos,
} from '../useNodePositions';
import type { PersistedCombo } from '../useNodePositions';
import type { MapCombo } from '@/app/types/mindmap';

// ── Helpers ─────────────────────────────────────────────────

function resetStore() {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
}

function makeCombo(overrides: Partial<PersistedCombo> = {}): PersistedCombo {
  return {
    id: 'combo-1',
    label: 'Test Group',
    nodeIds: ['node-a', 'node-b'],
    collapsed: false,
    ...overrides,
  };
}

// ── loadCombos ──────────────────────────────────────────────

describe('loadCombos', () => {
  beforeEach(resetStore);

  it('returns empty array when nothing is stored', () => {
    const result = loadCombos('topic-1');
    expect(result).toEqual([]);
  });

  it('loads valid combos from localStorage', () => {
    const combos = [
      makeCombo({ id: 'c1', label: 'Group A', nodeIds: ['a', 'b'] }),
      makeCombo({ id: 'c2', label: 'Group B', nodeIds: ['c'] }),
    ];
    store['axon_combos_topic-1'] = JSON.stringify(combos);
    const result = loadCombos('topic-1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1');
    expect(result[1].nodeIds).toEqual(['c']);
  });

  it('filters out invalid entries (missing id)', () => {
    store['axon_combos_topic-2'] = JSON.stringify([
      makeCombo({ id: 'valid' }),
      { label: 'no-id', nodeIds: [] }, // missing id
      null,
      'string',
    ]);
    const result = loadCombos('topic-2');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid');
  });

  it('filters out entries with non-string id', () => {
    store['axon_combos_topic-3'] = JSON.stringify([
      { id: 123, label: 'bad', nodeIds: [] },
    ]);
    const result = loadCombos('topic-3');
    expect(result).toHaveLength(0);
  });

  it('filters out entries with non-string label', () => {
    store['axon_combos_topic-4'] = JSON.stringify([
      { id: 'c1', label: 123, nodeIds: [] },
    ]);
    const result = loadCombos('topic-4');
    expect(result).toHaveLength(0);
  });

  it('filters out entries with non-array nodeIds', () => {
    store['axon_combos_topic-5'] = JSON.stringify([
      { id: 'c1', label: 'group', nodeIds: 'not-array' },
    ]);
    const result = loadCombos('topic-5');
    expect(result).toHaveLength(0);
  });

  it('returns empty array on invalid JSON', () => {
    store['axon_combos_topic-6'] = 'not-valid-json{{{';
    const result = loadCombos('topic-6');
    expect(result).toEqual([]);
  });
});

// ── saveCombos ──────────────────────────────────────────────

describe('saveCombos', () => {
  beforeEach(resetStore);

  it('saves combos to localStorage', () => {
    const combos = [makeCombo({ id: 'c1' })];
    saveCombos('topic-1', combos);
    expect(store['axon_combos_topic-1']).toBeDefined();
    const parsed = JSON.parse(store['axon_combos_topic-1']);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('c1');
  });

  it('removes storage key when saving empty array', () => {
    saveCombos('topic-1', [makeCombo()]);
    expect(store['axon_combos_topic-1']).toBeDefined();
    saveCombos('topic-1', []);
    expect(store['axon_combos_topic-1']).toBeUndefined();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('axon_combos_topic-1');
  });

  it('overwrites existing combos', () => {
    saveCombos('topic-1', [makeCombo({ id: 'old' })]);
    saveCombos('topic-1', [makeCombo({ id: 'new' })]);
    const parsed = JSON.parse(store['axon_combos_topic-1']);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('new');
  });

  it('keeps separate storage per topic', () => {
    saveCombos('topic-1', [makeCombo({ id: 'c1' })]);
    saveCombos('topic-2', [makeCombo({ id: 'c2' })]);
    const p1 = JSON.parse(store['axon_combos_topic-1']);
    const p2 = JSON.parse(store['axon_combos_topic-2']);
    expect(p1[0].id).toBe('c1');
    expect(p2[0].id).toBe('c2');
  });
});

// ── Round-trip persistence ──────────────────────────────────

describe('Combo round-trip', () => {
  beforeEach(resetStore);

  it('save then load returns same data', () => {
    const combos = [
      makeCombo({ id: 'c1', label: 'Group 1', nodeIds: ['a', 'b'], collapsed: true }),
      makeCombo({ id: 'c2', label: 'Group 2', nodeIds: ['c'], collapsed: false }),
    ];
    saveCombos('topic-1', combos);
    const loaded = loadCombos('topic-1');
    expect(loaded).toEqual(combos);
  });
});

// ── MapCombo type structure ─────────────────────────────────

describe('MapCombo type structure', () => {
  it('MapCombo has id, label, and optional collapsed', () => {
    const combo: MapCombo = {
      id: 'combo-1',
      label: 'Test Group',
    };
    expect(combo.id).toBe('combo-1');
    expect(combo.label).toBe('Test Group');
    expect(combo.collapsed).toBeUndefined();
  });

  it('MapCombo collapsed can be set', () => {
    const combo: MapCombo = {
      id: 'combo-2',
      label: 'Collapsed Group',
      collapsed: true,
    };
    expect(combo.collapsed).toBe(true);
  });
});

// ── PersistedCombo extends MapCombo ─────────────────────────

describe('PersistedCombo type structure', () => {
  it('PersistedCombo has nodeIds in addition to MapCombo fields', () => {
    const persisted: PersistedCombo = {
      id: 'c1',
      label: 'Group',
      nodeIds: ['node-1', 'node-2', 'node-3'],
      collapsed: false,
    };
    expect(persisted.nodeIds).toHaveLength(3);
    expect(persisted.id).toBe('c1');
  });
});
