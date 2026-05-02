// ============================================================
// Axon — StickyNotes · Position / drag hook
//
// Encapsulates the draggable position state of the sticky notes panel:
//   - loads the last saved position from localStorage on mount
//   - exposes pointer handlers to drag the panel from its header
//   - clamps to the viewport on drag, resize and layout changes
//
// `position` is null until the user drags; until then the wrapper uses the
// original top:7.5rem / right:1rem CSS anchor so first-time users see the
// panel exactly where it used to be.
//
// The localStorage key is scoped per `userId` so on shared devices the
// panel position from one user does NOT leak to another. When `userId`
// is unavailable (logged out, hook used outside an auth context) the
// hook degrades gracefully: it still tracks position in memory but does
// not read from or write to localStorage.
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

/**
 * Build the per-user localStorage key for the sticky-notes panel position.
 *
 * Scoping by userId prevents cross-user leakage on shared devices: the
 * old global key (`axon:sticky-notes:position`) is intentionally abandoned
 * — on first use after this change each user gets a fresh default position.
 */
export const positionStorageKey = (userId: string): string =>
  `axon:sticky-notes:position:${userId}`;

// Approximate widget size used for bounds-clamping before layout is measured
const ESTIMATED_WIDGET_WIDTH = 280;
const ESTIMATED_WIDGET_HEIGHT = 360;
const EDGE_MARGIN = 8;

export interface Position {
  x: number;
  y: number;
}

function loadSavedPosition(userId: string | null | undefined): Position | null {
  if (typeof window === 'undefined') return null;
  if (!userId) return null;
  try {
    const raw = window.localStorage.getItem(positionStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Position>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

function clampToViewport(pos: Position, width: number, height: number): Position {
  if (typeof window === 'undefined') return pos;
  const maxX = Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN);
  const maxY = Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN);
  return {
    x: Math.min(Math.max(EDGE_MARGIN, pos.x), maxX),
    y: Math.min(Math.max(EDGE_MARGIN, pos.y), maxY),
  };
}

export interface StickyNotesDragHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export interface StickyNotesPositionApi {
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  wrapperPositionStyle: React.CSSProperties;
  isDragging: boolean;
  /**
   * Pointer handlers for the drag handle. Designed to be spread directly
   * onto the JSX element that acts as the drag surface:
   *   <div {...dragHandlers} onPointerCancel={dragHandlers.onPointerUp} />
   */
  dragHandlers: StickyNotesDragHandlers;
}

/**
 * Draggable-position state + handlers for the sticky notes panel.
 *
 * The `expanded` flag is passed in so the hook can re-clamp the saved
 * position when the panel width changes (280 → 420 when expanded), which
 * would otherwise push the right edge off-screen.
 *
 * `userId` scopes the persisted position per user. Pass `null` (or
 * `undefined`) when no user is authenticated — the hook will still let
 * the user drag the panel for the current session but won't persist.
 */
export function useStickyNotesPosition(
  expanded: boolean,
  userId: string | null | undefined,
): StickyNotesPositionApi {
  const [position, setPosition] = useState<Position | null>(() =>
    loadSavedPosition(userId),
  );
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 });
  const didDragRef = useRef(false);

  // If the userId becomes available after mount (or changes — e.g. user
  // signs in / switches account on a shared device) re-hydrate from the
  // per-user key. We deliberately do NOT migrate the old global key:
  // resetting to default once is acceptable per the issue scope and
  // avoids leaking the previous user's position into the new user.
  useEffect(() => {
    setPosition(loadSavedPosition(userId));
    // Only re-hydrate when the userId identity changes.
  }, [userId]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore drags that start on interactive children (buttons, inputs, etc.)
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, [contenteditable="true"]')) return;
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    didDragRef.current = false;
    setIsDragging(true);
    // Seed position from current on-screen rect so the first move is smooth
    // even when we were still using the default top/right CSS.
    setPosition({ x: rect.left, y: rect.top });
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const container = containerRef.current;
      const width = container?.offsetWidth ?? ESTIMATED_WIDGET_WIDTH;
      const height = container?.offsetHeight ?? ESTIMATED_WIDGET_HEIGHT;
      const next = clampToViewport(
        {
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y,
        },
        width,
        height,
      );
      didDragRef.current = true;
      setPosition(next);
    },
    [isDragging],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore if pointer was not captured
      }
      if (didDragRef.current && position && userId) {
        try {
          window.localStorage.setItem(
            positionStorageKey(userId),
            JSON.stringify(position),
          );
        } catch {
          // localStorage unavailable — silently ignore
        }
      }
    },
    [isDragging, position, userId],
  );

  // Re-clamp on window resize and on expand toggle (panel width changes
  // 280 → 420 when expanded, so the right edge can fall off-screen).
  useEffect(() => {
    if (!position) return;
    const reclamp = () => {
      const container = containerRef.current;
      const width = container?.offsetWidth ?? ESTIMATED_WIDGET_WIDTH;
      const height = container?.offsetHeight ?? ESTIMATED_WIDGET_HEIGHT;
      setPosition((prev) => (prev ? clampToViewport(prev, width, height) : prev));
    };
    // Defer to next frame so offsetWidth reflects the new expanded layout
    const id = window.requestAnimationFrame(reclamp);
    window.addEventListener('resize', reclamp);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', reclamp);
    };
  }, [position, expanded]);

  // If the user has dragged the panel we use absolute x/y; otherwise we fall
  // back to the original top:7.5rem / right:1rem CSS anchor so first-time
  // users see the panel where it used to be.
  const wrapperPositionStyle: React.CSSProperties = position
    ? { left: `${position.x}px`, top: `${position.y}px`, zIndex: 1000 }
    : { top: '7.5rem', right: '1rem', zIndex: 1000 };

  return {
    containerRef,
    wrapperPositionStyle,
    isDragging,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
