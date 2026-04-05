// ============================================================
// Axon — SketchBlock: Inline block for SummaryViewer
//
// Compact sketch preview with mini-controls and fullscreen button.
// Wrapped in React.Suspense with skeleton fallback.
// ============================================================
import React, { Suspense, useRef, useState, useCallback } from 'react';
import { Maximize2, Camera, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import SketchEngine from './SketchEngine';
import type { EngineKey, EngineModule } from './types';
import type { P5CanvasHandle } from './P5Canvas';

interface SketchBlockProps {
  engineKey: EngineKey;
  seed?: number;
  dark?: boolean;
  /** Optional height for the inline preview (default 300) */
  previewHeight?: number;
  className?: string;
}

function SketchBlockSkeleton({ height }: { height: number }) {
  return (
    <div
      className="rounded-xl animate-pulse bg-slate-800"
      style={{ height, width: '100%' }}
      aria-label="Cargando arte algorítmico..."
      role="status"
    />
  );
}

export function SketchBlock({
  engineKey,
  seed = 42,
  dark = false,
  previewHeight = 300,
  className,
}: SketchBlockProps) {
  const navigate = useNavigate();
  const canvasRef = useRef<P5CanvasHandle>(null);
  const [module, setModule] = useState<EngineModule | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [currentSeed, setCurrentSeed] = useState(seed);

  const handleReady = useCallback((m: EngineModule) => setModule(m), []);
  const handleError = useCallback((e: Error) => setError(e), []);

  const handleFullscreen = useCallback(() => {
    navigate(`/student/sketch/${engineKey}?seed=${currentSeed}`);
  }, [navigate, engineKey, currentSeed]);

  const handleScreenshot = useCallback(() => {
    canvasRef.current?.screenshot(`axon-${engineKey}-${currentSeed}`);
  }, [engineKey, currentSeed]);

  const handleRandomize = useCallback(() => {
    setCurrentSeed(Math.floor(Math.random() * 99999) + 1);
  }, []);

  if (error) {
    return (
      <div
        className={clsx('flex items-center justify-center rounded-xl bg-slate-900', className)}
        style={{ height: previewHeight }}
      >
        <p className="text-xs text-red-400">Motor no disponible: {engineKey}</p>
      </div>
    );
  }

  return (
    <div
      className={clsx('relative rounded-xl overflow-hidden group', className)}
      role="figure"
      aria-label={`Arte algorítmico: ${engineKey}, semilla ${currentSeed}`}
    >
      <Suspense fallback={<SketchBlockSkeleton height={previewHeight} />}>
        <SketchEngine
          ref={canvasRef}
          engineKey={engineKey}
          seed={currentSeed}
          dark={dark}
          height={previewHeight}
          onReady={handleReady}
          onError={handleError}
        />
      </Suspense>

      {/* Action bar — visible on hover */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleRandomize}
          title="Nueva semilla aleatoria"
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/50 text-white/80 hover:bg-black/70 hover:text-white transition-colors backdrop-blur-sm"
        >
          <RefreshCw size={13} />
        </button>
        <button
          type="button"
          onClick={handleScreenshot}
          title="Captura de pantalla"
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/50 text-white/80 hover:bg-black/70 hover:text-white transition-colors backdrop-blur-sm"
        >
          <Camera size={13} />
        </button>
        <button
          type="button"
          onClick={handleFullscreen}
          title="Abrir vista completa"
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/50 text-white/80 hover:bg-black/70 hover:text-white transition-colors backdrop-blur-sm"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* Engine name badge */}
      {module && (
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm">
          <span className="text-[10px] text-white/70 font-medium">{module.displayName}</span>
        </div>
      )}
    </div>
  );
}
