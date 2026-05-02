// ============================================================
// Axon — useOverlayCanvas hook
//
// Creates a transparent <canvas> overlay layered above the
// container, wired with a DPR-correct ResizeObserver-based
// resizer. Used by useDragConnect (z-index 5) and
// useEdgeReconnect (z-index 6) for visual feedback that must
// not interfere with G6's internal canvas.
//
// Extracted in cycle #48 (was duplicated as ~25 LOC across
// useDragConnect.ts and useEdgeReconnect.ts).
//
// Behavior preserved verbatim:
//   - canvas is `position:absolute;top:0;left:0;width:100%;
//     height:100%;pointer-events:none` with caller-supplied
//     z-index, appended to the container (container becomes
//     `position:relative` if not already)
//   - canvas pixel buffer = round(rect × DPR), CSS size = rect
//   - DPR falls back to 1 when devicePixelRatio is 0/undefined
//   - ResizeObserver watches the container and fires resize
//   - Cleanup disconnects the observer and removes the canvas
//     iff still attached to a parent
//   - enabled === false → no-op (no canvas created)
//   - containerRef.current === null at mount → no-op
// ============================================================

import { useEffect, useRef, useCallback, type RefObject, type MutableRefObject } from 'react';

export interface UseOverlayCanvasOptions {
  containerRef: RefObject<HTMLElement | null>;
  zIndex: number;
  enabled: boolean;
}

export interface UseOverlayCanvasResult {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  ctxRef: MutableRefObject<CanvasRenderingContext2D | null>;
  /** Manually trigger a resize (no-op if canvas not mounted). */
  resize: () => void;
}

export function useOverlayCanvas({
  containerRef,
  zIndex,
  enabled,
}: UseOverlayCanvasOptions): UseOverlayCanvasResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const resize = useCallback(() => {
    const overlay = canvasRef.current;
    const container = containerRef.current;
    if (!overlay || !container) return;
    const rect = container.getBoundingClientRect();
    overlay.width = Math.round(rect.width * (window.devicePixelRatio || 1));
    overlay.height = Math.round(rect.height * (window.devicePixelRatio || 1));
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }, [containerRef]);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const overlay = document.createElement('canvas');
    overlay.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:${zIndex};`;
    container.style.position = 'relative';
    container.appendChild(overlay);
    canvasRef.current = overlay;
    ctxRef.current = overlay.getContext('2d');

    // Initial sizing
    const rect = container.getBoundingClientRect();
    overlay.width = Math.round(rect.width * (window.devicePixelRatio || 1));
    overlay.height = Math.round(rect.height * (window.devicePixelRatio || 1));
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    const ro = new ResizeObserver(() => {
      const r = container.getBoundingClientRect();
      overlay.width = Math.round(r.width * (window.devicePixelRatio || 1));
      overlay.height = Math.round(r.height * (window.devicePixelRatio || 1));
      overlay.style.width = `${r.width}px`;
      overlay.style.height = `${r.height}px`;
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      canvasRef.current = null;
      ctxRef.current = null;
    };
  }, [enabled, zIndex, containerRef]);

  return { canvasRef, ctxRef, resize };
}
