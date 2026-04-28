// ============================================================
// useGraphHighlighting — highlight/review styling and selection
// Extracted from KnowledgeGraph.tsx (pure refactor)
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import type { Graph } from '@antv/g6';
import type { GraphData, MapNode } from '@/app/types/mindmap';
import { truncateLabel } from '@/app/types/mindmap';
import { colors } from '@/app/design-system';
import { getNodeStroke, devWarn } from './graphHelpers';
import { warnIfNotDestroyed } from './useGraphInit';

export interface UseGraphHighlightingOptions {
  graphRef: React.RefObject<Graph | null>;
  ready: boolean;
  graphVersion: number;
  highlightNodeIds?: Set<string>;
  reviewNodeIds?: Set<string>;
  selectedNodeId?: string | null;
  highlightEpoch: number;
  setHighlightEpoch: React.Dispatch<React.SetStateAction<number>>;
  layoutInProgressRef: React.RefObject<boolean>;
  dataNodesRef: React.RefObject<GraphData['nodes']>;
  dataEdgesRef: React.RefObject<GraphData['edges']>;
  nodeById: Map<string, MapNode>;
  batchDraw: () => void;
}

export interface UseGraphHighlightingReturn {
  applyMultiSelectionState: (graph: Graph, ids: Set<string>) => void;
  prevMultiRef: React.RefObject<Set<string>>;
}

export function useGraphHighlighting(opts: UseGraphHighlightingOptions): UseGraphHighlightingReturn {
  const {
    graphRef,
    ready,
    graphVersion,
    highlightNodeIds,
    reviewNodeIds,
    selectedNodeId,
    highlightEpoch,
    layoutInProgressRef,
    dataNodesRef,
    dataEdgesRef,
    nodeById,
    batchDraw,
  } = opts;

  // ── Multi-selection visual state ──
  const prevMultiRef = useRef<Set<string>>(new Set());
  const applyMultiSelectionState = useCallback((graph: Graph, ids: Set<string>) => {
    try {
      const prev = prevMultiRef.current;
      for (const id of ids) {
        if (!prev.has(id)) {
          try {
            const existing = graph.getElementState(id);
            const states = Array.isArray(existing)
              ? [...existing.filter((s: string) => s !== 'multiSelected'), 'multiSelected']
              : ['multiSelected'];
            graph.setElementState(id, states);
          } catch { graph.setElementState(id, ['multiSelected']); }
        }
      }
      for (const id of prev) {
        if (!ids.has(id)) {
          try {
            const states = graph.getElementState(id);
            graph.setElementState(id, states.filter(s => s !== 'multiSelected'));
          } catch { graph.setElementState(id, []); }
        }
      }
      prevMultiRef.current = new Set(ids);
      batchDraw();
    } catch (e: unknown) { warnIfNotDestroyed(e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- multi-select IDs accessed via ref; only batchDraw needed
  }, [batchDraw]);

  // ── Highlight/review styling ──
  const prevHighlightRef = useRef<Set<string> | undefined>(undefined);
  const prevReviewRef = useRef<Set<string> | undefined>(undefined);
  const prevEpochRef = useRef(0);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready || layoutInProgressRef.current) return;

    const prevHL = prevHighlightRef.current;
    const prevRV = prevReviewRef.current;
    const epochChanged = prevEpochRef.current !== highlightEpoch;
    prevHighlightRef.current = highlightNodeIds;
    prevReviewRef.current = reviewNodeIds;
    prevEpochRef.current = highlightEpoch;

    if (!epochChanged && prevHL === highlightNodeIds && prevRV === reviewNodeIds) return;

    const hasHighlightOrReview = (highlightNodeIds && highlightNodeIds.size > 0) || (reviewNodeIds && reviewNodeIds.size > 0);
    const hadHighlightOrReview = (prevHL && prevHL.size > 0) || (prevRV && prevRV.size > 0);
    if (!hasHighlightOrReview && !hadHighlightOrReview && !epochChanged) return;

    const hasHighlight = highlightNodeIds && highlightNodeIds.size > 0;
    const hasReview = reviewNodeIds && reviewNodeIds.size > 0;

    const nodeUpdates: { id: string; style: Record<string, unknown>; data?: Record<string, unknown> }[] = [];
    const edgeUpdates: { id: string; style: Record<string, unknown> }[] = [];

    let visibleNodeIds: Set<string> | null = null;
    try {
      const gNodes = graph.getNodeData();
      visibleNodeIds = new Set(gNodes.map((n: { id: string }) => n.id));
    } catch (e) { devWarn('KnowledgeGraph', 'fallback: update all', e); }

    for (const node of dataNodesRef.current) {
      if (visibleNodeIds && !visibleNodeIds.has(node.id)) continue;
      const isHighlighted = hasHighlight && highlightNodeIds!.has(node.id);
      const isDimmed = hasHighlight && !isHighlighted;
      const needsReview = hasReview && reviewNodeIds!.has(node.id);
      const strokeColor = needsReview ? '#f97316' : getNodeStroke(node.masteryColor);
      const baseLabel = truncateLabel(node.label);

      const styleUpdate: Record<string, unknown> = {
        shadowColor: isHighlighted ? strokeColor : needsReview ? '#f97316' : 'transparent',
        shadowBlur: isHighlighted ? 10 : needsReview ? 8 : 0,
        opacity: isDimmed ? 0.35 : 1,
        labelText: needsReview ? '\u26a0 ' + baseLabel : baseLabel,
        labelFill: isDimmed ? colors.text.tertiary : needsReview ? '#c2410c' : colors.text.primary,
      };
      if (isHighlighted) styleUpdate.lineWidth = 3;
      else if (needsReview) styleUpdate.lineWidth = 2.5;

      nodeUpdates.push({
        id: node.id,
        data: { needsReview },
        style: styleUpdate,
      });
    }

    for (const edge of dataEdgesRef.current) {
      if (visibleNodeIds && (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target))) continue;
      const edgeHighlighted = hasHighlight && highlightNodeIds!.has(edge.source) && highlightNodeIds!.has(edge.target);
      const edgeDimmed = hasHighlight && !edgeHighlighted;
      edgeUpdates.push({
        id: edge.id,
        style: { opacity: edgeDimmed ? 0.2 : 1 },
      });
    }

    try {
      if (nodeUpdates.length > 0) graph.updateNodeData(nodeUpdates);
      if (edgeUpdates.length > 0) graph.updateEdgeData(edgeUpdates);
      batchDraw();
    } catch (e: unknown) { warnIfNotDestroyed(e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- graph/batchDraw accessed via stable refs
  }, [highlightNodeIds, reviewNodeIds, ready, highlightEpoch]);

  // ── Selected node highlight ──
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready) return;

    const prev = prevSelectedRef.current;
    const curr = selectedNodeId ?? null;
    prevSelectedRef.current = curr;

    if (prev === curr) return;

    const updates: { id: string; style: Record<string, unknown> }[] = [];

    if (prev) {
      const prevNode = nodeById.get(prev);
      if (prevNode) {
        updates.push({
          id: prev,
          style: { shadowColor: 'transparent', shadowBlur: 0 },
        });
      }
    }

    if (curr) {
      const currNode = nodeById.get(curr);
      if (currNode) {
        updates.push({
          id: curr,
          style: {
            shadowColor: getNodeStroke(currNode.masteryColor),
            shadowBlur: 12,
          },
        });
      }
    }

    if (updates.length > 0) {
      try {
        graph.updateNodeData(updates);
        batchDraw();
      } catch (e: unknown) { warnIfNotDestroyed(e); }
    }
  }, [selectedNodeId, ready, graphVersion, nodeById, graphRef]);

  return {
    applyMultiSelectionState,
    prevMultiRef,
  };
}
