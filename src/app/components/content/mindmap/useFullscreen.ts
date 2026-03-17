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
//   - SessionStorage persistence (exit on reload)
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  /** Ref to attach to the container element for Fullscreen API */
  fullscreenRef: React.RefObject<HTMLDivElement | null>;
}

export function useFullscreen(): UseFullscreenReturn {
  const fullscreenRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if Fullscreen API is available
  const supportsFullscreen = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

  const enterFullscreen = useCallback(async () => {
    if (supportsFullscreen && fullscreenRef.current) {
      try {
        await fullscreenRef.current.requestFullscreen();
      } catch {
        // Fullscreen API failed — use CSS fallback
      }
    }
    setIsFullscreen(true);
    try { sessionStorage.setItem('axon_map_fullscreen', '1'); } catch {}
  }, [supportsFullscreen]);

  const exitFullscreen = useCallback(async () => {
    if (supportsFullscreen && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Already exited or not in fullscreen
      }
    }
    setIsFullscreen(false);
    try { sessionStorage.removeItem('axon_map_fullscreen'); } catch {}
  }, [supportsFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Sync with Fullscreen API events (e.g. user presses browser ESC)
  useEffect(() => {
    if (!supportsFullscreen) return;

    const handleChange = () => {
      // Read truth from the DOM, not from React state — avoids stale closure
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        try { sessionStorage.removeItem('axon_map_fullscreen'); } catch {}
      }
    };

    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, [supportsFullscreen]);

  // On mount: exit fullscreen if page was reloaded while in fullscreen
  useEffect(() => {
    try {
      if (sessionStorage.getItem('axon_map_fullscreen')) {
        sessionStorage.removeItem('axon_map_fullscreen');
      }
    } catch {}
  }, []);

  return { isFullscreen, toggleFullscreen, fullscreenRef };
}
