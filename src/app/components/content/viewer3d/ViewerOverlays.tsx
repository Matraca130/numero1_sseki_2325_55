// ============================================================
// Axon — ViewerOverlays (extracted from ModelViewer3D.tsx)
//
// Tiny presentational components for:
//   - keyboard shortcut hint panel
//   - GLB loading indicator
//   - WebGL context-loss recovery dialog
//
// Pure markup extraction, no logic change (finding #21).
// ============================================================
import React from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface KeyboardShortcutHintProps {
  hasMultiPart: boolean;
  mode: 'view' | 'edit';
}

export function KeyboardShortcutHint({ hasMultiPart, mode }: KeyboardShortcutHintProps) {
  return (
    <div className="absolute bottom-12 left-3 z-30 p-3 rounded-lg bg-black/90 border border-white/10 text-[10px] space-y-1.5">
      <p className="text-gray-300 font-semibold mb-2">Atajos de teclado</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-gray-400">
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">R</kbd>
        <span>Reset camara</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">F</kbd>
        <span>Enfocar modelo</span>
        {hasMultiPart && (<>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">L</kbd>
          <span>Capas</span>
        </>)}
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">P</kbd>
        <span>{mode === 'edit' ? 'Panel Pins' : 'Mostrar/Ocultar Pins'}</span>
        {mode === 'view' && (<>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">N</kbd>
          <span>Mostrar/Ocultar Notas</span>
        </>)}
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">Esc</kbd>
        <span>Volver</span>
      </div>
    </div>
  );
}

interface GlbLoadingOverlayProps {
  fileUrl?: string;
}

export function GlbLoadingOverlay({ fileUrl }: GlbLoadingOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="text-center space-y-2 p-5 rounded-xl bg-black/80 border border-white/10">
        <Loader2 size={24} className="animate-spin text-[#2dd4a8] mx-auto" />
        <p className="text-[10px] text-gray-300">Cargando modelo 3D...</p>
        {fileUrl && (
          <p className="text-[8px] text-gray-600 max-w-[200px] truncate">{fileUrl.split('/').pop()}</p>
        )}
      </div>
    </div>
  );
}

interface ContextLostOverlayProps {
  exceededThreshold: boolean;
}

export function ContextLostOverlay({ exceededThreshold }: ContextLostOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="text-center space-y-3 p-6 rounded-xl bg-zinc-900/90 border border-white/10 max-w-xs">
        <AlertTriangle size={28} className="mx-auto text-amber-400" />
        <h4 className="text-xs font-bold text-white">Error de GPU</h4>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          {exceededThreshold
            ? 'El contexto WebGL se ha perdido varias veces. Tu dispositivo puede no tener suficiente memoria de video.'
            : 'El contexto WebGL se ha perdido. Intentando recuperar...'}
        </p>
        {exceededThreshold ? (
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 mx-auto px-4 py-2 text-[10px] font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
          >
            <RefreshCw size={12} />
            Recargar pagina
          </button>
        ) : (
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
            <Loader2 size={12} className="animate-spin" />
            Recuperando...
          </div>
        )}
      </div>
    </div>
  );
}
