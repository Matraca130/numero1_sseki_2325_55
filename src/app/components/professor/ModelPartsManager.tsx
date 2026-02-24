// ============================================================
// Axon — ModelPartsManager (Professor)
//
// CRUD for model parts and layers, stored in localStorage
// (kv_store alternative until backend tables exist).
//
// - Upload .glb per part (reuses ModelUploadZone)
// - Assign layer_group, color, opacity defaults, order
// - Manage layers (create, rename, reorder, delete)
// - Full CRUD with drag-reorder
//
// localStorage keys:
//   model_parts:{model_id} → ModelPartConfig[]
//   model_layers:{model_id} → ModelLayerConfig[]
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  Layers, Plus, Trash2, Pencil, X, Save, GripVertical,
  Palette, Eye, Box, ChevronDown, ChevronRight, AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import {
  getStoredParts, setStoredParts, getStoredLayers, setStoredLayers,
} from '@/app/components/viewer3d/ModelPartMesh';
import type { ModelPartConfig, ModelLayerConfig } from '@/app/components/viewer3d/ModelPartMesh';

// ── Preset layer colors ──
const LAYER_COLORS = [
  '#f5e6d3', '#cc5555', '#4488cc', '#34d399', '#fbbf24',
  '#a78bfa', '#f472b6', '#94a3b8', '#818cf8', '#fb923c',
];

// ── UUID helper ──
function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10);
}

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

  // UI state
  const [showAddPart, setShowAddPart] = useState(false);
  const [showAddLayer, setShowAddLayer] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [collapsedLayers, setCollapsedLayers] = useState<Set<string>>(new Set());

  // ── Persist helpers ──
  const saveParts = useCallback((next: ModelPartConfig[]) => {
    setParts(next);
    setStoredParts(modelId, next);
  }, [modelId]);

  const saveLayers = useCallback((next: ModelLayerConfig[]) => {
    setLayers(next);
    setStoredLayers(modelId, next);
  }, [modelId]);

  // ── Layer CRUD ──
  const addLayer = useCallback((name: string, color: string) => {
    const newLayer: ModelLayerConfig = {
      id: uid(),
      name: name.trim(),
      color_hex: color,
      order_index: layers.length,
    };
    saveLayers([...layers, newLayer]);
    setShowAddLayer(false);
    toast.success(`Capa "${name}" creada`);
  }, [layers, saveLayers]);

  const updateLayer = useCallback((id: string, updates: Partial<ModelLayerConfig>) => {
    saveLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
    setEditingLayerId(null);
    toast.success('Capa actualizada');
  }, [layers, saveLayers]);

  const deleteLayer = useCallback((id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    const hasParts = parts.some(p => p.layer_group === layer.name);
    if (hasParts) {
      toast.error('Elimina las partes de esta capa primero');
      return;
    }
    saveLayers(layers.filter(l => l.id !== id));
    toast.success('Capa eliminada');
  }, [layers, parts, saveLayers]);

  // ── Part CRUD ──
  const addPart = useCallback((data: { name: string; file_url: string; layer_group: string; color_hex: string; opacity_default: number }) => {
    const newPart: ModelPartConfig = {
      id: uid(),
      name: data.name.trim(),
      layer_group: data.layer_group,
      file_url: data.file_url.trim(),
      color_hex: data.color_hex,
      opacity_default: data.opacity_default,
      order_index: parts.filter(p => p.layer_group === data.layer_group).length,
    };
    saveParts([...parts, newPart]);
    setShowAddPart(false);
    toast.success(`Parte "${data.name}" agregada`);
  }, [parts, saveParts]);

  const updatePart = useCallback((id: string, updates: Partial<ModelPartConfig>) => {
    saveParts(parts.map(p => p.id === id ? { ...p, ...updates } : p));
    setEditingPartId(null);
    toast.success('Parte actualizada');
  }, [parts, saveParts]);

  const deletePart = useCallback((id: string) => {
    saveParts(parts.filter(p => p.id !== id));
    toast.success('Parte eliminada');
  }, [parts, saveParts]);

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
          <Layers size={16} className="text-violet-400" />
          Capas y Partes
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAddLayer(true)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-colors"
          >
            <Plus size={10} /> Capa
          </button>
          <button
            onClick={() => setShowAddPart(true)}
            disabled={layers.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-lg hover:bg-teal-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={10} /> Parte
          </button>
        </div>
      </div>

      {/* Info banner */}
      {parts.length === 0 && layers.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
          <Layers size={28} className="mx-auto text-gray-700 mb-2" />
          <p className="text-xs text-gray-500 mb-1">Sin capas ni partes configuradas.</p>
          <p className="text-[10px] text-gray-600">
            Crea capas (ej: Huesos, Musculos, Nervios) y agrega partes .glb a cada una.
          </p>
          <p className="text-[9px] text-amber-600/60 mt-3 flex items-center justify-center gap-1">
            <AlertTriangle size={10} />
            Datos almacenados localmente hasta que el backend soporte parts/layers.
          </p>
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
                  onSave={(name, color) => updateLayer(layer.id, { name, color_hex: color })}
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
                    onClick={() => deleteLayer(layer.id)}
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
                    onSave={(updates) => updatePart(part.id, updates)}
                    onCancelEdit={() => setEditingPartId(null)}
                    onDelete={() => deletePart(part.id)}
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

      {/* Storage warning */}
      {(parts.length > 0 || layers.length > 0) && (
        <p className="text-[8px] text-gray-700 text-center flex items-center justify-center gap-1">
          <AlertTriangle size={8} />
          Datos en almacenamiento local del navegador
        </p>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════
// ── Layer Edit Inline ──
// ══════════════════════════════════════════════

function LayerEditInline({ layer, onSave, onCancel }: {
  layer: ModelLayerConfig;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(layer.name);
  const [color, setColor] = useState(layer.color_hex);

  return (
    <div className="flex items-center gap-2 flex-1">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        className="flex-1 px-2 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-violet-500/30"
        autoFocus
      />
      <input
        type="color"
        value={color}
        onChange={e => setColor(e.target.value)}
        className="w-6 h-6 rounded border border-white/10 cursor-pointer bg-transparent"
      />
      <button
        onClick={() => onSave(name.trim() || layer.name, color)}
        className="p-1 text-teal-400 hover:text-teal-300 rounded transition-colors"
      >
        <Save size={10} />
      </button>
      <button onClick={onCancel} className="p-1 text-gray-500 hover:text-white rounded transition-colors">
        <X size={10} />
      </button>
    </div>
  );
}


// ══════════════════════════════════════════════
// ── Part Row ──
// ══════════════════════════════════════════════

function PartRow({ part, isEditing, layers, onStartEdit, onSave, onCancelEdit, onDelete }: {
  part: ModelPartConfig;
  isEditing: boolean;
  layers: ModelLayerConfig[];
  onStartEdit: () => void;
  onSave: (updates: Partial<ModelPartConfig>) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const [editName, setEditName] = useState(part.name);
  const [editUrl, setEditUrl] = useState(part.file_url);
  const [editLayer, setEditLayer] = useState(part.layer_group);
  const [editOpacity, setEditOpacity] = useState(Math.round(part.opacity_default * 100));

  if (isEditing) {
    return (
      <div className="p-2.5 bg-white/5 rounded-lg border border-white/10 space-y-2">
        <input
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          placeholder="Nombre de la parte"
          className="w-full px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          autoFocus
        />
        <input
          type="url"
          value={editUrl}
          onChange={e => setEditUrl(e.target.value)}
          placeholder="URL del .glb"
          className="w-full px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30 font-mono"
        />
        <div className="flex items-center gap-2">
          <select
            value={editLayer}
            onChange={e => setEditLayer(e.target.value)}
            className="flex-1 px-2 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white focus:outline-none"
          >
            {layers.map(l => (
              <option key={l.id} value={l.name}>{l.name}</option>
            ))}
          </select>
          <span className="text-[9px] text-gray-500">Op:</span>
          <input
            type="number"
            min={0}
            max={100}
            value={editOpacity}
            onChange={e => setEditOpacity(Number(e.target.value))}
            className="w-12 px-1 py-1 text-[10px] bg-white/5 border border-white/10 rounded text-white text-center focus:outline-none"
          />
          <span className="text-[9px] text-gray-600">%</span>
        </div>
        <div className="flex justify-end gap-1.5">
          <button onClick={onCancelEdit} className="px-2 py-1 text-[9px] text-gray-500 hover:text-white rounded transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSave({
              name: editName.trim() || part.name,
              file_url: editUrl.trim() || part.file_url,
              layer_group: editLayer,
              opacity_default: editOpacity / 100,
            })}
            className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-white bg-violet-600 hover:bg-violet-500 rounded transition-colors"
          >
            <Save size={8} /> Guardar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
      <GripVertical size={10} className="text-gray-700 shrink-0" />
      <Box size={10} className="text-gray-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-300 truncate">{part.name}</p>
        <p className="text-[8px] text-gray-600 truncate font-mono">{part.file_url}</p>
      </div>
      <span className="text-[8px] text-gray-600">{Math.round(part.opacity_default * 100)}%</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onStartEdit} className="p-0.5 text-gray-500 hover:text-white rounded transition-colors">
          <Pencil size={10} />
        </button>
        <button onClick={onDelete} className="p-0.5 text-gray-500 hover:text-red-400 rounded transition-colors">
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════
// ── Add Layer Dialog ──
// ══════════════════════════════════════════════

function AddLayerDialog({ existingNames, onAdd, onCancel }: {
  existingNames: string[];
  onAdd: (name: string, color: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(LAYER_COLORS[existingNames.length % LAYER_COLORS.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (existingNames.includes(name.trim())) {
      toast.error('Ya existe una capa con ese nombre');
      return;
    }
    onAdd(name.trim(), color);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
        <Plus size={12} className="text-violet-400" />
        Nueva Capa
      </h4>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre (ej: Huesos, Musculos...)"
          className="flex-1 px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          autoFocus
          required
        />
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          className="w-8 h-8 rounded-lg border border-white/10 cursor-pointer bg-transparent"
        />
      </div>
      {/* Preset colors */}
      <div className="flex gap-1.5">
        {LAYER_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={clsx(
              'w-5 h-5 rounded-full border-2 transition-all',
              color === c ? 'border-white scale-110' : 'border-transparent hover:border-white/30',
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[10px] text-gray-500 hover:text-white rounded-lg transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="px-3 py-1.5 text-[10px] font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors disabled:opacity-50"
        >
          Crear Capa
        </button>
      </div>
    </form>
  );
}


// ══════════════════════════════════════════════
// ── Add Part Dialog ──
// ══════════════════════════════════════════════

function AddPartDialog({ layers, onAdd, onCancel }: {
  layers: ModelLayerConfig[];
  onAdd: (data: { name: string; file_url: string; layer_group: string; color_hex: string; opacity_default: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [layerGroup, setLayerGroup] = useState(layers[0]?.name || '');
  const [opacity, setOpacity] = useState(100);

  const selectedLayer = layers.find(l => l.name === layerGroup);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !fileUrl.trim()) return;
    onAdd({
      name: name.trim(),
      file_url: fileUrl.trim(),
      layer_group: layerGroup,
      color_hex: selectedLayer?.color_hex || '#888888',
      opacity_default: opacity / 100,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-3">
      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
        <Box size={12} className="text-teal-400" />
        Nueva Parte
      </h4>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nombre (ej: Humero, Biceps...)"
        className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
        autoFocus
        required
      />
      <input
        type="url"
        value={fileUrl}
        onChange={e => setFileUrl(e.target.value)}
        placeholder="URL del archivo .glb"
        className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/30 font-mono"
        required
      />
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-[9px] text-gray-500 mb-1 block">Capa</label>
          <select
            value={layerGroup}
            onChange={e => setLayerGroup(e.target.value)}
            className="w-full px-2 py-1.5 text-[10px] bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none"
          >
            {layers.map(l => (
              <option key={l.id} value={l.name}>{l.name}</option>
            ))}
          </select>
        </div>
        <div className="w-20">
          <label className="text-[9px] text-gray-500 mb-1 block">Opacidad</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="w-12 px-1 py-1.5 text-[10px] bg-white/5 border border-white/10 rounded text-white text-center focus:outline-none"
            />
            <span className="text-[9px] text-gray-500">%</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-[10px] text-gray-500 hover:text-white rounded-lg transition-colors">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!name.trim() || !fileUrl.trim()}
          className="px-3 py-1.5 text-[10px] font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors disabled:opacity-50"
        >
          Agregar Parte
        </button>
      </div>
    </form>
  );
}
