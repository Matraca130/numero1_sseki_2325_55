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
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import type { Graph } from '@antv/g6';
import type { MapEdge } from '@/app/types/mindmap';
import { getNodeScreenPositions, findNearestNode, GRAPH_COLORS } from './graphHelpers';
import type { NodeScreenPos } from './graphHelpers';
import { I18N_GRAPH } from './graphI18n';
import type { GraphLocale } from './graphI18n';

// ── Constants ───────────────────────────────────────────────

/** Distance from node center at which a port is considered "hit" */
const PORT_HIT_RADIUS = 18;
/** Distance from a node center to detect snap */
const NODE_SNAP_RADIUS = 40;
/** Minimum drag distance to activate (desktop) */
const DRAG_THRESHOLD = 6;
/** Minimum drag distance to activate (touch — larger to avoid accidental drags) */
const TOUCH_DRAG_THRESHOLD = 14;
/** Size of connection port circles — larger on touch for visibility */
function getPortRadius(isTouch: boolean) { return isTouch ? 8 : 4; }
/** How far ports are placed from node center (fraction of node radius) */
const PORT_OFFSET_FACTOR = 1.05;
/** Hover check throttle interval */
const HOVER_THROTTLE_MS = 50;
/** Duration (ms) of the success celebration animation */
const SUCCESS_ANIM_DURATION = 600;
/** Quick-connect button size — 44px on touch for minimum touch target */
function getQuickConnectSize(isTouch: boolean) { return isTouch ? 44 : 20; }

// ── i18n (delegated to graphI18n.ts) ────────────────────────

type DragLocale = GraphLocale;

// ── Types ───────────────────────────────────────────────────

interface DragState {
  sourceNodeId: string;
  sourceLabel: string;
  /** Source node screen position */
  sourceX: number;
  sourceY: number;
  sourceSize: number;
  /** Current drag position (screen coords) */
  dragX: number;
  dragY: number;
  /** Currently snapped target node */
  snapNodeId: string | null;
  snapX: number;
  snapY: number;
  snapLabel: string;
  /** Whether snapped target is invalid (self, duplicate) */
  snapInvalid: boolean;
  snapInvalidReason: string;
  /** Initial pointer position */
  startX: number;
  startY: number;
  /** Whether drag is activated (passed threshold) */
  activated: boolean;
  /** Pointer ID for capture */
  capturedPointerId: number;
  /** Cached node positions at drag start */
  cachedPositions: NodeScreenPos[];
  /** Animation start time (for pulse effects) */
  startTime: number;
}

/** Success animation state */
interface SuccessAnim {
  srcX: number;
  srcY: number;
  tgtX: number;
  tgtY: number;
  startTime: number;
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
  const successAnimRef = useRef<SuccessAnim | null>(null);
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

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    const toLocal = (sx: number, sy: number) => ({
      x: (sx - containerRect.left) * dpr,
      y: (sy - containerRect.top) * dpr,
    });

    const now = performance.now();

    // ── Draw connection ports on hovered node ──────────────
    const graph = graphRef.current;
    const ds = dragStateRef.current;
    const hoveredId = hoveredNodeRef.current;

    if (hoveredId && graph && !ds) {
      // Show ports on hovered node
      const positions = hoverPositionsRef.current;
      const node = positions.find(n => n.id === hoveredId);
      if (node) {
        const nodeLocal = toLocal(node.x, node.y);
        const r = (node.size / 2) * PORT_OFFSET_FACTOR * dpr;
        const portPositions = [
          { x: nodeLocal.x, y: nodeLocal.y - r }, // top
          { x: nodeLocal.x, y: nodeLocal.y + r }, // bottom
          { x: nodeLocal.x - r, y: nodeLocal.y }, // left
          { x: nodeLocal.x + r, y: nodeLocal.y }, // right
        ];

        // Fade-in pulse animation
        const pulse = 0.6 + 0.4 * Math.sin(now / 400);
        const portRadius = getPortRadius(lastPointerTypeRef.current === 'touch');

        for (const port of portPositions) {
          // Glow
          ctx.save();
          ctx.fillStyle = `rgba(${GRAPH_COLORS.primaryRgb}, ${0.15 * pulse})`;
          ctx.beginPath();
          ctx.arc(port.x, port.y, (portRadius + 4) * dpr, 0, Math.PI * 2);
          ctx.fill();

          // Port circle
          ctx.fillStyle = `rgba(${GRAPH_COLORS.primaryRgb}, ${0.7 * pulse})`;
          ctx.beginPath();
          ctx.arc(port.x, port.y, portRadius * dpr, 0, Math.PI * 2);
          ctx.fill();

          // Border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5 * dpr;
          ctx.beginPath();
          ctx.arc(port.x, port.y, portRadius * dpr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // ── Draw active drag state ───────────────────────────────
    if (ds && ds.activated) {
      const elapsed = now - ds.startTime;
      const from = toLocal(ds.sourceX, ds.sourceY);
      const toPoint = ds.snapNodeId
        ? toLocal(ds.snapX, ds.snapY)
        : toLocal(ds.dragX, ds.dragY);

      // Source node pulse effect
      const pulseFactor = 1 + 0.08 * Math.sin(elapsed / 300);
      const srcR = (ds.sourceSize / 2) * pulseFactor * dpr;
      ctx.save();
      ctx.strokeStyle = `rgba(${GRAPH_COLORS.primaryRgb}, 0.4)`;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(from.x, from.y, srcR + 4 * dpr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Source port indicator (solid dot)
      ctx.save();
      ctx.fillStyle = GRAPH_COLORS.primary;
      ctx.beginPath();
      ctx.arc(from.x, from.y, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Bezier curve from source to cursor/target
      const dx = toPoint.x - from.x;
      const dy = toPoint.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Control point offset for curve (perpendicular, proportional to distance)
      const curvature = Math.min(dist * 0.25, 60 * dpr);
      // Determine curve direction based on dominant axis
      const cp1x = from.x + dx * 0.3 + (Math.abs(dy) > Math.abs(dx) ? curvature : 0);
      const cp1y = from.y + dy * 0.3 + (Math.abs(dx) >= Math.abs(dy) ? -curvature : 0);
      const cp2x = from.x + dx * 0.7 + (Math.abs(dy) > Math.abs(dx) ? curvature : 0);
      const cp2y = from.y + dy * 0.7 + (Math.abs(dx) >= Math.abs(dy) ? -curvature : 0);

      // Draw animated dashed bezier curve
      const dashOffset = -(elapsed / 20) % 20;
      ctx.save();
      ctx.strokeStyle = ds.snapInvalid ? '#ef4444' : GRAPH_COLORS.primary;
      ctx.lineWidth = 2.5 * dpr;
      ctx.setLineDash([8 * dpr, 5 * dpr]);
      ctx.lineDashOffset = dashOffset * dpr;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, toPoint.x, toPoint.y);
      ctx.stroke();
      ctx.restore();

      // Arrowhead at the end
      // Compute tangent direction at the end of the bezier
      const t2 = 0.98;
      const t1 = 1.0;
      const bx1 = (1-t2)*(1-t2)*(1-t2)*from.x + 3*(1-t2)*(1-t2)*t2*cp1x + 3*(1-t2)*t2*t2*cp2x + t2*t2*t2*toPoint.x;
      const by1 = (1-t2)*(1-t2)*(1-t2)*from.y + 3*(1-t2)*(1-t2)*t2*cp1y + 3*(1-t2)*t2*t2*cp2y + t2*t2*t2*toPoint.y;
      const bx2 = (1-t1)*(1-t1)*(1-t1)*from.x + 3*(1-t1)*(1-t1)*t1*cp1x + 3*(1-t1)*t1*t1*cp2x + t1*t1*t1*toPoint.x;
      const by2 = (1-t1)*(1-t1)*(1-t1)*from.y + 3*(1-t1)*(1-t1)*t1*cp1y + 3*(1-t1)*t1*t1*cp2y + t1*t1*t1*toPoint.y;
      const angle = Math.atan2(by2 - by1, bx2 - bx1);
      const arrowLen = 12 * dpr;
      ctx.save();
      ctx.setLineDash([]);
      ctx.fillStyle = ds.snapInvalid ? '#ef4444' : GRAPH_COLORS.primary;
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
      ctx.restore();

      // "Conectar a..." label near cursor
      const labelX = toLocal(ds.dragX, ds.dragY);
      ctx.save();
      ctx.font = `${11 * dpr}px Inter, sans-serif`;
      const labelText = ds.snapNodeId
        ? (ds.snapInvalid ? ds.snapInvalidReason : ds.snapLabel)
        : t.connectTo;
      const metrics = ctx.measureText(labelText);
      const padX = 6 * dpr;
      const padY = 3 * dpr;
      const lx = labelX.x + 16 * dpr;
      const ly = labelX.y - 16 * dpr;

      // Background pill
      ctx.fillStyle = ds.snapInvalid ? 'rgba(239, 68, 68, 0.9)' : `rgba(${GRAPH_COLORS.primaryRgb}, 0.9)`;
      const pillW = metrics.width + padX * 2;
      const pillH = 11 * dpr + padY * 2;
      const pillR = 4 * dpr;
      ctx.beginPath();
      ctx.moveTo(lx + pillR, ly - pillH / 2);
      ctx.lineTo(lx + pillW - pillR, ly - pillH / 2);
      ctx.arcTo(lx + pillW, ly - pillH / 2, lx + pillW, ly - pillH / 2 + pillR, pillR);
      ctx.lineTo(lx + pillW, ly + pillH / 2 - pillR);
      ctx.arcTo(lx + pillW, ly + pillH / 2, lx + pillW - pillR, ly + pillH / 2, pillR);
      ctx.lineTo(lx + pillR, ly + pillH / 2);
      ctx.arcTo(lx, ly + pillH / 2, lx, ly + pillH / 2 - pillR, pillR);
      ctx.lineTo(lx, ly - pillH / 2 + pillR);
      ctx.arcTo(lx, ly - pillH / 2, lx + pillR, ly - pillH / 2, pillR);
      ctx.fill();

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, lx + padX, ly);
      ctx.restore();

      // ── Target snap feedback ────────────────────────────────
      if (ds.snapNodeId) {
        const snapLocal = toLocal(ds.snapX, ds.snapY);

        if (ds.snapInvalid) {
          // Red X for invalid targets
          const xSize = 8 * dpr;
          ctx.save();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3 * dpr;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(snapLocal.x - xSize, snapLocal.y - xSize);
          ctx.lineTo(snapLocal.x + xSize, snapLocal.y + xSize);
          ctx.moveTo(snapLocal.x + xSize, snapLocal.y - xSize);
          ctx.lineTo(snapLocal.x - xSize, snapLocal.y + xSize);
          ctx.stroke();

          // Red ring
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 3 * dpr;
          ctx.beginPath();
          ctx.arc(snapLocal.x, snapLocal.y, 26 * dpr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else {
          // Green snap ring with scale-up effect
          const snapPulse = 1 + 0.06 * Math.sin(elapsed / 250);
          const snapR = 24 * dpr * snapPulse;

          // Outer glow
          ctx.save();
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.25)';
          ctx.lineWidth = 8 * dpr;
          ctx.beginPath();
          ctx.arc(snapLocal.x, snapLocal.y, snapR + 4 * dpr, 0, Math.PI * 2);
          ctx.stroke();

          // Inner ring
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3 * dpr;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(snapLocal.x, snapLocal.y, snapR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // ── Success celebration animation ─────────────────────────
    const sa = successAnimRef.current;
    if (sa) {
      const elapsed = now - sa.startTime;
      const progress = Math.min(elapsed / SUCCESS_ANIM_DURATION, 1);

      if (progress < 1) {
        const from = toLocal(sa.srcX, sa.srcY);
        const to = toLocal(sa.tgtX, sa.tgtY);
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;

        // Edge grow animation (trace the path)
        const edgeProgress = Math.min(progress * 2, 1);
        const easeOut = 1 - (1 - edgeProgress) * (1 - edgeProgress);
        const currentX = from.x + (to.x - from.x) * easeOut;
        const currentY = from.y + (to.y - from.y) * easeOut;

        ctx.save();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3 * dpr;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        ctx.restore();

        // Green pulse on both nodes
        if (progress < 0.7) {
          const pulseAlpha = 0.5 * (1 - progress / 0.7);
          const pulseR = 20 * dpr * (1 + progress * 0.5);

          ctx.save();
          ctx.fillStyle = `rgba(34, 197, 94, ${pulseAlpha})`;
          ctx.beginPath();
          ctx.arc(from.x, from.y, pulseR, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(to.x, to.y, pulseR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Checkmark at midpoint (appears after edge finishes growing)
        if (progress > 0.4) {
          const checkProgress = Math.min((progress - 0.4) / 0.3, 1);
          const checkAlpha = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : checkProgress;
          const checkScale = 0.5 + checkProgress * 0.5;
          const checkSize = 10 * dpr * checkScale;

          // Background circle
          ctx.save();
          ctx.fillStyle = `rgba(34, 197, 94, ${checkAlpha * 0.9})`;
          ctx.beginPath();
          ctx.arc(midX, midY, checkSize + 4 * dpr, 0, Math.PI * 2);
          ctx.fill();

          // Checkmark
          ctx.strokeStyle = `rgba(255, 255, 255, ${checkAlpha})`;
          ctx.lineWidth = 2.5 * dpr;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(midX - checkSize * 0.4, midY);
          ctx.lineTo(midX - checkSize * 0.05, midY + checkSize * 0.35);
          ctx.lineTo(midX + checkSize * 0.45, midY - checkSize * 0.3);
          ctx.stroke();
          ctx.restore();
        }

        // Particle burst effect at midpoint
        if (progress > 0.3 && progress < 0.9) {
          const particleProgress = (progress - 0.3) / 0.6;
          const numParticles = 6;
          const particleAlpha = 1 - particleProgress;

          ctx.save();
          for (let i = 0; i < numParticles; i++) {
            const pAngle = (i / numParticles) * Math.PI * 2 + progress * 2;
            const pDist = 15 * dpr * particleProgress + 5 * dpr;
            const pSize = (3 - 2 * particleProgress) * dpr;
            const px = midX + Math.cos(pAngle) * pDist;
            const py = midY + Math.sin(pAngle) * pDist;

            ctx.fillStyle = `rgba(34, 197, 94, ${particleAlpha * 0.7})`;
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Continue animation
        rafRef.current = requestAnimationFrame(draw);
      } else {
        // Animation complete — clear
        successAnimRef.current = null;
      }
    }

    // Keep drawing during active drag for pulse animations
    if (ds?.activated || hoveredId) {
      rafRef.current = requestAnimationFrame(draw);
    }
  }, [containerRef, graphRef]);

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
