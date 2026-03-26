// ============================================================
// Axon — useGraphExport
//
// Utility hook for exporting the G6 knowledge graph as an image.
// Uses G6 v5's graph.toDataURL() method to capture the canvas,
// then triggers a browser download.
//
// Supports PNG (native) and JPEG formats.
// Note: SVG export is not available with G6's default Canvas
// renderer — we offer "overall" mode PNG as the high-fidelity
// alternative.
// ============================================================

import { useCallback, useRef } from 'react';
import type { Graph } from '@antv/g6';
import { toast } from 'sonner';
import type { GraphLocale } from './graphI18n';
import { I18N_GRAPH } from './graphI18n';

type ExportFormat = 'png' | 'jpeg';

/**
 * Trigger a file download from a data URL.
 */
function downloadDataURL(dataURL: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  // Clean up after a tick to avoid flash in some browsers
  requestAnimationFrame(() => {
    document.body.removeChild(link);
  });
}

/**
 * Build a timestamped filename for the export.
 */
function buildFilename(prefix: string, format: ExportFormat): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join('');
  return `${prefix}-${stamp}.${format === 'jpeg' ? 'jpg' : format}`;
}

export interface GraphExportControls {
  /** Export the full graph as PNG (overall mode) */
  exportPNG: () => Promise<void>;
  /** Export the full graph as JPEG (overall mode) */
  exportJPEG: () => Promise<void>;
}

/**
 * Hook that provides export functions for a G6 graph instance.
 *
 * Usage:
 * ```ts
 * const graphRef = useRef<Graph | null>(null);
 * const { exportPNG, exportJPEG, setGraph } = useGraphExport();
 * // When graph is ready:
 * setGraph(graph);
 * ```
 */
export function useGraphExport(locale: GraphLocale = 'es') {
  const graphRef = useRef<Graph | null>(null);
  const t = I18N_GRAPH[locale] ?? I18N_GRAPH.es;

  const setGraph = useCallback((graph: Graph | null) => {
    graphRef.current = graph;
  }, []);

  const exportingRef = useRef(false);

  const doExport = useCallback(async (format: ExportFormat) => {
    if (exportingRef.current) return; // Prevent concurrent exports
    const graph = graphRef.current;
    if (!graph || (graph as Graph & { destroyed?: boolean }).destroyed) {
      toast.error(t.exportNotReady);
      return;
    }

    exportingRef.current = true;
    try {
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataURL = await graph.toDataURL({
        mode: 'overall',
        type: mimeType as 'image/png' | 'image/jpeg',
        encoderOptions: format === 'jpeg' ? 0.92 : 1,
      });
      downloadDataURL(dataURL, buildFilename(t.exportFilenamePrefix, format));
    } catch (err: unknown) {
      // Graph may be destroyed or in transition
      if (import.meta.env.DEV) console.error('Export failed:', err);
      toast.error(t.exportFailed);
    } finally {
      exportingRef.current = false;
    }
  }, [t]);

  const exportPNG = useCallback(() => doExport('png'), [doExport]);
  const exportJPEG = useCallback(() => doExport('jpeg'), [doExport]);

  return { exportPNG, exportJPEG, setGraph };
}
