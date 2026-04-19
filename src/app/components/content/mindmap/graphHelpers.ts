// ============================================================
// Axon — Knowledge Graph Helpers
//
// Pure utility functions for the KnowledgeGraph component.
// Extracted to keep KnowledgeGraph.tsx focused on rendering.
// ============================================================

import type { Graph } from '@antv/g6';
import type { GraphData } from '@/app/types/mindmap';
import { MASTERY_HEX, MASTERY_HEX_LIGHT, CONNECTION_TYPE_MAP } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';

// ── Graph color constants ─────────────────────────────────────
export const GRAPH_COLORS = {
  primary: '#2a8c7a',
  primaryDark: '#244e47',
  primaryRgb: '42, 140, 122',
} as const;

// ── Node style helpers ──────────────────────────────────────

export function getNodeFill(masteryColor: MasteryColor): string {
  return MASTERY_HEX_LIGHT[masteryColor] ?? MASTERY_HEX_LIGHT.gray;
}

export function getNodeStroke(masteryColor: MasteryColor): string {
  return MASTERY_HEX[masteryColor] ?? MASTERY_HEX.gray;
}

export function getEdgeColor(connectionType?: string): string {
  if (!connectionType) return '#d1d5db';
  const meta = CONNECTION_TYPE_MAP.get(connectionType);
  return meta?.color || '#d1d5db';
}

// ── HTML escape for tooltip content (prevent XSS) ───────────

export function escHtml(s: string): string {
  const str = String(s ?? '');
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Collapse helpers ─────────────────────────────────────────

/**
 * Build a map of nodeId → direct child node IDs based on directed edges.
 */
export function buildChildrenMap(edges: GraphData['edges']): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (!map.has(edge.source)) map.set(edge.source, []);
    map.get(edge.source)!.push(edge.target);
  }
  return map;
}

/**
 * For a set of collapsed node IDs, compute which nodes should be hidden.
 *
 * Algorithm: BFS forward from each collapsed node through its children.
 * All reachable descendants are candidates for hiding. Then, remove any
 * candidate that is directly reachable from a non-collapsed node without
 * going through a collapsed node (i.e., it has an alternative visible path).
 *
 * Works correctly on DAGs, trees, and cyclic graphs.
 * Note: traversal follows directed edges (source→target) only.
 */
export function computeHiddenNodes(
  nodes: GraphData['nodes'],
  edges: GraphData['edges'],
  collapsedNodes: Set<string>,
  prebuiltChildrenMap?: Map<string, string[]>,
): Set<string> {
  if (collapsedNodes.size === 0) return new Set();

  const cm = prebuiltChildrenMap || buildChildrenMap(edges);

  // Step 1: BFS from each collapsed node to collect all descendants
  const descendants = new Set<string>();
  for (const collapsedId of collapsedNodes) {
    const queue = cm.get(collapsedId) || [];
    let head = 0;
    const localQueue = [...queue];
    while (head < localQueue.length) {
      const id = localQueue[head++];
      if (descendants.has(id) || id === collapsedId) continue;
      descendants.add(id);
      // Continue through children (even through other collapsed nodes)
      for (const child of (cm.get(id) || [])) {
        if (!descendants.has(child) && child !== collapsedId) localQueue.push(child);
      }
    }
  }

  // Step 2: BFS from all non-collapsed, non-descendant nodes to find
  // which descendants are reachable via an alternative (visible) path.
  const nodeIds = new Set(nodes.map(n => n.id));
  const rescued = new Set<string>();
  const seeds = nodes
    .map(n => n.id)
    .filter(id => !collapsedNodes.has(id) && !descendants.has(id));

  const visited = new Set<string>();
  const queue2 = [...seeds];
  let head2 = 0;
  while (head2 < queue2.length) {
    const id = queue2[head2++];
    if (visited.has(id)) continue;
    visited.add(id);
    if (collapsedNodes.has(id)) continue; // don't traverse past collapsed
    for (const child of (cm.get(id) || [])) {
      if (visited.has(child) || !nodeIds.has(child)) continue;
      if (descendants.has(child)) rescued.add(child);
      queue2.push(child);
    }
  }

  // Hidden = descendants that were NOT rescued via alternative paths
  // Also exclude the collapsed nodes themselves (they should remain visible)
  const hidden = new Set<string>();
  for (const id of descendants) {
    if (!rescued.has(id) && !collapsedNodes.has(id)) hidden.add(id);
  }
  return hidden;
}

// ── Shared screen-position helpers ──────────────────────────────

export interface NodeScreenPos {
  id: string;
  x: number;
  y: number;
  size: number;
  /** Optional label — populated by useDragConnect, omitted by useEdgeReconnect */
  label?: string;
}

/**
 * Get screen (client) position of all nodes using G6's coordinate system.
 * Uses getElementRenderBounds for canvas-space coords, then
 * graph.getClientByCanvas to convert to browser client coords.
 * When `includeLabels` is true, each entry includes the node's label string.
 */
export function getNodeScreenPositions(
  graph: Graph,
  includeLabels?: boolean,
): NodeScreenPos[] {
  const positions: NodeScreenPos[] = [];
  try {
    const allNodeData = graph.getNodeData();
    for (const node of allNodeData) {
      const id = String(node.id);
      try {
        const bounds = graph.getElementRenderBounds(id);
        if (bounds) {
          const cx = (bounds.min[0] + bounds.max[0]) / 2;
          const cy = (bounds.min[1] + bounds.max[1]) / 2;
          const size = Math.max(bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1]);
          const clientPt = graph.getClientByCanvas([cx, cy]);
          const entry: NodeScreenPos = { id, x: clientPt[0], y: clientPt[1], size };
          if (includeLabels) {
            entry.label = String(node.data?.fullLabel || node.data?.label || id);
          }
          positions.push(entry);
        }
      } catch (e) { if (import.meta.env.DEV) console.warn("[graphHelpers] Node may not be rendered yet", e); }
    }
  } catch (e) { if (import.meta.env.DEV) console.warn("[graphHelpers] Graph may be destroyed", e); }
  return positions;
}

/**
 * Find the nearest node to a screen position within a radius.
 */
export function findNearestNode(
  positions: NodeScreenPos[],
  x: number,
  y: number,
  radius: number,
  excludeId?: string,
): NodeScreenPos | null {
  let best: NodeScreenPos | null = null;
  let bestDist = radius;
  for (const pos of positions) {
    if (pos.id === excludeId) continue;
    const dx = pos.x - x;
    const dy = pos.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = pos;
    }
  }
  return best;
}

// ── Pointer capture helper ────────────────────────────────────

/**
 * Safely release pointer capture, swallowing the error that fires when the
 * capture was already released (common during fast drag-cancel / unmount).
 */
export function safeReleasePointerCapture(
  el: Element,
  pointerId: number,
  tag: string,
): void {
  try {
    el.releasePointerCapture(pointerId);
  } catch (e) {
    if (import.meta.env.DEV) console.warn(`[${tag}] releasePointerCapture failed`, e);
  }
}
