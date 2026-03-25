// ============================================================
// Axon — useGraphControls hook
//
// Creates stable callbacks that delegate to graphControlsRef.
// Avoids duplicating 5 identical handlers in every page.
// ============================================================

import { useCallback, type RefObject } from 'react';
import { toast } from 'sonner';
import type { GraphControls } from '@/app/types/mindmap';
import { I18N_GRAPH } from './graphI18n';
import type { GraphLocale } from './graphI18n';

export function useGraphControls(ref: RefObject<GraphControls | null>, locale: GraphLocale = 'pt') {
  const t = I18N_GRAPH[locale];
  const handleZoomIn = useCallback(() => { ref.current?.zoomIn(); }, [ref]);
  const handleZoomOut = useCallback(() => { ref.current?.zoomOut(); }, [ref]);
  const handleFitView = useCallback(() => { ref.current?.fitView(); }, [ref]);
  const handleResetZoom = useCallback(() => { ref.current?.resetZoom?.(); }, [ref]);
  const handleCollapseAll = useCallback(() => { ref.current?.collapseAll(); }, [ref]);
  const handleExpandAll = useCallback(() => { ref.current?.expandAll(); }, [ref]);
  const handleExportPNG = useCallback(async () => {
    try { await ref.current?.exportPNG(); } catch (err) { if (import.meta.env.DEV) console.error('PNG export failed:', err); toast.error(t.exportPngError); }
  }, [ref, t]);
  const handleExportJPEG = useCallback(async () => {
    try { await ref.current?.exportJPEG(); } catch (err) { if (import.meta.env.DEV) console.error('JPEG export failed:', err); toast.error(t.exportJpegError); }
  }, [ref, t]);

  return { handleZoomIn, handleZoomOut, handleFitView, handleResetZoom, handleCollapseAll, handleExpandAll, handleExportPNG, handleExportJPEG };
}
