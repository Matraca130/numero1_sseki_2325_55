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

// ── Toolbar delegate handlers ──────────────────────────────

describe('Toolbar delegate handlers (graphControlsRef passthrough)', () => {
  it('handleZoomIn delegates via graphControlsRef.current?.zoomIn()', () => {
    expect(source).toMatch(/const handleZoomIn\s*=\s*useCallback\(\(\)\s*=>\s*\{\s*graphControlsRef\.current\?\.zoomIn\(\)/);
  });

  it('handleZoomOut delegates via graphControlsRef.current?.zoomOut()', () => {
    expect(source).toMatch(/const handleZoomOut\s*=\s*useCallback\(\(\)\s*=>\s*\{\s*graphControlsRef\.current\?\.zoomOut\(\)/);
  });

  it('handleFitView delegates via graphControlsRef.current?.fitView()', () => {
    expect(source).toMatch(/const handleFitView\s*=\s*useCallback\(\(\)\s*=>\s*\{\s*graphControlsRef\.current\?\.fitView\(\)/);
  });

  it('handleResetZoom uses optional resetZoom (not all controls expose it)', () => {
    expect(source).toMatch(/graphControlsRef\.current\?\.resetZoom\?\.\(\)/);
  });

  it('handleCollapseAll/handleExpandAll delegate to controls', () => {
    expect(source).toMatch(/graphControlsRef\.current\?\.collapseAll\(\)/);
    expect(source).toMatch(/graphControlsRef\.current\?\.expandAll\(\)/);
  });

  it('handleExportPNG awaits graphControlsRef.current?.exportPNG()', () => {
    expect(source).toMatch(/handleExportPNG\s*=\s*useCallback\(async\s*\(\)\s*=>\s*\{\s*await\s+graphControlsRef\.current\?\.exportPNG\(\)/);
  });

  it('handleExportJPEG awaits graphControlsRef.current?.exportJPEG()', () => {
    expect(source).toMatch(/handleExportJPEG\s*=\s*useCallback\(async\s*\(\)\s*=>\s*\{\s*await\s+graphControlsRef\.current\?\.exportJPEG\(\)/);
  });

  it('handleUndo/handleRedo are optional via ?.()', () => {
    expect(source).toMatch(/graphControlsRef\.current\?\.undo\?\.\(\)/);
    expect(source).toMatch(/graphControlsRef\.current\?\.redo\?\.\(\)/);
  });

  it('handleHullsToggle uses functional setState (avoids stale closure)', () => {
    expect(source).toMatch(/setShowHulls\(v\s*=>\s*!v\)/);
  });

  it('all toolbar delegates use empty-deps useCallback (refs are stable)', () => {
    expect(source).toMatch(/handleZoomIn\s*=\s*useCallback\([\s\S]{0,100}\},\s*\[\]\)/);
    expect(source).toMatch(/handleZoomOut\s*=\s*useCallback\([\s\S]{0,100}\},\s*\[\]\)/);
    expect(source).toMatch(/handleFitView\s*=\s*useCallback\([\s\S]{0,100}\},\s*\[\]\)/);
  });
});

// ── Breadcrumb click handler ───────────────────────────────

describe('handleBreadcrumbClick', () => {
  it('clears collapsedNodes and breadcrumbs when crumbId is null (root)', () => {
    expect(source).toMatch(/if\s*\(\s*crumbId\s*===\s*null\s*\)\s*\{[\s\S]{0,200}setCollapsedNodes\(new Set\(\)\)/);
    expect(source).toMatch(/if\s*\(\s*crumbId\s*===\s*null\s*\)[\s\S]{0,300}setBreadcrumbs\(\[\]\)/);
  });

  it('notifies onCollapseChange with empty set on root click', () => {
    expect(source).toMatch(/onCollapseChangeRef\.current\?\.\(0,\s*new Set\(\)\)/);
  });

  it('uses graph.fitView with 400ms ease-out on root click', () => {
    expect(source).toMatch(/graph\.fitView\(undefined,\s*\{\s*duration:\s*400,\s*easing:\s*'ease-out'\s*\}\)/);
  });

  it('finds the crumb idx via prev.findIndex(b => b.id === crumbId)', () => {
    expect(source).toMatch(/prev\.findIndex\(b\s*=>\s*b\.id\s*===\s*crumbId\)/);
  });

  it('returns prev unchanged when idx < 0 (defensive)', () => {
    expect(source).toMatch(/if\s*\(\s*idx\s*<\s*0\s*\)\s*return\s+prev/);
  });

  it('removes downstream crumbs from collapsed set on intermediate click', () => {
    expect(source).toMatch(/for\s*\(\s*const\s+r\s+of\s+removed\s*\)\s*next\.delete\(r\.id\)/);
  });

  it('focusElements with 400ms ease-in-out for intermediate crumb', () => {
    expect(source).toMatch(/graph\.focusElements\(\[crumbId\],\s*\{\s*animation:\s*\{\s*duration:\s*400,\s*easing:\s*'ease-in-out'\s*\}\s*\}\)/);
  });
});

// ── handleGroupSelection ───────────────────────────────────

describe('handleGroupSelection (combo creation)', () => {
  it('exits early if fewer than 2 nodes selected', () => {
    expect(source).toMatch(/const ids\s*=\s*Array\.from\(multiSelectedIds\)/);
    expect(source).toMatch(/if\s*\(\s*ids\.length\s*<\s*2\s*\)\s*return/);
  });

  it('builds combo with t.groupLabel(comboCounter) localized label', () => {
    expect(source).toMatch(/label:\s*t\.groupLabel\(comboCounterRef\.current\)/);
  });

  it('combo defaults to collapsed=false', () => {
    expect(source).toMatch(/collapsed:\s*false/);
  });

  it('appends new combo to existing combos (immutable spread)', () => {
    expect(source).toMatch(/const nextCombos\s*=\s*\[\.\.\.combos,\s*newCombo\]/);
  });

  it('calls graph.addComboData with id and label', () => {
    expect(source).toMatch(/graph\.addComboData\(\[\{\s*id:\s*comboId,\s*data:\s*\{\s*label:\s*newCombo\.label\s*\}\s*\}\]\)/);
  });

  it('updates each node with the combo id via updateNodeData', () => {
    expect(source).toMatch(/graph\.updateNodeData\(ids\.map\(nId\s*=>\s*\(\{\s*id:\s*nId,\s*combo:\s*comboId\s*\}\)\)\)/);
  });

  it('triggers batchDraw after combo creation', () => {
    expect(source).toMatch(/graph\.updateNodeData[\s\S]{0,200}batchDraw\(\)/);
  });

  it('clears multi-selection after grouping', () => {
    expect(source).toMatch(/updateMultiSelection\(new Set\(\)\)/);
  });
});

// ── handleFocusSelection ───────────────────────────────────

describe('handleFocusSelection', () => {
  it('exits early when graph is null OR no nodes selected', () => {
    expect(source).toMatch(/if\s*\(\s*!graph\s*\|\|\s*multiSelectedIds\.size\s*===\s*0\s*\)\s*return/);
  });

  it('calls focusElements with 400ms ease-in-out animation', () => {
    expect(source).toMatch(/graph\.focusElements\(ids,\s*\{\s*animation:\s*\{\s*duration:\s*400,\s*easing:\s*'ease-in-out'\s*\}\s*\}\)/);
  });

  it('catches errors silently if graph is destroyed', () => {
    expect(source).toMatch(/graph\.focusElements\(ids[\s\S]{0,200}catch\s*\{[\s\S]{0,80}destroyed/);
  });
});

// ── handleGridToggle ───────────────────────────────────────

describe('handleGridToggle', () => {
  it('flips current gridEnabled and persists via saveGridEnabled', () => {
    expect(source).toMatch(/const next\s*=\s*!gridEnabled/);
    expect(source).toMatch(/saveGridEnabled\(next\)/);
  });

  it('updates internal state via setGridEnabledInternal(next)', () => {
    expect(source).toMatch(/setGridEnabledInternal\(next\)/);
  });

  it('notifies parent via onGridChange?.(next)', () => {
    expect(source).toMatch(/onGridChange\?\.\(next\)/);
  });
});

// ── Auto-layout cycle (deeper) ─────────────────────────────

describe('handleAutoLayout (deeper)', () => {
  it('exits early when graph is null OR a layout is already in progress', () => {
    expect(source).toMatch(/if\s*\(\s*!graph\s*\|\|\s*layoutInProgressRef\.current\s*\)\s*return/);
  });

  it('handles both array and object getLayout() return shapes', () => {
    expect(source).toMatch(/Array\.isArray\(currentLayout\)/);
    expect(source).toMatch(/currentLayout\[0\]\s*as\s*Record<string,\s*unknown>/);
  });

  it('falls back to d3-force when current layout type is unknown', () => {
    expect(source).toMatch(/\|\|\s*'d3-force'/);
  });

  it('rotates to next layout via (idx + 1) % layouts.length', () => {
    expect(source).toMatch(/\(idx\s*\+\s*1\)\s*%\s*layouts\.length/);
  });

  it('animates fitView 300ms ease-out after layout completes', () => {
    expect(source).toMatch(/graph\.fitView\(undefined,\s*\{\s*duration:\s*300,\s*easing:\s*'ease-out'\s*\}\)/);
  });

  it('chains layout with .then().catch().finally() for proper cleanup', () => {
    expect(source).toMatch(/graph\.layout\(\)\.then\([\s\S]{0,500}\)\.catch\([\s\S]{0,80}\)\.finally\(/);
  });
});

// ── Mobile hint auto-dismiss ───────────────────────────────

describe('Mobile hint auto-dismiss', () => {
  it('auto-dismisses after 4000ms when ready and visible', () => {
    expect(source).toMatch(/setTimeout\([\s\S]{0,200}setShowMobileHint\(false\)[\s\S]{0,200},\s*4000\)/);
  });

  it('writes the seen flag to sessionStorage when auto-dismissing', () => {
    expect(source).toMatch(/sessionStorage\.setItem\('axon_map_mobile_hint_seen',\s*'1'\)/);
  });

  it('the auto-dismiss effect cleans up its timer on unmount', () => {
    expect(source).toMatch(/setTimeout[\s\S]{0,300}return\s*\(\)\s*=>\s*clearTimeout\(hintTimer\)/);
  });

  it('the auto-dismiss effect depends on [ready, showMobileHint]', () => {
    expect(source).toMatch(/setTimeout[\s\S]{0,400}\},\s*\[ready,\s*showMobileHint\]\)/);
  });

  it('hint only shows when nodes.length > 5 (avoids noise on small graphs)', () => {
    expect(source).toMatch(/showMobileHint\s*&&\s*data\.nodes\.length\s*>\s*5/);
  });

  it('uses devWarn (not silent catch) for the storage error path', () => {
    expect(source).toMatch(/devWarn\('KnowledgeGraph',\s*'swallowed error',\s*e\)/);
  });
});

// ── srNodeList memoization ─────────────────────────────────

describe('srNodeList memoization', () => {
  it('builds connection-count map by iterating data.edges', () => {
    expect(source).toMatch(/connectionCount\.set\(edge\.source,\s*\(connectionCount\.get\(edge\.source\)\s*\|\|\s*0\)\s*\+\s*1\)/);
    expect(source).toMatch(/connectionCount\.set\(edge\.target,\s*\(connectionCount\.get\(edge\.target\)\s*\|\|\s*0\)\s*\+\s*1\)/);
  });

  it('protects against negative mastery via node.mastery >= 0 ? mastery : 0', () => {
    expect(source).toMatch(/node\.mastery\s*>=\s*0\s*\?\s*node\.mastery\s*:\s*0/);
  });

  it('uses connectionCount.get(node.id) || 0 (handles isolated nodes)', () => {
    expect(source).toMatch(/connectionCount\.get\(node\.id\)\s*\|\|\s*0/);
  });

  it('useMemo depends on [data, t]', () => {
    expect(source).toMatch(/srNodeList\s*=\s*useMemo\([\s\S]{0,1500}\},\s*\[data,\s*t\]\)/);
  });

  it('aria-label uses t.srNodeListLabel localized key', () => {
    expect(source).toContain('t.srNodeListLabel');
  });
});

// ── GraphToolbar prop wiring ───────────────────────────────

describe('GraphToolbar prop wiring (when showToolbar=true)', () => {
  it('passes layout + onLayoutChange (with no-op fallback)', () => {
    expect(source).toMatch(/onLayoutChange=\{onLayoutChange\s*\?\?\s*\(\(\)\s*=>\s*\{\}\)\}/);
  });

  it('passes nodeCount=data.nodes.length and edgeCount=data.edges.length', () => {
    expect(source).toMatch(/nodeCount=\{data\.nodes\.length\}/);
    expect(source).toMatch(/edgeCount=\{data\.edges\.length\}/);
  });

  it('passes searchQuery + onSearchChange (with no-op fallback)', () => {
    expect(source).toMatch(/onSearchChange=\{onSearchChange\s*\?\?\s*\(\(\)\s*=>\s*\{\}\)\}/);
  });

  it('passes matchCount=highlightNodeIds?.size for search results count', () => {
    expect(source).toMatch(/matchCount=\{highlightNodeIds\?\.size\}/);
  });

  it('binds zoomLevel to local state', () => {
    expect(source).toMatch(/zoomLevel=\{zoomLevel\}/);
  });

  it('forwards isFullscreen / onFullscreen from useFullscreen', () => {
    expect(source).toMatch(/onFullscreen=\{toggleFullscreen\}/);
    expect(source).toMatch(/isFullscreen=\{isFullscreen\}/);
  });

  it('forwards onUndo / onRedo / onResetZoom', () => {
    expect(source).toMatch(/onUndo=\{handleUndo\}/);
    expect(source).toMatch(/onRedo=\{handleRedo\}/);
    expect(source).toMatch(/onResetZoom=\{handleResetZoom\}/);
  });

  it('forwards showHulls + onHullsToggle', () => {
    expect(source).toMatch(/showHulls=\{showHulls\}/);
    expect(source).toMatch(/onHullsToggle=\{handleHullsToggle\}/);
  });

  it('forwards onAutoLayout=handleAutoLayout', () => {
    expect(source).toMatch(/onAutoLayout=\{handleAutoLayout\}/);
  });
});

// ── GraphMultiSelectBar wiring ─────────────────────────────

describe('GraphMultiSelectBar prop wiring', () => {
  it('onClearSelection passes new Set() to clear all', () => {
    expect(source).toMatch(/onClearSelection=\{\(\)\s*=>\s*updateMultiSelection\(new Set\(\)\)\}/);
  });

  it('forwards selectedUserCreatedIds (filtered list)', () => {
    expect(source).toMatch(/selectedUserCreatedIds=\{selectedUserCreatedIds\}/);
  });

  it('forwards multiSelectedCount', () => {
    expect(source).toMatch(/multiSelectedCount=\{multiSelectedCount\}/);
  });

  it('forwards onGroupSelection + onFocusSelection', () => {
    expect(source).toMatch(/onGroupSelection=\{handleGroupSelection\}/);
    expect(source).toMatch(/onFocusSelection=\{handleFocusSelection\}/);
  });
});

// ── Container styling (visual contract) ────────────────────

describe('Container styling', () => {
  it('canvas container is rounded-2xl with shadow-sm and border', () => {
    expect(source).toMatch(/className="w-full h-full bg-white rounded-2xl shadow-sm border border-gray-200/);
  });

  it('canvas container disables touch panning via touchAction: "none"', () => {
    expect(source).toMatch(/style=\{\{\s*touchAction:\s*'none'\s*\}\}/);
  });

  it('canvas container has tabIndex={0} for keyboard focus', () => {
    expect(source).toContain('tabIndex={0}');
  });

  it('aria-describedby points to the kg-shortcut-desc element', () => {
    expect(source).toContain('aria-describedby="kg-shortcut-desc"');
    expect(source).toContain('id="kg-shortcut-desc"');
  });

  it('fullscreen className adds fixed inset-0 z-50 bg-white flex flex-col', () => {
    expect(source).toContain("'fixed inset-0 z-50 bg-white flex flex-col'");
  });

  it('responsive min-height: 180px mobile / 300px sm+', () => {
    expect(source).toMatch(/min-h-\[180px\]\s+sm:min-h-\[300px\]/);
  });
});

// ── Quick-add button ────────────────────────────────────────

describe('Quick-add button', () => {
  it('only renders when ready && focusedNodeId && onQuickAdd', () => {
    expect(source).toMatch(/ready\s*&&\s*focusedNodeId\s*&&\s*onQuickAdd/);
  });

  it('onClick calls onQuickAdd(focusedNodeId)', () => {
    expect(source).toMatch(/onClick=\{\(\)\s*=>\s*onQuickAdd\(focusedNodeId\)\}/);
  });

  it('uses teal-700 text + teal-50 hover (design system)', () => {
    expect(source).toMatch(/text-teal-700/);
    expect(source).toMatch(/hover:bg-teal-50/);
  });

  it('aria-label and title both bound to t.quickAdd', () => {
    expect(source).toMatch(/aria-label=\{t\.quickAdd\}/);
    expect(source).toMatch(/title=\{t\.quickAdd\}/);
  });
});

// ── SR collapse announcement ───────────────────────────────

describe('Collapse-state SR announcement', () => {
  it('announces t.nCollapsed(count) when collapsedCount > 0', () => {
    expect(source).toMatch(/collapsedCount\s*>\s*0[\s\S]{0,100}t\.nCollapsed\(collapsedCount\)/);
  });

  it('announces t.allExpanded once ready when nothing is collapsed', () => {
    expect(source).toMatch(/ready\s*\?\s*t\.allExpanded\s*:\s*''/);
  });

  it('announces t.focusedNode(label) under aria-live="assertive"', () => {
    expect(source).toMatch(/aria-live="assertive"[\s\S]{0,200}t\.focusedNode/);
  });
});

// ── Shared drag ref invariant ──────────────────────────────

describe('Shared isDraggingRef invariant', () => {
  it('initializes sharedIsDraggingRef = useRef(false)', () => {
    expect(source).toMatch(/const sharedIsDraggingRef\s*=\s*useRef\(false\)/);
  });
});
