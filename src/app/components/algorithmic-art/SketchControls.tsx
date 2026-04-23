// ============================================================
// Axon — SketchControls: generic controls from param schema
//
// Renders sliders (Radix Slider) and selects (Radix Select)
// derived from the engine's ParamSchema definition.
// ============================================================
import React from 'react';
import * as RadixSlider from '@radix-ui/react-slider';
import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import type { ParamSchema, ParamValues } from './types';

interface SketchControlsProps {
  schema: ParamSchema;
  values: ParamValues;
  onChange: (key: string, value: number | string | boolean) => void;
  className?: string;
}

export function SketchControls({ schema, values, onChange, className }: SketchControlsProps) {
  const entries = Object.entries(schema).filter(([k]) => !k.startsWith('_'));

  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      {entries.map(([key, def]) => {
        const currentValue = values[key] ?? def.default;

        if (def.type === 'slider') {
          const numVal = typeof currentValue === 'number' ? currentValue : Number(currentValue);
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">{def.label}</label>
                <span className="text-xs text-slate-400 tabular-nums">
                  {numVal.toFixed(def.step < 1 ? 1 : 0)}{def.unit ?? ''}
                </span>
              </div>
              <RadixSlider.Root
                className="relative flex items-center select-none touch-none w-full h-5"
                min={def.min}
                max={def.max}
                step={def.step}
                value={[numVal]}
                onValueChange={([v]) => onChange(key, v)}
              >
                <RadixSlider.Track className="relative grow rounded-full h-1 bg-slate-700">
                  <RadixSlider.Range className="absolute h-full rounded-full bg-orange-500" />
                </RadixSlider.Track>
                <RadixSlider.Thumb
                  className="block w-4 h-4 bg-white rounded-full shadow-md hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 focus:ring-offset-slate-800 transition-colors cursor-pointer"
                  aria-label={def.label}
                />
              </RadixSlider.Root>
            </div>
          );
        }

        if (def.type === 'select') {
          const strVal = String(currentValue);
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">{def.label}</label>
              <RadixSelect.Root value={strVal} onValueChange={(v) => onChange(key, v)}>
                <RadixSelect.Trigger
                  className="flex items-center justify-between w-full px-3 py-1.5 text-xs text-slate-200 bg-slate-700 border border-slate-600 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                  aria-label={def.label}
                >
                  <RadixSelect.Value />
                  <ChevronDown size={12} className="text-slate-400 shrink-0 ml-1" />
                </RadixSelect.Trigger>
                <RadixSelect.Portal>
                  <RadixSelect.Content
                    className="overflow-hidden bg-slate-800 border border-slate-600 rounded-md shadow-xl z-50"
                    position="popper"
                    sideOffset={4}
                  >
                    <RadixSelect.Viewport className="p-1">
                      {def.options.map(opt => (
                        <RadixSelect.Item
                          key={opt.value}
                          value={opt.value}
                          className="relative flex items-center px-3 py-1.5 text-xs text-slate-200 rounded cursor-pointer hover:bg-orange-500/20 hover:text-orange-300 focus:outline-none focus:bg-orange-500/20 data-[highlighted]:bg-orange-500/20 data-[highlighted]:text-orange-300"
                        >
                          <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                        </RadixSelect.Item>
                      ))}
                    </RadixSelect.Viewport>
                  </RadixSelect.Content>
                </RadixSelect.Portal>
              </RadixSelect.Root>
            </div>
          );
        }

        if (def.type === 'boolean') {
          const boolVal = Boolean(currentValue);
          return (
            <div key={key} className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">{def.label}</label>
              <button
                type="button"
                role="switch"
                aria-checked={boolVal}
                onClick={() => onChange(key, !boolVal)}
                className={clsx(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500',
                  boolVal ? 'bg-orange-500' : 'bg-slate-600',
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform',
                    boolVal ? 'translate-x-4' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
