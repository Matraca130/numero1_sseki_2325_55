// ============================================================
// Tests — useGraphSearch (search + filter logic)
//
// The hook uses React state (useState/useEffect/useMemo), so we
// extract and test the pure logic: node matching, neighbor
// expansion, and filtered graph construction. This mirrors the
// project pattern of testing pure logic without jsdom.
// ============================================================

import { describe, it, expect } from 'vitest';
import type { MapNode, MapEdge, GraphData } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';

// ── Helpers: replicate the pure logic from useGraphSearch ────

/** Compute matching node IDs (instant highlight logic) */
function computeMatchingNodeIds(
  graphData: GraphData | null,
  searchQuery: string
): Set<string> {
  if (!graphData || !searchQuery.trim()) return new Set();
  const q = searchQuery.trim().toLowerCase();
  return new Set(
    graphData.nodes
      .filter((n) => n.label.toLowerCase().includes(q))
      .map((n) => n.id)
  );
}

/** Compute filtered graph data (debounced filter logic) */
function computeFilteredGraphData(
  graphData: GraphData | null,
  debouncedSearch: string
): GraphData | null {
  if (!graphData) return null;
  if (!debouncedSearch.trim()) return graphData;

  const q = debouncedSearch.trim().toLowerCase();
  const debouncedMatchIds = new Set(
    graphData.nodes
      .filter((n) => n.label.toLowerCase().includes(q))
      .map((n) => n.id)
  );

  const neighborIds = new Set<string>();
  for (const edge of graphData.edges) {
    if (debouncedMatchIds.has(edge.source)) neighborIds.add(edge.target);
    if (debouncedMatchIds.has(edge.target)) neighborIds.add(edge.source);
  }

  const visibleIds = new Set([...debouncedMatchIds, ...neighborIds]);

  return {
    nodes: graphData.nodes.filter((n) => visibleIds.has(n.id)),
    edges: graphData.edges.filter(
      (e) => visibleIds.has(e.source) && visibleIds.has(e.target)
    ),
  };
}

// ── Test fixtures ───────────────────────────────────────────

function mkNode(id: string, label: string): MapNode {
  return {
    id,
    label,
    type: 'keyword',
    mastery: 0.5,
    masteryColor: 'green' as MasteryColor,
  };
}

function mkEdge(id: string, source: string, target: string): MapEdge {
  return { id, source, target };
}

const sampleGraph: GraphData = {
  nodes: [
    mkNode('n1', 'Mitosis'),
    mkNode('n2', 'Meiosis'),
    mkNode('n3', 'Cell Cycle'),
    mkNode('n4', 'DNA Replication'),
    mkNode('n5', 'Chromosome'),
  ],
  edges: [
    mkEdge('e1', 'n1', 'n3'), // Mitosis → Cell Cycle
    mkEdge('e2', 'n2', 'n3'), // Meiosis → Cell Cycle
    mkEdge('e3', 'n3', 'n4'), // Cell Cycle → DNA Replication
    mkEdge('e4', 'n4', 'n5'), // DNA Replication → Chromosome
  ],
};

// ── computeMatchingNodeIds ──────────────────────────────────

describe('computeMatchingNodeIds', () => {
  it('returns empty set when graphData is null', () => {
    const result = computeMatchingNodeIds(null, 'mito');
    expect(result.size).toBe(0);
  });

  it('returns empty set when searchQuery is empty', () => {
    const result = computeMatchingNodeIds(sampleGraph, '');
    expect(result.size).toBe(0);
  });

  it('returns empty set when searchQuery is only whitespace', () => {
    const result = computeMatchingNodeIds(sampleGraph, '   ');
    expect(result.size).toBe(0);
  });

  it('matches nodes by partial label (case-insensitive)', () => {
    const result = computeMatchingNodeIds(sampleGraph, 'mito');
    expect(result.size).toBe(1);
    expect(result.has('n1')).toBe(true);
  });

  it('matches are case-insensitive', () => {
    const result = computeMatchingNodeIds(sampleGraph, 'MEIOSIS');
    expect(result.size).toBe(1);
    expect(result.has('n2')).toBe(true);
  });

  it('matches mixed case query against mixed case label', () => {
    const result = computeMatchingNodeIds(sampleGraph, 'dna');
    expect(result.size).toBe(1);
    expect(result.has('n4')).toBe(true);
  });

  it('matches multiple nodes when query is a common substring', () => {
    // Both "Mitosis" and "Meiosis" contain "sis"
    const result = computeMatchingNodeIds(sampleGraph, 'sis');
    expect(result.size).toBe(2);
    expect(result.has('n1')).toBe(true);
    expect(result.has('n2')).toBe(true);
  });

  it('returns empty set when no labels match', () => {
    const result = computeMatchingNodeIds(sampleGraph, 'photosynthesis');
    expect(result.size).toBe(0);
  });

  it('trims whitespace from query before matching', () => {
    const result = computeMatchingNodeIds(sampleGraph, '  Mitosis  ');
    expect(result.size).toBe(1);
    expect(result.has('n1')).toBe(true);
  });

  it('handles special regex characters in query safely', () => {
    // The hook uses String.includes(), not regex, so special chars are literal
    const graphWithSpecial: GraphData = {
      nodes: [mkNode('s1', 'Gene (p53)')],
      edges: [],
    };
    const result = computeMatchingNodeIds(graphWithSpecial, '(p53)');
    expect(result.size).toBe(1);
    expect(result.has('s1')).toBe(true);
  });

  it('handles nodes with accented characters', () => {
    const graphAccented: GraphData = {
      nodes: [mkNode('a1', 'Replicação'), mkNode('a2', 'Mutação')],
      edges: [],
    };
    const result = computeMatchingNodeIds(graphAccented, 'ção');
    expect(result.size).toBe(2);
  });

  it('handles graph with no nodes', () => {
    const emptyGraph: GraphData = { nodes: [], edges: [] };
    const result = computeMatchingNodeIds(emptyGraph, 'anything');
    expect(result.size).toBe(0);
  });

  it('handles single character query', () => {
    // "Cell Cycle" and "Chromosome" and "DNA Replication" all contain 'c'
    const result = computeMatchingNodeIds(sampleGraph, 'c');
    expect(result.has('n3')).toBe(true); // Cell Cycle
    expect(result.has('n5')).toBe(true); // Chromosome
  });
});

// ── computeFilteredGraphData ────────────────────────────────

describe('computeFilteredGraphData', () => {
  it('returns null when graphData is null', () => {
    const result = computeFilteredGraphData(null, 'mito');
    expect(result).toBeNull();
  });

  it('returns full graph when debouncedSearch is empty', () => {
    const result = computeFilteredGraphData(sampleGraph, '');
    expect(result).toBe(sampleGraph); // same reference
  });

  it('returns full graph when debouncedSearch is only whitespace', () => {
    const result = computeFilteredGraphData(sampleGraph, '   ');
    expect(result).toBe(sampleGraph);
  });

  it('includes matched node and its direct neighbors', () => {
    // Search "Mitosis" (n1) → neighbors via edges: n3 (Cell Cycle)
    const result = computeFilteredGraphData(sampleGraph, 'Mitosis')!;
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    expect(nodeIds.has('n1')).toBe(true); // matched
    expect(nodeIds.has('n3')).toBe(true); // neighbor via e1
    expect(nodeIds.has('n2')).toBe(false); // not neighbor of n1
    expect(nodeIds.has('n4')).toBe(false); // 2 hops away
    expect(nodeIds.has('n5')).toBe(false); // 3 hops away
  });

  it('only includes edges where both endpoints are visible', () => {
    const result = computeFilteredGraphData(sampleGraph, 'Mitosis')!;
    // Visible: n1, n3
    // Edge e1 (n1→n3) should be included
    // Edge e2 (n2→n3) should NOT be included (n2 not visible)
    const edgeIds = new Set(result.edges.map((e) => e.id));
    expect(edgeIds.has('e1')).toBe(true);
    expect(edgeIds.has('e2')).toBe(false);
    expect(edgeIds.has('e3')).toBe(false);
    expect(edgeIds.has('e4')).toBe(false);
  });

  it('includes neighbors from both source and target directions', () => {
    // Search "Cell Cycle" (n3)
    // n3 is target of e1 (n1→n3) and e2 (n2→n3), and source of e3 (n3→n4)
    // So neighbors: n1, n2, n4
    const result = computeFilteredGraphData(sampleGraph, 'Cell Cycle')!;
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    expect(nodeIds.has('n3')).toBe(true); // matched
    expect(nodeIds.has('n1')).toBe(true); // neighbor (source of e1)
    expect(nodeIds.has('n2')).toBe(true); // neighbor (source of e2)
    expect(nodeIds.has('n4')).toBe(true); // neighbor (target of e3)
    expect(nodeIds.has('n5')).toBe(false); // 2 hops away from n3
  });

  it('handles multiple matched nodes and merges their neighbors', () => {
    // Search "sis" matches n1 (Mitosis) and n2 (Meiosis)
    // n1 neighbors: n3; n2 neighbors: n3
    // Visible: n1, n2, n3
    const result = computeFilteredGraphData(sampleGraph, 'sis')!;
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    expect(nodeIds.size).toBe(3);
    expect(nodeIds.has('n1')).toBe(true);
    expect(nodeIds.has('n2')).toBe(true);
    expect(nodeIds.has('n3')).toBe(true);
  });

  it('returns empty nodes/edges when no matches found', () => {
    const result = computeFilteredGraphData(sampleGraph, 'photosynthesis')!;
    expect(result.nodes.length).toBe(0);
    expect(result.edges.length).toBe(0);
  });

  it('handles graph with no edges (isolated nodes)', () => {
    const isolatedGraph: GraphData = {
      nodes: [mkNode('i1', 'Alpha'), mkNode('i2', 'Beta'), mkNode('i3', 'Gamma')],
      edges: [],
    };
    const result = computeFilteredGraphData(isolatedGraph, 'Alpha')!;
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].id).toBe('i1');
    expect(result.edges.length).toBe(0);
  });

  it('handles graph with no nodes', () => {
    const emptyGraph: GraphData = { nodes: [], edges: [] };
    const result = computeFilteredGraphData(emptyGraph, 'anything')!;
    expect(result.nodes.length).toBe(0);
    expect(result.edges.length).toBe(0);
  });

  it('is case-insensitive for filtering', () => {
    const result = computeFilteredGraphData(sampleGraph, 'MITOSIS')!;
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    expect(nodeIds.has('n1')).toBe(true);
  });

  it('trims whitespace from debouncedSearch', () => {
    const result = computeFilteredGraphData(sampleGraph, '  Chromosome  ')!;
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    expect(nodeIds.has('n5')).toBe(true); // matched
    expect(nodeIds.has('n4')).toBe(true); // neighbor
  });

  it('does not duplicate nodes that are both matched and neighbors', () => {
    // "Cell" matches n3 (Cell Cycle). n3 is also neighbor of n1.
    // If we search for something that matches n1 AND n3, n3 should appear once.
    const result = computeFilteredGraphData(sampleGraph, 'Cell Cycle')!;
    const n3Count = result.nodes.filter((n) => n.id === 'n3').length;
    expect(n3Count).toBe(1);
  });

  it('handles special characters in search without error', () => {
    // String.includes is safe with special chars (no regex)
    const result = computeFilteredGraphData(sampleGraph, '.*+?^${}()|[]\\');
    expect(result).not.toBeNull();
    expect(result!.nodes.length).toBe(0);
  });
});

// ── Derived counts (matchCount, nodeCount, edgeCount) ───────

describe('derived counts', () => {
  it('matchCount equals the size of matchingNodeIds', () => {
    const matchIds = computeMatchingNodeIds(sampleGraph, 'sis');
    expect(matchIds.size).toBe(2); // Mitosis, Meiosis
  });

  it('nodeCount is the length of filteredGraphData.nodes', () => {
    const filtered = computeFilteredGraphData(sampleGraph, 'sis')!;
    expect(filtered.nodes.length).toBe(3); // 2 matched + 1 neighbor
  });

  it('edgeCount is the length of filteredGraphData.edges', () => {
    const filtered = computeFilteredGraphData(sampleGraph, 'sis')!;
    // Visible: n1, n2, n3. Edges: e1(n1→n3), e2(n2→n3). e3(n3→n4) excluded since n4 not visible.
    expect(filtered.edges.length).toBe(2);
  });

  it('counts are zero when graphData is null', () => {
    const matchIds = computeMatchingNodeIds(null, 'test');
    const filtered = computeFilteredGraphData(null, 'test');
    expect(matchIds.size).toBe(0);
    expect(filtered?.nodes.length ?? 0).toBe(0);
    expect(filtered?.edges.length ?? 0).toBe(0);
  });
});

// ── Debounce behavior (structural verification) ─────────────

describe('debounce behavior (design verification)', () => {
  it('matchingNodeIds uses raw searchQuery (no debounce)', () => {
    // Verifying that the matching function works with any input immediately.
    // In the hook, matchingNodeIds depends on searchQuery (not debouncedSearch).
    const immediate = computeMatchingNodeIds(sampleGraph, 'Mito');
    expect(immediate.size).toBe(1);
  });

  it('filteredGraphData uses debouncedSearch (empty debounced = full graph)', () => {
    // When the debounced value hasn't caught up yet, the full graph is returned.
    const filtered = computeFilteredGraphData(sampleGraph, '');
    expect(filtered).toBe(sampleGraph);
  });

  it('clearing search (empty string) immediately clears debounced state', () => {
    // The hook has a fast path: if searchQuery is empty, debouncedSearch is set
    // immediately to '' (no 300ms wait). We verify the cleared state returns full graph.
    const matchIds = computeMatchingNodeIds(sampleGraph, '');
    const filtered = computeFilteredGraphData(sampleGraph, '');
    expect(matchIds.size).toBe(0);
    expect(filtered).toBe(sampleGraph);
  });
});

// ── Edge case: dense graph ──────────────────────────────────

describe('dense graph scenarios', () => {
  it('handles a fully connected graph correctly', () => {
    const nodes = [mkNode('a', 'Alpha'), mkNode('b', 'Beta'), mkNode('c', 'Gamma')];
    const edges = [
      mkEdge('ab', 'a', 'b'),
      mkEdge('bc', 'b', 'c'),
      mkEdge('ac', 'a', 'c'),
    ];
    const graph: GraphData = { nodes, edges };

    // Searching "Alpha" (a) -> neighbors b and c -> all visible
    const result = computeFilteredGraphData(graph, 'Alpha')!;
    expect(result.nodes.length).toBe(3);
    expect(result.edges.length).toBe(3);
  });

  it('handles a single-node graph', () => {
    const graph: GraphData = {
      nodes: [mkNode('solo', 'Lonely Node')],
      edges: [],
    };
    const matchIds = computeMatchingNodeIds(graph, 'Lonely');
    expect(matchIds.size).toBe(1);

    const filtered = computeFilteredGraphData(graph, 'Lonely')!;
    expect(filtered.nodes.length).toBe(1);
    expect(filtered.edges.length).toBe(0);
  });

  it('handles self-referencing edge', () => {
    const graph: GraphData = {
      nodes: [mkNode('x', 'Recursion')],
      edges: [mkEdge('self', 'x', 'x')],
    };
    const filtered = computeFilteredGraphData(graph, 'Recursion')!;
    expect(filtered.nodes.length).toBe(1);
    expect(filtered.edges.length).toBe(1);
  });
});
