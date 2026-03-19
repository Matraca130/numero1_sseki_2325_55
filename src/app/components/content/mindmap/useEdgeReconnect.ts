// ============================================================
// Axon — useEdgeReconnect hook
//
// Enables dragging an edge endpoint to reconnect it to a
// different node. Only works on user-created (custom) edges.
//
// How it works:
//   1. User hovers near the source or target endpoint of a
//      custom edge -- endpoint handle becomes visible
//   2. User mousedowns on the handle and drags
//   3. A temporary line follows the cursor from the fixed
//      endpoint to the current mouse position
//   4. When the cursor is near a valid target node, that node
//      highlights (snap effect)
//   5. On mouseup over a valid node, fire onReconnect callback
//   6. The callback deletes the old edge and creates a new one
//
// Visual feedback is rendered via a canvas overlay to avoid
// interfering with G6's internal canvas.
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import type { Graph } from '@antv/g6';
import type { MapEdge } from '@/app/types/mindmap';

/** Snap distance in pixels (screen coords) to detect proximity to an endpoint */
const ENDPOINT_HIT_RADIUS = 14;
/** Snap distance to detect proximity to a target node during drag */
const NODE_SNAP_RADIUS = 24;
/** Minimum drag distance before the reconnect drag actually activates (avoids hijacking clicks) */
const DRAG_THRESHOLD = 6;

export interface EdgeReconnectResult {
  /** The original edge that was reconnected */
  oldEdge: MapEdge;
  /** Which endpoint was moved: 'source' or 'target' */
  movedEndpoint: 'source' | 'target';
  /** The new node ID that the moved endpoint connects to */
  newNodeId: string;
}

interface UseEdgeReconnectOptions {
  graphRef: React.RefObject<Graph | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  ready: boolean;
  graphVersion: number;
  /** All edges in the current graph data (including raw _raw data) */
  edges: MapEdge[];
  /** Called when an edge is reconnected */
  onReconnect?: (result: EdgeReconnectResult) => void;
  /** Whether reconnect is enabled */
  enabled?: boolean;
}

interface NodeScreenPos {
  id: string;
  x: number;
  y: number;
  size: number;
}

/**
 * Get screen (client) position of all nodes using G6's coordinate system.
 * Uses getElementRenderBounds for canvas-space coords, then
 * graph.getClientByCanvas to convert to browser client coords.
 */
function getNodeScreenPositions(
  graph: Graph,
): NodeScreenPos[] {
  const positions: NodeScreenPos[] = [];
  try {
    const allNodeData = graph.getNodeData();
    for (const node of allNodeData) {
      const id = String(node.id);
      try {
        const bounds = graph.getElementRenderBounds(id);
        if (bounds) {
          const canvasCenterX = (bounds.min[0] + bounds.max[0]) / 2;
          const canvasCenterY = (bounds.min[1] + bounds.max[1]) / 2;
          const size = Math.max(bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1]);
          // Convert canvas coords to browser client coords
          const clientPt = graph.getClientByCanvas([canvasCenterX, canvasCenterY]);
          positions.push({
            id,
            x: clientPt[0],
            y: clientPt[1],
            size,
          });
        }
      } catch {
        // Node may not be rendered yet
      }
    }
  } catch {
    // Graph may be destroyed
  }
  return positions;
}

/**
 * Get the screen (client) position of a specific node.
 */
function getNodeScreenPos(
  graph: Graph,
  nodeId: string,
): { x: number; y: number } | null {
  try {
    const bounds = graph.getElementRenderBounds(nodeId);
    if (bounds) {
      const canvasCenterX = (bounds.min[0] + bounds.max[0]) / 2;
      const canvasCenterY = (bounds.min[1] + bounds.max[1]) / 2;
      const clientPt = graph.getClientByCanvas([canvasCenterX, canvasCenterY]);
      return { x: clientPt[0], y: clientPt[1] };
    }
  } catch {
    // Node may not exist or graph destroyed
  }
  return null;
}

/**
 * Find the nearest node to a screen position within a radius.
 */
function findNearestNode(
  positions: NodeScreenPos[],
  x: number,
  y: number,
  radius: number,
  excludeId?: string,
): NodeScreenPos | null {
  let best: NodeScreenPos | null = null;
  let bestDist = radius;
  for (const pos of positions) {
    if (pos.id === excludeId) continue;
    const dx = pos.x - x;
    const dy = pos.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = pos;
    }
  }
  return best;
}

// ── Drag state ──────────────────────────────────────────────

interface DragState {
  /** The edge being reconnected */
  edge: MapEdge;
  /** Which endpoint is being dragged */
  endpoint: 'source' | 'target';
  /** The fixed endpoint's screen position */
  fixedX: number;
  fixedY: number;
  /** Current drag position (screen coords) */
  dragX: number;
  dragY: number;
  /** Currently snapped target node ID (if any) */
  snapNodeId: string | null;
  /** Snapped node screen position */
  snapX: number;
  snapY: number;
  /** Initial pointer position (to check drag threshold) */
  startX: number;
  startY: number;
  /** Whether the drag has been activated (passed threshold) */
  activated: boolean;
  /** The real pointerId used for setPointerCapture (needed for release) */
  capturedPointerId: number;
  /** Cached node screen positions at drag start (avoids O(N) per pointermove) */
  cachedPositions: NodeScreenPos[] | null;
}

// ── Hook ────────────────────────────────────────────────────

export function useEdgeReconnect({
  graphRef,
  containerRef,
  ready,
  graphVersion,
  edges,
  onReconnect,
  enabled = false,
}: UseEdgeReconnectOptions) {
  const dragStateRef = useRef<DragState | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  // Create/destroy overlay canvas
  useEffect(() => {
    if (!enabled || !ready) return;
    const container = containerRef.current;
    if (!container) return;

    const overlay = document.createElement('canvas');
    overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;';
    container.style.position = 'relative';
    container.appendChild(overlay);
    overlayCanvasRef.current = overlay;

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
      overlayCanvasRef.current = null;
      dragStateRef.current = null;
    };
  }, [enabled, ready, containerRef]);

  // Draw function: renders the temporary reconnect line + snap highlight
  const draw = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    const ds = dragStateRef.current;
    if (!overlay) return;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    const dpr = (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (!ds) return;

    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    // Convert screen coords to overlay-local coords
    const toLocal = (sx: number, sy: number) => ({
      x: (sx - containerRect.left) * dpr,
      y: (sy - containerRect.top) * dpr,
    });

    const from = toLocal(ds.fixedX, ds.fixedY);
    const toPoint = ds.snapNodeId
      ? toLocal(ds.snapX, ds.snapY)
      : toLocal(ds.dragX, ds.dragY);

    // Draw the reconnect line
    ctx.save();
    ctx.strokeStyle = '#2a8c7a';
    ctx.lineWidth = 2.5 * dpr;
    ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(toPoint.x, toPoint.y);
    ctx.stroke();

    // Draw arrowhead at the drag end
    const angle = Math.atan2(toPoint.y - from.y, toPoint.x - from.x);
    const arrowLen = 10 * dpr;
    ctx.setLineDash([]);
    ctx.fillStyle = '#2a8c7a';
    ctx.beginPath();
    ctx.moveTo(toPoint.x, toPoint.y);
    ctx.lineTo(
      toPoint.x - arrowLen * Math.cos(angle - Math.PI / 6),
      toPoint.y - arrowLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      toPoint.x - arrowLen * Math.cos(angle + Math.PI / 6),
      toPoint.y - arrowLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();

    // Draw dragged endpoint handle
    const dragHandle = toLocal(ds.dragX, ds.dragY);
    ctx.fillStyle = 'rgba(42, 140, 122, 0.25)';
    ctx.beginPath();
    ctx.arc(dragHandle.x, dragHandle.y, 8 * dpr, 0, Math.PI * 2);
    ctx.fill();

    // Draw snap highlight ring around target node
    if (ds.snapNodeId) {
      const snapLocal = toLocal(ds.snapX, ds.snapY);
      ctx.strokeStyle = '#2a8c7a';
      ctx.lineWidth = 3 * dpr;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(snapLocal.x, snapLocal.y, 22 * dpr, 0, Math.PI * 2);
      ctx.stroke();

      // Glow effect
      ctx.strokeStyle = 'rgba(42, 140, 122, 0.3)';
      ctx.lineWidth = 6 * dpr;
      ctx.beginPath();
      ctx.arc(snapLocal.x, snapLocal.y, 26 * dpr, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw fixed endpoint indicator
    const fixedLocal = toLocal(ds.fixedX, ds.fixedY);
    ctx.fillStyle = '#244e47';
    ctx.beginPath();
    ctx.arc(fixedLocal.x, fixedLocal.y, 5 * dpr, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [containerRef]);

  // Main interaction logic via pointer events on the container
  useEffect(() => {
    if (!enabled || !ready) return;
    const graph = graphRef.current;
    const container = containerRef.current;
    if (!graph || !container) return;

    // Cache for user-created edge lookup
    const getUserEdges = (): MapEdge[] =>
      edgesRef.current.filter(e => e.isUserCreated);

    // We need to listen on the actual canvas element or the container
    // Using pointer events on container (capturing) so we get all events
    const handlePointerDown = (e: PointerEvent) => {
      if (dragStateRef.current) return; // already dragging
      if (e.button !== 0) return; // left click only

      const userEdges = getUserEdges();
      if (userEdges.length === 0) return;

      const screenX = e.clientX;
      const screenY = e.clientY;

      // Check if pointer is near any user-created edge endpoint
      for (const edge of userEdges) {
        const sourcePos = getNodeScreenPos(graph, edge.source);
        const targetPos = getNodeScreenPos(graph, edge.target);
        if (!sourcePos || !targetPos) continue;

        const dSource = Math.sqrt(
          (screenX - sourcePos.x) ** 2 + (screenY - sourcePos.y) ** 2,
        );
        const dTarget = Math.sqrt(
          (screenX - targetPos.x) ** 2 + (screenY - targetPos.y) ** 2,
        );

        // Check if near source endpoint -- start pending drag (not yet activated)
        if (dSource <= ENDPOINT_HIT_RADIUS) {
          dragStateRef.current = {
            edge,
            endpoint: 'source',
            fixedX: targetPos.x,
            fixedY: targetPos.y,
            dragX: screenX,
            dragY: screenY,
            snapNodeId: null,
            snapX: 0,
            snapY: 0,
            startX: screenX,
            startY: screenY,
            activated: false,
            capturedPointerId: -1,
            cachedPositions: null,
          };
          return;
        }

        // Check if near target endpoint
        if (dTarget <= ENDPOINT_HIT_RADIUS) {
          dragStateRef.current = {
            edge,
            endpoint: 'target',
            fixedX: sourcePos.x,
            fixedY: sourcePos.y,
            dragX: screenX,
            dragY: screenY,
            snapNodeId: null,
            snapX: 0,
            snapY: 0,
            startX: screenX,
            startY: screenY,
            activated: false,
            capturedPointerId: -1,
            cachedPositions: null,
          };
          return;
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds) {
        // Check for hover-near-endpoint to show cursor hint
        const userEdges = getUserEdges();
        if (userEdges.length === 0) return;

        let nearEndpoint = false;
        const sx = e.clientX;
        const sy = e.clientY;
        for (const edge of userEdges) {
          const sourcePos = getNodeScreenPos(graph, edge.source);
          const targetPos = getNodeScreenPos(graph, edge.target);
          if (!sourcePos || !targetPos) continue;

          const dS = Math.sqrt((sx - sourcePos.x) ** 2 + (sy - sourcePos.y) ** 2);
          const dT = Math.sqrt((sx - targetPos.x) ** 2 + (sy - targetPos.y) ** 2);
          if (dS <= ENDPOINT_HIT_RADIUS || dT <= ENDPOINT_HIT_RADIUS) {
            nearEndpoint = true;
            break;
          }
        }

        // Show grab cursor when near an endpoint
        const canvasEl = container.querySelector('canvas');
        if (canvasEl) {
          canvasEl.style.cursor = nearEndpoint ? 'grab' : '';
        }
        return;
      }

      // Check drag threshold before activating
      if (!ds.activated) {
        const dx = e.clientX - ds.startX;
        const dy = e.clientY - ds.startY;
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

        // Activate the drag: capture pointer and dim the original edge
        ds.activated = true;
        ds.capturedPointerId = e.pointerId;
        // Cache node positions once at drag start (avoids O(N) per pointermove)
        ds.cachedPositions = getNodeScreenPositions(graph);
        container.setPointerCapture(e.pointerId);
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.style.pointerEvents = 'auto';
          overlayCanvasRef.current.style.cursor = 'grabbing';
        }
        try {
          graph.updateEdgeData([{ id: ds.edge.id, style: { opacity: 0.15, lineDash: [4, 4] } }]);
          graph.draw();
        } catch { /* edge may not exist in G6 */ }
      }

      // Dragging: update position
      ds.dragX = e.clientX;
      ds.dragY = e.clientY;

      // Find nearest valid node for snapping (use cached positions)
      const nodePositions = ds.cachedPositions || getNodeScreenPositions(graph);
      const fixedNodeId = ds.endpoint === 'source' ? ds.edge.target : ds.edge.source;
      const nearest = findNearestNode(
        nodePositions,
        e.clientX,
        e.clientY,
        NODE_SNAP_RADIUS,
        fixedNodeId, // exclude the fixed endpoint's node
      );

      if (nearest) {
        ds.snapNodeId = nearest.id;
        ds.snapX = nearest.x;
        ds.snapY = nearest.y;
      } else {
        ds.snapNodeId = null;
      }

      // Throttle drawing to rAF for 60fps
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;

      // If drag was never activated (just a click), simply clear state and let normal click through
      if (!ds.activated) {
        dragStateRef.current = null;
        return;
      }

      try { container.releasePointerCapture(e.pointerId); } catch { /* may not be captured */ }
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.style.pointerEvents = 'none';
        overlayCanvasRef.current.style.cursor = '';
      }

      const canvasEl = container.querySelector('canvas');
      if (canvasEl) canvasEl.style.cursor = '';

      // Restore original edge visibility
      try {
        graph.updateEdgeData([{ id: ds.edge.id, style: { opacity: 1, lineDash: undefined } }]);
        graph.setElementState(ds.edge.id, []);
        graph.draw();
      } catch { /* edge may not exist */ }

      // If snapped to a valid node, fire reconnect
      if (ds.snapNodeId && ds.snapNodeId !== ds.edge.source && ds.snapNodeId !== ds.edge.target) {
        onReconnectRef.current?.({
          oldEdge: ds.edge,
          movedEndpoint: ds.endpoint,
          newNodeId: ds.snapNodeId,
        });
      }

      dragStateRef.current = null;

      // Clear overlay
      cancelAnimationFrame(rafRef.current);
      const overlay = overlayCanvasRef.current;
      if (overlay) {
        const ctx = overlay.getContext('2d');
        ctx?.clearRect(0, 0, overlay.width, overlay.height);
      }
    };

    const handlePointerCancel = (e: PointerEvent) => {
      // Treat cancel same as up but without firing reconnect
      const ds = dragStateRef.current;
      if (!ds) return;

      if (ds.activated) {
        try { container.releasePointerCapture(e.pointerId); } catch { /* may not be captured */ }
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.style.pointerEvents = 'none';
          overlayCanvasRef.current.style.cursor = '';
        }

        // Restore original edge
        try {
          graph.updateEdgeData([{ id: ds.edge.id, style: { opacity: 1, lineDash: undefined } }]);
          graph.setElementState(ds.edge.id, []);
          graph.draw();
        } catch { /* */ }

        cancelAnimationFrame(rafRef.current);
        const overlay = overlayCanvasRef.current;
        if (overlay) {
          const ctx = overlay.getContext('2d');
          ctx?.clearRect(0, 0, overlay.width, overlay.height);
        }
      }

      dragStateRef.current = null;
    };

    // Keydown: Escape cancels drag — use capture phase so it fires
    // before panel-level bubble handlers that may stopPropagation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragStateRef.current) {
        e.preventDefault();
        e.stopPropagation();
        handlePointerCancel(new PointerEvent('pointercancel', { pointerId: dragStateRef.current.capturedPointerId }));
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
      cancelAnimationFrame(rafRef.current);
      // Restore edge state + cursor if unmount/re-run happens during active drag
      const ds = dragStateRef.current;
      if (ds) {
        if (ds.capturedPointerId >= 0) {
          try { container.releasePointerCapture(ds.capturedPointerId); } catch { /* already released */ }
        }
        if (ds.activated && graph) {
          try {
            graph.updateEdgeData([{ id: ds.edge.id, style: { opacity: 1, lineDash: undefined } }]);
            graph.draw();
          } catch { /* graph may be destroyed */ }
        }
        dragStateRef.current = null;
      }
      const canvasEl = container.querySelector('canvas');
      if (canvasEl) canvasEl.style.cursor = '';
    };
  }, [enabled, ready, graphVersion, graphRef, containerRef, draw]);

  /** Whether a reconnect drag is currently in progress */
  const isDragging = useCallback(() => dragStateRef.current !== null, []);

  return { isDragging };
}
