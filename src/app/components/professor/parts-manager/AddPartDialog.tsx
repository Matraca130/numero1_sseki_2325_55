// ============================================================
// Axon — AddPartDialog (extracted from ModelPartsManager)
// ============================================================

import React, { useState } from 'react';
import { Box } from 'lucide-react';
import type { ModelLayerConfig } from '@/app/components/viewer3d/ModelPartMesh';

export interface AddPartData {
  name: string;
  file_url: string;
  layer_group: string;
  color_hex: string;
  opacity_default: number;
}

interface AddPartDialogProps {
  layers: ModelLayerConfig[];
  onAdd: (data: AddPartData) => void;
  onCancel: () => void;
}

export function AddPartDialog({ layers, onAdd, onCancel }: AddPartDialogProps) {
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
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#2a8c7a]/20 bg-[#2a8c7a]/5 p-4 space-y-3">
      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
        <Box size={12} className="text-[#5cbdaa]" />
        Nueva Parte
      </h4>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nombre (ej: Humero, Biceps...)"
        className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2a8c7a]/30"
        autoFocus
        required
      />
      <input
        type="url"
        value={fileUrl}
        onChange={e => setFileUrl(e.target.value)}
        placeholder="URL del archivo .glb"
        className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2a8c7a]/30 font-mono"
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
          className="px-3 py-1.5 text-[10px] font-semibold text-white bg-[#2a8c7a] hover:bg-[#244e47] rounded-lg transition-colors disabled:opacity-50"
        >
          Agregar Parte
        </button>
      </div>
    </form>
  );
}
