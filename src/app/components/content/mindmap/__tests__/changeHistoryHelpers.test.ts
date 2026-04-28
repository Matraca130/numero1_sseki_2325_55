// ============================================================
// Tests -- changeHistoryHelpers (pure utility functions)
//
// Tests for entry factories, sessionStorage persistence,
// relative time formatting, and type contracts.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadHistory,
  saveHistory,
  clearHistoryStorage,
  createNodeEntry,
  createEdgeEntry,
  createDeleteNodeEntry,
  createDeleteEdgeEntry,
  formatRelativeTime,
  type HistoryEntry,
  type HistoryActionType,
} from '../changeHistoryHelpers';

// ── Entry Factory Functions ─────────────────────────────────

describe('createNodeEntry', () => {
  it('creates entry with correct type and badge', () => {
    const entry = createNodeEntry('Fotosintesis');
    expect(entry.type).toBe('create-node');
    expect(entry.badge).toBe('Nodo');
    expect(entry.description).toContain('Fotosintesis');
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
  });

  it('generates unique IDs on successive calls', () => {
    const a = createNodeEntry('A');
    const b = createNodeEntry('B');
    expect(a.id).not.toBe(b.id);
  });

  it('includes the label in the description', () => {
    const entry = createNodeEntry('Mitocondria');
    expect(entry.description).toContain("'Mitocondria'");
  });

  it('timestamp is a valid ISO string', () => {
    const entry = createNodeEntry('Test');
    const date = new Date(entry.timestamp);
    expect(date.getTime()).not.toBeNaN();
  });
});

describe('createEdgeEntry', () => {
  it('creates entry with correct type and badge', () => {
    const entry = createEdgeEntry('Heart', 'Lung');
    expect(entry.type).toBe('create-edge');
    expect(entry.badge).toBe('Conexi\u00f3n');
    expect(entry.description).toContain('Heart');
    expect(entry.description).toContain('Lung');
  });
});

describe('createDeleteNodeEntry', () => {
  it('creates entry with delete-node type', () => {
    const entry = createDeleteNodeEntry('Ribosome');
    expect(entry.type).toBe('delete-node');
    expect(entry.badge).toBe('Nodo');
    expect(entry.description).toContain('Ribosome');
  });
});

describe('createDeleteEdgeEntry', () => {
  it('creates entry with delete-edge type', () => {
    const entry = createDeleteEdgeEntry('A', 'B');
    expect(entry.type).toBe('delete-edge');
    expect(entry.badge).toBe('Conexi\u00f3n');
    expect(entry.description).toContain('A');
    expect(entry.description).toContain('B');
  });
});

// ── SessionStorage Persistence ──────────────────────────────

describe('loadHistory / saveHistory / clearHistoryStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns empty array when no history exists', () => {
    expect(loadHistory('topic-1')).toEqual([]);
  });

  it('round-trips entries through save and load', () => {
    const entries: HistoryEntry[] = [
      createNodeEntry('Alpha'),
      createEdgeEntry('A', 'B'),
    ];
    saveHistory('topic-1', entries);
    const loaded = loadHistory('topic-1');
    expect(loaded).toHaveLength(2);
    expect(loaded[0].type).toBe('create-node');
    expect(loaded[1].type).toBe('create-edge');
  });

  it('isolates data by topicId', () => {
    saveHistory('topic-1', [createNodeEntry('A')]);
    saveHistory('topic-2', [createNodeEntry('B'), createNodeEntry('C')]);
    expect(loadHistory('topic-1')).toHaveLength(1);
    expect(loadHistory('topic-2')).toHaveLength(2);
    expect(loadHistory('topic-3')).toHaveLength(0);
  });

  it('clearHistoryStorage removes entries for a topic', () => {
    saveHistory('topic-1', [createNodeEntry('A')]);
    clearHistoryStorage('topic-1');
    expect(loadHistory('topic-1')).toEqual([]);
  });

  it('clearHistoryStorage does not affect other topics', () => {
    saveHistory('topic-1', [createNodeEntry('A')]);
    saveHistory('topic-2', [createNodeEntry('B')]);
    clearHistoryStorage('topic-1');
    expect(loadHistory('topic-2')).toHaveLength(1);
  });

  it('handles corrupted JSON gracefully', () => {
    sessionStorage.setItem('axon_map_history_topic-bad', '{invalid json');
    expect(loadHistory('topic-bad')).toEqual([]);
  });
});

// ── formatRelativeTime ──────────────────────────────────────

describe('formatRelativeTime', () => {
  it('returns "hace un momento" for timestamps less than 1 minute ago', () => {
    const now = new Date();
    expect(formatRelativeTime(now.toISOString())).toBe('hace un momento');
  });

  it('returns "hace X min" for timestamps less than 60 minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeTime(fiveMinAgo.toISOString())).toBe('hace 5 min');
  });

  it('returns "hace 59 min" for timestamps just under 60 minutes ago', () => {
    const almostHour = new Date(Date.now() - 59 * 60_000);
    expect(formatRelativeTime(almostHour.toISOString())).toBe('hace 59 min');
  });

  it('returns "hoy HH:MM" for timestamps earlier today (>60min ago)', () => {
    // Create a timestamp 2 hours ago but still today
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000);
    const now = new Date();
    // Only test if still same day
    if (twoHoursAgo.getDate() === now.getDate()) {
      const result = formatRelativeTime(twoHoursAgo.toISOString());
      expect(result).toMatch(/^hoy \d{2}:\d{2}$/);
    }
  });

  it('returns "DD/MM HH:MM" for timestamps from previous days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000);
    const result = formatRelativeTime(threeDaysAgo.toISOString());
    // Day/month may be 1 or 2 digits depending on locale formatting
    expect(result).toMatch(/\d{1,2}\/\d{1,2} \d{2}:\d{2}/);
  });

  it('returns the raw string for invalid date inputs', () => {
    expect(formatRelativeTime('not-a-date')).toBe('not-a-date');
    expect(formatRelativeTime('')).toBe('');
    expect(formatRelativeTime('2026-99-99')).toBe('2026-99-99');
  });

  it('does not throw for garbage input', () => {
    expect(() => formatRelativeTime('garbage')).not.toThrow();
    expect(() => formatRelativeTime('undefined')).not.toThrow();
  });
});

// ── MAX_HISTORY_ENTRIES cap ────────────────────────────────

describe('saveHistory MAX_HISTORY_ENTRIES cap (100)', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('caps at 100 entries via slice(-100), keeping the MOST RECENT', () => {
    const entries: HistoryEntry[] = Array.from({ length: 150 }, (_, i) => ({
      id: `id-${i}`,
      type: 'create-node' as HistoryActionType,
      description: `Entry ${i}`,
      timestamp: new Date(2026, 0, 1, 0, 0, i).toISOString(),
      badge: 'Nodo' as const,
    }));
    saveHistory('topic-cap', entries);
    const loaded = loadHistory('topic-cap');
    expect(loaded).toHaveLength(100);
    // First retained should be id-50 (oldest of the kept 100), last id-149
    expect(loaded[0].id).toBe('id-50');
    expect(loaded[loaded.length - 1].id).toBe('id-149');
  });

  it('does NOT truncate when entries.length === 100 (boundary)', () => {
    const entries: HistoryEntry[] = Array.from({ length: 100 }, (_, i) => ({
      id: `id-${i}`,
      type: 'create-node' as HistoryActionType,
      description: `Entry ${i}`,
      timestamp: new Date().toISOString(),
      badge: 'Nodo' as const,
    }));
    saveHistory('topic-100', entries);
    expect(loadHistory('topic-100')).toHaveLength(100);
  });

  it('does NOT truncate when entries.length < 100', () => {
    const entries: HistoryEntry[] = Array.from({ length: 7 }, (_, i) => createNodeEntry(`Node-${i}`));
    saveHistory('topic-small', entries);
    expect(loadHistory('topic-small')).toHaveLength(7);
  });
});

// ── isValidEntry filtering on load ─────────────────────────

describe('loadHistory: invalid-entry filtering', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('drops items missing required fields, keeps valid ones', () => {
    const valid = createNodeEntry('Valid');
    sessionStorage.setItem(
      'axon_map_history_topic-mixed',
      JSON.stringify([
        valid,
        { id: 'broken', type: 'create-node' }, // missing description and timestamp
        null,
        'string-not-object',
        { id: 1, type: 'create-node', description: 'd', timestamp: 't' }, // id wrong type
      ]),
    );
    const loaded = loadHistory('topic-mixed');
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(valid.id);
  });

  it('returns [] when stored value is not an array (e.g. object)', () => {
    sessionStorage.setItem('axon_map_history_topic-obj', JSON.stringify({ not: 'an-array' }));
    expect(loadHistory('topic-obj')).toEqual([]);
  });

  it('returns [] when stored value is a primitive (e.g. number)', () => {
    sessionStorage.setItem('axon_map_history_topic-num', '42');
    expect(loadHistory('topic-num')).toEqual([]);
  });

  it('returns [] when stored value is null', () => {
    sessionStorage.setItem('axon_map_history_topic-null', 'null');
    expect(loadHistory('topic-null')).toEqual([]);
  });
});

// ── Storage key format ─────────────────────────────────────

describe('Storage key prefix', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('uses the literal "axon_map_history_<topicId>" key', () => {
    saveHistory('xyz-123', [createNodeEntry('A')]);
    expect(sessionStorage.getItem('axon_map_history_xyz-123')).not.toBeNull();
  });

  it('does NOT collide with similarly-named topic ids', () => {
    saveHistory('topic-1', [createNodeEntry('A')]);
    saveHistory('topic-12', [createNodeEntry('B'), createNodeEntry('C')]);
    expect(loadHistory('topic-1')).toHaveLength(1);
    expect(loadHistory('topic-12')).toHaveLength(2);
  });
});

// ── Entry ID format ────────────────────────────────────────

describe('Entry id format', () => {
  it('begins with "h_" and contains a numeric timestamp + random suffix', () => {
    const entry = createNodeEntry('Test');
    expect(entry.id).toMatch(/^h_\d+_[0-9a-z]{1,5}$/);
  });

  it('embeds Date.now() (millisecond timestamp)', () => {
    const before = Date.now();
    const entry = createNodeEntry('T');
    const after = Date.now();
    const ts = parseInt(entry.id.split('_')[1], 10);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('100 entries generated in a tight loop are all unique', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) ids.add(createNodeEntry('X').id);
    expect(ids.size).toBe(100);
  });
});

// ── Description string format (Spanish, single quotes around label) ──

describe('Description Spanish formatting', () => {
  it('createNodeEntry uses "Creaste el concepto \'<label>\'"', () => {
    expect(createNodeEntry('Mitosis').description).toBe("Creaste el concepto 'Mitosis'");
  });

  it('createDeleteNodeEntry uses "Eliminaste el concepto \'<label>\'"', () => {
    expect(createDeleteNodeEntry('Apoptosis').description).toBe("Eliminaste el concepto 'Apoptosis'");
  });

  it('createEdgeEntry uses "Conectaste \'<src>\' → \'<tgt>\'"', () => {
    expect(createEdgeEntry('A', 'B').description).toBe("Conectaste 'A' → 'B'");
  });

  it('createDeleteEdgeEntry uses "Desconectaste \'<src>\' → \'<tgt>\'"', () => {
    expect(createDeleteEdgeEntry('A', 'B').description).toBe("Desconectaste 'A' → 'B'");
  });

  it('handles labels with special characters without escaping', () => {
    const entry = createNodeEntry('Foo & Bar <test>');
    expect(entry.description).toContain("'Foo & Bar <test>'");
  });
});

// ── formatRelativeTime boundary cases ──────────────────────

describe('formatRelativeTime boundary cases', () => {
  it('exactly 60 min ago → "hoy HH:MM" (passes the < 60 threshold)', () => {
    const sixtyMinAgo = new Date(Date.now() - 60 * 60_000);
    const result = formatRelativeTime(sixtyMinAgo.toISOString());
    // Must match "hoy" pattern OR DD/MM if it crossed midnight
    expect(result).toMatch(/^(hoy|\d{1,2}\/\d{1,2})\s\d{2}:\d{2}$/);
  });

  it('exactly 1 min ago → "hace 1 min"', () => {
    const oneMinAgo = new Date(Date.now() - 60_000);
    expect(formatRelativeTime(oneMinAgo.toISOString())).toBe('hace 1 min');
  });

  it('uses 24-hour format (hour12: false)', () => {
    // Result for 14:30 should appear as 14:30, not 02:30 PM
    const fourteenThirty = new Date();
    fourteenThirty.setHours(14, 30, 0, 0);
    fourteenThirty.setMinutes(fourteenThirty.getMinutes() - 90); // 1.5h ago
    const result = formatRelativeTime(fourteenThirty.toISOString());
    // Must NOT contain AM/PM markers
    expect(result.toLowerCase()).not.toContain('am');
    expect(result.toLowerCase()).not.toContain('pm');
  });

  it('floors fractional minutes (4.7 min → "hace 4 min")', () => {
    const fractionalAgo = new Date(Date.now() - (4 * 60_000 + 42_000));
    expect(formatRelativeTime(fractionalAgo.toISOString())).toBe('hace 4 min');
  });

  it('future timestamps (negative diff) read as "hace un momento" (diffMin < 1)', () => {
    const future = new Date(Date.now() + 5_000); // 5s in future → diffMs negative
    expect(formatRelativeTime(future.toISOString())).toBe('hace un momento');
  });

  it('NaN-yielding inputs (Invalid Date) return raw string verbatim', () => {
    expect(formatRelativeTime('xxx')).toBe('xxx');
    expect(formatRelativeTime('1999-13-32')).toBe('1999-13-32');
  });
});

// ── Failure-mode silence (sessionStorage exceptions) ───────

describe('Storage write/clear silent on failure', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('saveHistory does not throw when sessionStorage.setItem rejects', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => { throw new DOMException('quota'); });
    try {
      expect(() => saveHistory('any', [createNodeEntry('X')])).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it('clearHistoryStorage does not throw when removeItem rejects', () => {
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = vi.fn(() => { throw new DOMException('blocked'); });
    try {
      expect(() => clearHistoryStorage('any')).not.toThrow();
    } finally {
      Storage.prototype.removeItem = original;
    }
  });

  it('loadHistory does not throw when getItem rejects (returns [])', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = vi.fn(() => { throw new DOMException('blocked'); });
    try {
      expect(loadHistory('any')).toEqual([]);
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

// ── Type contract (HistoryActionType union) ────────────────

describe('HistoryActionType union contract', () => {
  it('all 4 action types are constructible and round-trip through the factories', () => {
    const types: HistoryActionType[] = [
      createNodeEntry('A').type,
      createEdgeEntry('A', 'B').type,
      createDeleteNodeEntry('A').type,
      createDeleteEdgeEntry('A', 'B').type,
    ];
    expect(new Set(types)).toEqual(new Set(['create-node', 'create-edge', 'delete-node', 'delete-edge']));
  });

  it('badge is "Nodo" for node actions, "Conexión" for edge actions', () => {
    expect(createNodeEntry('A').badge).toBe('Nodo');
    expect(createDeleteNodeEntry('A').badge).toBe('Nodo');
    expect(createEdgeEntry('A', 'B').badge).toBe('Conexión');
    expect(createDeleteEdgeEntry('A', 'B').badge).toBe('Conexión');
  });
});
