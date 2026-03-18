// ============================================================
// Axon — useSwipeDismiss hook
//
// Detects downward swipe gesture for mobile bottom-sheet dismiss.
// Returns onTouchStart / onTouchEnd handlers to attach to the sheet.
// ============================================================

import { useCallback, useRef } from 'react';

const SWIPE_THRESHOLD = 60; // px
const TIME_LIMIT = 400;     // ms

export function useSwipeDismiss(onDismiss: () => void) {
  const touchRef = useRef<{ startY: number; startTime: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Ignore multi-touch (e.g. pinch-to-zoom)
    if (e.touches.length > 1) { touchRef.current = null; return; }
    touchRef.current = { startY: e.touches[0].clientY, startTime: Date.now() };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel swipe tracking if a second finger is added (pinch-to-zoom)
    if (e.touches.length > 1) touchRef.current = null;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dy = e.changedTouches[0].clientY - touchRef.current.startY;
    const dt = Date.now() - touchRef.current.startTime;
    touchRef.current = null;
    if (dy > SWIPE_THRESHOLD && dt < TIME_LIMIT) onDismiss();
  }, [onDismiss]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
