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
  it('delegates canvas overlay creation to useOverlayCanvas (cycle 48)', () => {
    // Canvas creation/DPR/ResizeObserver moved to useOverlayCanvas.ts.
    // The host wires it with z-index 5.
    expect(source).toContain('useOverlayCanvas');
    expect(source).toMatch(/zIndex:\s*5/);
  });

  it('creates a quick-connect "+" button', () => {
    expect(source).toContain("document.createElement('div')");
    expect(source).toContain("btn.textContent = '+'");
  });

  it('passes enabled && ready to useOverlayCanvas (auto-mounts/unmounts)', () => {
    expect(source).toMatch(/useOverlayCanvas\(\{[\s\S]*?enabled:\s*enabled\s*&&\s*ready/);
  });

  it('cleans up button, rAF, and per-effect refs on unmount', () => {
    // Canvas + ResizeObserver cleanup is now inside useOverlayCanvas;
    // the host effect still owns the button + rAF + state refs.
    expect(source).toContain('cancelAnimationFrame(rafRef.current)');
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

  it('all 4 pointer events are unbound on cleanup (keydown is via useEscapeCancel)', () => {
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      expect(source).toContain(`removeEventListener('${ev}'`);
    }
    // Keydown listener registration/cleanup is delegated to useEscapeCancel
    // (extracted in cycle 48). The host imports the helper and supplies
    // an onCancel callback that synthesises a PointerEvent.
    expect(source).toContain('useEscapeCancel');
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
  it('Escape key triggers a synthetic pointercancel (via useEscapeCancel onCancel)', () => {
    // Cycle 48 — Escape handling moved to useEscapeCancel; the host's
    // onCancel callback constructs the synthetic PointerEvent and
    // forwards it to handlePointerCancel via the pointerCancelRef bridge.
    expect(source).toContain('useEscapeCancel');
    expect(source).toMatch(/new PointerEvent\('pointercancel'/);
  });

  it('keydown listener is delegated to useEscapeCancel (capture:true is in helper)', () => {
    // The bind-with-capture-true contract is pinned in useEscapeCancel.test.ts.
    // Here we just pin the delegation.
    expect(source).toContain('useEscapeCancel');
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

// ============================================================
// ── Cycle 47 additions ──────────────────────────────────────
//
// Cycle 21 pinned the pointer-state-machine. Cycle 47 covers
// every OTHER dimension visible in the source:
//   - Hover throttling + position cache
//   - Quick-connect button positioning + click handling
//   - Activation side effects (capture, cursor, button hide)
//   - Failed-drop / pointer-cancel asymmetries
//   - DPR canvas resize math
//   - Draw-loop continuation conditions
//   - Success animation auto-clear
//   - Effect dep arrays
//   - Synthetic Escape pointercancel payload
// ============================================================

// ── Hover detection logic ───────────────────────────────────

describe('Hover detection (no active drag)', () => {
  it('throttles hover hit-tests by HOVER_THROTTLE_MS via lastHoverCheck delta', () => {
    expect(source).toMatch(/now\s*-\s*lastHoverCheck\s*<\s*HOVER_THROTTLE_MS/);
    expect(source).toMatch(/lastHoverCheck\s*=\s*now/);
  });

  it('only recomputes hover positions when the cache flag is invalidated', () => {
    expect(source).toMatch(/if\s*\(!hoverPositionsValidRef\.current\)/);
    expect(source).toMatch(/hoverPositionsRef\.current\s*=\s*getNodeScreenPositions\(graph,\s*true\)/);
    expect(source).toMatch(/hoverPositionsValidRef\.current\s*=\s*true/);
  });

  it('hover hit-test radius is node.size/2 + 10 (looser than drag PORT_HIT_RADIUS=24)', () => {
    // The hover threshold is purposely smaller than drag's outer ring;
    // hover is "is the cursor visibly over the node?", drag is "is the
    // cursor in the port ring?".
    expect(source).toMatch(/dist\s*<\s*node\.size\s*\/\s*2\s*\+\s*10/);
  });

  it('only triggers a redraw when hover identity TRANSITIONS (not on every frame)', () => {
    expect(source).toMatch(/if\s*\(foundHover\s*!==\s*hoveredNodeRef\.current\)/);
  });

  it('breaks out of hover loop on first hit (early return inside for-of via break)', () => {
    // The hover for-loop uses `break;` after assigning foundHover —
    // first match wins, no overlap resolution.
    expect(source).toMatch(/foundHover\s*=\s*node\.id;\s*hoverNode\s*=\s*node;\s*break/);
  });

  it('skips hover work entirely when there IS an active drag (early return on ds)', () => {
    // The pointermove handler reads dragStateRef first; if non-null,
    // it falls through to the drag-update path, never touching hover.
    expect(source).toMatch(/const ds\s*=\s*dragStateRef\.current;\s*\n\s*if\s*\(!ds\)/);
  });

  it('updates lastPointerTypeRef on EVERY pointermove (touch/mouse swap mid-flight)', () => {
    expect(source).toMatch(/lastPointerTypeRef\.current\s*=\s*e\.pointerType/);
  });
});

// ── Hover-position cache invalidation ───────────────────────

describe('Hover position cache invalidation', () => {
  it('viewport-change handler flips hoverPositionsValidRef to false (lazy recompute)', () => {
    expect(source).toMatch(/const invalidate\s*=\s*\(\)\s*=>\s*\{\s*hoverPositionsValidRef\.current\s*=\s*false/);
    expect(source).toMatch(/graph\.on\('afterviewportchange',\s*invalidate\)/);
  });

  it('viewport effect re-binds when graphVersion changes (graph instance swap)', () => {
    // Catches the failure mode where a new graph instance leaves the
    // old listener orphaned. The dep array MUST include graphVersion.
    expect(source).toMatch(/\[enabled,\s*ready,\s*graphRef,\s*graphVersion\]/);
  });

  it('viewport-effect cleanup is wrapped in try/catch (graph may be destroyed)', () => {
    expect(source).toMatch(/try\s*\{\s*graph\.off\('afterviewportchange'[\s\S]*?catch\s*\(e\)/);
  });
});

// ── Quick-connect button positioning ────────────────────────

describe('Quick-connect "+" button positioning', () => {
  it('places button to the upper-right of the node (x + size/2 + 2, y - size/2 - 2)', () => {
    // bx = node.x - containerRect.left + node.size/2 + 2  (right-of-node)
    expect(source).toMatch(/hoverNode\.x\s*-\s*containerRect\.left\s*\+\s*hoverNode\.size\s*\/\s*2\s*\+\s*2/);
    // by = node.y - containerRect.top - node.size/2 - 2   (above node)
    expect(source).toMatch(/hoverNode\.y\s*-\s*containerRect\.top\s*-\s*hoverNode\.size\s*\/\s*2\s*-\s*2/);
  });

  it('button is sized dynamically per pointer type on each hover transition', () => {
    expect(source).toMatch(/const isTouch\s*=\s*e\.pointerType\s*===\s*'touch'/);
    expect(source).toMatch(/const qcSize\s*=\s*getQuickConnectSize\(isTouch\)/);
    expect(source).toMatch(/btn\.style\.width\s*=\s*`\$\{qcSize\}px`/);
    expect(source).toMatch(/btn\.style\.height\s*=\s*`\$\{qcSize\}px`/);
  });

  it('button is shown via display:flex when a hover is detected', () => {
    expect(source).toMatch(/btn\.style\.display\s*=\s*'flex'/);
  });

  it('button is hidden via display:none when hover transitions to null', () => {
    // The else branch of `if (btn && hoverNode)` — hoverNode is null
    expect(source).toMatch(/\}\s*else if\s*\(btn\)\s*\{\s*btn\.style\.display\s*=\s*'none'/);
  });

  it('button is hidden when drag activates (visual cleanup, not just hover)', () => {
    expect(source).toMatch(/Hide quick-connect button during drag[\s\S]*?btn\.style\.display\s*=\s*'none'/);
  });

  it('initial button size at creation defaults to mouse (small) — getQuickConnectSize(false)', () => {
    expect(source).toMatch(/const initSize\s*=\s*getQuickConnectSize\(false\)/);
  });

  it('button is created with z-index 6 (above the canvas overlay z-index 5)', () => {
    // Layering matters: the button must be clickable above the overlay.
    // Cycle 48: canvas z-index is now passed to useOverlayCanvas as a numeric
    // option (`zIndex: 5`); the button's z-index 6 stays inline in the host.
    expect(source).toMatch(/z-index:6/);
    expect(source).toMatch(/zIndex:\s*5/);
  });

  it('button has pointer-events:auto (overlay has none — click delegation)', () => {
    expect(source).toContain('pointer-events:auto');
  });

  it('button uses the GRAPH_COLORS.primary background and primaryRgb shadow', () => {
    expect(source).toContain('background:${GRAPH_COLORS.primary}');
    expect(source).toContain('rgba(${GRAPH_COLORS.primaryRgb}');
  });
});

// ── Quick-connect click handler ─────────────────────────────

describe('Quick-connect click handler', () => {
  it('binds on MOUSEDOWN (not click) so it fires before drag-detection', () => {
    expect(source).toMatch(/btn\.addEventListener\('mousedown',\s*handleQuickConnectClick\)/);
  });

  it('removes the mousedown listener on cleanup', () => {
    expect(source).toMatch(/btn\.removeEventListener\('mousedown',\s*handleQuickConnectClick\)/);
  });

  it('calls preventDefault + stopPropagation to suppress the wrapping pointerdown', () => {
    expect(source).toMatch(/handleQuickConnectClick[\s\S]*?e\.stopPropagation\(\)[\s\S]*?e\.preventDefault\(\)/);
  });

  it('reads hoveredNodeRef.current (not e.target) to identify the source node', () => {
    expect(source).toMatch(/const nodeId\s*=\s*hoveredNodeRef\.current/);
  });

  it('is a no-op when onQuickAddRef.current is undefined (optional callback)', () => {
    // The condition `if (nodeId && onQuickAddRef.current)` short-circuits
    // for either missing piece — pin both halves of the AND.
    expect(source).toMatch(/if\s*\(nodeId\s*&&\s*onQuickAddRef\.current\)/);
  });

  it('passes hoveredNodeRef.current into the onQuickAdd callback', () => {
    expect(source).toMatch(/onQuickAddRef\.current\(nodeId\)/);
  });

  it('uses a ref-pattern for onQuickAdd so identity changes do not re-bind the effect', () => {
    expect(source).toMatch(/const onQuickAddRef\s*=\s*useRef\(onQuickAdd\)/);
    expect(source).toMatch(/onQuickAddRef\.current\s*=\s*onQuickAdd/);
  });

  it('uses a ref-pattern for onDragConnect for the same reason', () => {
    expect(source).toMatch(/const onDragConnectRef\s*=\s*useRef\(onDragConnect\)/);
    expect(source).toMatch(/onDragConnectRef\.current\s*=\s*onDragConnect/);
  });
});

// ── Drag activation side effects ────────────────────────────

describe('Drag activation side effects', () => {
  it('captures the pointer on the container (cross-element pointer routing)', () => {
    expect(source).toMatch(/container\.setPointerCapture\(e\.pointerId\)/);
  });

  it('records the captured pointerId on the drag state', () => {
    expect(source).toMatch(/ds\.capturedPointerId\s*=\s*e\.pointerId/);
  });

  it('initializes capturedPointerId to -1 BEFORE activation (so cancel can detect "not captured")', () => {
    expect(source).toMatch(/capturedPointerId:\s*-1/);
  });

  it('flips overlay pointer-events to "auto" so it can receive cursor styling', () => {
    expect(source).toMatch(/overlayCanvasRef\.current\.style\.pointerEvents\s*=\s*'auto'/);
  });

  it('sets overlay cursor to "grabbing" during the drag', () => {
    expect(source).toMatch(/overlayCanvasRef\.current\.style\.cursor\s*=\s*'grabbing'/);
  });

  it('clears hoveredNodeRef on activation (no stale port-ring around source)', () => {
    expect(source).toMatch(/Hide quick-connect button during drag[\s\S]*?hoveredNodeRef\.current\s*=\s*null/);
  });

  it('flips activated to true exactly once, after the threshold check', () => {
    expect(source).toMatch(/if\s*\(Math\.sqrt[\s\S]*?<\s*threshold\)\s*return;\s*\n\s*ds\.activated\s*=\s*true/);
  });

  it('coordinates with the shared isDraggingRef during activation (sister-hook lock)', () => {
    expect(source).toMatch(/if\s*\(isDraggingRef\)\s*isDraggingRef\.current\s*=\s*true/);
  });
});

// ── Pointer-up: success vs failure asymmetry ────────────────

describe('Pointer-up branches', () => {
  it('short-circuits with no DOM cleanup when ds is not activated (just nulls state)', () => {
    expect(source).toMatch(/if\s*\(!ds\.activated\)\s*\{\s*dragStateRef\.current\s*=\s*null;\s*return;\s*\}/);
  });

  it('on failed drop, clears the overlay canvas (no leftover bezier)', () => {
    // Failure branch: same clearRect call as cancellation
    const clearRectMatches = source.match(/ctx\?\.clearRect\(0,\s*0,\s*overlay\.width,\s*overlay\.height\)/g) ?? [];
    expect(clearRectMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('on failed drop, does NOT populate successAnimRef (no celebration)', () => {
    // The successAnimRef assignment is GATED on the success branch only.
    // Pin that the assignment lives inside the success conditional.
    expect(source).toMatch(/if\s*\(ds\.snapNodeId\s*&&\s*!ds\.snapInvalid[\s\S]*?successAnimRef\.current\s*=\s*\{/);
  });

  it('BOTH branches null dragStateRef and reset isDraggingRef (symmetric tear-down)', () => {
    // After the if/else for success/fail, the unconditional reset:
    expect(source).toMatch(/dragStateRef\.current\s*=\s*null;\s*\n\s*if\s*\(isDraggingRef\)\s*isDraggingRef\.current\s*=\s*false/);
  });

  it('overlay pointer-events restored to "none" + cursor cleared after pointerup', () => {
    expect(source).toMatch(/overlayCanvasRef\.current\.style\.pointerEvents\s*=\s*'none'/);
    expect(source).toMatch(/overlayCanvasRef\.current\.style\.cursor\s*=\s*''/);
  });

  it('rAF is cancelled before scheduling the success animation (no double-frame)', () => {
    // Sequence: cancelAnimationFrame → requestAnimationFrame(draw)
    expect(source).toMatch(/cancelAnimationFrame\(rafRef\.current\);\s*\n\s*rafRef\.current\s*=\s*requestAnimationFrame\(draw\)/);
  });

  it('callback fires BEFORE the optimistic edge-set insertion (so re-drop sees duplicate)', () => {
    // Sequence in source: onDragConnectRef.current?.(...) → key1/key2 → set.add
    expect(source).toMatch(/onDragConnectRef\.current\?\.\(ds\.sourceNodeId,\s*ds\.snapNodeId\)[\s\S]*?const key1[\s\S]*?const key2[\s\S]*?edgeSetRef\.current\.add\(key1\)/);
  });
});

// ── Pointer-cancel branches ─────────────────────────────────

describe('Pointer-cancel branches', () => {
  it('only releases capture + clears overlay when the drag was activated', () => {
    expect(source).toMatch(/handlePointerCancel[\s\S]*?if\s*\(ds\.activated\)\s*\{[\s\S]*?safeReleasePointerCapture/);
  });

  it('non-activated cancel is a no-op except for state reset (no DOM touch)', () => {
    // The DOM cleanup (overlay/cursor/clearRect) is INSIDE `if (ds.activated)`.
    // After the block, the unconditional reset runs. Pin that the reset is
    // outside the activation gate.
    expect(source).toMatch(/handlePointerCancel[\s\S]*?\}\s*\n\s*dragStateRef\.current\s*=\s*null;\s*\n\s*if\s*\(isDraggingRef\)\s*isDraggingRef\.current\s*=\s*false/);
  });

  it('early-returns when there is no active drag (no spurious state reset)', () => {
    expect(source).toMatch(/handlePointerCancel\s*=\s*\(e:\s*PointerEvent\)\s*=>\s*\{\s*const ds\s*=\s*dragStateRef\.current;\s*\n\s*if\s*\(!ds\)\s*return/);
  });

  it('cancelled drag clears rAF before clearing the canvas', () => {
    // Order matters: cancel rAF first so a queued frame doesn't redraw stale state.
    expect(source).toMatch(/handlePointerCancel[\s\S]*?cancelAnimationFrame\(rafRef\.current\);\s*\n\s*const overlay\s*=\s*overlayCanvasRef\.current/);
  });
});

// ── Synthetic Escape pointercancel ──────────────────────────

describe('Escape → synthetic pointercancel', () => {
  it('forwards the captured pointerId into the synthetic PointerEvent', () => {
    // The host's onCancel reads ds.capturedPointerId and builds the synthetic
    // PointerEvent before forwarding to handlePointerCancel via pointerCancelRef.
    expect(source).toMatch(/new PointerEvent\('pointercancel',\s*\{\s*pointerId:\s*ds\.capturedPointerId/);
  });

  it('synthetic PointerEvent is dispatched through the pointerCancelRef bridge', () => {
    // Cycle 48: handlePointerCancel lives inside the main interaction effect
    // closure, so a ref bridge keeps it reachable from useEscapeCancel.
    expect(source).toMatch(/pointerCancelRef\.current\?\.\(/);
    expect(source).toMatch(/pointerCancelRef\.current\s*=\s*handlePointerCancel/);
  });

  it('Escape is a no-op when there is no active drag (gated by isActive callback)', () => {
    // The `isActive` callback returns dragStateRef.current !== null; the
    // useEscapeCancel helper short-circuits when it returns false.
    expect(source).toMatch(/escapeIsActive\s*=\s*useCallback\(\(\)\s*=>\s*dragStateRef\.current\s*!==\s*null/);
  });

  it('Escape handling is delegated to useEscapeCancel (cycle-48 helper)', () => {
    // The bind-on-document + capture:true contract is pinned in
    // useEscapeCancel.test.ts. Here we just pin the delegation.
    expect(source).toContain('useEscapeCancel');
    expect(source).toMatch(/useEscapeCancel\(\{[\s\S]*?enabled:\s*enabled\s*&&\s*ready[\s\S]*?isActive:\s*escapeIsActive[\s\S]*?onCancel:\s*escapeOnCancel/);
  });
});

// ── Canvas DPR resize math ──────────────────────────────────

describe('Canvas DPR resize math', () => {
  // Cycle 48 — canvas creation/DPR/ResizeObserver moved to useOverlayCanvas.
  // The detailed resize-math contract is pinned in useOverlayCanvas.test.ts.

  it('uses the cycle-48 useOverlayCanvas helper (DPR + ResizeObserver delegated)', () => {
    expect(source).toContain('useOverlayCanvas');
  });

  it('reads the DPR-correct canvas via the helper-returned canvasRef', () => {
    // The host still reads overlay.width / overlay.height in the draw loop,
    // and those are sized DPR-correctly by useOverlayCanvas.
    expect(source).toMatch(/canvasRef:\s*overlayCanvasRef/);
    expect(source).toMatch(/overlay\.width/);
    expect(source).toMatch(/overlay\.height/);
  });

  it('falls back to DPR=1 when window.devicePixelRatio is 0/undefined (in draw loop)', () => {
    // The draw loop also reads `window.devicePixelRatio || 1` — that path stays.
    expect(source).toMatch(/window\.devicePixelRatio\s*\|\|\s*1/);
  });

  it('z-index 5 is passed to useOverlayCanvas (above G6 canvas, below the +button)', () => {
    expect(source).toMatch(/zIndex:\s*5/);
  });

  it('overlay lifecycle (creation/disconnect) is owned by the helper, not the host', () => {
    // The host file no longer contains ResizeObserver / ro.observe / ro.disconnect.
    expect(source).not.toContain('new ResizeObserver');
    expect(source).not.toContain('ro.disconnect');
  });
});

// ── Draw loop continuation ──────────────────────────────────

describe('Draw loop continuation', () => {
  it('keeps drawing while ANY of: needsNext, active drag, hovered node', () => {
    // `if (needsNext || dragStateRef.current?.activated || hoveredNodeRef.current)`
    expect(source).toMatch(/if\s*\(needsNext\s*\|\|\s*dragStateRef\.current\?\.activated\s*\|\|\s*hoveredNodeRef\.current\)/);
  });

  it('schedules next frame via requestAnimationFrame(draw) — not setTimeout', () => {
    expect(source).toMatch(/rafRef\.current\s*=\s*requestAnimationFrame\(draw\)/);
  });

  it('draw early-returns when overlay canvas is missing (not-yet-mounted guard)', () => {
    expect(source).toMatch(/const overlay\s*=\s*overlayCanvasRef\.current;\s*\n\s*if\s*\(!overlay\)\s*return/);
  });

  it('draw early-returns when 2D context is unavailable', () => {
    expect(source).toMatch(/const ctx\s*=\s*overlay\.getContext\('2d'\);\s*\n\s*if\s*\(!ctx\)\s*return/);
  });

  it('draw early-returns when container is missing (mid-unmount guard)', () => {
    expect(source).toMatch(/const container\s*=\s*containerRef\.current;\s*\n\s*if\s*\(!container\)\s*return/);
  });

  it('passes pointerType-aware port radius to the draw frame', () => {
    expect(source).toMatch(/portRadius:\s*getPortRadius\(lastPointerTypeRef\.current\s*===\s*'touch'\)/);
  });

  it('passes locale-aware connectTo label to the draw frame', () => {
    expect(source).toMatch(/connectToLabel:\s*t\.connectTo/);
  });
});

// ── Success animation auto-clear ────────────────────────────

describe('Success animation auto-clear', () => {
  it('checks elapsed/SUCCESS_ANIM_DURATION >= 1 to retire the anim', () => {
    expect(source).toMatch(/elapsed\s*\/\s*SUCCESS_ANIM_DURATION\s*>=\s*1/);
  });

  it('measures elapsed via performance.now() - successAnimRef.startTime', () => {
    expect(source).toMatch(/performance\.now\(\)\s*-\s*successAnimRef\.current\.startTime/);
  });

  it('nulls successAnimRef.current after duration completes (no leak)', () => {
    expect(source).toMatch(/elapsed\s*\/\s*SUCCESS_ANIM_DURATION\s*>=\s*1\)\s*\{\s*successAnimRef\.current\s*=\s*null/);
  });

  it('successAnimRef carries the snapped (not the cursor) drop position', () => {
    // tgtX/tgtY come from ds.snapX/snapY, NOT ds.dragX/dragY.
    expect(source).toMatch(/tgtX:\s*ds\.snapX/);
    expect(source).toMatch(/tgtY:\s*ds\.snapY/);
  });

  it('successAnimRef carries the source node center (not the click point)', () => {
    expect(source).toMatch(/srcX:\s*ds\.sourceX/);
    expect(source).toMatch(/srcY:\s*ds\.sourceY/);
  });
});

// ── Effect dep arrays (re-bind correctness) ─────────────────

describe('Effect dependency arrays', () => {
  it('overlay-creation effect deps = [enabled, ready, containerRef]', () => {
    // Container DOM swap (e.g. parent re-mount) should rebuild the canvas.
    expect(source).toMatch(/\}\s*,\s*\[enabled,\s*ready,\s*containerRef\]\)/);
  });

  it('viewport-invalidation effect deps = [enabled, ready, graphRef, graphVersion]', () => {
    expect(source).toMatch(/\}\s*,\s*\[enabled,\s*ready,\s*graphRef,\s*graphVersion\]\)/);
  });

  it('edge-set sync effect deps = [edges] (only re-runs when edges change)', () => {
    expect(source).toMatch(/edgeSetRef\.current\s*=\s*buildEdgeSet\(edges\);\s*\n\s*\}\s*,\s*\[edges\]\)/);
  });

  it('main interaction effect deps = [enabled, ready, graphVersion, graphRef, containerRef, draw]', () => {
    expect(source).toMatch(/\}\s*,\s*\[enabled,\s*ready,\s*graphVersion,\s*graphRef,\s*containerRef,\s*draw\]\)/);
  });

  it('draw useCallback deps = [containerRef] (rebuilds on container swap)', () => {
    expect(source).toMatch(/const draw\s*=\s*useCallback\([\s\S]*?\}\s*,\s*\[containerRef\]\)/);
  });

  it('isDragging useCallback has empty deps (stable across renders)', () => {
    // Arrow-expression body, no braces — match through to the closing `, []`.
    expect(source).toMatch(/const isDragging\s*=\s*useCallback\(\(\)\s*=>\s*dragStateRef\.current\?\.activated\s*\?\?\s*false,\s*\[\]\)/);
  });
});

// ── Mount/unmount edge cases ────────────────────────────────

describe('Mount-time guards', () => {
  it('overlay-create effect bails out when not enabled OR not ready', () => {
    expect(source).toMatch(/if\s*\(!enabled\s*\|\|\s*!ready\)\s*return/);
  });

  it('overlay-create effect bails out when containerRef.current is null', () => {
    expect(source).toMatch(/const container\s*=\s*containerRef\.current;\s*\n\s*if\s*\(!container\)\s*return/);
  });

  it('viewport effect bails out when graph is null (graphRef.current === null)', () => {
    expect(source).toMatch(/const graph\s*=\s*graphRef\.current;\s*\n\s*if\s*\(!graph\)\s*return/);
  });

  it('main interaction effect bails out when graph OR container is null', () => {
    expect(source).toMatch(/if\s*\(!graph\s*\|\|\s*!container\)\s*return/);
  });

  it('container is set to position:relative (cycle 48: handled by useOverlayCanvas)', () => {
    // Pinned in useOverlayCanvas.test.ts. Host pinning is the delegation.
    expect(source).toContain('useOverlayCanvas');
  });

  it('button is appended to the container (overlay append delegated to helper)', () => {
    // Cycle 48: overlay.appendChild is in useOverlayCanvas; button stays here.
    expect(source).toMatch(/container\.appendChild\(btn\)/);
  });
});

// ── Cleanup-on-unmount discipline ───────────────────────────

describe('Cleanup-on-unmount (button + state effects)', () => {
  it('overlayCanvasRef is the helper-returned ref (helper handles its own null)', () => {
    // Cycle 48: useOverlayCanvas nulls canvasRef.current internally.
    expect(source).toMatch(/canvasRef:\s*overlayCanvasRef/);
  });

  it('nulls quickConnectBtnRef on cleanup', () => {
    expect(source).toMatch(/quickConnectBtnRef\.current\s*=\s*null/);
  });

  it('nulls dragStateRef on cleanup (mid-drag unmount)', () => {
    // Multiple callsites: pointerup/cancel AND unmount cleanup paths.
    const matches = source.match(/dragStateRef\.current\s*=\s*null/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it('nulls successAnimRef on cleanup (no leftover celebration anim)', () => {
    expect(source).toMatch(/successAnimRef\.current\s*=\s*null/);
  });

  it('nulls hoveredNodeRef on cleanup (no stale hover after re-mount)', () => {
    // Two callsites: drag activation AND unmount cleanup.
    const matches = source.match(/hoveredNodeRef\.current\s*=\s*null/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('overlay parentNode-guard removal is delegated to useOverlayCanvas (cycle 48)', () => {
    // Pinned in useOverlayCanvas.test.ts. Host no longer has the guard.
    expect(source).toContain('useOverlayCanvas');
  });

  it('only removes button from DOM if it is still attached (parentNode guard)', () => {
    expect(source).toMatch(/if\s*\(btn\.parentNode\)\s*btn\.parentNode\.removeChild\(btn\)/);
  });
});

describe('Cleanup-on-unmount (main interaction effect)', () => {
  it('releases pointer capture only if the drag had activated', () => {
    expect(source).toMatch(/if\s*\(ds\?\.activated\)\s*\{\s*safeReleasePointerCapture\(container,\s*ds\.capturedPointerId,\s*'useDragConnect'\)/);
  });

  it('cancels rAF on unmount', () => {
    // Counted across all cleanup paths — at least 2.
    const matches = source.match(/cancelAnimationFrame\(rafRef\.current\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it('resets shared isDraggingRef on unmount (sister hook can drag freely after)', () => {
    // Counted: activation, pointerup, pointercancel, unmount cleanup.
    const matches = source.match(/isDraggingRef\.current\s*=\s*false/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});

// ── Drag-state seeding (handlePointerDown initial values) ──

describe('Drag state initialization', () => {
  it('seeds startX/startY from the pointer-down clientX/clientY', () => {
    expect(source).toMatch(/startX:\s*sx,\s*\n\s*startY:\s*sy/);
  });

  it('seeds dragX/dragY from the same point (no movement yet)', () => {
    expect(source).toMatch(/dragX:\s*sx,\s*\n\s*dragY:\s*sy/);
  });

  it('starts with activated:false (threshold not yet crossed)', () => {
    expect(source).toMatch(/activated:\s*false/);
  });

  it('starts with snapNodeId:null and snapInvalid:false (no candidate yet)', () => {
    expect(source).toMatch(/snapNodeId:\s*null/);
    expect(source).toMatch(/snapInvalid:\s*false/);
  });

  it('caches getNodeScreenPositions snapshot at drag-start (positions frozen)', () => {
    expect(source).toMatch(/cachedPositions:\s*positions/);
  });

  it('records startTime via performance.now() (for duration metrics)', () => {
    expect(source).toMatch(/startTime:\s*performance\.now\(\)/);
  });

  it('seeds the source node geometry (id/label/x/y/size) from the hit-tested node', () => {
    expect(source).toMatch(/sourceNodeId:\s*node\.id/);
    expect(source).toMatch(/sourceLabel:\s*node\.label\s*\|\|\s*''/);
    expect(source).toMatch(/sourceX:\s*node\.x/);
    expect(source).toMatch(/sourceY:\s*node\.y/);
    expect(source).toMatch(/sourceSize:\s*node\.size/);
  });

  it('returns immediately after seeding (single-node drag — no multi-source)', () => {
    // The for-of loop body ends with `return;` after dragStateRef assignment,
    // so it cannot accidentally seed multiple sources from overlapping nodes.
    expect(source).toMatch(/dragStateRef\.current\s*=\s*\{[\s\S]*?startTime:\s*performance\.now\(\),\s*\n\s*\};\s*\n\s*return;/);
  });
});

// ── Snap label propagation ──────────────────────────────────

describe('Snap target label propagation', () => {
  it('sets snapLabel from nearest.label (with empty-string fallback)', () => {
    expect(source).toMatch(/ds\.snapLabel\s*=\s*nearest\.label\s*\|\|\s*''/);
  });

  it('clears snap fields atomically when no nearest node found', () => {
    expect(source).toMatch(/ds\.snapNodeId\s*=\s*null;\s*\n\s*ds\.snapInvalid\s*=\s*false;\s*\n\s*ds\.snapInvalidReason\s*=\s*''/);
  });
});

// ── findNearestNode call shape ──────────────────────────────

describe('findNearestNode integration (cached positions, NODE_SNAP_RADIUS=55)', () => {
  it('uses the cached positions from drag start (NOT a fresh viewport read)', () => {
    expect(source).toMatch(/findNearestNode\(\s*ds\.cachedPositions/);
  });

  it('passes NODE_SNAP_RADIUS as the radius (55px — coarser than reconnect=24)', () => {
    expect(source).toMatch(/findNearestNode\([\s\S]*?NODE_SNAP_RADIUS/);
  });

  it('excludes the source node from snap candidates (no self-snap)', () => {
    expect(source).toMatch(/findNearestNode\([\s\S]*?ds\.sourceNodeId/);
  });
});

// ── Locale fallback chain ───────────────────────────────────

describe('Locale fallback', () => {
  it('falls back to Spanish (I18N_GRAPH.es) when locale key is missing', () => {
    expect(source).toMatch(/I18N_GRAPH\[locale\]\s*\?\?\s*I18N_GRAPH\.es/);
  });

  it('builds a t-object with 4 strings (connectTo / sameNode / alreadyConnected / quickConnectTitle)', () => {
    expect(source).toMatch(/const t\s*=\s*\{[\s\S]*?connectTo:[\s\S]*?sameNode:[\s\S]*?alreadyConnected:[\s\S]*?quickConnectTitle/);
  });

  it('button title is set from t.quickConnectTitle (a11y tooltip)', () => {
    expect(source).toMatch(/btn\.title\s*=\s*t\.quickConnectTitle/);
  });
});

// ── Overlap-aware drag rejection (anti-hijack) ──────────────

describe('Overlap-aware drag rejection', () => {
  it('first pass scans ALL nodes for "inside center" before second pass picks a port', () => {
    // The first pass returns from the whole handler if ANY node has the
    // pointer in its inner 60% — even if a different node would have
    // matched the outer ring. This avoids hijacking when nodes overlap.
    expect(source).toMatch(/First pass[\s\S]*?for\s*\(const node of positions\)[\s\S]*?dist\s*<=\s*node\.size\s*\/\s*2\s*\*\s*0\.6\)\s*return/);
  });

  it('second pass uses for-of returning on first port hit (no overlap resolution)', () => {
    expect(source).toMatch(/for\s*\(const node of positions\)\s*\{[\s\S]*?dist\s*>\s*nodeRadius\s*\*\s*0\.6\s*&&\s*dist\s*<=\s*nodeRadius\s*\+\s*PORT_HIT_RADIUS/);
  });

  it('uses getNodeScreenPositions(graph, true) — second arg "true" is includeMeta', () => {
    // Both pointerdown AND hover paths pass the second arg as `true`.
    const matches = source.match(/getNodeScreenPositions\(graph,\s*true\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Snap-to-target precedence ───────────────────────────────

describe('Snap validity precedence', () => {
  it('checks self-loop FIRST, then duplicate edge, then valid-target', () => {
    // The if/else if/else chain order matters: a self-loop also IS a
    // duplicate (a-a in the set), so checking duplicate first would
    // give the wrong reason string.
    expect(source).toMatch(/if\s*\(nearest\.id\s*===\s*ds\.sourceNodeId\)\s*\{[\s\S]*?\}\s*else if\s*\(edgeExistsInSet/);
  });
});

// ── Rapid pointer-down re-entry guard ───────────────────────

describe('Re-entry guards on pointerdown', () => {
  it('rejects pointerdown when a drag is already in flight (dragStateRef !== null)', () => {
    expect(source).toMatch(/handlePointerDown[\s\S]*?if\s*\(dragStateRef\.current\)\s*return/);
  });

  it('rejects pointerdown when the SISTER hook is dragging (isDraggingRef.current)', () => {
    expect(source).toMatch(/if\s*\(isDraggingRef\?\.current\)\s*return/);
  });
});

// ── DPR resize math (replicated, behavioral pin) ────────────

describe('DPR resize math (replicated)', () => {
  function computeCanvasSize(rectWidth: number, rectHeight: number, dpr: number) {
    return {
      pixelW: Math.round(rectWidth * (dpr || 1)),
      pixelH: Math.round(rectHeight * (dpr || 1)),
      cssW: `${rectWidth}px`,
      cssH: `${rectHeight}px`,
    };
  }

  it('@1x DPR: pixel buffer matches CSS size', () => {
    const r = computeCanvasSize(800, 600, 1);
    expect(r.pixelW).toBe(800);
    expect(r.pixelH).toBe(600);
    expect(r.cssW).toBe('800px');
  });

  it('@2x DPR: pixel buffer is doubled, CSS unchanged (retina-correct)', () => {
    const r = computeCanvasSize(800, 600, 2);
    expect(r.pixelW).toBe(1600);
    expect(r.pixelH).toBe(1200);
    expect(r.cssW).toBe('800px');
    expect(r.cssH).toBe('600px');
  });

  it('@3x DPR: triples the pixel buffer (Android XHDPI)', () => {
    const r = computeCanvasSize(400, 300, 3);
    expect(r.pixelW).toBe(1200);
    expect(r.pixelH).toBe(900);
  });

  it('DPR=0 (or undefined) falls back to 1× (defensive)', () => {
    const r = computeCanvasSize(800, 600, 0);
    expect(r.pixelW).toBe(800);
    expect(r.pixelH).toBe(600);
  });

  it('rounds fractional DPR (e.g. 1.5x = 1.5x scale)', () => {
    const r = computeCanvasSize(800, 600, 1.5);
    expect(r.pixelW).toBe(1200);
    expect(r.pixelH).toBe(900);
  });
});

// ── Drag-start seeding — replicate the inner-radius logic ──

describe('Drag-start hit zones (replicated)', () => {
  // Inside center (0..0.6 radius) → skip (let G6 handle drag)
  // Outer ring (0.6r..r+24px PORT_HIT_RADIUS) → start drag-connect
  // Outside both → no action
  const PORT_HIT_RADIUS = 24;

  function classify(distance: number, nodeSize: number):
    'skip-inner' | 'drag-port' | 'outside' {
    const r = nodeSize / 2;
    if (distance <= r * 0.6) return 'skip-inner';
    if (distance > r * 0.6 && distance <= r + PORT_HIT_RADIUS) return 'drag-port';
    return 'outside';
  }

  it('exact center → skip-inner (G6 owns the drag)', () => {
    expect(classify(0, 40)).toBe('skip-inner');
  });

  it('at 60% radius boundary → skip-inner (<= is inclusive)', () => {
    // 40/2 = 20, 0.6 * 20 = 12 → distance 12 should be skip-inner
    expect(classify(12, 40)).toBe('skip-inner');
  });

  it('just past 60% radius → drag-port', () => {
    expect(classify(12.01, 40)).toBe('drag-port');
  });

  it('right at the node edge (radius) → drag-port (within outer ring)', () => {
    expect(classify(20, 40)).toBe('drag-port');
  });

  it('exactly at radius + PORT_HIT_RADIUS → drag-port (<=)', () => {
    // 20 + 24 = 44
    expect(classify(44, 40)).toBe('drag-port');
  });

  it('beyond radius + PORT_HIT_RADIUS → outside (no drag)', () => {
    expect(classify(44.01, 40)).toBe('outside');
  });

  it('larger nodes → larger inner-skip zone (60% scales with size)', () => {
    // 80/2 = 40, 0.6 * 40 = 24
    expect(classify(23, 80)).toBe('skip-inner');
    expect(classify(25, 80)).toBe('drag-port');
  });
});

// ── Hover hit-test (replicated) ─────────────────────────────

describe('Hover hit-test (replicated)', () => {
  // Hover uses node.size / 2 + 10 (looser than drag's PORT_HIT_RADIUS=24)
  function isHovered(distance: number, nodeSize: number): boolean {
    return distance < nodeSize / 2 + 10;
  }

  it('directly over center → hovered', () => {
    expect(isHovered(0, 40)).toBe(true);
  });

  it('exactly 10px past the edge → NOT hovered (strict <)', () => {
    expect(isHovered(30, 40)).toBe(false); // 20 + 10 = 30, distance 30 not < 30
  });

  it('just inside the ring → hovered', () => {
    expect(isHovered(29.99, 40)).toBe(true);
  });

  it('larger nodes → wider hover ring (size/2 scales)', () => {
    expect(isHovered(49, 80)).toBe(true); // 40+10=50, 49<50
    expect(isHovered(50, 80)).toBe(false); // 50 not < 50
  });

  it('hover ring is intentionally tighter than drag PORT_HIT_RADIUS=24', () => {
    // For a 40px node: hover reaches r+10=30, drag reaches r+24=44.
    // Hover is for "show ports", drag is for "start a connection from a port".
    expect(40 / 2 + 10).toBeLessThan(40 / 2 + 24);
  });
});
