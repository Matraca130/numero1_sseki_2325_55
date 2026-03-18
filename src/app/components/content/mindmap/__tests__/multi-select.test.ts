// ============================================================
// Tests — Multi-select (selection toggle logic)
//
// Tests the selection toggle behavior used by the mindmap's
// multi-selection feature (Shift+click and brush-select).
// Pure logic tests, no DOM rendering.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { G6NodeEvent } from '@/app/types/mindmap';

// ── Selection toggle logic (mirrors KnowledgeGraph internals) ──

/**
 * Toggle a node in/out of the multi-selection set.
 * If shift is held, toggle the node. Otherwise, replace selection.
 */
function toggleSelection(
  currentSelection: Set<string>,
  nodeId: string,
  shiftKey: boolean,
): Set<string> {
  if (shiftKey) {
    const next = new Set(currentSelection);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    return next;
  }
  // No shift: replace selection with single node
  return new Set([nodeId]);
}

/**
 * Brush-select: add all nodes in the brush area to selection.
 */
function brushSelect(
  currentSelection: Set<string>,
  nodeIds: string[],
  additive: boolean,
): Set<string> {
  if (additive) {
    const next = new Set(currentSelection);
    for (const id of nodeIds) next.add(id);
    return next;
  }
  return new Set(nodeIds);
}

// ── Tests ───────────────────────────────────────────────────

describe('Selection toggle', () => {
  it('Shift+click adds a node to existing selection', () => {
    const current = new Set(['a', 'b']);
    const next = toggleSelection(current, 'c', true);
    expect(next.has('a')).toBe(true);
    expect(next.has('b')).toBe(true);
    expect(next.has('c')).toBe(true);
    expect(next.size).toBe(3);
  });

  it('Shift+click removes a node already in selection', () => {
    const current = new Set(['a', 'b', 'c']);
    const next = toggleSelection(current, 'b', true);
    expect(next.has('b')).toBe(false);
    expect(next.size).toBe(2);
  });

  it('Click without Shift replaces selection with single node', () => {
    const current = new Set(['a', 'b', 'c']);
    const next = toggleSelection(current, 'x', false);
    expect(next.size).toBe(1);
    expect(next.has('x')).toBe(true);
  });

  it('Click without Shift on already selected node keeps single selection', () => {
    const current = new Set(['a', 'b']);
    const next = toggleSelection(current, 'a', false);
    expect(next.size).toBe(1);
    expect(next.has('a')).toBe(true);
  });

  it('Shift+click on empty selection adds the node', () => {
    const next = toggleSelection(new Set(), 'a', true);
    expect(next.size).toBe(1);
    expect(next.has('a')).toBe(true);
  });

  it('does not mutate the original set', () => {
    const current = new Set(['a']);
    const next = toggleSelection(current, 'b', true);
    expect(current.size).toBe(1);
    expect(next.size).toBe(2);
  });
});

describe('Brush select', () => {
  it('replaces selection with brushed nodes (non-additive)', () => {
    const current = new Set(['x']);
    const next = brushSelect(current, ['a', 'b', 'c'], false);
    expect(next.size).toBe(3);
    expect(next.has('x')).toBe(false);
  });

  it('adds to existing selection (additive mode)', () => {
    const current = new Set(['x']);
    const next = brushSelect(current, ['a', 'b'], true);
    expect(next.size).toBe(3);
    expect(next.has('x')).toBe(true);
    expect(next.has('a')).toBe(true);
  });

  it('handles empty brush area', () => {
    const current = new Set(['a']);
    const next = brushSelect(current, [], false);
    expect(next.size).toBe(0);
  });

  it('deduplicates when adding existing nodes', () => {
    const current = new Set(['a', 'b']);
    const next = brushSelect(current, ['b', 'c'], true);
    expect(next.size).toBe(3); // a, b, c
  });
});

describe('G6NodeEvent type contract', () => {
  it('G6NodeEvent supports originalEvent for modifier key detection', () => {
    const event: G6NodeEvent = {
      target: { id: 'node-1' },
      clientX: 100,
      clientY: 200,
      originalEvent: {
        shiftKey: true,
        ctrlKey: false,
      } as MouseEvent,
    };
    expect(event.originalEvent?.shiftKey).toBe(true);
  });

  it('all G6NodeEvent fields are optional', () => {
    const event: G6NodeEvent = {};
    expect(event.target).toBeUndefined();
    expect(event.originalEvent).toBeUndefined();
  });
});
