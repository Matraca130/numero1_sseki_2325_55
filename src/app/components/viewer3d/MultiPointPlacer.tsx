// ============================================================
// Axon — MultiPointPlacer (Line & Area Pin Placement)
//
// State machine for multi-click pin placement:
//
// LINE mode (pin_type='line'):
//   1. Click point A on surface → marker appears
//   2. Click point B on surface → line created + form shows
//   3. Submit → POST /model-3d-pins with pin_type='line',
//      geometry=pointA, normal=pointB (repurposing normal field)
//
// AREA mode (pin_type='area'):
//   1. Click points on surface → vertices appear, edges drawn
//   2. Double-click or click "Cerrar" → polygon closed
//   3. Submit → POST /model-3d-pins with pin_type='area',
//      geometry=centroid, description=JSON(vertices)
//
// Renders preview geometry in the Three.js scene during placement.
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Ruler, Hexagon, X, Check, Undo2 } from 'lucide-react';
import clsx from 'clsx';

type PlacementMode = 'idle' | 'line-a' | 'line-b' | 'area-placing';

interface MultiPointPlacerProps {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  modelMeshes: THREE.Object3D[];
  onLineComplete: (pointA: THREE.Vector3, pointB: THREE.Vector3) => void;
  onAreaComplete: (vertices: THREE.Vector3[], centroid: THREE.Vector3) => void;
  onCancel: () => void;
}

export function MultiPointPlacer({
  scene,
  camera,
  containerRef,
  modelMeshes,
  onLineComplete,
  onAreaComplete,
  onCancel,
}: MultiPointPlacerProps) {
  const [mode, setMode] = useState<PlacementMode>('idle');
  const [linePointA, setLinePointA] = useState<THREE.Vector3 | null>(null);
  const [areaVertices, setAreaVertices] = useState<THREE.Vector3[]>([]);

  const raycasterRef = useRef(new THREE.Raycaster());
  const previewGroupRef = useRef<THREE.Group | null>(null);

  // Create/update preview group in scene
  useEffect(() => {
    if (!scene) return;
    if (!previewGroupRef.current) {
      previewGroupRef.current = new THREE.Group();
      previewGroupRef.current.userData = { isPreview: true };
      scene.add(previewGroupRef.current);
    }
    return () => {
      if (previewGroupRef.current && scene) {
        scene.remove(previewGroupRef.current);
        previewGroupRef.current.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
          }
          if (obj instanceof THREE.Line) {
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
          }
        });
        previewGroupRef.current = null;
      }
    };
  }, [scene]);

  // Update preview visuals
  const updatePreview = useCallback(() => {
    const group = previewGroupRef.current;
    if (!group) return;

    // Clear existing preview
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
      group.remove(child);
    }

    const sphereGeo = new THREE.SphereGeometry(0.05, 8, 8);

    if (mode === 'line-b' && linePointA) {
      // Show point A marker
      const mat = new THREE.MeshBasicMaterial({ color: 0xa78bfa });
      const sphere = new THREE.Mesh(sphereGeo, mat);
      sphere.position.copy(linePointA);
      sphere.userData = { pinId: '__preview__', isPinMarker: false, isPreview: true };
      group.add(sphere);
    }

    if (mode === 'area-placing' && areaVertices.length > 0) {
      // Show all placed vertices + connecting edges
      const mat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
      areaVertices.forEach((v) => {
        const sphere = new THREE.Mesh(sphereGeo.clone(), mat.clone());
        sphere.position.copy(v);
        sphere.userData = { isPreview: true };
        group.add(sphere);
      });

      // Draw edges
      if (areaVertices.length >= 2) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints(areaVertices);
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x34d399,
          transparent: true,
          opacity: 0.8,
        });
        const line = new THREE.Line(lineGeo, lineMat);
        line.userData = { isPreview: true };
        group.add(line);
      }
    }
  }, [mode, linePointA, areaVertices]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Mouse → NDC
  const getMouseNDC = useCallback((e: MouseEvent): THREE.Vector2 | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }, [containerRef]);

  // Raycast against model surface
  const raycastSurface = useCallback((e: MouseEvent): THREE.Vector3 | null => {
    if (!camera || modelMeshes.length === 0) return null;
    const ndc = getMouseNDC(e);
    if (!ndc) return null;

    raycasterRef.current.setFromCamera(ndc, camera);
    const hits = raycasterRef.current.intersectObjects(modelMeshes, true);

    // Filter out preview meshes
    const filtered = hits.filter(h => !h.object.userData?.isPreview);
    if (filtered.length > 0) {
      return filtered[0].point.clone();
    }
    return null;
  }, [camera, modelMeshes, getMouseNDC]);

  // Click handler
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mode === 'idle') return;

    // B5 fix: Debounce click to avoid double-click also firing as click
    let clickTimeout: ReturnType<typeof setTimeout> | null = null;
    let skipNextClick = false;

    const handleClick = (e: MouseEvent) => {
      if (skipNextClick) {
        skipNextClick = false;
        return;
      }

      // Delay click processing to allow dblclick to cancel it
      if (mode === 'area-placing') {
        clickTimeout = setTimeout(() => {
          const point = raycastSurface(e);
          if (!point) return;
          setAreaVertices(prev => [...prev, point]);
        }, 200);
      } else {
        const point = raycastSurface(e);
        if (!point) return;

        if (mode === 'line-a') {
          setLinePointA(point);
          setMode('line-b');
        } else if (mode === 'line-b' && linePointA) {
          onLineComplete(linePointA, point);
          resetState();
        }
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      // Cancel any pending single-click
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }
      skipNextClick = true;

      if (mode === 'area-placing' && areaVertices.length >= 3) {
        e.preventDefault();
        e.stopPropagation();
        // Complete area
        const centroid = new THREE.Vector3();
        areaVertices.forEach(v => centroid.add(v));
        centroid.divideScalar(areaVertices.length);
        onAreaComplete(areaVertices, centroid);
        resetState();
      }
    };

    el.addEventListener('click', handleClick);
    el.addEventListener('dblclick', handleDblClick);
    return () => {
      if (clickTimeout) clearTimeout(clickTimeout);
      el.removeEventListener('click', handleClick);
      el.removeEventListener('dblclick', handleDblClick);
    };
  }, [mode, linePointA, areaVertices, raycastSurface, onLineComplete, onAreaComplete, containerRef]);

  // Update cursor
  useEffect(() => {
    if (!containerRef.current) return;
    if (mode !== 'idle') {
      containerRef.current.style.cursor = 'crosshair';
    }
    return () => {
      if (containerRef.current) {
        containerRef.current.style.cursor = '';
      }
    };
  }, [mode, containerRef]);

  const resetState = useCallback(() => {
    setMode('idle');
    setLinePointA(null);
    setAreaVertices([]);
  }, []);

  const handleCancel = useCallback(() => {
    resetState();
    onCancel();
  }, [resetState, onCancel]);

  const handleUndo = useCallback(() => {
    if (mode === 'line-b') {
      setLinePointA(null);
      setMode('line-a');
    } else if (mode === 'area-placing') {
      setAreaVertices(prev => prev.slice(0, -1));
    }
  }, [mode]);

  const handleCloseArea = useCallback(() => {
    if (areaVertices.length >= 3) {
      const centroid = new THREE.Vector3();
      areaVertices.forEach(v => centroid.add(v));
      centroid.divideScalar(areaVertices.length);
      onAreaComplete(areaVertices, centroid);
      resetState();
    }
  }, [areaVertices, onAreaComplete, resetState]);

  return (
    <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
      {/* Mode buttons (when idle) */}
      {mode === 'idle' && (
        <>
          <button
            onClick={() => setMode('line-a')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border bg-white/5 text-gray-400 border-white/10 hover:bg-violet-500/20 hover:text-violet-300 hover:border-violet-500/30"
          >
            <Ruler size={12} />
            Medicion
          </button>
          <button
            onClick={() => setMode('area-placing')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border bg-white/5 text-gray-400 border-white/10 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30"
          >
            <Hexagon size={12} />
            Area
          </button>
        </>
      )}

      {/* Active placement status */}
      {mode !== 'idle' && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm border bg-zinc-900/90 border-white/10">
          {/* Status text */}
          <span className={clsx(
            'text-[10px] font-semibold animate-pulse',
            mode.startsWith('line') ? 'text-violet-300' : 'text-emerald-300'
          )}>
            {mode === 'line-a' && 'Click punto A...'}
            {mode === 'line-b' && 'Click punto B...'}
            {mode === 'area-placing' && `${areaVertices.length} puntos — click para agregar`}
          </span>

          {/* Undo */}
          {(mode === 'line-b' || (mode === 'area-placing' && areaVertices.length > 0)) && (
            <button
              onClick={handleUndo}
              className="p-1 text-gray-500 hover:text-white rounded transition-colors"
              title="Deshacer ultimo punto"
            >
              <Undo2 size={11} />
            </button>
          )}

          {/* Close area */}
          {mode === 'area-placing' && areaVertices.length >= 3 && (
            <button
              onClick={handleCloseArea}
              className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-emerald-300 bg-emerald-500/20 rounded-md hover:bg-emerald-500/30 transition-colors"
            >
              <Check size={9} />
              Cerrar ({areaVertices.length}pts)
            </button>
          )}

          {/* Cancel */}
          <button
            onClick={handleCancel}
            className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
            title="Cancelar"
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}