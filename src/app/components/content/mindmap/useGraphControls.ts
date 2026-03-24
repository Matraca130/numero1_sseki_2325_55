// ============================================================
// Axon — useGraphControls hook
//
// Creates stable callbacks that delegate to graphControlsRef.
// Avoids duplicating 5 identical handlers in every page.
// ============================================================

import { useCallback, type RefObject } from 'react';
import { toast } from 'sonner';
import type { GraphControls } from '@/app/types/mindmap';

const I18N_EXPORT = {
  pt: { pngError: 'Não foi possível exportar como PNG', jpegError: 'Não foi possível exportar como JPEG' },
  es: { pngError: 'No se pudo exportar como PNG', jpegError: 'No se pudo exportar como JPEG' },
} as const;

export function useGraphControls(ref: RefObject<GraphControls | null>, locale: 'pt' | 'es' = 'pt') {
  const t = I18N_EXPORT[locale];
  const handleZoomIn = useCallback(() => { ref.current?.zoomIn(); }, [ref]);
  const handleZoomOut = useCallback(() => { ref.current?.zoomOut(); }, [ref]);
  const handleFitView = useCallback(() => { ref.current?.fitView(); }, [ref]);
  const handleResetZoom = useCallback(() => { ref.current?.resetZoom?.(); }, [ref]);
  const handleCollapseAll = useCallback(() => { ref.current?.collapseAll(); }, [ref]);
  const handleExpandAll = useCallback(() => { ref.current?.expandAll(); }, [ref]);
  const handleExportPNG = useCallback(async () => {
    try { await ref.current?.exportPNG(); } catch (err) { if (import.meta.env.DEV) console.error('PNG export failed:', err); toast.error(t.pngError); }
  }, [ref, t]);
  const handleExportJPEG = useCallback(async () => {
    try { await ref.current?.exportJPEG(); } catch (err) { if (import.meta.env.DEV) console.error('JPEG export failed:', err); toast.error(t.jpegError); }
  }, [ref, t]);

  return { handleZoomIn, handleZoomOut, handleFitView, handleResetZoom, handleCollapseAll, handleExpandAll, handleExportPNG, handleExportJPEG };
}
