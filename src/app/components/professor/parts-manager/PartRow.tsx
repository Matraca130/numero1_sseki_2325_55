// ============================================================
// Axon — PartRow (extracted from ModelPartsManager)
// ============================================================

import React, { useState } from 'react';
import { Pencil, Trash2, Save, GripVertical, Box } from 'lucide-react';
import type { ModelPartConfig, ModelLayerConfig } from '@/app/components/viewer3d/ModelPartMesh';

interface PartRowProps {
  part: ModelPartConfig;
  isEditing: boolean;
  layers: ModelLayerConfig[];
  onStartEdit: () => void;
  onSave: (updates: Partial<ModelPartConfig>) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

export function PartRow({ part, isEditing, layers, onStartEdit, onSave, onCancelEdit, onDelete }: PartRowProps) {
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
            className="flex items-center gap-1 px-2 py-1 text-[9px] font-medium text-white bg-[#2a8c7a] hover:bg-[#244e47] rounded-full transition-colors"
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
