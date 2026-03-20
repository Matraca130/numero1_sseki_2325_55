// ============================================================
// Axon — useNodeColors
//
// Persists user-assigned custom node colors in localStorage.
// Keyed by topicId so each graph has its own color overrides.
// Only applies to user-created nodes.
//
// Storage format: { [nodeId]: hexColor }
// ============================================================

const STORAGE_PREFIX = 'axon_node_colors_';

export type NodeColorMap = Map<string, string>;

/** Load saved custom node colors for a topic */
export function loadNodeColors(topicId: string): NodeColorMap {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + topicId);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const map = new Map<string, string>();
    for (const [id, val] of Object.entries(obj)) {
      if (typeof val === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(val)) {
        map.set(id, val);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Save a custom color for a node (merges with existing) */
export function saveNodeColor(topicId: string, nodeId: string, color: string): void {
  if (!/^#[0-9a-fA-F]{3,8}$/.test(color)) return; // reject non-hex colors
  try {
    const existing = loadNodeColors(topicId);
    existing.set(nodeId, color);
    localStorage.setItem(
      STORAGE_PREFIX + topicId,
      JSON.stringify(Object.fromEntries(existing)),
    );
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/** Remove a custom color for a node */
export function removeNodeColor(topicId: string, nodeId: string): void {
  try {
    const existing = loadNodeColors(topicId);
    existing.delete(nodeId);
    if (existing.size === 0) {
      localStorage.removeItem(STORAGE_PREFIX + topicId);
    } else {
      localStorage.setItem(
        STORAGE_PREFIX + topicId,
        JSON.stringify(Object.fromEntries(existing)),
      );
    }
  } catch {
    // Silently ignore
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
