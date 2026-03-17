// ============================================================
// Axon — useNodePositions
//
// Persists user-dragged node positions in localStorage.
// Keyed by topicId so each graph has its own saved layout.
// Positions are saved on drag-end and loaded on graph init.
//
// Storage format: { [nodeId]: { x, y } }
// Max 500 positions per topic to avoid localStorage bloat.
// ============================================================

const STORAGE_PREFIX = 'axon_node_pos_';
const MAX_POSITIONS = 500;

export interface NodePosition {
  x: number;
  y: number;
}

export type PositionMap = Map<string, NodePosition>;

/** Load saved node positions for a topic (validates each entry) */
export function loadPositions(topicId: string): PositionMap {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + topicId);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const map = new Map<string, NodePosition>();
    for (const [id, val] of Object.entries(obj)) {
      if (
        val && typeof val === 'object' &&
        'x' in val && 'y' in val &&
        typeof (val as NodePosition).x === 'number' && Number.isFinite((val as NodePosition).x) &&
        typeof (val as NodePosition).y === 'number' && Number.isFinite((val as NodePosition).y)
      ) {
        map.set(id, { x: (val as NodePosition).x, y: (val as NodePosition).y });
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

// In-memory cache to avoid repeated JSON.parse on rapid drag-end events
let memoryCache: { topicId: string; map: Map<string, NodePosition> } | null = null;

/** Save a single node position (merges with existing) */
export function saveNodePosition(topicId: string, nodeId: string, pos: NodePosition): void {
  try {
    let existing: Map<string, NodePosition>;
    if (memoryCache && memoryCache.topicId === topicId) {
      existing = memoryCache.map;
    } else {
      existing = loadPositions(topicId);
      memoryCache = { topicId, map: existing };
    }
    existing.set(nodeId, pos);

    // Evict oldest entries if over limit
    if (existing.size > MAX_POSITIONS) {
      const entries = Array.from(existing.entries());
      const trimmed = entries.slice(-MAX_POSITIONS);
      const map = new Map(trimmed);
      memoryCache = { topicId, map };
      localStorage.setItem(STORAGE_PREFIX + topicId, JSON.stringify(Object.fromEntries(trimmed)));
    } else {
      localStorage.setItem(STORAGE_PREFIX + topicId, JSON.stringify(Object.fromEntries(existing)));
    }
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/** Clear saved positions for a topic */
export function clearPositions(topicId: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + topicId);
  } catch {
    // Silently ignore
  }
  if (memoryCache?.topicId === topicId) memoryCache = null;
}
