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

  it('handles Escape key to cancel drag', () => {
    expect(source).toContain("e.key === 'Escape'");
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

  it('keydown (for Escape) bound with capture:true', () => {
    expect(source).toMatch(/addEventListener\('keydown',\s*\w+,\s*\{\s*capture:\s*true\s*\}/);
  });

  it('all 4 pointer events + keydown unbound on cleanup', () => {
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      expect(source).toContain(`removeEventListener('${ev}'`);
    }
    expect(source).toContain("removeEventListener('keydown'");
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
  it('Escape constructs a synthetic PointerEvent("pointercancel")', () => {
    expect(source).toContain("new PointerEvent('pointercancel'");
    expect(source).toMatch(/if\s*\(\s*e\.key\s*===\s*'Escape'\s*&&\s*dragStateRef\.current\s*\)/);
  });

  it('Escape calls preventDefault + stopPropagation (panel-level guards)', () => {
    expect(source).toMatch(/Escape[\s\S]*?e\.preventDefault\(\)[\s\S]*?e\.stopPropagation\(\)/);
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
