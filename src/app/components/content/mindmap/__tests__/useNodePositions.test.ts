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
});
