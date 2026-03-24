// ============================================================
// Axon — useMapNodeColors
//
// Manages custom node colors state for KnowledgeMapView.
// Extracted from KnowledgeMapView to reduce state explosion.
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { loadNodeColors, saveNodeColor } from './useNodeColors';
import type { NodeColorMap } from './useNodeColors';

export interface MapNodeColorsState {
  customNodeColors: NodeColorMap;
  setCustomNodeColors: React.Dispatch<React.SetStateAction<NodeColorMap>>;
  handleNodeColorChange: (nodeId: string, color: string) => void;
}

export function useMapNodeColors(effectiveTopicId: string): MapNodeColorsState {
  const [customNodeColors, setCustomNodeColors] = useState<NodeColorMap>(new Map());

  useEffect(() => {
    if (effectiveTopicId) {
      setCustomNodeColors(loadNodeColors(effectiveTopicId));
    } else {
      setCustomNodeColors(new Map());
    }
  }, [effectiveTopicId]);

  const handleNodeColorChange = useCallback((nodeId: string, color: string) => {
    if (!effectiveTopicId) return;
    saveNodeColor(effectiveTopicId, nodeId, color);
    setCustomNodeColors(prev => {
      const next = new Map(prev);
      next.set(nodeId, color);
      return next;
    });
  }, [effectiveTopicId]);

  return {
    customNodeColors,
    setCustomNodeColors,
    handleNodeColorChange,
  };
}
