// ============================================================
// Tests -- presentationHelpers (pure utility functions)
//
// Tests for topologicalSort, masteryPercent,
// slideVariants, and presentationFontSize.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  topologicalSort,
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

// ── masteryLabel (cycle 53: deduplicated to mastery-helpers.getMasteryLabel) ──

describe('masteryLabel (cycle 53: deduplicated)', () => {
  it('is no longer exported from presentationHelpers (use getMasteryLabel from @/app/lib/mastery-helpers instead)', async () => {
    // Cycle 53: this helper duplicated getMasteryLabel from mastery-helpers.ts
    // and only emitted Spanish strings, masking a latent i18n bug. Removed.
    // PresentationMode.tsx now consumes getMasteryLabel(mc, 'es').
    const mod = await import('../presentationHelpers');
    expect((mod as Record<string, unknown>).masteryLabel).toBeUndefined();
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
    expect(masteryPercent(-1)).toBe('—');
    expect(masteryPercent(-0.5)).toBe('—');
  });

  it('uses em-dash (U+2014) for the no-data sentinel', () => {
    const result = masteryPercent(-1);
    expect(result).toHaveLength(1);
    expect(result.charCodeAt(0)).toBe(0x2014);
  });

  it('treats -0 as a positive value (returns 0%)', () => {
    // -0 < 0 is false, so it falls through to the percent branch
    expect(masteryPercent(-0)).toBe('0%');
  });

  it('rounds 0.125 up to 13% (half-rounding behavior of Math.round)', () => {
    expect(masteryPercent(0.125)).toBe('13%');
  });

  it('rounds 0.123 down to 12%', () => {
    expect(masteryPercent(0.123)).toBe('12%');
  });

  it('rounds 0.127 up to 13%', () => {
    expect(masteryPercent(0.127)).toBe('13%');
  });

  it('rounds tiny positive values to 0%', () => {
    expect(masteryPercent(1e-3)).toBe('0%');
    expect(masteryPercent(0.001)).toBe('0%');
    expect(masteryPercent(0.004)).toBe('0%');
    expect(masteryPercent(0.005)).toBe('1%'); // rounds half-up
  });

  it('does not clamp values above 1.0 (allows >100%)', () => {
    // No upper clamp pinned in source — the function reflects the input.
    expect(masteryPercent(1.5)).toBe('150%');
    expect(masteryPercent(2)).toBe('200%');
  });

  it('handles NaN by producing the literal "NaN%" string', () => {
    // NaN < 0 is false, so it falls through; Math.round(NaN) is NaN; template -> 'NaN%'.
    expect(masteryPercent(NaN)).toBe('NaN%');
  });

  it('handles +Infinity by producing "Infinity%"', () => {
    expect(masteryPercent(Infinity)).toBe('Infinity%');
  });

  it('handles -Infinity by hitting the negative branch (returns dash)', () => {
    expect(masteryPercent(-Infinity)).toBe('—');
  });

  it('always returns a string (never null/undefined)', () => {
    const samples = [-1, -0.5, 0, 0.25, 0.5, 0.75, 1, NaN, Infinity];
    for (const v of samples) {
      const out = masteryPercent(v);
      expect(typeof out).toBe('string');
    }
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

  it('exposes exactly four documented keys (no extras, no missing)', () => {
    const keys = Object.keys(presentationFontSize).sort();
    expect(keys).toEqual(['definition', 'index', 'label', 'mastery']);
  });

  it('every clamp() string has exactly three comma-separated arguments', () => {
    for (const value of Object.values(presentationFontSize)) {
      // Strip "clamp(" prefix and trailing ")" then split on commas.
      const inner = value.replace(/^clamp\(/, '').replace(/\)$/, '');
      const parts = inner.split(',').map(s => s.trim());
      expect(parts).toHaveLength(3);
      // Each arg should be non-empty.
      for (const p of parts) {
        expect(p.length).toBeGreaterThan(0);
      }
    }
  });

  it('label is the largest size and mastery is the smallest', () => {
    // Pin the design hierarchy by inspecting the min (first clamp arg) numeric value.
    const minFor = (clampStr: string): number => {
      const m = clampStr.match(/^clamp\(\s*([\d.]+)/);
      return m ? Number(m[1]) : NaN;
    };
    const labelMin = minFor(presentationFontSize.label);
    const definitionMin = minFor(presentationFontSize.definition);
    const indexMin = minFor(presentationFontSize.index);
    const masteryMin = minFor(presentationFontSize.mastery);
    expect(labelMin).toBeGreaterThan(definitionMin);
    expect(definitionMin).toBeGreaterThan(indexMin);
    expect(indexMin).toBeGreaterThan(masteryMin);
  });

  it('every value uses rem for the min and max CSS units', () => {
    for (const value of Object.values(presentationFontSize)) {
      // First (min) and third (max) args should end with rem.
      const inner = value.replace(/^clamp\(/, '').replace(/\)$/, '');
      const parts = inner.split(',').map(s => s.trim());
      expect(parts[0]).toMatch(/rem$/);
      expect(parts[2]).toMatch(/rem$/);
    }
  });

  it('is NOT runtime-frozen (as const is a TS-only narrowing, not Object.freeze)', () => {
    // Pinned because the source uses `as const`, not Object.freeze.
    expect(Object.isFrozen(presentationFontSize)).toBe(false);
  });

  it('all values are non-empty strings', () => {
    for (const value of Object.values(presentationFontSize)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('label clamp matches the exact pinned value', () => {
    expect(presentationFontSize.label).toBe('clamp(1.5rem, 3vw, 2rem)');
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

  it('enter and exit are functions; center is a static object', () => {
    expect(typeof slideVariants.enter).toBe('function');
    expect(typeof slideVariants.exit).toBe('function');
    expect(typeof slideVariants.center).toBe('object');
    expect(slideVariants.center).not.toBeNull();
  });

  it('enter and exit have opposite x signs for the same direction', () => {
    // enter('right').x = 80, exit('right').x = -80 — symmetric.
    expect(slideVariants.enter('right').x).toBe(-slideVariants.exit('right').x);
    expect(slideVariants.enter('left').x).toBe(-slideVariants.exit('left').x);
  });

  it('all states expose x and opacity keys', () => {
    const enterRight = slideVariants.enter('right');
    const exitRight = slideVariants.exit('right');
    expect(Object.keys(enterRight).sort()).toEqual(['opacity', 'x']);
    expect(Object.keys(exitRight).sort()).toEqual(['opacity', 'x']);
    expect(Object.keys(slideVariants.center).sort()).toEqual(['opacity', 'x']);
  });

  it('returns fresh objects on every call (no shared reference)', () => {
    // Important: motion may mutate variant objects between renders.
    const a = slideVariants.enter('right');
    const b = slideVariants.enter('right');
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('exposes exactly enter, center, exit keys', () => {
    expect(Object.keys(slideVariants).sort()).toEqual(['center', 'enter', 'exit']);
  });

  it('opacity is 0 in non-center states and 1 in center', () => {
    expect(slideVariants.enter('left').opacity).toBe(0);
    expect(slideVariants.enter('right').opacity).toBe(0);
    expect(slideVariants.exit('left').opacity).toBe(0);
    expect(slideVariants.exit('right').opacity).toBe(0);
    expect(slideVariants.center.opacity).toBe(1);
  });

  it('uses 80px as the canonical slide offset magnitude', () => {
    expect(Math.abs(slideVariants.enter('right').x)).toBe(80);
    expect(Math.abs(slideVariants.enter('left').x)).toBe(80);
    expect(Math.abs(slideVariants.exit('right').x)).toBe(80);
    expect(Math.abs(slideVariants.exit('left').x)).toBe(80);
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

  // ── Identity / mutation contracts ─────────────────────────

  it('does not mutate the input nodes array', () => {
    const nodes = [makeNode('b', 'B'), makeNode('a', 'A')];
    const before = [...nodes];
    topologicalSort(nodes, []);
    expect(nodes).toEqual(before);
    expect(nodes[0].id).toBe('b'); // original order preserved
    expect(nodes[1].id).toBe('a');
  });

  it('does not mutate the input edges array', () => {
    const nodes = [makeNode('a', 'A'), makeNode('b', 'B')];
    const edges = [makeEdge('a', 'b')];
    const beforeEdges = [...edges];
    const beforeFirstEdge = { ...edges[0] };
    topologicalSort(nodes, edges);
    expect(edges).toEqual(beforeEdges);
    expect(edges[0]).toEqual(beforeFirstEdge);
  });

  it('returns the SAME node references as input (no cloning)', () => {
    // Important contract: callers use these as React keys / identity.
    const nodeA = makeNode('a', 'A');
    const nodeB = makeNode('b', 'B');
    const result = topologicalSort([nodeA, nodeB], [makeEdge('a', 'b')]);
    expect(result[0]).toBe(nodeA);
    expect(result[1]).toBe(nodeB);
  });

  it('returns a new array (not the input array)', () => {
    const nodes = [makeNode('a', 'A')];
    const result = topologicalSort(nodes, []);
    expect(result).not.toBe(nodes);
  });

  it('produces deterministic output across repeated calls (stable)', () => {
    const nodes = [
      makeNode('a', 'Alpha'),
      makeNode('b', 'Beta'),
      makeNode('c', 'Gamma'),
    ];
    const edges = [makeEdge('a', 'b'), makeEdge('a', 'c')];
    const r1 = topologicalSort(nodes, edges).map(n => n.id);
    const r2 = topologicalSort(nodes, edges).map(n => n.id);
    const r3 = topologicalSort(nodes, edges).map(n => n.id);
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });

  // ── Synthetic-roots edge cases ────────────────────────────

  it('synthetic roots picks ONLY nodes with the lowest in-degree (not all non-zero)', () => {
    // Cycle A<->B (in-degree 1 each), plus C with two incoming edges (in-degree 2).
    // No real roots → synthetic roots = {A, B} (lowest in-degree = 1), NOT C.
    const nodes = [makeNode('a', 'A'), makeNode('b', 'B'), makeNode('c', 'C')];
    const edges = [
      makeEdge('a', 'b'),
      makeEdge('b', 'a'),
      makeEdge('a', 'c'),
      makeEdge('b', 'c'),
    ];
    const result = topologicalSort(nodes, edges);
    expect(result).toHaveLength(3);
    // First two should be A and B (alphabetical among lowest in-degree).
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
    // C (in-degree 2) is NOT a synthetic root; it appears later via BFS.
    expect(result[2].id).toBe('c');
  });

  it('synthetic-roots cycle: BFS expands from synthetic root through the cycle', () => {
    // A -> B -> A (everything has in-degree >= 1)
    // synthetic roots = [A, B], BFS picks A, queues B (child), then visits B.
    const nodes = [makeNode('a', 'A'), makeNode('b', 'B')];
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'a')];
    const result = topologicalSort(nodes, edges);
    expect(result.map(n => n.id)).toEqual(['a', 'b']);
  });

  // ── Self-loops & duplicates ───────────────────────────────

  it('handles a self-loop (a -> a) without infinite looping', () => {
    // Self-loop gives `a` in-degree 1, so it's not a "real" root.
    // Synthetic-roots fallback kicks in (all nodes have in-degree >= 1 after b also points).
    // But here `a` is alone with self-loop -> in-degree 1, no real roots.
    // Synthetic roots = [a]. Visit a, push a as child of a -> visited check skips.
    const nodes = [makeNode('a', 'A')];
    const edges = [makeEdge('a', 'a')];
    const result = topologicalSort(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('handles duplicate edges between the same pair of nodes', () => {
    // Two edges A->B; A still has in-degree 0, B has in-degree 2.
    const nodes = [makeNode('a', 'A'), makeNode('b', 'B')];
    const edges = [makeEdge('a', 'b'), { ...makeEdge('a', 'b'), id: 'a->b#2' }];
    const result = topologicalSort(nodes, edges);
    expect(result.map(n => n.id)).toEqual(['a', 'b']);
  });

  it('handles edges where source and target are both missing', () => {
    const nodes = [makeNode('a', 'A')];
    const edges = [makeEdge('ghost1', 'ghost2')];
    const result = topologicalSort(nodes, edges);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  // ── Disconnected components ───────────────────────────────

  it('handles three independent disconnected components', () => {
    // Three trees: A->B, C->D, E->F
    const nodes = [
      makeNode('a', 'A'),
      makeNode('b', 'B'),
      makeNode('c', 'C'),
      makeNode('d', 'D'),
      makeNode('e', 'E'),
      makeNode('f', 'F'),
    ];
    const edges = [
      makeEdge('a', 'b'),
      makeEdge('c', 'd'),
      makeEdge('e', 'f'),
    ];
    const result = topologicalSort(nodes, edges);
    const ids = result.map(n => n.id);
    // Roots are A, C, E (alphabetical). BFS visits each, then their children.
    // Expected order: A, C, E (roots queued first), then B (child of A), D (child of C), F (child of E).
    expect(ids).toEqual(['a', 'c', 'e', 'b', 'd', 'f']);
  });

  it('preserves all nodes when input contains many isolated nodes', () => {
    const nodes = Array.from({ length: 20 }, (_, i) =>
      makeNode(`n${i}`, `Label${String(i).padStart(2, '0')}`)
    );
    const result = topologicalSort(nodes, []);
    expect(result).toHaveLength(20);
    // Sorted by label alphabetically.
    const labels = result.map(n => n.label);
    expect(labels).toEqual([...labels].sort());
  });

  // ── Label tie-breaking edge cases ─────────────────────────

  it('handles duplicate labels deterministically (localeCompare returns 0)', () => {
    // Two roots with the same label — output should still contain both.
    const nodes = [
      makeNode('a', 'Same'),
      makeNode('b', 'Same'),
      makeNode('c', 'Different'),
    ];
    const result = topologicalSort(nodes, []);
    expect(result).toHaveLength(3);
    // 'Different' < 'Same' alphabetically, so c is first.
    expect(result[0].id).toBe('c');
    // The two 'Same'-labeled nodes appear after, in some stable order.
    const remaining = new Set(result.slice(1).map(n => n.id));
    expect(remaining).toEqual(new Set(['a', 'b']));
  });

  it('handles labels with mixed case using localeCompare semantics', () => {
    // localeCompare typically treats lowercase/uppercase order locale-dependently,
    // but the function should at minimum produce a deterministic, total ordering.
    const nodes = [
      makeNode('a', 'apple'),
      makeNode('b', 'Apple'),
      makeNode('c', 'banana'),
    ];
    const result = topologicalSort(nodes, []);
    expect(result).toHaveLength(3);
    // 'banana' should come AFTER both apple/Apple variants.
    expect(result[2].label.toLowerCase()).toBe('banana');
  });

  // ── Empty edges + nodes ───────────────────────────────────

  it('handles non-empty nodes with empty edges (just label-sort)', () => {
    const nodes = [
      makeNode('z', 'Zeta'),
      makeNode('a', 'Alpha'),
      makeNode('m', 'Mu'),
    ];
    const result = topologicalSort(nodes, []);
    expect(result.map(n => n.label)).toEqual(['Alpha', 'Mu', 'Zeta']);
  });

  it('returns empty array when nodes is empty even with non-empty edges', () => {
    // Defensive: the early-return on nodes.length===0 must short-circuit.
    const result = topologicalSort([], [makeEdge('a', 'b')]);
    expect(result).toEqual([]);
  });

  // ── Output shape ──────────────────────────────────────────

  it('output array length always equals input nodes length (no drops, no duplicates)', () => {
    const cases: Array<{ nodes: MapNode[]; edges: MapEdge[] }> = [
      { nodes: [makeNode('a', 'A')], edges: [] },
      {
        nodes: [makeNode('a', 'A'), makeNode('b', 'B')],
        edges: [makeEdge('a', 'b'), makeEdge('b', 'a')],
      },
      {
        nodes: [makeNode('a', 'A'), makeNode('b', 'B'), makeNode('c', 'C')],
        edges: [makeEdge('a', 'b'), makeEdge('b', 'c'), makeEdge('c', 'a')],
      },
    ];
    for (const { nodes, edges } of cases) {
      const result = topologicalSort(nodes, edges);
      expect(result).toHaveLength(nodes.length);
      const uniqueIds = new Set(result.map(n => n.id));
      expect(uniqueIds.size).toBe(nodes.length);
    }
  });

  it('output contains exactly the input ids (set-equality)', () => {
    const nodes = [
      makeNode('a', 'A'),
      makeNode('b', 'B'),
      makeNode('c', 'C'),
      makeNode('d', 'D'),
    ];
    const edges = [makeEdge('a', 'b'), makeEdge('c', 'd')];
    const result = topologicalSort(nodes, edges);
    const inputIds = new Set(nodes.map(n => n.id));
    const outputIds = new Set(result.map(n => n.id));
    expect(outputIds).toEqual(inputIds);
  });
});
