// ============================================================
// Axon — PinEditor (Professor side panel)
//
// Lists all pins for a model with filter, click to animate camera
// to pin position, edit/delete pins, keyword autocomplete.
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsType } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapPin, Search, Pencil, Trash2, X, Save, Loader2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { updateModel3DPin, deleteModel3DPin } from '@/app/services/models3dApi';
import type { Model3DPin } from '@/app/services/models3dApi';

// ── Pin type labels ──
const PIN_TYPE_LABELS: Record<string, string> = {
  info: 'Info',
  keyword: 'Keyword',
  annotation: 'Anotacion',
  quiz: 'Quiz',
  label: 'Etiqueta',
  link: 'Enlace',
};

interface PinEditorProps {
  pins: Model3DPin[];
  onPinsChanged: () => void;
  camera: THREE.PerspectiveCamera | null;
  controls: OrbitControlsType | null;
  onClose: () => void;
}

export function PinEditor({ pins, onPinsChanged, camera, controls, onClose }: PinEditorProps) {
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
      (p.label || '').toLowerCase().includes(q) ||
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
    setEditLabel(pin.label || '');
    setEditDesc(pin.description || '');
  }, []);

  // Save edit
  const saveEdit = useCallback(async (pinId: string) => {
    setSaving(true);
    try {
      await updateModel3DPin(pinId, {
        label: editLabel.trim() || undefined,
        description: editDesc.trim() || undefined,
      });
      toast.success('Pin actualizado');
      setEditingId(null);
      onPinsChanged();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  }, [editLabel, editDesc, onPinsChanged]);

  // Delete
  const handleDelete = useCallback(async (pinId: string) => {
    if (!confirm('¿Eliminar este pin?')) return;
    try {
      await deleteModel3DPin(pinId);
      toast.success('Pin eliminado');
      onPinsChanged();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  }, [onPinsChanged]);

  return (
    <div className="absolute top-0 right-0 z-20 w-72 h-full bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          <MapPin size={13} className="text-teal-400" />
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
              className="w-full pl-7 pr-3 py-1.5 text-[10px] bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
            />
          </div>
        </div>
      )}

      {/* Pin list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 && (
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
                  className="w-full px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
                  autoFocus
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Descripcion..."
                  rows={2}
                  className="w-full px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/30 resize-none"
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
                    className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-white bg-teal-600 hover:bg-teal-500 rounded transition-colors disabled:opacity-50"
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
                  <p className="text-[11px] text-white truncate">{pin.label || 'Sin nombre'}</p>
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
                    className="p-1 text-gray-500 hover:text-teal-400 rounded transition-colors"
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
