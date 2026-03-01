/**
 * useSmartPosition — Intelligent popover positioning hook
 *
 * Ported from /src/imports/use-smart-position-1.ts
 * Self-contained, zero external dependencies (React only).
 *
 * ALGORITHM (2-axis smart positioning):
 *   VERTICAL: prefer ABOVE, flip to BELOW if tight
 *   HORIZONTAL: extend LEFT/RIGHT/CENTER based on keyword position
 *   ARROW: always points at the anchor center
 */

import { useRef, useState, useEffect, useCallback, type RefObject } from "react";

export type Placement = "above" | "below";
export type HorizontalAlign = "left" | "right" | "center";

export interface SmartPositionConfig {
  anchorRect: DOMRect | null;
  gap?: number;
  viewportPadding?: number;
  topOffset?: number;
  centerThreshold?: number;
}

export interface SmartPositionResult {
  popoverRef: RefObject<HTMLDivElement | null>;
  position: { top: number; left: number };
  placement: Placement;
  horizontalAlign: HorizontalAlign;
  arrowOffset: number;
  isReady: boolean;
}

type PositionState = Omit<SmartPositionResult, "popoverRef">;

const INITIAL_STATE: PositionState = {
  position: { top: 0, left: 0 },
  placement: "above",
  horizontalAlign: "center",
  arrowOffset: 0,
  isReady: false,
};

export function calculateSmartPosition(
  anchorRect: DOMRect,
  popoverWidth: number,
  popoverHeight: number,
  config: {
    gap: number;
    viewportPadding: number;
    topOffset: number;
    viewportWidth: number;
    viewportHeight: number;
    centerThreshold: number;
  }
): {
  top: number;
  left: number;
  placement: Placement;
  horizontalAlign: HorizontalAlign;
  arrowOffset: number;
} {
  const { gap, viewportPadding, topOffset, viewportWidth, viewportHeight, centerThreshold } = config;

  const spaceAbove = anchorRect.top - topOffset;
  const spaceBelow = viewportHeight - anchorRect.bottom;

  let placement: Placement;
  let top: number;

  if (spaceAbove >= popoverHeight + gap) {
    placement = "above";
    top = anchorRect.top - popoverHeight - gap;
  } else if (spaceBelow >= popoverHeight + gap) {
    placement = "below";
    top = anchorRect.bottom + gap;
  } else {
    if (spaceAbove >= spaceBelow) {
      placement = "above";
      top = anchorRect.top - popoverHeight - gap;
    } else {
      placement = "below";
      top = anchorRect.bottom + gap;
    }
  }

  if (placement === "above") {
    top = Math.max(topOffset + viewportPadding, top);
  } else {
    top = Math.min(viewportHeight - popoverHeight - viewportPadding, top);
  }

  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  const viewportCenterX = viewportWidth / 2;
  const normalizedOffset = (anchorCenterX - viewportCenterX) / viewportCenterX;

  let horizontalAlign: HorizontalAlign;
  let left: number;
  const horizontalGap = 8;

  if (Math.abs(normalizedOffset) <= centerThreshold) {
    horizontalAlign = "center";
    left = anchorCenterX - popoverWidth / 2;
  } else if (normalizedOffset > 0) {
    horizontalAlign = "left";
    left = anchorRect.left - popoverWidth - horizontalGap;
    if (left < viewportPadding) {
      left = viewportPadding;
    }
  } else {
    horizontalAlign = "right";
    left = anchorRect.right + horizontalGap;
    if (left + popoverWidth > viewportWidth - viewportPadding) {
      left = viewportWidth - popoverWidth - viewportPadding;
    }
  }

  const minLeft = viewportPadding;
  const maxLeft = viewportWidth - popoverWidth - viewportPadding;
  left = Math.max(minLeft, Math.min(maxLeft, left));

  let arrowOffset = anchorCenterX - left;
  const arrowPadding = 20;
  arrowOffset = Math.max(arrowPadding, Math.min(popoverWidth - arrowPadding, arrowOffset));

  return { top, left, placement, horizontalAlign, arrowOffset };
}

export function useSmartPosition({
  anchorRect,
  gap = 12,
  viewportPadding = 16,
  topOffset = 56,
  centerThreshold = 0.15,
}: SmartPositionConfig): SmartPositionResult {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<PositionState>(INITIAL_STATE);

  const recalculate = useCallback(() => {
    if (!popoverRef.current || !anchorRect) return;

    const popoverEl = popoverRef.current;
    const popoverWidth = popoverEl.offsetWidth;
    const popoverHeight = popoverEl.offsetHeight;

    const result = calculateSmartPosition(anchorRect, popoverWidth, popoverHeight, {
      gap,
      viewportPadding,
      topOffset,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      centerThreshold,
    });

    setState({
      position: { top: result.top, left: result.left },
      placement: result.placement,
      horizontalAlign: result.horizontalAlign,
      arrowOffset: result.arrowOffset,
      isReady: true,
    });
  }, [anchorRect, gap, viewportPadding, topOffset, centerThreshold]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      recalculate();
    });
    return () => cancelAnimationFrame(raf);
  }, [recalculate]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(recalculate, 100);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeout);
    };
  }, [recalculate]);

  return {
    popoverRef,
    ...state,
  };
}