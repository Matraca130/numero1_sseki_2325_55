// ============================================================
// Axon — useViewerKeyboard hook
//
// Extracted from ModelViewer3D.tsx for <500 line rule.
// Handles keyboard shortcuts in the 3D viewer:
//   R = reset camera, F = focus model, L = layers,
//   P = pins, N = notes (student), ? = shortcut hint
// ============================================================

import { useEffect, useCallback } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PinMode } from '@/app/components/viewer3d/PinSystem';

interface UseViewerKeyboardOptions {
  mode: PinMode;
  hasMultiPart: boolean;
  contextLost: boolean;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  controlsRef: React.MutableRefObject<OrbitControls | null>;
  modelMeshesRef: React.MutableRefObject<THREE.Object3D[]>;
  cameraPos: [number, number, number];
  // State setters
  setShowLayerPanel: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPinEditor: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPins: React.Dispatch<React.SetStateAction<boolean>>;
  setShowNotes: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShortcutHint: React.Dispatch<React.SetStateAction<boolean>>;
  handlePinsChanged: () => void;
}

export function useViewerKeyboard({
  mode,
  hasMultiPart,
  contextLost,
  cameraRef,
  controlsRef,
  modelMeshesRef,
  cameraPos,
  setShowLayerPanel,
  setShowPinEditor,
  setShowPins,
  setShowNotes,
  setShowShortcutHint,
  handlePinsChanged,
}: UseViewerKeyboardOptions) {
  const resetCamera = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(...cameraPos);
    controls.target.set(0, 0.5, 0);
    controls.update();
  }, [cameraRef, controlsRef, cameraPos]);

  const focusModel = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const meshes = modelMeshesRef.current;
    if (meshes.length === 0) return;

    const box = new THREE.Box3();
    meshes.forEach(mesh => box.expandByObject(mesh));
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;

    camera.position.set(
      center.x + distance * 0.5,
      center.y + distance * 0.3,
      center.z + distance * 0.5,
    );
    controls.target.copy(center);
    controls.update();
  }, [cameraRef, controlsRef, modelMeshesRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (contextLost) return;

      switch (e.key.toLowerCase()) {
        case 'r':
          e.preventDefault();
          resetCamera();
          break;
        case 'f':
          e.preventDefault();
          focusModel();
          break;
        case 'l':
          if (hasMultiPart) {
            e.preventDefault();
            setShowLayerPanel(prev => !prev);
          }
          break;
        case 'p':
          e.preventDefault();
          if (mode === 'edit') {
            setShowPinEditor(prev => {
              if (!prev) handlePinsChanged();
              return !prev;
            });
          } else {
            setShowPins(prev => !prev);
          }
          break;
        case 'n':
          if (mode === 'view') {
            e.preventDefault();
            setShowNotes(prev => !prev);
          }
          break;
        case '?':
          setShowShortcutHint(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, hasMultiPart, contextLost, resetCamera, focusModel, handlePinsChanged,
      setShowLayerPanel, setShowPinEditor, setShowPins, setShowNotes, setShowShortcutHint]);

  return { resetCamera, focusModel };
}
