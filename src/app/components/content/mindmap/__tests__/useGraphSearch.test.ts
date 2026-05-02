// ============================================================
// Tests — useGraphSearch (search + filter logic)
//
// The hook uses React state (useState/useEffect/useMemo), so we
// extract and test the pure logic: node matching, neighbor
// expansion, and filtered graph construction. This mirrors the
// project pattern of testing pure logic without jsdom.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { MapNode, MapEdge, GraphData } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';
import { useGraphSearch } from '../useGraphSearch';

const SOURCE_PATH = resolve(__dirname, '..', 'useGraphSearch.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

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

// ── Source contract (guards against refactor regressions) ───

describe('useGraphSearch source contract', () => {
  it('exports useGraphSearch as a named function', () => {
    expect(typeof useGraphSearch).toBe('function');
    expect(source).toContain('export function useGraphSearch');
  });

  it('uses a 300ms debounce delay (literal pinned)', () => {
    expect(source).toContain('300');
    // setTimeout(..., 300) — the callback can include parens, so just look for ", 300)"
    expect(source).toMatch(/,\s*300\s*\)/);
  });

  it('uses setTimeout + clearTimeout for the debounce', () => {
    expect(source).toContain('setTimeout');
    expect(source).toContain('clearTimeout');
  });

  it('lowercases for case-insensitive matching', () => {
    // Both query and labels must be lowercased
    const occurrences = (source.match(/toLowerCase\(\)/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('uses substring matching via String.includes', () => {
    expect(source).toContain('.includes(');
  });

  it('trims the search query before processing', () => {
    expect(source).toContain('.trim()');
  });

  it('defends against undefined labels with ?? \'\' fallback', () => {
    // Both matching memos should defensively coalesce label to ''.
    const occurrences = (source.match(/n\.label\s*\?\?\s*''/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('declares the documented return shape keys', () => {
    expect(source).toContain('searchQuery');
    expect(source).toContain('setSearchQuery');
    expect(source).toContain('matchingNodeIds');
    expect(source).toContain('filteredGraphData');
    expect(source).toContain('matchCount');
    expect(source).toContain('nodeCount');
    expect(source).toContain('edgeCount');
  });

  it('uses useState/useEffect/useMemo from react', () => {
    expect(source).toMatch(
      /from 'react'/
    );
    expect(source).toContain('useState');
    expect(source).toContain('useEffect');
    expect(source).toContain('useMemo');
  });

  it('matchingNodeIds memo depends on searchQuery (NOT debouncedSearch)', () => {
    // The instant highlight memo must depend on the raw query, otherwise
    // highlighting would lag behind typing.
    const memoBody = source.split('matchingNodeIds = useMemo')[1] ?? '';
    // Look at the deps array following the memo
    expect(memoBody).toMatch(/\[graphData,\s*searchQuery\]/);
  });

  it('filteredGraphData memo depends on debouncedSearch (NOT raw searchQuery)', () => {
    const memoBody = source.split('filteredGraphData = useMemo')[1] ?? '';
    expect(memoBody).toMatch(/\[graphData,\s*debouncedSearch\]/);
  });

  it('debounce effect depends only on searchQuery', () => {
    // The effect should NOT re-run when graphData changes
    expect(source).toMatch(/\[searchQuery\]/);
  });
});

// ── Hook integration: initial render & return shape ─────────

describe('useGraphSearch (hook): initial state', () => {
  it('returns the documented shape on first render', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    expect(result.current).toHaveProperty('searchQuery');
    expect(result.current).toHaveProperty('setSearchQuery');
    expect(result.current).toHaveProperty('matchingNodeIds');
    expect(result.current).toHaveProperty('filteredGraphData');
    expect(result.current).toHaveProperty('matchCount');
    expect(result.current).toHaveProperty('nodeCount');
    expect(result.current).toHaveProperty('edgeCount');
  });

  it('searchQuery starts as empty string', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    expect(result.current.searchQuery).toBe('');
  });

  it('matchingNodeIds is an empty Set on first render', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    expect(result.current.matchingNodeIds).toBeInstanceOf(Set);
    expect(result.current.matchingNodeIds.size).toBe(0);
  });

  it('filteredGraphData is the input graph by reference when query is empty', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    expect(result.current.filteredGraphData).toBe(sampleGraph);
  });

  it('matchCount is 0 when no query', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    expect(result.current.matchCount).toBe(0);
  });

  it('nodeCount equals all nodes when no query (full graph passes through)', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    expect(result.current.nodeCount).toBe(sampleGraph.nodes.length);
  });

  it('edgeCount equals all edges when no query', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    expect(result.current.edgeCount).toBe(sampleGraph.edges.length);
  });

  it('returns null filteredGraphData when graphData is null', () => {
    const { result } = renderHook(() => useGraphSearch(null));
    expect(result.current.filteredGraphData).toBeNull();
    expect(result.current.nodeCount).toBe(0);
    expect(result.current.edgeCount).toBe(0);
    expect(result.current.matchCount).toBe(0);
  });

  it('setSearchQuery is a function reference', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    expect(typeof result.current.setSearchQuery).toBe('function');
  });
});

// ── Hook integration: instant highlight (no debounce) ───────

describe('useGraphSearch (hook): instant matchingNodeIds', () => {
  it('updates matchingNodeIds immediately on setSearchQuery (no debounce wait)', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('Mito');
    });
    expect(result.current.matchingNodeIds.has('n1')).toBe(true);
    expect(result.current.matchingNodeIds.size).toBe(1);
    expect(result.current.matchCount).toBe(1);
  });

  it('matchingNodeIds reflects the raw query, even before debounce settles', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useGraphSearch(sampleGraph));
      act(() => {
        result.current.setSearchQuery('Cell');
      });
      // No timer advance yet: matchingNodeIds is already populated
      expect(result.current.matchingNodeIds.has('n3')).toBe(true);
      expect(result.current.matchCount).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('searchQuery state holds the raw value', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('  spaced  ');
    });
    expect(result.current.searchQuery).toBe('  spaced  ');
  });

  it('clearing the query empties matchingNodeIds immediately', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('Mitosis');
    });
    expect(result.current.matchingNodeIds.size).toBe(1);
    act(() => {
      result.current.setSearchQuery('');
    });
    expect(result.current.matchingNodeIds.size).toBe(0);
  });

  it('matchingNodeIds Set ref is stable across rerender when graphData and query unchanged', () => {
    const { result, rerender } = renderHook(
      ({ g }: { g: GraphData }) => useGraphSearch(g),
      { initialProps: { g: sampleGraph } }
    );
    const refBefore = result.current.matchingNodeIds;
    rerender({ g: sampleGraph });
    expect(result.current.matchingNodeIds).toBe(refBefore);
  });

  it('matchingNodeIds Set ref changes when query changes', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    const refEmpty = result.current.matchingNodeIds;
    act(() => {
      result.current.setSearchQuery('Mito');
    });
    expect(result.current.matchingNodeIds).not.toBe(refEmpty);
  });

  it('matchingNodeIds Set ref changes when graphData reference changes', () => {
    const { result, rerender } = renderHook(
      ({ g }: { g: GraphData }) => useGraphSearch(g),
      { initialProps: { g: sampleGraph } }
    );
    act(() => {
      result.current.setSearchQuery('Mito');
    });
    const refBefore = result.current.matchingNodeIds;
    const newGraph: GraphData = { nodes: [...sampleGraph.nodes], edges: [...sampleGraph.edges] };
    rerender({ g: newGraph });
    expect(result.current.matchingNodeIds).not.toBe(refBefore);
  });
});

// ── Hook integration: debounce timing (300ms literal) ───────

describe('useGraphSearch (hook): 300ms debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('filteredGraphData does NOT update before 300ms elapse', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('Mitosis');
    });
    // Initial: filteredGraphData is still the full graph (debouncedSearch empty)
    expect(result.current.filteredGraphData).toBe(sampleGraph);
    act(() => {
      vi.advanceTimersByTime(299);
    });
    // Just shy of 300ms: still the full graph
    expect(result.current.filteredGraphData).toBe(sampleGraph);
  });

  it('filteredGraphData updates exactly at 300ms', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('Mitosis');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Now the debounced filter has run
    expect(result.current.filteredGraphData).not.toBe(sampleGraph);
    const ids = new Set(result.current.filteredGraphData!.nodes.map((n) => n.id));
    expect(ids.has('n1')).toBe(true);
    expect(ids.has('n3')).toBe(true);
  });

  it('rapid setSearchQuery calls reset the timer (only last value lands)', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('Mit');
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    act(() => {
      result.current.setSearchQuery('Meio');
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    // 150 + 150 = 300ms total but only 150ms since the last change → no fire yet
    expect(result.current.filteredGraphData).toBe(sampleGraph);
    act(() => {
      vi.advanceTimersByTime(150);
    });
    // Now 300ms since "Meio" was set
    const ids = new Set(result.current.filteredGraphData!.nodes.map((n) => n.id));
    expect(ids.has('n2')).toBe(true); // Meiosis matched
    expect(ids.has('n1')).toBe(false); // "Mit" was cancelled
  });

  it('clearing query mid-debounce skips the timer (immediate empty)', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('Mitosis');
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    // Mid-debounce: clear query
    act(() => {
      result.current.setSearchQuery('');
    });
    // Empty-string fast path: debouncedSearch is set synchronously to ''
    // → filteredGraphData is the original graph immediately, no 300ms wait
    expect(result.current.filteredGraphData).toBe(sampleGraph);
  });

  it('whitespace-only query also takes the empty fast-path', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('Mitosis');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Switch to whitespace
    act(() => {
      result.current.setSearchQuery('   ');
    });
    // Fast path: debouncedSearch becomes '', filteredGraphData reverts immediately
    expect(result.current.filteredGraphData).toBe(sampleGraph);
  });

  it('does NOT throw or warn when unmounted mid-debounce (cleanup runs)', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('Mitosis');
    });
    // Unmount before debounce fires
    unmount();
    // Advance past 300ms — the cleared timer should not fire any setState
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('setting same query twice does not double-schedule (cleanup before new effect)', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('Mitosis');
    });
    // No advance: setting the SAME value will not trigger a new setState
    // (useState bails out for identical values), so the same effect persists
    act(() => {
      result.current.setSearchQuery('Mitosis');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const ids = new Set(result.current.filteredGraphData!.nodes.map((n) => n.id));
    expect(ids.has('n1')).toBe(true);
  });

  it('changing query after debounce settles re-debounces correctly', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('Mitosis');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const firstFiltered = result.current.filteredGraphData;
    expect(firstFiltered).not.toBe(sampleGraph);

    act(() => {
      result.current.setSearchQuery('Cell');
    });
    // Pre-debounce: filtered still reflects old "Mitosis" result
    expect(result.current.filteredGraphData).toBe(firstFiltered);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const ids = new Set(result.current.filteredGraphData!.nodes.map((n) => n.id));
    expect(ids.has('n3')).toBe(true); // Cell Cycle is now in scope
  });
});

// ── Hook integration: filteredGraphData identity & deps ─────

describe('useGraphSearch (hook): filteredGraphData memo behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('filteredGraphData ref is stable across rerender when nothing relevant changed', () => {
    const { result, rerender } = renderHook(
      ({ g }: { g: GraphData }) => useGraphSearch(g),
      { initialProps: { g: sampleGraph } }
    );
    const before = result.current.filteredGraphData;
    rerender({ g: sampleGraph });
    expect(result.current.filteredGraphData).toBe(before);
  });

  it('filteredGraphData ref does NOT change when raw query types but debounce hasn\'t fired', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    const before = result.current.filteredGraphData;
    act(() => {
      result.current.setSearchQuery('Mit');
    });
    // Raw query changed but debounced hasn't — memo should keep ref stable
    expect(result.current.filteredGraphData).toBe(before);
  });

  it('filteredGraphData ref changes when debouncedSearch updates', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    const before = result.current.filteredGraphData;
    act(() => {
      result.current.setSearchQuery('Mitosis');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.filteredGraphData).not.toBe(before);
  });

  it('filteredGraphData reverts to original graph reference after clearing', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('Mitosis');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Now filteredGraphData is a new object
    expect(result.current.filteredGraphData).not.toBe(sampleGraph);
    act(() => {
      result.current.setSearchQuery('');
    });
    // Empty fast-path: should be the original by reference
    expect(result.current.filteredGraphData).toBe(sampleGraph);
  });

  it('counts (nodeCount, edgeCount, matchCount) update consistently with the memos', () => {
    const { result } = renderHook(() => useGraphSearch(sampleGraph));
    act(() => {
      result.current.setSearchQuery('Mitosis');
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // matchCount = matchingNodeIds.size, nodeCount = filtered.nodes.length, etc.
    expect(result.current.matchCount).toBe(result.current.matchingNodeIds.size);
    expect(result.current.nodeCount).toBe(
      result.current.filteredGraphData!.nodes.length
    );
    expect(result.current.edgeCount).toBe(
      result.current.filteredGraphData!.edges.length
    );
  });
});

// ── Hook integration: defensive label handling ──────────────

describe('useGraphSearch (hook): defensive label handling', () => {
  it('handles a node with undefined label without throwing', () => {
    // The source uses `n.label ?? ''` for defense
    const graphWithUndefined: GraphData = {
      nodes: [
        // Cast to bypass strict typing — we're testing runtime defense
        { ...mkNode('a', 'Alpha'), label: undefined as unknown as string },
        mkNode('b', 'Beta'),
      ],
      edges: [],
    };
    expect(() => {
      const { result } = renderHook(() => useGraphSearch(graphWithUndefined));
      act(() => {
        result.current.setSearchQuery('beta');
      });
      // The undefined-label node won't match, but the call must not throw
      expect(result.current.matchingNodeIds.has('b')).toBe(true);
      expect(result.current.matchingNodeIds.has('a')).toBe(false);
    }).not.toThrow();
  });

  it('handles a node with null label without throwing', () => {
    const graphWithNull: GraphData = {
      nodes: [
        { ...mkNode('a', 'Alpha'), label: null as unknown as string },
        mkNode('b', 'Beta'),
      ],
      edges: [],
    };
    expect(() => {
      const { result } = renderHook(() => useGraphSearch(graphWithNull));
      act(() => {
        result.current.setSearchQuery('alpha');
      });
      // null label gets coalesced to '' — no match for "alpha"
      expect(result.current.matchingNodeIds.size).toBe(0);
    }).not.toThrow();
  });
});

// ── Hook integration: graphData transitions ─────────────────

describe('useGraphSearch (hook): graphData transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles transition from null → graph', () => {
    const { result, rerender } = renderHook(
      ({ g }: { g: GraphData | null }) => useGraphSearch(g),
      { initialProps: { g: null as GraphData | null } }
    );
    expect(result.current.filteredGraphData).toBeNull();
    rerender({ g: sampleGraph });
    expect(result.current.filteredGraphData).toBe(sampleGraph);
  });

  it('handles transition from graph → null', () => {
    const { result, rerender } = renderHook(
      ({ g }: { g: GraphData | null }) => useGraphSearch(g),
      { initialProps: { g: sampleGraph as GraphData | null } }
    );
    expect(result.current.filteredGraphData).toBe(sampleGraph);
    rerender({ g: null });
    expect(result.current.filteredGraphData).toBeNull();
    expect(result.current.matchingNodeIds.size).toBe(0);
  });

  it('matching survives a graphData swap (re-evaluates against new nodes)', () => {
    const graphA: GraphData = {
      nodes: [mkNode('a1', 'AlphaTopic')],
      edges: [],
    };
    const graphB: GraphData = {
      nodes: [mkNode('b1', 'AlphaConcept')],
      edges: [],
    };
    const { result, rerender } = renderHook(
      ({ g }: { g: GraphData }) => useGraphSearch(g),
      { initialProps: { g: graphA } }
    );
    act(() => {
      result.current.setSearchQuery('Alpha');
    });
    expect(result.current.matchingNodeIds.has('a1')).toBe(true);
    rerender({ g: graphB });
    expect(result.current.matchingNodeIds.has('b1')).toBe(true);
    expect(result.current.matchingNodeIds.has('a1')).toBe(false);
  });
});
