// ============================================================
// Axon — useMapUIState
//
// Manages panel visibility and UI-layer states for KnowledgeMapView.
// Extracted from KnowledgeMapView to reduce the 29-useState explosion.
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';

export interface MapUIState {
  // Panel visibility
  showAiPanel: boolean;
  showHistory: boolean;
  showComparison: boolean;
  presentationMode: boolean;
  showShareModal: boolean;
  showOnboarding: boolean;

  // Fullscreen-related zoom level tracking
  zoomLevel: number;

  // Minimap
  showMinimap: boolean;

  // Togglers (ensure mutual exclusion of panels)
  toggleAiPanel: () => void;
  toggleHistory: () => void;
  toggleComparison: () => void;
  toggleMinimap: () => void;

  // Setters
  setShowAiPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setShowHistory: React.Dispatch<React.SetStateAction<boolean>>;
  setShowComparison: React.Dispatch<React.SetStateAction<boolean>>;
  setPresentationMode: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShareModal: React.Dispatch<React.SetStateAction<boolean>>;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;

  // AI highlight/review overlay nodes
  aiHighlightNodes: Set<string> | undefined;
  aiReviewNodes: Set<string> | undefined;
  setAiHighlightNodes: React.Dispatch<React.SetStateAction<Set<string> | undefined>>;
  setAiReviewNodes: React.Dispatch<React.SetStateAction<Set<string> | undefined>>;

  // Onboarding
  dismissOnboarding: () => void;
  showOnboardingRef: React.MutableRefObject<boolean>;
}

export function useMapUIState(): MapUIState {
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showMinimap, setShowMinimap] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768,
  );

  const [aiHighlightNodes, setAiHighlightNodes] = useState<Set<string> | undefined>();
  const [aiReviewNodes, setAiReviewNodes] = useState<Set<string> | undefined>();

  // First-visit onboarding tip
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('axon_map_onboarded'); } catch { return true; }
  });
  const showOnboardingRef = useRef(showOnboarding);
  showOnboardingRef.current = showOnboarding;

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    try { localStorage.setItem('axon_map_onboarded', '1'); } catch {}
  }, []);

  // Dismiss onboarding with Escape key
  useEffect(() => {
    if (!showOnboarding) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismissOnboarding(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showOnboarding, dismissOnboarding]);

  // Panel togglers with mutual exclusion
  const toggleAiPanel = useCallback(() => {
    setShowAiPanel(v => {
      if (!v) { setShowHistory(false); setShowComparison(false); }
      else { setAiHighlightNodes(undefined); setAiReviewNodes(undefined); }
      return !v;
    });
  }, []);

  const toggleHistory = useCallback(() => {
    setShowHistory(v => {
      if (!v) { setShowAiPanel(false); setShowComparison(false); }
      return !v;
    });
  }, []);

  const toggleComparison = useCallback(() => {
    setShowComparison(v => {
      if (!v) { setShowAiPanel(false); setShowHistory(false); }
      return !v;
    });
  }, []);

  const toggleMinimap = useCallback(() => setShowMinimap(v => !v), []);

  return {
    showAiPanel,
    showHistory,
    showComparison,
    presentationMode,
    showShareModal,
    showOnboarding,
    zoomLevel,
    showMinimap,
    aiHighlightNodes,
    aiReviewNodes,
    toggleAiPanel,
    toggleHistory,
    toggleComparison,
    toggleMinimap,
    setShowAiPanel,
    setShowHistory,
    setShowComparison,
    setPresentationMode,
    setShowShareModal,
    setZoomLevel,
    setAiHighlightNodes,
    setAiReviewNodes,
    dismissOnboarding,
    showOnboardingRef,
  };
}
