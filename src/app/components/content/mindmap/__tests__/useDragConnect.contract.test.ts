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
