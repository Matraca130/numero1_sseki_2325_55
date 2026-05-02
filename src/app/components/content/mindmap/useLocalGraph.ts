// ============================================================
// Axon — useLocalGraph hook
//
// Extracts a local subgraph around a focal keyword.
// Obsidian-style: show only direct neighbors (degree 1).
// Used for micro-session graphs in quiz/flashcard/summary.
// ============================================================

import { useMemo } from 'react';
import type { GraphData } from '@/app/types/mindmap';
import { extractSubgraph } from './graphHelpers';

/**
 * Filter a full graph to only include nodes within `depth` hops
 * of the focal node.
 */
export function useLocalGraph(
  fullGraph: GraphData | null,
  focalNodeId: string | undefined,
  depth: number = 1
): GraphData | null {
  return useMemo(() => {
    if (!fullGraph || !focalNodeId) return null;
    if (fullGraph.nodes.length === 0) return null;

    // BFS to find nodes within depth
    const nodeIds = new Set<string>();

    // If focal node doesn't exist in the graph, return null (caller falls back to full graph)
    // Build nodeId set first so we can do O(1) lookup instead of O(N) array scan
    const allNodeIds = new Set(fullGraph.nodes.map(n => n.id));
    if (!allNodeIds.has(focalNodeId)) return null;
    const queue: { id: string; d: number }[] = [{ id: focalNodeId, d: 0 }];
    let queueHead = 0; // O(n) BFS: advance head instead of shift()
    nodeIds.add(focalNodeId);

    // Build adjacency from edges
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

    return extractSubgraph(fullGraph, nodeIds);
  }, [fullGraph, focalNodeId, depth]);
}
