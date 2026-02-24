// ============================================================
// Axon — PinSystem
//
// React component managing pin interactions in the 3D viewer.
//
// PROFESSOR mode="edit":
//   Click surface → raycast → get geometry + normal → inline form → POST /model-3d-pins
//
// STUDENT mode="view":
//   See pin markers, hover tooltip, click → popup with info
//
// Pin types: "info" (label), "keyword" (→ future KeywordPopup),
//            "annotation" (long note), "quiz" (future)
//
// Renders HTML overlays positioned via 3D→2D projection.
// Uses PinMarkerManager to render 3D meshes in the scene.
// ============================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as THREE from 'three';
import clsx from 'clsx';
import { MapPin, Plus, X, Save, Loader2, Info, Tag, FileText, Zap, Search } from 'lucide-react';
import { toast } from 'sonner';
import {
  getModel3DPins, createModel3DPin, updateModel3DPin, deleteModel3DPin,
} from '@/app/services/models3dApi';
import type { Model3DPin } from '@/app/services/models3dApi';
import { PinMarkerManager } from './PinMarker3D';
import type { PinMarkerData } from './PinMarker3D';

// ── Types ──

export type PinMode = 'view' | 'edit';

interface PinSystemProps {
  modelId: string;
  mode: PinMode;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Meshes in the scene that are the "model" (for raycasting surface clicks) */
  modelMeshes: THREE.Object3D[];
}

// Pin type config
const PIN_TYPES = [
  { value: 'info', label: 'Info', icon: Info, color: '#60a5fa' },
  { value: 'keyword', label: 'Keyword', icon: Tag, color: '#a78bfa' },
  { value: 'annotation', label: 'Anotacion', icon: FileText, color: '#34d399' },
  { value: 'quiz', label: 'Quiz', icon: Zap, color: '#fbbf24' },
] as const;

// ══════════════════════════════════════════════
// ── PinSystem Component ──
// ══════════════════════════════════════════════

export function PinSystem({ modelId, mode, scene, camera, containerRef, modelMeshes }: PinSystemProps) {
  const [pins, setPins] = useState<Model3DPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);

  // Professor: placement state
  const [isPlacing, setIsPlacing] = useState(false);
  const [placementPoint, setPlacementPoint] = useState<{ geometry: THREE.Vector3; normal: THREE.Vector3 } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // 2D projected positions
  const [projectedPins, setProjectedPins] = useState<Map<string, { x: number; y: number; visible: boolean }>>(new Map());

  // Pin marker manager ref
  const markerManagerRef = useRef<PinMarkerManager | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // ── Fetch pins ──
  const fetchPins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getModel3DPins(modelId);
      setPins(res?.items || []);
    } catch (err: any) {
      console.error('[PinSystem] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => { fetchPins(); }, [fetchPins]);

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
        label: pin.label || undefined,
      };
      mgr.addPin(data);
    });

    return () => {
      mgr.clear();
    };
  }, [scene, pins]);

  // ── Project pins to 2D each frame (called from parent animation loop) ──
  const projectPins = useCallback(() => {
    if (!camera || !containerRef.current || pins.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const map = new Map<string, { x: number; y: number; visible: boolean }>();

    pins.forEach(pin => {
      const vec = new THREE.Vector3(pin.geometry.x, pin.geometry.y, pin.geometry.z);
      vec.project(camera);
      map.set(pin.id, {
        x: (vec.x * 0.5 + 0.5) * rect.width,
        y: (-vec.y * 0.5 + 0.5) * rect.height,
        visible: vec.z < 1,
      });
    });

    setProjectedPins(map);

    // Update billboard rotations
    markerManagerRef.current?.updateBillboards(camera);
  }, [camera, containerRef, pins]);

  // Expose projectPins for parent to call in animation loop
  useEffect(() => {
    // Store on container element for parent to find
    if (containerRef.current) {
      (containerRef.current as any).__pinSystemProject = projectPins;
    }
    return () => {
      if (containerRef.current) {
        delete (containerRef.current as any).__pinSystemProject;
      }
    };
  }, [projectPins, containerRef]);

  // ── Hover via marker manager ──
  useEffect(() => {
    markerManagerRef.current?.setHover(hoveredPin);
  }, [hoveredPin]);

  // ── Mouse → NDC conversion ──
  const getMouseNDC = useCallback((e: MouseEvent | React.MouseEvent): THREE.Vector2 => {
    if (!containerRef.current) return new THREE.Vector2();
    const rect = containerRef.current.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }, [containerRef]);

  // ── Click handler (edit mode: place pin / view mode: select pin) ──
  const handleCanvasClick = useCallback((e: MouseEvent) => {
    if (!camera || !scene) return;

    const ndc = getMouseNDC(e);
    raycasterRef.current.setFromCamera(ndc, camera);

    // First check if we hit a pin marker
    if (markerManagerRef.current) {
      const hitPinId = markerManagerRef.current.getHitPin(raycasterRef.current);
      if (hitPinId) {
        setActivePin(activePin === hitPinId ? null : hitPinId);
        return;
      }
    }

    // In edit mode with placing active: raycast against model surface
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
      // Click on empty space → deselect
      setActivePin(null);
    }
  }, [camera, scene, mode, isPlacing, modelMeshes, activePin, getMouseNDC]);

  // ── Mouse move for hover ──
  const handleCanvasMouseMove = useCallback((e: MouseEvent) => {
    if (!camera || !markerManagerRef.current) return;

    const ndc = getMouseNDC(e);
    raycasterRef.current.setFromCamera(ndc, camera);
    const hitId = markerManagerRef.current.getHitPin(raycasterRef.current);
    setHoveredPin(hitId);

    // Cursor hint
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

  // ── Create pin ──
  const handleCreatePin = useCallback(async (formData: {
    label: string;
    description: string;
    pin_type: string;
    color: string;
  }) => {
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
        label: formData.label,
        description: formData.description,
        pin_type: formData.pin_type as any,
        color: formData.color,
      });
      setPins(prev => [...prev, created]);
      toast.success('Pin creado');
      setShowForm(false);
      setPlacementPoint(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear pin');
    }
  }, [modelId, placementPoint]);

  // ── Delete pin ──
  const handleDeletePin = useCallback(async (pinId: string) => {
    try {
      await deleteModel3DPin(pinId);
      setPins(prev => prev.filter(p => p.id !== pinId));
      setActivePin(null);
      toast.success('Pin eliminado');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  }, []);

  // ── Get active pin data ──
  const activePinData = useMemo(() => {
    if (!activePin) return null;
    return pins.find(p => p.id === activePin) || null;
  }, [activePin, pins]);

  const activePinPos = activePin ? projectedPins.get(activePin) : null;

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      markerManagerRef.current?.dispose();
      markerManagerRef.current = null;
    };
  }, []);

  return (
    <>
      {/* ── Professor: Place pin button ── */}
      {mode === 'edit' && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <button
            onClick={() => { setIsPlacing(!isPlacing); setShowForm(false); setPlacementPoint(null); }}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border',
              isPlacing
                ? 'bg-teal-500/30 text-teal-300 border-teal-500/40 animate-pulse'
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
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-sm">
            <MapPin size={12} />
            {pins.length} punto{pins.length !== 1 ? 's' : ''} de referencia
          </span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-[10px] text-gray-300">
          <Loader2 size={12} className="animate-spin" />
          Cargando pins...
        </div>
      )}

      {/* ── Pin tooltips (2D projected overlays) ── */}
      {projectedPins.size > 0 && pins.map(pin => {
        const pos = projectedPins.get(pin.id);
        if (!pos || !pos.visible) return null;

        const isActive = activePin === pin.id;
        const isHovered = hoveredPin === pin.id;

        return (
          <div
            key={pin.id}
            className="absolute z-10 pointer-events-none"
            style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
          >
            {/* Label on hover */}
            {(isHovered && !isActive && pin.label) && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                <div className="px-2 py-1 rounded-md bg-black/80 backdrop-blur-sm text-[9px] text-white border border-white/10">
                  {pin.label}
                </div>
              </div>
            )}

            {/* Active popup */}
            {isActive && (
              <div
                className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-auto bg-black/90 backdrop-blur-xl rounded-lg border border-white/15 p-3 min-w-[220px] max-w-[280px] shadow-2xl z-30"
                style={{ borderLeftColor: pin.color || '#60a5fa', borderLeftWidth: 3 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pin.color || '#60a5fa' }} />
                    <h4 className="text-xs font-bold text-white">{pin.label || 'Pin'}</h4>
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

                <div className="flex items-center gap-2">
                  {pin.pin_type && (
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded">
                      {pin.pin_type}
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

      {/* ── Pin creation form (professor) ── */}
      {showForm && placementPoint && (
        <PinCreationForm
          onSubmit={handleCreatePin}
          onCancel={() => { setShowForm(false); setPlacementPoint(null); }}
          geometry={placementPoint.geometry}
        />
      )}
    </>
  );
}


// ══════════════════════════════════════════════
// ── Pin Creation Form (inline floating) ──
// ══════════════════════════════════════════════

function PinCreationForm({
  onSubmit,
  onCancel,
  geometry,
}: {
  onSubmit: (data: { label: string; description: string; pin_type: string; color: string }) => Promise<void>;
  onCancel: () => void;
  geometry: THREE.Vector3;
}) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [pinType, setPinType] = useState('info');
  const [saving, setSaving] = useState(false);

  const selectedType = PIN_TYPES.find(t => t.value === pinType) || PIN_TYPES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        label: label.trim(),
        description: description.trim(),
        pin_type: pinType,
        color: selectedType.color,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-80">
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900/95 backdrop-blur-xl rounded-xl border border-white/10 p-4 shadow-2xl space-y-3"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <MapPin size={12} className="text-teal-400" />
            Nuevo Pin
          </h4>
          <button type="button" onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Coordinates preview */}
        <div className="flex items-center gap-2 text-[9px] text-gray-500 font-mono">
          <span>x:{geometry.x.toFixed(2)}</span>
          <span>y:{geometry.y.toFixed(2)}</span>
          <span>z:{geometry.z.toFixed(2)}</span>
        </div>

        {/* Pin type selector */}
        <div className="flex gap-1">
          {PIN_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setPinType(t.value)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border',
                pinType === t.value
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-transparent bg-white/5 text-gray-500 hover:text-gray-300',
              )}
            >
              <t.icon size={10} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Label */}
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nombre del punto..."
          autoFocus
          className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/30 focus:border-teal-500/30"
          required
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripcion (opcional)..."
          rows={2}
          className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/30 focus:border-teal-500/30 resize-none"
        />

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-[10px] text-gray-500 hover:text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!label.trim() || saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
            Crear Pin
          </button>
        </div>
      </form>
    </div>
  );
}
