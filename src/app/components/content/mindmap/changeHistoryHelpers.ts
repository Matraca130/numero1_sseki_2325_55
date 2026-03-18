// ============================================================
// Axon — Change History Helpers
//
// Types, sessionStorage persistence, entry factory functions,
// and relative-time formatting for the ChangeHistoryPanel.
//
// LANG: Spanish
// ============================================================

// ── Types ────────────────────────────────────────────────────

export type HistoryActionType =
  | 'create-node'
  | 'create-edge'
  | 'delete-node'
  | 'delete-edge';

export interface HistoryEntry {
  id: string;
  type: HistoryActionType;
  /** Human-readable description, e.g. "Creaste el concepto 'Fotosintesis'" */
  description: string;
  /** ISO timestamp */
  timestamp: string;
  /** Short label: "Nodo" | "Conexion" */
  badge: 'Nodo' | 'Conexión';
}

// ── SessionStorage persistence ───────────────────────────────

const STORAGE_PREFIX = 'axon_map_history_';

function storageKey(topicId: string): string {
  return `${STORAGE_PREFIX}${topicId}`;
}

/** Load history entries from sessionStorage */
export function loadHistory(topicId: string): HistoryEntry[] {
  try {
    const raw = sessionStorage.getItem(storageKey(topicId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const MAX_HISTORY_ENTRIES = 100;

/** Save history entries to sessionStorage (capped at 100 entries) */
export function saveHistory(topicId: string, entries: HistoryEntry[]): void {
  try {
    const capped = entries.length > MAX_HISTORY_ENTRIES
      ? entries.slice(-MAX_HISTORY_ENTRIES)
      : entries;
    sessionStorage.setItem(storageKey(topicId), JSON.stringify(capped));
  } catch {
    // sessionStorage full or blocked — silently ignore
  }
}

/** Clear history from sessionStorage */
export function clearHistoryStorage(topicId: string): void {
  try {
    sessionStorage.removeItem(storageKey(topicId));
  } catch {
    // silently ignore
  }
}

// ── Entry factory functions ──────────────────────────────────

function makeId(): string {
  return `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Create a new HistoryEntry for a node creation */
export function createNodeEntry(label: string): HistoryEntry {
  return {
    id: makeId(),
    type: 'create-node',
    description: `Creaste el concepto '${label}'`,
    timestamp: new Date().toISOString(),
    badge: 'Nodo',
  };
}

/** Create a new HistoryEntry for an edge creation */
export function createEdgeEntry(sourceLabel: string, targetLabel: string): HistoryEntry {
  return {
    id: makeId(),
    type: 'create-edge',
    description: `Conectaste '${sourceLabel}' → '${targetLabel}'`,
    timestamp: new Date().toISOString(),
    badge: 'Conexión',
  };
}

/** Create a new HistoryEntry for a node deletion */
export function createDeleteNodeEntry(label: string): HistoryEntry {
  return {
    id: makeId(),
    type: 'delete-node',
    description: `Eliminaste el concepto '${label}'`,
    timestamp: new Date().toISOString(),
    badge: 'Nodo',
  };
}

/** Create a new HistoryEntry for an edge deletion */
export function createDeleteEdgeEntry(sourceLabel: string, targetLabel: string): HistoryEntry {
  return {
    id: makeId(),
    type: 'delete-edge',
    description: `Desconectaste '${sourceLabel}' → '${targetLabel}'`,
    timestamp: new Date().toISOString(),
    badge: 'Conexión',
  };
}

// ── Relative time formatting ─────────────────────────────────

/**
 * Format a timestamp into a relative Spanish string.
 *   - < 1 min  → "hace un momento"
 *   - < 60 min → "hace X min"
 *   - < 24 h   → "hoy HH:MM"
 *   - else     → "DD/MM HH:MM"
 */
export function formatRelativeTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  const timeStr = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return `hoy ${timeStr}`;
  }

  const dayMonth = date.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
  return `${dayMonth} ${timeStr}`;
}
