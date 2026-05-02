// ============================================================
// Tests — useLocalGraph (local subgraph extraction)
//
// The hook wraps pure BFS logic in useMemo. We test in three
// layers (mirroring useGraphSearch.test.ts):
//
//   1. Replicated pure BFS — exhaustive algorithm coverage
//      without React (fast, no jsdom).
//   2. Source contract — read useLocalGraph.ts as text and
//      pin invariants (extractSubgraph delegation, useMemo
//      deps array, queueHead optimization, default depth=1).
//   3. Hook integration via renderHook — pin null-safety,
//      return shape, and useMemo identity stability across
//      rerenders.
//
// The BFS extracts a depth-limited subgraph around a focal
// node (Obsidian-style: direct neighbors only by default).
// ============================================================

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { GraphData, MapNode, MapEdge } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';
import { useLocalGraph } from '../useLocalGraph';

const SOURCE_PATH = resolve(__dirname, '..', 'useLocalGraph.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Replicated pure BFS logic from useLocalGraph ────────────

function extractLocalGraph(
  fullGraph: GraphData | null,
  focalNodeId: string | undefined,
  depth: number = 1
): GraphData | null {
  if (!fullGraph || !focalNodeId) return null;
  if (fullGraph.nodes.length === 0) return null;
  if (!fullGraph.nodes.some((n) => n.id === focalNodeId)) return null;

  const nodeIds = new Set<string>();
  const queue: { id: string; d: number }[] = [{ id: focalNodeId, d: 0 }];
  let queueHead = 0;
  nodeIds.add(focalNodeId);

  const adj = new Map<string, string[]>();
  for (const edge of fullGraph.edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push(edge.target);
    adj.get(edge.target)!.push(edge.source);
  }

  while (queueHead < queue.length) {
    const { id, d } = queue[queueHead++];
    if (d >= depth) continue;
    const neighbors = adj.get(id) || [];
    for (const n of neighbors) {
      if (!nodeIds.has(n)) {
        nodeIds.add(n);
        queue.push({ id: n, d: d + 1 });
      }
    }
  }

  const nodes = fullGraph.nodes.filter((n) => nodeIds.has(n.id));
  const edges = fullGraph.edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  return { nodes, edges };
}

// ── Test fixtures ────────────────────────────────────────────

function mkNode(id: string, label = id): MapNode {
  return {
    id,
    label,
    type: 'keyword',
    mastery: 0.5,
    masteryColor: 'gray' as MasteryColor,
  };
}

function mkEdge(id: string, source: string, target: string): MapEdge {
  return { id, source, target };
}

// Linear chain: a → b → c → d → e
const chainGraph: GraphData = {
  nodes: [mkNode('a'), mkNode('b'), mkNode('c'), mkNode('d'), mkNode('e')],
  edges: [
    mkEdge('ab', 'a', 'b'),
    mkEdge('bc', 'b', 'c'),
    mkEdge('cd', 'c', 'd'),
    mkEdge('de', 'd', 'e'),
  ],
};

// Star: center connected to 4 leaves
const starGraph: GraphData = {
  nodes: [mkNode('center'), mkNode('l1'), mkNode('l2'), mkNode('l3'), mkNode('l4')],
  edges: [
    mkEdge('cl1', 'center', 'l1'),
    mkEdge('cl2', 'center', 'l2'),
    mkEdge('cl3', 'center', 'l3'),
    mkEdge('cl4', 'center', 'l4'),
  ],
};

// ── Null / guard cases ───────────────────────────────────────

describe('extractLocalGraph: guard conditions', () => {
  it('returns null when fullGraph is null', () => {
    expect(extractLocalGraph(null, 'a')).toBeNull();
  });

  it('returns null when focalNodeId is undefined', () => {
    expect(extractLocalGraph(chainGraph, undefined)).toBeNull();
  });

  it('returns null when focalNodeId is empty string', () => {
    expect(extractLocalGraph(chainGraph, '')).toBeNull();
  });

  it('returns null when graph has no nodes', () => {
    const empty: GraphData = { nodes: [], edges: [] };
    expect(extractLocalGraph(empty, 'a')).toBeNull();
  });

  it('returns null when focal node does not exist in graph', () => {
    expect(extractLocalGraph(chainGraph, 'nonexistent')).toBeNull();
  });
});

// ── Depth = 1 (default) ─────────────────────────────────────

describe('extractLocalGraph: depth=1 (default)', () => {
  it('includes only focal node + direct neighbors', () => {
    const result = extractLocalGraph(chainGraph, 'c', 1)!;
    const ids = new Set(result.nodes.map((n) => n.id));
    // c's neighbors in undirected BFS: b and d
    expect(ids.has('c')).toBe(true);
    expect(ids.has('b')).toBe(true);
    expect(ids.has('d')).toBe(true);
    expect(ids.has('a')).toBe(false);
    expect(ids.has('e')).toBe(false);
  });

  it('includes edges between visible nodes only', () => {
    const result = extractLocalGraph(chainGraph, 'c', 1)!;
    const edgeIds = new Set(result.edges.map((e) => e.id));
    expect(edgeIds.has('bc')).toBe(true);
    expect(edgeIds.has('cd')).toBe(true);
    expect(edgeIds.has('ab')).toBe(false);
    expect(edgeIds.has('de')).toBe(false);
  });

  it('includes all leaves for a star focal node', () => {
    const result = extractLocalGraph(starGraph, 'center', 1)!;
    const ids = new Set(result.nodes.map((n) => n.id));
    expect(ids.has('center')).toBe(true);
    expect(ids.has('l1')).toBe(true);
    expect(ids.has('l2')).toBe(true);
    expect(ids.has('l3')).toBe(true);
    expect(ids.has('l4')).toBe(true);
    expect(result.nodes.length).toBe(5);
    expect(result.edges.length).toBe(4);
  });

  it('for a leaf node, includes only the leaf + its single neighbor', () => {
    const result = extractLocalGraph(starGraph, 'l1', 1)!;
    const ids = new Set(result.nodes.map((n) => n.id));
    expect(ids.has('l1')).toBe(true);
    expect(ids.has('center')).toBe(true);
    // Other leaves are not direct neighbors of l1
    expect(ids.has('l2')).toBe(false);
    expect(ids.has('l3')).toBe(false);
    expect(ids.has('l4')).toBe(false);
    expect(result.nodes.length).toBe(2);
  });

  it('returns only the focal node when it has no connections', () => {
    const isolated: GraphData = {
      nodes: [mkNode('solo'), mkNode('other')],
      edges: [],
    };
    const result = extractLocalGraph(isolated, 'solo', 1)!;
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].id).toBe('solo');
    expect(result.edges.length).toBe(0);
  });
});

// ── Depth = 0 ───────────────────────────────────────────────

describe('extractLocalGraph: depth=0', () => {
  it('returns only the focal node with no neighbors', () => {
    const result = extractLocalGraph(chainGraph, 'c', 0)!;
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].id).toBe('c');
    expect(result.edges.length).toBe(0);
  });
});

// ── Depth = 2 ───────────────────────────────────────────────

describe('extractLocalGraph: depth=2', () => {
  it('includes nodes 2 hops away', () => {
    // Chain: a-b-c-d-e, focal=c, depth=2 → includes a,b,c,d,e
    const result = extractLocalGraph(chainGraph, 'c', 2)!;
    const ids = new Set(result.nodes.map((n) => n.id));
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(true);
    expect(ids.has('c')).toBe(true);
    expect(ids.has('d')).toBe(true);
    expect(ids.has('e')).toBe(true);
  });

  it('includes all edges between 2-hop nodes', () => {
    const result = extractLocalGraph(chainGraph, 'c', 2)!;
    expect(result.edges.length).toBe(4); // ab, bc, cd, de
  });

  it('for star graph at depth=2 from leaf, includes all other leaves via center', () => {
    // l1 → center (hop 1) → l2, l3, l4 (hop 2)
    const result = extractLocalGraph(starGraph, 'l1', 2)!;
    const ids = new Set(result.nodes.map((n) => n.id));
    expect(ids.has('l1')).toBe(true);
    expect(ids.has('center')).toBe(true);
    expect(ids.has('l2')).toBe(true);
    expect(ids.has('l3')).toBe(true);
    expect(ids.has('l4')).toBe(true);
  });
});

// ── Undirected edge treatment ────────────────────────────────

describe('extractLocalGraph: undirected traversal', () => {
  it('traverses edges in both directions', () => {
    // Edge is stored as a→b but BFS should also find b from a's perspective
    const graph: GraphData = {
      nodes: [mkNode('a'), mkNode('b'), mkNode('c')],
      edges: [
        mkEdge('ab', 'a', 'b'), // a is source, b is target
        mkEdge('bc', 'b', 'c'),
      ],
    };
    // Focal = b, depth = 1 → should reach both a (via reverse ab) and c (via bc)
    const result = extractLocalGraph(graph, 'b', 1)!;
    const ids = new Set(result.nodes.map((n) => n.id));
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(true);
    expect(ids.has('c')).toBe(true);
  });
});

// ── BFS optimisation: no duplicate nodes ────────────────────

describe('extractLocalGraph: no node duplication', () => {
  it('does not include the same node twice even in dense graphs', () => {
    // Fully connected triangle
    const graph: GraphData = {
      nodes: [mkNode('x'), mkNode('y'), mkNode('z')],
      edges: [
        mkEdge('xy', 'x', 'y'),
        mkEdge('yz', 'y', 'z'),
        mkEdge('xz', 'x', 'z'),
      ],
    };
    const result = extractLocalGraph(graph, 'x', 1)!;
    expect(result.nodes.length).toBe(3);
    // Verify uniqueness
    const unique = new Set(result.nodes.map((n) => n.id));
    expect(unique.size).toBe(result.nodes.length);
  });
});

// ── Edge case: self-referencing edges ───────────────────────

describe('extractLocalGraph: edge cases', () => {
  it('handles self-referencing edge without infinite loop', () => {
    const graph: GraphData = {
      nodes: [mkNode('self'), mkNode('other')],
      edges: [
        mkEdge('ss', 'self', 'self'),
        mkEdge('so', 'self', 'other'),
      ],
    };
    const result = extractLocalGraph(graph, 'self', 1)!;
    expect(result).not.toBeNull();
    const ids = new Set(result.nodes.map((n) => n.id));
    expect(ids.has('self')).toBe(true);
    expect(ids.has('other')).toBe(true);
  });

  it('handles a large graph without stack overflow (queue-based BFS)', () => {
    // Create a 100-node chain to verify queue-based BFS (not recursive)
    const nodes: MapNode[] = [];
    const edges: MapEdge[] = [];
    for (let i = 0; i < 100; i++) {
      nodes.push(mkNode(`n${i}`));
      if (i > 0) edges.push(mkEdge(`e${i}`, `n${i - 1}`, `n${i}`));
    }
    const graph: GraphData = { nodes, edges };

    // depth=50 from center → should include nodes 0..99 for node n50
    const result = extractLocalGraph(graph, 'n50', 50)!;
    expect(result).not.toBeNull();
    expect(result.nodes.length).toBeGreaterThan(50);
  });

  it('handles disconnected components (unreachable nodes excluded)', () => {
    const graph: GraphData = {
      nodes: [mkNode('a'), mkNode('b'), mkNode('isolated1'), mkNode('isolated2')],
      edges: [mkEdge('ab', 'a', 'b')],
    };
    const result = extractLocalGraph(graph, 'a', 1)!;
    const ids = new Set(result.nodes.map((n) => n.id));
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(true);
    expect(ids.has('isolated1')).toBe(false);
    expect(ids.has('isolated2')).toBe(false);
  });

  it('handles duplicate edges between the same node pair (visited check)', () => {
    const graph: GraphData = {
      nodes: [mkNode('a'), mkNode('b')],
      edges: [
        mkEdge('ab1', 'a', 'b'),
        mkEdge('ab2', 'a', 'b'),
        mkEdge('ab3', 'a', 'b'),
      ],
    };
    const result = extractLocalGraph(graph, 'a', 1)!;
    expect(result.nodes.length).toBe(2);
    // All three edges remain in the output filter (extractSubgraph keeps
    // edges whose both endpoints are visible — duplicate-edge dedup is not
    // its job).
    expect(result.edges.length).toBe(3);
  });

  it('handles a cycle without revisiting nodes', () => {
    // Triangle a-b-c-a, focal a, depth 5 → still just {a,b,c}
    const graph: GraphData = {
      nodes: [mkNode('a'), mkNode('b'), mkNode('c')],
      edges: [mkEdge('ab', 'a', 'b'), mkEdge('bc', 'b', 'c'), mkEdge('ca', 'c', 'a')],
    };
    const result = extractLocalGraph(graph, 'a', 5)!;
    expect(result.nodes.length).toBe(3);
    expect(result.edges.length).toBe(3);
  });
});

// ── Depth boundary edge cases ───────────────────────────────

describe('extractLocalGraph: depth boundary edge cases', () => {
  it('depth=3 in a 5-node chain reaches exactly 3 hops away', () => {
    // a-b-c-d-e, focal=a, depth=3 → {a, b, c, d}, NOT e
    const result = extractLocalGraph(chainGraph, 'a', 3)!;
    const ids = new Set(result.nodes.map((n) => n.id));
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(true);
    expect(ids.has('c')).toBe(true);
    expect(ids.has('d')).toBe(true);
    expect(ids.has('e')).toBe(false);
  });

  it('depth >> graph diameter returns the full connected component', () => {
    // chainGraph diameter = 4. depth=100 from focal=a → all 5 nodes.
    const result = extractLocalGraph(chainGraph, 'a', 100)!;
    expect(result.nodes.length).toBe(5);
    expect(result.edges.length).toBe(4);
  });

  it('depth=1000 does not infinite-loop on a graph with a long cycle', () => {
    // 10-node ring a0-a1-...-a9-a0 — visited check + queueHead must terminate.
    const nodes: MapNode[] = [];
    const edges: MapEdge[] = [];
    for (let i = 0; i < 10; i++) nodes.push(mkNode(`a${i}`));
    for (let i = 0; i < 10; i++) {
      edges.push(mkEdge(`e${i}`, `a${i}`, `a${(i + 1) % 10}`));
    }
    const ring: GraphData = { nodes, edges };
    const result = extractLocalGraph(ring, 'a0', 1000)!;
    expect(result.nodes.length).toBe(10);
    expect(result.edges.length).toBe(10);
  });

  it('depth=0 with isolated focal returns just the focal', () => {
    const isolated: GraphData = {
      nodes: [mkNode('only')],
      edges: [],
    };
    const result = extractLocalGraph(isolated, 'only', 0)!;
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].id).toBe('only');
    expect(result.edges.length).toBe(0);
  });

  it('depth=0 ignores all neighbors even when many exist', () => {
    const result = extractLocalGraph(starGraph, 'center', 0)!;
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].id).toBe('center');
    expect(result.edges.length).toBe(0);
  });

  it('depth=0 still excludes self-loops (edge has same node both ends)', () => {
    const graph: GraphData = {
      nodes: [mkNode('s')],
      edges: [mkEdge('ss', 's', 's')],
    };
    const result = extractLocalGraph(graph, 's', 0)!;
    expect(result.nodes.length).toBe(1);
    // Self-edge endpoints both visible, so it stays in the result.
    expect(result.edges.length).toBe(1);
  });
});

// ── Topology variants ───────────────────────────────────────

describe('extractLocalGraph: topology variants', () => {
  // Diamond: a → b, a → c, b → d, c → d  (a and d connected via two paths)
  const diamond: GraphData = {
    nodes: [mkNode('a'), mkNode('b'), mkNode('c'), mkNode('d')],
    edges: [
      mkEdge('ab', 'a', 'b'),
      mkEdge('ac', 'a', 'c'),
      mkEdge('bd', 'b', 'd'),
      mkEdge('cd', 'c', 'd'),
    ],
  };

  it('depth=1 in diamond from corner returns 2 direct neighbors', () => {
    const result = extractLocalGraph(diamond, 'a', 1)!;
    const ids = new Set(result.nodes.map((n) => n.id));
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(true);
    expect(ids.has('c')).toBe(true);
    expect(ids.has('d')).toBe(false);
  });

  it('depth=2 in diamond from corner returns the whole shape', () => {
    const result = extractLocalGraph(diamond, 'a', 2)!;
    expect(result.nodes.length).toBe(4);
    expect(result.edges.length).toBe(4);
  });

  // Branching tree: root → c1, c2; c1 → g1, g2; c2 → g3
  const tree: GraphData = {
    nodes: [
      mkNode('root'),
      mkNode('c1'),
      mkNode('c2'),
      mkNode('g1'),
      mkNode('g2'),
      mkNode('g3'),
    ],
    edges: [
      mkEdge('rc1', 'root', 'c1'),
      mkEdge('rc2', 'root', 'c2'),
      mkEdge('c1g1', 'c1', 'g1'),
      mkEdge('c1g2', 'c1', 'g2'),
      mkEdge('c2g3', 'c2', 'g3'),
    ],
  };

  it('depth=1 from tree root returns root + children only', () => {
    const result = extractLocalGraph(tree, 'root', 1)!;
    const ids = new Set(result.nodes.map((n) => n.id));
    expect(ids.has('root')).toBe(true);
    expect(ids.has('c1')).toBe(true);
    expect(ids.has('c2')).toBe(true);
    expect(ids.has('g1')).toBe(false);
    expect(ids.has('g2')).toBe(false);
    expect(ids.has('g3')).toBe(false);
  });

  it('depth=2 from tree root returns root + children + grandchildren', () => {
    const result = extractLocalGraph(tree, 'root', 2)!;
    expect(result.nodes.length).toBe(6);
  });

  it('depth=1 from leaf in tree returns leaf + parent only', () => {
    const result = extractLocalGraph(tree, 'g1', 1)!;
    const ids = new Set(result.nodes.map((n) => n.id));
    expect(ids).toEqual(new Set(['g1', 'c1']));
  });

  it('depth=2 from leaf in tree includes sibling and grandparent', () => {
    const result = extractLocalGraph(tree, 'g1', 2)!;
    const ids = new Set(result.nodes.map((n) => n.id));
    // g1 → c1 (1) → root, g2 (2)
    expect(ids.has('g1')).toBe(true);
    expect(ids.has('c1')).toBe(true);
    expect(ids.has('root')).toBe(true);
    expect(ids.has('g2')).toBe(true);
    // c2 (3 hops) and g3 (4 hops) excluded
    expect(ids.has('c2')).toBe(false);
    expect(ids.has('g3')).toBe(false);
  });

  it('preserves node properties (label, mastery, masteryColor)', () => {
    const graph: GraphData = {
      nodes: [
        { id: 'a', label: 'Alpha', type: 'keyword', mastery: 0.7, masteryColor: 'green' as MasteryColor },
        { id: 'b', label: 'Beta', type: 'keyword', mastery: 0.2, masteryColor: 'red' as MasteryColor },
      ],
      edges: [mkEdge('ab', 'a', 'b')],
    };
    const result = extractLocalGraph(graph, 'a', 1)!;
    const a = result.nodes.find((n) => n.id === 'a')!;
    expect(a.label).toBe('Alpha');
    expect(a.mastery).toBe(0.7);
    expect(a.masteryColor).toBe('green');
  });

  it('handles graph where focal id collides with a label (id-based, not label-based)', () => {
    const graph: GraphData = {
      nodes: [
        { id: 'id1', label: 'apple', type: 'keyword', mastery: 0.5, masteryColor: 'gray' as MasteryColor },
        { id: 'id2', label: 'apple', type: 'keyword', mastery: 0.5, masteryColor: 'gray' as MasteryColor },
      ],
      edges: [mkEdge('e', 'id1', 'id2')],
    };
    // Searching by label 'apple' should NOT find anything — focal is by id.
    expect(extractLocalGraph(graph, 'apple', 1)).toBeNull();
    const found = extractLocalGraph(graph, 'id1', 1)!;
    expect(found.nodes.length).toBe(2);
  });
});

// ── Source contract pins ────────────────────────────────────

describe('useLocalGraph source contract', () => {
  it('exports useLocalGraph as a named function', () => {
    expect(typeof useLocalGraph).toBe('function');
    expect(source).toContain('export function useLocalGraph');
  });

  it('default depth value is 1 (Obsidian-style direct neighbors)', () => {
    expect(source).toMatch(/depth\s*:\s*number\s*=\s*1/);
  });

  it('imports extractSubgraph from ./graphHelpers (cycle-51 refactor)', () => {
    expect(source).toContain("from './graphHelpers'");
    expect(source).toContain('extractSubgraph');
  });

  it('delegates final filter to extractSubgraph (no inline nodes/edges filter)', () => {
    expect(source).toMatch(/extractSubgraph\s*\(/);
    // Pin: the inline `.filter(...visibleIds.has...)` pattern from before
    // cycle 51 should NOT be in the source any more.
    const visibleHasOccurrences = (source.match(/visibleIds\.has/g) ?? []).length;
    expect(visibleHasOccurrences).toBe(0);
  });

  it('uses useMemo from react with [fullGraph, focalNodeId, depth] deps', () => {
    expect(source).toContain("from 'react'");
    expect(source).toContain('useMemo');
    expect(source).toMatch(/\[fullGraph,\s*focalNodeId,\s*depth\]/);
  });

  it('returns null when fullGraph or focalNodeId is falsy', () => {
    // Defensive guard at top of memo
    expect(source).toMatch(/if\s*\(!fullGraph\s*\|\|\s*!focalNodeId\)\s*return\s*null/);
  });

  it('returns null on empty nodes array', () => {
    expect(source).toMatch(/fullGraph\.nodes\.length\s*===\s*0/);
  });

  it('returns null when focal node id does not exist in graph (caller falls back)', () => {
    // Pinned via the allNodeIds.has(focalNodeId) check
    expect(source).toMatch(/allNodeIds\.has\(focalNodeId\)/);
    expect(source).toMatch(/!allNodeIds\.has\(focalNodeId\)\s*\)\s*return\s*null/);
  });

  it('uses queueHead pointer instead of Array.shift() (O(N) BFS)', () => {
    expect(source).toContain('queueHead');
    // Confirm we did NOT regress to .shift()
    expect(source).not.toMatch(/queue\.shift\(\)/);
  });

  it('builds adjacency map outside the BFS loop (O(E) once)', () => {
    // The "for (const edge of fullGraph.edges)" loop should appear before
    // the "while (queueHead < queue.length)" loop.
    const adjBuildIdx = source.indexOf('for (const edge of fullGraph.edges)');
    const bfsLoopIdx = source.indexOf('while (queueHead');
    expect(adjBuildIdx).toBeGreaterThan(-1);
    expect(bfsLoopIdx).toBeGreaterThan(-1);
    expect(adjBuildIdx).toBeLessThan(bfsLoopIdx);
  });

  it('treats edges as UNDIRECTED (both source→target AND target→source are pushed)', () => {
    // adj.get(edge.source).push(edge.target) AND adj.get(edge.target).push(edge.source)
    expect(source).toMatch(/adj\.get\(edge\.source\)!\.push\(edge\.target\)/);
    expect(source).toMatch(/adj\.get\(edge\.target\)!\.push\(edge\.source\)/);
  });

  it('uses d >= depth (not >) as the BFS stop condition', () => {
    expect(source).toMatch(/d\s*>=\s*depth/);
  });

  it('checks visited via nodeIds.has(n) before pushing to the queue', () => {
    // Defensive: avoid revisiting nodes
    expect(source).toMatch(/!nodeIds\.has\(n\)/);
  });

  it('seeds the visited set with the focal node id before BFS starts', () => {
    expect(source).toContain('nodeIds.add(focalNodeId)');
  });

  it('returns GraphData | null (the documented return type)', () => {
    expect(source).toMatch(/:\s*GraphData\s*\|\s*null/);
  });

  it('imports GraphData type from @/app/types/mindmap', () => {
    expect(source).toMatch(/from\s+['"]@\/app\/types\/mindmap['"]/);
  });
});

// ── Hook integration via renderHook ─────────────────────────

describe('useLocalGraph (hook): null/guard return paths', () => {
  it('returns null when fullGraph is null', () => {
    const { result } = renderHook(() => useLocalGraph(null, 'a'));
    expect(result.current).toBeNull();
  });

  it('returns null when focalNodeId is undefined', () => {
    const { result } = renderHook(() => useLocalGraph(chainGraph, undefined));
    expect(result.current).toBeNull();
  });

  it('returns null when focalNodeId is empty string', () => {
    const { result } = renderHook(() => useLocalGraph(chainGraph, ''));
    expect(result.current).toBeNull();
  });

  it('returns null when graph has zero nodes', () => {
    const empty: GraphData = { nodes: [], edges: [] };
    const { result } = renderHook(() => useLocalGraph(empty, 'a'));
    expect(result.current).toBeNull();
  });

  it('returns null when focal node does not exist in graph (caller-fallback contract)', () => {
    const { result } = renderHook(() => useLocalGraph(chainGraph, 'ghost'));
    expect(result.current).toBeNull();
  });
});

describe('useLocalGraph (hook): return shape', () => {
  it('returns an object with nodes and edges arrays', () => {
    const { result } = renderHook(() => useLocalGraph(chainGraph, 'c', 1));
    expect(result.current).not.toBeNull();
    expect(Array.isArray(result.current!.nodes)).toBe(true);
    expect(Array.isArray(result.current!.edges)).toBe(true);
  });

  it('returns the focal node and its direct neighbors at default depth', () => {
    // No third arg → depth defaults to 1
    const { result } = renderHook(() => useLocalGraph(chainGraph, 'c'));
    const ids = new Set(result.current!.nodes.map((n) => n.id));
    expect(ids).toEqual(new Set(['b', 'c', 'd']));
  });

  it('returns only focal node at depth=0', () => {
    const { result } = renderHook(() => useLocalGraph(chainGraph, 'c', 0));
    expect(result.current!.nodes.length).toBe(1);
    expect(result.current!.nodes[0].id).toBe('c');
    expect(result.current!.edges.length).toBe(0);
  });

  it('returns full chain at depth >> diameter', () => {
    const { result } = renderHook(() => useLocalGraph(chainGraph, 'a', 50));
    expect(result.current!.nodes.length).toBe(5);
    expect(result.current!.edges.length).toBe(4);
  });

  it('preserves the full node object reference from the input graph', () => {
    const { result } = renderHook(() => useLocalGraph(chainGraph, 'c', 1));
    const cInResult = result.current!.nodes.find((n) => n.id === 'c')!;
    const cInInput = chainGraph.nodes.find((n) => n.id === 'c')!;
    expect(cInResult).toBe(cInInput);
  });

  it('returns just the focal node when graph has zero edges', () => {
    const isolated: GraphData = {
      nodes: [mkNode('solo'), mkNode('other')],
      edges: [],
    };
    const { result } = renderHook(() => useLocalGraph(isolated, 'solo', 5));
    expect(result.current!.nodes.length).toBe(1);
    expect(result.current!.nodes[0].id).toBe('solo');
    expect(result.current!.edges.length).toBe(0);
  });
});

describe('useLocalGraph (hook): useMemo identity stability', () => {
  it('returns the same object reference across rerenders with same args', () => {
    const { result, rerender } = renderHook(
      ({ g, id, d }: { g: GraphData; id: string; d: number }) => useLocalGraph(g, id, d),
      { initialProps: { g: chainGraph, id: 'c', d: 1 } }
    );
    const first = result.current;
    rerender({ g: chainGraph, id: 'c', d: 1 });
    expect(result.current).toBe(first);
  });

  it('recomputes (new reference) when fullGraph reference changes', () => {
    const g1: GraphData = {
      nodes: [mkNode('a'), mkNode('b')],
      edges: [mkEdge('ab', 'a', 'b')],
    };
    const g2: GraphData = {
      nodes: [mkNode('a'), mkNode('b')],
      edges: [mkEdge('ab', 'a', 'b')],
    };
    const { result, rerender } = renderHook(
      ({ g }: { g: GraphData }) => useLocalGraph(g, 'a', 1),
      { initialProps: { g: g1 } }
    );
    const first = result.current;
    rerender({ g: g2 });
    expect(result.current).not.toBe(first);
  });

  it('recomputes when focalNodeId changes', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useLocalGraph(chainGraph, id, 1),
      { initialProps: { id: 'a' } }
    );
    const first = result.current;
    rerender({ id: 'c' });
    expect(result.current).not.toBe(first);
    // Sanity: contents differ too
    const firstIds = new Set(first!.nodes.map((n) => n.id));
    const secondIds = new Set(result.current!.nodes.map((n) => n.id));
    expect(firstIds).not.toEqual(secondIds);
  });

  it('recomputes when depth changes', () => {
    const { result, rerender } = renderHook(
      ({ d }: { d: number }) => useLocalGraph(chainGraph, 'c', d),
      { initialProps: { d: 1 } }
    );
    const first = result.current;
    rerender({ d: 2 });
    expect(result.current).not.toBe(first);
    expect(first!.nodes.length).toBeLessThan(result.current!.nodes.length);
  });

  it('returns null stably across rerenders when args remain null', () => {
    const { result, rerender } = renderHook(() => useLocalGraph(null, 'a', 1));
    expect(result.current).toBeNull();
    rerender();
    expect(result.current).toBeNull();
  });

  it('transitions from null → object when focal becomes valid', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) => useLocalGraph(chainGraph, id, 1),
      { initialProps: { id: undefined as string | undefined } }
    );
    expect(result.current).toBeNull();
    rerender({ id: 'a' });
    expect(result.current).not.toBeNull();
    expect(result.current!.nodes.length).toBeGreaterThan(0);
  });

  it('transitions from object → null when focal becomes invalid', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) => useLocalGraph(chainGraph, id, 1),
      { initialProps: { id: 'a' as string | undefined } }
    );
    expect(result.current).not.toBeNull();
    rerender({ id: undefined });
    expect(result.current).toBeNull();
  });
});

// ── Hook behavior parity with replicated logic ──────────────

describe('useLocalGraph (hook): parity with pure replication', () => {
  const cases: Array<{ name: string; graph: GraphData; focal: string; depth: number }> = [
    { name: 'chain depth 1 from middle', graph: chainGraph, focal: 'c', depth: 1 },
    { name: 'chain depth 0', graph: chainGraph, focal: 'a', depth: 0 },
    { name: 'chain depth 2 from end', graph: chainGraph, focal: 'a', depth: 2 },
    { name: 'star depth 1 from center', graph: starGraph, focal: 'center', depth: 1 },
    { name: 'star depth 1 from leaf', graph: starGraph, focal: 'l1', depth: 1 },
    { name: 'star depth 2 from leaf', graph: starGraph, focal: 'l1', depth: 2 },
  ];

  for (const c of cases) {
    it(`hook output matches replicated extractLocalGraph: ${c.name}`, () => {
      const { result } = renderHook(() => useLocalGraph(c.graph, c.focal, c.depth));
      const expected = extractLocalGraph(c.graph, c.focal, c.depth)!;
      const actualNodeIds = new Set(result.current!.nodes.map((n) => n.id));
      const expectedNodeIds = new Set(expected.nodes.map((n) => n.id));
      expect(actualNodeIds).toEqual(expectedNodeIds);
      const actualEdgeIds = new Set(result.current!.edges.map((e) => e.id));
      const expectedEdgeIds = new Set(expected.edges.map((e) => e.id));
      expect(actualEdgeIds).toEqual(expectedEdgeIds);
    });
  }
});
