// ============================================================
// Axon -- Tests for useDebouncedValue
//
// Verify the hook only updates after `delayMs` of stability and
// that timer resets on every change. Uses vi.useFakeTimers().
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('returns the initial value synchronously', () => {
    const { result } = renderHook(() => useDebouncedValue('init', 300));
    expect(result.current).toBe('init');
  });

  it('does NOT update before the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 300),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'b' });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');
  });

  it('updates exactly when the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 300),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'b' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('b');
  });

  it('resets the timer when value changes mid-debounce', () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 500),
      { initialProps: { v: 'a' } },
    );

    rerender({ v: 'b' });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    // Still 'a' — less than 500ms since last change.
    expect(result.current).toBe('a');

    rerender({ v: 'c' });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    // Still 'a' — timer was reset by the 'c' change.
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    // Now 500ms since 'c' — debounce emits 'c'.
    expect(result.current).toBe('c');
  });

  it('handles delayMs = 0 (emits on next tick)', () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 0),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'b' });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current).toBe('b');
  });

  it('supports generic types (numbers)', () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: number }) => useDebouncedValue<number>(v, 100),
      { initialProps: { v: 1 } },
    );
    expect(result.current).toBe(1);
    rerender({ v: 2 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(2);
  });

  it('supports generic types (objects) and returns the same reference', () => {
    const objA = { id: 1 };
    const objB = { id: 2 };
    const { result, rerender } = renderHook(
      ({ v }: { v: { id: number } }) => useDebouncedValue(v, 200),
      { initialProps: { v: objA } },
    );
    expect(result.current).toBe(objA);
    rerender({ v: objB });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(objB);
  });

  it('re-starts the debounce when delay changes', () => {
    const { result, rerender } = renderHook(
      ({ v, d }: { v: string; d: number }) => useDebouncedValue(v, d),
      { initialProps: { v: 'a', d: 500 } },
    );
    rerender({ v: 'b', d: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a');

    // Change delay -> triggers effect -> new timer of 100ms from now.
    rerender({ v: 'b', d: 100 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('b');
  });

  it('clears the pending timer on unmount (no crashes)', () => {
    const { rerender, unmount } = renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 500),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'b' });
    unmount();
    // Advance past the debounce window — should not throw.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  });
});
