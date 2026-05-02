// ============================================================
// Tests -- useMapUIState (panel visibility and UI state)
//
// Tests the hook that manages panel visibility toggles with
// mutual exclusion, zoom level, minimap, AI highlight/review
// nodes, and onboarding dismiss with localStorage.
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

import { useMapUIState } from '../useMapUIState';

function resetStore() {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
}

// ── Default state ──────────────────────────────────────────────

describe('useMapUIState: default state', () => {
  beforeEach(resetStore);

  it('showAiPanel starts false', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.showAiPanel).toBe(false);
  });

  it('showHistory starts false', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.showHistory).toBe(false);
  });

  it('showComparison starts false', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.showComparison).toBe(false);
  });

  it('presentationMode starts false', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.presentationMode).toBe(false);
  });

  it('showShareModal starts false', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.showShareModal).toBe(false);
  });

  it('zoomLevel starts at 1', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.zoomLevel).toBe(1);
  });

  it('aiHighlightNodes starts as undefined', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.aiHighlightNodes).toBeUndefined();
  });

  it('aiReviewNodes starts as undefined', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.aiReviewNodes).toBeUndefined();
  });
});

// ── Onboarding ─────────────────────────────────────────────────

describe('useMapUIState: onboarding', () => {
  beforeEach(resetStore);

  it('showOnboarding starts true when localStorage has no axon_map_onboarded key', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.showOnboarding).toBe(true);
  });

  it('showOnboarding starts false when localStorage has axon_map_onboarded key', () => {
    store['axon_map_onboarded'] = '1';
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.showOnboarding).toBe(false);
  });

  it('dismissOnboarding sets showOnboarding to false', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.showOnboarding).toBe(true);

    act(() => {
      result.current.dismissOnboarding();
    });
    expect(result.current.showOnboarding).toBe(false);
  });

  it('dismissOnboarding writes axon_map_onboarded to localStorage', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.dismissOnboarding();
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith('axon_map_onboarded', '1');
  });

  it('showOnboardingRef reflects current onboarding state', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.showOnboardingRef.current).toBe(true);

    act(() => {
      result.current.dismissOnboarding();
    });
    expect(result.current.showOnboardingRef.current).toBe(false);
  });
});

// ── Toggle functions ───────────────────────────────────────────

describe('useMapUIState: toggle functions', () => {
  beforeEach(resetStore);

  it('toggleAiPanel opens the AI panel', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(result.current.showAiPanel).toBe(false);

    act(() => {
      result.current.toggleAiPanel();
    });
    expect(result.current.showAiPanel).toBe(true);
  });

  it('toggleAiPanel closes the AI panel when already open', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.toggleAiPanel();
    });
    expect(result.current.showAiPanel).toBe(true);

    act(() => {
      result.current.toggleAiPanel();
    });
    expect(result.current.showAiPanel).toBe(false);
  });

  it('toggleHistory opens the history panel', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.toggleHistory();
    });
    expect(result.current.showHistory).toBe(true);
  });

  it('toggleHistory closes the history panel when already open', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.toggleHistory();
    });
    act(() => {
      result.current.toggleHistory();
    });
    expect(result.current.showHistory).toBe(false);
  });

  it('toggleComparison opens the comparison panel', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.toggleComparison();
    });
    expect(result.current.showComparison).toBe(true);
  });

  it('toggleComparison closes the comparison panel when already open', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.toggleComparison();
    });
    act(() => {
      result.current.toggleComparison();
    });
    expect(result.current.showComparison).toBe(false);
  });
});

// ── Mutual exclusion ───────────────────────────────────────────

describe('useMapUIState: mutual exclusion', () => {
  beforeEach(resetStore);

  it('opening AI panel closes history and comparison', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.toggleHistory();
    });
    act(() => {
      result.current.toggleComparison();
    });
    expect(result.current.showHistory).toBe(false); // comparison closed history
    expect(result.current.showComparison).toBe(true);

    act(() => {
      result.current.toggleAiPanel();
    });
    expect(result.current.showAiPanel).toBe(true);
    expect(result.current.showHistory).toBe(false);
    expect(result.current.showComparison).toBe(false);
  });

  it('opening history closes AI panel and comparison', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.toggleAiPanel();
    });
    expect(result.current.showAiPanel).toBe(true);

    act(() => {
      result.current.toggleHistory();
    });
    expect(result.current.showHistory).toBe(true);
    expect(result.current.showAiPanel).toBe(false);
    expect(result.current.showComparison).toBe(false);
  });

  it('opening comparison closes AI panel and history', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.toggleAiPanel();
    });
    expect(result.current.showAiPanel).toBe(true);

    act(() => {
      result.current.toggleComparison();
    });
    expect(result.current.showComparison).toBe(true);
    expect(result.current.showAiPanel).toBe(false);
    expect(result.current.showHistory).toBe(false);
  });

  it('closing AI panel clears aiHighlightNodes and aiReviewNodes', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.setAiHighlightNodes(new Set(['n1', 'n2']));
      result.current.setAiReviewNodes(new Set(['n3']));
    });
    expect(result.current.aiHighlightNodes).toBeDefined();
    expect(result.current.aiReviewNodes).toBeDefined();

    // Open and then close AI panel
    act(() => {
      result.current.toggleAiPanel();
    });
    expect(result.current.showAiPanel).toBe(true);

    act(() => {
      result.current.toggleAiPanel();
    });
    expect(result.current.showAiPanel).toBe(false);
    expect(result.current.aiHighlightNodes).toBeUndefined();
    expect(result.current.aiReviewNodes).toBeUndefined();
  });
});

// ── Zoom level ─────────────────────────────────────────────────

describe('useMapUIState: zoom level', () => {
  beforeEach(resetStore);

  it('can set zoom level', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.setZoomLevel(1.5);
    });
    expect(result.current.zoomLevel).toBe(1.5);
  });

  it('can set zoom level to less than 1', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.setZoomLevel(0.5);
    });
    expect(result.current.zoomLevel).toBe(0.5);
  });

  it('can use functional updater for zoom level', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.setZoomLevel((prev) => prev * 2);
    });
    expect(result.current.zoomLevel).toBe(2);
  });
});

// ── Minimap toggle ─────────────────────────────────────────────

describe('useMapUIState: minimap toggle', () => {
  beforeEach(resetStore);

  it('toggleMinimap flips the minimap visibility', () => {
    const { result } = renderHook(() => useMapUIState());
    const initial = result.current.showMinimap;

    act(() => {
      result.current.toggleMinimap();
    });
    expect(result.current.showMinimap).toBe(!initial);
  });

  it('toggleMinimap toggles back to the original state', () => {
    const { result } = renderHook(() => useMapUIState());
    const initial = result.current.showMinimap;

    act(() => {
      result.current.toggleMinimap();
    });
    act(() => {
      result.current.toggleMinimap();
    });
    expect(result.current.showMinimap).toBe(initial);
  });
});

// ── AI highlight/review nodes ──────────────────────────────────

describe('useMapUIState: AI highlight and review nodes', () => {
  beforeEach(resetStore);

  it('can set aiHighlightNodes', () => {
    const { result } = renderHook(() => useMapUIState());
    const nodes = new Set(['node-1', 'node-2']);

    act(() => {
      result.current.setAiHighlightNodes(nodes);
    });
    expect(result.current.aiHighlightNodes).toEqual(nodes);
  });

  it('can set aiReviewNodes', () => {
    const { result } = renderHook(() => useMapUIState());
    const nodes = new Set(['node-3', 'node-4']);

    act(() => {
      result.current.setAiReviewNodes(nodes);
    });
    expect(result.current.aiReviewNodes).toEqual(nodes);
  });

  it('can clear aiHighlightNodes to undefined', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.setAiHighlightNodes(new Set(['x']));
    });
    act(() => {
      result.current.setAiHighlightNodes(undefined);
    });
    expect(result.current.aiHighlightNodes).toBeUndefined();
  });

  it('can clear aiReviewNodes to undefined', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.setAiReviewNodes(new Set(['y']));
    });
    act(() => {
      result.current.setAiReviewNodes(undefined);
    });
    expect(result.current.aiReviewNodes).toBeUndefined();
  });
});

// ── Direct setters ─────────────────────────────────────────────

describe('useMapUIState: direct setters', () => {
  beforeEach(resetStore);

  it('setPresentationMode works', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.setPresentationMode(true);
    });
    expect(result.current.presentationMode).toBe(true);
  });

  it('setShowShareModal works', () => {
    const { result } = renderHook(() => useMapUIState());

    act(() => {
      result.current.setShowShareModal(true);
    });
    expect(result.current.showShareModal).toBe(true);
  });

  it('setShowAiPanel can bypass mutual exclusion', () => {
    const { result } = renderHook(() => useMapUIState());

    // Using direct setter does not trigger mutual exclusion logic
    act(() => {
      result.current.setShowAiPanel(true);
    });
    expect(result.current.showAiPanel).toBe(true);
  });
});

// ── Return shape contract ──────────────────────────────────────

describe('useMapUIState: return shape', () => {
  beforeEach(resetStore);

  it('returns all expected properties', () => {
    const { result } = renderHook(() => useMapUIState());
    const state = result.current;

    // Panel visibility
    expect(state).toHaveProperty('showAiPanel');
    expect(state).toHaveProperty('showHistory');
    expect(state).toHaveProperty('showComparison');
    expect(state).toHaveProperty('presentationMode');
    expect(state).toHaveProperty('showShareModal');
    expect(state).toHaveProperty('showOnboarding');
    expect(state).toHaveProperty('zoomLevel');
    expect(state).toHaveProperty('showMinimap');

    // Togglers
    expect(state).toHaveProperty('toggleAiPanel');
    expect(state).toHaveProperty('toggleHistory');
    expect(state).toHaveProperty('toggleComparison');
    expect(state).toHaveProperty('toggleMinimap');

    // Setters
    expect(state).toHaveProperty('setShowAiPanel');
    expect(state).toHaveProperty('setShowHistory');
    expect(state).toHaveProperty('setShowComparison');
    expect(state).toHaveProperty('setPresentationMode');
    expect(state).toHaveProperty('setShowShareModal');
    expect(state).toHaveProperty('setZoomLevel');

    // AI nodes
    expect(state).toHaveProperty('aiHighlightNodes');
    expect(state).toHaveProperty('aiReviewNodes');
    expect(state).toHaveProperty('setAiHighlightNodes');
    expect(state).toHaveProperty('setAiReviewNodes');

    // Onboarding
    expect(state).toHaveProperty('dismissOnboarding');
    expect(state).toHaveProperty('showOnboardingRef');
  });

  it('all togglers are functions', () => {
    const { result } = renderHook(() => useMapUIState());
    expect(typeof result.current.toggleAiPanel).toBe('function');
    expect(typeof result.current.toggleHistory).toBe('function');
    expect(typeof result.current.toggleComparison).toBe('function');
    expect(typeof result.current.toggleMinimap).toBe('function');
    expect(typeof result.current.dismissOnboarding).toBe('function');
  });
});

// ── Cycle 59: source-invariant negative-assertion guard ─────

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('useMapUIState source contract (cycle 59)', () => {
  const source = readFileSync(
    resolve(__dirname, '../useMapUIState.ts'),
    'utf-8'
  );

  it('uses safeGetItem/safeSetItem instead of raw localStorage (cycle 59 migration)', () => {
    expect(source).toMatch(/import\s*\{\s*safeGetItem\s*,\s*safeSetItem\s*\}\s*from\s*['"]\.\/storageHelpers['"]/);
    expect(source).not.toMatch(/localStorage\.getItem\(/);
    expect(source).not.toMatch(/localStorage\.setItem\(/);
  });

  it('lifts the storage key to a module-level ONBOARDED_KEY const', () => {
    expect(source).toMatch(/const\s+ONBOARDED_KEY\s*=\s*'axon_map_onboarded'/);
  });
});
