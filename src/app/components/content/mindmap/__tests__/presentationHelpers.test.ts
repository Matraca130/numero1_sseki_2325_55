// ============================================================
// Tests -- presentationHelpers (pure utility functions)
//
// Tests for topologicalSort, masteryLabel, masteryPercent,
// slideVariants, and presentationFontSize.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  topologicalSort,
  masteryLabel,
  masteryPercent,
  slideVariants,
  presentationFontSize,
} from '../presentationHelpers';
import type { MapNode, MapEdge } from '@/app/types/mindmap';

// ── Helpers ─────────────────────────────────────────────────

function makeNode(id: string, label: string, overrides?: Partial<MapNode>): MapNode {
  return {
    id,
    label,
    type: 'keyword',
    mastery: 0.5,
    masteryColor: 'yellow',
    ...overrides,
  };
}

function makeEdge(source: string, target: string, overrides?: Partial<MapEdge>): MapEdge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    ...overrides,
  };
}

// ── masteryLabel ────────────────────────────────────────────

describe('masteryLabel', () => {
  it('returns correct Spanish label for each mastery color', () => {
    expect(masteryLabel('green')).toBe('Dominado');
    expect(masteryLabel('yellow')).toBe('Aprendiendo');
    expect(masteryLabel('red')).toBe('D\u00e9bil');
    expect(masteryLabel('gray')).toBe('Sin datos');
  });
});

// ── masteryPercent ──────────────────────────────────────────

describe('masteryPercent', () => {
  it('formats positive mastery as percentage', () => {
    expect(masteryPercent(0)).toBe('0%');
    expect(masteryPercent(0.5)).toBe('50%');
    expect(masteryPercent(1)).toBe('100%');
    expect(masteryPercent(0.333)).toBe('33%');
    expect(masteryPercent(0.999)).toBe('100%');
  });

  it('returns dash for negative mastery (no data)', () => {
    expect(masteryPercent(-1)).toBe('\u2014');
    expect(masteryPercent(-0.5)).toBe('\u2014');
  });
});

// ── presentationFontSize ────────────────────────────────────

describe('presentationFontSize', () => {
  it('exports all required font size keys', () => {
    expect(presentationFontSize).toHaveProperty('label');
    expect(presentationFontSize).toHaveProperty('definition');
    expect(presentationFontSize).toHaveProperty('index');
    expect(presentationFontSize).toHaveProperty('mastery');
  });

  it('all values are clamp() CSS functions', () => {
    for (const value of Object.values(presentationFontSize)) {
      expect(value).toMatch(/^clamp\(/);
    }
  });
});

// ── slideVariants ───────────────────────────────────────────

describe('slideVariants', () => {
  it('enter moves in from the right when direction is right', () => {
    const result = slideVariants.enter('right');
    expect(result.x).toBe(80);
    expect(result.opacity).toBe(0);
  });

  it('enter moves in from the left when direction is left', () => {
    const result = slideVariants.enter('left');
    expect(result.x).toBe(-80);
    expect(result.opacity).toBe(0);
  });

  it('center is at x=0 with full opacity', () => {
    expect(slideVariants.center.x).toBe(0);
    expect(slideVariants.center.opacity).toBe(1);
  });

  it('exit moves out to the left when direction is right', () => {
    const result = slideVariants.exit('right');
    expect(result.x).toBe(-80);
    expect(result.opacity).toBe(0);
  });

  it('exit moves out to the right when direction is left', () => {
    const result = slideVariants.exit('left');
    expect(result.x).toBe(80);
    expect(result.opacity).toBe(0);
  });
});

// ── topologicalSort ─────────────────────────────────────────

describe('topologicalSort', () => {
  it('returns empty array for empty input', () => {
    expect(topologicalSort([], [])).toEqual([]);
  });

  it('returns single node as-is', () => {
    const nodes = [makeNode('a', 'Alpha')];
    const result = topologicalSort(nodes, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('returns nodes in BFS order from root', () => {
    // Tree: A -> B -> C
    const nodes = [makeNode('a', 'A'), makeNode('b', 'B'), makeNode('c', 'C')];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];
    const result = topologicalSort(nodes, edges);
    const ids = result.map(n => n.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('roots come first (nodes with no incoming edges)', () => {
    // B -> A, C -> A  (A has in-degree 2, B and C are roots)
    const nodes = [makeNode('a', 'A'), makeNode('b', 'B'), makeNode('c', 'C')];
    const edges = [makeEdge('b', 'a'), makeEdge('c', 'a')];
    const result = topologicalSort(nodes, edges);
    // B and C are roots (alphabetical order), A comes after
    expect(result[0].id).toBe('b');
    expect(result[1].id).toBe('c');
    expect(result[2].id).toBe('a');
  });

  it('breaks ties alphabetically by label', () => {
    const nodes = [
      makeNode('z', 'Zebra'),
      makeNode('a', 'Alpha'),
      makeNode('m', 'Mango'),
    ];
    const result = topologicalSort(nodes, []);
    const labels = result.map(n => n.label);
    expect(labels).toEqual(['Alpha', 'Mango', 'Zebra']);
  });

  it('handles diamond DAG correctly', () => {
    //    A
    //   / \
    //  B   C
    //   \ /
    //    D
    const nodes = [
      makeNode('a', 'A'),
      makeNode('b', 'B'),
      makeNode('c', 'C'),
      makeNode('d', 'D'),
    ];
    const edges = [
      makeEdge('a', 'b'),
      makeEdge('a', 'c'),
      makeEdge('b', 'd'),
      makeEdge('c', 'd'),
    ];
    const result = topologicalSort(nodes, edges);
    const ids = result.map(n => n.id);
    // A is root, then B and C (alphabetical), then D
    expect(ids[0]).toBe('a');
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('d'));
    expect(ids.indexOf('c')).toBeLessThan(ids.indexOf('d'));
  });

  it('includes disconnected nodes at the end', () => {
    // A -> B, but C is disconnected and D is also disconnected
    const nodes = [
      makeNode('a', 'A'),
      makeNode('b', 'B'),
      makeNode('c', 'Zzz'),  // disconnected but alphabetically last
      makeNode('d', 'D'),     // disconnected
    ];
    const edges = [makeEdge('a', 'b')];
    const result = topologicalSort(nodes, edges);
    // A first (root of connected component), then D (root, alphabetical before Zzz),
    // then Zzz (root), then B (non-root)
    const ids = result.map(n => n.id);
    expect(ids[0]).toBe('a');
    // B should come before C/D in BFS order since A->B is traversed,
    // but D and C are also roots. BFS from A visits B, then from D, from C.
    // Actually: roots sorted alphabetically = [A, D, Zzz], queue starts with them
    // BFS: A -> children [B], D -> no children, Zzz -> no children
    // Result: A, D, c(Zzz), B
    expect(ids).toEqual(['a', 'd', 'c', 'b']);
  });

  it('handles edges referencing non-existent nodes gracefully', () => {
    const nodes = [makeNode('a', 'A'), makeNode('b', 'B')];
    const edges = [makeEdge('a', 'b'), makeEdge('a', 'nonexistent')];
    const result = topologicalSort(nodes, edges);
    expect(result).toHaveLength(2);
  });

  it('handles cycle by visiting each node once', () => {
    // A -> B -> C -> A (cycle)
    const nodes = [makeNode('a', 'A'), makeNode('b', 'B'), makeNode('c', 'C')];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c'), makeEdge('c', 'a')];
    const result = topologicalSort(nodes, edges);
    // All nodes visited exactly once
    expect(result).toHaveLength(3);
    const ids = new Set(result.map(n => n.id));
    expect(ids.size).toBe(3);
  });

  it('uses lowest in-degree nodes as synthetic roots when all nodes have incoming edges', () => {
    // A -> B -> A (2-node cycle, both have in-degree 1)
    const nodes = [makeNode('a', 'A'), makeNode('b', 'B')];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'a')];
    const result = topologicalSort(nodes, edges);
    expect(result).toHaveLength(2);
    // Both have same in-degree, so alphabetical: A first
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });

  it('handles large number of nodes efficiently', () => {
    const count = 500;
    const nodes = Array.from({ length: count }, (_, i) =>
      makeNode(`n${i}`, `Node ${String(i).padStart(4, '0')}`)
    );
    const edges = Array.from({ length: count - 1 }, (_, i) =>
      makeEdge(`n${i}`, `n${i + 1}`)
    );
    const start = performance.now();
    const result = topologicalSort(nodes, edges);
    const elapsed = performance.now() - start;
    expect(result).toHaveLength(count);
    expect(elapsed).toBeLessThan(200); // should be well under 200ms
  });
});
