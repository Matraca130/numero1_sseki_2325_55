// ============================================================
// Axon — useMapNodeActions hook
//
// Node-related callbacks extracted from KnowledgeMapView.tsx:
//   - handleDeleteCustomNode (prompt confirmation dialog)
//   - executeDeleteNode (perform the actual deletion)
//   - handleNodeCreated (record undo action + history entry)
// ============================================================

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { deleteCustomNode } from '@/app/services/mindmapApi';
import type { MapNode } from '@/app/types/mindmap';
import type { MapViewI18nStrings } from './mapViewI18n';
import { createNodeEntry, createDeleteNodeEntry } from './changeHistoryHelpers';
import type { HistoryEntry } from './changeHistoryHelpers';
import { haptic } from './hapticHelper';

interface UseMapNodeActionsOptions {
  effectiveTopicId: string;
  mountedRef: React.RefObject<boolean>;
  confirmDeleteNode: MapNode | null;
  setConfirmDeleteNode: (node: MapNode | null) => void;
  setSelectedNode: React.Dispatch<React.SetStateAction<MapNode | null>>;
  setContextMenu: React.Dispatch<React.SetStateAction<{ node: MapNode; position: { x: number; y: number } } | null>>;
  setConnectSource: React.Dispatch<React.SetStateAction<MapNode | null>>;
  setAnnotationNode: React.Dispatch<React.SetStateAction<MapNode | null>>;
  pushAction: (action: {
    type: string;
    [key: string]: unknown;
  }) => void;
  refetch: () => void;
  setHistoryEntries: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  t: MapViewI18nStrings;
}

export function useMapNodeActions({
  effectiveTopicId,
  mountedRef,
  confirmDeleteNode,
  setConfirmDeleteNode,
  setSelectedNode,
  setContextMenu,
  setConnectSource,
  setAnnotationNode,
  pushAction,
  refetch,
  setHistoryEntries,
  t,
}: UseMapNodeActionsOptions) {
  const deletingNodeRef = useRef(false);

  const handleDeleteCustomNode = useCallback(async (node: MapNode) => {
    if (!node.isUserCreated) return;
    setConfirmDeleteNode(node);
  }, [setConfirmDeleteNode]);

  const executeDeleteNode = useCallback(async () => {
    if (!confirmDeleteNode || deletingNodeRef.current || !effectiveTopicId) return;
    deletingNodeRef.current = true;
    try {
      await deleteCustomNode(confirmDeleteNode.id);
      if (!mountedRef.current) return;
      // Record for undo — store enough data to re-create the node
      pushAction({
        type: 'delete-node',
        nodeId: confirmDeleteNode.id,
        payload: {
          label: confirmDeleteNode.label,
          definition: confirmDeleteNode.definition,
          topic_id: effectiveTopicId,
        },
      });
      setHistoryEntries(prev => [...prev, createDeleteNodeEntry(confirmDeleteNode.label)]);
      const deletedId = confirmDeleteNode.id;
      setSelectedNode(prev => prev?.id === deletedId ? null : prev);
      setContextMenu(prev => prev?.node.id === deletedId ? null : prev);
      setConnectSource(prev => prev?.id === deletedId ? null : prev);
      setAnnotationNode(prev => prev?.id === deletedId ? null : prev);
      setConfirmDeleteNode(null);
      refetch();
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      toast.error(e instanceof Error ? e.message : t.deleteNodeError);
      setConfirmDeleteNode(null);
    } finally {
      deletingNodeRef.current = false;
    }
  }, [confirmDeleteNode, refetch, pushAction, effectiveTopicId, mountedRef, setConfirmDeleteNode, setSelectedNode, setContextMenu, setConnectSource, setAnnotationNode, setHistoryEntries, t]);

  const handleNodeCreated = useCallback((nodeId: string, payload: { label: string; definition?: string }) => {
    pushAction({ type: 'create-node', nodeId, payload: { ...payload, topic_id: effectiveTopicId } });
    setHistoryEntries(prev => [...prev, createNodeEntry(payload.label)]);
    haptic(50);
  }, [pushAction, effectiveTopicId, setHistoryEntries]);

  return {
    handleDeleteCustomNode,
    executeDeleteNode,
    handleNodeCreated,
    deletingNodeRef,
  };
}
