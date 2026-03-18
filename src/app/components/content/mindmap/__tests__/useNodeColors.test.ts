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
