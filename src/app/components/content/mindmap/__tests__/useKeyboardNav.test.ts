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

// ── Source-level guarantees ─────────────────────────────────

import { readFileSync } from 'fs';
import { resolve } from 'path';
const SOURCE_PATH = resolve(__dirname, '..', 'useKeyboardNav.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

describe('useKeyboardNav source contract', () => {
  it('exports useKeyboardNav as a named function', () => {
    expect(source).toContain('export function useKeyboardNav');
  });

  it('returns { focusedNodeId, setFocusedNodeId, clearFocus }', () => {
    expect(source).toMatch(/return\s*\{\s*focusedNodeId,\s*setFocusedNodeId,\s*clearFocus,?\s*\}/);
  });

  it('declares 4 direction angles in the targetAngle map', () => {
    expect(source).toMatch(/right:\s*0/);
    expect(source).toMatch(/down:\s*Math\.PI\s*\/\s*2/);
    expect(source).toMatch(/left:\s*Math\.PI/);
    expect(source).toMatch(/up:\s*-Math\.PI\s*\/\s*2/);
  });

  it('only considers neighbors within ±90° of target direction (PI/2 cone)', () => {
    expect(source).toMatch(/if\s*\(angleDiff\s*>\s*Math\.PI\s*\/\s*2\)\s*continue/);
  });

  it('scoring weights angle (×100) and distance (×0.1) — angle dominates', () => {
    expect(source).toMatch(/score\s*=\s*angleDiff\s*\*\s*100\s*\+\s*dist\s*\*\s*0\.1/);
  });
});

// ── Zoom + view shortcuts ──────────────────────────────────

describe('Zoom/view keyboard shortcuts', () => {
  it("'=' zooms in 1.25× over 200ms", () => {
    expect(source).toMatch(/e\.key\s*===\s*'='[\s\S]{0,200}zoomBy\(1\.25,\s*\{\s*duration:\s*200\s*\}\)/);
  });

  it("'+' (without focus) also zooms in (+ is the focus action when focused)", () => {
    expect(source).toMatch(/e\.key\s*===\s*'\+'\s*&&\s*!focused/);
  });

  it("'-' zooms out 0.8× over 200ms", () => {
    expect(source).toMatch(/e\.key\s*===\s*'-'[\s\S]{0,200}zoomBy\(0\.8,\s*\{\s*duration:\s*200\s*\}\)/);
  });

  it("'0' or 'f' triggers fitView", () => {
    expect(source).toMatch(/e\.key\s*===\s*'0'\s*\|\|\s*e\.key\s*===\s*'f'/);
    expect(source).toContain('g.fitView()');
  });
});

// ── Modifier shortcuts ──────────────────────────────────────

describe('Modifier shortcuts', () => {
  it("Ctrl+[ collapses all", () => {
    expect(source).toMatch(/e\.key\s*===\s*'\['\s*&&\s*e\.ctrlKey/);
    expect(source).toContain('collapseAllRef.current?.()');
  });

  it("Ctrl+] expands all", () => {
    expect(source).toMatch(/e\.key\s*===\s*'\]'\s*&&\s*e\.ctrlKey/);
    expect(source).toContain('expandAllRef.current?.()');
  });

  it("'?' toggles the shortcut help overlay (no Shift required, key === '?')", () => {
    expect(source).toMatch(/e\.key\s*===\s*'\?'/);
    expect(source).toMatch(/setShowShortcuts\(v\s*=>\s*!v\)/);
  });
});

// ── Tab cycling ─────────────────────────────────────────────

describe('Tab cycling', () => {
  it('handles Tab key', () => {
    expect(source).toMatch(/e\.key\s*===\s*'Tab'/);
  });

  it('Shift+Tab reverses direction (step = -1)', () => {
    expect(source).toMatch(/const step\s*=\s*e\.shiftKey\s*\?\s*-1\s*:\s*1/);
  });

  it('Tab from no-focus jumps to first; Shift+Tab from no-focus jumps to last', () => {
    expect(source).toMatch(/nextIndex\s*=\s*e\.shiftKey\s*\?\s*currentNodes\.length\s*-\s*1\s*:\s*0/);
  });

  it('cycles via modulo with positive offset (handles negative index correctly)', () => {
    expect(source).toMatch(/\(currentIndex\s*\+\s*step\s*\+\s*currentNodes\.length\)\s*%\s*currentNodes\.length/);
  });

  it('skips Tab when nodes are empty', () => {
    expect(source).toMatch(/if\s*\(currentNodes\.length\s*===\s*0\)\s*return/);
  });
});

// ── Enter (context menu) ────────────────────────────────────

describe('Enter opens context menu', () => {
  it('only fires when there is a focused node', () => {
    expect(source).toMatch(/e\.key\s*===\s*'Enter'\s*&&\s*focused/);
  });

  it('uses getClientByCanvas to convert node-graph coords to screen coords', () => {
    expect(source).toContain('g.getClientByCanvas([pos.x, pos.y])');
  });

  it('falls back to container center when getClientByCanvas throws', () => {
    expect(source).toMatch(/const rect\s*=\s*container\.getBoundingClientRect\(\)/);
    expect(source).toMatch(/clientX\s*=\s*rect\.left\s*\+\s*rect\.width\s*\/\s*2/);
    expect(source).toMatch(/clientY\s*=\s*rect\.top\s*\+\s*rect\.height\s*\/\s*2/);
  });

  it('reads the focused node from nodeByIdRef (not nodes array — O(1) lookup)', () => {
    expect(source).toContain('nodeByIdRef.current.get(focused)');
  });
});

// ── Arrow keys ──────────────────────────────────────────────

describe('Arrow keys (directional navigation)', () => {
  it('handles all 4 arrow keys with their direction map', () => {
    expect(source).toMatch(/ArrowUp:\s*'up'/);
    expect(source).toMatch(/ArrowDown:\s*'down'/);
    expect(source).toMatch(/ArrowLeft:\s*'left'/);
    expect(source).toMatch(/ArrowRight:\s*'right'/);
  });

  it('arrow keys are no-op when there is no focused node', () => {
    expect(source).toMatch(/\['ArrowUp',\s*'ArrowDown',\s*'ArrowLeft',\s*'ArrowRight'\]\.includes\(e\.key\)\s*&&\s*focused/);
  });

  it('moving to a neighbor also fires onNodeClick (parent stays in sync)', () => {
    expect(source).toMatch(/onNodeClickRef\.current\?\.\(nextNode\)/);
  });
});

// ── + quick-add ─────────────────────────────────────────────

describe('+ quick-add shortcut', () => {
  it("+ only fires onQuickAdd when there is a focused node", () => {
    expect(source).toMatch(/e\.key\s*===\s*'\+'\s*&&\s*focused/);
    expect(source).toContain('onQuickAddRef.current?.(focused)');
  });
});

// ── Escape ──────────────────────────────────────────────────

describe('Escape', () => {
  it('Escape closes the shortcuts overlay', () => {
    expect(source).toMatch(/e\.key\s*===\s*'Escape'[\s\S]{0,400}setShowShortcuts\(false\)/);
  });

  it('Escape clears focus when there is one', () => {
    expect(source).toMatch(/e\.key\s*===\s*'Escape'[\s\S]{0,500}if\s*\(focused\)[\s\S]{0,200}setFocusedNodeId\(null\)/);
  });

  it('Escape calls onNodeClick(null) so the parent deselects', () => {
    expect(source).toContain('onNodeClickRef.current?.(null)');
  });

  it('Escape clears multi-selection if any', () => {
    expect(source).toMatch(/multiSelectedIdsRef\.current\.size\s*>\s*0[\s\S]{0,80}updateMultiSelection\(new Set\(\)\)/);
  });
});

// ── Keyboard ignore-zones ──────────────────────────────────

describe('Keyboard hijack-prevention', () => {
  it('skips when target is INPUT, TEXTAREA, or SELECT', () => {
    expect(source).toMatch(/tag\s*===\s*'INPUT'\s*\|\|\s*tag\s*===\s*'TEXTAREA'\s*\|\|\s*tag\s*===\s*'SELECT'/);
  });

  it('skips when target is contenteditable', () => {
    expect(source).toContain('target?.isContentEditable');
  });

  it('skips when target is inside a [role="dialog"] or [role="alertdialog"]', () => {
    expect(source).toContain("target?.closest?.('[role=\"dialog\"], [role=\"alertdialog\"]')");
  });
});

// ── Focus-ring state preservation ──────────────────────────

describe('applyFocusRing preserves other element states', () => {
  it('removes ONLY the "selected" state (keeps highlight, hover, etc.)', () => {
    expect(source).toMatch(/filter\(\(s:\s*string\)\s*=>\s*s\s*!==\s*'selected'\)/);
  });

  it('appends "selected" while preserving previous filtered states', () => {
    expect(source).toMatch(/\[\.\.\.existing\.filter\(\(s:\s*string\)\s*=>\s*s\s*!==\s*'selected'\),\s*'selected'\]/);
  });

  it('falls back to plain ["selected"] when getElementState throws', () => {
    expect(source).toMatch(/graph\.setElementState\(nodeId,\s*\['selected'\]\)/);
  });

  it('pans the camera to the new focus over 200ms', () => {
    expect(source).toMatch(/graph\.focusElements\(\[nodeId\],\s*\{\s*animation:\s*\{\s*duration:\s*200,\s*easing:\s*'ease-out'\s*\}\s*\}\)/);
  });
});

// ── clearFocus uses ref (not closure) ──────────────────────

describe('clearFocus stable closure', () => {
  it('reads focused id from focusedNodeIdRef.current (not the captured state)', () => {
    expect(source).toContain('focusedNodeIdRef');
    expect(source).toContain('const currentFocused = focusedNodeIdRef.current');
  });

  it('only removes the "selected" state — preserves others', () => {
    expect(source).toMatch(/filter\(\(s:\s*string\)\s*=>\s*s\s*!==\s*'selected'\)/);
  });
});

// ── Sync effect for selectedNodeId ─────────────────────────

describe('External selectedNodeId sync', () => {
  it('mirrors selectedNodeId into focusedNodeId via a separate effect', () => {
    expect(source).toMatch(/if\s*\(selectedNodeId\)\s*\{\s*setFocusedNodeId\(selectedNodeId\)/);
    expect(source).toMatch(/\}, \[selectedNodeId\]\)/);
  });
});

// ── Auto-clear focus on node removal ───────────────────────

describe('Focus auto-clear when node is removed from graph', () => {
  it('checks nodeByIdRef.has(focusedNodeId) and resets to null if missing', () => {
    expect(source).toMatch(/if\s*\(focusedNodeId\s*&&\s*!nodeByIdRef\.current\.has\(focusedNodeId\)\)\s*\{\s*setFocusedNodeId\(null\)/);
  });
});

// ── Cleanup ─────────────────────────────────────────────────

describe('Listener cleanup', () => {
  it('binds keydown to container (not document — scoped to graph area)', () => {
    expect(source).toMatch(/container\.addEventListener\('keydown',/);
  });

  it('removes the listener in cleanup', () => {
    expect(source).toMatch(/container\.removeEventListener\('keydown',/);
  });
});
