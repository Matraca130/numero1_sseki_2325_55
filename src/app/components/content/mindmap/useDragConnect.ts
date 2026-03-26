// ============================================================
// Axon — useDragConnect hook
//
// Enhanced drag-to-connect experience with rich visual feedback:
//   - Connection port circles on nodes (top/bottom/left/right)
//   - Animated bezier arrow following cursor during drag
//   - "Conectar a..." label near cursor
//   - Source node pulse while dragging
//   - Target node snap ring + scale-up effect
//   - Invalid target feedback (self-loop, duplicate)
//   - Quick-connect "+" button on node hover
//   - Connection success celebration animation
//
// Uses a canvas overlay (same pattern as useEdgeReconnect.ts)
// to avoid interfering with G6's internal rendering.
//
// Canvas drawing logic is delegated to drawDragConnectOverlay.ts.
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import type { Graph } from '@antv/g6';
import type { MapEdge } from '@/app/types/mindmap';
import { getNodeScreenPositions, findNearestNode, GRAPH_COLORS } from './graphHelpers';
import type { NodeScreenPos } from './graphHelpers';
import { I18N_GRAPH } from './graphI18n';
import type { GraphLocale } from './graphI18n';
import { drawDragConnectFrame, SUCCESS_ANIM_DURATION } from './drawDragConnectOverlay';
import type { DragDrawState, SuccessAnimState } from './drawDragConnectOverlay';

// ── Constants ───────────────────────────────────────────────

/** Distance from node center at which a port is considered "hit" */
const PORT_HIT_RADIUS = 24;
/** Distance from a node center to detect snap */
const NODE_SNAP_RADIUS = 55;
/** Minimum drag distance to activate (desktop) */
const DRAG_THRESHOLD = 4;
/** Minimum drag distance to activate (touch — larger to avoid accidental drags) */
const TOUCH_DRAG_THRESHOLD = 12;
/** Size of connection port circles — larger on touch for visibility */
function getPortRadius(isTouch: boolean) { return isTouch ? 10 : 6; }
/** Hover check throttle interval */
const HOVER_THROTTLE_MS = 50;
/** Quick-connect button size — 44px on touch for minimum touch target */
function getQuickConnectSize(isTouch: boolean) { return isTouch ? 44 : 28; }

// ── i18n (delegated to graphI18n.ts) ────────────────────────

type DragLocale = GraphLocale;

// ── Types ───────────────────────────────────────────────────

interface DragState extends DragDrawState {
  /** Initial pointer position */
  startX: number;
  startY: number;
  /** Pointer ID for capture */
  capturedPointerId: number;
  /** Cached node positions at drag start */
  cachedPositions: NodeScreenPos[];
}

interface UseDragConnectOptions {
  graphRef: React.RefObject<Graph | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  ready: boolean;
  graphVersion: number;
  enabled: boolean;
  edges: MapEdge[];
  onDragConnect?: (sourceId: string, targetId: string) => void;
  /** Called when user clicks the quick-connect "+" on a node */
  onQuickAdd?: (sourceNodeId: string) => void;
  /** Locale for user-facing strings (default: 'pt') */
  locale?: DragLocale;
  /** Shared ref to coordinate with useEdgeReconnect — prevents simultaneous drags */
  isDraggingRef?: React.MutableRefObject<boolean>;
}

// ── Helpers ─────────────────────────────────────────────────

/** Build a Set of edge keys for O(1) existence checks */
function buildEdgeSet(edges: MapEdge[]): Set<string> {
  const set = new Set<string>();
  for (const e of edges) {
    set.add(`${e.source}-${e.target}`);
    set.add(`${e.target}-${e.source}`);
  }
  return set;
}

/** Check if an edge already exists between two nodes (O(1) via Set) */
function edgeExistsInSet(edgeSet: Set<string>, sourceId: string, targetId: string): boolean {
  return edgeSet.has(`${sourceId}-${targetId}`);
}

// ── Hook ────────────────────────────────────────────────────

export function useDragConnect({
  graphRef,
  containerRef,
  ready,
  graphVersion,
  enabled,
  edges,
  onDragConnect,
  onQuickAdd,
  locale = 'pt',
  isDraggingRef,
}: UseDragConnectOptions) {
  const gi = I18N_GRAPH[locale];
  const t = { connectTo: gi.dragConnectTo, sameNode: gi.dragSameNode, alreadyConnected: gi.dragAlreadyConnected, quickConnectTitle: gi.dragQuickConnectTitle };
  const dragStateRef = useRef<DragState | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const onDragConnectRef = useRef(onDragConnect);
  onDragConnectRef.current = onDragConnect;
  const onQuickAddRef = useRef(onQuickAdd);
  onQuickAddRef.current = onQuickAdd;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const successAnimRef = useRef<SuccessAnimState | null>(null);
  /** Currently hovered node ID (for showing ports and quick-connect button) */
  const hoveredNodeRef = useRef<string | null>(null);
  /** Cached node positions for hover detection — invalidated on viewport change */
  const hoverPositionsRef = useRef<NodeScreenPos[]>([]);
  /** Whether the cached hover positions are still valid */
  const hoverPositionsValidRef = useRef(false);
  /** Memoized edge Set for O(1) existence checks */
  const edgeSetRef = useRef<Set<string>>(new Set());
  /** Quick-connect button DOM element */
  const quickConnectBtnRef = useRef<HTMLDivElement | null>(null);
  /** Last detected pointer type — updated on every hover/drag event */
  const lastPointerTypeRef = useRef<string>('mouse');

  // Create/destroy overlay canvas and quick-connect button
  useEffect(() => {
    if (!enabled || !ready) return;
    const container = containerRef.current;
    if (!container) return;

    // Canvas overlay
    const overlay = document.createElement('canvas');
    overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    container.style.position = 'relative';
    container.appendChild(overlay);
    overlayCanvasRef.current = overlay;

    // Quick-connect "+" button — initial size uses mouse default; updated dynamically on hover
    const initSize = getQuickConnectSize(false);
    const btn = document.createElement('div');
    btn.style.cssText = `
      position:absolute;z-index:6;width:${initSize}px;height:${initSize}px;
      border-radius:50%;background:${GRAPH_COLORS.primary};color:white;display:none;align-items:center;
      justify-content:center;cursor:pointer;font-size:14px;font-weight:700;line-height:1;
      box-shadow:0 2px 8px rgba(${GRAPH_COLORS.primaryRgb},0.35);transition:transform 0.15s ease,opacity 0.15s ease;
      user-select:none;pointer-events:auto;font-family:Inter,sans-serif;
    `;
    btn.textContent = '+';
    btn.title = t.quickConnectTitle;
    container.appendChild(btn);
    quickConnectBtnRef.current = btn;

    // Size the overlay to match the container
    const resize = () => {
      const rect = container.getBoundingClientRect();
      overlay.width = Math.round(rect.width * (window.devicePixelRatio || 1));
      overlay.height = Math.round(rect.height * (window.devicePixelRatio || 1));
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (btn.parentNode) btn.parentNode.removeChild(btn);
      overlayCanvasRef.current = null;
      quickConnectBtnRef.current = null;
      dragStateRef.current = null;
      successAnimRef.current = null;
      hoveredNodeRef.current = null;
    };
  }, [enabled, ready, containerRef]);

  // Invalidate cached hover positions on viewport change (pan/zoom)
  useEffect(() => {
    if (!enabled || !ready) return;
    const graph = graphRef.current;
    if (!graph) return;
    const invalidate = () => { hoverPositionsValidRef.current = false; };
    graph.on('afterviewportchange', invalidate);
    return () => { try { graph.off('afterviewportchange', invalidate); } catch (e) { if (import.meta.env.DEV) console.warn("[useDragConnect] graph may be destroyed", e); } };
  }, [enabled, ready, graphRef, graphVersion]);

  // Keep edge Set in sync with edges prop
  useEffect(() => {
    edgeSetRef.current = buildEdgeSet(edges);
  }, [edges]);

  // ── Draw function ──────────────────────────────────────────

  const draw = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const needsNext = drawDragConnectFrame(
      ctx,
      overlay.width,
      overlay.height,
      {
        hoveredNodeId: hoveredNodeRef.current,
        hoverPositions: hoverPositionsRef.current,
        dragState: dragStateRef.current,
        successAnim: successAnimRef.current,
      },
      {
        containerRect,
        dpr,
        portRadius: getPortRadius(lastPointerTypeRef.current === 'touch'),
        connectToLabel: t.connectTo,
      },
    );

    // Clear success anim when complete
    if (successAnimRef.current) {
      const elapsed = performance.now() - successAnimRef.current.startTime;
      if (elapsed / SUCCESS_ANIM_DURATION >= 1) {
        successAnimRef.current = null;
      }
    }

    // Keep drawing during active drag, hover, or success animation
    if (needsNext || dragStateRef.current?.activated || hoveredNodeRef.current) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [containerRef]);

  // ── Main interaction logic ─────────────────────────────────

  useEffect(() => {
    if (!enabled || !ready) return;
    const graph = graphRef.current;
    const container = containerRef.current;
    if (!graph || !container) return;

    const btn = quickConnectBtnRef.current;

    // Handle quick-connect button click
    const handleQuickConnectClick = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const nodeId = hoveredNodeRef.current;
      if (nodeId && onQuickAddRef.current) {
        onQuickAddRef.current(nodeId);
      }
    };

    if (btn) {
      btn.addEventListener('mousedown', handleQuickConnectClick);
    }

    // Start drag from anywhere on a node (or from a port specifically)
    const handlePointerDown = (e: PointerEvent) => {
      if (dragStateRef.current) return;
      if (e.button !== 0) return;
      if (isDraggingRef?.current) return;

      const positions = getNodeScreenPositions(graph, true);
      const sx = e.clientX;
      const sy = e.clientY;

      // Check if pointer is near any node (within the node circle)
      // First pass: check if pointer is inside the center of ANY node — if so, skip drag-connect
      // This prevents capturing the pointer when nodes overlap and the user wants to drag normally
      for (const node of positions) {
        const dx = sx - node.x;
        const dy = sy - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= node.size / 2 * 0.6) return; // Inside node center → let G6 handle drag
      }

      for (const node of positions) {
        const dx = sx - node.x;
        const dy = sy - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nodeRadius = node.size / 2;

        // Check if clicking near the edge of the node (outer ring where ports are)
        // This prevents hijacking clicks on the node center (those should be normal clicks)
        if (dist > nodeRadius * 0.6 && dist <= nodeRadius + PORT_HIT_RADIUS) {
          dragStateRef.current = {
            sourceNodeId: node.id,
            sourceLabel: node.label || '',
            sourceX: node.x,
            sourceY: node.y,
            sourceSize: node.size,
            dragX: sx,
            dragY: sy,
            snapNodeId: null,
            snapX: 0,
            snapY: 0,
            snapLabel: '',
            snapInvalid: false,
            snapInvalidReason: '',
            startX: sx,
            startY: sy,
            activated: false,
            capturedPointerId: -1,
            cachedPositions: positions,
            startTime: performance.now(),
          };
          return;
        }
      }
    };

    let lastHoverCheck = 0;

    const handlePointerMove = (e: PointerEvent) => {
      // Track pointer type for reactive touch sizing
      lastPointerTypeRef.current = e.pointerType;

      const ds = dragStateRef.current;

      if (!ds) {
        // Hover logic: show ports and quick-connect button on hovered node
        const now = performance.now();
        if (now - lastHoverCheck < HOVER_THROTTLE_MS) return;
        lastHoverCheck = now;

        // Use cached positions; recalculate only when invalidated by viewport changes
        if (!hoverPositionsValidRef.current) {
          hoverPositionsRef.current = getNodeScreenPositions(graph, true);
          hoverPositionsValidRef.current = true;
        }
        const positions = hoverPositionsRef.current;
        const sx = e.clientX;
        const sy = e.clientY;

        let foundHover: string | null = null;
        let hoverNode: NodeScreenPos | null = null;
        for (const node of positions) {
          const dx = sx - node.x;
          const dy = sy - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < node.size / 2 + 10) {
            foundHover = node.id;
            hoverNode = node;
            break;
          }
        }

        if (foundHover !== hoveredNodeRef.current) {
          hoveredNodeRef.current = foundHover;
          // Show/hide quick-connect button — dynamically sized per pointer type
          if (btn && hoverNode) {
            const isTouch = e.pointerType === 'touch';
            const qcSize = getQuickConnectSize(isTouch);
            btn.style.width = `${qcSize}px`;
            btn.style.height = `${qcSize}px`;
            const containerRect = container.getBoundingClientRect();
            const bx = hoverNode.x - containerRect.left + hoverNode.size / 2 + 2;
            const by = hoverNode.y - containerRect.top - hoverNode.size / 2 - 2;
            btn.style.display = 'flex';
            btn.style.left = `${bx}px`;
            btn.style.top = `${by}px`;
          } else if (btn) {
            btn.style.display = 'none';
          }
          // Trigger redraw for port animation
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(draw);
        }
        return;
      }

      // Check drag threshold — use larger threshold on touch to avoid accidental drags
      if (!ds.activated) {
        const dx = e.clientX - ds.startX;
        const dy = e.clientY - ds.startY;
        const threshold = e.pointerType === 'touch' ? TOUCH_DRAG_THRESHOLD : DRAG_THRESHOLD;
        if (Math.sqrt(dx * dx + dy * dy) < threshold) return;

        ds.activated = true;
        ds.capturedPointerId = e.pointerId;
        if (isDraggingRef) isDraggingRef.current = true;
        container.setPointerCapture(e.pointerId);
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.style.pointerEvents = 'auto';
          overlayCanvasRef.current.style.cursor = 'grabbing';
        }
        // Hide quick-connect button during drag
        if (btn) btn.style.display = 'none';
        hoveredNodeRef.current = null;
      }

      // Update drag position
      ds.dragX = e.clientX;
      ds.dragY = e.clientY;

      // Find nearest target node
      const nearest = findNearestNode(
        ds.cachedPositions,
        e.clientX,
        e.clientY,
        NODE_SNAP_RADIUS,
        ds.sourceNodeId,
      );

      if (nearest) {
        ds.snapNodeId = nearest.id;
        ds.snapX = nearest.x;
        ds.snapY = nearest.y;
        ds.snapLabel = nearest.label || '';

        // Check validity
        if (nearest.id === ds.sourceNodeId) {
          ds.snapInvalid = true;
          ds.snapInvalidReason = t.sameNode;
        } else if (edgeExistsInSet(edgeSetRef.current, ds.sourceNodeId, nearest.id)) {
          ds.snapInvalid = true;
          ds.snapInvalidReason = t.alreadyConnected;
        } else {
          ds.snapInvalid = false;
          ds.snapInvalidReason = '';
        }
      } else {
        ds.snapNodeId = null;
        ds.snapInvalid = false;
        ds.snapInvalidReason = '';
      }

      // Drawing is continuous during drag (handled by draw loop)
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;

      if (!ds.activated) {
        dragStateRef.current = null;
        return;
      }

      try { container.releasePointerCapture(ds.capturedPointerId); } catch (e) { if (import.meta.env.DEV) console.warn("[useDragConnect] ", e); }
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.style.pointerEvents = 'none';
        overlayCanvasRef.current.style.cursor = '';
      }

      // Successful connection
      if (ds.snapNodeId && !ds.snapInvalid && ds.snapNodeId !== ds.sourceNodeId) {
        // Trigger success animation
        successAnimRef.current = {
          srcX: ds.sourceX,
          srcY: ds.sourceY,
          tgtX: ds.snapX,
          tgtY: ds.snapY,
          startTime: performance.now(),
        };

        // Fire callback
        onDragConnectRef.current?.(ds.sourceNodeId, ds.snapNodeId);

        // Optimistically update the edge set so rapid successive connections
        // between the same pair are detected as duplicates before refetch
        const key1 = `${ds.sourceNodeId}-${ds.snapNodeId}`;
        const key2 = `${ds.snapNodeId}-${ds.sourceNodeId}`;
        edgeSetRef.current.add(key1);
        edgeSetRef.current.add(key2);

        // Start success animation draw loop
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(draw);
      } else {
        // Clear overlay
        cancelAnimationFrame(rafRef.current);
        const overlay = overlayCanvasRef.current;
        if (overlay) {
          const ctx = overlay.getContext('2d');
          ctx?.clearRect(0, 0, overlay.width, overlay.height);
        }
      }

      dragStateRef.current = null;
      if (isDraggingRef) isDraggingRef.current = false;
    };

    const handlePointerCancel = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;

      if (ds.activated) {
        try { container.releasePointerCapture(ds.capturedPointerId); } catch (e) { if (import.meta.env.DEV) console.warn("[useDragConnect] ", e); }
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.style.pointerEvents = 'none';
          overlayCanvasRef.current.style.cursor = '';
        }
        cancelAnimationFrame(rafRef.current);
        const overlay = overlayCanvasRef.current;
        if (overlay) {
          const ctx = overlay.getContext('2d');
          ctx?.clearRect(0, 0, overlay.width, overlay.height);
        }
      }

      dragStateRef.current = null;
      if (isDraggingRef) isDraggingRef.current = false;
    };

    // Escape cancels drag
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragStateRef.current) {
        e.preventDefault();
        e.stopPropagation();
        handlePointerCancel(
          new PointerEvent('pointercancel', {
            pointerId: dragStateRef.current.capturedPointerId,
          }),
        );
      }
    };

    container.addEventListener('pointerdown', handlePointerDown, { capture: true });
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerCancel);
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerCancel);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (btn) {
        btn.removeEventListener('mousedown', handleQuickConnectClick);
      }
      cancelAnimationFrame(rafRef.current);
      const ds = dragStateRef.current;
      if (ds?.activated) {
        try { container.releasePointerCapture(ds.capturedPointerId); } catch (e) { if (import.meta.env.DEV) console.warn("[useDragConnect] ", e); }
      }
      dragStateRef.current = null;
      hoveredNodeRef.current = null;
      successAnimRef.current = null;
      if (isDraggingRef) isDraggingRef.current = false;
    };
  }, [enabled, ready, graphVersion, graphRef, containerRef, draw]);

  const isDragging = useCallback(() => dragStateRef.current?.activated ?? false, []);

  return { isDragging };
}
