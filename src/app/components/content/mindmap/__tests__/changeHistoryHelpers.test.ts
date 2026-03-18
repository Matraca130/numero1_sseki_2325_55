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
});
