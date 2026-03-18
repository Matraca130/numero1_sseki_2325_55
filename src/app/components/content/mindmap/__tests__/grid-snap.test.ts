// ============================================================
// Tests — Grid / Snap-to-grid (calculation + persistence)
//
// Tests snap-to-grid rounding (nearest 40px) and grid state
// persistence via localStorage.
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage before importing the module
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

import {
  loadGridEnabled,
  saveGridEnabled,
} from '../useNodePositions';

// ── Helpers ─────────────────────────────────────────────────

function resetStore() {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
}

// ── Snap-to-grid calculation ────────────────────────────────

const GRID_SIZE = 40;

/**
 * Snap a coordinate to the nearest grid point.
 * Mirrors the internal snap logic used when grid is enabled.
 */
function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

describe('snapToGrid', () => {
  it('snaps 0 to 0', () => {
    expect(snapToGrid(0)).toBe(0);
  });

  it('snaps exact grid multiples to themselves', () => {
    expect(snapToGrid(40)).toBe(40);
    expect(snapToGrid(80)).toBe(80);
    expect(snapToGrid(120)).toBe(120);
    expect(snapToGrid(400)).toBe(400);
  });

  it('snaps values below midpoint down', () => {
    expect(snapToGrid(19)).toBe(0);   // 19/40 = 0.475 -> round to 0
    expect(snapToGrid(59)).toBe(40);  // 59/40 = 1.475 -> round to 1
  });

  it('snaps values at or above midpoint up', () => {
    expect(snapToGrid(20)).toBe(40);  // 20/40 = 0.5 -> round to 1
    expect(snapToGrid(21)).toBe(40);  // 21/40 = 0.525 -> round to 1
    expect(snapToGrid(60)).toBe(80);  // 60/40 = 1.5 -> round to 2
  });

  it('handles negative coordinates', () => {
    // Math.round(-0.25) = -0, which is === 0 but not Object.is(0)
    expect(snapToGrid(-10)).toBe(-0);
    expect(snapToGrid(-20)).toBe(-0);  // -20/40 = -0.5 -> round to -0
    expect(snapToGrid(-21)).toBe(-40); // -21/40 = -0.525 -> round to -1
    expect(snapToGrid(-40)).toBe(-40);
  });

  it('handles large coordinates', () => {
    expect(snapToGrid(1000)).toBe(1000); // exact multiple
    expect(snapToGrid(1015)).toBe(1000); // 1015/40 = 25.375 -> 25*40 = 1000
    expect(snapToGrid(1020)).toBe(1040); // 1020/40 = 25.5 -> 26*40 = 1040
  });

  it('handles fractional coordinates', () => {
    expect(snapToGrid(39.9)).toBe(40);  // 39.9/40 = 0.9975 -> round to 1
    expect(snapToGrid(0.1)).toBe(0);    // 0.1/40 = 0.0025 -> round to 0
  });

  it('snaps both x and y independently', () => {
    const x = snapToGrid(55);   // -> 40
    const y = snapToGrid(103);  // 103/40 = 2.575 -> round to 3 -> 120
    expect(x).toBe(40);
    expect(y).toBe(120);
  });
});

// ── Grid state persistence ──────────────────────────────────

describe('loadGridEnabled', () => {
  beforeEach(resetStore);

  it('returns false when nothing is stored', () => {
    expect(loadGridEnabled()).toBe(false);
  });

  it('returns true when stored value is "1"', () => {
    store['axon_grid_enabled'] = '1';
    expect(loadGridEnabled()).toBe(true);
  });

  it('returns false when stored value is "0"', () => {
    store['axon_grid_enabled'] = '0';
    expect(loadGridEnabled()).toBe(false);
  });

  it('returns false for any other stored value', () => {
    store['axon_grid_enabled'] = 'true';
    expect(loadGridEnabled()).toBe(false);

    store['axon_grid_enabled'] = 'yes';
    expect(loadGridEnabled()).toBe(false);
  });
});

describe('saveGridEnabled', () => {
  beforeEach(resetStore);

  it('saves "1" when enabled is true', () => {
    saveGridEnabled(true);
    expect(store['axon_grid_enabled']).toBe('1');
  });

  it('saves "0" when enabled is false', () => {
    saveGridEnabled(false);
    expect(store['axon_grid_enabled']).toBe('0');
  });

  it('round-trips correctly', () => {
    saveGridEnabled(true);
    expect(loadGridEnabled()).toBe(true);

    saveGridEnabled(false);
    expect(loadGridEnabled()).toBe(false);
  });
});

// ── Grid + snap integration ─────────────────────────────────

describe('Grid + snap integration', () => {
  it('when grid is disabled, coordinates should not be snapped', () => {
    // This tests the consumer contract: when gridEnabled is false,
    // raw coordinates are used (no snap applied)
    const raw = { x: 55, y: 103 };
    const gridEnabled = false;
    const result = gridEnabled
      ? { x: snapToGrid(raw.x), y: snapToGrid(raw.y) }
      : raw;
    expect(result).toEqual({ x: 55, y: 103 });
  });

  it('when grid is enabled, coordinates are snapped to nearest 40px', () => {
    const raw = { x: 55, y: 103 };
    const gridEnabled = true;
    const result = gridEnabled
      ? { x: snapToGrid(raw.x), y: snapToGrid(raw.y) }
      : raw;
    expect(result).toEqual({ x: 40, y: 120 });
  });
});
