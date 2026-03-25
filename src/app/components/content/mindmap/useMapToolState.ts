// ============================================================
// Axon — useMapToolState
//
// Manages toolbar/editing states for KnowledgeMapView:
// active tool, connect source/target, confirm-delete node,
// annotation node, and tool keyboard shortcuts.
//
// Extracted from KnowledgeMapView to reduce state explosion.
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { MapTool } from './MapToolsPanel';
import type { MapNode } from '@/app/types/mindmap';
import type { MapViewI18nStrings } from './mapViewI18n';

export interface MapToolState {
  activeTool: MapTool;
  setActiveTool: React.Dispatch<React.SetStateAction<MapTool>>;
  activeToolRef: React.MutableRefObject<MapTool>;

  connectSource: MapNode | null;
  setConnectSource: React.Dispatch<React.SetStateAction<MapNode | null>>;
  connectSourceRef: React.MutableRefObject<MapNode | null>;
  connectTarget: MapNode | null;
  setConnectTarget: React.Dispatch<React.SetStateAction<MapNode | null>>;

  confirmDeleteNode: MapNode | null;
  setConfirmDeleteNode: React.Dispatch<React.SetStateAction<MapNode | null>>;

  annotationNode: MapNode | null;
  setAnnotationNode: React.Dispatch<React.SetStateAction<MapNode | null>>;

  handleToolChange: (tool: MapTool) => void;
}

/**
 * @param showOnboardingRef - ref indicating if onboarding overlay is visible (suppresses shortcuts)
 */
export function useMapToolState(
  showOnboardingRef: React.MutableRefObject<boolean>,
  i18n?: Pick<MapViewI18nStrings, 'connectionCancelled'>,
): MapToolState {
  const [activeTool, setActiveTool] = useState<MapTool>('pointer');
  const [connectSource, setConnectSource] = useState<MapNode | null>(null);
  const [connectTarget, setConnectTarget] = useState<MapNode | null>(null);
  const [confirmDeleteNode, setConfirmDeleteNode] = useState<MapNode | null>(null);
  const [annotationNode, setAnnotationNode] = useState<MapNode | null>(null);

  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const connectSourceRef = useRef(connectSource);
  connectSourceRef.current = connectSource;

  const handleToolChange = useCallback((tool: MapTool) => {
    if (tool !== 'connect') {
      setConnectSource(null);
      setConnectTarget(null);
    }
    setActiveTool(tool);
  }, []);

  // Tool keyboard shortcuts (V/N/C/D/A) — reset connect state when switching away
  useEffect(() => {
    const handleToolKey = (e: KeyboardEvent) => {
      if (showOnboardingRef.current) return;
      const el = e.target as HTMLElement;
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.tagName === 'SELECT' || el?.isContentEditable) return;
      // Suppress tool shortcuts when any modal/dialog or AI panel is open
      if (el?.closest('[role="dialog"], [role="alertdialog"], [data-suppress-shortcuts], .ai-panel')) return;
      // Also check if any AI panel or dialog overlay is present in the DOM (catches focus outside panel)
      if (document.querySelector('[data-suppress-shortcuts], .ai-panel[aria-modal="true"]')) return;
      // Escape cancels connect mode or returns to pointer tool
      if (e.key === 'Escape') {
        if (connectSourceRef.current) {
          setConnectSource(null);
          setConnectTarget(null);
          setActiveTool('pointer');
          toast.info(i18n?.connectionCancelled ?? 'Conexão cancelada');
        } else if (activeToolRef.current !== 'pointer') {
          setActiveTool('pointer');
        }
        return;
      }
      const map: Record<string, MapTool> = { v: 'pointer', n: 'add-node', c: 'connect', d: 'delete', a: 'annotate' };
      const tool = map[e.key.toLowerCase()];
      if (tool) handleToolChange(tool);
    };
    document.addEventListener('keydown', handleToolKey);
    return () => document.removeEventListener('keydown', handleToolKey);
  }, [handleToolChange, showOnboardingRef]);

  return {
    activeTool,
    setActiveTool,
    activeToolRef,
    connectSource,
    setConnectSource,
    connectSourceRef,
    connectTarget,
    setConnectTarget,
    confirmDeleteNode,
    setConfirmDeleteNode,
    annotationNode,
    setAnnotationNode,
    handleToolChange,
  };
}
