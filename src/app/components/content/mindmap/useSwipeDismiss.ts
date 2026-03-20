// ============================================================
// Axon — useSwipeDismiss hook
//
// Detects downward swipe gesture for mobile bottom-sheet dismiss.
// Returns onTouchStart / onTouchMove / onTouchEnd handlers to
// attach to the sheet element.
//
// Only triggers dismiss when the sheet is scrolled to top (scrollTop ≈ 0)
// to avoid conflicts with scrollable content inside the sheet.
// ============================================================

import { useCallback, useRef } from 'react';

const SWIPE_THRESHOLD = 60; // px
const TIME_LIMIT = 400;     // ms

export function useSwipeDismiss(onDismiss: () => void) {
  const touchRef = useRef<{ startY: number; startX: number; startTime: number; scrolledAtStart: boolean } | null>(null);
  // Ref-stabilize onDismiss to avoid stale closure and unnecessary callback recreation
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Ignore multi-touch (e.g. pinch-to-zoom)
    if (e.touches.length > 1) { touchRef.current = null; return; }

    // Check if the scrollable container is at the top — only allow swipe dismiss from top
    const el = e.currentTarget as HTMLElement;
    const scrolledAtStart = el.scrollTop > 1; // 1px tolerance for sub-pixel rounding

    touchRef.current = {
      startY: e.touches[0].clientY,
      startX: e.touches[0].clientX,
      startTime: Date.now(),
      scrolledAtStart,
    };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel swipe tracking if a second finger is added (pinch-to-zoom)
    if (e.touches.length > 1) touchRef.current = null;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const { startY, startX, startTime, scrolledAtStart } = touchRef.current;
    touchRef.current = null;

    // Don't dismiss if the user was scrolled down — they're scrolling content, not swiping to dismiss
    if (scrolledAtStart) return;

    const dy = e.changedTouches[0].clientY - startY;
    const dx = Math.abs(e.changedTouches[0].clientX - startX);
    const dt = Date.now() - startTime;
    // Only dismiss on predominantly downward swipes (reject diagonal/horizontal gestures)
    if (dy > SWIPE_THRESHOLD && dt < TIME_LIMIT && dx < dy) onDismissRef.current();
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
