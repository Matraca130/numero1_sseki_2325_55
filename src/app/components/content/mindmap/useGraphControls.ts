// ============================================================
// Axon — useGraphControls hook
//
// Creates stable callbacks that delegate to graphControlsRef.
// Avoids duplicating 5 identical handlers in every page.
// ============================================================

import { useCallback, type RefObject } from 'react';
import type { GraphControls } from '@/app/types/mindmap';

export function useGraphControls(ref: RefObject<GraphControls | null>) {
  const handleZoomIn = useCallback(() => { ref.current?.zoomIn(); }, [ref]);
  const handleZoomOut = useCallback(() => { ref.current?.zoomOut(); }, [ref]);
  const handleFitView = useCallback(() => { ref.current?.fitView(); }, [ref]);
  const handleCollapseAll = useCallback(() => { ref.current?.collapseAll(); }, [ref]);
  const handleExpandAll = useCallback(() => { ref.current?.expandAll(); }, [ref]);

  return { handleZoomIn, handleZoomOut, handleFitView, handleCollapseAll, handleExpandAll };
}
