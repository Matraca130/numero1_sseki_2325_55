// ============================================================
// Axon — drawDragConnectOverlay
//
// Pure canvas drawing logic extracted from useDragConnect.
// Renders connection ports, bezier curves, arrowheads, labels,
// snap rings, and success celebration animations.
// ============================================================

import { GRAPH_COLORS } from './graphHelpers';
import type { NodeScreenPos } from './graphHelpers';

// ── Constants (drawing-only) ────────────────────────────────

/** How far ports are placed from node center (fraction of node radius) */
const PORT_OFFSET_FACTOR = 1.05;

/** Duration (ms) of the success celebration animation */
export const SUCCESS_ANIM_DURATION = 600;

// ── Types ───────────────────────────────────────────────────

export interface DragDrawState {
  sourceNodeId: string;
  sourceLabel: string;
  sourceX: number;
  sourceY: number;
  sourceSize: number;
  dragX: number;
  dragY: number;
  snapNodeId: string | null;
  snapX: number;
  snapY: number;
  snapLabel: string;
  snapInvalid: boolean;
  snapInvalidReason: string;
  startTime: number;
  activated: boolean;
}

export interface SuccessAnimState {
  srcX: number;
  srcY: number;
  tgtX: number;
  tgtY: number;
  startTime: number;
}

export interface DrawFrameOptions {
  containerRect: DOMRect;
  dpr: number;
  portRadius: number;
  connectToLabel: string;
}

export interface DrawFrameRefs {
  hoveredNodeId: string | null;
  hoverPositions: NodeScreenPos[];
  dragState: DragDrawState | null;
  successAnim: SuccessAnimState | null;
}

// ── Coordinate helper ───────────────────────────────────────

function toLocal(sx: number, sy: number, containerRect: DOMRect, dpr: number) {
  return {
    x: (sx - containerRect.left) * dpr,
    y: (sy - containerRect.top) * dpr,
  };
}

// ── Main draw function ──────────────────────────────────────

/**
 * Draws a single frame of the drag-connect overlay.
 *
 * @returns `true` if animation should continue (requestAnimationFrame needed),
 *          `false` if drawing is done and no further frames are needed.
 */
export function drawDragConnectFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  refs: DrawFrameRefs,
  options: DrawFrameOptions,
): boolean {
  const { containerRect, dpr, portRadius, connectToLabel } = options;
  const { hoveredNodeId, hoverPositions, dragState: ds, successAnim: sa } = refs;

  ctx.clearRect(0, 0, width, height);

  const now = performance.now();
  let needsNextFrame = false;

  // ── Draw connection ports on hovered node ──────────────
  if (hoveredNodeId && !ds) {
    const node = hoverPositions.find(n => n.id === hoveredNodeId);
    if (node) {
      const nodeLocal = toLocal(node.x, node.y, containerRect, dpr);
      const r = (node.size / 2) * PORT_OFFSET_FACTOR * dpr;
      const portPositions = [
        { x: nodeLocal.x, y: nodeLocal.y - r }, // top
        { x: nodeLocal.x, y: nodeLocal.y + r }, // bottom
        { x: nodeLocal.x - r, y: nodeLocal.y }, // left
        { x: nodeLocal.x + r, y: nodeLocal.y }, // right
      ];

      // Fade-in pulse animation
      const pulse = 0.6 + 0.4 * Math.sin(now / 400);

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
      needsNextFrame = true;
    }
  }

  // ── Draw active drag state ───────────────────────────────
  if (ds && ds.activated) {
    const elapsed = now - ds.startTime;
    const from = toLocal(ds.sourceX, ds.sourceY, containerRect, dpr);
    const toPoint = ds.snapNodeId
      ? toLocal(ds.snapX, ds.snapY, containerRect, dpr)
      : toLocal(ds.dragX, ds.dragY, containerRect, dpr);

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
    const curvature = Math.min(dist * 0.25, 60 * dpr);
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
    const labelX = toLocal(ds.dragX, ds.dragY, containerRect, dpr);
    ctx.save();
    ctx.font = `${11 * dpr}px Inter, sans-serif`;
    const labelText = ds.snapNodeId
      ? (ds.snapInvalid ? ds.snapInvalidReason : ds.snapLabel)
      : connectToLabel;
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
      const snapLocal = toLocal(ds.snapX, ds.snapY, containerRect, dpr);

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

    needsNextFrame = true;
  }

  // ── Success celebration animation ─────────────────────────
  if (sa) {
    const elapsed = now - sa.startTime;
    const progress = Math.min(elapsed / SUCCESS_ANIM_DURATION, 1);

    if (progress < 1) {
      const from = toLocal(sa.srcX, sa.srcY, containerRect, dpr);
      const to = toLocal(sa.tgtX, sa.tgtY, containerRect, dpr);
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

      needsNextFrame = true;
    }
    // When progress >= 1, caller should clear the success anim
  }

  return needsNextFrame;
}
