// ============================================================
// Axon — SketchFullscreen: Full-page view for sketch engines
//
// Layout: Sidebar (320px) + large canvas + all presets + seed navigator.
// Route: /student/sketch/:engine
// ============================================================
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router';
import { ArrowLeft, Camera, Shuffle, ChevronLeft, ChevronRight, Hash, Share2, Grid3X3 } from 'lucide-react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import SketchEngine from './SketchEngine';
import { SketchSidebar } from './SketchSidebar';
import { useSketchParams } from './hooks/useSketchParams';
import { useSeedNavigation } from './hooks/useSeedNavigation';
import { useSketchTracking } from './hooks/useSketchTracking';
import { useSketchUrlState } from './hooks/useSketchUrlState';
import { useReducedMotion } from './hooks/useReducedMotion';
import { ENGINE_DISPLAY_NAMES } from './engines/index';
import type { EngineKey, EngineModule, PresetDefinition } from './types';
import type { P5CanvasHandle } from './P5Canvas';

const SketchGalleryLazy = React.lazy(() => import('./SketchGallery'));

const VALID_ENGINES = new Set<string>([
  'cardiovascular', 'respiratorio', 'dolor', 'digestivo', 'nervioso',
  'renal-endocrino', 'semiologia-general', 'semiologia-regional',
  'hematologia', 'microbiologia',
]);

function isValidEngine(key: string): key is EngineKey {
  return VALID_ENGINES.has(key);
}

export function SketchFullscreen() {
  const { engine: engineParam } = useParams<{ engine: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<P5CanvasHandle>(null);

  const engineKey: EngineKey | null =
    engineParam && isValidEngine(engineParam) ? engineParam : null;

  const { seed, prevSeed, nextSeed, randomizeSeed, jumpToSeed } = useSeedNavigation();
  const [module, setModule] = useState<EngineModule | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [seedInputValue, setSeedInputValue] = useState(String(seed));
  const [seedInputOpen, setSeedInputOpen] = useState(false);

  const { params, paramsRef, setParam, setParams, resetParams } = useSketchParams(
    module?.paramSchema ?? null,
  );

  const { track, trackView } = useSketchTracking(engineKey);
  const reducedMotion = useReducedMotion();
  const { syncToUrl, getShareUrl } = useSketchUrlState(module?.paramSchema ?? null);
  const viewStartRef = useRef(Date.now());
  const [showGallery, setShowGallery] = useState(false);
  const [shareTooltip, setShareTooltip] = useState(false);

  // Track view duration on unmount
  useEffect(() => {
    viewStartRef.current = Date.now();
    return () => {
      const duration = Date.now() - viewStartRef.current;
      if (duration > 2000) trackView(duration);
    };
  }, [trackView]);

  const handleReady = useCallback((m: EngineModule) => {
    setModule(m);
  }, []);

  const handleParamChange = useCallback((key: string, value: number | string | boolean) => {
    setParam(key, value);
    paramsRef.current = { ...paramsRef.current, [key]: value };
    track({ action: 'param_change', param_key: key, param_value: String(value), seed });
  }, [setParam, paramsRef, track, seed]);

  const handlePresetSelect = useCallback((preset: PresetDefinition) => {
    setParams(preset.params);
    paramsRef.current = { ...paramsRef.current, ...preset.params };
    setActivePreset(preset.key);
    track({ action: 'preset_select', param_key: preset.key, seed });
  }, [setParams, paramsRef, track, seed]);

  const handleReset = useCallback(() => {
    resetParams();
    setActivePreset(null);
  }, [resetParams]);

  const handleScreenshot = useCallback(() => {
    canvasRef.current?.screenshot(`axon-${engineKey}-${seed}`);
    track({ action: 'screenshot', seed });
  }, [engineKey, seed, track]);

  const handleSeedJump = useCallback(() => {
    const n = parseInt(seedInputValue, 10);
    if (!isNaN(n) && n > 0) {
      jumpToSeed(n);
      track({ action: 'seed_change', seed: n });
    }
    setSeedInputOpen(false);
  }, [seedInputValue, jumpToSeed, track]);

  const handlePrevSeed = () => { prevSeed(); track({ action: 'seed_change', seed: seed - 1 }); };
  const handleNextSeed = () => { nextSeed(); track({ action: 'seed_change', seed: seed + 1 }); };
  const handleRandomSeed = () => { randomizeSeed(); track({ action: 'seed_change' }); };

  const handleShare = useCallback(() => {
    if (!engineKey) return;
    const url = getShareUrl(engineKey, seed, params);
    navigator.clipboard.writeText(url).then(() => {
      setShareTooltip(true);
      setTimeout(() => setShareTooltip(false), 2000);
    }).catch(() => {
      // Fallback: prompt
      window.prompt('URL para compartir:', url);
    });
  }, [engineKey, seed, params, getShareUrl]);

  // Sync params to URL when they change
  useEffect(() => {
    if (module) syncToUrl(seed, params);
  }, [seed, params, module, syncToUrl]);

  // Sync seed input with seed state
  useEffect(() => { setSeedInputValue(String(seed)); }, [seed]);

  if (!engineKey) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Motor no válido: {engineParam}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-orange-400 hover:text-orange-300"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const displayName = module?.displayName ?? ENGINE_DISPLAY_NAMES[engineKey];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      {module && (
        <SketchSidebar
          displayName={displayName}
          description={module.description}
          schema={module.paramSchema}
          values={params}
          presets={module.presets}
          activePreset={activePreset}
          onParamChange={handleParamChange}
          onPresetSelect={handlePresetSelect}
          onReset={handleReset}
        />
      )}

      {/* Main canvas area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              aria-label="Volver"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Volver</span>
            </button>
            <span className="text-slate-700">|</span>
            <h1 className="text-sm font-semibold text-white font-[Poppins,sans-serif]">
              {displayName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Seed navigator */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-1 py-0.5">
              <button
                type="button"
                onClick={handlePrevSeed}
                title="Semilla anterior"
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                title="Ingresar semilla"
                onClick={() => setSeedInputOpen(v => !v)}
                className="flex items-center gap-1 px-1.5 text-xs text-slate-300 hover:text-white transition-colors"
              >
                <Hash size={11} />
                {seedInputOpen ? (
                  <input
                    type="number"
                    value={seedInputValue}
                    onChange={e => setSeedInputValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSeedJump(); if (e.key === 'Escape') setSeedInputOpen(false); }}
                    onBlur={handleSeedJump}
                    autoFocus
                    className="w-16 bg-transparent text-white text-xs text-center outline-none"
                    min={1}
                    max={99999}
                  />
                ) : (
                  <span className="tabular-nums">{seed}</span>
                )}
              </button>
              <button
                type="button"
                onClick={handleNextSeed}
                title="Semilla siguiente"
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleRandomSeed}
              title="Semilla aleatoria"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Shuffle size={12} />
              <span className="hidden sm:inline">Aleatorio</span>
            </button>

            <button
              type="button"
              onClick={handleScreenshot}
              title="Captura de pantalla"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Camera size={12} />
              <span className="hidden sm:inline">Captura</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={handleShare}
                title="Copiar enlace para compartir"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Compartir enlace con semilla y parámetros actuales"
              >
                <Share2 size={12} />
                <span className="hidden sm:inline">Compartir</span>
              </button>
              {shareTooltip && (
                <div
                  className="absolute top-full mt-1 right-0 px-2 py-1 text-[10px] text-white bg-green-600 rounded shadow-lg whitespace-nowrap z-10"
                  role="status"
                  aria-live="polite"
                >
                  ¡Enlace copiado!
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGallery(v => !v)}
              title="Ver galería de semillas"
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors',
                showGallery
                  ? 'bg-orange-500/20 text-orange-300'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
              )}
              aria-pressed={showGallery}
              aria-label="Abrir galería de semillas"
            >
              <Grid3X3 size={12} />
              <span className="hidden sm:inline">Galería</span>
            </button>
          </div>
        </header>

        {/* Canvas */}
        <main
          className="flex-1 overflow-hidden flex items-center justify-center bg-slate-950 p-4"
          data-testid="sketch-fullscreen-canvas"
          role="img"
          aria-label={`Visualización algorítmica: ${displayName}, semilla ${seed}`}
        >
          {showGallery ? (
            <div className="w-full h-full overflow-y-auto p-4">
              <SketchGalleryLazy engineKey={engineKey} />
            </div>
          ) : (
            <SketchEngine
              ref={canvasRef}
              engineKey={engineKey}
              seed={seed}
              externalParamsRef={paramsRef}
              onReady={handleReady}
              className={clsx(
                'rounded-xl overflow-hidden shadow-2xl',
                'max-w-full max-h-full',
              )}
            />
          )}
        </main>
      </div>
    </div>
  );
}
