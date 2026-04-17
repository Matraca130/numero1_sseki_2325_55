// ============================================================
// Tests — graphStyles (pure style-computation helpers)
//
// Covers computeNodeStyle and computeEdgeStyle: label truncation,
// collapsed/expanded display, mastery donut ring, custom colors,
// directed edges, dashed/dotted line styles, edge labels.
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeNodeStyle, computeEdgeStyle } from '../graphStyles';
import type { MapNode, MapEdge } from '@/app/types/mindmap';

// ── Fixtures ────────────────────────────────────────────────

function makeNode(overrides: Partial<MapNode> = {}): MapNode {
  return {
    id: 'n1',
    label: 'Node label',
    type: 'keyword',
    mastery: 0.5,
    masteryColor: 'yellow',
    ...overrides,
  };
}

function makeEdge(overrides: Partial<MapEdge> = {}): MapEdge {
  return {
    id: 'e1',
    source: 'a',
    target: 'b',
    ...overrides,
  };
}

// ── computeNodeStyle ────────────────────────────────────────

describe('computeNodeStyle', () => {
  it('returns id and wraps data correctly', () => {
    const style = computeNodeStyle(makeNode(), false, 0);
    expect(style.id).toBe('n1');
    expect(style.data.label).toBe('Node label');
    expect(style.data.fullLabel).toBe('Node label');
    expect(style.data.mastery).toBe(0.5);
    expect(style.data.masteryColor).toBe('yellow');
  });

  it('appends child count suffix when collapsed and children exist', () => {
    const style = computeNodeStyle(makeNode({ label: 'Parent' }), true, 3);
    expect(style.data.label).toBe('Parent (+3)');
    expect(style.data.fullLabel).toBe('Parent');
  });

  it('does NOT append suffix when collapsed but childCount is 0', () => {
    const style = computeNodeStyle(makeNode({ label: 'Parent' }), true, 0);
    expect(style.data.label).toBe('Parent');
  });

  it('truncates long labels via truncateLabel', () => {
    const longLabel = 'a'.repeat(40);
    const style = computeNodeStyle(makeNode({ label: longLabel }), false, 0);
    // truncateLabel defaults to 20
    expect(style.data.label.length).toBeLessThanOrEqual(20 + 1); // +1 for ellipsis
    expect(style.data.fullLabel).toBe(longLabel);
  });

  it('draws dashed border when collapsed', () => {
    const style = computeNodeStyle(makeNode(), true, 1);
    expect(style.style.lineDash).toEqual([4, 4]);
    expect(style.style.lineWidth).toBe(2.5);
  });

  it('uses primary colors for user-created nodes', () => {
    const style = computeNodeStyle(makeNode({ isUserCreated: true }), false, 0);
    // primary[50] is used as fill when no custom map
    expect(style.style.fill).toMatch(/^#[0-9a-f]{3,6}$/i);
    expect(style.style.lineWidth).toBe(2);
    expect(style.style.lineDash).toEqual([6, 3]);
  });

  it('applies custom node color from map when provided for user-created', () => {
    const customColors = new Map([['n1', 'teal']]);
    const style = computeNodeStyle(
      makeNode({ isUserCreated: true }),
      false,
      0,
      customColors,
    );
    expect(style.style.stroke).toBe('teal');
  });

  it('renders donut ring based on mastery', () => {
    const style = computeNodeStyle(makeNode({ mastery: 0.3 }), false, 0);
    expect(style.style.donuts).toEqual([0.3, 0.7]);
  });

  it('renders empty donut when mastery is 0', () => {
    const style = computeNodeStyle(makeNode({ mastery: 0 }), false, 0);
    expect(style.style.donuts).toEqual([0, 1]);
  });

  it('renders empty donut when mastery is -1 (no data)', () => {
    const style = computeNodeStyle(makeNode({ mastery: -1 }), false, 0);
    expect(style.style.donuts).toEqual([0, 1]);
  });

  it('sizes nodes between 44 and 56 based on mastery', () => {
    const low = computeNodeStyle(makeNode({ mastery: -1 }), false, 0);
    const mid = computeNodeStyle(makeNode({ mastery: 0.5 }), false, 0);
    const high = computeNodeStyle(makeNode({ mastery: 1 }), false, 0);
    expect(low.style.size).toBe(44);
    expect(mid.style.size).toBe(50);
    expect(high.style.size).toBe(56);
  });

  it('applies saved position when provided', () => {
    const style = computeNodeStyle(
      makeNode(),
      false,
      0,
      undefined,
      { x: 123, y: 456 },
    );
    expect(style.style.x).toBe(123);
    expect(style.style.y).toBe(456);
  });

  it('attaches combo id when provided', () => {
    const style = computeNodeStyle(makeNode(), false, 0, undefined, undefined, 'combo-1');
    expect((style as any).combo).toBe('combo-1');
  });

  it('omits combo key when not provided', () => {
    const style = computeNodeStyle(makeNode(), false, 0);
    expect('combo' in style).toBe(false);
  });

  it('exposes raw node on data._raw for round-trip access', () => {
    const node = makeNode({ annotation: 'my note' });
    const style = computeNodeStyle(node, false, 0);
    expect(style.data._raw).toBe(node);
    expect(style.data.annotation).toBe('my note');
  });
});

// ── computeEdgeStyle ────────────────────────────────────────

describe('computeEdgeStyle', () => {
  it('returns id, source, target', () => {
    const style = computeEdgeStyle(makeEdge());
    expect(style.id).toBe('e1');
    expect(style.source).toBe('a');
    expect(style.target).toBe('b');
  });

  it('uses custom color when provided', () => {
    const style = computeEdgeStyle(makeEdge({ customColor: '#ff00ff' }));
    expect(style.style.stroke).toBe('#ff00ff');
  });

  it('uses primary color for user-created edges without customColor', () => {
    const style = computeEdgeStyle(makeEdge({ isUserCreated: true }));
    expect(style.style.stroke).toMatch(/^#[0-9a-f]{3,6}$/i);
    expect(style.style.lineWidth).toBe(2);
  });

  it('applies dashed lineStyle explicitly', () => {
    const style = computeEdgeStyle(makeEdge({ lineStyle: 'dashed' }));
    expect(style.style.lineDash).toEqual([6, 3]);
  });

  it('applies dotted lineStyle explicitly', () => {
    const style = computeEdgeStyle(makeEdge({ lineStyle: 'dotted' }));
    expect(style.style.lineDash).toEqual([2, 4]);
  });

  it('defaults user-created edges to dashed when no lineStyle set', () => {
    const style = computeEdgeStyle(makeEdge({ isUserCreated: true }));
    expect(style.style.lineDash).toEqual([6, 3]);
  });

  it('no lineDash for solid edges', () => {
    const style = computeEdgeStyle(makeEdge({ lineStyle: 'solid' }));
    expect(style.style.lineDash).toBeUndefined();
  });

  it('renders endArrow when directed', () => {
    const style = computeEdgeStyle(makeEdge({ directed: true }));
    expect(style.style.endArrow).toEqual({ type: 'triangle', size: 8 });
  });

  it('renders endArrow when sourceKeywordId is set', () => {
    const style = computeEdgeStyle(makeEdge({ sourceKeywordId: 'kw-1' }));
    expect(style.style.endArrow).toEqual({ type: 'triangle', size: 8 });
  });

  it('uses custom arrowType when specified', () => {
    const style = computeEdgeStyle(makeEdge({ directed: true, arrowType: 'diamond' }));
    expect(style.style.endArrow).toEqual({ type: 'diamond', size: 8 });
  });

  it('omits endArrow when not directed and no sourceKeywordId', () => {
    const style = computeEdgeStyle(makeEdge());
    expect(style.style.endArrow).toBe(false);
  });

  it('attaches label metadata when label present', () => {
    const style = computeEdgeStyle(makeEdge({ label: 'causes' }));
    expect(style.data.label).toBe('causes');
    expect(style.style.labelText).toBe('causes');
    expect(style.style.labelBackground).toBe(true);
  });

  it('omits label styling when label empty', () => {
    const style = computeEdgeStyle(makeEdge());
    expect(style.style.labelText).toBeUndefined();
    expect(style.style.labelBackground).toBe(false);
  });

  it('exposes raw edge on data._raw', () => {
    const edge = makeEdge({ label: 'x' });
    const style = computeEdgeStyle(edge);
    expect(style.data._raw).toBe(edge);
  });
});
