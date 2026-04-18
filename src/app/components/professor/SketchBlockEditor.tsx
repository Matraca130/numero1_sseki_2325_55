// ============================================================
// Axon — SketchBlockEditor: Professor block editor for algorithmic_sketch blocks
// PARALLEL-SAFE: This file is independent. Edit freely.
//
// Used inside TipTap block editor for professors to add
// algorithmic_sketch blocks to summaries. Features:
//   - Engine selector dropdown
//   - Mode/preset selector (filtered by engine)
//   - Live preview canvas
//   - Default seed/params config
// ============================================================
import React, { useState, useCallback, useRef, useMemo, useEffect, Suspense } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDown, Eye, Settings2, Hash, Check, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import SketchEngine from '@/app/components/algorithmic-art/SketchEngine';
import { SketchControls } from '@/app/components/algorithmic-art/SketchControls';
import { useSketchParams } from '@/app/components/algorithmic-art/hooks/useSketchParams';
import { ENGINE_REGISTRY, ENGINE_DISPLAY_NAMES, loadEngine } from '@/app/components/algorithmic-art/engines/index';
import type { EngineKey, EngineModule, PresetDefinition, ParamValues } from '@/app/components/algorithmic-art/types';
import type { P5CanvasHandle } from '@/app/components/algorithmic-art/P5Canvas';

// ── Types ─────────────────────────────────────────────────

interface SketchBlockEditorProps {
  /** Called when professor confirms the block config */
  onInsert: (config: SketchBlockConfig) => void;
  /** Called to cancel/close the editor */
  onCancel: () => void;
  /** Initial config if editing an existing block */
  initialConfig?: Partial<SketchBlockConfig>;
  className?: string;
}

export interface SketchBlockConfig {
  engineKey: EngineKey;
  seed: number;
  presetKey: string | null;
  params: ParamValues;
}

// ── Constants ─────────────────────────────────────────────

const ENGINE_KEYS = Object.keys(ENGINE_DISPLAY_NAMES) as EngineKey[];

// ── Main Component ────────────────────────────────────────

export function SketchBlockEditor({
  onInsert,
  onCancel,
  initialConfig,
  className,
}: SketchBlockEditorProps) {
  const canvasRef = useRef<P5CanvasHandle>(null);

  // State
  const [selectedEngine, setSelectedEngine] = useState<EngineKey>(
    initialConfig?.engineKey ?? 'dolor',
  );
  const [seed, setSeed] = useState<number>(initialConfig?.seed ?? 42);
  const [seedInput, setSeedInput] = useState(String(initialConfig?.seed ?? 42));
  const [activePreset, setActivePreset] = useState<string | null>(
    initialConfig?.presetKey ?? null,
  );
  const [module, setModule] = useState<EngineModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);

  // Params management
  const { params, paramsRef, setParam, setParams, resetParams } = useSketchParams(
    module?.paramSchema ?? null,
  );

  // Load engine module when selection changes
  useEffect(() => {
    setLoading(true);
    setModule(null);
    setActivePreset(null);
    loadEngine(selectedEngine)
      .then(m => {
        setModule(m);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedEngine]);

  // Apply initial params if editing
  useEffect(() => {
    if (initialConfig?.params && module) {
      setParams(initialConfig.params);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module]);

  // Handlers
  const handleEngineChange = useCallback((value: string) => {
    setSelectedEngine(value as EngineKey);
    resetParams();
  }, [resetParams]);

  const handlePresetSelect = useCallback((preset: PresetDefinition) => {
    setParams(preset.params);
    paramsRef.current = { ...paramsRef.current, ...preset.params };
    setActivePreset(preset.key);
  }, [setParams, paramsRef]);

  const handleParamChange = useCallback((key: string, value: number | string | boolean) => {
    setParam(key, value);
    paramsRef.current = { ...paramsRef.current, [key]: value };
    setActivePreset(null);
  }, [setParam, paramsRef]);

  const handleSeedChange = useCallback(() => {
    const n = parseInt(seedInput, 10);
    if (!isNaN(n) && n > 0 && n <= 99999) {
      setSeed(n);
    } else {
      setSeedInput(String(seed));
    }
  }, [seedInput, seed]);

  const handleInsert = useCallback(() => {
    onInsert({
      engineKey: selectedEngine,
      seed,
      presetKey: activePreset,
      params: { ...params },
    });
  }, [onInsert, selectedEngine, seed, activePreset, params]);

  return (
    <div
      className={clsx(
        'rounded-xl border border-slate-700 bg-slate-900 overflow-hidden',
        className,
      )}
      role="dialog"
      aria-label="Editor de bloque algorítmico"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <h3 className="text-sm font-semibold text-white font-[Poppins,sans-serif]">
          Bloque de Arte Algorítmico
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowControls(v => !v)}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors',
              showControls
                ? 'bg-orange-500/20 text-orange-300'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
            )}
            aria-label={showControls ? 'Ocultar controles' : 'Mostrar controles'}
            aria-pressed={showControls}
          >
            <Settings2 size={12} />
            Parámetros
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Config panel */}
        <div className="w-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-700 p-4 space-y-4">
          {/* Engine selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300" id="engine-selector-label">
              Motor
            </label>
            <RadixSelect.Root value={selectedEngine} onValueChange={handleEngineChange}>
              <RadixSelect.Trigger
                className="flex items-center justify-between w-full px-3 py-2 text-xs text-slate-200 bg-slate-700 border border-slate-600 rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                aria-labelledby="engine-selector-label"
              >
                <RadixSelect.Value />
                <ChevronDown size={12} className="text-slate-400 shrink-0 ml-1" />
              </RadixSelect.Trigger>
              <RadixSelect.Portal>
                <RadixSelect.Content
                  className="overflow-hidden bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 max-h-60"
                  position="popper"
                  sideOffset={4}
                >
                  <RadixSelect.Viewport className="p-1">
                    {ENGINE_KEYS.map(key => (
                      <RadixSelect.Item
                        key={key}
                        value={key}
                        className="relative flex items-center px-3 py-2 text-xs text-slate-200 rounded cursor-pointer hover:bg-orange-500/20 hover:text-orange-300 focus:outline-none focus:bg-orange-500/20 data-[highlighted]:bg-orange-500/20 data-[highlighted]:text-orange-300"
                      >
                        <RadixSelect.ItemText>{ENGINE_DISPLAY_NAMES[key]}</RadixSelect.ItemText>
                      </RadixSelect.Item>
                    ))}
                  </RadixSelect.Viewport>
                </RadixSelect.Content>
              </RadixSelect.Portal>
            </RadixSelect.Root>
          </div>

          {/* Seed input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300" htmlFor="block-seed">
              Semilla
            </label>
            <div className="flex items-center gap-2">
              <Hash size={12} className="text-slate-400 shrink-0" />
              <input
                id="block-seed"
                type="number"
                min={1}
                max={99999}
                value={seedInput}
                onChange={e => setSeedInput(e.target.value)}
                onBlur={handleSeedChange}
                onKeyDown={e => e.key === 'Enter' && handleSeedChange()}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-orange-500 tabular-nums"
                aria-label="Número de semilla"
              />
            </div>
          </div>

          {/* Presets */}
          {module && module.presets.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-300">Presets</p>
              <div className="grid grid-cols-2 gap-1.5">
                {module.presets.map(preset => (
                  <button
                    key={preset.key}
                    type="button"
                    title={preset.description}
                    onClick={() => handlePresetSelect(preset)}
                    className={clsx(
                      'px-2 py-1.5 rounded text-xs font-medium transition-colors text-left truncate',
                      activePreset === preset.key
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
                    )}
                    aria-pressed={activePreset === preset.key}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls (collapsible) */}
          {showControls && module && (
            <div className="pt-2 border-t border-slate-700">
              <SketchControls
                schema={module.paramSchema}
                values={params}
                onChange={handleParamChange}
              />
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div className="flex-1 p-4 min-h-[300px] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={12} className="text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">Vista previa</span>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden bg-slate-950 min-h-[260px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={20} className="text-orange-400 animate-spin" />
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full animate-pulse bg-slate-800 rounded-xl" />
                }
              >
                <SketchEngine
                  ref={canvasRef}
                  engineKey={selectedEngine}
                  seed={seed}
                  dark
                  height={260}
                  externalParamsRef={paramsRef}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-slate-700 bg-slate-800/30">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleInsert}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:text-slate-400 rounded-lg transition-colors"
          aria-label="Insertar bloque de arte algorítmico"
        >
          <Check size={12} />
          Insertar bloque
        </button>
      </div>
    </div>
  );
}

export default SketchBlockEditor;
