// ============================================================
// Axon — LayerEditInline (extracted from ModelPartsManager)
// ============================================================

import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import type { ModelLayerConfig } from '@/app/components/viewer3d/ModelPartMesh';

interface LayerEditInlineProps {
  layer: ModelLayerConfig;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
}

export function LayerEditInline({ layer, onSave, onCancel }: LayerEditInlineProps) {
  const [name, setName] = useState(layer.name);
  const [color, setColor] = useState(layer.color_hex);

  return (
    <div className="flex items-center gap-2 flex-1">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        className="flex-1 px-2 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded text-white focus:outline-none focus:ring-1 focus:ring-teal-500/30"
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
        className="p-1 text-[#5cbdaa] hover:text-[#2dd4a8] rounded transition-colors"
      >
        <Save size={10} />
      </button>
      <button onClick={onCancel} className="p-1 text-gray-500 hover:text-white rounded transition-colors">
        <X size={10} />
      </button>
    </div>
  );
}
