// ============================================================
// Axon — useNodeColors
//
// Persists user-assigned custom node colors in localStorage.
// Keyed by topicId so each graph has its own color overrides.
// Only applies to user-created nodes.
//
// Storage format: { [nodeId]: hexColor }
// ============================================================

import { safeGetJSON, safeSetJSON, safeRemoveItem } from './storageHelpers';

const STORAGE_PREFIX = 'axon_node_colors_';
const MAX_COLORS = 200;

/**
 * Hex color allowlist (3-8 hex chars after `#`).
 * Cycle 56: extracted from inline duplicates at the read- and write-paths.
 * NOTE: still permits non-CSS lengths 5 and 7; tightening to {3,4,6,8} would
 * be a behavior change — deferred until a cycle that audits all callers.
 */
const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

export type NodeColorMap = Map<string, string>;

/** Load saved custom node colors for a topic */
export function loadNodeColors(topicId: string): NodeColorMap {
  const obj = safeGetJSON(STORAGE_PREFIX + topicId);
  const map = new Map<string, string>();
  if (!obj || typeof obj !== 'object') return map;
  for (const [id, val] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof val === 'string' && HEX_COLOR_RE.test(val)) {
      map.set(id, val);
    }
  }
  return map;
}

/** Save a custom color for a node (merges with existing) */
export function saveNodeColor(topicId: string, nodeId: string, color: string): void {
  if (!HEX_COLOR_RE.test(color)) return; // reject non-hex colors
  const existing = loadNodeColors(topicId);
  // Delete + re-set to move to end of insertion order (LRU)
  existing.delete(nodeId);
  existing.set(nodeId, color);
  // Evict oldest entries if over limit
  if (existing.size > MAX_COLORS) {
    const entries = Array.from(existing.entries()).slice(-MAX_COLORS);
    safeSetJSON(STORAGE_PREFIX + topicId, Object.fromEntries(entries));
  } else {
    safeSetJSON(STORAGE_PREFIX + topicId, Object.fromEntries(existing));
  }
}

/** Remove a custom color for a node */
export function removeNodeColor(topicId: string, nodeId: string): void {
  const existing = loadNodeColors(topicId);
  existing.delete(nodeId);
  if (existing.size === 0) {
    safeRemoveItem(STORAGE_PREFIX + topicId);
  } else {
    safeSetJSON(STORAGE_PREFIX + topicId, Object.fromEntries(existing));
  }
}

/** Node color palette — 6 swatches for user-created nodes */
export const NODE_COLOR_PALETTE = [
  { hex: '#2a8c7a', label: 'Turquesa' },
  { hex: '#ef4444', label: 'Rojo' },
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#8b5cf6', label: 'Morado' },
  { hex: '#f97316', label: 'Naranja' },
  { hex: '#ec4899', label: 'Rosa' },
] as const;

/** Light fill versions of the palette colors */
export const NODE_COLOR_FILL: Record<string, string> = {
  '#2a8c7a': '#e8f5f1',
  '#ef4444': '#fee2e2',
  '#3b82f6': '#dbeafe',
  '#8b5cf6': '#ede9fe',
  '#f97316': '#fff7ed',
  '#ec4899': '#fce7f3',
};
