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

// ── Click branches ──────────────────────────────────────────

describe('handleNodeClick branches', () => {
  it('reads shiftKey from originalEvent (G6 wraps the native event)', () => {
    expect(source).toMatch(/evt\.originalEvent\?\.shiftKey\s*\?\?\s*false/);
  });

  it('shift-click TOGGLES the node in multiSelectedIds (delete if present, add if not)', () => {
    expect(source).toMatch(/if\s*\(next\.has\(nodeId\)\)\s*\{\s*next\.delete\(nodeId\)/);
    expect(source).toMatch(/\}\s*else\s*\{\s*next\.add\(nodeId\)/);
  });

  it('regular click clears existing multi-selection', () => {
    expect(source).toMatch(/if\s*\(multiSelectedIdsRef\.current\.size\s*>\s*0\)[\s\S]{0,100}updateMultiSelection\(new Set\(\)\)/);
  });

  it('passes raw node + click position to onNodeClick callback', () => {
    expect(source).toMatch(/onNodeClickRef\.current\([\s\S]{0,80}_raw as MapNode/);
    expect(source).toMatch(/x:\s*evt\.client\?\.x\s*\?\?\s*evt\.clientX\s*\?\?\s*0/);
    expect(source).toMatch(/y:\s*evt\.client\?\.y\s*\?\?\s*evt\.clientY\s*\?\?\s*0/);
  });

  it('applies spotlight on the clicked node via requestAnimationFrame', () => {
    expect(source).toMatch(/requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]{0,200}applySpotlight\(g,\s*nodeId\)/);
  });

  it('skips the click when longPressTriggered is true (resets the flag)', () => {
    expect(source).toMatch(/if\s*\(longPressTriggered\)\s*\{\s*longPressTriggered\s*=\s*false;\s*return;?\s*\}/);
  });
});

// ── Double-click expand/collapse ────────────────────────────

describe('handleNodeDblClick (collapse/expand)', () => {
  it('only collapses when the node has children (childrenMapRef lookup)', () => {
    expect(source).toMatch(/childrenMapRef\.current\.get\(nodeId\)\?\.length\s*\?\?\s*0/);
    expect(source).toMatch(/if\s*\(!hasChildren\)\s*return/);
  });

  it('collapse adds breadcrumb; expand removes it', () => {
    expect(source).toMatch(/setBreadcrumbs\(bc\s*=>\s*bc\.filter\(b\s*=>\s*b\.id\s*!==\s*nodeId\)\)/);
    expect(source).toMatch(/\[\.\.\.bc,\s*\{\s*id:\s*nodeId,\s*label:\s*nodeLabel\s*\}\]/);
  });

  it('breadcrumb collapse path skips duplicates (some(b.id === nodeId))', () => {
    expect(source).toMatch(/bc\.some\(b\s*=>\s*b\.id\s*===\s*nodeId\)/);
  });

  it('uses fullLabel ?? label ?? nodeId for breadcrumb text', () => {
    expect(source).toMatch(/nodeData\?\.data\?\.fullLabel\s*\|\|\s*nodeData\?\.data\?\.label\s*\|\|\s*nodeId/);
  });

  it('notifies via onCollapseChange with both count and id Set', () => {
    expect(source).toMatch(/onCollapseChangeRef\.current\?\.\(next\.size,\s*next\)/);
  });
});

// ── Canvas click (deselect everything) ──────────────────────

describe('handleCanvasClick', () => {
  it('calls onNodeClick(null) so the parent deselects', () => {
    expect(source).toContain('onNodeClickRef.current?.(null)');
  });

  it('also closes the keyboard-shortcuts overlay', () => {
    expect(source).toContain('setShowShortcuts(false)');
  });

  it('clears multi-selection if any', () => {
    expect(source).toMatch(/multiSelectedIdsRef\.current\.size\s*>\s*0[\s\S]{0,80}updateMultiSelection\(new Set\(\)\)/);
  });

  it('clears spotlight on canvas click', () => {
    expect(source).toMatch(/handleCanvasClick[\s\S]{0,200}clearSpotlight\(graph\)/);
  });
});

// ── Brush-select (rubber-band selection) ────────────────────

describe('handleBrushSelect', () => {
  it("subscribes to G6's afterbrushselect event", () => {
    expect(source).toContain("graph.on('afterbrushselect'");
  });

  it('UNIONs the brushed nodes with the existing selection (additive)', () => {
    expect(source).toMatch(/new Set\(\[\.\.\.multiSelectedIdsRef\.current,\s*\.\.\.selectedIds\]\)/);
  });

  it('skips the union when the brush returns no nodes', () => {
    expect(source).toMatch(/selectedIds\.length\s*>\s*0/);
  });
});

// ── Edge hover (highlights connected nodes) ─────────────────

describe('Edge hover highlights connected nodes', () => {
  it('subscribes to edge:pointerenter / edge:pointerleave', () => {
    expect(source).toContain("graph.on('edge:pointerenter'");
    expect(source).toContain("graph.on('edge:pointerleave'");
  });

  it('caches the two endpoints in a closure variable for the leave handler', () => {
    expect(source).toContain('edgeHoverNodes');
    expect(source).toMatch(/edgeHoverNodes\s*=\s*\[src,\s*tgt\]\.filter\(Boolean\)/);
  });

  it('adds "hover" state to both endpoints on enter', () => {
    expect(source).toMatch(/setElementState\(nId,\s*\[\.\.\.base,\s*'hover'\]\)/);
  });

  it('removes "hover" from the same nodes on leave (preserves other states)', () => {
    expect(source).toMatch(/cur\.filter\(s\s*=>\s*s\s*!==\s*'hover'\)/);
  });

  it('clears edgeHoverNodes after leave (no stale references)', () => {
    expect(source).toMatch(/edgeHoverNodes\s*=\s*\[\]/);
  });
});

// ── Long-press: active state + trigger flag ─────────────────

describe('Long-press: active state + flag', () => {
  it('adds "active" state on pointerdown (preserves prior states)', () => {
    expect(source).toMatch(/\[\.\.\.existing\.filter\(\(s:\s*string\)\s*=>\s*s\s*!==\s*'active'\),\s*'active'\]/);
  });

  it('removes "active" state on pointerup / pointerleave (clearActiveState)', () => {
    expect(source).toContain('clearActiveState');
    expect(source).toMatch(/current\.filter\(s\s*=>\s*s\s*!==\s*'active'\)/);
  });

  it('long-press flips `longPressTriggered` so the subsequent click is suppressed', () => {
    expect(source).toContain('longPressTriggered = true');
    expect(source).toContain('longPressTriggered = false');
  });

  it('long-press handler invokes the context-menu callback (handleNodeContextMenu)', () => {
    expect(source).toMatch(/handleNodeContextMenu\(evt\)/);
  });
});

// ── handleNodeContextMenu ───────────────────────────────────

describe('handleNodeContextMenu', () => {
  it('calls preventDefault to suppress the native browser menu', () => {
    expect(source).toMatch(/handleNodeContextMenu[\s\S]{0,100}evt\.preventDefault\?\.\(\)/);
  });

  it('passes the raw MapNode + screen position to the callback', () => {
    expect(source).toMatch(/onNodeRightClickRef\.current\([\s\S]{0,100}_raw as MapNode/);
  });
});

// ── Viewport change handler ─────────────────────────────────

describe('Viewport change handler', () => {
  it("subscribes to G6's afterviewportchange event", () => {
    expect(source).toContain("graph.on('afterviewportchange'");
  });

  it('emits the current zoom via onZoomChangeRef', () => {
    expect(source).toMatch(/onZoomChangeRef\.current\?\.\(zoom\)/);
  });

  it('initializes prevZoomForLimit to NaN so the first viewport change does not fake a flash', () => {
    expect(source).toMatch(/let\s+prevZoomForLimit\s*=\s*NaN/);
    expect(source).toMatch(/!isNaN\(prevZoomForLimit\)/);
  });

  it('uses 0.001 epsilon for MIN and 0.01 for MAX (asymmetric tolerance)', () => {
    expect(source).toMatch(/MIN_ZOOM\s*\+\s*0\.001/);
    expect(source).toMatch(/MAX_ZOOM\s*-\s*0\.01/);
  });

  it('runs handleViewportChange once on mount (gets initial zoom into ref)', () => {
    expect(source).toMatch(/graph\.on\('afterviewportchange',\s*handleViewportChange\)\s*;\s*\n\s*handleViewportChange\(\)/);
  });
});

// ── Drag-end persistence ────────────────────────────────────

describe('handleNodeDragEnd persistence', () => {
  it('only persists when topicIdRef has a value', () => {
    expect(source).toMatch(/if\s*\(!nodeId\s*\|\|\s*!topicIdRef\.current\)\s*return/);
  });

  it('reads x/y from nodeData.style (not from event positions)', () => {
    expect(source).toMatch(/let\s+\{\s*x,\s*y\s*\}\s*=\s*nodeData\.style as/);
  });

  it('rounds to GRID_SIZE multiples when grid is enabled', () => {
    expect(source).toMatch(/Math\.round\(x\s*\/\s*GRID_SIZE\)\s*\*\s*GRID_SIZE/);
    expect(source).toMatch(/Math\.round\(y\s*\/\s*GRID_SIZE\)\s*\*\s*GRID_SIZE/);
  });

  it('writes the snapped position back to G6 + persists via saveNodePosition', () => {
    expect(source).toMatch(/graph\.updateNodeData\(\[\{\s*id:\s*nodeId,\s*style:\s*\{\s*x,\s*y\s*\}\s*\}\]\)/);
    expect(source).toContain('saveNodePosition(topicIdRef.current, nodeId, { x, y })');
  });
});
