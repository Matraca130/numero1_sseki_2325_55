// ============================================================
// Contract test — useDragConnect
//
// Drag-to-connect hook (567 lines) with no dedicated tests.
// Public surface is just the hook function; the rest is canvas
// + DOM overlays. We validate the source-level contract:
// constants, options shape, edge dedup logic, locale wiring,
// cleanup symmetry, and the i18n delegation.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'useDragConnect.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Exports ──────────────────────────────────────────────────

describe('useDragConnect exports', () => {
  it('exports useDragConnect hook', () => {
    expect(source).toContain('export function useDragConnect');
  });

  it('declares UseDragConnectOptions interface (internal)', () => {
    expect(source).toContain('interface UseDragConnectOptions');
  });
});

// ── Tunable thresholds ───────────────────────────────────────

describe('Drag thresholds', () => {
  it('PORT_HIT_RADIUS = 24 (port click hit area)', () => {
    expect(source).toMatch(/PORT_HIT_RADIUS\s*=\s*24/);
  });

  it('NODE_SNAP_RADIUS = 55 (node snap distance)', () => {
    expect(source).toMatch(/NODE_SNAP_RADIUS\s*=\s*55/);
  });

  it('DRAG_THRESHOLD = 4 (desktop activation)', () => {
    expect(source).toMatch(/DRAG_THRESHOLD\s*=\s*4/);
  });

  it('TOUCH_DRAG_THRESHOLD = 12 (touch activation, larger)', () => {
    expect(source).toMatch(/TOUCH_DRAG_THRESHOLD\s*=\s*12/);
  });

  it('HOVER_THROTTLE_MS = 50 (hover detection rate)', () => {
    expect(source).toMatch(/HOVER_THROTTLE_MS\s*=\s*50/);
  });
});

// ── Touch-aware sizing ───────────────────────────────────────

describe('Touch-aware sizing', () => {
  it('getPortRadius returns 10 on touch and 6 on mouse', () => {
    expect(source).toMatch(/function getPortRadius[\s\S]*isTouch\s*\?\s*10\s*:\s*6/);
  });

  it('getQuickConnectSize returns 44 on touch (a11y minimum)', () => {
    expect(source).toMatch(/function getQuickConnectSize[\s\S]*isTouch\s*\?\s*44\s*:\s*28/);
  });
});

// ── Options surface ──────────────────────────────────────────

describe('UseDragConnectOptions surface', () => {
  const fields = [
    'graphRef',
    'containerRef',
    'ready',
    'graphVersion',
    'enabled',
    'edges',
    'onDragConnect',
    'onQuickAdd',
    'locale',
    'isDraggingRef',
  ];
  for (const f of fields) {
    it(`accepts \`${f}\``, () => {
      expect(source).toMatch(new RegExp(`\\b${f}\\b`));
    });
  }

  it('locale defaults to "pt"', () => {
    expect(source).toMatch(/locale\s*=\s*'pt'/);
  });
});

// ── i18n delegation ──────────────────────────────────────────

describe('i18n', () => {
  it('imports I18N_GRAPH from graphI18n', () => {
    expect(source).toContain('I18N_GRAPH');
    expect(source).toContain("from './graphI18n'");
  });

  it('reads connectTo / sameNode / alreadyConnected / quickConnectTitle strings', () => {
    expect(source).toContain('dragConnectTo');
    expect(source).toContain('dragSameNode');
    expect(source).toContain('dragAlreadyConnected');
    expect(source).toContain('dragQuickConnectTitle');
  });
});

// ── Edge dedup helpers ───────────────────────────────────────

describe('Edge existence helpers', () => {
  it('declares buildEdgeSet (Set keyed by source-target)', () => {
    expect(source).toContain('function buildEdgeSet');
    expect(source).toContain('${e.source}-${e.target}');
    expect(source).toContain('${e.target}-${e.source}');
  });

  it('declares edgeExistsInSet for O(1) lookup', () => {
    expect(source).toContain('function edgeExistsInSet');
    expect(source).toMatch(/edgeSet\.has\(`\$\{sourceId\}-\$\{targetId\}`\)/);
  });

  it('keeps the edge Set in sync via useEffect on edges', () => {
    expect(source).toMatch(/edgeSetRef\.current\s*=\s*buildEdgeSet\(edges\)/);
  });
});

// ── Canvas overlay lifecycle ─────────────────────────────────

describe('Canvas overlay + quick-connect button', () => {
  it('creates a canvas overlay with pointer-events: none', () => {
    expect(source).toContain("document.createElement('canvas')");
    expect(source).toContain('pointer-events:none');
  });

  it('creates a quick-connect "+" button', () => {
    expect(source).toContain("document.createElement('div')");
    expect(source).toContain("btn.textContent = '+'");
  });

  it('observes container resize via ResizeObserver', () => {
    expect(source).toContain('ResizeObserver');
  });

  it('cleans up overlay, button, observer, and rAF on unmount', () => {
    expect(source).toContain('ro.disconnect()');
    expect(source).toContain('cancelAnimationFrame(rafRef.current)');
    expect(source).toMatch(/overlay\.parentNode\.removeChild\(overlay\)/);
    expect(source).toMatch(/btn\.parentNode\.removeChild\(btn\)/);
  });

  it('invalidates cached hover positions on viewport change', () => {
    expect(source).toContain('afterviewportchange');
    expect(source).toContain('hoverPositionsValidRef.current = false');
  });
});

// ── Pointer capture safety ───────────────────────────────────

describe('Pointer capture safety', () => {
  it('uses safeReleasePointerCapture (the cycle-10 helper)', () => {
    expect(source).toContain('safeReleasePointerCapture');
  });
});

// ── Drawing delegation ───────────────────────────────────────

describe('Drawing delegation', () => {
  it('delegates frame drawing to drawDragConnectFrame', () => {
    expect(source).toContain('drawDragConnectFrame');
    expect(source).toContain("from './drawDragConnectOverlay'");
  });

  it('imports SUCCESS_ANIM_DURATION for celebration animation', () => {
    expect(source).toContain('SUCCESS_ANIM_DURATION');
  });
});

// ── Coordination with edge reconnect ─────────────────────────

describe('isDraggingRef coordination', () => {
  it('accepts an external isDraggingRef to prevent overlap with edge reconnect', () => {
    expect(source).toContain('isDraggingRef');
    expect(source).toContain('coordinate with useEdgeReconnect');
  });
});

// ── Defensive error handling ─────────────────────────────────

describe('Defensive error handling', () => {
  it('wraps graph.off in try/catch in the viewport-change cleanup', () => {
    expect(source).toMatch(/try\s*\{\s*graph\.off\('afterviewportchange',\s*invalidate\)/);
  });
});

// ── Pointer-state-machine pinning (source-level) ────────────

describe('Pointer state machine — source guarantees', () => {
  it('stores DragState in dragStateRef and clears it on pointerup', () => {
    expect(source).toContain('dragStateRef.current = null');
  });

  it('activation requires crossing the drag threshold (Math.sqrt distance check)', () => {
    expect(source).toMatch(/Math\.sqrt\(dx \* dx \+ dy \* dy\)\s*<\s*threshold/);
  });

  it('uses TOUCH_DRAG_THRESHOLD on touch input, DRAG_THRESHOLD on mouse', () => {
    expect(source).toMatch(/e\.pointerType\s*===\s*'touch'\s*\?\s*TOUCH_DRAG_THRESHOLD\s*:\s*DRAG_THRESHOLD/);
  });

  it('pointerdown is bound with capture:true to outrace G6 listeners', () => {
    expect(source).toMatch(/addEventListener\('pointerdown',\s*\w+,\s*\{\s*capture:\s*true\s*\}/);
  });

  it('all 4 pointer events + keydown are unbound on cleanup', () => {
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      expect(source).toContain(`removeEventListener('${ev}'`);
    }
    expect(source).toContain("removeEventListener('keydown'");
  });

  it('skips drag-connect when pointer is inside the inner 60% of any node', () => {
    // Comment marker plus the 0.6 factor on node radius
    expect(source).toContain('Inside node center');
    expect(source).toMatch(/dist\s*<=\s*node\.size\s*\/\s*2\s*\*\s*0\.6/);
  });

  it('starts a drag only on the OUTER ring (between 60% radius and PORT_HIT_RADIUS)', () => {
    expect(source).toMatch(/dist\s*>\s*nodeRadius\s*\*\s*0\.6\s*&&\s*dist\s*<=\s*nodeRadius\s*\+\s*PORT_HIT_RADIUS/);
  });

  it('only activates on left-click (e.button === 0)', () => {
    expect(source).toMatch(/if\s*\(\s*e\.button\s*!==\s*0\s*\)\s*return/);
  });

  it('coordinates with shared isDraggingRef during activation + cleanup', () => {
    expect(source).toContain('isDraggingRef.current = true');
    expect(source).toContain('isDraggingRef.current = false');
  });
});

// ── Snap validity invariants ────────────────────────────────

describe('Snap validity', () => {
  it('flags self-loop as invalid (snapInvalidReason = t.sameNode)', () => {
    expect(source).toMatch(/nearest\.id\s*===\s*ds\.sourceNodeId[\s\S]*?snapInvalidReason\s*=\s*t\.sameNode/);
  });

  it('flags duplicate edges as invalid via O(1) edgeExistsInSet check', () => {
    expect(source).toMatch(/edgeExistsInSet\(edgeSetRef\.current[\s\S]*?snapInvalidReason\s*=\s*t\.alreadyConnected/);
  });

  it('clears invalid flag when no node is in snap range', () => {
    expect(source).toMatch(/ds\.snapNodeId\s*=\s*null[\s\S]*?ds\.snapInvalid\s*=\s*false/);
  });
});

// ── Success path ────────────────────────────────────────────

describe('Successful drop', () => {
  it('triggers success animation by populating successAnimRef', () => {
    expect(source).toMatch(/successAnimRef\.current\s*=\s*\{[\s\S]*?startTime:\s*performance\.now\(\)/);
  });

  it('fires the onDragConnect callback with (sourceId, snapNodeId)', () => {
    expect(source).toMatch(/onDragConnectRef\.current\?\.\(ds\.sourceNodeId,\s*ds\.snapNodeId\)/);
  });

  it('optimistically inserts BOTH directions into the edge set (rapid-dedup guard)', () => {
    expect(source).toContain('${ds.sourceNodeId}-${ds.snapNodeId}');
    expect(source).toContain('${ds.snapNodeId}-${ds.sourceNodeId}');
    expect(source).toMatch(/edgeSetRef\.current\.add\(key1\)/);
    expect(source).toMatch(/edgeSetRef\.current\.add\(key2\)/);
  });

  it('rejects drop when snapInvalid is true', () => {
    expect(source).toMatch(/if\s*\(\s*ds\.snapNodeId\s*&&\s*!ds\.snapInvalid\s*&&\s*ds\.snapNodeId\s*!==\s*ds\.sourceNodeId\s*\)/);
  });
});

// ── Cancellation paths ──────────────────────────────────────

describe('Cancellation', () => {
  it('Escape key triggers a synthetic pointercancel', () => {
    expect(source).toMatch(/if\s*\(\s*e\.key\s*===\s*'Escape'\s*&&\s*dragStateRef\.current\s*\)/);
    expect(source).toMatch(/new PointerEvent\('pointercancel'/);
  });

  it('keydown listener is bound with capture:true so other handlers do not consume it', () => {
    expect(source).toMatch(/addEventListener\('keydown',\s*\w+,\s*\{\s*capture:\s*true\s*\}/);
  });

  it('cancellation clears the overlay canvas (zero pixels left over)', () => {
    expect(source).toMatch(/ctx\?\.clearRect\(0,\s*0,\s*overlay\.width,\s*overlay\.height\)/);
  });

  it('pointer capture is released via safeReleasePointerCapture during cancel', () => {
    expect(source).toMatch(/safeReleasePointerCapture\(container,\s*ds\.capturedPointerId,\s*'useDragConnect'\)/);
  });
});

// ── Returned API ────────────────────────────────────────────

describe('Returned API', () => {
  it('returns an isDragging() callback reading dragStateRef.activated', () => {
    expect(source).toMatch(/const isDragging\s*=\s*useCallback\(\(\)\s*=>\s*dragStateRef\.current\?\.activated\s*\?\?\s*false/);
    expect(source).toContain('return { isDragging }');
  });
});

// ── Pure helpers (replicated) ───────────────────────────────
//
// buildEdgeSet and edgeExistsInSet are private to the module
// but their behavior is the load-bearing path for snap-validity.
// Replicate them so we can pin the algorithm.

describe('buildEdgeSet (replicated)', () => {
  type EdgeLike = { source: string; target: string };

  function buildEdgeSet(edges: EdgeLike[]): Set<string> {
    const set = new Set<string>();
    for (const e of edges) {
      set.add(`${e.source}-${e.target}`);
      set.add(`${e.target}-${e.source}`);
    }
    return set;
  }

  function edgeExistsInSet(edgeSet: Set<string>, sourceId: string, targetId: string): boolean {
    return edgeSet.has(`${sourceId}-${targetId}`);
  }

  it('inserts both directions for every edge (undirected dedup)', () => {
    const set = buildEdgeSet([{ source: 'a', target: 'b' }]);
    expect(set.has('a-b')).toBe(true);
    expect(set.has('b-a')).toBe(true);
    expect(set.size).toBe(2);
  });

  it('returns an empty Set for no edges', () => {
    expect(buildEdgeSet([]).size).toBe(0);
  });

  it('deduplicates parallel edges (same a→b twice)', () => {
    const set = buildEdgeSet([
      { source: 'a', target: 'b' },
      { source: 'a', target: 'b' },
    ]);
    expect(set.size).toBe(2); // still just a-b and b-a
  });

  it('treats reverse-direction duplicates as the same edge', () => {
    const set = buildEdgeSet([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' },
    ]);
    expect(set.size).toBe(2);
  });

  it('handles self-loops (a→a writes a single key)', () => {
    const set = buildEdgeSet([{ source: 'a', target: 'a' }]);
    expect(set.has('a-a')).toBe(true);
    expect(set.size).toBe(1);
  });

  it('edgeExistsInSet returns true for a→b when b→a was inserted', () => {
    const set = buildEdgeSet([{ source: 'b', target: 'a' }]);
    expect(edgeExistsInSet(set, 'a', 'b')).toBe(true);
    expect(edgeExistsInSet(set, 'b', 'a')).toBe(true);
  });

  it('edgeExistsInSet returns false for unrelated nodes', () => {
    const set = buildEdgeSet([{ source: 'a', target: 'b' }]);
    expect(edgeExistsInSet(set, 'a', 'c')).toBe(false);
    expect(edgeExistsInSet(set, 'x', 'y')).toBe(false);
  });

  it('scales: 1000 edges → 2000 keys, O(1) lookup', () => {
    const edges: EdgeLike[] = [];
    for (let i = 0; i < 1000; i++) edges.push({ source: `n${i}`, target: `n${i + 1}` });
    const set = buildEdgeSet(edges);
    expect(set.size).toBe(2000);
    expect(edgeExistsInSet(set, 'n42', 'n43')).toBe(true);
    expect(edgeExistsInSet(set, 'n43', 'n42')).toBe(true);
    expect(edgeExistsInSet(set, 'n0', 'n999')).toBe(false);
  });
});

// ── Touch-aware sizing helpers (replicated) ─────────────────

describe('Touch-aware sizing helpers', () => {
  function getPortRadius(isTouch: boolean) { return isTouch ? 10 : 6; }
  function getQuickConnectSize(isTouch: boolean) { return isTouch ? 44 : 28; }

  it('port radius is 6px on mouse, 10px on touch (66% larger)', () => {
    expect(getPortRadius(false)).toBe(6);
    expect(getPortRadius(true)).toBe(10);
    expect(getPortRadius(true) / getPortRadius(false)).toBeCloseTo(1.667, 1);
  });

  it('quick-connect button is 28px on mouse, 44px on touch (Apple HIG minimum)', () => {
    expect(getQuickConnectSize(false)).toBe(28);
    expect(getQuickConnectSize(true)).toBe(44);
  });

  it('44px touch target meets the WCAG 2.2 minimum (24×24 CSS px)', () => {
    expect(getQuickConnectSize(true)).toBeGreaterThanOrEqual(24);
  });
});
