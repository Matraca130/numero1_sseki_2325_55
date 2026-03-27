// ============================================================
// Axon — AddLayerDialog (extracted from ModelPartsManager)
// ============================================================

import React, { useState } from 'react';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

// ── Preset layer colors ──
export const LAYER_COLORS = [
  '#f5e6d3', '#cc5555', '#4488cc', '#34d399', '#fbbf24',
  '#a78bfa', '#f472b6', '#94a3b8', '#818cf8', '#fb923c',
];

interface AddLayerDialogProps {
  existingNames: string[];
  onAdd: (name: string, color: string) => void;
  onCancel: () => void;
}

export function AddLayerDialog({ existingNames, onAdd, onCancel }: AddLayerDialogProps) {
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
    <form onSubmit={handleSubmit} className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-3">
      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
        <Plus size={12} className="text-teal-400" />
        Nueva Capa
      </h4>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre (ej: Huesos, Musculos...)"
          className="flex-1 px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
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
          className="px-3 py-1.5 text-[10px] font-semibold text-white bg-[#2a8c7a] hover:bg-[#244e47] rounded-full transition-colors disabled:opacity-50"
        >
          Crear Capa
        </button>
      </div>
    </form>
  );
}
