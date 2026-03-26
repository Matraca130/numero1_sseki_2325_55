// ============================================================
// useGraphInit — G6 graph initialization, render, and cleanup
// Extracted from KnowledgeGraph.tsx (pure refactor)
// ============================================================

import { useEffect, useRef, useState, useCallback, useMemo, type MutableRefObject } from 'react';
import { Graph } from '@antv/g6';
import type { GraphData, MapNode, GraphControls } from '@/app/types/mindmap';
import { colors } from '@/app/design-system';
import { getNodeFill, getNodeStroke, getEdgeColor, escHtml, buildChildrenMap, computeHiddenNodes, GRAPH_COLORS } from './graphHelpers';
import { loadPositions, loadGridEnabled, loadCombos } from './useNodePositions';
import type { PositionMap, PersistedCombo } from './useNodePositions';
import { NODE_COLOR_FILL } from './useNodeColors';
import { truncateLabel } from '@/app/types/mindmap';
import type { GraphLocale } from './graphI18n';
import { I18N_GRAPH } from './graphI18n';

/** Warn about non-G6-destroyed errors so real bugs aren't silently swallowed */
export function warnIfNotDestroyed(e: unknown): void {
  if (import.meta.env.DEV && !(e instanceof Error && e.message.includes('destroyed'))) {
    console.warn('[KnowledgeGraph]', e);
  }
}

/**
 * Creates a batchDraw function that coalesces multiple `graph.draw()` calls
 * within a single animation frame, avoiding redundant rendering.
 */
export function createBatchDraw(
  graphRef: React.RefObject<Graph | null>,
  pendingDrawRef: MutableRefObject<boolean>,
): () => void {
  return () => {
    if (pendingDrawRef.current) return;
    pendingDrawRef.current = true;
    requestAnimationFrame(() => {
      pendingDrawRef.current = false;
      const g = graphRef.current;
      if (g && !g.destroyed) {
        g.draw();
      }
    });
  };
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
  setTimeout(() => { if (link.parentNode) link.parentNode.removeChild(link); }, 100);
}

// ── Node style helper (extracted for reuse and readability) ──

export function computeNodeStyle(
  node: MapNode,
  isCollapsed: boolean,
  childCount: number,
  customNodeColors?: Map<string, string>,
  savedPos?: { x: number; y: number },
  comboId?: string,
) {
  const strokeColor = getNodeStroke(node.masteryColor);
  const baseLabel = truncateLabel(node.label);
  const displayLabel = isCollapsed && childCount > 0
    ? baseLabel + ` (+${childCount})`
    : baseLabel;

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
      size: Math.max(44, Math.min(56, 44 + (node.mastery >= 0 ? node.mastery * 12 : 0))),
      ...(savedPos ? { x: savedPos.x, y: savedPos.y } : {}),
    },
  };
}

export function computeEdgeStyle(edge: GraphData['edges'][number]) {
  return {
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
  };
}

// ── Zoom limits ──────────────────────────────────────────────
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 5;

// ── Layout presets (shared by init and layout-switch) ────────
export const LAYOUT_FORCE = { type: 'd3-force' as const, preventOverlap: true, nodeSize: 50, linkDistance: 150, nodeStrength: -200, collideStrength: 0.8 };
export const LAYOUT_RADIAL = { type: 'radial' as const, unitRadius: 120, preventOverlap: true, nodeSize: 50 };
export const LAYOUT_DAGRE = { type: 'dagre' as const, rankdir: 'TB', nodesep: 40, ranksep: 60 };

export interface UseGraphInitOptions {
  data: GraphData;
  layout: 'force' | 'radial' | 'dagre';
  showMinimap: boolean;
  gridEnabled: boolean;
  topicId?: string;
  customNodeColors?: Map<string, string>;
  locale?: GraphLocale;
  /** Callbacks stabilized via refs in the main component */
  onReadyRef: React.RefObject<((controls: GraphControls) => void) | undefined>;
  onCollapseChangeRef: React.RefObject<((count: number, ids: Set<string>) => void) | undefined>;
  onMultiSelectRef: React.RefObject<((ids: string[]) => void) | undefined>;
  flashZoomLimit: () => void;
  updateMultiSelection: (ids: Set<string>) => void;
}

export interface UseGraphInitReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  graphRef: React.RefObject<Graph | null>;
  ready: boolean;
  graphVersion: number;
  collapsedNodes: Set<string>;
  setCollapsedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  breadcrumbs: Array<{ id: string; label: string }>;
  setBreadcrumbs: React.Dispatch<React.SetStateAction<Array<{ id: string; label: string }>>>;
  combos: PersistedCombo[];
  setCombos: React.Dispatch<React.SetStateAction<PersistedCombo[]>>;
  comboCounterRef: React.RefObject<number>;
  mountedRef: React.RefObject<boolean>;
  layoutInProgressRef: React.RefObject<boolean>;
  longPressTimerRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
  savedPositionsRef: React.RefObject<PositionMap>;
  topicIdRef: React.RefObject<string | undefined>;
  gridEnabledRef: React.RefObject<boolean>;
  collapseAllRef: React.RefObject<() => void>;
  expandAllRef: React.RefObject<() => void>;
  toggleCollapseRef: React.RefObject<(nodeId: string) => boolean>;
  childrenMap: Map<string, string[]>;
  childrenMapRef: React.RefObject<Map<string, string[]>>;
  nodeToCombo: Map<string, string>;
  g6Data: (collapsed: Set<string>, positions?: PositionMap) => { nodes: ReturnType<typeof computeNodeStyle>[]; edges: ReturnType<typeof computeEdgeStyle>[]; combos: { id: string; data: { label: string } }[] };
  highlightEpoch: number;
  setHighlightEpoch: React.Dispatch<React.SetStateAction<number>>;
  dataNodesRef: React.RefObject<GraphData['nodes']>;
  dataEdgesRef: React.RefObject<GraphData['edges']>;
  nodeById: Map<string, MapNode>;
  gridEnabled: boolean;
  gridEnabledInternal: boolean;
  setGridEnabledInternal: React.Dispatch<React.SetStateAction<boolean>>;
  batchDraw: () => void;
  pendingDrawRef: React.MutableRefObject<boolean>;
}

export function useGraphInit(opts: UseGraphInitOptions): UseGraphInitReturn {
  const {
    data,
    layout,
    showMinimap,
    gridEnabled: gridEnabledProp,
    topicId,
    customNodeColors,
    locale = 'es',
    onReadyRef,
    onCollapseChangeRef,
    flashZoomLimit,
    updateMultiSelection,
  } = opts;

  const t = I18N_GRAPH[locale] ?? I18N_GRAPH.es;
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const pendingDrawRef = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const batchDraw = useCallback(createBatchDraw(graphRef, pendingDrawRef), []);
  const mountedRef = useRef(true);
  const layoutInProgressRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [graphVersion, setGraphVersion] = useState(0);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; label: string }>>([]);

  // Grid state: controlled or uncontrolled
  const [gridEnabledInternal, setGridEnabledInternal] = useState(() => loadGridEnabled());
  const gridEnabled = gridEnabledProp ?? gridEnabledInternal;

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

  // Stable ref for gridEnabled (used in event handlers)
  const gridEnabledRef = useRef(gridEnabled);
  gridEnabledRef.current = gridEnabled;

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

  // Memoize children map to avoid O(N*E) per draw — only depends on edges
  const childrenMap = useMemo(() => buildChildrenMap(data.edges), [data.edges]);
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

  // Pre-compute node styles (memoized separately — only re-runs when dependencies change)
  // This avoids recomputing fill/stroke/size for every node on each g6Data() call.
  const memoizedNodeStyles = useMemo(() => {
    const styleMap = new Map<string, ReturnType<typeof computeNodeStyle>>();
    for (const node of data.nodes) {
      styleMap.set(node.id, computeNodeStyle(
        node,
        false, // collapsed state applied dynamically in g6Data
        childrenMap.get(node.id)?.length ?? 0,
        customNodeColors,
        undefined, // positions applied dynamically in g6Data
        nodeToCombo.get(node.id),
      ));
    }
    return styleMap;
  }, [data.nodes, customNodeColors, childrenMap, nodeToCombo]);

  // Pre-compute edge styles (memoized separately — only re-runs when edges change)
  const memoizedEdgeStyles = useMemo(
    () => data.edges.map(computeEdgeStyle),
    [data.edges],
  );

  // Pre-compute combo G6 data (memoized separately)
  const g6Combos = useMemo(
    () => combos.map(c => ({ id: c.id, data: { label: c.label } })),
    [combos],
  );

  // Transform Axon data → G6 format
  const g6Data = useCallback((collapsed: Set<string>, positions?: PositionMap) => {
    const hidden = computeHiddenNodes(data.nodes, data.edges, collapsed, childrenMap);

    const nodes: ReturnType<typeof computeNodeStyle>[] = [];
    for (const node of data.nodes) {
      if (hidden.has(node.id)) continue;
      const base = memoizedNodeStyles.get(node.id);
      if (!base) continue;

      const isCollapsed = collapsed.has(node.id);
      const savedPos = positions?.get(node.id);

      // Fast path: if no collapse override and no position override, reuse cached style
      if (!isCollapsed && !savedPos) {
        nodes.push(base);
      } else {
        // Apply collapse/position overrides on top of the memoized base
        const childCount = childrenMap.get(node.id)?.length ?? 0;
        const displayLabel = isCollapsed && childCount > 0
          ? truncateLabel(node.label) + ` (+${childCount})`
          : (base.style.labelText as string);
        nodes.push({
          ...base,
          data: { ...base.data, label: displayLabel },
          style: {
            ...base.style,
            lineWidth: isCollapsed ? 2.5 : base.style.lineWidth,
            lineDash: isCollapsed ? [4, 4] : base.style.lineDash,
            labelText: displayLabel,
            ...(savedPos ? { x: savedPos.x, y: savedPos.y } : {}),
          },
        });
      }
    }

    const visibleNodeIds = new Set(nodes.map(n => n.id));
    const edges = memoizedEdgeStyles.filter(
      edge => !hidden.has(edge.source) && !hidden.has(edge.target)
        && visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
    );

    return { nodes, edges, combos: g6Combos };
  }, [data, childrenMap, memoizedNodeStyles, memoizedEdgeStyles, g6Combos]);

  // Layout config
  const getLayoutConfig = useCallback(() => {
    switch (layout) {
      case 'radial': return LAYOUT_RADIAL;
      case 'dagre': return LAYOUT_DAGRE;
      case 'force':
      default: return LAYOUT_FORCE;
    }
  }, [layout]);

  // Reset collapsed nodes when the underlying data set changes
  const prevNodeSetRef = useRef('');
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
  }, [nodeSetKey, onCollapseChangeRef]);

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
    () => `${nodeSetKey}|${edgeSetKey}|mm:${showMinimap ? '1' : '0'}|grid:${gridEnabled ? '1' : '0'}`,
    [nodeSetKey, edgeSetKey, showMinimap, gridEnabled],
  );

  // Stable refs for collapse/expand
  const collapseAllRef = useRef<() => void>(() => {});
  const expandAllRef = useRef<() => void>(() => {});
  const toggleCollapseRef = useRef<(nodeId: string) => boolean>(() => false);

  collapseAllRef.current = () => {
    const nodeIds = new Set(data.nodes.map(n => n.id));
    const nodesWithChildren = new Set(data.edges.map(e => e.source).filter(id => id != null && nodeIds.has(id)));
    setCollapsedNodes(nodesWithChildren);
    onCollapseChangeRef.current?.(nodesWithChildren.size, nodesWithChildren);
    const nodeByIdLocal = new Map(data.nodes.map(n => [n.id, n]));
    setBreadcrumbs(
      Array.from(nodesWithChildren).map(id => {
        const n = nodeByIdLocal.get(id);
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

  // Counter that increments when setData rebuilds the graph, forcing highlight effect to reapply
  const [highlightEpoch, setHighlightEpoch] = useState(0);

  // Guard: skip first update-data effect after graph init (render already drew)
  const justInitializedRef = useRef(false);

  // Initialize graph
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (graphRef.current && dataKey.current === currentDataKey) return;
    dataKey.current = currentDataKey;

    if (graphRef.current) {
      graphRef.current.destroy();
      graphRef.current = null;
    }

    if (data.nodes.length === 0) {
      setReady(true);
      return;
    }

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
            shadowColor: `rgba(${GRAPH_COLORS.primaryRgb}, 0.4)`,
            shadowBlur: 14,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
          },
          selected: {
            lineWidth: 3,
            shadowColor: `rgba(${GRAPH_COLORS.primaryRgb}, 0.55)`,
            shadowBlur: 18,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
          },
          multiSelected: {
            stroke: GRAPH_COLORS.primary,
            lineWidth: 3.5,
            shadowColor: `rgba(${GRAPH_COLORS.primaryRgb}, 0.6)`,
            shadowBlur: 14,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
          },
          active: {
            lineWidth: 3,
            shadowColor: `rgba(${GRAPH_COLORS.primaryRgb}, 0.7)`,
            shadowBlur: 20,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
          },
          spotlight: {
            lineWidth: 3.5,
            shadowColor: `rgba(${GRAPH_COLORS.primaryRgb}, 0.85)`,
            shadowBlur: 28,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            stroke: GRAPH_COLORS.primary,
          },
          spotlightConnected: {
            lineWidth: 2.5,
            shadowColor: `rgba(${GRAPH_COLORS.primaryRgb}, 0.35)`,
            shadowBlur: 12,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
          },
          spotlightDim: {
            opacity: 0.3,
            labelFill: '#a1a1aa',
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
            lineWidth: 3,
            stroke: colors.primary[500],
            shadowColor: `rgba(${GRAPH_COLORS.primaryRgb}, 0.4)`,
            shadowBlur: 8,
          },
          spotlightConnected: {
            lineWidth: 2.5,
            stroke: GRAPH_COLORS.primary,
            opacity: 1,
          },
          spotlightDim: {
            opacity: 0.12,
          },
        },
        animation: {
          enter: [
            { fields: ['opacity'], duration: 320, easing: 'ease-out', fill: 'both' },
          ],
          update: [
            { fields: ['stroke', 'lineWidth', 'opacity'], duration: 250, easing: 'ease-out' },
          ],
          exit: [
            { fields: ['opacity'], duration: 200, easing: 'ease-in' },
          ],
        },
      },
      layout: getLayoutConfig(),
      behaviors: [
        {
          type: 'drag-canvas',
          sensitivity: 1.3,
        },
        {
          type: 'zoom-canvas',
          sensitivity: 1,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          origin: 'pointer',
          trigger: ['Control'],
        },
        {
          type: 'scroll-canvas',
          sensitivity: 1,
        },
        {
          type: 'optimize-viewport-transform',
        },
        {
          type: 'drag-element',
        },
        {
          type: 'hover-activate',
          degree: 1,
        },
        {
          type: 'brush-select',
          key: 'brush-select',
          trigger: 'shift',
          style: {
            fill: GRAPH_COLORS.primary,
            fillOpacity: 0.1,
            stroke: GRAPH_COLORS.primary,
            lineWidth: 1,
          },
        },
      ],
      plugins: [
        {
          type: 'tooltip',
          key: 'node-tooltip',
          trigger: 'hover',
          entryDelay: 400,
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
              <div style="font-size:10px;color:#6b7280">${escHtml(t.mastery)}: ${pct}</div>
              ${review ? `<div style="font-size:10px;color:#f97316;margin-top:2px;font-weight:500">\u26a0 ${escHtml(t.reviewAlert)}</div>` : ''}
              ${annotation ? `<div style="font-size:10px;color:${GRAPH_COLORS.primary};font-style:italic;margin-top:2px">&ldquo;${annotation}&rdquo;</div>` : ''}
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
        {
          type: 'tooltip',
          key: 'edge-tooltip',
          trigger: 'hover',
          entryDelay: 300,
          getContent: (_evt: unknown, items: Array<{ data?: Record<string, unknown> }>) => {
            if (!items?.length) return '';
            const item = items[0];
            const d = item?.data ?? {};
            const label = escHtml(String(d.label || ''));
            const connType = String(d.connectionType || '');
            if (!label && !connType) return '';
            return `<div style="max-width:180px;font-family:Inter,sans-serif">
              ${label ? `<div style="font-weight:600;font-size:11px;color:#111827;margin-bottom:1px">${label}</div>` : ''}
              ${connType ? `<div style="font-size:10px;color:#6b7280">${escHtml(connType)}</div>` : ''}
            </div>`;
          },
          itemTypes: ['edge'],
          style: {
            '.tooltip': {
              'background-color': 'white',
              'border-radius': '8px',
              'box-shadow': '0 2px 12px rgba(0,0,0,0.08)',
              'border': '1px solid #e5e7eb',
              'padding': '6px 10px',
            },
          },
        },
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
            border: `2px solid ${GRAPH_COLORS.primary}`,
            borderRadius: '4px',
            background: `rgba(${GRAPH_COLORS.primaryRgb}, 0.08)`,
          },
          delay: 150,
        }] : []),
        ...(gridEnabled ? [{
          type: 'grid-line' as const,
          key: 'grid-line',
          size: 40,
          stroke: `rgba(${GRAPH_COLORS.primaryRgb}, 0.08)`,
          lineWidth: 1,
          border: false,
          follow: true,
        }] : []),
        ...(gridEnabled ? [{
          type: 'snapline' as const,
          key: 'snapline',
          tolerance: 20,
          autoSnap: true,
          verticalLineStyle: { stroke: GRAPH_COLORS.primary, lineWidth: 1, opacity: 0.5 },
          horizontalLineStyle: { stroke: GRAPH_COLORS.primary, lineWidth: 1, opacity: 0.5 },
        }] : []),
      ],
      combo: {
        type: 'rect' as const,
        style: {
          fill: `rgba(${GRAPH_COLORS.primaryRgb}, 0.05)`,
          stroke: `rgba(${GRAPH_COLORS.primaryRgb}, 0.2)`,
          lineWidth: 1.5,
          radius: 12,
          padding: [20, 16, 16, 16],
          labelText: (d: { id?: string; data?: Record<string, unknown> }) => String(d?.data?.label || ''),
          labelFill: GRAPH_COLORS.primary,
          labelFontSize: 11,
          labelFontFamily: 'Inter, sans-serif',
          labelFontWeight: 600,
          labelPlacement: 'top',
          cursor: 'pointer',
          collapsedMarker: true,
          collapsedMarkerFill: GRAPH_COLORS.primary,
        },
      },
      animation: true,
    });

    graphRef.current = graph;

    justInitializedRef.current = true;
    graph.setData(g6Data(new Set(), savedPositionsRef.current));
    graph.render().then(() => {
      if (!mountedRef.current || graphRef.current !== graph) return;
      setReady(true);
      setGraphVersion(v => v + 1);
      onReadyRef.current?.({
        zoomIn: () => {
          const g = graphRef.current; if (!g) return;
          try {
            const currentZoom = g.getZoom();
            if (currentZoom >= MAX_ZOOM) { flashZoomLimit(); return; }
            g.zoomBy(1.3, { duration: 250, easing: 'ease-in-out' });
          } catch (e: unknown) { warnIfNotDestroyed(e); }
        },
        zoomOut: () => {
          const g = graphRef.current; if (!g) return;
          try {
            const currentZoom = g.getZoom();
            if (currentZoom <= MIN_ZOOM) { flashZoomLimit(); return; }
            g.zoomBy(1 / 1.3, { duration: 250, easing: 'ease-in-out' });
          } catch (e: unknown) { warnIfNotDestroyed(e); }
        },
        fitView: () => { const g = graphRef.current; if (!g) return; try { g.fitView(); } catch (e: unknown) { warnIfNotDestroyed(e); } },
        resetZoom: () => {
          const g = graphRef.current; if (!g) return;
          try { g.zoomTo(1, { duration: 250, easing: 'ease-in-out' }); } catch (e: unknown) { warnIfNotDestroyed(e); }
        },
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
    }).catch((e) => { warnIfNotDestroyed(e); if (mountedRef.current) setReady(true); });

    return () => {
      layoutInProgressRef.current = false;
      if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
      try { graph.destroy(); } catch (e) { if (import.meta.env.DEV) console.warn("[KnowledgeGraph] G6 may throw if mid-render", e); }
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDataKey, showMinimap, gridEnabled]);

  // Smooth layout switching
  const prevLayoutRef = useRef(layout);
  useEffect(() => {
    const graph = graphRef.current;
    if (prevLayoutRef.current === layout) return;
    prevLayoutRef.current = layout;
    if (!graph || !ready || layoutInProgressRef.current) return;

    const layoutConfig = layout === 'dagre' ? LAYOUT_DAGRE
      : layout === 'radial' ? LAYOUT_RADIAL
      : LAYOUT_FORCE;

    layoutInProgressRef.current = true;
    graph.setLayout(layoutConfig);
    graph.layout().then(() => {
      if (!mountedRef.current || graphRef.current !== graph) return;
      try { graph.fitView(undefined, { duration: 300, easing: 'ease-out' }); } catch (e) { if (import.meta.env.DEV) console.warn("[KnowledgeGraph] ", e); }
    }).catch(() => { /* layout may fail if destroyed */ }).finally(() => {
      layoutInProgressRef.current = false;
    });
  }, [layout, ready]);

  // ResizeObserver
  const prevSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !ready) return;

    const ro = new ResizeObserver(() => {
      const g = graphRef.current;
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

    if (justInitializedRef.current) {
      justInitializedRef.current = false;
      return;
    }

    try {
      graph.setData(g6Data(collapsedNodes));
      batchDraw();
    } catch (e: unknown) { warnIfNotDestroyed(e); }

    setHighlightEpoch(e => e + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g6Data, ready, collapsedNodes]);

  // Highlight selected node
  const nodeById = useMemo(
    () => new Map(data.nodes.map(n => [n.id, n])),
    [data.nodes],
  );

  return {
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
    savedPositionsRef,
    topicIdRef,
    gridEnabledRef,
    collapseAllRef,
    expandAllRef,
    toggleCollapseRef,
    childrenMap,
    childrenMapRef,
    nodeToCombo,
    g6Data,
    highlightEpoch,
    setHighlightEpoch,
    dataNodesRef,
    dataEdgesRef,
    nodeById,
    gridEnabled,
    gridEnabledInternal,
    setGridEnabledInternal,
    batchDraw,
    pendingDrawRef,
  };
}
