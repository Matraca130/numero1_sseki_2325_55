// ============================================================
// Tests — useLocalGraph (local subgraph extraction)
//
// The hook wraps pure BFS logic in useMemo. We extract and
// test the BFS algorithm directly by replicating it here.
// This follows the project pattern of testing pure logic
// without DOM or React rendering.
//
// The BFS extracts a depth-limited subgraph around a focal
// node (Obsidian-style: direct neighbors only by default).
// ============================================================

import { describe, it, expect } from 'vitest';
import type { GraphData, MapNode, MapEdge } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';

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
});
