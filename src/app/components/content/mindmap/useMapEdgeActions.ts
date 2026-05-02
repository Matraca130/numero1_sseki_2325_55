// ============================================================
// Axon — useMapEdgeActions hook
//
// Edge-related callbacks extracted from KnowledgeMapView.tsx:
//   - handleEdgeReconnect (reconnect edge via drag)
//   - handleDragConnect (drag-to-connect between nodes)
//   - handleConnectNodes (connect tool flow via modal)
//   - handleQuickAdd (quick-connect "+" button)
//   - handleEdgeCreated (record undo action + history entry)
// ============================================================

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { deleteCustomEdge, createCustomEdge } from '@/app/services/mindmapApi';
import type { EdgeReconnectResult } from './useEdgeReconnect';
import type { MapNode, MapEdge } from '@/app/types/mindmap';
import type { MapViewI18nStrings } from './mapViewI18n';
import { createEdgeEntry } from './changeHistoryHelpers';
import type { HistoryEntry } from './changeHistoryHelpers';
import { haptic } from './hapticHelper';

interface UseMapEdgeActionsOptions {
  effectiveTopicId: string;
  /** Ref to current graphData.nodes — avoids stale closures */
  graphDataNodesRef: React.RefObject<MapNode[] | undefined>;
  /** Ref to current graphData.edges — avoids stale closures */
  graphDataEdgesRef: React.RefObject<MapEdge[] | undefined>;
  /** Ref to mountedRef to guard async operations */
  mountedRef: React.RefObject<boolean>;
  pushAction: (action: {
    type: string;
    [key: string]: unknown;
  }) => void;
  refetch: () => void;
  setConnectSource: (node: MapNode | null) => void;
  setConnectTarget: (node: MapNode | null) => void;
  setAddModalOpen: (open: boolean) => void;
  setHistoryEntries: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  t: MapViewI18nStrings;
}

export function useMapEdgeActions({
  effectiveTopicId,
  graphDataNodesRef,
  graphDataEdgesRef,
  mountedRef,
  pushAction,
  refetch,
  setConnectSource,
  setConnectTarget,
  setAddModalOpen,
  setHistoryEntries,
  t,
}: UseMapEdgeActionsOptions) {
  const reconnectingRef = useRef(false);

  // Handle edge reconnect: delete old edge, create new edge, record undo action
  const handleEdgeReconnect = useCallback(async (result: EdgeReconnectResult) => {
    if (reconnectingRef.current || !effectiveTopicId) return;
    reconnectingRef.current = true;
    const { oldEdge, movedEndpoint, newNodeId } = result;
    try {
      // Build new edge source/target
      const newSource = movedEndpoint === 'source' ? newNodeId : oldEdge.source;
      const newTarget = movedEndpoint === 'target' ? newNodeId : oldEdge.target;

      // Guard: prevent self-loops (finally resets reconnectingRef)
      if (newSource === newTarget) {
        toast.warning(t.selfLoopError);
        return;
      }

      // Guard: prevent duplicate edges (use ref for fresh data)
      const edgeExists = graphDataEdgesRef.current?.some(
        (e) => ((e.source === newSource && e.target === newTarget) || (e.source === newTarget && e.target === newSource)) && e.id !== oldEdge.id,
      );
      if (edgeExists) {
        toast.warning(t.duplicateEdgeError);
        return;
      }

      // Create the new edge first so the old one remains intact if creation fails
      const rollbackPayload = {
        source_node_id: oldEdge.source,
        target_node_id: oldEdge.target,
        label: oldEdge.label,
        connection_type: oldEdge.connectionType,
        topic_id: effectiveTopicId,
        line_style: oldEdge.lineStyle === 'solid' ? undefined : oldEdge.lineStyle,
        custom_color: oldEdge.customColor,
        directed: oldEdge.directed,
        arrow_type: oldEdge.arrowType,
      };
      const newEdgeRes = await createCustomEdge({
        source_node_id: newSource,
        target_node_id: newTarget,
        label: oldEdge.label,
        connection_type: oldEdge.connectionType,
        topic_id: effectiveTopicId,
        line_style: oldEdge.lineStyle === 'solid' ? undefined : oldEdge.lineStyle,
        custom_color: oldEdge.customColor,
        directed: oldEdge.directed,
        arrow_type: oldEdge.arrowType,
      });

      // New edge created successfully — now safe to delete the old one
      await deleteCustomEdge(oldEdge.id);

      if (!mountedRef.current) return;

      // Record for undo
      pushAction({
        type: 'reconnect-edge',
        oldEdgeId: oldEdge.id,
        oldPayload: rollbackPayload,
        newEdgeId: newEdgeRes.id,
        newPayload: {
          source_node_id: newSource,
          target_node_id: newTarget,
          label: oldEdge.label,
          connection_type: oldEdge.connectionType,
          topic_id: effectiveTopicId,
          line_style: oldEdge.lineStyle === 'solid' ? undefined : oldEdge.lineStyle,
          custom_color: oldEdge.customColor,
          directed: oldEdge.directed,
          arrow_type: oldEdge.arrowType,
        },
      });

      // Find node labels for toast (use ref for stable callback)
      const srcNode = graphDataNodesRef.current?.find(n => n.id === newSource);
      const tgtNode = graphDataNodesRef.current?.find(n => n.id === newTarget);
      toast.success(t.edgeReconnected(srcNode?.label ?? '?', tgtNode?.label ?? '?'));
      haptic(50);
      refetch();
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      toast.error(e instanceof Error ? e.message : t.reconnectEdgeError);
    } finally {
      reconnectingRef.current = false;
    }
  }, [effectiveTopicId, pushAction, refetch, graphDataEdgesRef, graphDataNodesRef, mountedRef, t]);

  // Quick-add handler: open AddNodeEdgeModal with source pre-filled
  const handleQuickAdd = useCallback((sourceId: string) => {
    const sourceNode = graphDataNodesRef.current?.find(n => n.id === sourceId);
    if (sourceNode) {
      setConnectSource(sourceNode);
      setAddModalOpen(true);
    }
  }, [graphDataNodesRef, setConnectSource, setAddModalOpen]);

  // Drag-to-connect handler: open AddNodeEdgeModal pre-filled with source -> target
  const handleDragConnect = useCallback((sourceId: string, targetId: string) => {
    const sourceNode = graphDataNodesRef.current?.find(n => n.id === sourceId);
    const targetNode = graphDataNodesRef.current?.find(n => n.id === targetId);
    if (sourceNode && targetNode) {
      setConnectSource(sourceNode);
      setConnectTarget(targetNode);
      setAddModalOpen(true);
    }
  }, [graphDataNodesRef, setConnectSource, setConnectTarget, setAddModalOpen]);

  const handleEdgeCreated = useCallback((edgeId: string, payload: { source_node_id: string; target_node_id: string; label?: string; connection_type?: string }) => {
    pushAction({ type: 'create-edge', edgeId, payload: { ...payload, topic_id: effectiveTopicId } });
    const srcNode = graphDataNodesRef.current?.find(n => n.id === payload.source_node_id);
    const tgtNode = graphDataNodesRef.current?.find(n => n.id === payload.target_node_id);
    setHistoryEntries(prev => [...prev, createEdgeEntry(srcNode?.label || '?', tgtNode?.label || '?')]);
    haptic(50);
  }, [pushAction, effectiveTopicId, graphDataNodesRef, setHistoryEntries]);

  return {
    handleEdgeReconnect,
    handleQuickAdd,
    handleDragConnect,
    handleEdgeCreated,
    reconnectingRef,
  };
}
