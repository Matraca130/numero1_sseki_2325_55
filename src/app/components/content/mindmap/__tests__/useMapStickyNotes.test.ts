// ============================================================
// Tests -- useMapStickyNotes (hook wrapper for sticky notes state)
//
// Tests the hook that manages sticky notes per topic:
// initial load, add/update/delete operations, max-10 limit
// with toast.error, and empty topicId short-circuit.
//
// The underlying persistence (loadStickyNotes, saveStickyNotes,
// createStickyNote) is already tested in sticky-notes.test.ts.
// This file focuses on the hook's React integration.
//
// Uses renderHook from @testing-library/react.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── localStorage mock ──────────────────────────────────────────

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ── Mock crypto.randomUUID ─────────────────────────────────────

let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});

// ── Mock sonner toast ──────────────────────────────────────────

const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

import { useMapStickyNotes } from '../useMapStickyNotes';
import type { StickyNoteData } from '../StickyNote';

// ── Helpers ─────────────────────────────────────────────────────

function resetStore() {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
  uuidCounter = 0;
}

function makeStickyNote(overrides: Partial<StickyNoteData> = {}): StickyNoteData {
  return {
    id: `note-${++uuidCounter}`,
    text: 'Test note',
    color: '#fef3c7',
    x: 100,
    y: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function seedNotes(topicId: string, notes: StickyNoteData[]) {
  store[`axon_sticky_notes_${topicId}`] = JSON.stringify(notes);
}

// ── Initial state ────────────────────────────────────────────

describe('useMapStickyNotes: initial state', () => {
  beforeEach(resetStore);

  it('starts with empty array when no stored notes', () => {
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));
    expect(result.current.stickyNotes).toEqual([]);
  });

  it('loads stored notes on mount', () => {
    const notes = [makeStickyNote({ id: 'n1' }), makeStickyNote({ id: 'n2' })];
    seedNotes('topic-1', notes);
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));
    expect(result.current.stickyNotes).toHaveLength(2);
    expect(result.current.stickyNotes[0].id).toBe('n1');
  });

  it('returns empty array when topicId is empty string', () => {
    const { result } = renderHook(() => useMapStickyNotes(''));
    expect(result.current.stickyNotes).toEqual([]);
  });
});

// ── Topic change ─────────────────────────────────────────────

describe('useMapStickyNotes: topic change', () => {
  beforeEach(resetStore);

  it('reloads notes when topicId changes', () => {
    seedNotes('t1', [makeStickyNote({ id: 'a' })]);
    seedNotes('t2', [makeStickyNote({ id: 'b' }), makeStickyNote({ id: 'c' })]);

    const { result, rerender } = renderHook(
      ({ topicId }) => useMapStickyNotes(topicId),
      { initialProps: { topicId: 't1' } },
    );
    expect(result.current.stickyNotes).toHaveLength(1);

    rerender({ topicId: 't2' });
    expect(result.current.stickyNotes).toHaveLength(2);
  });

  it('clears notes when topicId becomes empty', () => {
    seedNotes('t1', [makeStickyNote({ id: 'a' })]);

    const { result, rerender } = renderHook(
      ({ topicId }) => useMapStickyNotes(topicId),
      { initialProps: { topicId: 't1' } },
    );
    expect(result.current.stickyNotes).toHaveLength(1);

    rerender({ topicId: '' });
    expect(result.current.stickyNotes).toEqual([]);
  });
});

// ── handleAddStickyNote ──────────────────────────────────────

describe('useMapStickyNotes: handleAddStickyNote', () => {
  beforeEach(resetStore);

  it('adds a new note', () => {
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));
    act(() => {
      result.current.handleAddStickyNote();
    });
    expect(result.current.stickyNotes).toHaveLength(1);
    expect(result.current.stickyNotes[0].text).toBe('');
    expect(typeof result.current.stickyNotes[0].id).toBe('string');
  });

  it('persists new note to localStorage', () => {
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));
    act(() => {
      result.current.handleAddStickyNote();
    });
    const stored = JSON.parse(store['axon_sticky_notes_topic-1']);
    expect(stored).toHaveLength(1);
  });

  it('adds multiple notes', () => {
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));
    act(() => { result.current.handleAddStickyNote(); });
    act(() => { result.current.handleAddStickyNote(); });
    act(() => { result.current.handleAddStickyNote(); });
    expect(result.current.stickyNotes).toHaveLength(3);
  });

  it('shows toast.error at 10 notes and does not add 11th', () => {
    const tenNotes = Array.from({ length: 10 }, (_, i) =>
      makeStickyNote({ id: `pre-${i}` }),
    );
    seedNotes('topic-1', tenNotes);

    const { result } = renderHook(() => useMapStickyNotes('topic-1'));
    expect(result.current.stickyNotes).toHaveLength(10);

    act(() => {
      result.current.handleAddStickyNote();
    });
    expect(result.current.stickyNotes).toHaveLength(10);
    expect(mockToastError).toHaveBeenCalled();
  });

  it('uses custom i18n message for max notes toast', () => {
    const tenNotes = Array.from({ length: 10 }, (_, i) =>
      makeStickyNote({ id: `pre-${i}` }),
    );
    seedNotes('topic-1', tenNotes);

    const { result } = renderHook(() =>
      useMapStickyNotes('topic-1', { maxStickyNotes: 'Max 10 notes' }),
    );

    act(() => {
      result.current.handleAddStickyNote();
    });
    expect(mockToastError).toHaveBeenCalledWith('Max 10 notes');
  });

  it('does nothing when topicId is empty', () => {
    const { result } = renderHook(() => useMapStickyNotes(''));
    act(() => {
      result.current.handleAddStickyNote();
    });
    expect(result.current.stickyNotes).toEqual([]);
  });
});

// ── handleUpdateStickyNote ───────────────────────────────────

describe('useMapStickyNotes: handleUpdateStickyNote', () => {
  beforeEach(resetStore);

  it('updates text of an existing note', () => {
    seedNotes('topic-1', [makeStickyNote({ id: 'n1', text: 'old' })]);
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));

    act(() => {
      result.current.handleUpdateStickyNote('n1', { text: 'new text' });
    });
    expect(result.current.stickyNotes[0].text).toBe('new text');
  });

  it('updates position of an existing note', () => {
    seedNotes('topic-1', [makeStickyNote({ id: 'n1', x: 100, y: 100 })]);
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));

    act(() => {
      result.current.handleUpdateStickyNote('n1', { x: 200, y: 300 });
    });
    expect(result.current.stickyNotes[0].x).toBe(200);
    expect(result.current.stickyNotes[0].y).toBe(300);
  });

  it('persists update to localStorage', () => {
    seedNotes('topic-1', [makeStickyNote({ id: 'n1', text: 'old' })]);
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));

    act(() => {
      result.current.handleUpdateStickyNote('n1', { text: 'updated' });
    });
    const stored = JSON.parse(store['axon_sticky_notes_topic-1']);
    expect(stored[0].text).toBe('updated');
  });

  it('does not affect other notes', () => {
    seedNotes('topic-1', [
      makeStickyNote({ id: 'n1', text: 'first' }),
      makeStickyNote({ id: 'n2', text: 'second' }),
    ]);
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));

    act(() => {
      result.current.handleUpdateStickyNote('n1', { text: 'changed' });
    });
    expect(result.current.stickyNotes[1].text).toBe('second');
  });

  it('does nothing when topicId is empty', () => {
    const { result } = renderHook(() => useMapStickyNotes(''));
    act(() => {
      result.current.handleUpdateStickyNote('n1', { text: 'nope' });
    });
    expect(result.current.stickyNotes).toEqual([]);
  });
});

// ── handleDeleteStickyNote ───────────────────────────────────

describe('useMapStickyNotes: handleDeleteStickyNote', () => {
  beforeEach(resetStore);

  it('removes a note by id', () => {
    seedNotes('topic-1', [
      makeStickyNote({ id: 'n1' }),
      makeStickyNote({ id: 'n2' }),
    ]);
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));

    act(() => {
      result.current.handleDeleteStickyNote('n1');
    });
    expect(result.current.stickyNotes).toHaveLength(1);
    expect(result.current.stickyNotes[0].id).toBe('n2');
  });

  it('persists deletion to localStorage', () => {
    seedNotes('topic-1', [makeStickyNote({ id: 'n1' })]);
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));

    act(() => {
      result.current.handleDeleteStickyNote('n1');
    });
    const stored = JSON.parse(store['axon_sticky_notes_topic-1']);
    expect(stored).toHaveLength(0);
  });

  it('does nothing when deleting non-existent id', () => {
    seedNotes('topic-1', [makeStickyNote({ id: 'n1' })]);
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));

    act(() => {
      result.current.handleDeleteStickyNote('non-existent');
    });
    expect(result.current.stickyNotes).toHaveLength(1);
  });

  it('does nothing when topicId is empty', () => {
    const { result } = renderHook(() => useMapStickyNotes(''));
    act(() => {
      result.current.handleDeleteStickyNote('n1');
    });
    expect(result.current.stickyNotes).toEqual([]);
  });
});

// ── Return shape ─────────────────────────────────────────────

describe('useMapStickyNotes: return shape', () => {
  beforeEach(resetStore);

  it('returns stickyNotes as an array', () => {
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));
    expect(Array.isArray(result.current.stickyNotes)).toBe(true);
  });

  it('returns all 4 handler functions', () => {
    const { result } = renderHook(() => useMapStickyNotes('topic-1'));
    expect(typeof result.current.setStickyNotes).toBe('function');
    expect(typeof result.current.handleAddStickyNote).toBe('function');
    expect(typeof result.current.handleUpdateStickyNote).toBe('function');
    expect(typeof result.current.handleDeleteStickyNote).toBe('function');
  });
});
