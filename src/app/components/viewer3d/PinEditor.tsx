// ============================================================
// Axon — PinEditor (Professor side panel)
//
// Lists all pins for a model with filter, click to animate camera
// to pin position, edit/delete pins, keyword autocomplete.
//
// PERFORMANCE (Paso 3):
//   Fetches its own pins via modelId (only when panel is open).
//   Synchronized with PinSystem via onPinsChanged callback
//   that increments a shared refreshKey in the parent.
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapPin, Search, Pencil, Trash2, X, Save, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { updateModel3DPin, deleteModel3DPin } from '@/app/lib/model3d-api';
import type { Model3DPin } from '@/app/lib/model3d-api';
import { usePinData } from '@/app/hooks/usePinData';

// ── Pin type labels (DB types + legacy for backward compat) ──
const PIN_TYPE_LABELS: Record<string, string> = {
  // DB canonical types
  point: 'Punto',
  line: 'Linea',
  area: 'Area',
  // Legacy UI types (for any old cached data)
  info: 'Info',
  keyword: 'Keyword',
  annotation: 'Anotacion',
  quiz: 'Quiz',
  label: 'Etiqueta',
  link: 'Enlace',
};

interface PinEditorProps {
  modelId: string;
  onPinsChanged: () => void;
  camera: THREE.PerspectiveCamera | null;
  controls: OrbitControlsType | null;
  onClose: () => void;
}

export function PinEditor({ modelId, onPinsChanged, camera, controls, onClose }: PinEditorProps) {
  // M5 audit: pin data layer extracted to shared hook (dedup with PinSystem)
  const { pins, loading, setPins } = usePinData(modelId, { tag: 'PinEditor' });

  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter pins
  const filtered = useMemo(() => {
    if (!filter.trim()) return pins;
    const q = filter.toLowerCase();
    return pins.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.pin_type || '').toLowerCase().includes(q),
    );
  }, [pins, filter]);

  // Animate camera to pin
  const flyToPin = useCallback((pin: Model3DPin) => {
    if (!camera || !controls) return;

    const target = new THREE.Vector3(pin.geometry.x, pin.geometry.y, pin.geometry.z);
    const normal = pin.normal
      ? new THREE.Vector3(pin.normal.x, pin.normal.y, pin.normal.z)
      : new THREE.Vector3(0, 0, 1);

    // Position camera along the normal, at a reasonable distance
    const cameraTarget = target.clone().add(normal.clone().multiplyScalar(2.5));

    // Smooth animation via GSAP-like manual tween
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 600; // ms
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic

      camera!.position.lerpVectors(startPos, cameraTarget, ease);
      controls!.target.lerpVectors(startTarget, target, ease);
      controls!.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [camera, controls]);

  // Start editing
  const startEdit = useCallback((pin: Model3DPin) => {
    setEditingId(pin.id);
    setEditLabel(pin.title || '');
    setEditDesc(pin.description || '');
  }, []);

  // Save edit
  const saveEdit = useCallback(async (pinId: string) => {
    setSaving(true);
    try {
      await updateModel3DPin(pinId, {
        title: editLabel.trim() || undefined,
        description: editDesc.trim() || undefined,
      });
      // Optimistic update locally
      setPins(prev => prev.map(p =>
        p.id === pinId
          ? { ...p, title: editLabel.trim() || p.title, description: editDesc.trim() || p.description }
          : p,
      ));
      toast.success('Pin actualizado');
      setEditingId(null);
      onPinsChanged(); // Signal parent → PinSystem refetches
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  }, [editLabel, editDesc, onPinsChanged]);

  // Delete
  const handleDelete = useCallback(async (pinId: string) => {
    if (!confirm('¿Eliminar este pin?')) return;
    try {
      await deleteModel3DPin(pinId);
      // Optimistic update locally
      setPins(prev => prev.filter(p => p.id !== pinId));
      toast.success('Pin eliminado');
      onPinsChanged(); // Signal parent → PinSystem refetches
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }, [onPinsChanged]);

  return (
    <div className="absolute top-0 right-0 z-20 w-72 h-full bg-zinc-900 border-l border-white/10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          <MapPin size={13} className="text-[#5cbdaa]" />
          Pins ({pins.length})
        </h4>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      {pins.length > 3 && (
        <div className="px-3 py-2 border-b border-white/5">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar pins..."
              className="w-full pl-7 pr-3 py-1.5 text-[10px] bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2a8c7a]/30"
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="animate-spin text-gray-500" />
        </div>
      )}

      {/* Pin list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!loading && filtered.length === 0 && (
          <div className="text-center py-8">
            <MapPin size={20} className="mx-auto text-gray-700 mb-2" />
            <p className="text-[10px] text-gray-600">
              {pins.length === 0 ? 'Sin pins. Usa "Colocar Pin" para crear.' : 'Sin resultados.'}
            </p>
          </div>
        )}

        {filtered.map(pin => (
          <div
            key={pin.id}
            className="group rounded-lg hover:bg-white/5 transition-colors"
          >
            {editingId === pin.id ? (
              // Edit mode
              <div className="p-2.5 space-y-2 bg-white/5 rounded-lg border border-white/10">
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Label..."
                  className="w-full px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2a8c7a]/30"
                  autoFocus
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Descripcion..."
                  rows={2}
                  className="w-full px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2a8c7a]/30 resize-none"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-2 py-1 text-[9px] text-gray-500 hover:text-white rounded transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => saveEdit(pin.id)}
                    disabled={saving}
                    className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-white bg-[#2a8c7a] hover:bg-[#244e47] rounded transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={8} className="animate-spin" /> : <Save size={8} />}
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <div className="flex items-center gap-2 p-2.5">
                {/* Color dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                  style={{ backgroundColor: pin.color || '#60a5fa' }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white truncate">{pin.title || 'Sin nombre'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8px] text-gray-500 uppercase">
                      {PIN_TYPE_LABELS[pin.pin_type || ''] || pin.pin_type}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => flyToPin(pin)}
                    className="p-1 text-gray-500 hover:text-[#5cbdaa] rounded transition-colors"
                    title="Ir al pin"
                  >
                    <Eye size={11} />
                  </button>
                  <button
                    onClick={() => startEdit(pin)}
                    className="p-1 text-gray-500 hover:text-white rounded transition-colors"
                    title="Editar"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(pin.id)}
                    className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}