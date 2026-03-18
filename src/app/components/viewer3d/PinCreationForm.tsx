// ============================================================
// Axon — PinCreationForm (inline floating form)
//
// Extracted from PinSystem.tsx for <500 line rule.
// Professor creates a pin at a 3D surface point.
// Supports keyword linking (F1) via KeywordAutocomplete.
// ============================================================

import React, { useState } from 'react';
import * as THREE from 'three';
import clsx from 'clsx';
import { MapPin, X, Save, Loader2, Info, Tag, FileText, Zap } from 'lucide-react';
import { KeywordAutocomplete } from './KeywordAutocomplete';

// Pin type config — UI-only color categories.
export const PIN_TYPES = [
  { value: 'info', label: 'Info', icon: Info, color: '#60a5fa' },
  { value: 'keyword', label: 'Keyword', icon: Tag, color: '#a78bfa' },
  { value: 'annotation', label: 'Anotacion', icon: FileText, color: '#34d399' },
  { value: 'quiz', label: 'Quiz', icon: Zap, color: '#fbbf24' },
] as const;

export interface PinFormData {
  label: string;
  description: string;
  pin_type: string;
  color: string;
  keyword_id?: string;
}

interface PinCreationFormProps {
  onSubmit: (data: PinFormData) => Promise<void>;
  onCancel: () => void;
  geometry: THREE.Vector3;
  topicId?: string;
}

export function PinCreationForm({
  onSubmit,
  onCancel,
  geometry,
  topicId,
}: PinCreationFormProps) {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [pinType, setPinType] = useState('info');
  const [saving, setSaving] = useState(false);
  const [keywordId, setKeywordId] = useState<string | null>(null);

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
        keyword_id: keywordId || undefined,
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
            <MapPin size={12} className="text-[#5cbdaa]" />
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

        {/* F1: Keyword linking */}
        <KeywordAutocomplete
          topicId={topicId}
          value={keywordId}
          onChange={(id) => setKeywordId(id)}
        />

        {/* Label */}
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nombre del punto..."
          autoFocus
          className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2a8c7a]/30 focus:border-[#2a8c7a]/30"
          required
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripcion (opcional)..."
          rows={2}
          className="w-full px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#2a8c7a]/30 focus:border-[#2a8c7a]/30 resize-none"
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-white bg-[#2a8c7a] hover:bg-[#244e47] rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
            Crear Pin
          </button>
        </div>
      </form>
    </div>
  );
}
