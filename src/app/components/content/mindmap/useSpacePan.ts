// ============================================================
// Axon — useSpacePan
//
// Enables Space+drag panning in the knowledge graph.
// When Space is held, the cursor changes to 'grab' and
// node dragging is temporarily disabled so pointer drags
// on nodes pan the canvas instead of moving individual nodes.
//
// G6 v5's drag-canvas behavior handles the actual panning;
// this hook just manages the cursor feedback and disables
// drag-element while Space is held.
// ============================================================

import { useEffect, useRef } from 'react';
import type { Graph } from '@antv/g6';

interface UseSpacePanOptions {
  graphRef: React.RefObject<Graph | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  ready: boolean;
}

export function useSpacePan({ graphRef, containerRef, ready }: UseSpacePanOptions): void {
  const spaceHeldRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !ready) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || spaceHeldRef.current) return;
      // Don't intercept Space in input fields or interactive elements
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A') return;
      if (el?.isContentEditable || el?.getAttribute('role') === 'button') return;
      if (el?.closest?.('[role="dialog"], [role="alertdialog"]')) return;
      // Only activate when focus is within or near the graph container
      if (el && !container.contains(el) && el !== document.body && el !== document.documentElement) return;

      e.preventDefault();
      spaceHeldRef.current = true;
      container.style.cursor = 'grab';

      // Disable drag-element so dragging on nodes pans the canvas
      const graph = graphRef.current;
      if (graph) {
        try {
          graph.updateBehavior({ type: 'drag-element', enable: false });
        } catch {
          // Behavior may not exist or graph destroyed
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !spaceHeldRef.current) return;

      spaceHeldRef.current = false;
      container.style.cursor = '';

      // Re-enable drag-element
      const graph = graphRef.current;
      if (graph) {
        try {
          graph.updateBehavior({ type: 'drag-element', enable: true });
        } catch {
          // Behavior may not exist or graph destroyed
        }
      }
    };

    // Also reset on blur (if user switches windows while holding Space)
    const handleBlur = () => {
      if (spaceHeldRef.current) {
        spaceHeldRef.current = false;
        container.style.cursor = '';
        const graph = graphRef.current;
        if (graph) {
          try {
            graph.updateBehavior({ type: 'drag-element', enable: true });
          } catch (e) { if (import.meta.env.DEV) console.warn("[useSpacePan] ignore", e); }
        }
      }
    };

    // Reset when focus leaves the container (e.g. user clicks sidebar while holding Space)
    // Check relatedTarget to avoid false resets when focus moves within the container
    const handleFocusOut = (e: FocusEvent) => {
      if (container.contains(e.relatedTarget as Node)) return;
      handleBlur();
    };
    // Reset on tab switch (visibilitychange is more reliable than blur for tab switches)
    const handleVisibility = () => { if (document.hidden) handleBlur(); };

    // Listen on document so Space works even when canvas (not container) has focus
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    container.addEventListener('focusout', handleFocusOut);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      container.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      // Ensure state is clean on unmount
      if (spaceHeldRef.current) {
        container.style.cursor = '';
        const graph = graphRef.current;
        if (graph) {
          try { graph.updateBehavior({ type: 'drag-element', enable: true }); } catch (e) { if (import.meta.env.DEV) console.warn("[useSpacePan] ignore", e); }
        }
      }
    };
  }, [graphRef, containerRef, ready]);
}
