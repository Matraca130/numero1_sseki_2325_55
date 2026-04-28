// ============================================================
// Contract test — useGraphEvents
//
// Heavy G6-bound hook (464 lines) with no isolated public API
// beyond its options/return shape. Validate the source-level
// contract: exports, registered G6 events, spotlight states,
// long-press timing, grid snap, and cleanup symmetry.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'useGraphEvents.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Exports ──────────────────────────────────────────────────

describe('useGraphEvents exports', () => {
  it('exports useGraphEvents hook', () => {
    expect(source).toContain('export function useGraphEvents');
  });

  it('exports UseGraphEventsOptions interface', () => {
    expect(source).toContain('export interface UseGraphEventsOptions');
  });

  it('exports UseGraphEventsReturn interface', () => {
    expect(source).toContain('export interface UseGraphEventsReturn');
  });
});

// ── Options surface ──────────────────────────────────────────

describe('UseGraphEventsOptions surface', () => {
  const required = [
    'graphRef',
    'ready',
    'graphVersion',
    'data',
    'mountedRef',
    'longPressTimerRef',
    'topicIdRef',
    'gridEnabledRef',
    'childrenMapRef',
    'onNodeClickRef',
    'onNodeRightClickRef',
    'onCollapseChangeRef',
    'onMultiSelectRef',
    'onZoomChangeRef',
    'multiSelectedIdsRef',
    'setCollapsedNodes',
    'setBreadcrumbs',
    'setMultiSelectedIds',
    'setShowShortcuts',
    'applyMultiSelectionState',
    'updateMultiSelection',
    'flashZoomLimit',
    'batchDraw',
  ];
  for (const key of required) {
    it(`accepts \`${key}\``, () => {
      expect(source).toMatch(new RegExp(`\\b${key}\\b`));
    });
  }
});

// ── Return surface ───────────────────────────────────────────

describe('UseGraphEventsReturn surface', () => {
  it('returns applySpotlight callback', () => {
    expect(source).toMatch(/applySpotlight\s*[:,]/);
  });
  it('returns clearSpotlight callback', () => {
    expect(source).toMatch(/clearSpotlight\s*[:,]/);
  });
  it('returns adjacencyMap', () => {
    expect(source).toMatch(/adjacencyMap\s*[:,]/);
  });
  it('returns edgeByEndpoints', () => {
    expect(source).toMatch(/edgeByEndpoints\s*[:,]/);
  });
  it('returns spotlightedIdsRef', () => {
    expect(source).toMatch(/spotlightedIdsRef\s*[:,]/);
  });
});

// ── Spotlight state machine ──────────────────────────────────

describe('Spotlight states', () => {
  it('declares the three spotlight state names as a tuple', () => {
    expect(source).toContain('SPOTLIGHT_STATES');
    expect(source).toContain("'spotlight'");
    expect(source).toContain("'spotlightConnected'");
    expect(source).toContain("'spotlightDim'");
  });

  it('clearSpotlight is a no-op when no spotlight is active', () => {
    // Source guards on `if (!spotlightNodeRef.current) return;`
    expect(source).toMatch(/if\s*\(\s*!spotlightNodeRef\.current\s*\)\s*return\s*;/);
  });

  it('toggling spotlight on the same node clears it', () => {
    expect(source).toMatch(/if\s*\(\s*spotlightNodeRef\.current\s*===\s*nodeId\s*\)/);
  });

  it('builds adjacencyMap as a bidirectional edge map', () => {
    expect(source).toContain('adjacencyMap');
    expect(source).toMatch(/map\.get\(edge\.source\)!\.add\(edge\.target\)/);
    expect(source).toMatch(/map\.get\(edge\.target\)!\.add\(edge\.source\)/);
  });

  it('edgeByEndpoints stores keys in both directions', () => {
    expect(source).toContain('${edge.source}|${edge.target}');
    expect(source).toContain('${edge.target}|${edge.source}');
  });
});

// ── G6 event handlers — registration symmetry ────────────────

const REGISTERED_EVENTS = [
  'node:click',
  'node:contextmenu',
  'node:dblclick',
  'node:dragend',
  'canvas:click',
  'afterbrushselect',
  'node:pointerdown',
  'node:pointerup',
  'node:pointerleave',
  'node:pointermove',
  'edge:pointerenter',
  'edge:pointerleave',
  'afterviewportchange',
];

describe('G6 event registration', () => {
  for (const evt of REGISTERED_EVENTS) {
    it(`subscribes to '${evt}'`, () => {
      expect(source).toContain(`graph.on('${evt}'`);
    });
    it(`unsubscribes from '${evt}' in cleanup`, () => {
      expect(source).toContain(`graph.off('${evt}'`);
    });
  }
});

// ── Long-press behavior ──────────────────────────────────────

describe('Long-press for mobile context menu', () => {
  it('uses a 500ms threshold', () => {
    expect(source).toMatch(/setTimeout\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*500\s*\)/);
  });

  it('cancels the timer when finger moves > 10px², via LONG_PRESS_MOVE_THRESHOLD', () => {
    expect(source).toContain('LONG_PRESS_MOVE_THRESHOLD');
    expect(source).toMatch(/LONG_PRESS_MOVE_THRESHOLD\s*=\s*10/);
  });

  it('clears longPressTimerRef in the cleanup return', () => {
    expect(source).toMatch(/clearTimeout\(longPressTimerRef\.current\)/);
  });
});

// ── Grid snapping on drag end ────────────────────────────────

describe('Grid snapping', () => {
  it('declares GRID_SIZE = 40', () => {
    expect(source).toMatch(/GRID_SIZE\s*=\s*40/);
  });

  it('only snaps when gridEnabledRef.current is true', () => {
    expect(source).toMatch(/if\s*\(\s*gridEnabledRef\.current\s*\)/);
  });

  it('persists position via saveNodePosition', () => {
    expect(source).toContain('saveNodePosition');
  });
});

// ── Multi-select ─────────────────────────────────────────────

describe('Multi-select', () => {
  it('shift-click toggles a node in the selection set', () => {
    expect(source).toContain('shiftKey');
    expect(source).toMatch(/if\s*\(\s*next\.has\(nodeId\)\s*\)/);
    expect(source).toMatch(/next\.delete\(nodeId\)/);
    expect(source).toMatch(/next\.add\(nodeId\)/);
  });

  it('canvas click clears multi-selection', () => {
    expect(source).toContain('handleCanvasClick');
    expect(source).toContain('updateMultiSelection(new Set())');
  });

  it('brush select adds to existing selection', () => {
    expect(source).toContain('handleBrushSelect');
    expect(source).toMatch(/new Set\(\[\.\.\.multiSelectedIdsRef\.current,\s*\.\.\.selectedIds\]\)/);
  });
});

// ── Zoom ─────────────────────────────────────────────────────

describe('Zoom limit feedback', () => {
  it('imports MIN_ZOOM and MAX_ZOOM from useGraphInit', () => {
    expect(source).toMatch(/MIN_ZOOM[\s\S]*MAX_ZOOM/);
    expect(source).toContain("from './useGraphInit'");
  });

  it('flashes when both prev and current zoom touch min/max', () => {
    expect(source).toContain('flashZoomLimit');
    expect(source).toMatch(/atMin\s*\|\|\s*atMax/);
  });
});

// ── Defensive error handling ─────────────────────────────────

describe('Defensive error handling', () => {
  it('uses warnIfNotDestroyed for graph operations that may race teardown', () => {
    expect(source).toContain('warnIfNotDestroyed');
    // At least 4 callsites — clear/apply spotlight + drag + long-press paths
    const matches = source.match(/warnIfNotDestroyed\(/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('cleanup wraps graph.off calls in try/catch', () => {
    // The cleanup returned from the main effect
    expect(source).toMatch(/return\s*\(\)\s*=>\s*\{[\s\S]*?try\s*\{[\s\S]*?graph\.off/);
  });
});

// ── Effect dependency invariant ──────────────────────────────

describe('Effect re-bind triggers', () => {
  it('main events effect depends only on `ready` and `graphVersion`', () => {
    // Comment in source explains: handlers via refs, only re-binds on ready/graphVersion
    expect(source).toMatch(/\}, \[ready, graphVersion\]\)/);
  });
});
