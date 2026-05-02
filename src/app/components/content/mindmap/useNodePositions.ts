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

import { safeGetJSON, safeSetJSON, safeGetItem, safeSetItem, safeRemoveItem } from './storageHelpers';

const STORAGE_PREFIX = 'axon_node_pos_';
const COMBO_STORAGE_PREFIX = 'axon_combos_';
const TOPIC_INDEX_KEY = 'axon_node_pos_index';
const MAX_POSITIONS = 500;
const MAX_TOPICS = 50;

/** Track topic access order and evict oldest keys when over MAX_TOPICS */
function touchTopicIndex(topicId: string): void {
  const parsed = safeGetJSON(TOPIC_INDEX_KEY);
  const ids: string[] = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  const filtered = ids.filter(id => id !== topicId);
  filtered.push(topicId);
  while (filtered.length > MAX_TOPICS) {
    const evicted = filtered.shift()!;
    safeRemoveItem(STORAGE_PREFIX + evicted);
    safeRemoveItem(COMBO_STORAGE_PREFIX + evicted);
  }
  safeSetJSON(TOPIC_INDEX_KEY, filtered);
}

export interface NodePosition {
  x: number;
  y: number;
}

export type PositionMap = Map<string, NodePosition>;

/** Load saved node positions for a topic (validates each entry) */
export function loadPositions(topicId: string): PositionMap {
  const obj = safeGetJSON(STORAGE_PREFIX + topicId);
  const map = new Map<string, NodePosition>();
  if (!obj || typeof obj !== 'object') return map;
  for (const [id, val] of Object.entries(obj as Record<string, unknown>)) {
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
      safeSetJSON(STORAGE_PREFIX + topicId, Object.fromEntries(trimmed));
    } else {
      safeSetJSON(STORAGE_PREFIX + topicId, Object.fromEntries(existing));
    }
  } catch {
    // Belt-and-suspenders: safeSetJSON already swallows storage errors,
    // but Array.from / new Map / Object.fromEntries could in principle
    // throw on pathological inputs. Preserve the original silent-failure
    // contract.
  }
}

/** Clear saved positions and combos for a topic */
export function clearPositions(topicId: string): void {
  safeRemoveItem(STORAGE_PREFIX + topicId);
  safeRemoveItem(COMBO_STORAGE_PREFIX + topicId);
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
  const arr = safeGetJSON(COMBO_STORAGE_PREFIX + topicId);
  if (!Array.isArray(arr)) return [];
  return arr.filter((item): item is PersistedCombo =>
    !!item && typeof item === 'object' &&
    'id' in item && typeof (item as PersistedCombo).id === 'string' &&
    'label' in item && typeof (item as PersistedCombo).label === 'string' &&
    'nodeIds' in item && Array.isArray((item as PersistedCombo).nodeIds)
  );
}

/** Save combos for a topic */
export function saveCombos(topicId: string, combos: PersistedCombo[]): void {
  touchTopicIndex(topicId);
  if (combos.length === 0) {
    safeRemoveItem(COMBO_STORAGE_PREFIX + topicId);
  } else {
    safeSetJSON(COMBO_STORAGE_PREFIX + topicId, combos);
  }
}

// ── Grid Toggle Persistence ─────────────────────────────────
//
// Stores a single '1'/'0' scalar (not JSON). Now uses the
// safeGetItem / safeSetItem helpers from ./storageHelpers
// (added in cycle 59 once 10 scalar callsites materialized
// across the mindmap tree).

const GRID_STORAGE_KEY = 'axon_grid_enabled';

/** Load grid enabled state */
export function loadGridEnabled(): boolean {
  return safeGetItem(GRID_STORAGE_KEY) === '1';
}

/** Save grid enabled state */
export function saveGridEnabled(enabled: boolean): void {
  safeSetItem(GRID_STORAGE_KEY, enabled ? '1' : '0');
}
