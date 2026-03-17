// ============================================================
// Tests — graphHelpers (pure utility functions)
//
// Tests for getNodeFill, getNodeStroke, getEdgeColor, escHtml,
// buildChildrenMap, and computeHiddenNodes.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  getNodeFill,
  getNodeStroke,
  getEdgeColor,
  escHtml,
  buildChildrenMap,
  computeHiddenNodes,
} from '../graphHelpers';
import type { MasteryColor } from '@/app/lib/mastery-helpers';

// ── getNodeFill ─────────────────────────────────────────────

describe('getNodeFill', () => {
  it('returns light hex for each mastery color', () => {
    expect(getNodeFill('green')).toBe('#d1fae5');
    expect(getNodeFill('yellow')).toBe('#fef3c7');
    expect(getNodeFill('red')).toBe('#fee2e2');
    expect(getNodeFill('gray')).toBe('#f3f4f6');
  });
});

// ── getNodeStroke ───────────────────────────────────────────

describe('getNodeStroke', () => {
  it('returns bold hex for each mastery color', () => {
    expect(getNodeStroke('green')).toBe('#10b981');
    expect(getNodeStroke('yellow')).toBe('#f59e0b');
    expect(getNodeStroke('red')).toBe('#ef4444');
    expect(getNodeStroke('gray')).toBe('#9ca3af');
  });
});

// ── getEdgeColor ────────────────────────────────────────────

describe('getEdgeColor', () => {
  it('returns default gray when no connection type', () => {
    expect(getEdgeColor()).toBe('#d1d5db');
    expect(getEdgeColor(undefined)).toBe('#d1d5db');
  });

  it('returns correct color for known connection types', () => {
    expect(getEdgeColor('prerequisito')).toBe('#f97316');
    expect(getEdgeColor('causa-efecto')).toBe('#ef4444');
    expect(getEdgeColor('asociacion')).toBe('#64748b');
    expect(getEdgeColor('tratamiento')).toBe('#10b981');
  });

  it('returns default gray for unknown connection type', () => {
    expect(getEdgeColor('nonexistent-type')).toBe('#d1d5db');
  });
});

// ── escHtml ─────────────────────────────────────────────────

describe('escHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(escHtml('A & B')).toBe('A &amp; B');
  });

  it('escapes single quotes', () => {
    expect(escHtml("it's")).toBe('it&#39;s');
  });

  it('handles empty string', () => {
    expect(escHtml('')).toBe('');
  });

  it('returns the same string if no special characters', () => {
    expect(escHtml('hello world 123')).toBe('hello world 123');
  });

  it('handles strings with multiple special characters', () => {
    expect(escHtml('<a href="test">Tom & Jerry\'s</a>')).toBe(
      '&lt;a href=&quot;test&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;'
    );
  });
});

// ── buildChildrenMap ────────────────────────────────────────

describe('buildChildrenMap', () => {
  it('builds correct map from edges', () => {
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'a', target: 'c' },
      { id: 'e3', source: 'b', target: 'd' },
    ];
    const cm = buildChildrenMap(edges as any);
    expect(cm.get('a')).toEqual(['b', 'c']);
    expect(cm.get('b')).toEqual(['d']);
    expect(cm.has('c')).toBe(false);
    expect(cm.has('d')).toBe(false);
  });

  it('handles empty edges', () => {
    const cm = buildChildrenMap([]);
    expect(cm.size).toBe(0);
  });
});

// ── computeHiddenNodes ──────────────────────────────────────

describe('computeHiddenNodes', () => {
  const mkNode = (id: string) => ({
    id,
    label: id,
    type: 'keyword' as const,
    mastery: 0.5,
    masteryColor: 'green' as MasteryColor,
  });

  it('returns empty set when nothing is collapsed', () => {
    const nodes = [mkNode('a'), mkNode('b'), mkNode('c')];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ];
    const hidden = computeHiddenNodes(nodes, edges as any, new Set());
    expect(hidden.size).toBe(0);
  });

  it('hides descendants of collapsed node', () => {
    const nodes = [mkNode('a'), mkNode('b'), mkNode('c')];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ];
    // Collapse 'a' → 'b' and 'c' should be hidden
    const hidden = computeHiddenNodes(nodes, edges as any, new Set(['a']));
    expect(hidden.has('b')).toBe(true);
    expect(hidden.has('c')).toBe(true);
    expect(hidden.has('a')).toBe(false);
  });

  it('does not hide nodes reachable through other non-collapsed paths', () => {
    // a → b → d, a → c → d
    const nodes = [mkNode('a'), mkNode('b'), mkNode('c'), mkNode('d')];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'a', target: 'c' },
      { id: 'e3', source: 'b', target: 'd' },
      { id: 'e4', source: 'c', target: 'd' },
    ];
    // Collapse 'b' → 'd' still reachable via 'c'
    const hidden = computeHiddenNodes(nodes, edges as any, new Set(['b']));
    expect(hidden.has('d')).toBe(false);
    expect(hidden.has('b')).toBe(false);
  });

  it('accepts prebuilt children map', () => {
    const nodes = [mkNode('a'), mkNode('b')];
    const edges = [{ id: 'e1', source: 'a', target: 'b' }];
    const cm = buildChildrenMap(edges as any);
    const hidden = computeHiddenNodes(nodes, edges as any, new Set(['a']), cm);
    expect(hidden.has('b')).toBe(true);
  });
});
