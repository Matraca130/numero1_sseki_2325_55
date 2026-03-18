// ============================================================
// Tests — useKeyboardNav (pure helper functions)
//
// The hook itself requires React + G6 runtime, but we can test
// the pure helper functions extracted from it: getNeighborIds,
// direction angles, and focus cycling logic.
//
// We test these by importing the module and verifying the
// exported hook exists, plus simulating the internal logic.
// ============================================================

import { describe, it, expect } from 'vitest';

// ── getNeighborIds (reimplemented for testing) ──────────────

/**
 * Mirror of the internal getNeighborIds function from useKeyboardNav.
 * Build a set of all node IDs connected to a given node (neighbors).
 */
function getNeighborIds(
  nodeId: string,
  edges: Array<{ source: string; target: string }>,
): string[] {
  const neighbors: string[] = [];
  for (const edge of edges) {
    if (edge.source === nodeId) neighbors.push(edge.target);
    if (edge.target === nodeId) neighbors.push(edge.source);
  }
  return neighbors;
}

// ── Direction angle mapping (mirrors internal targetAngle) ──

const TARGET_ANGLES: Record<string, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

/**
 * Simplified version of findNeighborInDirection scoring.
 * Given positions, compute the best neighbor in a direction.
 */
function findBestNeighborByPosition(
  currentPos: { x: number; y: number },
  neighborPositions: Array<{ id: string; x: number; y: number }>,
  direction: 'up' | 'down' | 'left' | 'right',
): string | null {
  const targetAngle = TARGET_ANGLES[direction];
  let bestId: string | null = null;
  let bestScore = Infinity;

  for (const n of neighborPositions) {
    const dx = n.x - currentPos.x;
    const dy = n.y - currentPos.y;
    const angle = Math.atan2(dy, dx);
    let angleDiff = Math.abs(angle - targetAngle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    // Only consider nodes roughly in the right direction (within 90 degrees)
    if (angleDiff > Math.PI / 2) continue;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const score = angleDiff * 100 + dist * 0.1;
    if (score < bestScore) {
      bestScore = score;
      bestId = n.id;
    }
  }

  return bestId;
}

// ── Tab cycling logic (mirrors internal cycling) ────────────

function cycleIndex(currentIndex: number, totalNodes: number, reverse: boolean): number {
  const step = reverse ? -1 : 1;
  return (currentIndex + step + totalNodes) % totalNodes;
}

// ── Tests ───────────────────────────────────────────────────

describe('useKeyboardNav — export check', () => {
  it('exports useKeyboardNav as a function', async () => {
    const mod = await import('../useKeyboardNav');
    expect(mod.useKeyboardNav).toBeDefined();
    expect(typeof mod.useKeyboardNav).toBe('function');
  });
});

describe('getNeighborIds', () => {
  const edges = [
    { source: 'a', target: 'b' },
    { source: 'a', target: 'c' },
    { source: 'b', target: 'd' },
    { source: 'c', target: 'a' }, // a appears as target
  ];

  it('finds all neighbors of a node (both directions)', () => {
    const neighbors = getNeighborIds('a', edges);
    expect(neighbors).toContain('b');
    expect(neighbors).toContain('c');
    // 'a' is also target of edge c->a, so 'c' appears as source neighbor
    expect(neighbors.filter(n => n === 'c')).toHaveLength(2); // once as target, once as source
  });

  it('returns empty array for disconnected node', () => {
    const neighbors = getNeighborIds('z', edges);
    expect(neighbors).toEqual([]);
  });

  it('returns empty array for empty edges', () => {
    const neighbors = getNeighborIds('a', []);
    expect(neighbors).toEqual([]);
  });

  it('finds neighbors from both source and target directions', () => {
    const neighbors = getNeighborIds('d', edges);
    // d is only a target in b->d
    expect(neighbors).toEqual(['b']);
  });
});

describe('Direction angle calculation', () => {
  it('right direction is 0 radians', () => {
    expect(TARGET_ANGLES.right).toBe(0);
  });

  it('down direction is PI/2 radians', () => {
    expect(TARGET_ANGLES.down).toBe(Math.PI / 2);
  });

  it('left direction is PI radians', () => {
    expect(TARGET_ANGLES.left).toBe(Math.PI);
  });

  it('up direction is -PI/2 radians', () => {
    expect(TARGET_ANGLES.up).toBe(-Math.PI / 2);
  });
});

describe('findBestNeighborByPosition', () => {
  const center = { x: 0, y: 0 };

  it('selects node directly to the right', () => {
    const neighbors = [
      { id: 'right', x: 100, y: 0 },
      { id: 'left', x: -100, y: 0 },
    ];
    expect(findBestNeighborByPosition(center, neighbors, 'right')).toBe('right');
  });

  it('selects node directly below for down direction', () => {
    const neighbors = [
      { id: 'up', x: 0, y: -100 },
      { id: 'down', x: 0, y: 100 },
    ];
    expect(findBestNeighborByPosition(center, neighbors, 'down')).toBe('down');
  });

  it('selects node directly to the left', () => {
    const neighbors = [
      { id: 'right', x: 100, y: 0 },
      { id: 'left', x: -100, y: 0 },
    ];
    expect(findBestNeighborByPosition(center, neighbors, 'left')).toBe('left');
  });

  it('selects node directly above for up direction', () => {
    const neighbors = [
      { id: 'up', x: 0, y: -100 },
      { id: 'down', x: 0, y: 100 },
    ];
    expect(findBestNeighborByPosition(center, neighbors, 'up')).toBe('up');
  });

  it('returns null when no neighbors exist', () => {
    expect(findBestNeighborByPosition(center, [], 'right')).toBeNull();
  });

  it('returns null when all neighbors are in the opposite direction', () => {
    const neighbors = [
      { id: 'left', x: -100, y: 0 },
    ];
    // Looking right, only neighbor is to the left (> 90 degrees off)
    expect(findBestNeighborByPosition(center, neighbors, 'right')).toBeNull();
  });

  it('prefers closer node when angles are similar', () => {
    const neighbors = [
      { id: 'close', x: 50, y: 10 },
      { id: 'far', x: 500, y: 10 },
    ];
    expect(findBestNeighborByPosition(center, neighbors, 'right')).toBe('close');
  });

  it('prefers better-angled node over closer node at bad angle', () => {
    const neighbors = [
      { id: 'aligned', x: 200, y: 0 },   // perfect angle, farther
      { id: 'offaxis', x: 50, y: 45 },    // close but angled
    ];
    expect(findBestNeighborByPosition(center, neighbors, 'right')).toBe('aligned');
  });
});

describe('Focus cycling logic', () => {
  it('cycles forward from first to second', () => {
    expect(cycleIndex(0, 5, false)).toBe(1);
  });

  it('cycles forward from last wraps to first', () => {
    expect(cycleIndex(4, 5, false)).toBe(0);
  });

  it('cycles backward from first wraps to last', () => {
    expect(cycleIndex(0, 5, true)).toBe(4);
  });

  it('cycles backward from second to first', () => {
    expect(cycleIndex(1, 5, true)).toBe(0);
  });

  it('handles single-node graph', () => {
    expect(cycleIndex(0, 1, false)).toBe(0);
    expect(cycleIndex(0, 1, true)).toBe(0);
  });

  it('handles no focused node (index -1) by selecting first', () => {
    // (-1 + 1 + 5) % 5 = 0
    expect(cycleIndex(-1, 5, false)).toBe(0);
  });
});
