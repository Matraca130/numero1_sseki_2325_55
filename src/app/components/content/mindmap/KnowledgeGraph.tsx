// ============================================================
// Axon — KnowledgeGraph (G6 Canvas Component)
//
// Core graph visualization using @antv/g6.
// Renders keyword nodes with mastery colors and connection edges.
//
// Features:
//   - Force-directed layout with mind-map option
//   - Mastery-colored nodes (green/yellow/red/gray)
//   - Connection type colored edges
//   - Click → context menu
//   - Double-click → collapse/expand branch (XMind-style)
//   - Zoom/pan with smooth animations
//   - Keyboard shortcuts (+/- zoom, Esc deselect)
//   - Hover tooltips with definition
//   - Responsive container
//   - Multi-selection (Shift+click / brush-select) with action bar
//   - Mastery color legend (bottom-left)
// ============================================================

import { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react';
import type { Graph } from '@antv/g6';
import { Maximize2, Plus } from 'lucide-react';
import type { GraphData, MapNode, GraphControls } from '@/app/types/mindmap';
import { GRAPH_COLORS, devWarn } from './graphHelpers';
import { saveGridEnabled, saveCombos } from './useNodePositions';
import type { PersistedCombo } from './useNodePositions';
import { useKeyboardNav } from './useKeyboardNav';
import { useSpacePan } from './useSpacePan';
import { useEdgeReconnect } from './useEdgeReconnect';
import type { EdgeReconnectResult } from './useEdgeReconnect';
import { useDragConnect } from './useDragConnect';
import { I18N_GRAPH } from './graphI18n';
import type { GraphLocale } from './graphI18n';
import { GraphToolbar } from './GraphToolbar';
import { useFullscreen } from './useFullscreen';
import { useMobileHint } from './useMobileHint';

// Extracted hooks
import { useGraphInit, warnIfNotDestroyed, LAYOUT_FORCE, LAYOUT_RADIAL, LAYOUT_DAGRE, LAYOUT_MINDMAP, LAYOUT_CONCENTRIC } from './useGraphInit';
import { useGraphEvents } from './useGraphEvents';
import { useGraphHighlighting } from './useGraphHighlighting';

// Extracted sub-components
import { GraphBreadcrumbs } from './GraphBreadcrumbs';
import { GraphShortcutsDialog } from './GraphShortcutsDialog';
import { GraphMasteryLegend } from './GraphMasteryLegend';
import { GraphMultiSelectBar } from './GraphMultiSelectBar';

// ── Module-level constants ──
const ZOOM_LIMIT_FLASH_KEYFRAMES = `@keyframes kg-zoom-limit-flash { 0% { opacity: 1; } 100% { opacity: 0; } }`;

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick?: (node: MapNode | null, position?: { x: number; y: number }) => void;
  onNodeRightClick?: (node: MapNode, position: { x: number; y: number }) => void;
  selectedNodeId?: string | null;
  layout?: 'force' | 'radial' | 'dagre' | 'mindmap' | 'concentric' | 'circular' | 'fruchterman';
  className?: string;
  /** Called when the graph is ready, exposes zoom/fitView/collapse controls */
  onReady?: (controls: GraphControls) => void;
  /** Set of node IDs that match the current search query — highlighted with glow, others dimmed */
  highlightNodeIds?: Set<string>;
  /** Called when collapsed node count changes — also passes the set of collapsed IDs */
  onCollapseChange?: (collapsedCount: number, collapsedIds: Set<string>) => void;
  /** UI language: 'es' (default) for student, 'pt' for Portuguese */
  locale?: GraphLocale;
  /** Set of node IDs that AI recommends reviewing — shown with orange warning ring */
  reviewNodeIds?: Set<string>;
  /** Topic ID for persisting user-dragged node positions */
  topicId?: string;
  /** Whether to show the minimap navigation overview */
  showMinimap?: boolean;
  /** Called when multi-selected nodes change (Shift+click or brush-select) */
  onMultiSelect?: (nodeIds: string[]) => void;
  /** Called when user clicks "Eliminar seleccion" in the multi-select action bar */
  onDeleteNodes?: (nodeIds: string[]) => void;
  /** Called when user clicks "Conectar" with exactly 2 nodes selected */
  onConnectNodes?: (sourceId: string, targetId: string) => void;
  /** Whether to show the mastery color legend */
  showMasteryLegend?: boolean;
  /** Custom node colors map: nodeId → hex color (for user-created nodes) */
  customNodeColors?: Map<string, string>;
  /** Called when user presses "+" with a node focused — opens quick-add flow */
  onQuickAdd?: (sourceNodeId: string) => void;
  /** Whether grid lines are visible on the canvas */
  showGrid?: boolean;
  /** Callback when grid toggle changes */
  onGridChange?: (enabled: boolean) => void;
  /** Whether to enable drag-to-connect from node borders */
  enableDragConnect?: boolean;
  /** Called when user creates a new edge by dragging from one node to another */
  onDragConnect?: (sourceId: string, targetId: string) => void;
  /** Whether to enable dragging edge endpoints to reconnect to different nodes (custom edges only) */
  enableEdgeReconnect?: boolean;
  /** Called when a user-created edge is reconnected to a different node */
  onEdgeReconnect?: (result: EdgeReconnectResult) => void;
  /** Called when zoom level changes (value is the zoom ratio, e.g. 1.0 = 100%) */
  onZoomChange?: (zoom: number) => void;
  /** Called when the embedded GraphToolbar requests a layout change */
  onLayoutChange?: (layout: 'force' | 'radial' | 'dagre' | 'mindmap' | 'concentric' | 'circular' | 'fruchterman') => void;
  /** Current search query — passed to embedded GraphToolbar */
  searchQuery?: string;
  /** Called when user types in the embedded GraphToolbar search field */
  onSearchChange?: (query: string) => void;
  /** Whether to render the embedded GraphToolbar (default false — backward compatible) */
  showToolbar?: boolean;
}

// ── Component ───────────────────────────────────────────────

export const KnowledgeGraph = memo(function KnowledgeGraph({
  data,
  onNodeClick,
  onNodeRightClick,
  selectedNodeId,
  layout = 'force',
  className = '',
  onReady,
  highlightNodeIds,
  onCollapseChange,
  locale = 'es',
  reviewNodeIds,
  topicId,
  showMinimap = false,
  onMultiSelect,
  onDeleteNodes,
  onConnectNodes,
  showMasteryLegend = true,
  customNodeColors,
  onQuickAdd,
  showGrid: showGridProp,
  onGridChange,
  enableDragConnect = false,
  onDragConnect,
  enableEdgeReconnect = false,
  onEdgeReconnect,
  onZoomChange,
  onLayoutChange,
  searchQuery = '',
  onSearchChange,
  showToolbar = false,
}: KnowledgeGraphProps) {
  const t = I18N_GRAPH[locale] ?? I18N_GRAPH.es;

  // Fullscreen support for embedded toolbar
  const { isFullscreen, toggleFullscreen, fullscreenRef } = useFullscreen();

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());
  const multiSelectedIdsRef = useRef(multiSelectedIds);
  multiSelectedIdsRef.current = multiSelectedIds;

  // Stable ref for onDragConnect
  const onDragConnectRef = useRef(onDragConnect);
  onDragConnectRef.current = onDragConnect;

  // Stable refs for event callbacks — prevents G6 event re-registration on prop change
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;
  const onNodeRightClickRef = useRef(onNodeRightClick);
  onNodeRightClickRef.current = onNodeRightClick;
  const [zoomLevel, setZoomLevel] = useState(1);
  const onZoomChangeRef = useRef<((zoom: number) => void) | undefined>(undefined);
  onZoomChangeRef.current = (zoom: number) => {
    setZoomLevel(zoom);
    onZoomChange?.(zoom);
  };
  const graphControlsRef = useRef<GraphControls | null>(null);
  const onReadyRef = useRef<((controls: GraphControls) => void) | undefined>(undefined);
  onReadyRef.current = (controls: GraphControls) => {
    graphControlsRef.current = controls;
    onReady?.(controls);
  };
  const onCollapseChangeRef = useRef(onCollapseChange);
  onCollapseChangeRef.current = onCollapseChange;
  const onMultiSelectRef = useRef(onMultiSelect);
  onMultiSelectRef.current = onMultiSelect;

  // Zoom limit flash
  const [zoomLimitFlash, setZoomLimitFlash] = useState(false);
  const zoomLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashZoomLimit = useCallback(() => {
    setZoomLimitFlash(true);
    if (zoomLimitTimerRef.current) clearTimeout(zoomLimitTimerRef.current);
    zoomLimitTimerRef.current = setTimeout(() => setZoomLimitFlash(false), 400);
  }, []);
  useEffect(() => () => { if (zoomLimitTimerRef.current) clearTimeout(zoomLimitTimerRef.current); }, []);

  // Placeholder for updateMultiSelection (will be defined after highlighting hook)
  const updateMultiSelectionRef = useRef<(ids: Set<string>) => void>(() => {});
  const updateMultiSelection = useCallback((nextIds: Set<string>) => {
    updateMultiSelectionRef.current(nextIds);
  }, []);

  // ── Graph Init ──
  const initResult = useGraphInit({
    data,
    layout,
    showMinimap,
    gridEnabled: showGridProp as boolean,
    topicId,
    customNodeColors,
    locale,
    onReadyRef: onReadyRef as React.RefObject<((controls: GraphControls) => void) | undefined>,
    onCollapseChangeRef: onCollapseChangeRef as React.RefObject<((count: number, ids: Set<string>) => void) | undefined>,
    onMultiSelectRef: onMultiSelectRef as React.RefObject<((ids: string[]) => void) | undefined>,
    flashZoomLimit,
    updateMultiSelection,
  });

  const {
    containerRef,
    graphRef,
    ready,
    graphVersion,
    collapsedNodes,
    setCollapsedNodes,
    breadcrumbs,
    setBreadcrumbs,
    combos,
    setCombos,
    comboCounterRef,
    mountedRef,
    layoutInProgressRef,
    longPressTimerRef,
    topicIdRef,
    gridEnabledRef,
    collapseAllRef,
    expandAllRef,
    childrenMapRef,
    highlightEpoch,
    setHighlightEpoch,
    dataNodesRef,
    dataEdgesRef,
    nodeById,
    gridEnabled,
    setGridEnabledInternal,
    showHulls,
    setShowHulls,
    batchDraw,
  } = initResult;

  // ── Highlighting ──
  const { applyMultiSelectionState } = useGraphHighlighting({
    graphRef: graphRef as React.RefObject<Graph | null>,
    ready,
    graphVersion,
    highlightNodeIds,
    reviewNodeIds,
    selectedNodeId,
    highlightEpoch,
    setHighlightEpoch,
    layoutInProgressRef,
    dataNodesRef,
    dataEdgesRef,
    nodeById,
    batchDraw,
  });

  // Now wire up the real updateMultiSelection
  updateMultiSelectionRef.current = (nextIds: Set<string>) => {
    setMultiSelectedIds(nextIds);
    onMultiSelectRef.current?.(Array.from(nextIds));
    const graph = graphRef.current;
    if (graph) applyMultiSelectionState(graph, nextIds);
  };

  // ── Events ──
  useGraphEvents({
    graphRef: graphRef as React.RefObject<Graph | null>,
    ready,
    graphVersion,
    data,
    mountedRef,
    layoutInProgressRef,
    longPressTimerRef: longPressTimerRef as React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
    topicIdRef,
    gridEnabledRef,
    childrenMapRef,
    onNodeClickRef: onNodeClickRef as React.RefObject<((node: MapNode | null, position?: { x: number; y: number }) => void) | undefined>,
    onNodeRightClickRef: onNodeRightClickRef as React.RefObject<((node: MapNode, position: { x: number; y: number }) => void) | undefined>,
    onCollapseChangeRef: onCollapseChangeRef as React.RefObject<((count: number, ids: Set<string>) => void) | undefined>,
    onMultiSelectRef: onMultiSelectRef as React.RefObject<((ids: string[]) => void) | undefined>,
    onZoomChangeRef: onZoomChangeRef as React.RefObject<((zoom: number) => void) | undefined>,
    multiSelectedIdsRef: multiSelectedIdsRef as React.RefObject<Set<string>>,
    setCollapsedNodes,
    setBreadcrumbs,
    setMultiSelectedIds,
    setShowShortcuts,
    applyMultiSelectionState,
    updateMultiSelection,
    flashZoomLimit,
    batchDraw,
  });

  // Mobile hint auto-dismiss (sessionStorage-backed, 4s timer)
  const { showHint: showMobileHint } = useMobileHint({ ready, nodeCount: data.nodes.length });

  // Space+drag panning
  useSpacePan({
    graphRef: graphRef as React.RefObject<Graph | null>,
    containerRef: containerRef as React.RefObject<HTMLDivElement | null>,
    ready,
  });

  // Shared ref to prevent useDragConnect and useEdgeReconnect from activating simultaneously
  const sharedIsDraggingRef = useRef(false);

  // Edge reconnect
  useEdgeReconnect({
    graphRef: graphRef as React.RefObject<Graph | null>,
    containerRef: containerRef as React.RefObject<HTMLDivElement | null>,
    ready,
    graphVersion,
    edges: data.edges,
    onReconnect: onEdgeReconnect,
    enabled: enableEdgeReconnect,
    isDraggingRef: sharedIsDraggingRef,
    batchDraw,
  });

  // Enhanced drag-to-connect
  useDragConnect({
    graphRef: graphRef as React.RefObject<Graph | null>,
    containerRef: containerRef as React.RefObject<HTMLDivElement | null>,
    ready,
    graphVersion,
    enabled: enableDragConnect,
    edges: data.edges,
    onDragConnect,
    onQuickAdd,
    isDraggingRef: sharedIsDraggingRef,
  });

  // Keyboard navigation
  const { focusedNodeId } = useKeyboardNav({
    graphRef: graphRef as React.RefObject<Graph | null>,
    containerRef: containerRef as React.RefObject<HTMLDivElement | null>,
    ready,
    graphVersion,
    nodes: data.nodes,
    edges: data.edges,
    selectedNodeId,
    onNodeClick,
    onNodeRightClick,
    onQuickAdd,
    collapseAllRef: collapseAllRef as React.RefObject<() => void>,
    expandAllRef: expandAllRef as React.RefObject<() => void>,
    multiSelectedIdsRef: multiSelectedIdsRef as React.RefObject<Set<string>>,
    updateMultiSelection,
    setShowShortcuts,
    batchDraw,
  });

  // Focused node data for quick-add button positioning and aria
  const focusedNode = focusedNodeId ? nodeById.get(focusedNodeId) : null;

  const collapsedCount = collapsedNodes.size;
  const multiSelectedCount = multiSelectedIds.size;

  // Check if any selected nodes are user-created (deletable)
  const selectedUserCreatedIds = useMemo(() => {
    if (multiSelectedCount === 0) return [];
    return Array.from(multiSelectedIds).filter(id => {
      const node = nodeById.get(id);
      return node?.isUserCreated;
    });
  }, [multiSelectedIds, multiSelectedCount, nodeById]);

  // Handler: group selected nodes into a combo
  const handleGroupSelection = useCallback(() => {
    const ids = Array.from(multiSelectedIds);
    if (ids.length < 2) return;

    comboCounterRef.current += 1;
    const comboId = `combo-${Date.now()}-${comboCounterRef.current}`;
    const newCombo: PersistedCombo = {
      id: comboId,
      label: t.groupLabel(comboCounterRef.current),
      nodeIds: ids,
      collapsed: false,
    };

    const nextCombos = [...combos, newCombo];
    setCombos(nextCombos);
    if (topicId) saveCombos(topicId, nextCombos);

    const graph = graphRef.current;
    if (graph) {
      try {
        graph.addComboData([{ id: comboId, data: { label: newCombo.label } }]);
        graph.updateNodeData(ids.map(nId => ({ id: nId, combo: comboId })));
        batchDraw();
      } catch {
        // Graph may be in transition
      }
    }

    updateMultiSelection(new Set());
  }, [multiSelectedIds, combos, topicId, t, updateMultiSelection, setCombos, comboCounterRef, graphRef]);

  // Handler: focus/zoom to fit multi-selected nodes
  const handleFocusSelection = useCallback(() => {
    const graph = graphRef.current;
    if (!graph || multiSelectedIds.size === 0) return;
    const ids = Array.from(multiSelectedIds);
    try {
      graph.focusElements(ids, { animation: { duration: 400, easing: 'ease-in-out' } });
    } catch {
      // graph may be destroyed
    }
  }, [multiSelectedIds, graphRef]);

  // Handler: toggle grid
  const handleGridToggle = useCallback(() => {
    const next = !gridEnabled;
    setGridEnabledInternal(next);
    saveGridEnabled(next);
    onGridChange?.(next);
  }, [gridEnabled, onGridChange, setGridEnabledInternal]);

  // Handler: auto-layout cycle (force → dagre → radial → force)
  const handleAutoLayout = useCallback(() => {
    const graph = graphRef.current;
    if (!graph || layoutInProgressRef.current) return;

    const layouts = ['d3-force', 'dagre', 'radial', 'mindmap', 'concentric'] as const;
    type LayoutKey = typeof layouts[number];
    try {
      const currentLayout = graph.getLayout();
      const currentType = Array.isArray(currentLayout)
        ? String((currentLayout[0] as Record<string, unknown>)?.type || 'd3-force')
        : String((currentLayout as Record<string, unknown>)?.type || 'd3-force');
      const idx = layouts.indexOf(currentType as LayoutKey);
      const nextIdx = (idx + 1) % layouts.length;
      const nextType = layouts[nextIdx];

      const layoutConfig = nextType === 'dagre' ? LAYOUT_DAGRE
        : nextType === 'radial' ? LAYOUT_RADIAL
        : nextType === 'mindmap' ? LAYOUT_MINDMAP
        : nextType === 'concentric' ? LAYOUT_CONCENTRIC
        : LAYOUT_FORCE;

      layoutInProgressRef.current = true;
      graph.setLayout(layoutConfig);
      graph.layout().then(() => {
        if (!mountedRef.current || graphRef.current !== graph) return;
        try { graph.fitView(undefined, { duration: 300, easing: 'ease-out' }); } catch (e) { devWarn('KnowledgeGraph', '', e); }
      }).catch(() => { /* layout may fail if destroyed */ }).finally(() => {
        layoutInProgressRef.current = false;
      });
    } catch {
      layoutInProgressRef.current = false;
    }
  }, [graphRef, layoutInProgressRef, mountedRef]);

  // Toolbar: zoom / export / undo / redo / collapse delegates via graphControlsRef
  const handleZoomIn = useCallback(() => { graphControlsRef.current?.zoomIn(); }, []);
  const handleZoomOut = useCallback(() => { graphControlsRef.current?.zoomOut(); }, []);
  const handleFitView = useCallback(() => { graphControlsRef.current?.fitView(); }, []);
  const handleResetZoom = useCallback(() => { graphControlsRef.current?.resetZoom?.(); }, []);
  const handleCollapseAll = useCallback(() => { graphControlsRef.current?.collapseAll(); }, []);
  const handleExpandAll = useCallback(() => { graphControlsRef.current?.expandAll(); }, []);
  const handleExportPNG = useCallback(async () => { await graphControlsRef.current?.exportPNG(); }, []);
  const handleExportJPEG = useCallback(async () => { await graphControlsRef.current?.exportJPEG(); }, []);
  const handleUndo = useCallback(() => { graphControlsRef.current?.undo?.(); }, []);
  const handleRedo = useCallback(() => { graphControlsRef.current?.redo?.(); }, []);
  const handleHullsToggle = useCallback(() => setShowHulls(v => !v), [setShowHulls]);

  // Handler: breadcrumb click
  const handleBreadcrumbClick = useCallback((crumbId: string | null) => {
    const graph = graphRef.current;
    if (!graph) return;

    if (crumbId === null) {
      setCollapsedNodes(new Set());
      setBreadcrumbs([]);
      onCollapseChangeRef.current?.(0, new Set());
      try { graph.fitView(undefined, { duration: 400, easing: 'ease-out' }); } catch (e) { devWarn('KnowledgeGraph', '', e); }
    } else {
      setBreadcrumbs(prev => {
        const idx = prev.findIndex(b => b.id === crumbId);
        if (idx < 0) return prev;
        const removed = prev.slice(idx + 1);
        if (removed.length > 0) {
          setCollapsedNodes(cn => {
            const next = new Set(cn);
            for (const r of removed) next.delete(r.id);
            onCollapseChangeRef.current?.(next.size, next);
            return next;
          });
        }
        return prev.slice(0, idx + 1);
      });
      try {
        graph.focusElements([crumbId], { animation: { duration: 400, easing: 'ease-in-out' } });
      } catch (e) { devWarn('KnowledgeGraph', 'graph may be destroyed', e); }
    }
  }, [graphRef, setCollapsedNodes, setBreadcrumbs, onCollapseChangeRef]);

  // Memoized screen-reader node list
  const srNodeList = useMemo(() => {
    const connectionCount = new Map<string, number>();
    for (const edge of data.edges) {
      connectionCount.set(edge.source, (connectionCount.get(edge.source) || 0) + 1);
      connectionCount.set(edge.target, (connectionCount.get(edge.target) || 0) + 1);
    }
    return (
      <ul className="sr-only" aria-live="polite" aria-label={t.srNodeListLabel}>
        {data.nodes.map((node) => (
          <li key={node.id}>
            {t.srNodeItem(node.label, node.mastery >= 0 ? node.mastery : 0, connectionCount.get(node.id) || 0)}
          </li>
        ))}
      </ul>
    );
  }, [data, t]);

  // Ref for the shortcut dialog trigger element (to return focus on close)
  const shortcutTriggerRef = useRef<HTMLElement | null>(null);

  return (
    <div
      ref={fullscreenRef}
      className={`relative w-full h-full min-h-[180px] sm:min-h-[300px] ${isFullscreen ? 'fixed inset-0 z-50 bg-white flex flex-col' : ''} ${className}`}
    >
      {/* Embedded toolbar — opt-in via showToolbar prop */}
      {showToolbar && (
        <GraphToolbar
          layout={layout}
          onLayoutChange={onLayoutChange ?? (() => {})}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          nodeCount={data.nodes.length}
          edgeCount={data.edges.length}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange ?? (() => {})}
          matchCount={highlightNodeIds?.size}
          onCollapseAll={handleCollapseAll}
          onExpandAll={handleExpandAll}
          collapsedCount={collapsedCount}
          locale={locale}
          onExportPNG={handleExportPNG}
          onExportJPEG={handleExportJPEG}
          showMinimap={showMinimap}
          showGrid={gridEnabled}
          onGridToggle={handleGridToggle}
          onAutoLayout={handleAutoLayout}
          zoomLevel={zoomLevel}
          onResetZoom={handleResetZoom}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
          onHullsToggle={handleHullsToggle}
          showHulls={showHulls}
        />
      )}
      <div
        ref={containerRef}
        className="w-full h-full bg-white rounded-2xl shadow-sm border border-gray-200 outline-none focus-visible:ring-2 focus-visible:ring-ax-primary-500/30 focus-visible:border-ax-primary-500/50 overflow-hidden"
        style={{ touchAction: 'none' }}
        tabIndex={0}
        role="application"
        aria-label={t.ariaLabel}
        aria-roledescription={t.ariaRoleDesc}
        aria-describedby="kg-shortcut-desc"
        aria-busy={!ready}
      />
      {/* Screen-reader accessible node list */}
      {srNodeList}
      {/* Zoom limit flash — brief border highlight when hitting min/max zoom */}
      {zoomLimitFlash && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-[3]"
          style={{
            boxShadow: `inset 0 0 0 2px rgba(${GRAPH_COLORS.primaryRgb}, 0.45)`,
            animation: 'kg-zoom-limit-flash 400ms ease-out forwards',
          }}
          aria-hidden="true"
        />
      )}
      {/* Inline keyframes for zoom limit flash animation */}
      <style>{ZOOM_LIMIT_FLASH_KEYFRAMES}</style>
      {/* Breadcrumb trail */}
      {ready && (
        <GraphBreadcrumbs
          breadcrumbs={breadcrumbs}
          onBreadcrumbClick={handleBreadcrumbClick}
          t={t}
        />
      )}
      {/* Screen reader shortcut description */}
      <div id="kg-shortcut-desc" className="sr-only">
        {t.srDesc}
      </div>
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {collapsedCount > 0
          ? t.nCollapsed(collapsedCount)
          : ready ? t.allExpanded : ''}
      </div>
      {/* Screen reader announcement for focused node */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {focusedNode ? t.focusedNode(focusedNode.label) : ''}
      </div>
      {/* Quick-add "+" button — appears near selected/focused node */}
      {ready && focusedNodeId && onQuickAdd && (
        <button
          onClick={() => onQuickAdd(focusedNodeId)}
          className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 bg-white rounded-lg shadow-lg border border-gray-200 text-xs text-teal-700 hover:bg-teal-50 active:bg-teal-100 transition-colors"
          aria-label={t.quickAdd}
          title={t.quickAdd}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.quickAdd}</span>
        </button>
      )}
      {/* Mobile hint overlay — auto-dismisses after 4s */}
      {ready && showMobileHint && data.nodes.length > 5 && (
        <div className="absolute left-1/2 -translate-x-1/2 sm:hidden pointer-events-none transition-opacity duration-500" style={{ bottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <p className="text-[10px] text-gray-500 bg-white/90 px-2 py-1 rounded-full shadow-sm border border-gray-100">
            {t.mobileHint}
          </p>
        </div>
      )}
      {/* Mobile floating fit-view button */}
      {ready && !showMobileHint && (
        <button
          onClick={() => { try { graphRef.current?.fitView(); } catch (e: unknown) { warnIfNotDestroyed(e); } }}
          className="absolute right-2 sm:hidden p-3 bg-white/90 rounded-full shadow-sm border border-gray-200 text-gray-500 active:bg-gray-100 transition-colors z-[5]"
          style={{ bottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          aria-label={t.fitView}
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      )}
      {/* Multi-selection floating action bar */}
      {ready && (
        <GraphMultiSelectBar
          multiSelectedIds={multiSelectedIds}
          multiSelectedCount={multiSelectedCount}
          selectedUserCreatedIds={selectedUserCreatedIds}
          onDeleteNodes={onDeleteNodes}
          onConnectNodes={onConnectNodes}
          onGroupSelection={handleGroupSelection}
          onFocusSelection={handleFocusSelection}
          onClearSelection={() => updateMultiSelection(new Set())}
          t={t}
        />
      )}
      {/* Mastery color legend — bottom-left, always visible */}
      {ready && showMasteryLegend && data.nodes.length > 0 && (
        <GraphMasteryLegend t={t} />
      )}
      {/* Desktop: press ? for shortcut hint */}
      {ready && !showShortcuts && !showMasteryLegend && (
        <div className="absolute bottom-2 left-2 hidden sm:flex items-center gap-2 pointer-events-none">
          <p className="text-[10px] text-gray-500 bg-white/80 px-1.5 py-0.5 rounded">
            ? {t.shortcuts}
          </p>
          <p className="text-[10px] text-gray-500 bg-white/80 px-1.5 py-0.5 rounded">
            / {t.search}
          </p>
        </div>
      )}
      {/* Desktop: shortcut hint — repositioned when legend is visible */}
      {ready && !showShortcuts && showMasteryLegend && (
        <div className="absolute bottom-2 left-28 hidden sm:flex items-center gap-2 pointer-events-none">
          <p className="text-[10px] text-gray-500 bg-white/80 px-1.5 py-0.5 rounded">
            ? {t.shortcuts}
          </p>
          <p className="text-[10px] text-gray-500 bg-white/80 px-1.5 py-0.5 rounded">
            / {t.search}
          </p>
        </div>
      )}
      {/* Keyboard shortcut help overlay */}
      <GraphShortcutsDialog
        show={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        t={t}
        triggerRef={shortcutTriggerRef as React.RefObject<HTMLElement | null>}
      />
    </div>
  );
});
