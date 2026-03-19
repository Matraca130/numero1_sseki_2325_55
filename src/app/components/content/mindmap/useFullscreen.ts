// ============================================================
// Axon — useFullscreen Hook
//
// Manages fullscreen mode for the knowledge graph.
// Uses the Fullscreen API when available, falls back to
// CSS-based fullscreen (fixed positioning) otherwise.
//
// Handles:
//   - Toggle fullscreen on/off
//   - ESC key to exit
//   - Fullscreen API change events
//   - Ancestor transform clearing (fixes CSS `fixed` inside
//     framer-motion wrappers that apply transforms)
//   - SessionStorage persistence (exit on reload)
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  /** Ref to attach to the container element for Fullscreen API */
  fullscreenRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Walk up the DOM tree from `el` and override any ancestor that has
 * a computed `transform` other than `none`.  This is necessary because
 * CSS spec says a `transform` on an ancestor creates a new containing
 * block, which breaks `position: fixed` in descendants (making it act
 * like `absolute` instead of viewport-relative).
 *
 * Returns a cleanup function that restores the original inline styles.
 */
function clearAncestorTransforms(el: HTMLElement): () => void {
  const saved: Array<{ node: HTMLElement; prev: string }> = [];
  let parent = el.parentElement;

  while (parent && parent !== document.documentElement) {
    const computed = getComputedStyle(parent).transform;
    if (computed && computed !== 'none') {
      saved.push({ node: parent, prev: parent.style.transform });
      parent.style.setProperty('transform', 'none', 'important');
    }
    parent = parent.parentElement;
  }

  return () => {
    for (const { node, prev } of saved) {
      if (prev) {
        node.style.transform = prev;
      } else {
        node.style.removeProperty('transform');
      }
    }
  };
}

export function useFullscreen(): UseFullscreenReturn {
  const fullscreenRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const restoreRef = useRef<(() => void) | null>(null);
  // Ref tracks desired state to avoid stale closures in async callbacks
  const isFullscreenRef = useRef(false);
  const rafIdRef = useRef<number>(0);

  // Check if Fullscreen API is available
  const supportsFullscreen = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

  const doRestore = useCallback(() => {
    restoreRef.current?.();
    restoreRef.current = null;
  }, []);

  const enterFullscreen = useCallback(async () => {
    // Clean up any pending restore from a previous rapid toggle
    doRestore();
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

    if (supportsFullscreen && fullscreenRef.current) {
      try {
        await fullscreenRef.current.requestFullscreen();
      } catch {
        // Fullscreen API failed — use CSS fallback
      }
    }
    isFullscreenRef.current = true;
    setIsFullscreen(true);
    // Clear ancestor transforms so CSS `fixed` works correctly.
    // Schedule after React commit so the DOM reflects the new class.
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = 0;
      // Guard: only apply if still in fullscreen (rapid toggle protection)
      if (isFullscreenRef.current && fullscreenRef.current) {
        restoreRef.current = clearAncestorTransforms(fullscreenRef.current);
      }
    });
    try { sessionStorage.setItem('axon_map_fullscreen', '1'); } catch {}
  }, [supportsFullscreen, doRestore]);

  const exitFullscreen = useCallback(async () => {
    if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = 0; }
    doRestore();
    if (supportsFullscreen && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Already exited or not in fullscreen
      }
    }
    isFullscreenRef.current = false;
    setIsFullscreen(false);
    try { sessionStorage.removeItem('axon_map_fullscreen'); } catch {}
  }, [supportsFullscreen, doRestore]);

  const toggleFullscreen = useCallback(() => {
    // Read from ref to avoid stale state in rapid toggles
    if (isFullscreenRef.current) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  // Sync with Fullscreen API events (e.g. user presses browser ESC)
  useEffect(() => {
    if (!supportsFullscreen) return;

    const handleChange = () => {
      // Read truth from the DOM, not from React state — avoids stale closure
      if (!document.fullscreenElement) {
        doRestore();
        setIsFullscreen(false);
        try { sessionStorage.removeItem('axon_map_fullscreen'); } catch {}
      }
    };

    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, [supportsFullscreen, doRestore]);

  // On mount: exit fullscreen if page was reloaded while in fullscreen
  useEffect(() => {
    try {
      if (sessionStorage.getItem('axon_map_fullscreen')) {
        sessionStorage.removeItem('axon_map_fullscreen');
      }
    } catch {}
  }, []);

  // Cleanup on unmount: restore ancestor transforms if still overridden
  useEffect(() => {
    return () => doRestore();
  }, [doRestore]);

  return { isFullscreen, toggleFullscreen, fullscreenRef };
}
