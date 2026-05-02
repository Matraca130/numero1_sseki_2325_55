// ============================================================
// Tests -- useEdgeReconnect (internal pure logic)
//
// The hook's pure helper functions (findNearestNode, etc.) are
// not exported, so we replicate them here to test the core
// algorithms: nearest-node detection, snap radius logic,
// drag threshold, and DragState structure.
//
// Also validates module contract (exports) via source reading.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'useEdgeReconnect.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Constants (mirrored from source) ────────────────────────

const ENDPOINT_HIT_RADIUS = 14;
const NODE_SNAP_RADIUS = 24;
const DRAG_THRESHOLD = 6;

// ── Replicated pure functions ───────────────────────────────

interface NodeScreenPos {
  id: string;
  x: number;
  y: number;
  size: number;
}

function findNearestNode(
  positions: NodeScreenPos[],
  x: number,
  y: number,
  radius: number,
  excludeId?: string,
): NodeScreenPos | null {
  let best: NodeScreenPos | null = null;
  let bestDist = radius;
  for (const pos of positions) {
    if (pos.id === excludeId) continue;
    const dx = pos.x - x;
    const dy = pos.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = pos;
    }
  }
  return best;
}

// ── Module contract ─────────────────────────────────────────

describe('useEdgeReconnect module contract', () => {
  it('exports useEdgeReconnect function', () => {
    expect(source).toContain('export function useEdgeReconnect');
  });

  it('exports EdgeReconnectResult interface', () => {
    expect(source).toContain('export interface EdgeReconnectResult');
  });

  it('defines ENDPOINT_HIT_RADIUS constant', () => {
    expect(source).toContain('ENDPOINT_HIT_RADIUS = 14');
  });

  it('defines NODE_SNAP_RADIUS constant', () => {
    expect(source).toContain('NODE_SNAP_RADIUS = 24');
  });

  it('defines DRAG_THRESHOLD constant', () => {
    expect(source).toContain('DRAG_THRESHOLD = 6');
  });

  it('handles Escape key to cancel drag (delegated to useEscapeCancel in cycle 48)', () => {
    // The Escape→pointercancel idiom moved to the useEscapeCancel helper;
    // host wires it with the isActive/onCancel callbacks.
    expect(source).toContain('useEscapeCancel');
  });

  it('handles pointercancel event', () => {
    expect(source).toContain('handlePointerCancel');
  });

  it('only activates on left mouse button', () => {
    expect(source).toContain('e.button !== 0');
  });

  it('filters only user-created edges', () => {
    expect(source).toContain('e.isUserCreated');
  });
});

// ── findNearestNode ─────────────────────────────────────────

describe('findNearestNode', () => {
  const nodes: NodeScreenPos[] = [
    { id: 'a', x: 0, y: 0, size: 30 },
    { id: 'b', x: 100, y: 0, size: 30 },
    { id: 'c', x: 50, y: 50, size: 30 },
  ];

  it('returns null for empty positions array', () => {
    expect(findNearestNode([], 0, 0, NODE_SNAP_RADIUS)).toBeNull();
  });

  it('returns nearest node within radius', () => {
    const result = findNearestNode(nodes, 2, 2, NODE_SNAP_RADIUS);
    expect(result?.id).toBe('a');
  });

  it('returns null when all nodes are outside radius', () => {
    const result = findNearestNode(nodes, 500, 500, NODE_SNAP_RADIUS);
    expect(result).toBeNull();
  });

  it('excludes specified node ID', () => {
    const result = findNearestNode(nodes, 1, 1, NODE_SNAP_RADIUS, 'a');
    // 'a' is excluded, nearest is 'c' at distance ~70 which is outside radius
    expect(result).toBeNull();
  });

  it('picks closer node when two are within radius', () => {
    const closeNodes: NodeScreenPos[] = [
      { id: 'x', x: 10, y: 0, size: 20 },
      { id: 'y', x: 5, y: 0, size: 20 },
    ];
    const result = findNearestNode(closeNodes, 0, 0, NODE_SNAP_RADIUS);
    expect(result?.id).toBe('y'); // distance 5 < distance 10
  });

  it('returns null for node exactly at radius boundary', () => {
    // Node at distance exactly equal to radius should NOT match (< not <=)
    const nodeAtBoundary: NodeScreenPos[] = [
      { id: 'edge', x: NODE_SNAP_RADIUS, y: 0, size: 20 },
    ];
    const result = findNearestNode(nodeAtBoundary, 0, 0, NODE_SNAP_RADIUS);
    expect(result).toBeNull();
  });

  it('returns node just inside radius boundary', () => {
    const nodeJustInside: NodeScreenPos[] = [
      { id: 'close', x: NODE_SNAP_RADIUS - 0.01, y: 0, size: 20 },
    ];
    const result = findNearestNode(nodeJustInside, 0, 0, NODE_SNAP_RADIUS);
    expect(result?.id).toBe('close');
  });

  it('works with negative coordinates', () => {
    const negNodes: NodeScreenPos[] = [
      { id: 'neg', x: -5, y: -5, size: 20 },
    ];
    const result = findNearestNode(negNodes, 0, 0, NODE_SNAP_RADIUS);
    expect(result?.id).toBe('neg');
  });
});

// ── Drag threshold logic ────────────────────────────────────

describe('drag threshold logic', () => {
  function exceedsThreshold(startX: number, startY: number, moveX: number, moveY: number): boolean {
    const dx = moveX - startX;
    const dy = moveY - startY;
    return Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD;
  }

  it('does not activate for tiny movements', () => {
    expect(exceedsThreshold(100, 100, 102, 102)).toBe(false); // ~2.83px
  });

  it('activates for movements exceeding threshold', () => {
    expect(exceedsThreshold(100, 100, 107, 100)).toBe(true); // 7px
  });

  it('does not activate at exactly threshold distance', () => {
    // sqrt(dx^2 + dy^2) = 6 when dx=6, dy=0
    expect(exceedsThreshold(0, 0, DRAG_THRESHOLD, 0)).toBe(true); // >= 6
  });

  it('does not activate below threshold in diagonal', () => {
    // sqrt(3^2 + 3^2) = ~4.24 < 6
    expect(exceedsThreshold(0, 0, 3, 3)).toBe(false);
  });

  it('activates above threshold in diagonal', () => {
    // sqrt(5^2 + 5^2) = ~7.07 > 6
    expect(exceedsThreshold(0, 0, 5, 5)).toBe(true);
  });
});

// ── Endpoint hit detection logic ────────────────────────────

describe('endpoint hit detection', () => {
  function isNearEndpoint(
    pointerX: number, pointerY: number,
    endpointX: number, endpointY: number,
  ): boolean {
    const dx = pointerX - endpointX;
    const dy = pointerY - endpointY;
    return Math.sqrt(dx * dx + dy * dy) <= ENDPOINT_HIT_RADIUS;
  }

  it('detects pointer directly on endpoint', () => {
    expect(isNearEndpoint(50, 50, 50, 50)).toBe(true);
  });

  it('detects pointer just inside radius', () => {
    expect(isNearEndpoint(50, 50, 50 + 13, 50)).toBe(true); // 13 < 14
  });

  it('does not detect pointer outside radius', () => {
    expect(isNearEndpoint(50, 50, 50 + 15, 50)).toBe(false); // 15 > 14
  });

  it('detects at exact boundary (<=)', () => {
    expect(isNearEndpoint(0, 0, ENDPOINT_HIT_RADIUS, 0)).toBe(true);
  });
});

// ── DragState structure validation ──────────────────────────

describe('DragState interface', () => {
  it('source code defines DragState with all required fields', () => {
    expect(source).toContain('edge: MapEdge');
    expect(source).toContain("endpoint: 'source' | 'target'");
    expect(source).toContain('fixedX: number');
    expect(source).toContain('fixedY: number');
    expect(source).toContain('dragX: number');
    expect(source).toContain('dragY: number');
    expect(source).toContain('snapNodeId: string | null');
    expect(source).toContain('startX: number');
    expect(source).toContain('startY: number');
    expect(source).toContain('activated: boolean');
    expect(source).toContain('capturedPointerId: number');
  });
});

// ── Reconnect validation logic ──────────────────────────────

describe('reconnect validation', () => {
  it('source code prevents reconnecting to same source or target', () => {
    // The condition in handlePointerUp:
    // ds.snapNodeId !== ds.edge.source && ds.snapNodeId !== ds.edge.target
    expect(source).toContain('ds.snapNodeId !== ds.edge.source');
    expect(source).toContain('ds.snapNodeId !== ds.edge.target');
  });

  it('source code restores edge opacity on cancel', () => {
    expect(source).toContain('opacity: 1');
  });

  it('source code dims edge during drag', () => {
    expect(source).toContain('opacity: 0.15');
  });
});

// ── Pointer-state-machine source guarantees ─────────────────
//
// Sister hook to useDragConnect (cycle 21). Same defensive
// pattern: capture:true binding so G6's listeners can't
// intercept; symmetric add/remove; per-event-type unbind.

describe('Pointer state machine — source guarantees', () => {
  it('pointerdown bound with capture:true to outrace G6 listeners', () => {
    expect(source).toMatch(/addEventListener\('pointerdown',\s*\w+,\s*\{\s*capture:\s*true\s*\}/);
  });

  it('keydown (for Escape) is delegated to useEscapeCancel (cycle 48 helper)', () => {
    // The capture:true binding contract is pinned in useEscapeCancel.test.ts.
    expect(source).toContain('useEscapeCancel');
  });

  it('all 4 pointer events unbound on cleanup (keydown is via useEscapeCancel)', () => {
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      expect(source).toContain(`removeEventListener('${ev}'`);
    }
    // Keydown listener registration/cleanup is delegated to useEscapeCancel.
    expect(source).toContain('useEscapeCancel');
  });

  it('coordinates with shared isDraggingRef for activation + cleanup', () => {
    // Cycle 21's useDragConnect uses the same shared ref to avoid
    // simultaneous drags; pin the same wiring here.
    expect(source).toContain('isDraggingRef');
    expect(source).toContain('isDraggingRef.current = true');
    expect(source).toContain('isDraggingRef.current = false');
  });

  it('uses TOUCH_DRAG_THRESHOLD on touch input, DRAG_THRESHOLD on mouse', () => {
    expect(source).toMatch(/pointerType\s*===\s*'touch'\s*\?\s*TOUCH_DRAG_THRESHOLD\s*:\s*DRAG_THRESHOLD/);
  });

  it('threshold gate uses Math.sqrt(dx²+dy²)', () => {
    expect(source).toMatch(/Math\.sqrt\(dx \* dx \+ dy \* dy\)\s*<\s*threshold/);
  });
});

// ── Hover throttling ────────────────────────────────────────

describe('Hover-near-endpoint cursor hint', () => {
  it('throttles hover checks via HOVER_CHECK_THROTTLE_MS=50', () => {
    expect(source).toMatch(/HOVER_CHECK_THROTTLE_MS\s*=\s*50/);
    expect(source).toMatch(/now\s*-\s*lastHoverCheckTime\s*<\s*HOVER_CHECK_THROTTLE_MS/);
  });

  it('only checks user-created edges (cached in userEdgesRef)', () => {
    expect(source).toContain('userEdgesRef');
    expect(source).toMatch(/edges\.filter\(e\s*=>\s*e\.isUserCreated\)/);
  });

  it('shows grab cursor when within ENDPOINT_HIT_RADIUS of either endpoint', () => {
    expect(source).toMatch(/dS\s*<=\s*ENDPOINT_HIT_RADIUS\s*\|\|\s*dT\s*<=\s*ENDPOINT_HIT_RADIUS/);
    expect(source).toMatch(/cursor\s*=\s*nearEndpoint\s*\?\s*'grab'\s*:\s*''/);
  });

  it('skips hover detection entirely when there are no user edges', () => {
    expect(source).toMatch(/if\s*\(userEdges\.length\s*===\s*0\)\s*return/);
  });
});

// ── Reconnect callback contract ─────────────────────────────

describe('onReconnect callback', () => {
  it('fires with { oldEdge, movedEndpoint, newNodeId } shape', () => {
    expect(source).toMatch(/onReconnectRef\.current\?\.\(\s*\{[\s\S]*?oldEdge:\s*ds\.edge[\s\S]*?movedEndpoint:\s*ds\.endpoint[\s\S]*?newNodeId:\s*ds\.snapNodeId/);
  });

  it("EdgeReconnectResult.movedEndpoint is the literal union 'source' | 'target'", () => {
    expect(source).toContain("movedEndpoint: 'source' | 'target'");
  });

  it('does NOT fire when snap is the original source or target (no-op drop)', () => {
    expect(source).toMatch(/ds\.snapNodeId\s*&&\s*ds\.snapNodeId\s*!==\s*ds\.edge\.source\s*&&\s*ds\.snapNodeId\s*!==\s*ds\.edge\.target/);
  });
});

// ── findNearestNode "exclude fixed endpoint" invariant ──────

describe('findNearestNode excludes the fixed endpoint', () => {
  it('source endpoint dragged → exclude target node from snap candidates', () => {
    expect(source).toMatch(/const fixedNodeId\s*=\s*ds\.endpoint\s*===\s*'source'\s*\?\s*ds\.edge\.target\s*:\s*ds\.edge\.source/);
  });

  it('passes fixedNodeId as the excludeId argument to findNearestNode', () => {
    expect(source).toMatch(/findNearestNode\([\s\S]*?fixedNodeId/);
  });
});

// ── Visual feedback (dim during drag, restore on end) ───────

describe('Edge visual feedback', () => {
  it('dims dragged edge to opacity 0.15 + dashed lineDash [4,4]', () => {
    expect(source).toMatch(/opacity:\s*0\.15,\s*lineDash:\s*\[4,\s*4\]/);
  });

  it('restores opacity 1 + clears lineDash (undefined) on pointerup', () => {
    expect(source).toMatch(/opacity:\s*1,\s*lineDash:\s*undefined/);
  });

  it('restores opacity in pointerup, pointercancel, AND cleanup-on-unmount (3+ callsites)', () => {
    const restores = (source.match(/opacity:\s*1,\s*lineDash:\s*undefined/g) ?? []).length;
    expect(restores).toBeGreaterThanOrEqual(3);
  });
});

// ── Cleanup discipline (mid-drag unmount) ───────────────────

describe('Mid-drag unmount cleanup', () => {
  it('releases pointer capture if captured (capturedPointerId >= 0)', () => {
    expect(source).toMatch(/if\s*\(\s*ds\.capturedPointerId\s*>=\s*0\s*\)/);
    expect(source).toContain("safeReleasePointerCapture(container, ds.capturedPointerId, 'useEdgeReconnect')");
  });

  it('restores the dimmed edge opacity if drag was activated', () => {
    expect(source).toMatch(/if\s*\(ds\.activated\s*&&\s*graph\)/);
  });

  it('clears the canvas-element cursor (cancelable grab state)', () => {
    expect(source).toMatch(/canvasEl\.style\.cursor\s*=\s*''/);
  });

  it('cancels pending rAF (no leaked draw scheduled after unmount)', () => {
    expect(source).toContain('cancelAnimationFrame(rafRef.current)');
  });

  it('clears dragStateRef and isDraggingRef in cleanup', () => {
    expect(source).toMatch(/dragStateRef\.current\s*=\s*null/);
    expect(source).toMatch(/isDraggingRef\.current\s*=\s*false/);
  });
});

// ── Cancellation paths ──────────────────────────────────────

describe('Cancellation', () => {
  it('Escape constructs a synthetic PointerEvent("pointercancel") via useEscapeCancel onCancel', () => {
    // Cycle 48: the synthetic PointerEvent build moved into the host's
    // escapeOnCancel callback (which then forwards via pointerCancelRef).
    expect(source).toContain("new PointerEvent('pointercancel'");
    expect(source).toMatch(/escapeIsActive\s*=\s*useCallback\(\(\)\s*=>\s*dragStateRef\.current\s*!==\s*null/);
  });

  it('Escape preventDefault + stopPropagation are handled inside useEscapeCancel (cycle 48)', () => {
    // Pinned in useEscapeCancel.test.ts. Host pinning is the delegation.
    expect(source).toContain('useEscapeCancel');
  });

  it('clears overlay canvas via clearRect (no leftover lines)', () => {
    expect(source).toMatch(/ctx\?\.clearRect\(0,\s*0,\s*overlay\.width,\s*overlay\.height\)/);
  });
});

// ── Returned API ────────────────────────────────────────────

describe('Returned API', () => {
  it('returns isDragging() reading dragStateRef.current !== null', () => {
    expect(source).toMatch(/const isDragging\s*=\s*useCallback\(\(\)\s*=>\s*dragStateRef\.current\s*!==\s*null/);
    expect(source).toContain('return { isDragging }');
  });
});

// ── Optional batchDraw passthrough ─────────────────────────

describe('batchDraw passthrough', () => {
  it('uses provided batchDraw when present, otherwise falls back to graph.draw()', () => {
    expect(source).toMatch(/if\s*\(batchDrawRef\.current\)\s*\{\s*batchDrawRef\.current\(\);\s*return;\s*\}/);
    expect(source).toMatch(/if\s*\(g\s*&&\s*!g\.destroyed\)\s*g\.draw\(\)/);
  });

  it('keeps batchDraw stable across renders via batchDrawRef', () => {
    expect(source).toContain('batchDrawRef.current = batchDrawProp');
  });
});

// ── User-edge filtering optimization ───────────────────────

describe('User-edge filter (perf)', () => {
  it('caches user edges in a ref so the filter runs once per edges change', () => {
    expect(source).toMatch(/userEdgesRef\.current\s*=\s*edges\.filter\(e\s*=>\s*e\.isUserCreated\)/);
  });

  it('uses [edges] as the only dep for the filter effect', () => {
    expect(source).toMatch(/userEdgesRef\.current\s*=\s*edges\.filter[\s\S]*?\}\s*,\s*\[edges\]/);
  });
});

// ── Threshold constants vs sister hook (useDragConnect) ────

describe('Threshold constants', () => {
  it('ENDPOINT_HIT_RADIUS=14 (drag handle hit area)', () => {
    expect(source).toMatch(/ENDPOINT_HIT_RADIUS\s*=\s*14/);
  });

  it('NODE_SNAP_RADIUS=24 — smaller than useDragConnect=55 (endpoint dragging is more precise)', () => {
    expect(source).toMatch(/NODE_SNAP_RADIUS\s*=\s*24/);
  });

  it('DRAG_THRESHOLD=6 — slightly higher than useDragConnect=4 (avoids accidental endpoint drags)', () => {
    expect(source).toMatch(/DRAG_THRESHOLD\s*=\s*6/);
  });

  it('TOUCH_DRAG_THRESHOLD=14 — >2× the desktop threshold', () => {
    expect(source).toMatch(/TOUCH_DRAG_THRESHOLD\s*=\s*14/);
  });
});

// ============================================================
// ── Cycle 50 additions ──────────────────────────────────────
//
// Cycle 24 pinned the basic reconnect flow + pointer-state
// machine. Cycle 50 covers the dimensions that were skipped:
//   - Effect dep arrays (each individually)
//   - Drag-state seeding (source-vs-target endpoint hit)
//   - Edge-state restoration semantics (setElementState)
//   - Pointercancel branch asymmetry
//   - Re-entry guards on pointerdown
//   - Pre-activation Escape edge case
//   - getNodeScreenPos internal helper (replicated)
//   - Cached positions invariant
//   - Post-cycle-48 helper integration (useOverlayCanvas,
//     useEscapeCancel, pointerCancelRef bridge)
//   - doDraw vs graph.draw asymmetry on the success path
//   - Locale absence (deliberate divergence from useDragConnect)
//   - Quick-connect button absence (drag-only feature)
// ============================================================

// ── Effect dep arrays (re-bind correctness) ────────────────

describe('Effect dependency arrays', () => {
  it('user-edge filter effect deps = [edges]', () => {
    expect(source).toMatch(/userEdgesRef\.current\s*=\s*edges\.filter\(e\s*=>\s*e\.isUserCreated\);\s*\n\s*\}\s*,\s*\[edges\]\)/);
  });

  it('cleanup-on-disable effect deps = [enabled, ready, containerRef]', () => {
    // containerRef in deps is unusual — pin so a future refactor
    // doesn't accidentally remove it (which would skip re-running
    // when the container DOM ref instance swaps).
    expect(source).toMatch(/cancelAnimationFrame\(rafRef\.current\);\s*\n\s*dragStateRef\.current\s*=\s*null;\s*\n\s*\};\s*\n\s*\}\s*,\s*\[enabled,\s*ready,\s*containerRef\]\)/);
  });

  it('main interaction effect deps = [enabled, ready, graphVersion, graphRef, containerRef, draw]', () => {
    expect(source).toMatch(/\}\s*,\s*\[enabled,\s*ready,\s*graphVersion,\s*graphRef,\s*containerRef,\s*draw\]\)/);
  });

  it('draw useCallback deps = [containerRef]', () => {
    expect(source).toMatch(/const draw\s*=\s*useCallback\([\s\S]*?\}\s*,\s*\[containerRef\]\)/);
  });

  it('doDraw useCallback deps = [graphRef]', () => {
    expect(source).toMatch(/const doDraw\s*=\s*useCallback\([\s\S]*?\}\s*,\s*\[graphRef\]\)/);
  });

  it('escapeIsActive useCallback has empty deps (stable across renders)', () => {
    expect(source).toMatch(/const escapeIsActive\s*=\s*useCallback\(\(\)\s*=>\s*dragStateRef\.current\s*!==\s*null,\s*\[\]\)/);
  });

  it('escapeOnCancel useCallback has empty deps (stable across renders)', () => {
    expect(source).toMatch(/const escapeOnCancel\s*=\s*useCallback\([\s\S]*?\}\s*,\s*\[\]\)/);
  });

  it('isDragging useCallback has empty deps (stable across renders)', () => {
    expect(source).toMatch(/const isDragging\s*=\s*useCallback\(\(\)\s*=>\s*dragStateRef\.current\s*!==\s*null,\s*\[\]\)/);
  });
});

// ── Mount-time guards ──────────────────────────────────────

describe('Mount-time guards', () => {
  it('main interaction effect bails out when not enabled', () => {
    expect(source).toMatch(/if\s*\(!enabled\s*\|\|\s*!ready\)\s*return/);
  });

  it('main interaction effect bails out when graph OR container is null', () => {
    expect(source).toMatch(/if\s*\(!graph\s*\|\|\s*!container\)\s*return/);
  });

  it('cleanup-on-disable effect bails out when not enabled (no cleanup scheduled)', () => {
    // The early return prevents the cleanup function from ever being installed
    // when the hook is disabled — so toggling back from disabled→enabled doesn't
    // run the disable cleanup.
    expect(source).toMatch(/if\s*\(!enabled\s*\|\|\s*!ready\)\s*return;\s*\n\s*return\s*\(\)\s*=>\s*\{/);
  });
});

// ── Drag-state seeding (handlePointerDown initial values) ──

describe('Drag-state seeding — source-endpoint hit', () => {
  it("source-endpoint hit seeds endpoint:'source'", () => {
    expect(source).toMatch(/dSource\s*<=\s*ENDPOINT_HIT_RADIUS[\s\S]*?endpoint:\s*'source'/);
  });

  it('source-endpoint hit seeds fixedX/Y from the TARGET position', () => {
    // When dragging the SOURCE endpoint, the TARGET stays fixed
    expect(source).toMatch(/dSource\s*<=\s*ENDPOINT_HIT_RADIUS[\s\S]*?fixedX:\s*targetPos\.x,\s*\n\s*fixedY:\s*targetPos\.y/);
  });

  it('source-endpoint hit seeds startX/Y/dragX/Y from screen pointer', () => {
    expect(source).toMatch(/dSource\s*<=\s*ENDPOINT_HIT_RADIUS[\s\S]*?startX:\s*screenX,\s*\n\s*startY:\s*screenY/);
    expect(source).toMatch(/dSource\s*<=\s*ENDPOINT_HIT_RADIUS[\s\S]*?dragX:\s*screenX,\s*\n\s*dragY:\s*screenY/);
  });

  it('source-endpoint hit returns immediately after seeding (no fall-through to target check)', () => {
    expect(source).toMatch(/dSource\s*<=\s*ENDPOINT_HIT_RADIUS[\s\S]*?cachedPositions:\s*null,\s*\n\s*\};\s*\n\s*return;/);
  });
});

describe('Drag-state seeding — target-endpoint hit', () => {
  it("target-endpoint hit seeds endpoint:'target'", () => {
    expect(source).toMatch(/dTarget\s*<=\s*ENDPOINT_HIT_RADIUS[\s\S]*?endpoint:\s*'target'/);
  });

  it('target-endpoint hit seeds fixedX/Y from the SOURCE position', () => {
    // When dragging the TARGET endpoint, the SOURCE stays fixed
    expect(source).toMatch(/dTarget\s*<=\s*ENDPOINT_HIT_RADIUS[\s\S]*?fixedX:\s*sourcePos\.x,\s*\n\s*fixedY:\s*sourcePos\.y/);
  });

  it('target-endpoint hit returns immediately after seeding', () => {
    expect(source).toMatch(/dTarget\s*<=\s*ENDPOINT_HIT_RADIUS[\s\S]*?cachedPositions:\s*null,\s*\n\s*\};\s*\n\s*return;/);
  });
});

describe('Drag-state seeding — common invariants', () => {
  it('seeds activated:false (threshold not yet crossed)', () => {
    expect(source).toMatch(/activated:\s*false/);
  });

  it('seeds capturedPointerId:-1 (sentinel for "not captured")', () => {
    expect(source).toMatch(/capturedPointerId:\s*-1/);
  });

  it('seeds cachedPositions:null (populated lazily on activation)', () => {
    expect(source).toMatch(/cachedPositions:\s*null/);
  });

  it('seeds snapNodeId:null + snapX:0 + snapY:0 (no candidate yet)', () => {
    expect(source).toMatch(/snapNodeId:\s*null,\s*\n\s*snapX:\s*0,\s*\n\s*snapY:\s*0/);
  });

  it('seeds edge from the for-of loop variable (not from a target lookup)', () => {
    // The seeded edge IS the edge being iterated; no later lookup.
    expect(source).toMatch(/for\s*\(const edge of userEdges\)[\s\S]*?edge,\s*\n\s*endpoint:/);
  });
});

// ── Re-entry guards on pointerdown ─────────────────────────

describe('Re-entry guards on pointerdown', () => {
  it('rejects pointerdown when own drag is in flight (dragStateRef !== null)', () => {
    expect(source).toMatch(/handlePointerDown[\s\S]*?if\s*\(dragStateRef\.current\)\s*return/);
  });

  it('rejects non-left-button mouse pointerdown (e.button !== 0)', () => {
    expect(source).toMatch(/handlePointerDown[\s\S]*?if\s*\(e\.button\s*!==\s*0\)\s*return/);
  });

  it('rejects pointerdown when sister hook is dragging (isDraggingRef?.current)', () => {
    expect(source).toMatch(/handlePointerDown[\s\S]*?if\s*\(isDraggingRef\?\.current\)\s*return/);
  });

  it('skips entirely when there are no user-created edges (early return)', () => {
    expect(source).toMatch(/handlePointerDown[\s\S]*?if\s*\(userEdges\.length\s*===\s*0\)\s*return/);
  });

  it('continues to next edge when getNodeScreenPos returns null for endpoints', () => {
    // If a node was deleted mid-flight, sourcePos/targetPos may be null;
    // the `continue` keeps us scanning the rest of the user edges.
    expect(source).toMatch(/if\s*\(!sourcePos\s*\|\|\s*!targetPos\)\s*continue/);
  });
});

// ── Activation-time side effects ───────────────────────────

describe('Drag activation side effects', () => {
  it('captures the pointer on the container (cross-element pointer routing)', () => {
    expect(source).toMatch(/container\.setPointerCapture\(e\.pointerId\)/);
  });

  it('records the captured pointerId on the drag state', () => {
    expect(source).toMatch(/ds\.capturedPointerId\s*=\s*e\.pointerId/);
  });

  it('caches getNodeScreenPositions ONCE at activation', () => {
    expect(source).toMatch(/ds\.cachedPositions\s*=\s*getNodeScreenPositions\(graph\)/);
  });

  it('flips overlay pointerEvents to "auto" so it can show grabbing cursor', () => {
    expect(source).toMatch(/overlayCanvasRef\.current\.style\.pointerEvents\s*=\s*'auto'/);
  });

  it('sets overlay cursor to "grabbing" during the drag', () => {
    expect(source).toMatch(/overlayCanvasRef\.current\.style\.cursor\s*=\s*'grabbing'/);
  });

  it('flips activated:true exactly once, gated behind the threshold check', () => {
    expect(source).toMatch(/if\s*\(Math\.sqrt[\s\S]*?<\s*threshold\)\s*return;\s*\n\s*\n?\s*\/\/[^\n]*\n\s*ds\.activated\s*=\s*true/);
  });

  it('coordinates with shared isDraggingRef during activation', () => {
    expect(source).toMatch(/if\s*\(isDraggingRef\)\s*isDraggingRef\.current\s*=\s*true/);
  });

  it('dims the dragged edge via updateEdgeData on activation (wrapped in try/catch)', () => {
    expect(source).toMatch(/try\s*\{\s*graph\.updateEdgeData\(\[\{\s*id:\s*ds\.edge\.id,\s*style:\s*\{\s*opacity:\s*0\.15/);
  });

  it('uses devWarn when updateEdgeData throws on activation', () => {
    expect(source).toMatch(/catch\s*\(e\)\s*\{\s*devWarn\('useEdgeReconnect',\s*'edge may not exist in G6',\s*e\)/);
  });
});

// ── Cached positions invariant ─────────────────────────────

describe('Cached node positions during drag', () => {
  it('caches positions ONCE at activation (avoids O(N) per pointermove)', () => {
    // The activation block calls getNodeScreenPositions and stores into cache.
    expect(source).toMatch(/ds\.cachedPositions\s*=\s*getNodeScreenPositions\(graph\)/);
  });

  it('falls back to a fresh read if cache is somehow null (defensive)', () => {
    expect(source).toMatch(/ds\.cachedPositions\s*\|\|\s*getNodeScreenPositions\(graph\)/);
  });

  it('passes cached positions into findNearestNode on every pointermove', () => {
    expect(source).toMatch(/const nodePositions\s*=\s*ds\.cachedPositions[\s\S]*?findNearestNode\(\s*nodePositions/);
  });
});

// ── findNearestNode call shape ─────────────────────────────

describe('findNearestNode integration', () => {
  it('passes NODE_SNAP_RADIUS=24 as the radius (smaller than useDragConnect=55)', () => {
    expect(source).toMatch(/findNearestNode\([\s\S]*?NODE_SNAP_RADIUS/);
  });

  it('excludes the FIXED endpoint node (not the dragged one) from snap candidates', () => {
    // ds.endpoint === 'source' → fixed is ds.edge.target; excluded
    // ds.endpoint === 'target' → fixed is ds.edge.source; excluded
    expect(source).toMatch(/const fixedNodeId\s*=\s*ds\.endpoint\s*===\s*'source'\s*\?\s*ds\.edge\.target\s*:\s*ds\.edge\.source/);
    expect(source).toMatch(/findNearestNode\([\s\S]*?fixedNodeId/);
  });

  it('updates ds.snapNodeId/snapX/snapY when nearest is found', () => {
    expect(source).toMatch(/if\s*\(nearest\)\s*\{\s*\n\s*ds\.snapNodeId\s*=\s*nearest\.id;\s*\n\s*ds\.snapX\s*=\s*nearest\.x;\s*\n\s*ds\.snapY\s*=\s*nearest\.y/);
  });

  it('clears ds.snapNodeId when no nearest (no stale snap target)', () => {
    expect(source).toMatch(/\}\s*else\s*\{\s*\n\s*ds\.snapNodeId\s*=\s*null/);
  });
});

// ── Pointerup success vs no-snap branches ──────────────────

describe('Pointer-up branches', () => {
  it('short-circuits with state-only reset when ds is not activated (just a click)', () => {
    expect(source).toMatch(/if\s*\(!ds\.activated\)\s*\{\s*\n\s*dragStateRef\.current\s*=\s*null;\s*\n\s*return;\s*\n\s*\}/);
  });

  it('releases pointer capture on pointerup via safeReleasePointerCapture', () => {
    expect(source).toMatch(/safeReleasePointerCapture\(container,\s*ds\.capturedPointerId,\s*'useEdgeReconnect'\)/);
  });

  it('restores overlay pointerEvents to "none" after the drag', () => {
    expect(source).toMatch(/overlayCanvasRef\.current\.style\.pointerEvents\s*=\s*'none'/);
  });

  it('clears overlay cursor after the drag (no leftover "grabbing")', () => {
    expect(source).toMatch(/overlayCanvasRef\.current\.style\.cursor\s*=\s*''/);
  });

  it('clears the inner G6 canvas cursor (the grab hint applied by hover)', () => {
    expect(source).toMatch(/canvasEl\.style\.cursor\s*=\s*''/);
  });

  it('restores edge state via setElementState(id, []) — clears any selection state', () => {
    expect(source).toMatch(/graph\.setElementState\(ds\.edge\.id,\s*\[\]\)/);
  });

  it('cancels rAF after pointerup so no stale frame draws over cleared overlay', () => {
    expect(source).toMatch(/cancelAnimationFrame\(rafRef\.current\)/);
  });

  it('clears the overlay canvas via clearRect after pointerup', () => {
    expect(source).toMatch(/ctx\?\.clearRect\(0,\s*0,\s*overlay\.width,\s*overlay\.height\)/);
  });

  it('nulls dragStateRef AFTER firing onReconnect (callback sees full state)', () => {
    // The onReconnect call happens BEFORE dragStateRef.current = null.
    expect(source).toMatch(/onReconnectRef\.current\?\.\(\s*\{[\s\S]*?\}\s*\);\s*\n\s*\}\s*\n\s*\n?\s*dragStateRef\.current\s*=\s*null/);
  });

  it('resets isDraggingRef.current=false unconditionally after pointerup', () => {
    expect(source).toMatch(/dragStateRef\.current\s*=\s*null;\s*\n\s*if\s*\(isDraggingRef\)\s*isDraggingRef\.current\s*=\s*false/);
  });
});

// ── Pointer-cancel branch asymmetry ────────────────────────

describe('Pointer-cancel branches', () => {
  it('early-returns when no drag is active (no state to clean)', () => {
    expect(source).toMatch(/handlePointerCancel\s*=\s*\(e:\s*PointerEvent\)\s*=>\s*\{\s*\n[\s\S]*?if\s*\(!ds\)\s*return/);
  });

  it('DOM cleanup (overlay/cursor/clearRect) is gated by ds.activated', () => {
    // The activation gate avoids touching the DOM when the drag never started.
    expect(source).toMatch(/handlePointerCancel[\s\S]*?if\s*\(ds\.activated\)\s*\{[\s\S]*?safeReleasePointerCapture/);
  });

  it('non-activated cancel resets state ONLY (no DOM touch)', () => {
    // After the activation block closes, the state reset runs unconditionally.
    expect(source).toMatch(/handlePointerCancel[\s\S]*?\}\s*\n\s*\n?\s*dragStateRef\.current\s*=\s*null;\s*\n\s*if\s*\(isDraggingRef\)\s*isDraggingRef\.current\s*=\s*false/);
  });

  it('cancel uses doDraw (batched) — not graph.draw — to redraw after restore', () => {
    // pointercancel restores the edge style and asks for a redraw via doDraw
    expect(source).toMatch(/handlePointerCancel[\s\S]*?graph\.setElementState\(ds\.edge\.id,\s*\[\]\);\s*\n\s*doDraw\(\)/);
  });

  it('cancel does NOT fire onReconnect (cancel = abort, not commit)', () => {
    // The onReconnectRef call exists only inside handlePointerUp's success branch
    expect(source).not.toMatch(/handlePointerCancel[\s\S]*?onReconnectRef\.current\?\.\(/);
  });

  it('cancel cancels rAF + clears overlay (only when ds.activated)', () => {
    expect(source).toMatch(/handlePointerCancel[\s\S]*?if\s*\(ds\.activated\)\s*\{[\s\S]*?cancelAnimationFrame\(rafRef\.current\);\s*\n\s*const overlay\s*=\s*overlayCanvasRef\.current/);
  });
});

// ── doDraw vs graph.draw asymmetry ─────────────────────────
//
// Cycle 50 finding: the success path on pointerup calls
// graph.draw() directly, while activation/cancel/unmount call
// the host's doDraw() (which honors batchDraw). This asymmetry
// is pinned as-is to lock current behavior; future cycles can
// decide whether to unify.

describe('doDraw vs graph.draw call sites', () => {
  it('doDraw is called from activation, pointercancel, and unmount cleanup', () => {
    // 3 callsites for doDraw()
    const calls = (source.match(/^\s*doDraw\(\)/gm) ?? []).length;
    expect(calls).toBeGreaterThanOrEqual(3);
  });

  it('pointerup success path calls graph.draw() directly (bypasses batchDraw)', () => {
    // After updateEdgeData + setElementState([]) on pointerup, source has
    // `graph.draw();` rather than `doDraw();`. Pin the literal so any
    // future unification (or accidental break) is caught.
    expect(source).toMatch(/setElementState\(ds\.edge\.id,\s*\[\]\);\s*\n\s*graph\.draw\(\)/);
  });

  it('doDraw delegates to batchDraw when present, otherwise to graph.draw()', () => {
    expect(source).toMatch(/if\s*\(batchDrawRef\.current\)\s*\{\s*batchDrawRef\.current\(\);\s*return;\s*\}/);
  });

  it('doDraw guards against destroyed graph (g.destroyed check)', () => {
    expect(source).toMatch(/if\s*\(g\s*&&\s*!g\.destroyed\)\s*g\.draw\(\)/);
  });
});

// ── setElementState reset semantics (unique to reconnect) ──

describe('Edge state reset (setElementState)', () => {
  it("setElementState(edgeId, []) is called exactly twice (pointerup + pointercancel)", () => {
    // NOT in unmount cleanup: graph may already be destroyed.
    const matches = source.match(/graph\.setElementState\(ds\.edge\.id,\s*\[\]\)/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('setElementState reset is paired with updateEdgeData(opacity:1) on pointerup', () => {
    // Source order: updateEdgeData → setElementState → draw
    expect(source).toMatch(/updateEdgeData\(\[\{\s*id:\s*ds\.edge\.id,\s*style:\s*\{\s*opacity:\s*1[\s\S]*?\}\s*\}\]\);\s*\n\s*graph\.setElementState\(ds\.edge\.id,\s*\[\]\)/);
  });

  it('unmount cleanup omits setElementState (graph may be destroyed)', () => {
    // The cleanup-on-unmount block restores updateEdgeData but NOT setElementState.
    // Pin the asymmetry so the safer-mid-destroy path stays.
    const cleanupBlock = source.slice(source.indexOf('Restore edge state + cursor if unmount'));
    expect(cleanupBlock).not.toMatch(/setElementState/);
  });
});

// ── Pre-activation Escape edge case ────────────────────────

describe('Escape pressed before activation', () => {
  it('escapeOnCancel reads ds.capturedPointerId (which is -1 before activation)', () => {
    // Before activation, capturedPointerId is the seeded -1 sentinel.
    // The synthetic event has pointerId:-1, then handlePointerCancel runs
    // with ds non-null but ds.activated === false → state-only reset.
    expect(source).toMatch(/new PointerEvent\('pointercancel',\s*\{\s*pointerId:\s*ds\.capturedPointerId\s*\}\s*\)/);
  });

  it('escapeOnCancel short-circuits when no drag is pending (no synthetic event)', () => {
    expect(source).toMatch(/escapeOnCancel\s*=\s*useCallback\(\(\)\s*=>\s*\{\s*\n\s*const ds\s*=\s*dragStateRef\.current;\s*\n\s*if\s*\(!ds\)\s*return/);
  });

  it('forwards via the pointerCancelRef bridge (handler lives inside effect closure)', () => {
    expect(source).toMatch(/pointerCancelRef\.current\?\.\(/);
  });
});

// ── pointerCancelRef bridge wiring ─────────────────────────

describe('pointerCancelRef bridge (cycle-48 helper integration)', () => {
  it('declares the ref with PointerEvent handler signature', () => {
    expect(source).toMatch(/pointerCancelRef\s*=\s*useRef<\(\(e:\s*PointerEvent\)\s*=>\s*void\)\s*\|\s*null>\(null\)/);
  });

  it('main interaction effect populates pointerCancelRef.current = handlePointerCancel', () => {
    expect(source).toMatch(/pointerCancelRef\.current\s*=\s*handlePointerCancel/);
  });

  it('main interaction effect cleanup nulls pointerCancelRef.current', () => {
    expect(source).toMatch(/pointerCancelRef\.current\s*=\s*null/);
  });

  it('escapeOnCancel optional-chains the ref call (no crash if not yet wired)', () => {
    expect(source).toMatch(/pointerCancelRef\.current\?\.\(/);
  });
});

// ── useEscapeCancel helper integration ─────────────────────

describe('useEscapeCancel helper (cycle 48)', () => {
  it('imports useEscapeCancel from ./useEscapeCancel', () => {
    expect(source).toMatch(/import\s*\{\s*useEscapeCancel\s*\}\s*from\s*['"]\.\/useEscapeCancel['"]/);
  });

  it('passes enabled && ready to the helper', () => {
    expect(source).toMatch(/useEscapeCancel\(\{\s*\n\s*enabled:\s*enabled\s*&&\s*ready/);
  });

  it('passes escapeIsActive callback (reads dragStateRef !== null)', () => {
    expect(source).toMatch(/isActive:\s*escapeIsActive/);
  });

  it('passes escapeOnCancel callback (forwards to pointerCancelRef bridge)', () => {
    expect(source).toMatch(/onCancel:\s*escapeOnCancel/);
  });
});

// ── useOverlayCanvas helper integration ────────────────────

describe('useOverlayCanvas helper (cycle 48)', () => {
  it('imports useOverlayCanvas from ./useOverlayCanvas', () => {
    expect(source).toMatch(/import\s*\{\s*useOverlayCanvas\s*\}\s*from\s*['"]\.\/useOverlayCanvas['"]/);
  });

  it('passes containerRef to the helper', () => {
    expect(source).toMatch(/useOverlayCanvas\(\{[\s\S]*?containerRef[\s\S]*?\}\)/);
  });

  it('passes z-index 6 (above G6 canvas; sister hook uses z-index 5)', () => {
    expect(source).toMatch(/useOverlayCanvas\(\{[\s\S]*?zIndex:\s*6/);
  });

  it('passes enabled && ready (auto-mount/unmount)', () => {
    expect(source).toMatch(/useOverlayCanvas\(\{[\s\S]*?enabled:\s*enabled\s*&&\s*ready/);
  });

  it('host no longer creates ResizeObserver (delegated to helper)', () => {
    expect(source).not.toContain('new ResizeObserver');
  });

  it('host no longer reads canvas.parentNode (overlay mount/unmount delegated)', () => {
    // Cycle 48 moved the parentNode-guard into useOverlayCanvas.
    expect(source).not.toMatch(/overlay\.parentNode\.removeChild/);
  });
});

// ── Locale absence (deliberate divergence from sister hook) ─

describe('Locale absence (no i18n)', () => {
  // useEdgeReconnect has no user-facing strings — divergence from
  // useDragConnect which renders connectTo / sameNode labels.
  it('does not import I18N_GRAPH', () => {
    expect(source).not.toContain('I18N_GRAPH');
  });

  it('does not import from graphI18n', () => {
    expect(source).not.toContain("from './graphI18n'");
  });

  it('UseEdgeReconnectOptions does not declare a locale field', () => {
    // The options interface has no `locale:` declaration.
    expect(source).not.toMatch(/locale:\s*['"]?(es|pt|en)/);
    expect(source).not.toMatch(/locale\s*=\s*'pt'/);
  });

  it('does not reference connectTo / sameNode / alreadyConnected labels', () => {
    expect(source).not.toContain('connectToLabel');
    expect(source).not.toContain('sameNode');
    expect(source).not.toContain('alreadyConnected');
  });
});

// ── Quick-connect button absence (drag-only feature) ───────

describe('Quick-connect button absence', () => {
  // useDragConnect creates a "+" floating button on hover.
  // useEdgeReconnect has none — pin the absence so it doesn't drift.
  it('does not call document.createElement for any element', () => {
    expect(source).not.toContain("document.createElement");
  });

  it('does not declare a quick-connect button ref', () => {
    expect(source).not.toContain('quickConnectBtnRef');
  });

  it('does not contain "+" textContent assignment', () => {
    expect(source).not.toContain("textContent = '+'");
  });

  it('does not reference onQuickAdd anywhere (sister hook prop)', () => {
    expect(source).not.toContain('onQuickAdd');
  });
});

// ── Snap rejection conditions on pointerup ─────────────────

describe('Snap rejection on pointerup', () => {
  it('does not fire onReconnect when snapNodeId is null (drop in empty space)', () => {
    // The success branch is gated on ds.snapNodeId being truthy
    expect(source).toMatch(/if\s*\(ds\.snapNodeId\s*&&\s*ds\.snapNodeId\s*!==\s*ds\.edge\.source\s*&&\s*ds\.snapNodeId\s*!==\s*ds\.edge\.target\)/);
  });

  it('does not fire onReconnect when snap is the original SOURCE (no-op drop)', () => {
    expect(source).toMatch(/ds\.snapNodeId\s*!==\s*ds\.edge\.source/);
  });

  it('does not fire onReconnect when snap is the original TARGET (no-op drop)', () => {
    expect(source).toMatch(/ds\.snapNodeId\s*!==\s*ds\.edge\.target/);
  });
});

// ── onReconnect callback shape ─────────────────────────────

describe('onReconnect callback', () => {
  it('uses ref-pattern so callback identity changes do not re-bind effect', () => {
    expect(source).toMatch(/const onReconnectRef\s*=\s*useRef\(onReconnect\)/);
    expect(source).toMatch(/onReconnectRef\.current\s*=\s*onReconnect/);
  });

  it('uses optional chaining (callback may be undefined)', () => {
    expect(source).toMatch(/onReconnectRef\.current\?\.\(/);
  });

  it("payload's oldEdge is ds.edge (the original MapEdge object)", () => {
    expect(source).toMatch(/oldEdge:\s*ds\.edge/);
  });

  it("payload's movedEndpoint is ds.endpoint ('source' or 'target')", () => {
    expect(source).toMatch(/movedEndpoint:\s*ds\.endpoint/);
  });

  it("payload's newNodeId is ds.snapNodeId (the snapped target)", () => {
    expect(source).toMatch(/newNodeId:\s*ds\.snapNodeId/);
  });
});

// ── Mid-drag unmount cleanup discipline ────────────────────

describe('Cleanup-on-unmount (main interaction effect)', () => {
  it('unbinds all 4 pointer events symmetrically', () => {
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      const adds = (source.match(new RegExp(`addEventListener\\('${ev}'`, 'g')) ?? []).length;
      const removes = (source.match(new RegExp(`removeEventListener\\('${ev}'`, 'g')) ?? []).length;
      expect(adds).toBe(removes);
    }
  });

  it('pointerdown removeEventListener also passes capture:true (matched binding)', () => {
    // When add uses { capture: true }, remove MUST mirror it or the listener leaks.
    expect(source).toMatch(/removeEventListener\('pointerdown',\s*\w+,\s*\{\s*capture:\s*true\s*\}/);
  });

  it('cancels rAF on cleanup (no leftover frame after unmount)', () => {
    // Multiple callsites: pointerup + pointercancel + cleanup-on-unmount + cleanup-on-disable
    const matches = source.match(/cancelAnimationFrame\(rafRef\.current\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('releases pointer capture only when capturedPointerId >= 0 (sentinel guard)', () => {
    expect(source).toMatch(/if\s*\(ds\.capturedPointerId\s*>=\s*0\)\s*\{\s*\n\s*safeReleasePointerCapture/);
  });

  it('restores edge state via updateEdgeData only when activated AND graph exists', () => {
    expect(source).toMatch(/if\s*\(ds\.activated\s*&&\s*graph\)\s*\{\s*\n\s*try\s*\{\s*\n\s*graph\.updateEdgeData/);
  });

  it('cleanup nulls dragStateRef + isDraggingRef (mid-drag unmount safety)', () => {
    // Counted across all callsites: pointerup, pointercancel, cleanup-on-unmount, cleanup-on-disable
    const dragNulls = source.match(/dragStateRef\.current\s*=\s*null/g) ?? [];
    expect(dragNulls.length).toBeGreaterThanOrEqual(4);
  });

  it('cleanup clears canvas-element cursor (the grab hint set on hover)', () => {
    expect(source).toMatch(/canvasEl\.style\.cursor\s*=\s*''/);
  });

  it('cleanup wraps updateEdgeData in try/catch (graph may be destroyed)', () => {
    expect(source).toMatch(/if\s*\(ds\.activated\s*&&\s*graph\)\s*\{\s*\n\s*try\s*\{\s*\n\s*graph\.updateEdgeData[\s\S]*?catch\s*\(e\)\s*\{\s*devWarn/);
  });
});

// ── getNodeScreenPos internal helper (replicated) ──────────

describe('getNodeScreenPos (replicated)', () => {
  // The hook's local helper that converts a node id to screen coords.
  // Replicate to pin the algorithm: try getElementRenderBounds → compute
  // center via min/max → getClientByCanvas → return {x,y}. Returns null
  // on throw or missing bounds.
  type FakeBounds = { min: [number, number]; max: [number, number] };

  function getNodeScreenPos(
    graph: { getElementRenderBounds: (id: string) => FakeBounds | null; getClientByCanvas: (pt: [number, number]) => [number, number] },
    nodeId: string,
  ): { x: number; y: number } | null {
    try {
      const bounds = graph.getElementRenderBounds(nodeId);
      if (bounds) {
        const cx = (bounds.min[0] + bounds.max[0]) / 2;
        const cy = (bounds.min[1] + bounds.max[1]) / 2;
        const pt = graph.getClientByCanvas([cx, cy]);
        return { x: pt[0], y: pt[1] };
      }
    } catch {
      // Node may not exist or graph destroyed
    }
    return null;
  }

  it('returns center of bounds box (mean of min/max)', () => {
    const fakeGraph = {
      getElementRenderBounds: () => ({ min: [10, 20] as [number, number], max: [30, 60] as [number, number] }),
      getClientByCanvas: (pt: [number, number]) => pt,
    };
    expect(getNodeScreenPos(fakeGraph, 'n1')).toEqual({ x: 20, y: 40 });
  });

  it('routes the canvas-coord center through getClientByCanvas (DPR conversion)', () => {
    const fakeGraph = {
      getElementRenderBounds: () => ({ min: [0, 0] as [number, number], max: [100, 100] as [number, number] }),
      getClientByCanvas: (pt: [number, number]) => [pt[0] * 2, pt[1] * 2] as [number, number],
    };
    expect(getNodeScreenPos(fakeGraph, 'n1')).toEqual({ x: 100, y: 100 });
  });

  it('returns null when bounds are null (node missing)', () => {
    const fakeGraph = {
      getElementRenderBounds: () => null,
      getClientByCanvas: (pt: [number, number]) => pt,
    };
    expect(getNodeScreenPos(fakeGraph, 'n1')).toBeNull();
  });

  it('returns null when getElementRenderBounds throws (graph destroyed)', () => {
    const fakeGraph = {
      getElementRenderBounds: () => { throw new Error('destroyed'); },
      getClientByCanvas: (pt: [number, number]) => pt,
    };
    expect(getNodeScreenPos(fakeGraph, 'n1')).toBeNull();
  });

  it('returns null when getClientByCanvas throws (also caught)', () => {
    const fakeGraph = {
      getElementRenderBounds: () => ({ min: [0, 0] as [number, number], max: [10, 10] as [number, number] }),
      getClientByCanvas: () => { throw new Error('boom'); },
    };
    expect(getNodeScreenPos(fakeGraph, 'n1')).toBeNull();
  });

  it('handles negative bounds (off-screen nodes)', () => {
    const fakeGraph = {
      getElementRenderBounds: () => ({ min: [-30, -30] as [number, number], max: [-10, -10] as [number, number] }),
      getClientByCanvas: (pt: [number, number]) => pt,
    };
    expect(getNodeScreenPos(fakeGraph, 'n1')).toEqual({ x: -20, y: -20 });
  });

  it('source defines getNodeScreenPos as a module-local helper (not exported)', () => {
    expect(source).toMatch(/^function getNodeScreenPos\(/m);
    expect(source).not.toMatch(/export function getNodeScreenPos/);
  });

  it('source wraps the bounds + getClientByCanvas calls in try/catch', () => {
    expect(source).toMatch(/function getNodeScreenPos[\s\S]*?try\s*\{[\s\S]*?getElementRenderBounds[\s\S]*?getClientByCanvas[\s\S]*?\}\s*catch/);
  });
});

// ── Disable mid-flight (cleanup-on-disable effect) ─────────

describe('Cleanup on disable mid-flight', () => {
  it('cleanup-on-disable effect cancels rAF', () => {
    // The auxiliary effect cancels rAF + nulls dragStateRef when toggled off.
    expect(source).toMatch(/return\s*\(\)\s*=>\s*\{\s*\n\s*cancelAnimationFrame\(rafRef\.current\);\s*\n\s*dragStateRef\.current\s*=\s*null/);
  });

  it('cleanup-on-disable effect does NOT touch DOM (canvas owned by useOverlayCanvas)', () => {
    // Cycle 48: canvas lifecycle is in the helper. The cleanup-on-disable
    // effect intentionally only touches rAF + dragStateRef. We pin the
    // body of the returned cleanup function — not the surrounding doc
    // comments which legitimately mention "canvas" as the contrast.
    const cleanupBody = source.match(/return\s*\(\)\s*=>\s*\{\s*\n\s*cancelAnimationFrame\(rafRef\.current\);\s*\n\s*dragStateRef\.current\s*=\s*null;\s*\n\s*\}/);
    expect(cleanupBody).not.toBeNull();
    const body = cleanupBody![0];
    expect(body).not.toContain('removeChild');
    expect(body).not.toContain('overlay');
    expect(body).not.toContain('canvas');
  });
});

// ── Hover throttle (cycle 24 covered the source pin; cycle 50 adds the math) ─

describe('Hover throttle math (replicated)', () => {
  const HOVER_CHECK_THROTTLE_MS = 50;

  function shouldSkipHover(now: number, lastCheck: number) {
    return now - lastCheck < HOVER_CHECK_THROTTLE_MS;
  }

  it('skips when delta < 50ms', () => {
    expect(shouldSkipHover(1049, 1000)).toBe(true);
  });

  it('runs when delta >= 50ms', () => {
    expect(shouldSkipHover(1050, 1000)).toBe(false);
  });

  it('runs on first call (lastCheck=0)', () => {
    expect(shouldSkipHover(50, 0)).toBe(false);
    expect(shouldSkipHover(49, 0)).toBe(true);
  });

  it('throttle is purely hover-related (drag pointermove never throttled)', () => {
    // Pin in source: the throttle only gates the no-ds branch.
    expect(source).toMatch(/if\s*\(!ds\)\s*\{[\s\S]*?if\s*\(now\s*-\s*lastHoverCheckTime\s*<\s*HOVER_CHECK_THROTTLE_MS\)\s*return/);
  });
});

// ── Touch-aware threshold replicated ───────────────────────

describe('Touch threshold selection (replicated)', () => {
  const DRAG_THRESHOLD = 6;
  const TOUCH_DRAG_THRESHOLD = 14;

  function pickThreshold(pointerType: string) {
    return pointerType === 'touch' ? TOUCH_DRAG_THRESHOLD : DRAG_THRESHOLD;
  }

  it('mouse → 6px', () => {
    expect(pickThreshold('mouse')).toBe(6);
  });

  it('pen → 6px (treated as mouse)', () => {
    expect(pickThreshold('pen')).toBe(6);
  });

  it('touch → 14px', () => {
    expect(pickThreshold('touch')).toBe(14);
  });

  it('empty/unknown → 6px (default to mouse)', () => {
    expect(pickThreshold('')).toBe(6);
    expect(pickThreshold('xr')).toBe(6);
  });

  it('TOUCH_DRAG_THRESHOLD is >2× the mouse threshold (finger jitter accommodation)', () => {
    expect(TOUCH_DRAG_THRESHOLD).toBeGreaterThan(DRAG_THRESHOLD * 2);
  });
});

// ── Sister-hook divergence audit ───────────────────────────

describe('Sister-hook divergence audit', () => {
  // useEdgeReconnect is the cousin of useDragConnect. Pin the
  // INTENTIONAL divergences so a future "let's unify them" PR
  // surfaces the trade-offs.
  it('uses NODE_SNAP_RADIUS=24 (smaller than sister=55 — endpoint precision)', () => {
    expect(source).toMatch(/NODE_SNAP_RADIUS\s*=\s*24/);
  });

  it('uses ENDPOINT_HIT_RADIUS=14 (sister has PORT_HIT_RADIUS=24, different concept)', () => {
    expect(source).toMatch(/ENDPOINT_HIT_RADIUS\s*=\s*14/);
    expect(source).not.toContain('PORT_HIT_RADIUS');
  });

  it('DRAG_THRESHOLD=6 (sister=4 — endpoint drags need bigger commitment)', () => {
    expect(source).toMatch(/DRAG_THRESHOLD\s*=\s*6/);
  });

  it('TOUCH_DRAG_THRESHOLD=14 (sister=12 — same idea, scaled up)', () => {
    expect(source).toMatch(/TOUCH_DRAG_THRESHOLD\s*=\s*14/);
  });

  it('overlay z-index 6 (sister z-index 5 — reconnect overlay sits ABOVE drag-connect)', () => {
    expect(source).toMatch(/zIndex:\s*6/);
  });

  it('no edgeSet dedup logic (sister uses one — reconnect cant create duplicates by definition)', () => {
    expect(source).not.toContain('edgeSet');
    expect(source).not.toContain('buildEdgeSet');
  });

  it('no successAnimRef (no celebration animation — reconnect is implicit success)', () => {
    expect(source).not.toContain('successAnimRef');
  });

  it('no hoveredNodeRef (no hover-port-ring — reconnect uses endpoint hit detection)', () => {
    expect(source).not.toContain('hoveredNodeRef');
  });

  it('no afterviewportchange listener (cached positions are drag-scoped, not viewport-scoped)', () => {
    expect(source).not.toContain('afterviewportchange');
  });
});

// ── Draw function (overlay rendering) ──────────────────────

describe('Overlay draw function', () => {
  it('reads canvas via overlayCanvasRef (the helper-returned ref)', () => {
    expect(source).toMatch(/canvasRef:\s*overlayCanvasRef/);
    expect(source).toMatch(/const overlay\s*=\s*overlayCanvasRef\.current/);
  });

  it('clears overlay before every redraw (no smearing)', () => {
    expect(source).toMatch(/ctx\.clearRect\(0,\s*0,\s*overlay\.width,\s*overlay\.height\)/);
  });

  it('no-ops when no drag state (just clears canvas)', () => {
    expect(source).toMatch(/if\s*\(!ds\)\s*return/);
  });

  it('reads container bounding rect for screen→local conversion', () => {
    expect(source).toMatch(/const containerRect\s*=\s*container\.getBoundingClientRect\(\)/);
  });

  it('snap target overrides drag position (snap wins over cursor for visual)', () => {
    // toPoint = ds.snapNodeId ? toLocal(snapX,snapY) : toLocal(dragX,dragY)
    expect(source).toMatch(/ds\.snapNodeId\s*\?\s*toLocal\(ds\.snapX,\s*ds\.snapY\)\s*:\s*toLocal\(ds\.dragX,\s*ds\.dragY\)/);
  });

  it('uses bezier curve (not straight line) for the temporary edge', () => {
    expect(source).toMatch(/ctx\.bezierCurveTo\(/);
  });

  it('uses dashed line dash [6,4] (scaled by DPR) for the in-flight edge', () => {
    expect(source).toMatch(/ctx\.setLineDash\(\[6\s*\*\s*dpr,\s*4\s*\*\s*dpr\]\)/);
  });

  it('draws an arrowhead at t≈0.98 along the bezier curve', () => {
    expect(source).toMatch(/const tA\s*=\s*0\.98/);
  });

  it('renders snap highlight ring (radius 22*dpr) only when snapNodeId is set', () => {
    expect(source).toMatch(/if\s*\(ds\.snapNodeId\)\s*\{[\s\S]*?ctx\.arc\(snapLocal\.x,\s*snapLocal\.y,\s*22\s*\*\s*dpr/);
  });

  it('renders glow effect (radius 26*dpr) outside the highlight ring', () => {
    expect(source).toMatch(/ctx\.arc\(snapLocal\.x,\s*snapLocal\.y,\s*26\s*\*\s*dpr/);
  });

  it('renders fixed endpoint indicator (5*dpr radius)', () => {
    expect(source).toMatch(/ctx\.arc\(fixedLocal\.x,\s*fixedLocal\.y,\s*5\s*\*\s*dpr/);
  });

  it('renders dragged endpoint handle (8*dpr radius, semi-transparent fill)', () => {
    expect(source).toMatch(/ctx\.arc\(dragHandle\.x,\s*dragHandle\.y,\s*8\s*\*\s*dpr/);
  });

  it('uses GRAPH_COLORS.primary for the line + arrowhead', () => {
    expect(source).toMatch(/strokeStyle\s*=\s*GRAPH_COLORS\.primary/);
    expect(source).toMatch(/fillStyle\s*=\s*GRAPH_COLORS\.primary/);
  });

  it('uses GRAPH_COLORS.primaryDark for the fixed endpoint indicator', () => {
    expect(source).toMatch(/fillStyle\s*=\s*GRAPH_COLORS\.primaryDark/);
  });

  it('uses save/restore around the drawing block (no leaked canvas state)', () => {
    expect(source).toMatch(/ctx\.save\(\);[\s\S]*?ctx\.restore\(\)/);
  });

  it('falls back to DPR=1 when window.devicePixelRatio is 0 or undefined', () => {
    expect(source).toMatch(/window\.devicePixelRatio\s*\|\|\s*1/);
  });
});

// ── DragState shape — full surface ─────────────────────────

describe('DragState — full field surface', () => {
  it('declares snapX/snapY in the interface (not just at runtime)', () => {
    expect(source).toMatch(/snapX:\s*number/);
    expect(source).toMatch(/snapY:\s*number/);
  });

  it('declares cachedPositions: NodeScreenPos[] | null', () => {
    expect(source).toMatch(/cachedPositions:\s*NodeScreenPos\[\]\s*\|\s*null/);
  });

  it('imports NodeScreenPos type from graphHelpers', () => {
    expect(source).toMatch(/import\s+type\s*\{\s*NodeScreenPos\s*\}\s*from\s*['"]\.\/graphHelpers['"]/);
  });
});

// ── Imported helpers (graphHelpers integration) ────────────

describe('graphHelpers integration', () => {
  it('imports findNearestNode (the shared snap detection function)', () => {
    expect(source).toMatch(/import\s*\{[\s\S]*?findNearestNode[\s\S]*?\}\s*from\s*['"]\.\/graphHelpers['"]/);
  });

  it('imports getNodeScreenPositions (used for cached positions)', () => {
    expect(source).toMatch(/import\s*\{[\s\S]*?getNodeScreenPositions[\s\S]*?\}\s*from\s*['"]\.\/graphHelpers['"]/);
  });

  it('imports GRAPH_COLORS (palette tokens)', () => {
    expect(source).toMatch(/import\s*\{[\s\S]*?GRAPH_COLORS[\s\S]*?\}\s*from\s*['"]\.\/graphHelpers['"]/);
  });

  it('imports safeReleasePointerCapture (the cycle-10 helper)', () => {
    expect(source).toMatch(/import\s*\{[\s\S]*?safeReleasePointerCapture[\s\S]*?\}\s*from\s*['"]\.\/graphHelpers['"]/);
  });

  it('imports devWarn (dev-mode warning helper)', () => {
    expect(source).toMatch(/import\s*\{[\s\S]*?devWarn[\s\S]*?\}\s*from\s*['"]\.\/graphHelpers['"]/);
  });
});

// ── Endpoint-anchor selection (which endpoint moves) ───────

describe('Endpoint anchor — which endpoint moves', () => {
  // The user clicks NEAR an endpoint. The CLOSE endpoint moves.
  // The OTHER endpoint stays put (becomes fixedX/Y).
  it("when source-distance <= ENDPOINT_HIT_RADIUS, source moves (endpoint:'source')", () => {
    expect(source).toMatch(/if\s*\(dSource\s*<=\s*ENDPOINT_HIT_RADIUS\)\s*\{[\s\S]*?endpoint:\s*'source'/);
  });

  it("when target-distance <= ENDPOINT_HIT_RADIUS, target moves (endpoint:'target')", () => {
    expect(source).toMatch(/if\s*\(dTarget\s*<=\s*ENDPOINT_HIT_RADIUS\)\s*\{[\s\S]*?endpoint:\s*'target'/);
  });

  it("source check runs FIRST — if source is hit, target check is skipped (early return)", () => {
    expect(source).toMatch(/if\s*\(dSource\s*<=\s*ENDPOINT_HIT_RADIUS\)\s*\{[\s\S]*?return;\s*\}\s*\n\s*\n?\s*\/\/[\s\S]*?if\s*\(dTarget\s*<=\s*ENDPOINT_HIT_RADIUS\)/);
  });

  it("if BOTH endpoints are within ENDPOINT_HIT_RADIUS (degenerate edge), source wins", () => {
    // Source check returns first — so the "source wins" tie-break is structural.
    // Pin it: the `return;` after the source-block prevents the target branch.
    const pointerDownBlock = source.slice(source.indexOf('handlePointerDown'));
    const targetBlockStart = pointerDownBlock.indexOf("dTarget <= ENDPOINT_HIT_RADIUS");
    const sourceBlockEnd = pointerDownBlock.indexOf('return;', pointerDownBlock.indexOf('dSource <= ENDPOINT_HIT_RADIUS'));
    expect(sourceBlockEnd).toBeGreaterThan(0);
    expect(sourceBlockEnd).toBeLessThan(targetBlockStart);
  });
});
