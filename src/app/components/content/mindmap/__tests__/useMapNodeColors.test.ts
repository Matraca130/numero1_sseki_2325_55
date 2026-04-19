// ============================================================
// Tests -- useMapNodeColors (hook wrapper for node color state)
//
// Tests the hook that manages custom node colors per topic:
// initial load on topicId change, handleNodeColorChange updating
// both React state and localStorage, empty topicId short-circuit.
//
// The underlying persistence (loadNodeColors, saveNodeColor) is
// already tested in useNodeColors.test.ts. This file focuses on
// the hook's React integration.
//
// Uses renderHook from @testing-library/react.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── localStorage mock ──────────────────────────────────────────

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

import { useMapNodeColors } from '../useMapNodeColors';

function resetStore() {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
}

// ── Initial state ────────────────────────────────────────────

describe('useMapNodeColors: initial state', () => {
  beforeEach(resetStore);

  it('starts with empty Map when no stored colors', () => {
    const { result } = renderHook(() => useMapNodeColors('topic-1'));
    expect(result.current.customNodeColors.size).toBe(0);
  });

  it('loads stored colors on mount', () => {
    store['axon_node_colors_topic-1'] = JSON.stringify({
      nodeA: '#ef4444',
      nodeB: '#3b82f6',
    });
    const { result } = renderHook(() => useMapNodeColors('topic-1'));
    expect(result.current.customNodeColors.size).toBe(2);
    expect(result.current.customNodeColors.get('nodeA')).toBe('#ef4444');
  });

  it('returns empty Map when topicId is empty string', () => {
    store['axon_node_colors_'] = JSON.stringify({ nodeA: '#ef4444' });
    const { result } = renderHook(() => useMapNodeColors(''));
    expect(result.current.customNodeColors.size).toBe(0);
  });
});

// ── Topic change ─────────────────────────────────────────────

describe('useMapNodeColors: topic change', () => {
  beforeEach(resetStore);

  it('reloads colors when topicId changes', () => {
    store['axon_node_colors_t1'] = JSON.stringify({ nodeA: '#ef4444' });
    store['axon_node_colors_t2'] = JSON.stringify({ nodeB: '#3b82f6', nodeC: '#22c55e' });

    const { result, rerender } = renderHook(
      ({ topicId }) => useMapNodeColors(topicId),
      { initialProps: { topicId: 't1' } },
    );
    expect(result.current.customNodeColors.size).toBe(1);
    expect(result.current.customNodeColors.get('nodeA')).toBe('#ef4444');

    rerender({ topicId: 't2' });
    expect(result.current.customNodeColors.size).toBe(2);
    expect(result.current.customNodeColors.get('nodeB')).toBe('#3b82f6');
  });

  it('clears colors when topicId becomes empty', () => {
    store['axon_node_colors_t1'] = JSON.stringify({ nodeA: '#ef4444' });

    const { result, rerender } = renderHook(
      ({ topicId }) => useMapNodeColors(topicId),
      { initialProps: { topicId: 't1' } },
    );
    expect(result.current.customNodeColors.size).toBe(1);

    rerender({ topicId: '' });
    expect(result.current.customNodeColors.size).toBe(0);
  });
});

// ── handleNodeColorChange ────────────────────────────────────

describe('useMapNodeColors: handleNodeColorChange', () => {
  beforeEach(resetStore);

  it('updates state with new color', () => {
    const { result } = renderHook(() => useMapNodeColors('topic-1'));
    act(() => {
      result.current.handleNodeColorChange('nodeA', '#ef4444');
    });
    expect(result.current.customNodeColors.get('nodeA')).toBe('#ef4444');
  });

  it('persists color to localStorage', () => {
    const { result } = renderHook(() => useMapNodeColors('topic-1'));
    act(() => {
      result.current.handleNodeColorChange('nodeA', '#ef4444');
    });
    const stored = JSON.parse(store['axon_node_colors_topic-1']);
    expect(stored.nodeA).toBe('#ef4444');
  });

  it('can set multiple colors', () => {
    const { result } = renderHook(() => useMapNodeColors('topic-1'));
    act(() => {
      result.current.handleNodeColorChange('nodeA', '#ef4444');
    });
    act(() => {
      result.current.handleNodeColorChange('nodeB', '#3b82f6');
    });
    expect(result.current.customNodeColors.size).toBe(2);
    expect(result.current.customNodeColors.get('nodeA')).toBe('#ef4444');
    expect(result.current.customNodeColors.get('nodeB')).toBe('#3b82f6');
  });

  it('overwrites existing color for same node', () => {
    const { result } = renderHook(() => useMapNodeColors('topic-1'));
    act(() => {
      result.current.handleNodeColorChange('nodeA', '#ef4444');
    });
    act(() => {
      result.current.handleNodeColorChange('nodeA', '#8b5cf6');
    });
    expect(result.current.customNodeColors.get('nodeA')).toBe('#8b5cf6');
  });

  it('does nothing when topicId is empty', () => {
    const { result } = renderHook(() => useMapNodeColors(''));
    act(() => {
      result.current.handleNodeColorChange('nodeA', '#ef4444');
    });
    expect(result.current.customNodeColors.size).toBe(0);
    expect(store['axon_node_colors_']).toBeUndefined();
  });
});

// ── setCustomNodeColors (direct setter) ──────────────────────

describe('useMapNodeColors: setCustomNodeColors', () => {
  beforeEach(resetStore);

  it('allows direct state replacement', () => {
    const { result } = renderHook(() => useMapNodeColors('topic-1'));
    act(() => {
      result.current.setCustomNodeColors(new Map([['x', '#000000']]));
    });
    expect(result.current.customNodeColors.get('x')).toBe('#000000');
  });
});

// ── Return shape ─────────────────────────────────────────────

describe('useMapNodeColors: return shape', () => {
  it('returns customNodeColors as a Map', () => {
    const { result } = renderHook(() => useMapNodeColors('topic-1'));
    expect(result.current.customNodeColors).toBeInstanceOf(Map);
  });

  it('returns handleNodeColorChange as a function', () => {
    const { result } = renderHook(() => useMapNodeColors('topic-1'));
    expect(typeof result.current.handleNodeColorChange).toBe('function');
  });

  it('returns setCustomNodeColors as a function', () => {
    const { result } = renderHook(() => useMapNodeColors('topic-1'));
    expect(typeof result.current.setCustomNodeColors).toBe('function');
  });
});
