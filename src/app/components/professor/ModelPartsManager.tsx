// ============================================================
// Axon — ModelPartsManager (Professor) — MODULARIZED
//
// CRUD for model parts and layers via backend API.
// Sub-modules extracted in Sprint 1:
//   - parts-manager/AddLayerDialog.tsx
//   - parts-manager/AddPartDialog.tsx
//   - parts-manager/PartRow.tsx
//   - parts-manager/LayerEditInline.tsx
//
// Uses API-first persistence (POST/PUT/DELETE to /model-layers,
// /model-parts) with localStorage write-through cache for
// instant UI updates and offline fallback.
// ============================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Layers, Plus, Trash2, Pencil,
  ChevronDown, ChevronRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getStoredParts, setStoredParts, getStoredLayers, setStoredLayers,
  fetchPartsFromAPI, fetchLayersFromAPI,
} from '@/app/components/viewer3d/ModelPartMesh';
import type { ModelPartConfig, ModelLayerConfig } from '@/app/components/viewer3d/ModelPartMesh';
import {
  createModelLayer, updateModelLayer, deleteModelLayer as apiDeleteLayer,
  createModelPart, updateModelPart, deleteModelPart as apiDeletePart,
} from '@/app/lib/model3d-api';
// Sprint 1: extracted sub-components
import { AddLayerDialog, AddPartDialog, PartRow, LayerEditInline } from './parts-manager';

// ══════════════════════════════════════════════
// ── Props ──
// ══════════════════════════════════════════════

interface ModelPartsManagerProps {
  modelId: string;
  modelName: string;
}

export function ModelPartsManager({ modelId, modelName }: ModelPartsManagerProps) {
  const [parts, setParts] = useState<ModelPartConfig[]>(() => getStoredParts(modelId));
  const [layers, setLayers] = useState<ModelLayerConfig[]>(() => getStoredLayers(modelId));
  const [loading, setLoading] = useState(true);

  // UI state
  const [showAddPart, setShowAddPart] = useState(false);
  const [showAddLayer, setShowAddLayer] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [collapsedLayers, setCollapsedLayers] = useState<Set<string>>(new Set());

  // ── Fetch from API on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [apiParts, apiLayers] = await Promise.all([
          fetchPartsFromAPI(modelId),
          fetchLayersFromAPI(modelId),
        ]);
        if (!cancelled) {
          setParts(apiParts);
          setLayers(apiLayers);
        }
      } catch {
        // Keep localStorage data on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [modelId]);

  // ── Layer CRUD (API-backed) ──
  const addLayer = useCallback(async (name: string, color: string) => {
    try {
      const created = await createModelLayer({
        model_id: modelId,
        name: name.trim(),
        color_hex: color,
        order_index: layers.length,
      });
      const newLayer: ModelLayerConfig = {
        id: created.id,
        name: created.name,
        color_hex: created.color_hex || color,
        order_index: created.order_index,
      };
      const next = [...layers, newLayer];
      setLayers(next);
      setStoredLayers(modelId, next);
      setShowAddLayer(false);
      toast.success(`Capa "${name}" creada`);
    } catch (err: unknown) {
      toast.error(`Error al crear capa: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [layers, modelId]);

  const handleUpdateLayer = useCallback(async (id: string, updates: Partial<ModelLayerConfig>) => {
    try {
      await updateModelLayer(id, {
        name: updates.name,
        color_hex: updates.color_hex,
        order_index: updates.order_index,
      });
      const next = layers.map(l => l.id === id ? { ...l, ...updates } : l);
      setLayers(next);
      setStoredLayers(modelId, next);
      setEditingLayerId(null);
      toast.success('Capa actualizada');
    } catch (err: unknown) {
      toast.error(`Error al actualizar capa: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [layers, modelId]);

  const handleDeleteLayer = useCallback(async (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    const hasParts = parts.some(p => p.layer_group === layer.name);
    if (hasParts) {
      toast.error('Elimina las partes de esta capa primero');
      return;
    }
    try {
      await apiDeleteLayer(id);
      const next = layers.filter(l => l.id !== id);
      setLayers(next);
      setStoredLayers(modelId, next);
      toast.success('Capa eliminada');
    } catch (err: unknown) {
      toast.error(`Error al eliminar capa: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [layers, parts, modelId]);

  // ── Part CRUD (API-backed) ──
  const addPart = useCallback(async (data: { name: string; file_url: string; layer_group: string; color_hex: string; opacity_default: number }) => {
    try {
      const created = await createModelPart({
        model_id: modelId,
        name: data.name.trim(),
        layer_group: data.layer_group,
        file_url: data.file_url.trim(),
        color_hex: data.color_hex,
        opacity_default: data.opacity_default,
        order_index: parts.filter(p => p.layer_group === data.layer_group).length,
      });
      const newPart: ModelPartConfig = {
        id: created.id,
        name: created.name,
        layer_group: created.layer_group || data.layer_group,
        file_url: created.file_url || data.file_url,
        color_hex: created.color_hex || data.color_hex,
        opacity_default: created.opacity_default ?? data.opacity_default,
        order_index: created.order_index,
      };
      const next = [...parts, newPart];
      setParts(next);
      setStoredParts(modelId, next);
      setShowAddPart(false);
      toast.success(`Parte "${data.name}" agregada`);
    } catch (err: unknown) {
      toast.error(`Error al crear parte: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [parts, modelId]);

  const handleUpdatePart = useCallback(async (id: string, updates: Partial<ModelPartConfig>) => {
    try {
      await updateModelPart(id, {
        name: updates.name,
        layer_group: updates.layer_group,
        file_url: updates.file_url,
        color_hex: updates.color_hex,
        opacity_default: updates.opacity_default,
        order_index: updates.order_index,
      });
      const next = parts.map(p => p.id === id ? { ...p, ...updates } : p);
      setParts(next);
      setStoredParts(modelId, next);
      setEditingPartId(null);
      toast.success('Parte actualizada');
    } catch (err: unknown) {
      toast.error(`Error al actualizar parte: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [parts, modelId]);

  const handleDeletePart = useCallback(async (id: string) => {
    try {
      await apiDeletePart(id);
      const next = parts.filter(p => p.id !== id);
      setParts(next);
      setStoredParts(modelId, next);
      toast.success('Parte eliminada');
    } catch (err: unknown) {
      toast.error(`Error al eliminar parte: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [parts, modelId]);

  // ── Group parts by layer ──
  const partsByLayer = useMemo(() => {
    const map: Map<string, ModelPartConfig[]> = new Map();
    for (const layer of layers) {
      map.set(layer.name, []);
    }
    for (const part of parts) {
      if (!map.has(part.layer_group)) map.set(part.layer_group, []);
      map.get(part.layer_group)!.push(part);
    }
    return map;
  }, [parts, layers]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers size={16} className="text-teal-400" />
          Capas y Partes
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAddLayer(true)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-lg hover:bg-teal-500/20 transition-colors"
          >
            <Plus size={10} /> Capa
          </button>
          <button
            onClick={() => setShowAddPart(true)}
            disabled={layers.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[#5cbdaa] bg-[#2a8c7a]/10 border border-[#2a8c7a]/20 rounded-lg hover:bg-[#2a8c7a]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={10} /> Parte
          </button>
        </div>
      </div>

      {/* Info banner */}
      {parts.length === 0 && layers.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
          <Layers size={28} className="mx-auto text-gray-700 mb-2" />
          <p className="text-xs text-gray-500 mb-1">Sin capas ni partes configuradas.</p>
          <p className="text-[10px] text-gray-600">
            Crea capas (ej: Huesos, Musculos, Nervios) y agrega partes .glb a cada una.
          </p>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 size={14} className="animate-spin text-teal-400" />
          <span className="text-[10px] text-gray-500">Cargando capas y partes...</span>
        </div>
      )}

      {/* Layers */}
      {layers.map(layer => {
        const layerParts = partsByLayer.get(layer.name) || [];
        const isCollapsed = collapsedLayers.has(layer.id);
        const isEditing = editingLayerId === layer.id;

        return (
          <div key={layer.id} className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
            {/* Layer header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
              <button
                onClick={() => setCollapsedLayers(prev => {
                  const n = new Set(prev);
                  n.has(layer.id) ? n.delete(layer.id) : n.add(layer.id);
                  return n;
                })}
                className="text-gray-600 hover:text-white transition-colors"
              >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>

              <div
                className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                style={{ backgroundColor: layer.color_hex }}
              />

              {isEditing ? (
                <LayerEditInline
                  layer={layer}
                  onSave={(name, color) => handleUpdateLayer(layer.id, { name, color_hex: color })}
                  onCancel={() => setEditingLayerId(null)}
                />
              ) : (
                <>
                  <span className="flex-1 text-[11px] font-semibold text-white">{layer.name}</span>
                  <span className="text-[9px] text-gray-600">{layerParts.length} parte{layerParts.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={() => setEditingLayerId(layer.id)}
                    className="p-1 text-gray-600 hover:text-white rounded transition-colors"
                  >
                    <Pencil size={10} />
                  </button>
                  <button
                    onClick={() => handleDeleteLayer(layer.id)}
                    className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors"
                  >
                    <Trash2 size={10} />
                  </button>
                </>
              )}
            </div>

            {/* Parts in layer */}
            {!isCollapsed && (
              <div className="p-2 space-y-1">
                {layerParts.length === 0 && (
                  <p className="text-center py-3 text-[10px] text-gray-600">
                    Sin partes. Agrega una parte .glb.
                  </p>
                )}
                {layerParts.map(part => (
                  <PartRow
                    key={part.id}
                    part={part}
                    isEditing={editingPartId === part.id}
                    layers={layers}
                    onStartEdit={() => setEditingPartId(part.id)}
                    onSave={(updates) => handleUpdatePart(part.id, updates)}
                    onCancelEdit={() => setEditingPartId(null)}
                    onDelete={() => handleDeletePart(part.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Add Layer dialog ── */}
      {showAddLayer && (
        <AddLayerDialog
          existingNames={layers.map(l => l.name)}
          onAdd={addLayer}
          onCancel={() => setShowAddLayer(false)}
        />
      )}

      {/* ── Add Part dialog ── */}
      {showAddPart && (
        <AddPartDialog
          layers={layers}
          onAdd={addPart}
          onCancel={() => setShowAddPart(false)}
        />
      )}

      {/* Storage info */}
      {(parts.length > 0 || layers.length > 0) && (
        <p className="text-[8px] text-gray-700 text-center flex items-center justify-center gap-1">
          Datos sincronizados con el servidor
        </p>
      )}
    </div>
  );
}
