// ============================================================
// Axon — useMediaQuery hook
//
// Generic media-query listener that accepts a breakpoint in px.
// Uses window.matchMedia for efficient, event-driven updates.
//
// SSR-safe: returns `false` when window is unavailable.
//
// [A-01] Calendar v2 — required by CalendarView for responsive
// layout switching (month vs. week vs. agenda).
// ============================================================

import { useState, useEffect } from 'react';

/**
 * Returns `true` when the viewport width is >= the given breakpoint.
 *
 * @param breakpoint - Minimum width in pixels (e.g. 768)
 * @returns Whether the viewport matches the min-width query
 *
 * @example
 * ```ts
 * const isDesktop = useMediaQuery(768);
 * ```
 */
export function useMediaQuery(breakpoint: number): boolean {
  const query = `(min-width: ${breakpoint}px)`;

  const [matches, setMatches] = useState(() => {
    // SSR guard: no window → default to false (mobile-first)
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    // Double-check SSR guard inside effect (shouldn't fire on server,
    // but defensive coding for edge-case test environments)
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(query);

    // Sync immediately in case state diverged between render and effect
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Modern browsers: addEventListener. Safari <14 fallback: addListener.
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      mql.addListener(handler);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handler);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        mql.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
}
