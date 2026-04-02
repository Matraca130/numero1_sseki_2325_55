// ============================================================
// Axon — PinSystem (MODULARIZED)
//
// React component managing pin interactions in the 3D viewer.
// Sub-modules extracted in Sprint 1:
//   - PinCreationForm.tsx: inline floating form for pin creation
//
// PROFESSOR mode="edit":
//   Click surface -> raycast -> get geometry + normal -> form -> POST /model-3d-pins
//
// STUDENT mode="view":
//   See pin markers, hover tooltip, click -> popup with info
//
// PERFORMANCE (Paso 1):
//   - Overlay positions updated imperatively via DOM refs (no setState per frame)
//   - Reuses module-level _tempVec3/_ndcVec2 to avoid GC pressure
//   - Registers projection callback via registerFrameCallback (no DOM hacking)
//   - React re-renders only on hover/active/pin-list changes, NOT every frame
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import clsx from 'clsx';
import { MapPin, X, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/app/lib/logger';
import {
  getModel3DPins, createModel3DPin, deleteModel3DPin,
} from '@/app/lib/model3d-api';
import type { Model3DPin } from '@/app/lib/model3d-api';
import { PinMarkerManager } from './PinMarker3D';
import type { PinMarkerData } from './PinMarker3D';
// Sprint 1: extracted form component
import { PinCreationForm } from './PinCreationForm';
import type { PinFormData } from './PinCreationForm';

// ── Reusable temp objects (module-level, zero GC pressure) ──
const _tempVec3 = new THREE.Vector3();
const _ndcVec2 = new THREE.Vector2();

// ── Types ──

export type PinMode = 'view' | 'edit';

interface PinSystemProps {
  modelId: string;
  topicId?: string;
  mode: PinMode;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Meshes in the scene that are the "model" (for raycasting surface clicks) */
  modelMeshes: THREE.Object3D[];
  /** Register a callback to be called every animation frame (from ModelViewer3D) */
  registerFrameCallback: (cb: () => void) => () => void;
  /** Incremented by parent when external pin CRUD occurs -> triggers refetch */
  refreshKey?: number;
}

// DB pin_type -> friendly label (for display of existing pins)
const PIN_TYPE_DISPLAY: Record<string, string> = {
  point: 'Punto',
  line:  'Linea',
  area:  'Area',
};

// ══════════════════════════════════════════════
// ── PinSystem Component ──
// ══════════════════════════════════════════════

export function PinSystem({ modelId, topicId, mode, scene, camera, containerRef, modelMeshes, registerFrameCallback, refreshKey }: PinSystemProps) {
  const [pins, setPins] = useState<Model3DPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);

  // Professor: placement state
  const [isPlacing, setIsPlacing] = useState(false);
  const [placementPoint, setPlacementPoint] = useState<{ geometry: THREE.Vector3; normal: THREE.Vector3 } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // ── Imperative overlay positioning (PERFORMANCE: no setState per frame) ──
  const pinOverlayRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Pin marker manager ref
  const markerManagerRef = useRef<PinMarkerManager | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());

  // ── Mousemove throttle (G4) ──
  const lastMoveTimeRef = useRef(0);
  const MOVE_THROTTLE_MS = 32; // ~30fps

  // ── Fetch pins ──
  const fetchPins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getModel3DPins(modelId);
      setPins(res?.items || []);
    } catch (err: unknown) {
      logger.error('PinSystem', 'fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => { fetchPins(); }, [fetchPins, refreshKey]);

  // ── Sync pins to 3D markers ──
  useEffect(() => {
    if (!scene) return;

    if (!markerManagerRef.current) {
      markerManagerRef.current = new PinMarkerManager(scene);
    }

    const mgr = markerManagerRef.current;
    mgr.clear();

    pins.forEach(pin => {
      const data: PinMarkerData = {
        id: pin.id,
        position: new THREE.Vector3(pin.geometry.x, pin.geometry.y, pin.geometry.z),
        normal: pin.normal ? new THREE.Vector3(pin.normal.x, pin.normal.y, pin.normal.z) : undefined,
        color: pin.color,
        pinType: pin.pin_type,
        label: pin.title || undefined,
      };
      mgr.addPin(data);
    });

    return () => {
      mgr.clear();
    };
  }, [scene, pins]);

  // ── Project pins to 2D each frame ──
  const projectPins = useCallback(() => {
    if (!camera || !containerRef.current || pins.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();

    pins.forEach(pin => {
      _tempVec3.set(pin.geometry.x, pin.geometry.y, pin.geometry.z);
      _tempVec3.project(camera);

      const x = (_tempVec3.x * 0.5 + 0.5) * rect.width;
      const y = (-_tempVec3.y * 0.5 + 0.5) * rect.height;
      const visible = _tempVec3.z < 1;

      const el = pinOverlayRefs.current.get(pin.id);
      if (el) {
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        el.style.display = visible ? '' : 'none';
      }
    });

    markerManagerRef.current?.updateBillboards(camera);
  }, [camera, containerRef, pins]);

  // ── Register projectPins with parent animation loop ──
  useEffect(() => {
    return registerFrameCallback(projectPins);
  }, [registerFrameCallback, projectPins]);

  // ── Hover via marker manager ──
  useEffect(() => {
    markerManagerRef.current?.setHover(hoveredPin);
  }, [hoveredPin]);

  // ── Mouse -> NDC conversion ──
  const getMouseNDC = useCallback((e: MouseEvent | React.MouseEvent): THREE.Vector2 => {
    if (!containerRef.current) return _ndcVec2.set(0, 0);
    const rect = containerRef.current.getBoundingClientRect();
    return _ndcVec2.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }, [containerRef]);

  // ── Click handler ──
  const handleCanvasClick = useCallback((e: MouseEvent) => {
    if (!camera || !scene) return;

    const ndc = getMouseNDC(e);
    raycasterRef.current.setFromCamera(ndc, camera);

    if (markerManagerRef.current) {
      const hitPinId = markerManagerRef.current.getHitPin(raycasterRef.current);
      if (hitPinId) {
        setActivePin(activePin === hitPinId ? null : hitPinId);
        return;
      }
    }

    if (mode === 'edit' && isPlacing && modelMeshes.length > 0) {
      const hits = raycasterRef.current.intersectObjects(modelMeshes, true);
      if (hits.length > 0) {
        const hit = hits[0];
        const point = hit.point.clone();
        const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize() : new THREE.Vector3(0, 1, 0);

        setPlacementPoint({ geometry: point, normal });
        setShowForm(true);
        setIsPlacing(false);
      }
    } else {
      setActivePin(null);
    }
  }, [camera, scene, mode, isPlacing, modelMeshes, activePin, getMouseNDC]);

  // ── Mouse move for hover ──
  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (!camera || !markerManagerRef.current) return;

    const now = performance.now();
    if (now - lastMoveTimeRef.current < MOVE_THROTTLE_MS) return;
    lastMoveTimeRef.current = now;

    const ndc = getMouseNDC(e);
    raycasterRef.current.setFromCamera(ndc, camera);
    const hitId = markerManagerRef.current.getHitPin(raycasterRef.current);
    setHoveredPin(hitId);

    if (containerRef.current) {
      if (isPlacing) {
        containerRef.current.style.cursor = 'crosshair';
      } else if (hitId) {
        containerRef.current.style.cursor = 'pointer';
      } else {
        containerRef.current.style.cursor = '';
      }
    }
  }, [camera, isPlacing, getMouseNDC, containerRef]);

  // ── Attach/detach event listeners ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('click', handleCanvasClick);
    el.addEventListener('mousemove', handleCanvasMouseMove);

    return () => {
      el.removeEventListener('click', handleCanvasClick);
      el.removeEventListener('mousemove', handleCanvasMouseMove);
    };
  }, [handleCanvasClick, handleCanvasMouseMove, containerRef]);

  // ── Create pin (uses PinFormData from extracted component) ──
  const handleCreatePin = useCallback(async (formData: PinFormData) => {
    if (!placementPoint) return;

    try {
      const created = await createModel3DPin({
        model_id: modelId,
        geometry: {
          x: parseFloat(placementPoint.geometry.x.toFixed(4)),
          y: parseFloat(placementPoint.geometry.y.toFixed(4)),
          z: parseFloat(placementPoint.geometry.z.toFixed(4)),
        },
        normal: {
          x: parseFloat(placementPoint.normal.x.toFixed(4)),
          y: parseFloat(placementPoint.normal.y.toFixed(4)),
          z: parseFloat(placementPoint.normal.z.toFixed(4)),
        },
        title: formData.label,
        description: formData.description,
        pin_type: 'point',
        color: formData.color,
        keyword_id: formData.keyword_id,
      });
      setPins(prev => [...prev, created]);
      toast.success('Pin creado');
      setShowForm(false);
      setPlacementPoint(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear pin');
    }
  }, [modelId, placementPoint]);

  // ── Delete pin ──
  const handleDeletePin = useCallback(async (pinId: string) => {
    try {
      await deleteModel3DPin(pinId);
      setPins(prev => prev.filter(p => p.id !== pinId));
      setActivePin(null);
      toast.success('Pin eliminado');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }, []);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      markerManagerRef.current?.dispose();
      markerManagerRef.current = null;
    };
  }, []);

  // ── Ref callback for pin overlay divs ──
  const setPinOverlayRef = useCallback((pinId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      pinOverlayRefs.current.set(pinId, el);
    } else {
      pinOverlayRefs.current.delete(pinId);
    }
  }, []);

  return (
    <>
      {/* ── Professor: Place pin button ── */}
      {mode === 'edit' && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <button
            onClick={() => { setIsPlacing(!isPlacing); setShowForm(false); setPlacementPoint(null); }}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border',
              isPlacing
                ? 'bg-[#2a8c7a]/30 text-[#5cbdaa] border-[#2a8c7a]/40 animate-pulse'
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white',
            )}
          >
            <MapPin size={12} />
            {isPlacing ? 'Click en el modelo...' : 'Colocar Pin'}
          </button>

          {/* Pin count */}
          {pins.length > 0 && (
            <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[9px] text-gray-500">
              {pins.length} pin{pins.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* ── Student: Pin visibility toggle ── */}
      {mode === 'view' && pins.length > 0 && (
        <div className="absolute top-3 left-3 z-20">
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <MapPin size={12} />
            {pins.length} punto{pins.length !== 1 ? 's' : ''} de referencia
          </span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 text-[10px] text-gray-300">
          <Loader2 size={12} className="animate-spin" />
          Cargando pins...
        </div>
      )}

      {/* ── Pin overlays (2D projected via imperative DOM positioning) ── */}
      {pins.map(pin => {
        const isActive = activePin === pin.id;
        const isHovered = hoveredPin === pin.id;

        return (
          <div
            key={pin.id}
            ref={setPinOverlayRef(pin.id)}
            className="absolute left-0 top-0 z-10 pointer-events-none"
            style={{ display: 'none' }}
          >
            {/* Label on hover */}
            {(isHovered && !isActive && pin.title) && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                <div className="px-2 py-1 rounded-md bg-black/90 text-[9px] text-white border border-white/10">
                  {pin.title}
                </div>
              </div>
            )}

            {/* Active popup */}
            {isActive && (
              <div
                className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-auto bg-black/90 rounded-lg border border-white/15 p-3 min-w-[220px] max-w-[280px] shadow-2xl z-30"
                style={{ borderLeftColor: pin.color || '#60a5fa', borderLeftWidth: 3 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pin.color || '#60a5fa' }} />
                    <h4 className="text-xs font-bold text-white">{pin.title || 'Pin'}</h4>
                  </div>
                  <button
                    onClick={() => setActivePin(null)}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>

                {pin.description && (
                  <p className="text-[10px] text-gray-400 leading-relaxed mb-2">{pin.description}</p>
                )}

                {/* F1 Keyword link badge */}
                {pin.keyword_id && (
                  <div className="mb-2 px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20">
                    <span className="text-[8px] text-violet-400 flex items-center gap-1">
                      <Link2 size={8} />
                      Keyword vinculado
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {pin.pin_type && (
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded">
                      {PIN_TYPE_DISPLAY[pin.pin_type] || pin.pin_type}
                    </span>
                  )}
                  {mode === 'edit' && (
                    <button
                      onClick={() => handleDeletePin(pin.id)}
                      className="text-[9px] text-red-400 hover:text-red-300 transition-colors ml-auto"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Pin creation form (professor) — Sprint 1: extracted component ── */}
      {showForm && placementPoint && (
        <PinCreationForm
          onSubmit={handleCreatePin}
          onCancel={() => { setShowForm(false); setPlacementPoint(null); }}
          geometry={placementPoint.geometry}
          topicId={topicId}
        />
      )}
    </>
  );
}
