// ============================================================
// Axon — SketchEngine: Orchestrator
//
// Loads engine module dynamically, manages loading state,
// injects dark-mode param, and passes sketch to P5Canvas.
// ============================================================
import React, { useEffect, useState, forwardRef } from 'react';
import { loadEngine } from './engines/index';
import { useSketchParams } from './hooks/useSketchParams';
import type { EngineKey, EngineModule } from './types';
import P5Canvas, { type P5CanvasHandle } from './P5Canvas';

interface SketchEngineProps {
  engineKey: EngineKey;
  seed: number;
  dark?: boolean;
  width?: number;
  height?: number;
  className?: string;
  /** Called once the engine + canvas are ready */
  onReady?: (module: EngineModule) => void;
  /** Called on any load or render error */
  onError?: (err: Error) => void;
  /** External override to paramsRef (e.g. from SketchFullscreen) */
  externalParamsRef?: React.MutableRefObject<import('./types').ParamValues>;
}

const SketchEngine = forwardRef<P5CanvasHandle, SketchEngineProps>(function SketchEngine(
  { engineKey, seed, dark = false, width, height, className, onReady, onError, externalParamsRef },
  ref,
) {
  const [module, setModule] = useState<EngineModule | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  // Internal params (used when no external ref is provided)
  const { paramsRef: internalParamsRef, setParams } = useSketchParams(module?.paramSchema ?? null);

  // Use external or internal params ref
  const paramsRef = externalParamsRef ?? internalParamsRef;

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    loadEngine(engineKey)
      .then(m => {
        setModule(m);
        setLoading(false);
      })
      .catch(err => {
        const e = err instanceof Error ? err : new Error(String(err));
        setLoadError(e);
        setLoading(false);
        onError?.(e);
      });
  }, [engineKey, onError]);

  // Inject dark mode into params when it changes
  useEffect(() => {
    if (!module) return;
    setParams({ darkMode: dark });
    paramsRef.current = { ...paramsRef.current, darkMode: dark };
  }, [dark, module, setParams, paramsRef]);

  if (loading) {
    return (
      <div
        className={className}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, background: '#0f172a', borderRadius: 12 }}
        data-testid="sketch-engine-loading"
      >
        <div className="text-sm text-slate-400 animate-pulse">Cargando motor...</div>
      </div>
    );
  }

  if (loadError || !module) {
    return (
      <div
        className={className}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, background: '#1e1e2e', borderRadius: 12 }}
        data-testid="sketch-engine-error"
      >
        <p className="text-sm text-red-400">Error al cargar el motor: {loadError?.message}</p>
      </div>
    );
  }

  return (
    <P5Canvas
      ref={ref}
      sketch={module.sketch}
      paramsRef={paramsRef}
      seed={seed}
      width={width}
      height={height}
      className={className}
      onReady={() => onReady?.(module)}
      onError={onError}
    />
  );
});

SketchEngine.displayName = 'SketchEngine';
export default SketchEngine;
