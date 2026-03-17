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

  useEffect(() => {
    // Skip if target hasn't actually changed (prevents re-animation on re-renders)
    if (prevTargetRef.current === target) return;
    prevTargetRef.current = target;

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

    let frame: number;
    let start: number | null = null;

    const step = (now: number) => {
      if (!start) start = now;
      const progress = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
