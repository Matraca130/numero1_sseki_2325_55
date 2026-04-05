// ============================================================
// Axon — SketchGallery: 4×3 grid of seed thumbnails
// PARALLEL-SAFE: This file is independent. Edit freely.
//
// Features:
//   - 4×3 grid of thumbnails (12 different seeds)
//   - Small canvas rendering at reduced resolution
//   - Click to open fullscreen
//   - Seed range navigator (prev/next page of 12)
// ============================================================
import React, { useState, useCallback, useMemo, Suspense, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, Grid3X3, Maximize2, Hash } from 'lucide-react';
import clsx from 'clsx';
import SketchEngine from './SketchEngine';
import { ENGINE_DISPLAY_NAMES } from './engines/index';
import type { EngineKey, EngineModule } from './types';

// ── Types ─────────────────────────────────────────────────

interface SketchGalleryProps {
  engineKey: EngineKey;
  /** Starting seed for the gallery (default 1) */
  initialSeed?: number;
  /** Number of thumbnails per page (default 12) */
  pageSize?: number;
  className?: string;
}

// ── Thumbnail ─────────────────────────────────────────────

function GalleryThumbnail({
  engineKey,
  seed,
  onClick,
  reducedMotion,
}: {
  engineKey: EngineKey;
  seed: number;
  onClick: () => void;
  reducedMotion: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative rounded-xl overflow-hidden bg-slate-800 aspect-[9/7] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-transform hover:scale-[1.02]"
      aria-label={`Semilla ${seed} — ${ENGINE_DISPLAY_NAMES[engineKey]}. Haz clic para abrir en pantalla completa`}
    >
      <Suspense
        fallback={
          <div className="w-full h-full animate-pulse bg-slate-700 rounded-xl" role="status">
            <span className="sr-only">Cargando vista previa...</span>
          </div>
        }
      >
        {reducedMotion ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <div className="text-center">
              <Hash size={16} className="text-slate-500 mx-auto mb-1" />
              <span className="text-xs text-slate-400 tabular-nums">{seed}</span>
            </div>
          </div>
        ) : (
          <SketchEngine
            engineKey={engineKey}
            seed={seed}
            dark
            height={160}
            className="w-full h-full pointer-events-none"
          />
        )}
      </Suspense>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <Maximize2
          size={20}
          className="text-white opacity-0 group-hover:opacity-80 transition-opacity"
          aria-hidden="true"
        />
      </div>

      {/* Seed badge */}
      <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
        <span className="text-[10px] text-white/70 font-medium tabular-nums">#{seed}</span>
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────

export function SketchGallery({
  engineKey,
  initialSeed = 1,
  pageSize = 12,
  className,
}: SketchGalleryProps) {
  const navigate = useNavigate();
  const [startSeed, setStartSeed] = useState(initialSeed);

  // Detect prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Generate seed array for current page
  const seeds = useMemo(() => {
    return Array.from({ length: pageSize }, (_, i) => startSeed + i);
  }, [startSeed, pageSize]);

  const handlePrevPage = useCallback(() => {
    setStartSeed(prev => Math.max(1, prev - pageSize));
  }, [pageSize]);

  const handleNextPage = useCallback(() => {
    setStartSeed(prev => Math.min(99999 - pageSize + 1, prev + pageSize));
  }, [pageSize]);

  const handleOpenFullscreen = useCallback((seed: number) => {
    navigate(`/student/sketch/${engineKey}?seed=${seed}`);
  }, [navigate, engineKey]);

  const currentPage = Math.floor((startSeed - 1) / pageSize) + 1;

  return (
    <div className={clsx('space-y-4', className)} role="region" aria-label="Galería de semillas">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 size={16} className="text-slate-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white font-[Poppins,sans-serif]">
            Galería — {ENGINE_DISPLAY_NAMES[engineKey]}
          </h3>
        </div>

        {/* Seed range navigator */}
        <nav className="flex items-center gap-1" aria-label="Navegación de páginas de semillas">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={startSeed <= 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
            aria-label="Página anterior de semillas"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs text-slate-400 tabular-nums px-2" aria-live="polite">
            Semillas {startSeed}–{startSeed + pageSize - 1}
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={startSeed + pageSize > 99999}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
            aria-label="Página siguiente de semillas"
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      </div>

      {/* Grid */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        role="list"
        aria-label={`12 visualizaciones con semillas ${startSeed} a ${startSeed + pageSize - 1}`}
      >
        {seeds.map(seed => (
          <div key={seed} role="listitem">
            <GalleryThumbnail
              engineKey={engineKey}
              seed={seed}
              onClick={() => handleOpenFullscreen(seed)}
              reducedMotion={reducedMotion}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default SketchGallery;
