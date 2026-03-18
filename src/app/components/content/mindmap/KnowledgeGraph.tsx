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

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Graph } from '@antv/g6';
import { Maximize2, X, Link, Trash2, Plus, Group, Focus, ChevronRight } from 'lucide-react';
import type { GraphData, MapNode, G6NodeEvent, GraphControls } from '@/app/types/mindmap';
import { MASTERY_HEX, truncateLabel } from '@/app/types/mindmap';
import { colors } from '@/app/design-system';
import { getNodeFill, getNodeStroke, getEdgeColor, escHtml, buildChildrenMap, computeHiddenNodes } from './graphHelpers';
import { loadPositions, saveNodePosition, loadCombos, saveCombos, loadGridEnabled, saveGridEnabled } from './useNodePositions';
import type { PositionMap, PersistedCombo } from './useNodePositions';
import { NODE_COLOR_FILL } from './useNodeColors';
import { useKeyboardNav } from './useKeyboardNav';
import { useSpacePan } from './useSpacePan';
import { useEdgeReconnect } from './useEdgeReconnect';
import type { EdgeReconnectResult } from './useEdgeReconnect';
import { I18N_GRAPH } from './graphI18n';
import type { GraphLocale } from './graphI18n';

/** Warn about non-G6-destroyed errors so real bugs aren't silently swallowed */
function warnIfNotDestroyed(e: unknown): void {
  if (import.meta.env.DEV && !(e instanceof Error && e.message.includes('destroyed'))) {
    console.warn('[KnowledgeGraph]', e);
  }
}


/** Trigger a browser download from a data URL */
function downloadGraphImage(dataURL: string, ext: string) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = `mapa-conocimiento-${stamp}.${ext}`;
  document.body.appendChild(link);
  link.click();
  requestAnimationFrame(() => document.body.removeChild(link));
}

// ── Layout presets (shared by init and layout-switch) ────────
const LAYOUT_FORCE = { type: 'd3-force' as const, preventOverlap: true, nodeSize: 50, linkDistance: 150, nodeStrength: -200, collideStrength: 0.8 };
const LAYOUT_RADIAL = { type: 'radial' as const, unitRadius: 120, preventOverlap: true, nodeSize: 50 };
const LAYOUT_DAGRE = { type: 'dagre' as const, rankdir: 'TB', nodesep: 40, ranksep: 60 };

// I18N strings imported from graphI18n.ts

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick?: (node: MapNode | null) => void;
  onNodeRightClick?: (node: MapNode, position: { x: number; y: number }) => void;
  selectedNodeId?: string | null;
  layout?: 'force' | 'radial' | 'dagre';
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
}

// ── Component ───────────────────────────────────────────────

export function KnowledgeGraph({
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
}: KnowledgeGraphProps) {
  const t = I18N_GRAPH[locale];
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const mountedRef = useRef(true);
  const layoutInProgressRef = useRef(false);
  const [ready, setReady] = useState(false);
  // Incremented on each graph re-creation so event-handler effects re-register
  const [graphVersion, setGraphVersion] = useState(0);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMobileHint, setShowMobileHint] = useState(() => {
    try { return !sessionStorage.getItem('axon_map_mobile_hint_seen'); } catch { return true; }
  });
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());
  const multiSelectedIdsRef = useRef(multiSelectedIds);
  multiSelectedIdsRef.current = multiSelectedIds;

  // Breadcrumb trail for drill-down navigation
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; label: string }>>([]);

  // Grid state: controlled or uncontrolled
  const [gridEnabledInternal, setGridEnabledInternal] = useState(() => loadGridEnabled());
  const gridEnabled = showGridProp ?? gridEnabledInternal;

  // Combo/group state
  const [combos, setCombos] = useState<PersistedCombo[]>([]);
  const comboCounterRef = useRef(0);

  // Load combos when topic changes
  useEffect(() => {
    if (topicId) {
      const loaded = loadCombos(topicId);
      setCombos(loaded);
      comboCounterRef.current = loaded.length;
    } else {
      setCombos([]);
      comboCounterRef.current = 0;
    }
  }, [topicId]);

  // Stable ref for onDragConnect
  const onDragConnectRef = useRef(onDragConnect);
  onDragConnectRef.current = onDragConnect;

  // Stable ref for gridEnabled (used in event handlers)
  const gridEnabledRef = useRef(gridEnabled);
  gridEnabledRef.current = gridEnabled;

  // Stable ref for onCollapseChange to avoid stale closures in setter callbacks
  const onCollapseChangeRef = useRef(onCollapseChange);
  onCollapseChangeRef.current = onCollapseChange;

  // Stable ref for onMultiSelect
  const onMultiSelectRef = useRef(onMultiSelect);
  onMultiSelectRef.current = onMultiSelect;

  // Stable refs for event callbacks — prevents G6 event re-registration on prop change
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;
  const onNodeRightClickRef = useRef(onNodeRightClick);
  onNodeRightClickRef.current = onNodeRightClick;

  // Track mount state to guard async callbacks
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Stable ref for data.nodes — avoids stale closure in event handlers
  const dataNodesRef = useRef(data.nodes);
  dataNodesRef.current = data.nodes;
  const dataEdgesRef = useRef(data.edges);
  dataEdgesRef.current = data.edges;

  // Auto-dismiss mobile hint after 4 seconds
  useEffect(() => {
    if (!ready || !showMobileHint) return;
    const hintTimer = setTimeout(() => {
      setShowMobileHint(false);
      try { sessionStorage.setItem('axon_map_mobile_hint_seen', '1'); } catch {}
    }, 4000);
    return () => clearTimeout(hintTimer);
  }, [ready, showMobileHint]);

  // Memoize children map to avoid O(N*E) per draw — only depends on edges
  const childrenMap = useMemo(() => buildChildrenMap(data.edges), [data.edges]);
  // Stable ref for childrenMap so event handlers don't re-register on every edge change
  const childrenMapRef = useRef(childrenMap);
  childrenMapRef.current = childrenMap;

  // Load saved positions for the current topic
  const savedPositionsRef = useRef<PositionMap>(new Map());
  useEffect(() => {
    savedPositionsRef.current = topicId ? loadPositions(topicId) : new Map();
  }, [topicId]);

  // Stable ref for topicId to use in event handlers
  const topicIdRef = useRef(topicId);
  topicIdRef.current = topicId;

  // Helper: apply multi-selection visual state to G6 nodes (diff-based for O(delta) perf)
  const prevMultiRef = useRef<Set<string>>(new Set());
  const applyMultiSelectionState = useCallback((graph: Graph, ids: Set<string>) => {
    try {
      const prev = prevMultiRef.current;
      // Only update nodes that changed state (O(delta) instead of O(N))
      for (const id of ids) {
        if (!prev.has(id)) graph.setElementState(id, ['multiSelected']);
      }
      for (const id of prev) {
        if (!ids.has(id)) {
          // Only remove 'multiSelected', preserve other states (hover, selected)
          try {
            const states = graph.getElementState(id);
            graph.setElementState(id, states.filter(s => s !== 'multiSelected'));
          } catch { graph.setElementState(id, []); }
        }
      }
      prevMultiRef.current = new Set(ids);
      graph.draw();
    } catch (e: unknown) { warnIfNotDestroyed(e); }
  }, []);

  // Update multi-selection and notify parent
  const updateMultiSelection = useCallback((nextIds: Set<string>) => {
    setMultiSelectedIds(nextIds);
    onMultiSelectRef.current?.(Array.from(nextIds));
    const graph = graphRef.current;
    if (graph) applyMultiSelectionState(graph, nextIds);
  }, [applyMultiSelectionState]);

  // Build node-to-combo lookup from combos state
  const nodeToCombo = useMemo(() => {
    const map = new Map<string, string>();
    for (const combo of combos) {
      for (const nId of combo.nodeIds) {
        map.set(nId, combo.id);
      }
    }
    return map;
  }, [combos]);

  // Transform Axon data → G6 format (structural only — highlight/review styling applied separately)
  const g6Data = useCallback((collapsed: Set<string>, positions?: PositionMap) => {
    const hidden = computeHiddenNodes(data.nodes, data.edges, collapsed, childrenMap);

    const nodes = data.nodes
      .filter(node => !hidden.has(node.id))
      .map((node) => {
        const strokeColor = getNodeStroke(node.masteryColor);
        const isCollapsed = collapsed.has(node.id);
        const childCount = childrenMap.get(node.id)?.length ?? 0;
        const baseLabel = truncateLabel(node.label);
        const displayLabel = isCollapsed && childCount > 0
          ? baseLabel + ` (+${childCount})`
          : baseLabel;

        const savedPos = positions?.get(node.id);
        const comboId = nodeToCombo.get(node.id);
        return {
          id: node.id,
          ...(comboId ? { combo: comboId } : {}),
          data: {
            label: displayLabel,
            fullLabel: node.label,
            definition: node.definition,
            mastery: node.mastery,
            masteryColor: node.masteryColor,
            type: node.type,
            summaryId: node.summaryId,
            topicId: node.topicId,
            flashcardCount: node.flashcardCount,
            quizCount: node.quizCount,
            annotation: node.annotation,
            needsReview: false,
            _raw: node,
          },
          style: {
            fill: node.isUserCreated && customNodeColors?.get(node.id)
              ? (NODE_COLOR_FILL[customNodeColors.get(node.id)!] || colors.primary[50])
              : node.isUserCreated ? colors.primary[50] : getNodeFill(node.masteryColor),
            stroke: node.isUserCreated && customNodeColors?.get(node.id)
              ? customNodeColors.get(node.id)!
              : node.isUserCreated ? colors.primary[500] : strokeColor,
            lineWidth: isCollapsed ? 2.5 : node.isUserCreated ? 2 : 1.5,
            lineDash: isCollapsed ? [4, 4] : node.isUserCreated ? [6, 3] : undefined,
            shadowColor: 'transparent',
            shadowBlur: 0,
            opacity: 1,
            labelText: displayLabel,
            labelFill: colors.text.primary,
            labelFontSize: 12,
            labelFontFamily: 'Inter, sans-serif',
            size: Math.max(32, Math.min(56, 32 + (node.mastery >= 0 ? node.mastery * 24 : 0))),
            ...(savedPos ? { x: savedPos.x, y: savedPos.y } : {}),
          },
        };
      });

    const edges = data.edges
      .filter(edge => !hidden.has(edge.source) && !hidden.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: {
          label: edge.label,
          connectionType: edge.connectionType,
          _raw: edge,
        },
        style: {
          stroke: edge.customColor || (edge.isUserCreated ? colors.primary[500] : getEdgeColor(edge.connectionType)),
          lineWidth: edge.isUserCreated ? 2 : 1.5,
          lineDash: edge.lineStyle === 'dashed' ? [6, 3]
            : edge.lineStyle === 'dotted' ? [2, 4]
            : edge.isUserCreated && !edge.lineStyle ? [6, 3]
            : undefined,
          opacity: 1,
          endArrow: (edge.directed || !!edge.sourceKeywordId)
            ? { type: edge.arrowType || 'triangle', size: 8 }
            : false,
          labelText: edge.label || undefined,
          labelFill: edge.label ? '#71717a' : undefined,
          labelFontSize: edge.label ? 10 : undefined,
          labelFontFamily: edge.label ? 'Inter, sans-serif' : undefined,
          labelBackground: !!edge.label,
          labelBackgroundFill: edge.label ? '#ffffff' : undefined,
          labelBackgroundOpacity: edge.label ? 0.85 : undefined,
          labelBackgroundRadius: edge.label ? 4 : undefined,
          labelPadding: edge.label ? [2, 6, 2, 6] : undefined,
        },
      }));

    // Build G6 combo data from persisted combos
    const g6Combos = combos.map(c => ({
      id: c.id,
      data: { label: c.label },
    }));

    return { nodes, edges, combos: g6Combos };
  }, [data, childrenMap, customNodeColors, combos, nodeToCombo]);

  // Layout config
  const getLayoutConfig = useCallback(() => {
    switch (layout) {
      case 'radial': return LAYOUT_RADIAL;
      case 'dagre': return LAYOUT_DAGRE;
      case 'force':
      default: return LAYOUT_FORCE;
    }
  }, [layout]);

  // Reset collapsed nodes when the underlying data set changes (e.g. topic switch)
  const prevNodeSetRef = useRef('');
  // O(N) fingerprint: count + simple hash of all IDs (avoids O(N log N) sort+join)
  const nodeSetKey = useMemo(() => {
    const n = data.nodes;
    if (n.length === 0) return '0';
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      const id = n[i].id;
      for (let j = 0; j < id.length; j++) hash = ((hash << 5) - hash + id.charCodeAt(j)) | 0;
    }
    return `${n.length}:${hash}`;
  }, [data.nodes]);
  useEffect(() => {
    if (prevNodeSetRef.current && prevNodeSetRef.current !== nodeSetKey) {
      const empty = new Set<string>();
      setCollapsedNodes(empty);
      onCollapseChangeRef.current?.(0, empty);
      setBreadcrumbs([]);
    }
    prevNodeSetRef.current = nodeSetKey;
  }, [nodeSetKey]);

  // Stable identity key for data+layout to avoid unnecessary graph recreations
  const dataKey = useRef('');
  const edgeSetKey = useMemo(() => {
    const e = data.edges;
    if (e.length === 0) return '0';
    let hash = 0;
    for (let i = 0; i < e.length; i++) {
      const id = e[i].id;
      for (let j = 0; j < id.length; j++) hash = ((hash << 5) - hash + id.charCodeAt(j)) | 0;
    }
    return `${e.length}:${hash}`;
  }, [data.edges]);
  const currentDataKey = useMemo(
    () => `${layout}:${nodeSetKey}|${edgeSetKey}|mm:${showMinimap ? '1' : '0'}|grid:${gridEnabled ? '1' : '0'}|dc:${enableDragConnect ? '1' : '0'}`,
    [layout, nodeSetKey, edgeSetKey, showMinimap, gridEnabled, enableDragConnect],
  );

  // Stable refs so collapseAll/expandAll/toggleCollapse in onReady always use latest state
  const collapseAllRef = useRef<() => void>(() => {});
  const expandAllRef = useRef<() => void>(() => {});
  const toggleCollapseRef = useRef<(nodeId: string) => boolean>(() => false);

  collapseAllRef.current = () => {
    const nodeIds = new Set(data.nodes.map(n => n.id));
    const nodesWithChildren = new Set(data.edges.map(e => e.source).filter(id => id != null && nodeIds.has(id)));
    setCollapsedNodes(nodesWithChildren);
    onCollapseChangeRef.current?.(nodesWithChildren.size, nodesWithChildren);
    // Build breadcrumbs using Map lookup (O(N) instead of O(N*M))
    const nodeById = new Map(data.nodes.map(n => [n.id, n]));
    setBreadcrumbs(
      Array.from(nodesWithChildren).map(id => {
        const n = nodeById.get(id);
        return { id, label: n?.label ?? id };
      }),
    );
  };
  expandAllRef.current = () => {
    const empty = new Set<string>();
    setCollapsedNodes(empty);
    onCollapseChangeRef.current?.(0, empty);
    setBreadcrumbs([]);
  };
  toggleCollapseRef.current = (nodeId: string) => {
    // We need the return value synchronously, so read current state from a ref
    const prev = collapsedNodes;
    const nowCollapsed = !prev.has(nodeId);
    setCollapsedNodes(p => {
      const next = new Set(p);
      if (nowCollapsed) next.add(nodeId); else next.delete(nodeId);
      onCollapseChangeRef.current?.(next.size, next);
      return next;
    });
    return nowCollapsed;
  };

  // Guard: skip first update-data effect after graph init (render already drew)
  const justInitializedRef = useRef(false);

  // Initialize graph
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Skip if same data structure and same layout
    if (graphRef.current && dataKey.current === currentDataKey) return;
    dataKey.current = currentDataKey;

    // Destroy previous instance
    if (graphRef.current) {
      graphRef.current.destroy();
      graphRef.current = null;
    }

    if (data.nodes.length === 0) {
      setReady(true);
      return;
    }

    // Responsive padding: tighter on mobile to maximize canvas space
    const cw = container.clientWidth;
    const pad = cw < 360 ? 10 : cw < 640 ? 20 : 40;

    const graph = new Graph({
      container,
      autoFit: 'view',
      padding: [pad, pad, pad, pad],
      node: {
        type: 'circle',
        style: {
          labelPlacement: 'bottom',
          labelMaxWidth: 100,
        },
        state: {
          hover: {
            lineWidth: 2.5,
            shadowColor: 'rgba(42, 140, 122, 0.4)',
            shadowBlur: 14,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
          },
          selected: {
            lineWidth: 3,
            shadowColor: 'rgba(42, 140, 122, 0.55)',
            shadowBlur: 18,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
          },
          multiSelected: {
            stroke: '#2a8c7a',
            lineWidth: 3.5,
            shadowColor: 'rgba(42, 140, 122, 0.6)',
            shadowBlur: 14,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
          },
        },
        animation: {
          enter: [
            { fields: ['opacity', 'size'], duration: 320, easing: 'ease-out', fill: 'both' },
          ],
          update: [
            { fields: ['x', 'y', 'fill', 'stroke', 'opacity', 'size', 'lineWidth'], duration: 200, easing: 'ease-out' },
          ],
          exit: [
            { fields: ['opacity', 'size'], duration: 200, easing: 'ease-in' },
          ],
        },
      },
      edge: {
        type: 'line',
        style: {
          labelPlacement: 'center',
        },
        state: {
          hover: {
            lineWidth: 2.5,
            stroke: colors.primary[500],
          },
        },
        animation: {
          enter: [
            { fields: ['opacity'], duration: 320, easing: 'ease-out', fill: 'both' },
          ],
          exit: [
            { fields: ['opacity'], duration: 200, easing: 'ease-in' },
          ],
        },
      },
      layout: getLayoutConfig(),
      behaviors: [
        'drag-canvas',
        {
          type: 'zoom-canvas',
          sensitivity: 1,
          minZoom: 0.15,
          maxZoom: 5,
        },
        'drag-element',
        {
          type: 'hover-activate',
          degree: 1,
        },
        {
          type: 'brush-select',
          key: 'brush-select',
          trigger: 'shift',
          style: {
            fill: '#2a8c7a',
            fillOpacity: 0.1,
            stroke: '#2a8c7a',
            lineWidth: 1,
          },
        },
        // Drag-to-connect: drag from node border to create edge
        ...(enableDragConnect ? [{
          type: 'create-edge' as const,
          key: 'create-edge',
          trigger: 'drag' as const,
          style: {
            stroke: '#2a8c7a',
            lineWidth: 2,
            lineDash: [6, 3],
          },
          onCreate: (edgeData: { id?: string; source?: string; target?: string }) => {
            const src = edgeData.source;
            const tgt = edgeData.target;
            if (src && tgt && src !== tgt) {
              // Notify parent — actual persistence handled externally
              onDragConnectRef.current?.(src, tgt);
            }
            // Return undefined to cancel G6's internal edge creation — parent handles it
            return undefined;
          },
        }] : []),
      ],
      plugins: [
        {
          type: 'tooltip',
          key: 'node-tooltip',
          trigger: 'hover',
          getContent: (_evt: unknown, items: Array<{ data?: Record<string, unknown> }>) => {
            if (!items?.length) return '';
            const item = items[0];
            const d = item?.data ?? {};
            const label = escHtml(String(d.fullLabel || d.label || ''));
            const rawDef = String(d.definition || '');
            const def = escHtml(rawDef.length > 120 ? rawDef.slice(0, 117) + '\u2026' : rawDef);
            const mastery = typeof d.mastery === 'number' ? d.mastery : -1;
            const pct = mastery >= 0 ? `${Math.round(mastery * 100)}%` : t.noData;
            const rawAnnotation = String(d.annotation || '');
            const annotation = escHtml(rawAnnotation.length > 80 ? rawAnnotation.slice(0, 77) + '\u2026' : rawAnnotation);
            const review = d.needsReview;
            return `<div style="max-width:220px;font-family:Inter,sans-serif">
              <div style="font-weight:600;font-size:12px;color:#111827;margin-bottom:2px;font-family:Georgia,serif">${label}</div>
              ${def ? `<div style="font-size:11px;color:#6b7280;margin-bottom:3px">${def}</div>` : ''}
              <div style="font-size:10px;color:#9ca3af">${escHtml(t.mastery)}: ${pct}</div>
              ${review ? `<div style="font-size:10px;color:#f97316;margin-top:2px;font-weight:500">\u26a0 ${escHtml(t.reviewAlert)}</div>` : ''}
              ${annotation ? `<div style="font-size:10px;color:#2a8c7a;font-style:italic;margin-top:2px">&ldquo;${annotation}&rdquo;</div>` : ''}
            </div>`;
          },
          itemTypes: ['node'],
          style: {
            '.tooltip': {
              'background-color': 'white',
              'border-radius': '10px',
              'box-shadow': '0 4px 16px rgba(0,0,0,0.1)',
              'border': '1px solid #e5e7eb',
              'padding': '8px 12px',
            },
          },
        },
        // Minimap navigation overview — toggleable from toolbar
        // Responsive: 120×80 on mobile (<640px), 150×100 on desktop
        ...(showMinimap ? [{
          type: 'minimap' as const,
          key: 'minimap-nav',
          size: (cw < 640 ? [120, 80] : [150, 100]) as [number, number],
          position: 'right-bottom' as const,
          padding: 8,
          className: 'axon-minimap',
          containerStyle: {
            background: colors.surface.card,
            border: `1px solid ${colors.border.card}`,
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          },
          maskStyle: {
            border: '2px solid #2a8c7a',
            borderRadius: '4px',
            background: 'rgba(42,140,122,0.08)',
          },
          delay: 150,
        }] : []),
        // Grid lines — toggleable, subtle background grid
        ...(gridEnabled ? [{
          type: 'grid-line' as const,
          key: 'grid-line',
          size: 40,
          stroke: 'rgba(42, 140, 122, 0.08)',
          lineWidth: 1,
          border: false,
          follow: true,
        }] : []),
        // Snapline — alignment guides when dragging nodes (active when grid is on)
        ...(gridEnabled ? [{
          type: 'snapline' as const,
          key: 'snapline',
          tolerance: 20,
          autoSnap: true,
          verticalLineStyle: { stroke: '#2a8c7a', lineWidth: 1, opacity: 0.5 },
          horizontalLineStyle: { stroke: '#2a8c7a', lineWidth: 1, opacity: 0.5 },
        }] : []),
      ],
      // Combo (group) config
      combo: {
        type: 'rect' as const,
        style: {
          fill: 'rgba(42, 140, 122, 0.05)',
          stroke: 'rgba(42, 140, 122, 0.2)',
          lineWidth: 1.5,
          radius: 12,
          padding: [20, 16, 16, 16],
          labelText: (d: { id?: string; data?: Record<string, unknown> }) => String(d?.data?.label || ''),
          labelFill: '#2a8c7a',
          labelFontSize: 11,
          labelFontFamily: 'Inter, sans-serif',
          labelFontWeight: 600,
          labelPlacement: 'top',
          cursor: 'pointer',
          collapsedMarker: true,
          collapsedMarkerFill: '#2a8c7a',
        },
      },
      animation: true,
    });

    graphRef.current = graph;

    // Set data and render (pass empty collapsed set on initial render)
    // Apply saved positions so layout starts from where the user left off
    justInitializedRef.current = true;
    graph.setData(g6Data(new Set(), savedPositionsRef.current));
    graph.render().then(() => {
      // Guard: if component unmounted or graph replaced before render finished, skip
      if (!mountedRef.current || graphRef.current !== graph) return;
      setReady(true);
      setGraphVersion(v => v + 1);
      onReady?.({
        zoomIn: () => { const g = graphRef.current; if (!g) return; try { g.zoomBy(1.25, { duration: 200 }); } catch (e: unknown) { warnIfNotDestroyed(e); } },
        zoomOut: () => { const g = graphRef.current; if (!g) return; try { g.zoomBy(0.8, { duration: 200 }); } catch (e: unknown) { warnIfNotDestroyed(e); } },
        fitView: () => { const g = graphRef.current; if (!g) return; try { g.fitView(); } catch (e: unknown) { warnIfNotDestroyed(e); } },
        collapseAll: () => collapseAllRef.current(),
        expandAll: () => expandAllRef.current(),
        toggleCollapse: (nodeId: string) => toggleCollapseRef.current(nodeId),
        exportPNG: async () => {
          const g = graphRef.current;
          if (!g) return;
          try {
            const dataURL = await g.toDataURL({ mode: 'overall', type: 'image/png', encoderOptions: 1 });
            downloadGraphImage(dataURL, 'png');
          } catch (e: unknown) { warnIfNotDestroyed(e); }
        },
        exportJPEG: async () => {
          const g = graphRef.current;
          if (!g) return;
          try {
            const dataURL = await g.toDataURL({ mode: 'overall', type: 'image/jpeg', encoderOptions: 0.92 });
            downloadGraphImage(dataURL, 'jpg');
          } catch (e: unknown) { warnIfNotDestroyed(e); }
        },
        focusNode: (nodeId: string) => {
          const g = graphRef.current; if (!g) return;
          try { g.focusElements([nodeId], { animation: { duration: 400, easing: 'ease-in-out' } }); } catch (e: unknown) { warnIfNotDestroyed(e); }
        },
        clearMultiSelection: () => {
          updateMultiSelection(new Set());
        },
      });
    }).catch((e) => { warnIfNotDestroyed(e); });

    return () => {
      layoutInProgressRef.current = false;
      graph.destroy();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDataKey, layout, showMinimap, gridEnabled, enableDragConnect]);

  // ResizeObserver: auto-resize graph when container dimensions change
  // Compare dimensions before calling resize() to avoid infinite loops
  const prevSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !ready) return;

    const ro = new ResizeObserver(() => {
      const g = graphRef.current; // always use latest ref
      if (!g) return;
      try {
        const { width, height } = container.getBoundingClientRect();
        const w = Math.round(width);
        const h = Math.round(height);
        if (w > 0 && h > 0 && (w !== prevSizeRef.current.w || h !== prevSizeRef.current.h)) {
          prevSizeRef.current = { w, h };
          g.resize(w, h);
        }
      } catch (e: unknown) { warnIfNotDestroyed(e); }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [ready]);

  // Update data when it changes or collapsed set changes (without destroying graph)
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready || data.nodes.length === 0) return;

    // Skip the first run right after graph init — render() already drew
    if (justInitializedRef.current) {
      justInitializedRef.current = false;
      return;
    }

    try {
      graph.setData(g6Data(collapsedNodes));
      graph.draw();
    } catch (e: unknown) { warnIfNotDestroyed(e); }

    // After setData rebuilds the graph, bump epoch to force highlight effect to reapply
    // (setData wipes highlight styling, but highlight deps may not have changed)
    setHighlightEpoch(e => e + 1);
  // Note: `data` is intentionally excluded — `g6Data` already captures it via its own deps.
  // Including both causes graph.draw() to fire twice per data update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g6Data, ready, collapsedNodes]);

  // Counter that increments when setData rebuilds the graph, forcing highlight effect to reapply
  const [highlightEpoch, setHighlightEpoch] = useState(0);
  const prevEpochRef = useRef(0);

  // Apply highlight/review styling incrementally via updateNodeData (avoids full setData rebuild)
  const prevHighlightRef = useRef<Set<string> | undefined>();
  const prevReviewRef = useRef<Set<string> | undefined>();
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready) return;

    const prevHL = prevHighlightRef.current;
    const prevRV = prevReviewRef.current;
    const epochChanged = prevEpochRef.current !== highlightEpoch;
    prevHighlightRef.current = highlightNodeIds;
    prevReviewRef.current = reviewNodeIds;
    prevEpochRef.current = highlightEpoch;

    // Skip if nothing changed (unless graph was rebuilt via epoch)
    if (!epochChanged && prevHL === highlightNodeIds && prevRV === reviewNodeIds) return;

    // No highlights/reviews active and none were active before — skip
    const hasHighlightOrReview = (highlightNodeIds && highlightNodeIds.size > 0) || (reviewNodeIds && reviewNodeIds.size > 0);
    const hadHighlightOrReview = (prevHL && prevHL.size > 0) || (prevRV && prevRV.size > 0);
    if (!hasHighlightOrReview && !hadHighlightOrReview && !epochChanged) return;

    const hasHighlight = highlightNodeIds && highlightNodeIds.size > 0;
    const hasReview = reviewNodeIds && reviewNodeIds.size > 0;

    const nodeUpdates: { id: string; style: Record<string, unknown>; data?: Record<string, unknown> }[] = [];
    const edgeUpdates: { id: string; style: Record<string, unknown> }[] = [];

    // Only update nodes/edges currently in the G6 graph (skip hidden/collapsed)
    let visibleNodeIds: Set<string> | null = null;
    try {
      const gNodes = graph.getNodeData();
      visibleNodeIds = new Set(gNodes.map((n: { id: string }) => n.id));
    } catch { /* fallback: update all */ }

    for (const node of dataNodesRef.current) {
      if (visibleNodeIds && !visibleNodeIds.has(node.id)) continue;
      const isHighlighted = hasHighlight && highlightNodeIds!.has(node.id);
      const isDimmed = hasHighlight && !isHighlighted;
      const needsReview = hasReview && reviewNodeIds!.has(node.id);
      const strokeColor = needsReview ? '#f97316' : getNodeStroke(node.masteryColor);
      const baseLabel = truncateLabel(node.label);

      // Only override lineWidth for highlighted/review nodes — collapsed lineWidth is set by g6Data
      const styleUpdate: Record<string, unknown> = {
        shadowColor: isHighlighted ? strokeColor : needsReview ? '#f97316' : 'transparent',
        shadowBlur: isHighlighted ? 10 : needsReview ? 8 : 0,
        opacity: isDimmed ? 0.35 : 1,
        labelText: needsReview ? '\u26a0 ' + baseLabel : baseLabel,
        labelFill: isDimmed ? colors.text.tertiary : needsReview ? '#c2410c' : colors.text.primary,
      };
      if (isHighlighted) styleUpdate.lineWidth = 3;
      else if (needsReview) styleUpdate.lineWidth = 2.5;

      nodeUpdates.push({
        id: node.id,
        data: { needsReview },
        style: styleUpdate,
      });
    }

    for (const edge of dataEdgesRef.current) {
      // Skip edges whose endpoints are hidden
      if (visibleNodeIds && (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target))) continue;
      const edgeHighlighted = hasHighlight && highlightNodeIds!.has(edge.source) && highlightNodeIds!.has(edge.target);
      const edgeDimmed = hasHighlight && !edgeHighlighted;
      edgeUpdates.push({
        id: edge.id,
        style: { opacity: edgeDimmed ? 0.2 : 1 },
      });
    }

    try {
      if (nodeUpdates.length > 0) graph.updateNodeData(nodeUpdates);
      if (edgeUpdates.length > 0) graph.updateEdgeData(edgeUpdates);
      graph.draw();
    } catch (e: unknown) { warnIfNotDestroyed(e); }
  // highlightEpoch forces reapplication after setData rebuilds the graph
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightNodeIds, reviewNodeIds, ready, highlightEpoch]);

  // Highlight selected node — O(1) lookup via memoized map
  const nodeById = useMemo(
    () => new Map(data.nodes.map(n => [n.id, n])),
    [data.nodes],
  );
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready) return;

    const prev = prevSelectedRef.current;
    const curr = selectedNodeId ?? null;
    prevSelectedRef.current = curr;

    // Skip if nothing changed
    if (prev === curr) return;

    const updates: { id: string; style: Record<string, unknown> }[] = [];

    // Deselect previous
    if (prev) {
      const prevNode = nodeById.get(prev);
      if (prevNode) {
        updates.push({
          id: prev,
          style: { shadowColor: 'transparent', shadowBlur: 0 },
        });
      }
    }

    // Select current
    if (curr) {
      const currNode = nodeById.get(curr);
      if (currNode) {
        updates.push({
          id: curr,
          style: {
            shadowColor: getNodeStroke(currNode.masteryColor),
            shadowBlur: 12,
          },
        });
      }
    }

    if (updates.length > 0) {
      try {
        graph.updateNodeData(updates);
        graph.draw();
      } catch (e: unknown) { warnIfNotDestroyed(e); }
    }
  }, [selectedNodeId, ready, graphVersion, nodeById]);

  // Event handlers (click, right-click, double-click to collapse/expand)
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready) return;

    let longPressTriggered = false;

    const handleNodeClick = (evt: G6NodeEvent) => {
      if (longPressTriggered) { longPressTriggered = false; return; }
      const nodeId = evt.target?.id ?? evt.itemId;
      if (!nodeId) return;

      // Shift+click: toggle node in multi-selection set
      const isShift = evt.originalEvent?.shiftKey ?? false;
      if (isShift) {
        setMultiSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(nodeId)) {
            next.delete(nodeId);
          } else {
            next.add(nodeId);
          }
          onMultiSelectRef.current?.(Array.from(next));
          // Apply visual state — diff-based O(delta) instead of O(N)
          requestAnimationFrame(() => {
            const g = graphRef.current;
            if (g) applyMultiSelectionState(g, next);
          });
          return next;
        });
        return;
      }

      // Normal click: clear multi-selection if any, then fire single click
      if (multiSelectedIdsRef.current.size > 0) {
        updateMultiSelection(new Set());
      }

      const nodeData = graph.getNodeData(nodeId);
      if (nodeData?.data?._raw && onNodeClickRef.current) {
        onNodeClickRef.current(nodeData.data._raw as MapNode);
      }
    };

    const handleNodeContextMenu = (evt: G6NodeEvent) => {
      evt.preventDefault?.();
      const nodeId = evt.target?.id ?? evt.itemId;
      if (!nodeId) return;
      const nodeData = graph.getNodeData(nodeId);
      if (nodeData?.data?._raw && onNodeRightClickRef.current) {
        const { client } = evt;
        onNodeRightClickRef.current(nodeData.data._raw as MapNode, {
          x: client?.x ?? evt.clientX ?? 0,
          y: client?.y ?? evt.clientY ?? 0,
        });
      }
    };

    const handleNodeDblClick = (evt: G6NodeEvent) => {
      const nodeId = evt.target?.id ?? evt.itemId;
      if (!nodeId) return;
      // Skip collapse on leaf nodes (no children) — use ref to avoid stale closure
      const hasChildren = (childrenMapRef.current.get(nodeId)?.length ?? 0) > 0;
      if (!hasChildren) return;

      // Resolve the node label for the breadcrumb trail
      const nodeData = graph.getNodeData(nodeId);
      const nodeLabel = String(nodeData?.data?.fullLabel || nodeData?.data?.label || nodeId);

      setCollapsedNodes(prev => {
        const next = new Set(prev);
        const wasCollapsed = next.has(nodeId);
        if (wasCollapsed) {
          next.delete(nodeId);
          // Expanding: remove this node from breadcrumbs
          setBreadcrumbs(bc => bc.filter(b => b.id !== nodeId));
        } else {
          next.add(nodeId);
          // Collapsing: push breadcrumb if not already present
          setBreadcrumbs(bc => {
            if (bc.some(b => b.id === nodeId)) return bc;
            return [...bc, { id: nodeId, label: nodeLabel }];
          });
        }
        onCollapseChangeRef.current?.(next.size, next);
        return next;
      });
    };

    const handleCanvasClick = () => {
      // Deselect node when clicking on empty canvas
      onNodeClickRef.current?.(null);
      setShowShortcuts(false);
      // Clear multi-selection
      if (multiSelectedIdsRef.current.size > 0) {
        updateMultiSelection(new Set());
      }
    };

    // Brush-select event: G6 fires 'afterbrushselect' with selected element IDs
    const handleBrushSelect = (evt: { data: { nodes?: string[] } }) => {
      const selectedIds = evt.data?.nodes ?? [];
      if (selectedIds.length > 0) {
        const next = new Set([...multiSelectedIdsRef.current, ...selectedIds]);
        updateMultiSelection(next);
      }
    };

    // Save node position after drag for persistence (with optional snap-to-grid)
    const GRID_SIZE = 40;
    const handleNodeDragEnd = (evt: G6NodeEvent) => {
      const nodeId = evt.target?.id ?? evt.itemId;
      if (!nodeId || !topicIdRef.current) return;
      try {
        const nodeData = graph.getNodeData(nodeId);
        if (nodeData?.style) {
          let { x, y } = nodeData.style as { x?: number; y?: number };
          if (typeof x === 'number' && typeof y === 'number') {
            // Snap to grid when enabled
            if (gridEnabledRef.current) {
              x = Math.round(x / GRID_SIZE) * GRID_SIZE;
              y = Math.round(y / GRID_SIZE) * GRID_SIZE;
              // Move node to snapped position
              graph.updateNodeData([{ id: nodeId, style: { x, y } }]);
              graph.draw();
            }
            saveNodePosition(topicIdRef.current, nodeId, { x, y });
          }
        }
      } catch (e: unknown) { warnIfNotDestroyed(e); }
    };

    graph.on('node:click', handleNodeClick);
    graph.on('node:contextmenu', handleNodeContextMenu);
    graph.on('node:dblclick', handleNodeDblClick);
    graph.on('node:dragend', handleNodeDragEnd);
    graph.on('canvas:click', handleCanvasClick);
    graph.on('afterbrushselect', handleBrushSelect);

    // Long-press for mobile context menu (500ms threshold)
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;

    let longPressStartPos: { x: number; y: number } | null = null;
    const LONG_PRESS_MOVE_THRESHOLD = 10; // px — cancel if finger moves more than this

    const handleNodePointerDown = (evt: G6NodeEvent) => {
      longPressTriggered = false;
      longPressStartPos = { x: evt.canvas.x, y: evt.canvas.y };
      longPressTimer = setTimeout(() => {
        if (!mountedRef.current) return;
        longPressTriggered = true;
        try { handleNodeContextMenu(evt); } catch (e: unknown) { warnIfNotDestroyed(e); }
      }, 500);
    };
    const cancelLongPress = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      longPressStartPos = null;
    };
    const handleNodePointerMove = (evt: G6NodeEvent) => {
      if (!longPressTimer || !longPressStartPos) return;
      const dx = evt.canvas.x - longPressStartPos.x;
      const dy = evt.canvas.y - longPressStartPos.y;
      if (dx * dx + dy * dy > LONG_PRESS_MOVE_THRESHOLD * LONG_PRESS_MOVE_THRESHOLD) {
        cancelLongPress();
      }
    };

    graph.on('node:pointerdown', handleNodePointerDown);
    graph.on('node:pointerup', cancelLongPress);
    graph.on('node:pointerleave', cancelLongPress);
    graph.on('node:pointermove', handleNodePointerMove);

    return () => {
      graph.off('node:click', handleNodeClick);
      graph.off('node:contextmenu', handleNodeContextMenu);
      graph.off('node:dblclick', handleNodeDblClick);
      graph.off('node:dragend', handleNodeDragEnd);
      graph.off('canvas:click', handleCanvasClick);
      graph.off('afterbrushselect', handleBrushSelect);
      graph.off('node:pointerdown', handleNodePointerDown);
      graph.off('node:pointerup', cancelLongPress);
      graph.off('node:pointerleave', cancelLongPress);
      graph.off('node:pointermove', handleNodePointerMove);
      if (longPressTimer) clearTimeout(longPressTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps — callbacks stabilized via refs (onNodeClickRef, onNodeRightClickRef, onCollapseChangeRef)
  }, [ready, graphVersion]);

  // Space+drag panning: hold Space to pan instead of dragging nodes
  useSpacePan({
    graphRef: graphRef as React.RefObject<Graph | null>,
    containerRef: containerRef as React.RefObject<HTMLDivElement | null>,
    ready,
  });

  // Edge reconnect: drag endpoint of custom edges to reconnect
  useEdgeReconnect({
    graphRef: graphRef as React.RefObject<Graph | null>,
    containerRef: containerRef as React.RefObject<HTMLDivElement | null>,
    ready,
    graphVersion,
    edges: data.edges,
    onReconnect: onEdgeReconnect,
    enabled: enableEdgeReconnect,
  });

  // Keyboard navigation: Tab, Arrow keys, Enter, Escape, +, zoom, collapse
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

    // Add combo to G6 graph directly for immediate visual feedback
    const graph = graphRef.current;
    if (graph) {
      try {
        graph.addComboData([{ id: comboId, data: { label: newCombo.label } }]);
        // Update nodes to belong to combo
        graph.updateNodeData(ids.map(nId => ({ id: nId, combo: comboId })));
        graph.draw();
      } catch {
        // Graph may be in transition
      }
    }

    // Clear selection
    updateMultiSelection(new Set());
  }, [multiSelectedIds, combos, topicId, t, updateMultiSelection]);

  // Handler: focus/zoom to fit multi-selected nodes
  const handleFocusSelection = useCallback(() => {
    const graph = graphRef.current;
    if (!graph || multiSelectedIds.size === 0) return;
    const ids = Array.from(multiSelectedIds);
    try {
      graph.focusElement(ids, { duration: 400, easing: 'ease-in-out' });
    } catch {
      // graph may be destroyed
    }
  }, [multiSelectedIds]);

  // Handler: toggle grid
  const handleGridToggle = useCallback(() => {
    const next = !gridEnabled;
    setGridEnabledInternal(next);
    saveGridEnabled(next);
    onGridChange?.(next);
  }, [gridEnabled, onGridChange]);

  // Handler: auto-layout cycle (force → dagre → radial → force)
  const handleAutoLayout = useCallback(() => {
    const graph = graphRef.current;
    if (!graph || layoutInProgressRef.current) return;

    // Cycle through layouts
    const layouts = ['d3-force', 'dagre', 'radial'] as const;
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
        : LAYOUT_FORCE;

      layoutInProgressRef.current = true;
      graph.setLayout(layoutConfig);
      graph.layout().then(() => {
        if (!mountedRef.current || graphRef.current !== graph) return;
        try { graph.fitView(undefined, { duration: 300, easing: 'ease-out' }); } catch { /* */ }
      }).catch(() => { /* layout may fail if destroyed */ }).finally(() => {
        layoutInProgressRef.current = false;
      });
    } catch {
      layoutInProgressRef.current = false;
    }
  }, []);

  // Handler: breadcrumb click — zoom to the clicked node, or fit-view for root
  const handleBreadcrumbClick = useCallback((crumbId: string | null) => {
    const graph = graphRef.current;
    if (!graph) return;

    if (crumbId === null) {
      // "Mapa completo" — expand all collapsed nodes and fit view
      setCollapsedNodes(new Set());
      setBreadcrumbs([]);
      onCollapseChangeRef.current?.(0, new Set());
      try { graph.fitView(undefined, { duration: 400, easing: 'ease-out' }); } catch { /* */ }
    } else {
      // Clicked a specific breadcrumb — remove all breadcrumbs after it,
      // expand the nodes that were removed, and focus on the clicked node
      setBreadcrumbs(prev => {
        const idx = prev.findIndex(b => b.id === crumbId);
        if (idx < 0) return prev;
        const removed = prev.slice(idx + 1);
        // Expand removed nodes
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
        graph.focusElement([crumbId], { duration: 400, easing: 'ease-in-out' });
      } catch { /* graph may be destroyed */ }
    }
  }, []);

  return (
    <div className={`relative w-full h-full min-h-[180px] sm:min-h-[300px] ${className}`}>
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
      {/* Breadcrumb trail — visible when user has drilled into collapsed branches */}
      {ready && breadcrumbs.length > 0 && (
        <nav
          className="absolute top-2 left-2 z-[6] flex items-center gap-0.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 px-2 py-1.5 text-[11px] max-w-[calc(100%-1rem)] overflow-x-auto"
          aria-label="Navegación del grafo"
        >
          <button
            onClick={() => handleBreadcrumbClick(null)}
            className="text-teal-700 hover:text-teal-900 hover:underline whitespace-nowrap font-medium transition-colors"
          >
            {t.breadcrumbRoot}
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-0.5">
              <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
              {i < breadcrumbs.length - 1 ? (
                <button
                  onClick={() => handleBreadcrumbClick(crumb.id)}
                  className="text-teal-700 hover:text-teal-900 hover:underline whitespace-nowrap transition-colors"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-gray-600 font-medium whitespace-nowrap">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
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
          <p className="text-[10px] text-gray-400 bg-white/90 px-2 py-1 rounded-full shadow-sm border border-gray-100">
            {t.mobileHint}
          </p>
        </div>
      )}
      {/* Mobile floating fit-view button — easy reset after accidental zoom */}
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
      {ready && multiSelectedCount > 0 && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white rounded-xl shadow-lg border border-gray-200 px-3 py-2 text-xs"
          role="toolbar"
          aria-label={t.nSelected(multiSelectedCount)}
        >
          <span className="font-medium text-gray-700 whitespace-nowrap">
            {t.nSelected(multiSelectedCount)}
          </span>
          <div className="w-px h-4 bg-gray-200" />
          {selectedUserCreatedIds.length > 0 && onDeleteNodes && (
            <button
              onClick={() => {
                onDeleteNodes(selectedUserCreatedIds);
                updateMultiSelection(new Set());
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              title={t.deleteSelection}
              aria-label={t.deleteSelection}
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t.deleteSelection}</span>
            </button>
          )}
          {multiSelectedCount === 2 && onConnectNodes && (
            <button
              onClick={() => {
                const ids = Array.from(multiSelectedIds);
                onConnectNodes(ids[0], ids[1]);
                updateMultiSelection(new Set());
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-teal-700 hover:bg-teal-50 transition-colors"
              title={t.connect}
              aria-label={t.connect}
            >
              <Link className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t.connect}</span>
            </button>
          )}
          {multiSelectedCount >= 2 && (
            <button
              onClick={handleGroupSelection}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-teal-700 hover:bg-teal-50 transition-colors"
              title={t.groupSelection}
              aria-label={t.groupSelection}
            >
              <Group className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t.groupSelection}</span>
            </button>
          )}
          <button
            onClick={handleFocusSelection}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-teal-700 hover:bg-teal-50 transition-colors"
            title={t.focusSelection}
            aria-label={t.focusSelection}
          >
            <Focus className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t.focusSelection}</span>
          </button>
          <button
            onClick={() => updateMultiSelection(new Set())}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title={t.deselect}
            aria-label={t.deselect}
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t.deselect}</span>
          </button>
        </div>
      )}
      {/* Mastery color legend — bottom-left, always visible */}
      {ready && showMasteryLegend && data.nodes.length > 0 && (
        <div className="absolute bottom-2 left-2 z-[4] bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-100 px-2.5 py-2 text-[10px] pointer-events-none hidden sm:block">
          <div className="font-semibold text-gray-500 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            {t.masteryLegend}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: MASTERY_HEX.red }} />
              <span className="text-gray-500">{t.masteryLow}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: MASTERY_HEX.yellow }} />
              <span className="text-gray-500">{t.masteryMid}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: MASTERY_HEX.green }} />
              <span className="text-gray-500">{t.masteryHigh}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: MASTERY_HEX.gray }} />
              <span className="text-gray-500">{t.masteryNone}</span>
            </div>
          </div>
        </div>
      )}
      {/* Desktop: press ? for shortcut hint */}
      {ready && !showShortcuts && !showMasteryLegend && (
        <div className="absolute bottom-2 left-2 hidden sm:flex items-center gap-2 pointer-events-none">
          <p className="text-[10px] text-gray-400 bg-white/80 px-1.5 py-0.5 rounded">
            ? {t.shortcuts}
          </p>
          <p className="text-[10px] text-gray-400 bg-white/80 px-1.5 py-0.5 rounded">
            / {t.search}
          </p>
        </div>
      )}
      {/* Desktop: shortcut hint — repositioned when legend is visible */}
      {ready && !showShortcuts && showMasteryLegend && (
        <div className="absolute bottom-2 left-28 hidden sm:flex items-center gap-2 pointer-events-none">
          <p className="text-[10px] text-gray-400 bg-white/80 px-1.5 py-0.5 rounded">
            ? {t.shortcuts}
          </p>
          <p className="text-[10px] text-gray-400 bg-white/80 px-1.5 py-0.5 rounded">
            / {t.search}
          </p>
        </div>
      )}
      {/* Keyboard shortcut help overlay */}
      {showShortcuts && (
        <>
          {/* Tap-outside to dismiss */}
          <div
            className="absolute inset-0 z-[9]"
            onClick={() => setShowShortcuts(false)}
            aria-hidden="true"
          />
          <div
            className="absolute top-3 right-3 hidden sm:block bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-10 text-xs max-h-[60vh] overflow-y-auto"
            role="dialog"
            aria-label={t.shortcutDialog}
          >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-700" style={{ fontFamily: 'Georgia, serif' }}>
              {t.shortcuts}
            </span>
            <button
              onClick={() => setShowShortcuts(false)}
              className="text-gray-400 hover:text-gray-600 p-3 -mr-1"
              aria-label={t.closeShortcuts}
            >
              &times;
            </button>
          </div>
          <div className="space-y-1 text-gray-500">
            {t.keys.map(([key, desc]) => (
              <div key={key} className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-600 min-w-[48px] text-center">
                  {key}
                </kbd>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
