// ============================================================
// Axon — ClippingPlaneControls (Cross-Section View)
//
// UI for enabling and positioning a clipping plane on the 3D model.
// Supports 3 anatomical orientations:
//   - Axial (XZ plane, slides along Y)
//   - Sagittal (YZ plane, slides along X)
//   - Coronal (XY plane, slides along Z)
//
// Uses Three.js built-in renderer.clippingPlanes.
// The parent (ModelViewer3D) must set renderer.localClippingEnabled = true.
//
// ZERO backend changes — purely frontend Three.js feature.
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Scissors, RotateCcw, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';

type PlaneOrientation = 'axial' | 'sagittal' | 'coronal';

const ORIENTATIONS: { value: PlaneOrientation; label: string; normal: [number, number, number]; color: string }[] = [
  { value: 'axial',    label: 'Axial (Y)',    normal: [0, -1, 0], color: '#60a5fa' },
  { value: 'sagittal', label: 'Sagital (X)',   normal: [-1, 0, 0], color: '#a78bfa' },
  { value: 'coronal',  label: 'Coronal (Z)',   normal: [0, 0, -1], color: '#34d399' },
];

interface ClippingPlaneControlsProps {
  renderer: THREE.WebGLRenderer | null;
  scene: THREE.Scene | null;
  modelMeshes: THREE.Object3D[];
  /** Register frame callback for visual helper updates */
  registerFrameCallback: (cb: () => void) => () => void;
}

export function ClippingPlaneControls({
  renderer,
  scene,
  modelMeshes,
  registerFrameCallback,
}: ClippingPlaneControlsProps) {
  const [enabled, setEnabled] = useState(false);
  const [orientation, setOrientation] = useState<PlaneOrientation>('axial');
  const [position, setPosition] = useState(50); // 0-100 slider
  const [showHelper, setShowHelper] = useState(true);
  const [flipDirection, setFlipDirection] = useState(false);

  const planeRef = useRef<THREE.Plane>(new THREE.Plane());
  const helperRef = useRef<THREE.PlaneHelper | null>(null);

  // Calculate bounding box for slider range
  const boundsRef = useRef({ min: -3, max: 3 });

  useEffect(() => {
    if (modelMeshes.length === 0) return;
    const box = new THREE.Box3();
    modelMeshes.forEach(m => box.expandByObject(m));
    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      boundsRef.current = {
        min: -maxDim * 0.6 + (orientation === 'axial' ? center.y : orientation === 'sagittal' ? center.x : center.z),
        max: maxDim * 0.6 + (orientation === 'axial' ? center.y : orientation === 'sagittal' ? center.x : center.z),
      };
    }
  }, [modelMeshes, modelMeshes.length, orientation]);

  // Update clipping plane when params change
  useEffect(() => {
    if (!renderer || !scene) return;

    if (!enabled) {
      // Remove clipping
      renderer.clippingPlanes = [];
      renderer.localClippingEnabled = false;
      // Remove helper
      if (helperRef.current && scene) {
        scene.remove(helperRef.current);
        helperRef.current.dispose();
        helperRef.current = null;
      }
      return;
    }

    renderer.localClippingEnabled = true;

    // Calculate plane position from slider (0-100 -> world coords)
    const { min, max } = boundsRef.current;
    const worldPos = min + (position / 100) * (max - min);

    const orientConfig = ORIENTATIONS.find(o => o.value === orientation)!;
    const normal = new THREE.Vector3(...orientConfig.normal);
    if (flipDirection) normal.negate();

    planeRef.current.normal.copy(normal);
    planeRef.current.constant = worldPos;

    renderer.clippingPlanes = [planeRef.current];

    // Update or create helper plane
    if (showHelper && scene) {
      if (helperRef.current) {
        scene.remove(helperRef.current);
        helperRef.current.dispose();
      }
      const helperColor = new THREE.Color(orientConfig.color);
      const helper = new THREE.PlaneHelper(planeRef.current, 6, helperColor.getHex());
      helper.renderOrder = 999;
      (helper.material as THREE.Material).transparent = true;
      (helper.material as THREE.Material).opacity = 0.15;
      (helper.material as THREE.Material).depthWrite = false;
      helperRef.current = helper;
      scene.add(helper);
    } else if (!showHelper && helperRef.current && scene) {
      scene.remove(helperRef.current);
      helperRef.current.dispose();
      helperRef.current = null;
    }

    return () => {
      // Cleanup on unmount
      if (helperRef.current && scene) {
        scene.remove(helperRef.current);
        helperRef.current.dispose();
        helperRef.current = null;
      }
    };
  }, [enabled, orientation, position, flipDirection, showHelper, renderer, scene]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderer) {
        renderer.clippingPlanes = [];
        renderer.localClippingEnabled = false;
      }
      if (helperRef.current && scene) {
        scene.remove(helperRef.current);
        helperRef.current.dispose();
      }
    };
  }, [renderer, scene]);

  const handleReset = useCallback(() => {
    setPosition(50);
    setFlipDirection(false);
  }, []);

  const orientConfig = ORIENTATIONS.find(o => o.value === orientation)!;

  return (
    <div className="absolute top-14 right-3 z-20">
      {/* Toggle button */}
      <button
        onClick={() => setEnabled(!enabled)}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border',
          enabled
            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
        )}
      >
        <Scissors size={12} />
        Corte
      </button>

      {/* Controls panel */}
      {enabled && (
        <div className="mt-2 w-52 bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-3 space-y-3">
          {/* Orientation selector */}
          <div className="flex gap-1">
            {ORIENTATIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setOrientation(o.value)}
                className={clsx(
                  'flex-1 px-1.5 py-1.5 rounded-lg text-[9px] font-medium transition-all border',
                  orientation === o.value
                    ? 'border-white/20 bg-white/10 text-white'
                    : 'border-transparent bg-white/5 text-gray-500 hover:text-gray-300'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Position slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[9px] text-gray-500">
              <span>Posicion</span>
              <span className="font-mono">{position}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              className="w-full h-1 cursor-pointer"
              style={{ accentColor: orientConfig.color }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Flip direction */}
              <button
                onClick={() => setFlipDirection(!flipDirection)}
                className={clsx(
                  'px-2 py-1 rounded-md text-[9px] transition-colors',
                  flipDirection
                    ? 'text-amber-300 bg-amber-500/10'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                )}
                title="Invertir direccion del corte"
              >
                Invertir
              </button>

              {/* Show/hide helper */}
              <button
                onClick={() => setShowHelper(!showHelper)}
                className="p-1 text-gray-500 hover:text-white rounded transition-colors"
                title={showHelper ? 'Ocultar plano' : 'Mostrar plano'}
              >
                {showHelper ? <Eye size={11} /> : <EyeOff size={11} />}
              </button>
            </div>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="p-1 text-gray-500 hover:text-amber-400 rounded transition-colors"
              title="Reset"
            >
              <RotateCcw size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}