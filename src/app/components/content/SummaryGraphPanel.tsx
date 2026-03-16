// ============================================================
// SummaryGraphPanel — Mini knowledge graph for the summary reader.
// Thin wrapper around MicroGraphPanel with card variant.
// ============================================================

import { MicroGraphPanel } from '@/app/components/content/mindmap/MicroGraphPanel';
import type { MapNode } from '@/app/types/mindmap';

interface SummaryGraphPanelProps {
  summaryId: string;
  /** keyword_id of the currently highlighted keyword (focal node) */
  highlightedKeywordId: string | undefined;
  /** Called when user clicks a node in the graph */
  onNodeClick?: (node: MapNode) => void;
}

export function SummaryGraphPanel({
  summaryId,
  highlightedKeywordId,
  onNodeClick,
}: SummaryGraphPanelProps) {
  return (
    <MicroGraphPanel
      summaryId={summaryId}
      focalNodeId={highlightedKeywordId}
      onNodeClick={onNodeClick}
      height={180}
      panelId="summary-graph-panel"
      variant="card"
    />
  );
}
