// ============================================================
// Contract test — KnowledgeGraph (the orchestrator)
//
// 698-line root component that composes the extracted hooks
// (useGraphInit, useGraphEvents, useGraphHighlighting,
// useDragConnect, useEdgeReconnect, useKeyboardNav, useSpacePan,
// useFullscreen) and renders the sub-component overlay set
// (GraphToolbar, GraphBreadcrumbs, GraphMasteryLegend,
// GraphMultiSelectBar, GraphShortcutsDialog).
//
// The granular logic lives in those modules — each is unit
// tested separately. This test guards the composition itself:
// what hooks are wired, what callbacks are exposed, what
// sub-components mount when, and what storage keys are used.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'KnowledgeGraph.tsx');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Module exports ──────────────────────────────────────────

describe('KnowledgeGraph module contract', () => {
  it('exports a memoized KnowledgeGraph component', () => {
    expect(source).toContain('export const KnowledgeGraph = memo(');
  });

  it('has no default export', () => {
    expect(source).not.toMatch(/export\s+default/);
  });

  it('declares the props interface internally', () => {
    expect(source).toContain('interface KnowledgeGraphProps');
  });
});

// ── Hook composition ────────────────────────────────────────

const COMPOSED_HOOKS = [
  'useGraphInit',
  'useGraphEvents',
  'useGraphHighlighting',
  'useDragConnect',
  'useEdgeReconnect',
  'useKeyboardNav',
  'useSpacePan',
  'useFullscreen',
];

describe('Hook composition (delegation)', () => {
  for (const hook of COMPOSED_HOOKS) {
    it(`imports ${hook} from its extracted module`, () => {
      expect(source).toMatch(new RegExp(`import[\\s\\S]*?\\b${hook}\\b[\\s\\S]*?from`));
    });

    it(`invokes ${hook} (composes the hook)`, () => {
      expect(source).toMatch(new RegExp(`\\b${hook}\\(`));
    });
  }
});

// ── Sub-component rendering ─────────────────────────────────

const SUB_COMPONENTS = [
  'GraphToolbar',
  'GraphBreadcrumbs',
  'GraphMasteryLegend',
  'GraphMultiSelectBar',
  'GraphShortcutsDialog',
];

describe('Sub-component rendering', () => {
  for (const comp of SUB_COMPONENTS) {
    it(`imports ${comp}`, () => {
      expect(source).toMatch(new RegExp(`import\\s*\\{\\s*${comp}\\s*\\}\\s*from`));
    });

    it(`renders <${comp}>`, () => {
      expect(source).toContain(`<${comp}`);
    });
  }
});

// ── Conditional sub-component mounting ──────────────────────

describe('Conditional sub-component mounting', () => {
  it('only mounts GraphToolbar when showToolbar prop is set', () => {
    expect(source).toMatch(/\{showToolbar\s*&&\s*\([\s\S]*?<GraphToolbar/);
  });

  it('only mounts GraphMasteryLegend when ready, showMasteryLegend, and graph is non-empty', () => {
    expect(source).toMatch(/ready\s*&&\s*showMasteryLegend\s*&&\s*data\.nodes\.length\s*>\s*0/);
  });

  it('only mounts GraphBreadcrumbs once `ready`', () => {
    // Pattern: {ready && (\n  <GraphBreadcrumbs
    expect(source).toMatch(/\{ready\s*&&\s*\([\s\S]*?<GraphBreadcrumbs/);
  });

  it('only mounts GraphMultiSelectBar once `ready`', () => {
    expect(source).toMatch(/\{ready\s*&&\s*\([\s\S]*?<GraphMultiSelectBar/);
  });

  it('only renders the quick-add button when ready, focusedNodeId, and onQuickAdd are present', () => {
    expect(source).toMatch(/ready\s*&&\s*focusedNodeId\s*&&\s*onQuickAdd/);
  });

  it('renders the mobile fit-view button only after ready and after the hint dismisses', () => {
    expect(source).toMatch(/ready\s*&&\s*!showMobileHint/);
  });
});

// ── Refs / callback stability pattern ───────────────────────

describe('Callback stability via refs', () => {
  // Pattern: const xRef = useRef(x); xRef.current = x;
  // Used to keep G6 event handlers stable across prop changes.
  const REF_BACKED_CALLBACKS = [
    'onDragConnectRef',
    'onNodeClickRef',
    'onNodeRightClickRef',
    'onZoomChangeRef',
    'onReadyRef',
    'onCollapseChangeRef',
    'onMultiSelectRef',
  ];

  for (const ref of REF_BACKED_CALLBACKS) {
    it(`mirrors the callback prop into ${ref}`, () => {
      expect(source).toContain(ref);
    });
  }
});

// ── Storage keys ────────────────────────────────────────────

describe('Storage keys (sessionStorage)', () => {
  it('persists the mobile-hint dismissal under axon_map_mobile_hint_seen', () => {
    expect(source).toContain('axon_map_mobile_hint_seen');
  });

  it('reads the storage key inside try/catch (Safari private mode)', () => {
    expect(source).toMatch(/try\s*\{\s*return\s*!sessionStorage\.getItem\('axon_map_mobile_hint_seen'\)/);
  });

  it('writes the storage key inside try/catch', () => {
    expect(source).toMatch(/try\s*\{\s*sessionStorage\.setItem\('axon_map_mobile_hint_seen'/);
  });
});

// ── Multi-selection state machine ───────────────────────────

describe('Multi-selection wiring', () => {
  it('tracks multi-selected node ids in state + ref pair', () => {
    expect(source).toContain('multiSelectedIds');
    expect(source).toContain('multiSelectedIdsRef');
    expect(source).toMatch(/multiSelectedIdsRef\.current\s*=\s*multiSelectedIds/);
  });

  it('filters user-created nodes for delete eligibility', () => {
    expect(source).toContain('selectedUserCreatedIds');
    expect(source).toContain('isUserCreated');
  });

  it('shares an isDraggingRef between useDragConnect and useEdgeReconnect', () => {
    expect(source).toContain('sharedIsDraggingRef');
    // Both hooks receive the same ref
    expect(source).toMatch(/useDragConnect\(\{[\s\S]*?isDraggingRef:\s*sharedIsDraggingRef/);
    expect(source).toMatch(/useEdgeReconnect\(\{[\s\S]*?isDraggingRef:\s*sharedIsDraggingRef/);
  });
});

// ── Auto-layout cycle ───────────────────────────────────────

describe('Auto-layout cycle (handleAutoLayout)', () => {
  it('cycles through 5 layouts: d3-force → dagre → radial → mindmap → concentric', () => {
    expect(source).toMatch(/\['d3-force',\s*'dagre',\s*'radial',\s*'mindmap',\s*'concentric'\]/);
  });

  it('imports the layout configs from useGraphInit', () => {
    expect(source).toContain('LAYOUT_FORCE');
    expect(source).toContain('LAYOUT_RADIAL');
    expect(source).toContain('LAYOUT_DAGRE');
    expect(source).toContain('LAYOUT_MINDMAP');
    expect(source).toContain('LAYOUT_CONCENTRIC');
  });

  it('guards against double-firing via layoutInProgressRef', () => {
    expect(source).toContain('layoutInProgressRef.current = true');
    expect(source).toMatch(/layoutInProgressRef\.current\s*=\s*false/);
  });
});

// ── Zoom-limit flash ────────────────────────────────────────

describe('Zoom-limit flash', () => {
  it('declares the keyframes constant at module scope', () => {
    expect(source).toContain('ZOOM_LIMIT_FLASH_KEYFRAMES');
    expect(source).toContain('@keyframes kg-zoom-limit-flash');
  });

  it('flashZoomLimit clears any previous timer (no leaks)', () => {
    expect(source).toMatch(/if\s*\(\s*zoomLimitTimerRef\.current\s*\)\s*clearTimeout\(zoomLimitTimerRef\.current\)/);
  });

  it('the timer is also cleared on unmount', () => {
    expect(source).toMatch(/useEffect\(\(\)\s*=>\s*\(\)\s*=>\s*\{\s*if\s*\(\s*zoomLimitTimerRef\.current\s*\)\s*clearTimeout/);
  });

  it('uses 400ms flash duration matching the keyframes', () => {
    expect(source).toMatch(/setTimeout\(\(\)\s*=>\s*setZoomLimitFlash\(false\),\s*400\)/);
  });
});

// ── Combo grouping ──────────────────────────────────────────

describe('Combo grouping', () => {
  it('requires at least 2 selected nodes to create a combo', () => {
    expect(source).toMatch(/if\s*\(\s*ids\.length\s*<\s*2\s*\)\s*return/);
  });

  it('persists combos via saveCombos when topicId is present', () => {
    expect(source).toContain('saveCombos');
    expect(source).toMatch(/if\s*\(\s*topicId\s*\)\s*saveCombos\(topicId/);
  });

  it('uses comboCounterRef + Date.now() for unique combo IDs', () => {
    expect(source).toContain('comboCounterRef.current += 1');
    expect(source).toContain('combo-${Date.now()}');
  });
});

// ── Accessibility ───────────────────────────────────────────

describe('Accessibility', () => {
  it('declares role="application" on the canvas container', () => {
    expect(source).toContain('role="application"');
  });

  it('exposes aria-busy bound to readiness', () => {
    expect(source).toContain('aria-busy={!ready}');
  });

  it('emits a screen-reader node list with aria-live="polite"', () => {
    expect(source).toMatch(/className="sr-only"\s+aria-live="polite"/);
  });

  it('emits a focused-node announcement with aria-live="assertive"', () => {
    expect(source).toMatch(/aria-live="assertive"/);
  });

  it('includes connection counts in the SR announcement', () => {
    expect(source).toContain('connectionCount');
    expect(source).toContain('t.srNodeItem');
  });
});

// ── Defaults ────────────────────────────────────────────────

describe('Prop defaults', () => {
  it('layout defaults to "force"', () => {
    expect(source).toMatch(/layout\s*=\s*'force'/);
  });

  it('locale defaults to "es" (Spanish — student default)', () => {
    expect(source).toMatch(/locale\s*=\s*'es'/);
  });

  it('falls back to es i18n when locale lookup misses', () => {
    expect(source).toMatch(/I18N_GRAPH\[locale\]\s*\?\?\s*I18N_GRAPH\.es/);
  });

  it('showMinimap defaults to false', () => {
    expect(source).toMatch(/showMinimap\s*=\s*false/);
  });

  it('showMasteryLegend defaults to true', () => {
    expect(source).toMatch(/showMasteryLegend\s*=\s*true/);
  });

  it('enableDragConnect defaults to false (opt-in feature)', () => {
    expect(source).toMatch(/enableDragConnect\s*=\s*false/);
  });

  it('enableEdgeReconnect defaults to false (opt-in feature)', () => {
    expect(source).toMatch(/enableEdgeReconnect\s*=\s*false/);
  });

  it('showToolbar defaults to false (backward compat)', () => {
    expect(source).toMatch(/showToolbar\s*=\s*false/);
  });
});

// ── Defensive teardown ──────────────────────────────────────

describe('Defensive teardown', () => {
  it('uses warnIfNotDestroyed on the floating fit-view click', () => {
    expect(source).toContain('warnIfNotDestroyed');
  });

  it('catches errors when calling graph.fitView during transitions', () => {
    expect(source).toMatch(/try\s*\{\s*graph\.fitView/);
  });

  it('checks mountedRef.current and graphRef identity before post-layout work', () => {
    expect(source).toMatch(/if\s*\(\s*!mountedRef\.current\s*\|\|\s*graphRef\.current\s*!==\s*graph\s*\)\s*return/);
  });
});
