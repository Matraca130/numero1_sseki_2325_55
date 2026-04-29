// ============================================================
// Axon — SketchSidebar: full sidebar with presets + controls
//
// Used in SketchFullscreen view. 320px wide sidebar panel.
// ============================================================
import React, { useState } from 'react';
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { SketchControls } from './SketchControls';
import type { ParamSchema, ParamValues, PresetDefinition } from './types';

interface SketchSidebarProps {
  displayName: string;
  description?: string;
  schema: ParamSchema;
  values: ParamValues;
  presets: PresetDefinition[];
  activePreset: string | null;
  onParamChange: (key: string, value: number | string | boolean) => void;
  onPresetSelect: (preset: PresetDefinition) => void;
  onReset: () => void;
  className?: string;
}

export function SketchSidebar({
  displayName,
  description,
  schema,
  values,
  presets,
  activePreset,
  onParamChange,
  onPresetSelect,
  onReset,
  className,
}: SketchSidebarProps) {
  const [presetsOpen, setPresetsOpen] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(true);

  return (
    <aside
      className={clsx(
        'flex flex-col h-full overflow-y-auto bg-slate-900 border-r border-slate-700',
        'w-80 shrink-0',
        className,
      )}
      style={{ width: 320 }}
      aria-label="Panel de controles del motor algorítmico"
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-white font-[Poppins,sans-serif] leading-tight">
          {displayName}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{description}</p>
        )}
      </div>

      {/* Presets */}
      {presets.length > 0 && (
        <div className="border-b border-slate-700">
          <button
            type="button"
            className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            onClick={() => setPresetsOpen(v => !v)}
          >
            <span>Presets ({presets.length})</span>
            {presetsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {presetsOpen && (
            <div className="px-3 pb-3 grid grid-cols-2 gap-1.5">
              {presets.map(preset => (
                <button
                  key={preset.key}
                  type="button"
                  title={preset.description}
                  onClick={() => onPresetSelect(preset)}
                  className={clsx(
                    'px-2 py-1.5 rounded text-xs font-medium transition-colors text-left truncate',
                    activePreset === preset.key
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {Object.keys(schema).filter(k => !k.startsWith('_')).length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <button
            type="button"
            className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            onClick={() => setControlsOpen(v => !v)}
          >
            <span>Parámetros</span>
            {controlsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {controlsOpen && (
            <div className="px-4 pb-4">
              <SketchControls
                schema={schema}
                values={values}
                onChange={onParamChange}
              />
            </div>
          )}
        </div>
      )}

      {/* Footer: reset */}
      <div className="p-3 border-t border-slate-700 mt-auto">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2 w-full justify-center px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
        >
          <RotateCcw size={12} />
          Restablecer parámetros
        </button>
      </div>
    </aside>
  );
}
