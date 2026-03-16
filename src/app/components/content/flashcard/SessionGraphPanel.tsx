// ============================================================
// SessionGraphPanel — Mini knowledge graph for flashcard sessions.
// Thin wrapper around MicroGraphPanel.
// ============================================================

import { MicroGraphPanel } from '@/app/components/content/mindmap/MicroGraphPanel';
import type { MapNode } from '@/app/types/mindmap';

interface SessionGraphPanelProps {
  topicId: string | undefined;
  /** keyword_id of the current flashcard (focal node) */
  currentKeywordId: string | undefined;
  /** Called when user clicks a node — navigate to that keyword's cards */
  onNodeClick?: (node: MapNode) => void;
}

export function SessionGraphPanel({
  topicId,
  currentKeywordId,
  onNodeClick,
}: SessionGraphPanelProps) {
  return (
    <MicroGraphPanel
      topicId={topicId}
      focalNodeId={currentKeywordId}
      onNodeClick={onNodeClick}
      height={160}
      panelId="session-graph-panel"
      variant="section"
    />
  );
}
