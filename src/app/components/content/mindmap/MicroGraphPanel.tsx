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

import { useState, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, ChevronDown } from 'lucide-react';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { useGraphData } from '@/app/components/content/mindmap/useGraphData';
import { useLocalGraph } from '@/app/components/content/mindmap/useLocalGraph';
import type { MapNode } from '@/app/types/mindmap';

// Lazy-load MiniKnowledgeGraph — avoids pulling G6 into the
// initial bundle of quiz/flashcard/summary views.
const MiniKnowledgeGraph = lazy(() =>
  import('@/app/components/content/mindmap/MiniKnowledgeGraph').then(m => ({
    default: m.MiniKnowledgeGraph,
  }))
);

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
    <div
      className="flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100"
      style={{ height }}
    >
      <div
        className="w-5 h-5 border-2 border-[#2a8c7a] border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label="Carregando grafo"
      />
    </div>
  );
}

// ── Component ───────────────────────────────────────────────

export function MicroGraphPanel({
  topicId,
  summaryId,
  focalNodeId,
  onNodeClick,
  height = 160,
  panelId = 'micro-graph-panel',
  variant = 'section',
}: MicroGraphPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const { graphData, loading, error } = useGraphData({
    topicId,
    summaryId,
  });
  const localGraph = useLocalGraph(graphData, focalNodeId, 1);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  // Show local subgraph when a focal node is available and found;
  // fall back to full graph otherwise.
  const displayGraph =
    focalNodeId && localGraph && localGraph.nodes.length > 0
      ? localGraph
      : graphData;
  const hasData = displayGraph && displayGraph.nodes.length > 0;

  // Don't render if no source, error, or confirmed no data
  if ((!topicId && !summaryId) || error) {
    if (error && import.meta.env.DEV) {
      console.warn('[MicroGraphPanel] Graph fetch error:', error);
    }
    return null;
  }
  if (!loading && !hasData) return null;

  const wrapperClass =
    variant === 'card'
      ? 'bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-6'
      : 'shrink-0 border-t border-gray-200/60 bg-white';

  return (
    <ErrorBoundary fallback={null}>
      <div className={wrapperClass}>
        {/* Toggle bar */}
        <button
          onClick={toggle}
          className={`w-full flex items-center gap-2 text-xs font-medium transition-colors ${
            variant === 'card'
              ? 'px-4 py-2.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50/80'
              : 'px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50/80'
          }`}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={expanded ? 'Fechar mapa de conhecimento' : 'Abrir mapa de conhecimento'}
        >
          <Brain size={variant === 'card' ? 14 : 13} className="text-[#2a8c7a]" />
          <span>{variant === 'card' ? 'Mapa de conhecimento' : 'Mapa'}</span>
          {displayGraph && !loading && (
            <span className="text-[10px] text-gray-400 ml-1">
              ({displayGraph.nodes.length} nós)
            </span>
          )}
          {expanded && loading && (
            <div
              className="w-3 h-3 border border-[#2a8c7a] border-t-transparent rounded-full animate-spin ml-1"
              role="status"
              aria-label="Carregando"
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
                ) : displayGraph ? (
                  <Suspense fallback={<GraphLoadingPlaceholder height={height} />}>
                    <MiniKnowledgeGraph
                      data={displayGraph}
                      focalNodeId={focalNodeId}
                      onNodeClick={onNodeClick}
                      height={height}
                    />
                  </Suspense>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
