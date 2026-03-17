// ============================================================
// Axon — Knowledge Graph Helpers
//
// Pure utility functions for the KnowledgeGraph component.
// Extracted to keep KnowledgeGraph.tsx focused on rendering.
// ============================================================

import type { GraphData } from '@/app/types/mindmap';
import { MASTERY_HEX, MASTERY_HEX_LIGHT, CONNECTION_TYPE_MAP } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';

// ── Node style helpers ──────────────────────────────────────

export function getNodeFill(masteryColor: MasteryColor): string {
  return MASTERY_HEX_LIGHT[masteryColor];
}

export function getNodeStroke(masteryColor: MasteryColor): string {
  return MASTERY_HEX[masteryColor];
}

export function getEdgeColor(connectionType?: string): string {
  if (!connectionType) return '#d1d5db';
  const meta = CONNECTION_TYPE_MAP.get(connectionType);
  return meta?.color || '#d1d5db';
}

// ── HTML escape for tooltip content (prevent XSS) ───────────

export function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
 * BFS from root nodes; stop traversal at collapsed nodes so their
 * descendants never enter the visible set.
 */
export function computeHiddenNodes(
  nodes: GraphData['nodes'],
  edges: GraphData['edges'],
  collapsedNodes: Set<string>,
  prebuiltChildrenMap?: Map<string, string[]>,
): Set<string> {
  if (collapsedNodes.size === 0) return new Set();

  const cm = prebuiltChildrenMap || buildChildrenMap(edges);

  // Root nodes: no incoming edges
  const hasIncoming = new Set<string>();
  for (const edge of edges) hasIncoming.add(edge.target);
  const roots = nodes.map(n => n.id).filter(id => !hasIncoming.has(id));
  const seeds = roots.length > 0 ? roots : nodes.map(n => n.id);

  const visible = new Set<string>();
  const queue = [...seeds];
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    if (visible.has(id)) continue;
    visible.add(id);
    // Do not traverse beyond collapsed nodes
    if (collapsedNodes.has(id)) continue;
    for (const child of (cm.get(id) || [])) {
      if (!visible.has(child)) queue.push(child);
    }
  }

  const hidden = new Set<string>();
  for (const node of nodes) {
    if (!visible.has(node.id)) hidden.add(node.id);
  }
  return hidden;
}
