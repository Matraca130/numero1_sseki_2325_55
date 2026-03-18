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
      // Don't intercept Space in input fields
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

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
          } catch { /* ignore */ }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      // Ensure state is clean on unmount
      if (spaceHeldRef.current) {
        container.style.cursor = '';
        const graph = graphRef.current;
        if (graph) {
          try { graph.updateBehavior({ type: 'drag-element', enable: true }); } catch { /* ignore */ }
        }
      }
    };
  }, [graphRef, containerRef, ready]);
}
