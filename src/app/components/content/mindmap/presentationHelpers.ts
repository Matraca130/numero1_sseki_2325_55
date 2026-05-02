// ============================================================
// Axon — Presentation Mode Helpers
//
// Sorting and utility functions for the presentation overlay.
// ============================================================

import type { MapNode, MapEdge } from '@/app/types/mindmap';

/** Responsive font sizes for presentation cards */
export const presentationFontSize = {
  label: 'clamp(1.5rem, 3vw, 2rem)',
  definition: 'clamp(0.875rem, 1.5vw, 1.125rem)',
  index: 'clamp(0.75rem, 1.2vw, 0.875rem)',
  mastery: 'clamp(0.6875rem, 1vw, 0.8125rem)',
} as const;

/** Format mastery as percentage string */
export function masteryPercent(mastery: number): string {
  if (mastery < 0) return '\u2014';
  return `${Math.round(mastery * 100)}%`;
}

/**
 * Sort nodes in topological order: roots first (nodes that are never a target),
 * then breadth-first traversal. Ties broken alphabetically.
 */
export function topologicalSort(nodes: MapNode[], edges: MapEdge[]): MapNode[] {
  if (nodes.length === 0) return [];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    children.set(n.id, []);
    inDegree.set(n.id, 0);
  }

  for (const e of edges) {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      children.get(e.source)!.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  }

  let roots = nodes
    .filter(n => (inDegree.get(n.id) || 0) === 0)
    .sort((a, b) => a.label.localeCompare(b.label));

  // If all nodes have incoming edges (cycle), pick the node(s) with the lowest in-degree as synthetic roots
  if (roots.length === 0 && nodes.length > 0) {
    const minDeg = Math.min(...nodes.map(n => inDegree.get(n.id) || 0));
    roots = nodes
      .filter(n => (inDegree.get(n.id) || 0) === minDeg)
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  const visited = new Set<string>();
  const result: MapNode[] = [];
  const queue = [...roots];
  let head = 0;

  while (head < queue.length) {
    const node = queue[head++];
    if (visited.has(node.id)) continue;
    visited.add(node.id);
    result.push(node);

    const kids = (children.get(node.id) || [])
      .map(id => nodeMap.get(id)!)
      .filter(n => n && !visited.has(n.id))
      .sort((a, b) => a.label.localeCompare(b.label));

    queue.push(...kids);
  }

  // Add any remaining disconnected nodes
  for (const n of nodes) {
    if (!visited.has(n.id)) {
      result.push(n);
    }
  }

  return result;
}

/** Slide direction type for card transitions */
export type SlideDir = 'left' | 'right';

/** Framer Motion variants for slide transitions */
export const slideVariants = {
  enter: (dir: SlideDir) => ({
    x: dir === 'right' ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: SlideDir) => ({
    x: dir === 'right' ? -80 : 80,
    opacity: 0,
  }),
};
