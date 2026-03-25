// ============================================================
// useCountUp — Animated count-up from 0 to target value
//
// Uses requestAnimationFrame with easeOutCubic curve.
// Respects prefers-reduced-motion: skips animation entirely.
// Only animates when target changes (not on every re-render).
// ============================================================

import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 to `target` over `duration` ms.
 * Returns the current animated integer value.
 */
export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const prevTargetRef = useRef<number | null>(null);
  const currentValueRef = useRef(0);

  // Keep ref in sync with state
  currentValueRef.current = value;

  useEffect(() => {
    // Skip if target hasn't actually changed (prevents re-animation on re-renders)
    if (prevTargetRef.current === target) return;
    prevTargetRef.current = target;

    // Guard against NaN/Infinity
    if (!Number.isFinite(target)) {
      setValue(0);
      return;
    }

    if (target === 0) {
      setValue(0);
      return;
    }

    // Respect prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      setValue(target);
      return;
    }

    // Animate from current displayed value to new target (not from 0)
    const startValue = currentValueRef.current;
    let frame: number;
    let start: number | null = null;

    const step = (now: number) => {
      if (!start) start = now;
      const progress = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startValue + (target - startValue) * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
