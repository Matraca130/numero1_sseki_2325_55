// ============================================================
// Axon — useViewerState (extracted from ModelViewer3D.tsx)
//
// Aggregates all refs + UI state used by the 3D viewer so that
// the main component becomes a thin orchestrator.
//
// God-component split (finding #21): created to shrink
// ModelViewer3D.tsx below 300L.
// ============================================================
import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ModelPartLoader, ModelLayerConfig } from '@/app/components/viewer3d/ModelPartMesh';

export function useViewerState() {
  // ── three.js refs ──
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const modelMeshesRef = useRef<THREE.Object3D[]>([]);
  const partLoaderRef = useRef<ModelPartLoader | null>(null);

  // ── Frame callback registry (replaces DOM hacking) ──
  const frameCallbacksRef = useRef<Set<() => void>>(new Set());

  const registerFrameCallback = useCallback((cb: () => void) => {
    frameCallbacksRef.current.add(cb);
    return () => { frameCallbacksRef.current.delete(cb); };
  }, []);

  // ── Scene / viewer UI state ──
  const [sceneReady, setSceneReady] = useState(false);
  const [showPinEditor, setShowPinEditor] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [layerUpdateKey, setLayerUpdateKey] = useState(0);
  const [storedLayers, setStoredLayersState] = useState<ModelLayerConfig[]>([]);
  const [hasMultiPart, setHasMultiPart] = useState(false);
  /** True while a single-file GLB is being downloaded */
  const [glbLoading, setGlbLoading] = useState(false);

  // ── Keyboard shortcut visibility toggles ──
  const [showPins, setShowPins] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showShortcutHint, setShowShortcutHint] = useState(false);

  // ── WebGL context loss recovery (G1) ──
  const [contextLost, setContextLost] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const contextLossCountRef = useRef(0);
  const contextLossTimestampRef = useRef(0);

  // ── Pin refresh key ──
  const [pinRefreshKey, setPinRefreshKey] = useState(0);
  const handlePinsChanged = useCallback(() => {
    setPinRefreshKey(k => k + 1);
  }, []);

  return {
    // refs
    containerRef,
    rendererRef,
    sceneRef,
    cameraRef,
    controlsRef,
    animFrameRef,
    modelMeshesRef,
    partLoaderRef,
    frameCallbacksRef,
    registerFrameCallback,
    // scene state
    sceneReady,
    setSceneReady,
    showPinEditor,
    setShowPinEditor,
    showLayerPanel,
    setShowLayerPanel,
    layerUpdateKey,
    setLayerUpdateKey,
    storedLayers,
    setStoredLayersState,
    hasMultiPart,
    setHasMultiPart,
    glbLoading,
    setGlbLoading,
    // keyboard toggles
    showPins,
    setShowPins,
    showNotes,
    setShowNotes,
    showShortcutHint,
    setShowShortcutHint,
    // context loss
    contextLost,
    setContextLost,
    sceneKey,
    setSceneKey,
    contextLossCountRef,
    contextLossTimestampRef,
    // pins
    pinRefreshKey,
    handlePinsChanged,
  };
}

export type ViewerState = ReturnType<typeof useViewerState>;
