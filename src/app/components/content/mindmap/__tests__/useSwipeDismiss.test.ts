// ============================================================
// useSwipeDismiss — Unit Tests
//
// PURPOSE: Verify swipe-to-dismiss gesture detection for mobile
// bottom-sheet components.
//
// GUARDS AGAINST:
//   - Accidental dismiss on small/slow swipes
//   - Upward swipes triggering dismiss
//   - Multi-touch gestures (pinch-to-zoom) triggering dismiss
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeDismiss } from '../useSwipeDismiss';

// ── Synthetic event helpers ─────────────────────────────────

const touchStart = (clientY: number, touchCount = 1, scrollTop = 0) => ({
  touches: Array.from({ length: touchCount }, (_, i) =>
    i === 0 ? { clientY } : { clientY: 0 },
  ) as unknown as React.TouchList,
  currentTarget: { scrollTop } as unknown as EventTarget & HTMLElement,
} as React.TouchEvent);

const touchMove = (touchCount = 1) => ({
  touches: Array.from({ length: touchCount }, () =>
    ({ clientY: 0 }),
  ) as unknown as React.TouchList,
} as React.TouchEvent);

const touchEnd = (clientY: number) => ({
  changedTouches: [{ clientY }] as unknown as React.TouchList,
} as React.TouchEvent);

// ── Constants (must match source) ───────────────────────────

const SWIPE_THRESHOLD = 60; // px
const TIME_LIMIT = 400;     // ms

// ══════════════════════════════════════════════════════════════
// SUITE 1: Successful dismiss
// ══════════════════════════════════════════════════════════════

describe('useSwipeDismiss', () => {
  let onDismiss: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onDismiss = vi.fn();
    vi.useFakeTimers();
  });

  it('calls onDismiss on downward swipe exceeding threshold within time limit', () => {
    const { result } = renderHook(() => useSwipeDismiss(onDismiss));

    act(() => {
      result.current.onTouchStart(touchStart(100));
    });
    // Advance time but stay within the 400ms limit
    vi.advanceTimersByTime(200);
    act(() => {
      result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 1));
    });

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 2: Rejected gestures
  // ══════════════════════════════════════════════════════════════

  it('does NOT call onDismiss on upward swipe (negative dy)', () => {
    const { result } = renderHook(() => useSwipeDismiss(onDismiss));

    act(() => {
      result.current.onTouchStart(touchStart(200));
    });
    act(() => {
      result.current.onTouchEnd(touchEnd(100)); // dy = -100 (upward)
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does NOT call onDismiss on small downward swipe below threshold', () => {
    const { result } = renderHook(() => useSwipeDismiss(onDismiss));

    act(() => {
      result.current.onTouchStart(touchStart(100));
    });
    act(() => {
      result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD - 1)); // dy = 59
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does NOT call onDismiss on slow swipe exceeding time limit', () => {
    const { result } = renderHook(() => useSwipeDismiss(onDismiss));

    act(() => {
      result.current.onTouchStart(touchStart(100));
    });
    // Advance past the time limit
    vi.advanceTimersByTime(TIME_LIMIT + 50);
    act(() => {
      result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 20));
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 3: Multi-touch handling
  // ══════════════════════════════════════════════════════════════

  it('ignores multi-touch start (e.touches.length > 1)', () => {
    const { result } = renderHook(() => useSwipeDismiss(onDismiss));

    act(() => {
      result.current.onTouchStart(touchStart(100, 2)); // two fingers
    });
    act(() => {
      result.current.onTouchEnd(touchEnd(200));
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('cancels tracking when second finger is added mid-gesture (onTouchMove)', () => {
    const { result } = renderHook(() => useSwipeDismiss(onDismiss));

    act(() => {
      result.current.onTouchStart(touchStart(100));
    });
    act(() => {
      result.current.onTouchMove(touchMove(2)); // second finger added
    });
    act(() => {
      result.current.onTouchEnd(touchEnd(200));
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 4: Scroll-aware dismiss
  // ══════════════════════════════════════════════════════════════

  it('does NOT dismiss when sheet is scrolled down (scrollTop > 1)', () => {
    const { result } = renderHook(() => useSwipeDismiss(onDismiss));

    act(() => {
      result.current.onTouchStart(touchStart(100, 1, 50)); // scrolled down 50px
    });
    act(() => {
      result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 20));
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 5: Boundary
  // ══════════════════════════════════════════════════════════════

  it('does NOT call onDismiss at exactly the threshold (dy === 60, needs dy > 60)', () => {
    const { result } = renderHook(() => useSwipeDismiss(onDismiss));

    act(() => {
      result.current.onTouchStart(touchStart(100));
    });
    act(() => {
      result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD)); // dy = 60 exactly
    });

    // Source uses `dy > SWIPE_THRESHOLD` (strict), so exactly 60 should NOT trigger
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
