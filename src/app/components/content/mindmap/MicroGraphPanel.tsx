// ============================================================
// Axon — MicroGraphPanel (Shared Micro-session Graph Panel)
//
// Collapsible mini knowledge graph for embedding in quiz,
// flashcard, and summary views. Shows a local subgraph
// around a focal keyword.
//
// Used by: SummaryGraphPanel, SessionGraphPanel, QuizSessionGraphPanel
//
// PERF: MiniKnowledgeGraph is lazy-loaded so G6 is only
// downloaded when the user actually expands the panel.
// ============================================================

import { useState, useCallback, useEffect, useMemo, useSyncExternalStore, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, ChevronDown, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { GraphSkeleton } from './GraphSkeleton';
import { useGraphData } from './useGraphData';
import { useLocalGraph } from './useLocalGraph';
import type { MapNode } from '@/app/types/mindmap';

// Lazy-load MiniKnowledgeGraph — avoids pulling G6 into the
// initial bundle of quiz/flashcard/summary views.
const MiniKnowledgeGraph = lazy(() =>
  import('./MiniKnowledgeGraph').then(m => ({
    default: m.MiniKnowledgeGraph,
  }))
);

// Reactive small-screen detection via matchMedia (avoids stale window.innerWidth reads)
const SMALL_SCREEN_QUERY = '(max-width: 639px)';
const smallScreenMql = typeof window !== 'undefined' ? window.matchMedia(SMALL_SCREEN_QUERY) : null;
function subscribeSmallScreen(cb: () => void) {
  smallScreenMql?.addEventListener('change', cb);
  return () => smallScreenMql?.removeEventListener('change', cb);
}
function getSmallScreenSnapshot() {
  return smallScreenMql?.matches ?? false;
}
function getSmallScreenServerSnapshot() {
  return false;
}

// ── Props ───────────────────────────────────────────────────

interface MicroGraphPanelProps {
  /** Fetch graph by topic (flashcard sessions) */
  topicId?: string;
  /** Fetch graph by summary (quiz / summary sessions) */
  summaryId?: string;
  /** Focal node ID — graph centers around this keyword */
  focalNodeId: string | undefined;
  /** Called when user clicks a node in the graph */
  onNodeClick?: (node: MapNode) => void;
  /** Graph height in px (default: 160) */
  height?: number;
  /** Unique ID for ARIA controls */
  panelId?: string;
  /** Wrapper variant: 'card' for standalone card, 'section' for inline border-top */
  variant?: 'card' | 'section';
}

// ── Loading placeholder ─────────────────────────────────────

function GraphLoadingPlaceholder({ height }: { height: number }) {
  return (
    <div style={{ height }}>
      <GraphSkeleton variant="mini" label="" className="h-full" />
    </div>
  );
}

// ── Component ───────────────────────────────────────────────

export function MicroGraphPanel({
  topicId,
  summaryId,
  focalNodeId,
  onNodeClick,
  height: heightProp = 160,
  panelId = 'micro-graph-panel',
  variant = 'section',
}: MicroGraphPanelProps) {
  const [expanded, setExpanded] = useState(false);
  // Defer data fetch until user first expands the panel (saves a network call
  // when the panel stays collapsed for the entire session).
  // Using state (not ref) so the fetch triggers a proper re-render cycle.
  const [hasBeenExpanded, setHasBeenExpanded] = useState(false);
  useEffect(() => {
    if (expanded && !hasBeenExpanded) setHasBeenExpanded(true);
  }, [expanded, hasBeenExpanded]);

  // Reactive mobile detection — taller on small screens for better touch interaction
  const isMobileSize = useSyncExternalStore(subscribeSmallScreen, getSmallScreenSnapshot, getSmallScreenServerSnapshot);
  const height = isMobileSize ? Math.max(heightProp, 200) : heightProp;

  const effectiveTopicId = hasBeenExpanded ? (topicId?.trim() || undefined) : undefined;
  const effectiveSummaryId = hasBeenExpanded ? (summaryId?.trim() || undefined) : undefined;

  const { graphData, loading, error, refetch } = useGraphData({
    topicId: effectiveTopicId,
    summaryId: effectiveSummaryId,
  });
  const localGraph = useLocalGraph(graphData, focalNodeId, 1);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  // Show local subgraph when a focal node is available and found;
  // fall back to full graph otherwise.
  const displayGraph = useMemo(
    () => focalNodeId && localGraph && localGraph.nodes.length > 0 ? localGraph : graphData,
    [focalNodeId, localGraph, graphData],
  );
  const hasData = displayGraph && displayGraph.nodes.length > 0;

  // Don't render if no source IDs provided
  if (!topicId?.trim() && !summaryId?.trim()) return null;
  // After fetching, if confirmed empty and panel is collapsed, hide panel.
  // If expanded, show an empty state message instead of vanishing.
  if (hasBeenExpanded && !expanded && !loading && !error && !hasData) return null;

  const wrapperClass =
    variant === 'card'
      ? 'bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6'
      : 'shrink-0 border-t border-gray-200/60 bg-white overflow-hidden';

  // Error state: show a retry bar instead of hiding the panel entirely
  if (error) {
    return (
      <div className={wrapperClass}>
        <button
          onClick={() => refetch()}
          className={`w-full flex items-center gap-2 text-xs font-medium transition-colors min-h-[44px] ${
            variant === 'card'
              ? 'px-4 py-2.5 text-gray-500 hover:text-gray-600 hover:bg-gray-50/80'
              : 'px-4 py-2 text-gray-500 hover:text-gray-600 hover:bg-gray-50/80'
          }`}
          aria-label="Mapa no disponible. Toca para reintentar."
        >
          <Brain size={variant === 'card' ? 14 : 13} className="text-gray-500" />
          <span>Mapa no disponible</span>
          <RefreshCw size={12} className="ml-auto" />
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={(_err, reset) => (
      <div className={wrapperClass}>
        <button onClick={reset} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-500 hover:text-gray-600 hover:bg-gray-50/80 min-h-[44px]">
          <Brain size={13} className="text-gray-500" />
          <span>Grafo no disponible</span>
          <RefreshCw size={12} className="ml-auto" />
        </button>
      </div>
    )}>
      <div className={wrapperClass}>
        {/* Toggle bar */}
        <button
          onClick={toggle}
          className={`w-full flex items-center gap-2 text-xs font-medium transition-colors min-h-[44px] ${
            variant === 'card'
              ? 'px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50/80'
              : 'px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50/80'
          }`}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={expanded ? 'Cerrar mapa de conocimiento' : 'Abrir mapa de conocimiento'}
        >
          <Brain size={variant === 'card' ? 14 : 13} className="text-ax-primary-500" />
          <span>{variant === 'card' ? 'Mapa de conocimiento' : 'Mapa'}</span>
          {displayGraph && !loading && (
            <span className="text-[10px] text-gray-500 ml-1 truncate max-w-[60px] sm:max-w-[80px]">
              ({displayGraph.nodes.length} nodos{focalNodeId && localGraph && localGraph.nodes.length > 0 && graphData && localGraph.nodes.length < graphData.nodes.length ? ' · local' : ''})
            </span>
          )}
          {expanded && loading && (
            <div
              className="w-3 h-3 border border-ax-primary-500 border-t-transparent rounded-full animate-spin ml-1"
              aria-hidden="true"
            />
          )}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="ml-auto"
          >
            <ChevronDown size={14} />
          </motion.div>
        </button>

        {/* Collapsible graph */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              id={panelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3">
                {loading ? (
                  <GraphLoadingPlaceholder height={height} />
                ) : displayGraph && displayGraph.nodes.length > 0 ? (
                  <>
                    <Suspense fallback={<GraphLoadingPlaceholder height={height} />}>
                      <MiniKnowledgeGraph
                        data={displayGraph}
                        focalNodeId={focalNodeId}
                        onNodeClick={onNodeClick}
                        height={height}
                      />
                    </Suspense>
                    <div className="sr-only" aria-live="polite" aria-atomic="true">
                      Mapa cargado con {displayGraph.nodes.length} conceptos
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center text-xs text-gray-500 py-6" style={{ minHeight: height }}>
                    No hay datos de mapa para este tema
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
