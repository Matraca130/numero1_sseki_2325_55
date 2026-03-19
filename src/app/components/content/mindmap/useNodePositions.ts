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
const COMBO_STORAGE_PREFIX = 'axon_combos_';
const TOPIC_INDEX_KEY = 'axon_node_pos_index';
const MAX_POSITIONS = 500;
const MAX_TOPICS = 50;

/** Track topic access order and evict oldest keys when over MAX_TOPICS */
function touchTopicIndex(topicId: string): void {
  try {
    const raw = localStorage.getItem(TOPIC_INDEX_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const filtered = ids.filter(id => id !== topicId);
    filtered.push(topicId);
    while (filtered.length > MAX_TOPICS) {
      const evicted = filtered.shift()!;
      localStorage.removeItem(STORAGE_PREFIX + evicted);
      localStorage.removeItem(COMBO_STORAGE_PREFIX + evicted);
    }
    localStorage.setItem(TOPIC_INDEX_KEY, JSON.stringify(filtered));
  } catch { /* ignore */ }
}

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
    touchTopicIndex(topicId);
    let existing: Map<string, NodePosition>;
    if (memoryCache && memoryCache.topicId === topicId) {
      existing = memoryCache.map;
    } else {
      existing = loadPositions(topicId);
      memoryCache = { topicId, map: existing };
    }
    // Delete + re-set to move to end of insertion order (LRU eviction)
    existing.delete(nodeId);
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

/** Clear saved positions and combos for a topic */
export function clearPositions(topicId: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + topicId);
    localStorage.removeItem(COMBO_STORAGE_PREFIX + topicId);
  } catch {
    // Silently ignore
  }
  if (memoryCache?.topicId === topicId) memoryCache = null;
}

// ── Combo (Group) Persistence ───────────────────────────────

export interface PersistedCombo {
  id: string;
  label: string;
  nodeIds: string[];
  collapsed: boolean;
}

/** Load saved combos for a topic */
export function loadCombos(topicId: string): PersistedCombo[] {
  try {
    const raw = localStorage.getItem(COMBO_STORAGE_PREFIX + topicId);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown[];
    return arr.filter((item): item is PersistedCombo =>
      !!item && typeof item === 'object' &&
      'id' in item && typeof (item as PersistedCombo).id === 'string' &&
      'label' in item && typeof (item as PersistedCombo).label === 'string' &&
      'nodeIds' in item && Array.isArray((item as PersistedCombo).nodeIds)
    );
  } catch {
    return [];
  }
}

/** Save combos for a topic */
export function saveCombos(topicId: string, combos: PersistedCombo[]): void {
  try {
    touchTopicIndex(topicId);
    if (combos.length === 0) {
      localStorage.removeItem(COMBO_STORAGE_PREFIX + topicId);
    } else {
      localStorage.setItem(COMBO_STORAGE_PREFIX + topicId, JSON.stringify(combos));
    }
  } catch {
    // localStorage full or unavailable
  }
}

// ── Grid Toggle Persistence ─────────────────────────────────

const GRID_STORAGE_KEY = 'axon_grid_enabled';

/** Load grid enabled state */
export function loadGridEnabled(): boolean {
  try {
    return localStorage.getItem(GRID_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Save grid enabled state */
export function saveGridEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(GRID_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Silently ignore
  }
}
