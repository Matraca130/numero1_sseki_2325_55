// ============================================================
// useGraphEvents — G6 event registrations and spotlight logic
// Extracted from KnowledgeGraph.tsx (pure refactor)
// ============================================================

import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { Graph } from '@antv/g6';
import type { GraphData, MapNode, G6NodeEvent } from '@/app/types/mindmap';
import { saveNodePosition } from './useNodePositions';
import type { PositionMap } from './useNodePositions';
import { warnIfNotDestroyed, MIN_ZOOM, MAX_ZOOM } from './useGraphInit';

/** Extended G6 node event with canvas coordinates (used by long-press) */
interface G6NodeEventExtended extends G6NodeEvent {
  canvas: { x: number; y: number };
}

const SPOTLIGHT_STATES = ['spotlight', 'spotlightConnected', 'spotlightDim'] as const;

export interface UseGraphEventsOptions {
  graphRef: React.RefObject<Graph | null>;
  ready: boolean;
  graphVersion: number;
  data: GraphData;
  mountedRef: React.RefObject<boolean>;
  layoutInProgressRef: React.RefObject<boolean>;
  longPressTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  topicIdRef: React.RefObject<string | undefined>;
  gridEnabledRef: React.RefObject<boolean>;
  childrenMapRef: React.RefObject<Map<string, string[]>>;
  onNodeClickRef: React.RefObject<((node: MapNode | null, position?: { x: number; y: number }) => void) | undefined>;
  onNodeRightClickRef: React.RefObject<((node: MapNode, position: { x: number; y: number }) => void) | undefined>;
  onCollapseChangeRef: React.RefObject<((count: number, ids: Set<string>) => void) | undefined>;
  onMultiSelectRef: React.RefObject<((ids: string[]) => void) | undefined>;
  onZoomChangeRef: React.RefObject<((zoom: number) => void) | undefined>;
  multiSelectedIdsRef: React.RefObject<Set<string>>;
  setCollapsedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  setBreadcrumbs: React.Dispatch<React.SetStateAction<Array<{ id: string; label: string }>>>;
  setMultiSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  applyMultiSelectionState: (graph: Graph, ids: Set<string>) => void;
  updateMultiSelection: (ids: Set<string>) => void;
  flashZoomLimit: () => void;
  batchDraw: () => void;
}

export interface UseGraphEventsReturn {
  applySpotlight: (graph: Graph, nodeId: string) => void;
  clearSpotlight: (graph: Graph) => void;
  adjacencyMap: Map<string, Set<string>>;
  edgeByEndpoints: Map<string, string[]>;
  spotlightedIdsRef: React.RefObject<Set<string>>;
}

export function useGraphEvents(opts: UseGraphEventsOptions): UseGraphEventsReturn {
  const {
    graphRef,
    ready,
    graphVersion,
    data,
    mountedRef,
    longPressTimerRef,
    topicIdRef,
    gridEnabledRef,
    childrenMapRef,
    onNodeClickRef,
    onNodeRightClickRef,
    onCollapseChangeRef,
    onMultiSelectRef,
    onZoomChangeRef,
    multiSelectedIdsRef,
    setCollapsedNodes,
    setBreadcrumbs,
    setMultiSelectedIds,
    setShowShortcuts,
    applyMultiSelectionState,
    updateMultiSelection,
    flashZoomLimit,
    batchDraw,
  } = opts;

  // Spotlight state
  const spotlightNodeRef = useRef<string | null>(null);
  const spotlightedIdsRef = useRef<Set<string>>(new Set());

  // Bidirectional adjacency map for spotlight neighborhood
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of data.edges) {
      if (!map.has(edge.source)) map.set(edge.source, new Set());
      if (!map.has(edge.target)) map.set(edge.target, new Set());
      map.get(edge.source)!.add(edge.target);
      map.get(edge.target)!.add(edge.source);
    }
    return map;
  }, [data.edges]);
  const adjacencyMapRef = useRef(adjacencyMap);
  adjacencyMapRef.current = adjacencyMap;

  // Edge lookup: for each node pair, the edge IDs connecting them
  const edgeByEndpoints = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const edge of data.edges) {
      const key1 = `${edge.source}|${edge.target}`;
      const key2 = `${edge.target}|${edge.source}`;
      if (!map.has(key1)) map.set(key1, []);
      map.get(key1)!.push(edge.id);
      if (!map.has(key2)) map.set(key2, []);
      map.get(key2)!.push(edge.id);
    }
    return map;
  }, [data.edges]);
  const edgeByEndpointsRef = useRef(edgeByEndpoints);
  edgeByEndpointsRef.current = edgeByEndpoints;

  // ── Spotlight helpers ──
  const clearSpotlight = useCallback((graph: Graph) => {
    if (!spotlightNodeRef.current) return;
    spotlightNodeRef.current = null;
    try {
      for (const id of spotlightedIdsRef.current) {
        try {
          const cur = graph.getElementState(id);
          const cleaned = Array.isArray(cur) ? cur.filter(s => !(SPOTLIGHT_STATES as readonly string[]).includes(s)) : [];
          graph.setElementState(id, cleaned);
        } catch (e) { if (import.meta.env.DEV) console.warn("[KnowledgeGraph] element may have been removed", e); }
      }
      spotlightedIdsRef.current.clear();
      batchDraw();
    } catch (e: unknown) { warnIfNotDestroyed(e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- graph/callbacks accessed via refs; stable identity intentional
  }, []);

  const applySpotlight = useCallback((graph: Graph, nodeId: string) => {
    if (spotlightNodeRef.current === nodeId) {
      clearSpotlight(graph);
      return;
    }
    spotlightNodeRef.current = nodeId;

    const neighbors = adjacencyMapRef.current.get(nodeId) ?? new Set<string>();
    const connectedEdgeIds = new Set<string>();
    for (const neighborId of neighbors) {
      const edgeIds = edgeByEndpointsRef.current.get(`${nodeId}|${neighborId}`);
      if (edgeIds) for (const eid of edgeIds) connectedEdgeIds.add(eid);
    }

    const nextSpotlightIds = new Set<string>();

    try {
      const allNodes = graph.getNodeData();
      for (const n of allNodes) {
        const id = String(n.id);
        const cur = graph.getElementState(id);
        const base = Array.isArray(cur) ? cur.filter(s => !(SPOTLIGHT_STATES as readonly string[]).includes(s)) : [];
        let newState: string;
        if (id === nodeId) {
          newState = 'spotlight';
        } else if (neighbors.has(id)) {
          newState = 'spotlightConnected';
        } else {
          newState = 'spotlightDim';
        }
        const prevHasSpotlight = Array.isArray(cur) && cur.some(s => (SPOTLIGHT_STATES as readonly string[]).includes(s));
        const prevSpotlightState = prevHasSpotlight ? cur.find(s => (SPOTLIGHT_STATES as readonly string[]).includes(s)) : undefined;
        if (prevSpotlightState !== newState || !prevHasSpotlight) {
          graph.setElementState(id, [...base, newState]);
        }
        nextSpotlightIds.add(id);
      }
      const allEdges = graph.getEdgeData();
      for (const e of allEdges) {
        const id = String(e.id);
        const cur = graph.getElementState(id);
        const base = Array.isArray(cur) ? cur.filter(s => !(SPOTLIGHT_STATES as readonly string[]).includes(s)) : [];
        const newState = connectedEdgeIds.has(id) ? 'spotlightConnected' : 'spotlightDim';
        const prevSpotlightState = Array.isArray(cur) ? cur.find(s => (SPOTLIGHT_STATES as readonly string[]).includes(s)) : undefined;
        if (prevSpotlightState !== newState) {
          graph.setElementState(id, [...base, newState]);
        }
        nextSpotlightIds.add(id);
      }

      for (const oldId of spotlightedIdsRef.current) {
        if (!nextSpotlightIds.has(oldId)) {
          try {
            const cur = graph.getElementState(oldId);
            const cleaned = Array.isArray(cur) ? cur.filter(s => !(SPOTLIGHT_STATES as readonly string[]).includes(s)) : [];
            graph.setElementState(oldId, cleaned);
          } catch (e) { if (import.meta.env.DEV) console.warn("[KnowledgeGraph] element may have been removed", e); }
        }
      }
      spotlightedIdsRef.current = nextSpotlightIds;
      batchDraw();
    } catch (e: unknown) { warnIfNotDestroyed(e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- graph access via refs; only clearSpotlight needed as dep
  }, [clearSpotlight]);

  // ── Event handlers effect ──
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready) return;

    let longPressTriggered = false;

    const handleNodeClick = (evt: G6NodeEvent) => {
      if (longPressTriggered) { longPressTriggered = false; return; }
      const nodeId = evt.target?.id ?? evt.itemId;
      if (!nodeId) return;

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
          requestAnimationFrame(() => {
            const g = graphRef.current;
            if (g) applyMultiSelectionState(g, next);
          });
          return next;
        });
        return;
      }

      if (multiSelectedIdsRef.current.size > 0) {
        updateMultiSelection(new Set());
      }

      const nodeData = graph.getNodeData(nodeId);
      if (nodeData?.data?._raw && onNodeClickRef.current) {
        onNodeClickRef.current(nodeData.data._raw as MapNode, {
          x: evt.client?.x ?? evt.clientX ?? 0,
          y: evt.client?.y ?? evt.clientY ?? 0,
        });
      }

      requestAnimationFrame(() => {
        const g = graphRef.current;
        if (g) applySpotlight(g, nodeId);
      });
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
      const hasChildren = (childrenMapRef.current.get(nodeId)?.length ?? 0) > 0;
      if (!hasChildren) return;

      const nodeData = graph.getNodeData(nodeId);
      const nodeLabel = String(nodeData?.data?.fullLabel || nodeData?.data?.label || nodeId);

      setCollapsedNodes(prev => {
        const next = new Set(prev);
        const wasCollapsed = next.has(nodeId);
        if (wasCollapsed) {
          next.delete(nodeId);
          setBreadcrumbs(bc => bc.filter(b => b.id !== nodeId));
        } else {
          next.add(nodeId);
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
      onNodeClickRef.current?.(null);
      setShowShortcuts(false);
      if (multiSelectedIdsRef.current.size > 0) {
        updateMultiSelection(new Set());
      }
      clearSpotlight(graph);
    };

    const handleBrushSelect = (evt: { data: { nodes?: string[] } }) => {
      const selectedIds = evt.data?.nodes ?? [];
      if (selectedIds.length > 0) {
        const next = new Set([...multiSelectedIdsRef.current, ...selectedIds]);
        updateMultiSelection(next);
      }
    };

    const GRID_SIZE = 40;
    const handleNodeDragEnd = (evt: G6NodeEvent) => {
      const nodeId = evt.target?.id ?? evt.itemId;
      if (!nodeId || !topicIdRef.current) return;
      try {
        const nodeData = graph.getNodeData(nodeId);
        if (nodeData?.style) {
          let { x, y } = nodeData.style as { x?: number; y?: number };
          if (typeof x === 'number' && typeof y === 'number') {
            if (gridEnabledRef.current) {
              x = Math.round(x / GRID_SIZE) * GRID_SIZE;
              y = Math.round(y / GRID_SIZE) * GRID_SIZE;
              graph.updateNodeData([{ id: nodeId, style: { x, y } }]);
              batchDraw();
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
    let longPressStartPos: { x: number; y: number } | null = null;
    const LONG_PRESS_MOVE_THRESHOLD = 10;

    const handleNodePointerDown = (evt: G6NodeEventExtended) => {
      longPressTriggered = false;
      longPressStartPos = { x: evt.canvas.x, y: evt.canvas.y };
      const nodeId = evt.target?.id ?? evt.itemId;
      if (nodeId) {
        try {
          const existing = graph.getElementState(nodeId);
          const states = Array.isArray(existing)
            ? [...existing.filter((s: string) => s !== 'active'), 'active']
            : ['active'];
          graph.setElementState(nodeId, states);
        } catch (e: unknown) { warnIfNotDestroyed(e); }
      }
      longPressTimerRef.current = setTimeout(() => {
        if (!mountedRef.current || graphRef.current !== graph) return;
        longPressTriggered = true;
        try { handleNodeContextMenu(evt); } catch (e: unknown) { warnIfNotDestroyed(e); }
      }, 500);
    };
    const cancelLongPress = () => {
      if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
      longPressStartPos = null;
    };
    const clearActiveState = (evt: G6NodeEvent) => {
      cancelLongPress();
      const nodeId = evt.target?.id ?? evt.itemId;
      if (nodeId) {
        try {
          const current = graph.getElementState(nodeId);
          const filtered = Array.isArray(current) ? current.filter(s => s !== 'active') : [];
          graph.setElementState(nodeId, filtered);
        } catch (e: unknown) { warnIfNotDestroyed(e); }
      }
    };
    const handleNodePointerMove = (evt: G6NodeEventExtended) => {
      if (!longPressTimerRef.current || !longPressStartPos) return;
      const dx = evt.canvas.x - longPressStartPos.x;
      const dy = evt.canvas.y - longPressStartPos.y;
      if (dx * dx + dy * dy > LONG_PRESS_MOVE_THRESHOLD * LONG_PRESS_MOVE_THRESHOLD) {
        cancelLongPress();
      }
    };

    graph.on('node:pointerdown', handleNodePointerDown);
    graph.on('node:pointerup', clearActiveState);
    graph.on('node:pointerleave', clearActiveState);
    graph.on('node:pointermove', handleNodePointerMove);

    // Edge hover: highlight the two connected nodes
    let edgeHoverNodes: string[] = [];
    const handleEdgePointerEnter = (evt: { target?: { id?: string }; itemId?: string }) => {
      const edgeId = evt.target?.id ?? evt.itemId;
      if (!edgeId) return;
      try {
        const edgeData = graph.getEdgeData(edgeId);
        if (!edgeData) return;
        const src = edgeData.source as string;
        const tgt = edgeData.target as string;
        edgeHoverNodes = [src, tgt].filter(Boolean);
        for (const nId of edgeHoverNodes) {
          const cur = graph.getElementState(nId);
          const base = Array.isArray(cur) ? cur.filter(s => s !== 'hover') : [];
          graph.setElementState(nId, [...base, 'hover']);
        }
      } catch (e: unknown) { warnIfNotDestroyed(e); }
    };
    const handleEdgePointerLeave = () => {
      try {
        for (const nId of edgeHoverNodes) {
          const cur = graph.getElementState(nId);
          const cleaned = Array.isArray(cur) ? cur.filter(s => s !== 'hover') : [];
          graph.setElementState(nId, cleaned);
        }
        edgeHoverNodes = [];
      } catch (e: unknown) { warnIfNotDestroyed(e); }
    };
    graph.on('edge:pointerenter', handleEdgePointerEnter);
    graph.on('edge:pointerleave', handleEdgePointerLeave);

    // Track zoom level changes
    let prevZoomForLimit = NaN;
    const handleViewportChange = () => {
      try {
        const zoom = graph.getZoom();
        if (typeof zoom === 'number') {
          onZoomChangeRef.current?.(zoom);
          if (!isNaN(prevZoomForLimit)) {
            const atMin = zoom <= MIN_ZOOM + 0.001 && prevZoomForLimit <= MIN_ZOOM + 0.001;
            const atMax = zoom >= MAX_ZOOM - 0.01 && prevZoomForLimit >= MAX_ZOOM - 0.01;
            if (atMin || atMax) flashZoomLimit();
          }
          prevZoomForLimit = zoom;
        }
      } catch (e) { if (import.meta.env.DEV) console.warn("[KnowledgeGraph] graph may be destroyed", e); }
    };
    graph.on('afterviewportchange', handleViewportChange);
    handleViewportChange();

    return () => {
      try {
        graph.off('node:click', handleNodeClick);
        graph.off('node:contextmenu', handleNodeContextMenu);
        graph.off('node:dblclick', handleNodeDblClick);
        graph.off('node:dragend', handleNodeDragEnd);
        graph.off('canvas:click', handleCanvasClick);
        graph.off('afterbrushselect', handleBrushSelect);
        graph.off('node:pointerdown', handleNodePointerDown);
        graph.off('node:pointerup', clearActiveState);
        graph.off('node:pointerleave', clearActiveState);
        graph.off('node:pointermove', handleNodePointerMove);
        graph.off('edge:pointerenter', handleEdgePointerEnter);
        graph.off('edge:pointerleave', handleEdgePointerLeave);
        graph.off('afterviewportchange', handleViewportChange);
      } catch (e) { if (import.meta.env.DEV) console.warn("[KnowledgeGraph] graph may already be destroyed", e); }
      if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- event handlers accessed via refs; only re-binds on ready/graphVersion
  }, [ready, graphVersion]);

  return {
    applySpotlight,
    clearSpotlight,
    adjacencyMap,
    edgeByEndpoints,
    spotlightedIdsRef,
  };
}
