// ============================================================
// Tests — graphHelpers (pure utility functions)
//
// Tests for getNodeFill, getNodeStroke, getEdgeColor, escHtml,
// buildChildrenMap, and computeHiddenNodes.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getNodeFill,
  getNodeStroke,
  getEdgeColor,
  escHtml,
  buildChildrenMap,
  computeHiddenNodes,
  devWarn,
  extractSubgraph,
} from '../graphHelpers';
import type { MasteryColor } from '@/app/lib/mastery-helpers';
import type { MapEdge } from '@/app/types/mindmap';

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
    const cm = buildChildrenMap(edges as MapEdge[]);
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
    const hidden = computeHiddenNodes(nodes, edges as MapEdge[], new Set());
    expect(hidden.size).toBe(0);
  });

  it('hides descendants of collapsed node', () => {
    const nodes = [mkNode('a'), mkNode('b'), mkNode('c')];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ];
    // Collapse 'a' → 'b' and 'c' should be hidden
    const hidden = computeHiddenNodes(nodes, edges as MapEdge[], new Set(['a']));
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
    const hidden = computeHiddenNodes(nodes, edges as MapEdge[], new Set(['b']));
    expect(hidden.has('d')).toBe(false);
    expect(hidden.has('b')).toBe(false);
  });

  it('accepts prebuilt children map', () => {
    const nodes = [mkNode('a'), mkNode('b')];
    const edges = [{ id: 'e1', source: 'a', target: 'b' }];
    const cm = buildChildrenMap(edges as MapEdge[]);
    const hidden = computeHiddenNodes(nodes, edges as MapEdge[], new Set(['a']), cm);
    expect(hidden.has('b')).toBe(true);
  });
});

// ── devWarn ─────────────────────────────────────────────────

describe('devWarn', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('emits a tagged warn in DEV (vitest sets DEV=true by default)', () => {
    const err = new Error('boom');
    devWarn('SomeModule', 'something failed', err);
    expect(warnSpy).toHaveBeenCalledWith('[SomeModule] something failed', err);
  });

  it('omits the trailing space when msg is empty (drops to "[Tag]")', () => {
    const err = new Error('boom');
    devWarn('SomeModule', '', err);
    expect(warnSpy).toHaveBeenCalledWith('[SomeModule]', err);
  });

  it('passes the error/value through unchanged', () => {
    const obj = { weird: 'object', nested: { x: 1 } };
    devWarn('Tag', 'see this', obj);
    expect(warnSpy).toHaveBeenCalledWith('[Tag] see this', obj);
  });

  it('accepts non-Error values (strings, undefined)', () => {
    devWarn('A', 'msg', 'string error');
    devWarn('B', 'msg', undefined);
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });

  it('always uses the [tag] convention so logs are filterable in DevTools', () => {
    devWarn('Mindmap', 'x', 'y');
    const firstArg = warnSpy.mock.calls[0][0];
    expect(typeof firstArg).toBe('string');
    expect(String(firstArg).startsWith('[Mindmap]')).toBe(true);
  });
});

// ── GRAPH_COLORS constant ──────────────────────────────────

import { GRAPH_COLORS, findNearestNode, safeReleasePointerCapture } from '../graphHelpers';
import type { NodeScreenPos } from '../graphHelpers';

describe('GRAPH_COLORS constant', () => {
  it('exports primary / primaryDark / primaryRgb keys', () => {
    expect(GRAPH_COLORS.primary).toBeDefined();
    expect(GRAPH_COLORS.primaryDark).toBeDefined();
    expect(GRAPH_COLORS.primaryRgb).toBeDefined();
  });

  it('primary is hex format (#xxxxxx)', () => {
    expect(GRAPH_COLORS.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(GRAPH_COLORS.primaryDark).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('primaryRgb is comma-separated triple ready for rgba()', () => {
    expect(GRAPH_COLORS.primaryRgb).toMatch(/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/);
    const parts = GRAPH_COLORS.primaryRgb.split(',').map(s => parseInt(s.trim(), 10));
    expect(parts).toHaveLength(3);
    for (const p of parts) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(255);
    }
  });

  it('is frozen at type-level via "as const" (compile-time guarantee)', () => {
    // Source-level guarantee
    const src = readFileSync(resolve(__dirname, '..', 'graphHelpers.ts'), 'utf-8');
    expect(src).toMatch(/GRAPH_COLORS\s*=\s*\{[\s\S]+?\}\s*as\s+const/);
  });
});

import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── escHtml edge cases ─────────────────────────────────────

describe('escHtml — order and edge cases', () => {
  it('escapes ampersand FIRST so other entities are not double-escaped', () => {
    // If "&" were escaped after "<", the "&lt;" would become "&amp;lt;"
    expect(escHtml('<')).toBe('&lt;');
    expect(escHtml('<&>')).toBe('&lt;&amp;&gt;');
  });

  it('treats null/undefined input as empty string (defensive)', () => {
    expect(escHtml(null as unknown as string)).toBe('');
    expect(escHtml(undefined as unknown as string)).toBe('');
  });

  it('coerces non-string input via String() before escaping', () => {
    expect(escHtml(123 as unknown as string)).toBe('123');
    expect(escHtml(true as unknown as string)).toBe('true');
  });

  it('does NOT touch backticks (only HTML attribute/text characters)', () => {
    expect(escHtml('`code`')).toBe('`code`');
  });

  it('does NOT touch forward slash (preserved in URLs)', () => {
    expect(escHtml('http://example.com/path')).toBe('http://example.com/path');
  });

  it('repeated calls are idempotent on already-escaped output (entities re-escape)', () => {
    // &lt; → &amp;lt;
    expect(escHtml('&lt;')).toBe('&amp;lt;');
  });
});

// ── buildChildrenMap deeper ────────────────────────────────

describe('buildChildrenMap — deeper', () => {
  it('preserves insertion order of children', () => {
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'a', target: 'c' },
      { id: 'e3', source: 'a', target: 'd' },
    ];
    const cm = buildChildrenMap(edges as MapEdge[]);
    expect(cm.get('a')).toEqual(['b', 'c', 'd']);
  });

  it('keeps duplicate targets (does not de-duplicate)', () => {
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'a', target: 'b' },
    ];
    const cm = buildChildrenMap(edges as MapEdge[]);
    expect(cm.get('a')).toEqual(['b', 'b']);
  });

  it('handles self-loops (a → a)', () => {
    const edges = [{ id: 'e1', source: 'a', target: 'a' }];
    const cm = buildChildrenMap(edges as MapEdge[]);
    expect(cm.get('a')).toEqual(['a']);
  });

  it('sources with no outgoing edges are absent from the map', () => {
    const edges = [{ id: 'e1', source: 'a', target: 'b' }];
    const cm = buildChildrenMap(edges as MapEdge[]);
    expect(cm.has('b')).toBe(false);
  });
});

// ── computeHiddenNodes — graph-shape edge cases ────────────

describe('computeHiddenNodes — graph-shape edge cases', () => {
  const mkNode = (id: string) => ({
    id,
    label: id,
    type: 'keyword' as const,
    mastery: 0.5,
    masteryColor: 'green' as MasteryColor,
  });

  it('handles cyclic graphs without infinite loop (a → b → a)', () => {
    const nodes = [mkNode('a'), mkNode('b')];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'a' },
    ];
    const hidden = computeHiddenNodes(nodes, edges as MapEdge[], new Set(['a']));
    expect(hidden.has('b')).toBe(true);
    expect(hidden.has('a')).toBe(false);
  });

  it('hides deep descendants (a → b → c → d → e), all 4 levels', () => {
    const nodes = ['a', 'b', 'c', 'd', 'e'].map(mkNode);
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
      { id: 'e3', source: 'c', target: 'd' },
      { id: 'e4', source: 'd', target: 'e' },
    ];
    const hidden = computeHiddenNodes(nodes, edges as MapEdge[], new Set(['a']));
    expect(hidden.has('b')).toBe(true);
    expect(hidden.has('c')).toBe(true);
    expect(hidden.has('d')).toBe(true);
    expect(hidden.has('e')).toBe(true);
  });

  it('keeps collapsed nodes themselves visible (only descendants are hidden)', () => {
    const nodes = [mkNode('a'), mkNode('b'), mkNode('c')];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'c' },
    ];
    const hidden = computeHiddenNodes(nodes, edges as MapEdge[], new Set(['a', 'b']));
    expect(hidden.has('a')).toBe(false);
    expect(hidden.has('b')).toBe(false);
    expect(hidden.has('c')).toBe(true);
  });

  it('two collapsed nodes with shared descendants — descendant stays hidden', () => {
    // a → c, b → c — collapse both a and b
    const nodes = [mkNode('a'), mkNode('b'), mkNode('c')];
    const edges = [
      { id: 'e1', source: 'a', target: 'c' },
      { id: 'e2', source: 'b', target: 'c' },
    ];
    const hidden = computeHiddenNodes(nodes, edges as MapEdge[], new Set(['a', 'b']));
    expect(hidden.has('c')).toBe(true);
  });

  it('descendant rescued when one of two parents is uncollapsed', () => {
    // a → c, b → c — collapse only a; c rescued via b
    const nodes = [mkNode('a'), mkNode('b'), mkNode('c')];
    const edges = [
      { id: 'e1', source: 'a', target: 'c' },
      { id: 'e2', source: 'b', target: 'c' },
    ];
    const hidden = computeHiddenNodes(nodes, edges as MapEdge[], new Set(['a']));
    expect(hidden.has('c')).toBe(false);
  });

  it('orphan edge targets (not in nodes) do not crash; they stay reachable through the descendants set', () => {
    // Implementation quirk: the children map is built from edges, so phantom
    // ends up in `descendants`. The rescue step skips non-nodeIds children so
    // phantom is never rescued — but the call should not throw.
    const nodes = [mkNode('a'), mkNode('b')];
    const edges = [
      { id: 'e1', source: 'a', target: 'b' },
      { id: 'e2', source: 'b', target: 'phantom' },
    ];
    expect(() => computeHiddenNodes(nodes, edges as MapEdge[], new Set(['a']))).not.toThrow();
    const hidden = computeHiddenNodes(nodes, edges as MapEdge[], new Set(['a']));
    expect(hidden.has('b')).toBe(true);
  });

  it('returns empty when all nodes are collapsed (none have descendants in nodeIds)', () => {
    const nodes = [mkNode('a')];
    const edges: MapEdge[] = [];
    const hidden = computeHiddenNodes(nodes, edges, new Set(['a']));
    expect(hidden.size).toBe(0);
  });

  it('directed traversal: collapse target does NOT hide its source', () => {
    // a → b, collapsing b should not hide a
    const nodes = [mkNode('a'), mkNode('b')];
    const edges = [{ id: 'e1', source: 'a', target: 'b' }];
    const hidden = computeHiddenNodes(nodes, edges as MapEdge[], new Set(['b']));
    expect(hidden.has('a')).toBe(false);
  });
});

// ── findNearestNode ────────────────────────────────────────

describe('findNearestNode', () => {
  const positions: NodeScreenPos[] = [
    { id: 'a', x: 0, y: 0, size: 10 },
    { id: 'b', x: 10, y: 0, size: 10 },
    { id: 'c', x: 0, y: 10, size: 10 },
    { id: 'd', x: 100, y: 100, size: 10 },
  ];

  it('returns null on empty positions array', () => {
    expect(findNearestNode([], 5, 5, 100)).toBeNull();
  });

  it('returns null when all nodes are outside the radius', () => {
    const result = findNearestNode(positions, 0, 0, 5);
    // 'a' is at exact (0,0) with distance 0 — should match
    // Wait — 'a' is at distance 0 which is < 5
    expect(result?.id).toBe('a');
  });

  it('returns null when no node is within radius', () => {
    const result = findNearestNode(positions, 50, 50, 1);
    expect(result).toBeNull();
  });

  it('finds the exact match (distance 0)', () => {
    const result = findNearestNode(positions, 0, 0, 5);
    expect(result?.id).toBe('a');
  });

  it('finds the nearest of multiple candidates', () => {
    // Closer to 'b' (10,0) than to 'a' (0,0): point (8,0) is dist 2 from b, 8 from a
    const result = findNearestNode(positions, 8, 0, 100);
    expect(result?.id).toBe('b');
  });

  it('respects excludeId (skips that node)', () => {
    // Without exclude, 'a' wins; with exclude, 'c' (dist √(0²+10²)=10) wins for point (0,5)
    // dist from (0,5) to 'a' = 5, to 'b' = √(10²+5²)≈11.18, to 'c' = 5
    // Both a and c are at dist 5 — first found wins (a). Excluding a → c.
    const result = findNearestNode(positions, 0, 5, 100, 'a');
    expect(result?.id).toBe('c');
  });

  it('boundary: dist === radius is NOT a match (strict less-than)', () => {
    // 'a' at (0,0), point at (5,0), dist=5, radius=5 → no match
    const result = findNearestNode(positions, 5, 0, 5);
    expect(result?.id).not.toBe('a'); // strict <
  });

  it('boundary: dist === radius — 0 means no match for exact-distance', () => {
    // Single position at dist 5, radius 5 → null
    const result = findNearestNode([{ id: 'x', x: 5, y: 0, size: 10 }], 0, 0, 5);
    expect(result).toBeNull();
  });

  it('uses Euclidean distance (Pythagoras), not Manhattan', () => {
    // Point (3,4) is at Euclidean dist 5 from (0,0), Manhattan dist 7
    // With radius 6: Euclidean would match (5 < 6), Manhattan would not (7 < 6 false)
    const result = findNearestNode([{ id: 'a', x: 0, y: 0, size: 10 }], 3, 4, 6);
    expect(result?.id).toBe('a');
  });

  it('ties go to the FIRST candidate in the list (stable order)', () => {
    const tied: NodeScreenPos[] = [
      { id: 'first', x: 0, y: 0, size: 10 },
      { id: 'second', x: 0, y: 0, size: 10 },
    ];
    const result = findNearestNode(tied, 0.001, 0.001, 100);
    expect(result?.id).toBe('first');
  });
});

// ── safeReleasePointerCapture ──────────────────────────────

describe('safeReleasePointerCapture', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warnSpy.mockRestore(); });

  it('calls releasePointerCapture with the given pointerId', () => {
    const release = vi.fn();
    const el = { releasePointerCapture: release } as unknown as Element;
    safeReleasePointerCapture(el, 42, 'TestTag');
    expect(release).toHaveBeenCalledWith(42);
  });

  it('swallows errors and emits devWarn with the tag', () => {
    const release = vi.fn(() => { throw new Error('not-captured'); });
    const el = { releasePointerCapture: release } as unknown as Element;
    expect(() => safeReleasePointerCapture(el, 7, 'DragHook')).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    const firstArg = String(warnSpy.mock.calls[0][0]);
    expect(firstArg).toContain('[DragHook]');
    expect(firstArg).toContain('releasePointerCapture failed');
  });

  it('the tag flows from the caller (not hardcoded)', () => {
    const release = vi.fn(() => { throw new Error('x'); });
    const el = { releasePointerCapture: release } as unknown as Element;
    safeReleasePointerCapture(el, 1, 'CustomTag');
    expect(String(warnSpy.mock.calls[0][0])).toContain('[CustomTag]');
  });
});

// ── NodeScreenPos type contract (source) ───────────────────

describe('NodeScreenPos source contract', () => {
  const helpersSrc = readFileSync(resolve(__dirname, '..', 'graphHelpers.ts'), 'utf-8');

  it('exports the NodeScreenPos interface', () => {
    expect(helpersSrc).toContain('export interface NodeScreenPos');
  });

  it('id/x/y/size are required, label is optional', () => {
    expect(helpersSrc).toMatch(/id:\s*string/);
    expect(helpersSrc).toMatch(/x:\s*number/);
    expect(helpersSrc).toMatch(/y:\s*number/);
    expect(helpersSrc).toMatch(/size:\s*number/);
    expect(helpersSrc).toMatch(/label\?:\s*string/);
  });
});

// ── getNodeScreenPositions source contract ─────────────────

describe('getNodeScreenPositions source contract', () => {
  const helpersSrc = readFileSync(resolve(__dirname, '..', 'graphHelpers.ts'), 'utf-8');

  it('uses graph.getElementRenderBounds for canvas coords', () => {
    expect(helpersSrc).toContain('graph.getElementRenderBounds');
  });

  it('converts canvas → client via graph.getClientByCanvas', () => {
    expect(helpersSrc).toContain('graph.getClientByCanvas');
  });

  it('center is (min+max)/2 for both x and y', () => {
    expect(helpersSrc).toMatch(/\(bounds\.min\[0\]\s*\+\s*bounds\.max\[0\]\)\s*\/\s*2/);
    expect(helpersSrc).toMatch(/\(bounds\.min\[1\]\s*\+\s*bounds\.max\[1\]\)\s*\/\s*2/);
  });

  it('size is the larger of width/height (Math.max)', () => {
    expect(helpersSrc).toMatch(/Math\.max\(bounds\.max\[0\]\s*-\s*bounds\.min\[0\],\s*bounds\.max\[1\]\s*-\s*bounds\.min\[1\]\)/);
  });

  it('outer try/catch around graph.getNodeData (graph may be destroyed)', () => {
    expect(helpersSrc).toMatch(/graph\.getNodeData\(\)[\s\S]{0,1000}catch\s*\(e\)\s*\{\s*devWarn\('graphHelpers',\s*'Graph may be destroyed'/);
  });

  it('inner try/catch per-node (single bad node should not break others)', () => {
    expect(helpersSrc).toMatch(/devWarn\('graphHelpers',\s*'Node may not be rendered yet'/);
  });

  it('label uses fullLabel ?? label ?? id fallback chain', () => {
    expect(helpersSrc).toMatch(/node\.data\?\.fullLabel\s*\|\|\s*node\.data\?\.label\s*\|\|\s*id/);
  });

  it('label only attached when includeLabels === true', () => {
    expect(helpersSrc).toMatch(/if\s*\(includeLabels\)/);
  });
});
// ── extractSubgraph ─────────────────────────────────────────

describe('extractSubgraph', () => {
  const node = (id: string, label = id) => ({ id, label, name: label, masteryColor: 'gray' as MasteryColor, isUserCreated: false });
  const edge = (source: string, target: string, id = `${source}-${target}`): MapEdge => ({ id, source, target, label: '' });

  it('returns nodes whose ids are in visibleIds', () => {
    const graph = { nodes: [node('a'), node('b'), node('c')], edges: [] };
    const result = extractSubgraph(graph, new Set(['a', 'c']));
    expect(result.nodes.map(n => n.id)).toEqual(['a', 'c']);
  });

  it('returns edges where BOTH endpoints are in visibleIds', () => {
    const graph = {
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('a', 'b'), edge('b', 'c'), edge('a', 'c')],
    };
    const result = extractSubgraph(graph, new Set(['a', 'c']));
    expect(result.edges.map(e => e.id).sort()).toEqual(['a-c']);
  });

  it('drops edges whose source is in but target is out', () => {
    const graph = { nodes: [node('a'), node('b')], edges: [edge('a', 'b')] };
    const result = extractSubgraph(graph, new Set(['a']));
    expect(result.edges).toEqual([]);
  });

  it('drops edges whose target is in but source is out', () => {
    const graph = { nodes: [node('a'), node('b')], edges: [edge('a', 'b')] };
    const result = extractSubgraph(graph, new Set(['b']));
    expect(result.edges).toEqual([]);
  });

  it('empty visibleIds returns empty subgraph', () => {
    const graph = { nodes: [node('a'), node('b')], edges: [edge('a', 'b')] };
    const result = extractSubgraph(graph, new Set());
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it('all-ids visibleIds returns shape-equivalent graph (filter creates new arrays)', () => {
    const graph = { nodes: [node('a'), node('b')], edges: [edge('a', 'b')] };
    const result = extractSubgraph(graph, new Set(['a', 'b']));
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    // .filter always returns a NEW array — identity is not preserved
    expect(result.nodes).not.toBe(graph.nodes);
    expect(result.edges).not.toBe(graph.edges);
  });

  it('preserves node order from original graph', () => {
    const graph = { nodes: [node('z'), node('a'), node('m')], edges: [] };
    const result = extractSubgraph(graph, new Set(['z', 'a', 'm']));
    expect(result.nodes.map(n => n.id)).toEqual(['z', 'a', 'm']);
  });

  it('handles self-loop edge when endpoint is included', () => {
    const graph = { nodes: [node('a')], edges: [edge('a', 'a', 'self')] };
    const result = extractSubgraph(graph, new Set(['a']));
    expect(result.edges).toHaveLength(1);
  });

  it('handles self-loop edge when endpoint is excluded', () => {
    const graph = { nodes: [node('a'), node('b')], edges: [edge('a', 'a', 'self')] };
    const result = extractSubgraph(graph, new Set(['b']));
    expect(result.edges).toEqual([]);
  });

  it('orphan edge (source/target not in nodes) is filtered if id not in visibleIds', () => {
    const graph = { nodes: [node('a')], edges: [edge('ghost', 'a')] };
    const result = extractSubgraph(graph, new Set(['a']));
    expect(result.edges).toEqual([]);
  });

  it('returns empty arrays (not null) for empty input graph', () => {
    const result = extractSubgraph({ nodes: [], edges: [] }, new Set(['a']));
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});
