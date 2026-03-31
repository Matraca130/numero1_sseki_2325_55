// ============================================================
// Axon — useBreakpoint / useIsMobileBreakpoint hooks
// Unified responsive breakpoint detection using matchMedia.
// SSR-safe (defaults to desktop when window is unavailable).
// ============================================================
import { useState, useEffect } from 'react';

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Returns true if the viewport width is >= the given breakpoint.
 * Uses `window.matchMedia` for efficient, event-driven updates.
 */
export function useBreakpoint(bp: Breakpoint): boolean {
  const minWidth = BREAKPOINTS[bp];
  const query = `(min-width: ${minWidth}px)`;

  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : true,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Shorthand: returns true when viewport < lg (1024px).
 */
export function useIsMobileBreakpoint(): boolean {
  return !useBreakpoint('lg');
}
