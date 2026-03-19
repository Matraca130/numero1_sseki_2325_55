// ============================================================
// Axon — useGraphControls hook
//
// Creates stable callbacks that delegate to graphControlsRef.
// Avoids duplicating 5 identical handlers in every page.
// ============================================================

import { useCallback, type RefObject } from 'react';
import { toast } from 'sonner';
import type { GraphControls } from '@/app/types/mindmap';

export function useGraphControls(ref: RefObject<GraphControls | null>) {
  const handleZoomIn = useCallback(() => { ref.current?.zoomIn(); }, [ref]);
  const handleZoomOut = useCallback(() => { ref.current?.zoomOut(); }, [ref]);
  const handleFitView = useCallback(() => { ref.current?.fitView(); }, [ref]);
  const handleCollapseAll = useCallback(() => { ref.current?.collapseAll(); }, [ref]);
  const handleExpandAll = useCallback(() => { ref.current?.expandAll(); }, [ref]);
  const handleExportPNG = useCallback(async () => {
    try { await ref.current?.exportPNG(); } catch (err) { if (import.meta.env.DEV) console.error('PNG export failed:', err); toast.error('No se pudo exportar como PNG'); }
  }, [ref]);
  const handleExportJPEG = useCallback(async () => {
    try { await ref.current?.exportJPEG(); } catch (err) { if (import.meta.env.DEV) console.error('JPEG export failed:', err); toast.error('No se pudo exportar como JPEG'); }
  }, [ref]);

  return { handleZoomIn, handleZoomOut, handleFitView, handleCollapseAll, handleExpandAll, handleExportPNG, handleExportJPEG };
}
