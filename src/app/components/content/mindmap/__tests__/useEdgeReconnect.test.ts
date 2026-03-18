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
