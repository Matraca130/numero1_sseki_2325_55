// ============================================================
// Axon — Professor: 3D Model Viewer Page
//
// Full-screen 3D viewer with mode="edit" (pins, layers, parts).
// Unlocks ~950 lines of existing edit UI that was previously dead code.
//
// Layout:
//   - Top bar: back button + model name + toggle parts manager
//   - Center: ModelViewer3D (mode="edit") — pins, layers
//   - Right sidebar (collapsible): ModelPartsManager — CRUD layers/parts
//
// Route: /professor/3d-viewer/:modelId
// PARALLEL-SAFE: This file is independent. Edit freely.
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Loader2, AlertTriangle, Box, PanelRightOpen, PanelRightClose,
} from 'lucide-react';
import { ModelViewer3D } from '@/app/components/content/ModelViewer3D';
import { ModelPartsManager } from '@/app/components/professor/ModelPartsManager';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { getModel3DById } from '@/app/lib/model3d-api';
import type { Model3D } from '@/app/lib/model3d-api';

export function ProfessorModelViewerPage() {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();

  const [model, setModel] = useState<Model3D | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPartsPanel, setShowPartsPanel] = useState(false);

  // ── Fetch model record ──
  const fetchModel = useCallback(async () => {
    if (!modelId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getModel3DById(modelId);
      setModel(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar el modelo');
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => { fetchModel(); }, [fetchModel]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin text-[#2a8c7a] mx-auto mb-3" />
          <p className="text-xs text-gray-500">Cargando modelo 3D...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error || !model) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <p className="text-sm text-white mb-1">Error al cargar modelo</p>
          <p className="text-xs text-gray-500 mb-4">{error || 'Modelo no encontrado'}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => navigate('/professor/curriculum')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 border border-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={12} />
              Volver al curriculum
            </button>
            <button
              onClick={fetchModel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#5cbdaa] bg-[#2a8c7a]/10 border border-[#2a8c7a]/20 rounded-lg hover:bg-[#2a8c7a]/20 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main viewer ──
  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-white/[0.06] backdrop-blur-sm z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/professor/curriculum')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 border border-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft size={13} />
            Curriculum
          </button>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2a8c7a]/10 border border-[#2a8c7a]/20 flex items-center justify-center">
              <Box size={14} className="text-[#5cbdaa]" />
            </div>
            <div>
              <h2 className="text-xs text-white">{model.title}</h2>
              <p className="text-[9px] text-gray-500">
                Modo edicion — Pins, Capas, Partes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Format badge */}
          {model.file_format && (
            <span className="text-[9px] text-[#2a8c7a] font-semibold uppercase bg-[#2a8c7a]/10 px-2 py-0.5 rounded">
              {model.file_format}
            </span>
          )}

          {/* Parts Manager toggle */}
          <button
            onClick={() => setShowPartsPanel(!showPartsPanel)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg transition-all border ${
              showPartsPanel
                ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {showPartsPanel ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
            Capas y Partes
          </button>
        </div>
      </div>

      {/* ── Content area: viewer + optional sidebar ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 3D Viewport — mode="edit" unlocks PinSystem edit + PinEditor */}
        <div className="flex-1 relative">
          <ErrorBoundary
            fallback={(err) => (
              <div className="h-full flex items-center justify-center bg-zinc-950">
                <div className="text-center max-w-xs">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle size={20} className="text-red-400" />
                  </div>
                  <p className="text-sm text-white mb-1">Error en el visor 3D</p>
                  <p className="text-[10px] text-gray-500 mb-3">{err.message}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-1.5 text-xs text-[#5cbdaa] bg-[#2a8c7a]/10 border border-[#2a8c7a]/20 rounded-lg hover:bg-[#2a8c7a]/20 transition-colors"
                  >
                    Recargar pagina
                  </button>
                </div>
              </div>
            )}
          >
            <ModelViewer3D
              modelId={model.id}
              modelName={model.title}
              fileUrl={model.file_url}
              mode="edit"
            />
          </ErrorBoundary>
        </div>

        {/* Right sidebar: ModelPartsManager (collapsible) */}
        {showPartsPanel && (
          <div className="w-80 shrink-0 bg-zinc-900/95 border-l border-white/[0.06] overflow-y-auto p-4">
            <ModelPartsManager
              modelId={model.id}
              modelName={model.title}
            />
          </div>
        )}
      </div>
    </div>
  );
}