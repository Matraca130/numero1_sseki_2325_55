// ============================================================
// Axon — ExplodeControl (Vista Explosionada)
//
// Slider control that separates model parts spatially to reveal
// internal structures. Standard in medical/anatomy 3D viewers.
//
// Algorithm:
//   1. Compute centroid of all visible parts
//   2. For each part, compute direction vector (part center → global centroid)
//   3. Translate part along that vector × explodeAmount
//   4. Original positions are stored for reset
//
// Uses ModelPartLoader (parts already managed by Three.js groups).
//
// ZERO backend changes — purely frontend manipulation of
// existing ModelPartLoader part positions.
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Expand, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import type { ModelPartLoader } from './ModelPartMesh';

interface ExplodeControlProps {
  partLoader: ModelPartLoader;
  scene: THREE.Scene | null;
  /** All loaded model meshes (for bounding box) */
  modelMeshes: THREE.Object3D[];
}

// Store original positions of part groups
interface PartOriginalPosition {
  partId: string;
  position: THREE.Vector3;
  direction: THREE.Vector3; // direction from centroid to part
}

// Model-proportional scale factor (computed on init)
let _modelDiagonal = 3; // fallback

export function ExplodeControl({ partLoader, scene, modelMeshes }: ExplodeControlProps) {
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState(0); // 0-100
  const originalsRef = useRef<PartOriginalPosition[]>([]);
  const centroidRef = useRef(new THREE.Vector3());
  const initializedRef = useRef(false);

  // Compute original positions and explosion directions on first enable
  const initializeExplosion = useCallback(() => {
    if (!scene || initializedRef.current) return;

    const parts = partLoader.getPartStates();
    if (parts.length === 0) return;

    const originals: PartOriginalPosition[] = [];
    const centroid = new THREE.Vector3();
    let count = 0;

    // First pass: compute centroid from all part bounding boxes
    scene.traverse((obj) => {
      if (obj.userData?.partId && obj instanceof THREE.Group) {
        const box = new THREE.Box3().setFromObject(obj);
        if (!box.isEmpty()) {
          const center = box.getCenter(new THREE.Vector3());
          centroid.add(center);
          count++;
        }
      }
    });

    if (count === 0) return;
    centroid.divideScalar(count);
    centroidRef.current.copy(centroid);

    // Second pass: store original positions and compute directions
    scene.traverse((obj) => {
      if (obj.userData?.partId && obj instanceof THREE.Group) {
        const box = new THREE.Box3().setFromObject(obj);
        if (!box.isEmpty()) {
          const center = box.getCenter(new THREE.Vector3());
          const direction = center.clone().sub(centroid);

          // Normalize but preserve relative distance
          const dist = direction.length();
          if (dist > 0.001) {
            direction.normalize();
          } else {
            // Part is at centroid — give it a random direction
            direction.set(
              Math.random() - 0.5,
              Math.random() - 0.5,
              Math.random() - 0.5
            ).normalize();
          }

          originals.push({
            partId: obj.userData.partId,
            position: obj.position.clone(),
            direction,
          });
        }
      }
    });

    originalsRef.current = originals;
    initializedRef.current = true;

    // Compute model diagonal for proportional scaling
    const modelBox = new THREE.Box3().setFromObject(scene);
    _modelDiagonal = modelBox.getSize(new THREE.Vector3()).length();
  }, [scene, partLoader]);

  // Apply explosion amount
  useEffect(() => {
    if (!scene || !initializedRef.current) return;

    const scale = amount / 100 * _modelDiagonal; // max 3 units of displacement

    scene.traverse((obj) => {
      if (obj.userData?.partId && obj instanceof THREE.Group) {
        const original = originalsRef.current.find(o => o.partId === obj.userData.partId);
        if (original) {
          obj.position.copy(original.position);
          if (scale > 0) {
            obj.position.addScaledVector(original.direction, scale);
          }
        }
      }
    });
  }, [amount, scene]);

  const handleToggle = useCallback(() => {
    if (!enabled) {
      initializeExplosion();
      setEnabled(true);
    } else {
      // Reset positions
      if (scene) {
        scene.traverse((obj) => {
          if (obj.userData?.partId && obj instanceof THREE.Group) {
            const original = originalsRef.current.find(o => o.partId === obj.userData.partId);
            if (original) {
              obj.position.copy(original.position);
            }
          }
        });
      }
      setAmount(0);
      setEnabled(false);
    }
  }, [enabled, scene, initializeExplosion]);

  const handleReset = useCallback(() => {
    setAmount(0);
    // Reset positions
    if (scene) {
      scene.traverse((obj) => {
        if (obj.userData?.partId && obj instanceof THREE.Group) {
          const original = originalsRef.current.find(o => o.partId === obj.userData.partId);
          if (original) {
            obj.position.copy(original.position);
          }
        }
      });
    }
  }, [scene]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scene && originalsRef.current.length > 0) {
        scene.traverse((obj) => {
          if (obj.userData?.partId && obj instanceof THREE.Group) {
            const original = originalsRef.current.find(o => o.partId === obj.userData.partId);
            if (original) {
              obj.position.copy(original.position);
            }
          }
        });
      }
    };
  }, [scene]);

  return (
    <div className="flex items-center gap-2">
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border',
          enabled
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
        )}
        title="Vista explosionada"
      >
        <Expand size={12} />
        Explotar
      </button>

      {/* Slider (visible when enabled) */}
      {enabled && (
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-zinc-900/90 backdrop-blur-sm border border-white/10">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-20 h-1 cursor-pointer"
            style={{ accentColor: '#fbbf24' }}
          />
          <span className="text-[9px] text-gray-500 font-mono w-7 text-right">
            {amount}%
          </span>
          <button
            onClick={handleReset}
            className="p-0.5 text-gray-500 hover:text-amber-400 transition-colors"
            title="Reset"
          >
            <RotateCcw size={10} />
          </button>
        </div>
      )}
    </div>
  );
}