// ============================================================
// QuizSessionGraphPanel — Mini knowledge graph for quiz sessions.
// Thin wrapper around MicroGraphPanel.
// ============================================================

import { MicroGraphPanel } from '@/app/components/content/mindmap/MicroGraphPanel';
import type { MapNode } from '@/app/types/mindmap';

interface QuizSessionGraphPanelProps {
  /** summary_id of the current quiz (used to fetch the graph) */
  summaryId: string | undefined;
  /** keyword_id of the current quiz question (focal node) */
  currentKeywordId: string | undefined;
  /** Called when user clicks a node */
  onNodeClick?: (node: MapNode) => void;
}

export function QuizSessionGraphPanel({
  summaryId,
  currentKeywordId,
  onNodeClick,
}: QuizSessionGraphPanelProps) {
  return (
    <MicroGraphPanel
      summaryId={summaryId}
      focalNodeId={currentKeywordId}
      onNodeClick={onNodeClick}
      height={160}
      panelId="quiz-graph-panel"
      variant="section"
    />
  );
}
