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
//   - Diagonal/horizontal swipes triggering dismiss
//   - Stale-closure regressions on the onDismiss callback
//   - Boundary off-by-one regressions on threshold/time/scroll/dx
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSwipeDismiss } from '../useSwipeDismiss';

// ── Synthetic event helpers ─────────────────────────────────

const touchStart = (clientY: number, touchCount = 1, scrollTop = 0, clientX = 0) => ({
  touches: Array.from({ length: touchCount }, (_, i) =>
    i === 0 ? { clientY, clientX } : { clientY: 0, clientX: 0 },
  ) as unknown as React.TouchList,
  currentTarget: { scrollTop } as unknown as EventTarget & HTMLElement,
} as unknown as React.TouchEvent);

const touchMove = (touchCount = 1) => ({
  touches: Array.from({ length: touchCount }, () =>
    ({ clientY: 0, clientX: 0 }),
  ) as unknown as React.TouchList,
} as unknown as React.TouchEvent);

const touchEnd = (clientY: number, clientX = 0) => ({
  changedTouches: [{ clientY, clientX }] as unknown as React.TouchList,
} as unknown as React.TouchEvent);

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

  it('does NOT dismiss on diagonal swipe where dx >= dy', () => {
    const { result } = renderHook(() => useSwipeDismiss(onDismiss));

    // Start at (0, 100), end at (200, 170) — mostly horizontal
    act(() => {
      result.current.onTouchStart(touchStart(100, 1, 0, 0));
    });
    vi.advanceTimersByTime(200);
    act(() => {
      result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 1, 200));
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 6: Hook contract — return shape & function identity
  // ══════════════════════════════════════════════════════════════

  describe('hook contract', () => {
    it('exports useSwipeDismiss as a named export', () => {
      expect(typeof useSwipeDismiss).toBe('function');
    });

    it('returns an object with exactly onTouchStart, onTouchMove, onTouchEnd', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));
      const keys = Object.keys(result.current).sort();
      expect(keys).toEqual(['onTouchEnd', 'onTouchMove', 'onTouchStart']);
    });

    it('each returned property is a function', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));
      expect(typeof result.current.onTouchStart).toBe('function');
      expect(typeof result.current.onTouchMove).toBe('function');
      expect(typeof result.current.onTouchEnd).toBe('function');
    });

    it('does NOT call onDismiss synchronously during mount', () => {
      renderHook(() => useSwipeDismiss(onDismiss));
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('handler references are stable across re-renders (empty useCallback deps)', () => {
      const { result, rerender } = renderHook(({ cb }) => useSwipeDismiss(cb), {
        initialProps: { cb: onDismiss },
      });
      const start1 = result.current.onTouchStart;
      const move1 = result.current.onTouchMove;
      const end1 = result.current.onTouchEnd;

      rerender({ cb: vi.fn() });

      expect(result.current.onTouchStart).toBe(start1);
      expect(result.current.onTouchMove).toBe(move1);
      expect(result.current.onTouchEnd).toBe(end1);
    });

    it('uses the latest onDismiss callback even when supplied after onTouchStart (ref-stabilization)', () => {
      const original = vi.fn();
      const replacement = vi.fn();

      const { result, rerender } = renderHook(({ cb }) => useSwipeDismiss(cb), {
        initialProps: { cb: original },
      });

      // Begin gesture with the ORIGINAL callback registered
      act(() => {
        result.current.onTouchStart(touchStart(100));
      });

      // Re-render with a NEW callback before completing the gesture
      rerender({ cb: replacement });

      vi.advanceTimersByTime(100);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 5));
      });

      expect(original).not.toHaveBeenCalled();
      expect(replacement).toHaveBeenCalledOnce();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 7: State-machine — null/empty paths
  // ══════════════════════════════════════════════════════════════

  describe('state machine', () => {
    it('onTouchEnd without a prior onTouchStart is a noop', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchEnd(touchEnd(500));
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('onTouchMove without a prior onTouchStart is a noop (no throw)', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      expect(() => {
        act(() => {
          result.current.onTouchMove(touchMove(1));
        });
      }).not.toThrow();
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('after a successful dismiss the touch ref is cleared (second onTouchEnd is a noop)', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100));
      });
      vi.advanceTimersByTime(100);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 5));
      });
      expect(onDismiss).toHaveBeenCalledOnce();

      // Second onTouchEnd with no fresh start
      act(() => {
        result.current.onTouchEnd(touchEnd(500));
      });
      expect(onDismiss).toHaveBeenCalledOnce(); // still 1
    });

    it('after a rejected swipe the touch ref is cleared (a second onTouchEnd is a noop)', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100));
      });
      // Reject by exceeding time limit
      vi.advanceTimersByTime(TIME_LIMIT + 100);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 5));
      });
      expect(onDismiss).not.toHaveBeenCalled();

      // Second onTouchEnd with no fresh start — must not somehow trigger
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 5));
      });
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('multi-touch start clears the touch ref so a later onTouchEnd is a noop', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      // First a clean start that will be replaced
      act(() => {
        result.current.onTouchStart(touchStart(100, 2)); // multi-touch
      });
      // No prior single-finger start exists; ref stays null
      act(() => {
        result.current.onTouchEnd(touchEnd(500));
      });
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('a rejected swipe followed by a valid swipe still dismisses', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      // Rejected (too small)
      act(() => {
        result.current.onTouchStart(touchStart(100));
      });
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD - 5));
      });
      expect(onDismiss).not.toHaveBeenCalled();

      // Now a clean valid one
      act(() => {
        result.current.onTouchStart(touchStart(200));
      });
      vi.advanceTimersByTime(100);
      act(() => {
        result.current.onTouchEnd(touchEnd(200 + SWIPE_THRESHOLD + 5));
      });
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('multiple successful gestures dismiss multiple times (no internal latch)', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.onTouchStart(touchStart(100));
        });
        vi.advanceTimersByTime(100);
        act(() => {
          result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 5));
        });
      }

      expect(onDismiss).toHaveBeenCalledTimes(3);
    });

    it('a multi-touch start followed later by a valid single-finger gesture still dismisses', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      // Multi-touch start (rejected)
      act(() => {
        result.current.onTouchStart(touchStart(100, 2));
      });
      // Stray onTouchEnd for the multi-touch — noop
      act(() => {
        result.current.onTouchEnd(touchEnd(500));
      });
      expect(onDismiss).not.toHaveBeenCalled();

      // Now a fresh valid single-finger gesture
      act(() => {
        result.current.onTouchStart(touchStart(100));
      });
      vi.advanceTimersByTime(100);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 5));
      });
      expect(onDismiss).toHaveBeenCalledOnce();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 8: Boundary — positive sides
  // ══════════════════════════════════════════════════════════════

  describe('positive boundaries', () => {
    it('dy === SWIPE_THRESHOLD + 1 DOES dismiss (just past strict threshold)', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100));
      });
      vi.advanceTimersByTime(50);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 1));
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('dt === TIME_LIMIT - 1 (399ms) still dismisses', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100));
      });
      vi.advanceTimersByTime(TIME_LIMIT - 1);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 5));
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('dt === TIME_LIMIT exactly does NOT dismiss (strict <)', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100));
      });
      vi.advanceTimersByTime(TIME_LIMIT);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 5));
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('scrollTop === 0 allows dismiss', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100, 1, 0));
      });
      vi.advanceTimersByTime(50);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 5));
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('scrollTop === 1 still allows dismiss (1px sub-pixel tolerance)', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100, 1, 1));
      });
      vi.advanceTimersByTime(50);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 5));
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('scrollTop === 2 blocks dismiss (just past tolerance)', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100, 1, 2));
      });
      vi.advanceTimersByTime(50);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 20));
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('dx === dy does NOT dismiss (strict dx < dy)', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      // dy = 70, dx = 70
      act(() => {
        result.current.onTouchStart(touchStart(100, 1, 0, 0));
      });
      vi.advanceTimersByTime(50);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + 70, 70));
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('dx === dy - 1 still dismisses (just inside dx < dy)', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      // dy = 70, dx = 69
      act(() => {
        result.current.onTouchStart(touchStart(100, 1, 0, 0));
      });
      vi.advanceTimersByTime(50);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + 70, 69));
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('uses absolute value for dx — leftward horizontal travel still rejects diagonal', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      // start at clientX=200, end at clientX=0 — dx_raw = -200 → |dx| = 200 > dy
      act(() => {
        result.current.onTouchStart(touchStart(100, 1, 0, 200));
      });
      vi.advanceTimersByTime(50);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 1, 0));
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SUITE 9: Edge cases — zero motion, pure axis
  // ══════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('zero-distance gesture (start and end at same Y) does NOT dismiss', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100));
      });
      act(() => {
        result.current.onTouchEnd(touchEnd(100));
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('pure horizontal swipe (dy = 0, dx > 0) does NOT dismiss', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100, 1, 0, 0));
      });
      vi.advanceTimersByTime(50);
      act(() => {
        result.current.onTouchEnd(touchEnd(100, 200));
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('single-finger onTouchMove does NOT cancel tracking', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100));
      });
      // A series of single-finger moves (normal gesture)
      act(() => {
        result.current.onTouchMove(touchMove(1));
      });
      act(() => {
        result.current.onTouchMove(touchMove(1));
      });
      vi.advanceTimersByTime(100);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 5));
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('three-finger touchstart is also rejected (length > 1 covers any multi-touch)', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100, 3));
      });
      act(() => {
        result.current.onTouchEnd(touchEnd(500));
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('three-finger touchmove cancels an in-progress gesture', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100));
      });
      act(() => {
        result.current.onTouchMove(touchMove(3));
      });
      vi.advanceTimersByTime(100);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 5));
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('snapshots scroll state at touchStart — later scroll changes do NOT alter the decision', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      // Start with scrollTop = 50 (scrolled) → should reject regardless of post-start scroll
      act(() => {
        result.current.onTouchStart(touchStart(100, 1, 50));
      });
      vi.advanceTimersByTime(50);
      // touchEnd doesn't carry currentTarget.scrollTop in this hook's logic
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + SWIPE_THRESHOLD + 50));
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('large downward swipe far beyond threshold still dismisses', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100));
      });
      vi.advanceTimersByTime(100);
      act(() => {
        result.current.onTouchEnd(touchEnd(100 + 500)); // huge swipe
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('quick tap (dt=0, dy=0) does NOT dismiss', () => {
      const { result } = renderHook(() => useSwipeDismiss(onDismiss));

      act(() => {
        result.current.onTouchStart(touchStart(100));
      });
      // No timer advance, no dy
      act(() => {
        result.current.onTouchEnd(touchEnd(100));
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });
});
