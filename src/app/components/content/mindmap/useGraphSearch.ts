// ============================================================
// Axon — useGraphSearch hook
//
// Encapsulates debounced search + filtered graph data logic.
// Shared between KnowledgeMapView (student) and
// ProfessorKnowledgeMapPage (professor).
//
// Provides:
//   - searchQuery / setSearchQuery (immediate state)
//   - debouncedSearch (300ms debounce for graph rebuild)
//   - matchingNodeIds (instant highlight, no debounce)
//   - filteredGraphData (debounced: matched nodes + neighbors)
//   - matchCount, nodeCount, edgeCount
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import type { GraphData } from '@/app/types/mindmap';

interface UseGraphSearchResult {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  /** IDs of nodes whose label matches the query (instant, for highlighting) */
  matchingNodeIds: Set<string>;
  /** Graph filtered to matched nodes + their direct neighbors (debounced) */
  filteredGraphData: GraphData | null;
  /** Number of directly matching nodes */
  matchCount: number;
  nodeCount: number;
  edgeCount: number;
}

export function useGraphSearch(graphData: GraphData | null): UseGraphSearchResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query to avoid G6 destroy/recreate on every keystroke
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearch('');
      return;
    }
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Instant match IDs (for highlighting without debounce)
  const matchingNodeIds = useMemo<Set<string>>(() => {
    if (!graphData || !searchQuery.trim()) return new Set();
    const q = searchQuery.trim().toLowerCase();
    return new Set(
      graphData.nodes
        .filter((n) => (n.label ?? '').toLowerCase().includes(q))
        .map((n) => n.id)
    );
  }, [graphData, searchQuery]);

  // Debounced filtered graph: matched nodes + their direct neighbors
  const filteredGraphData = useMemo(() => {
    if (!graphData) return null;
    if (!debouncedSearch.trim()) return graphData;

    const q = debouncedSearch.trim().toLowerCase();
    const debouncedMatchIds = new Set(
      graphData.nodes
        .filter((n) => (n.label ?? '').toLowerCase().includes(q))
        .map((n) => n.id)
    );

    // Build neighbor set: nodes directly connected to any matched node
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
  }, [graphData, debouncedSearch]);

  const matchCount = matchingNodeIds.size;
  const nodeCount = filteredGraphData?.nodes.length ?? 0;
  const edgeCount = filteredGraphData?.edges.length ?? 0;

  return {
    searchQuery,
    setSearchQuery,
    matchingNodeIds,
    filteredGraphData,
    matchCount,
    nodeCount,
    edgeCount,
  };
}
