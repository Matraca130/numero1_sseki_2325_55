// ============================================================
// Axon — LayerPanel (Viewer sidebar)
//
// Sidebar for toggling layer/part visibility and opacity.
// - Checkbox per layer (toggle all parts in layer)
// - Checkbox per part (individual toggle)
// - Opacity slider per layer (0-100%)
// - Color dots, show/hide all, reset, collapsible
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  Layers, Eye, EyeOff, ChevronDown, ChevronRight, RotateCcw, X,
} from 'lucide-react';
import clsx from 'clsx';
import type { ModelPartLoader } from './ModelPartMesh';
import type { ModelLayerConfig } from './ModelPartMesh';

interface LayerPanelProps {
  partLoader: ModelPartLoader;
  layers: ModelLayerConfig[];
  /** Trigger re-render from parent */
  updateKey: number;
  onClose: () => void;
}

export function LayerPanel({ partLoader, layers, updateKey, onClose }: LayerPanelProps) {
  const [collapsedLayers, setCollapsedLayers] = useState<Set<string>>(new Set());

  const partStates = useMemo(() => partLoader.getPartStates(), [partLoader, updateKey]);

  // Group parts by layer
  const layerGroups = useMemo(() => {
    const groups: Map<string, typeof partStates> = new Map();
    for (const part of partStates) {
      if (!groups.has(part.layer)) groups.set(part.layer, []);
      groups.get(part.layer)!.push(part);
    }
    // Sort by layer config order
    const sorted = layers
      .filter(l => groups.has(l.name))
      .map(l => ({ layer: l, parts: groups.get(l.name)! }));

    // Add any layers not in config (fallback)
    for (const [name, parts] of groups) {
      if (!layers.find(l => l.name === name)) {
        sorted.push({
          layer: { id: name, name, color_hex: '#888888', order_index: 999 },
          parts,
        });
      }
    }
    return sorted;
  }, [partStates, layers]);

  const toggleLayerCollapse = useCallback((name: string) => {
    setCollapsedLayers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleLayerToggle = useCallback((layerName: string) => {
    const isVisible = partLoader.isLayerVisible(layerName);
    partLoader.setLayerVisible(layerName, !isVisible);
  }, [partLoader]);

  const handlePartToggle = useCallback((partId: string, visible: boolean) => {
    partLoader.setPartVisible(partId, !visible);
  }, [partLoader]);

  const handleLayerOpacity = useCallback((layerName: string, value: number) => {
    partLoader.setLayerOpacity(layerName, value / 100);
  }, [partLoader]);

  const handleShowAll = useCallback(() => {
    for (const { layer } of layerGroups) {
      partLoader.setLayerVisible(layer.name, true);
      partLoader.setLayerOpacity(layer.name, 1);
    }
  }, [partLoader, layerGroups]);

  const handleHideAll = useCallback(() => {
    for (const { layer } of layerGroups) {
      partLoader.setLayerVisible(layer.name, false);
    }
  }, [partLoader, layerGroups]);

  const handleReset = useCallback(() => {
    // Reset all parts to their default opacity and visible
    const states = partLoader.getPartStates();
    for (const s of states) {
      partLoader.setPartVisible(s.id, true);
    }
    // Reset opacity from config
    for (const { layer } of layerGroups) {
      partLoader.setLayerOpacity(layer.name, 1);
    }
  }, [partLoader, layerGroups]);

  if (layerGroups.length === 0) return null;

  return (
    <div className="absolute top-0 left-0 z-20 w-64 h-full bg-zinc-900/95 backdrop-blur-xl border-r border-white/10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/10">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          <Layers size={13} className="text-violet-400" />
          Capas
        </h4>
        <div className="flex items-center gap-1">
          <button
            onClick={handleShowAll}
            className="p-1 text-gray-500 hover:text-teal-400 rounded transition-colors"
            title="Mostrar todo"
          >
            <Eye size={12} />
          </button>
          <button
            onClick={handleHideAll}
            className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
            title="Ocultar todo"
          >
            <EyeOff size={12} />
          </button>
          <button
            onClick={handleReset}
            className="p-1 text-gray-500 hover:text-amber-400 rounded transition-colors"
            title="Reset"
          >
            <RotateCcw size={12} />
          </button>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {layerGroups.map(({ layer, parts }) => {
          const isCollapsed = collapsedLayers.has(layer.name);
          const layerVisible = partLoader.isLayerVisible(layer.name);
          const layerOpacity = Math.round(partLoader.getLayerOpacity(layer.name) * 100);
          const loadingCount = parts.filter(p => p.loading).length;

          return (
            <div key={layer.id} className="rounded-lg border border-white/5 overflow-hidden">
              {/* Layer header */}
              <div className="flex items-center gap-2 px-2.5 py-2 bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                {/* Collapse toggle */}
                <button
                  onClick={() => toggleLayerCollapse(layer.name)}
                  className="text-gray-600 hover:text-white transition-colors"
                >
                  {isCollapsed
                    ? <ChevronRight size={12} />
                    : <ChevronDown size={12} />}
                </button>

                {/* Visibility checkbox */}
                <button
                  onClick={() => handleLayerToggle(layer.name)}
                  className={clsx(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0',
                    layerVisible
                      ? 'bg-violet-500 border-violet-400'
                      : 'bg-transparent border-gray-600 hover:border-gray-400',
                  )}
                >
                  {layerVisible && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>

                {/* Color dot + name */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                  style={{ backgroundColor: layer.color_hex }}
                />
                <span className="flex-1 text-[11px] text-white truncate">{layer.name}</span>

                {/* Loading indicator */}
                {loadingCount > 0 && (
                  <span className="text-[8px] text-violet-400 animate-pulse">cargando...</span>
                )}

                {/* Part count */}
                <span className="text-[9px] text-gray-600">{parts.length}</span>
              </div>

              {/* Opacity slider */}
              {!isCollapsed && (
                <div className="px-3 py-1.5 flex items-center gap-2 border-t border-white/[0.03]">
                  <span className="text-[8px] text-gray-600 w-5">Op.</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={layerOpacity}
                    onChange={(e) => handleLayerOpacity(layer.name, Number(e.target.value))}
                    className="flex-1 h-1 accent-violet-500 cursor-pointer"
                    style={{ accentColor: layer.color_hex }}
                  />
                  <span className="text-[9px] text-gray-500 w-7 text-right">{layerOpacity}%</span>
                </div>
              )}

              {/* Parts list */}
              {!isCollapsed && (
                <div className="px-2 pb-1.5 space-y-0.5">
                  {parts.map(part => (
                    <div
                      key={part.id}
                      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                    >
                      {/* Part checkbox */}
                      <button
                        onClick={() => handlePartToggle(part.id, part.visible)}
                        className={clsx(
                          'w-3 h-3 rounded-sm border flex items-center justify-center transition-all shrink-0',
                          part.visible
                            ? 'bg-violet-500/70 border-violet-400/70'
                            : 'bg-transparent border-gray-700 hover:border-gray-500',
                        )}
                      >
                        {part.visible && (
                          <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                            <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>

                      <span className={clsx(
                        'flex-1 text-[10px] truncate transition-colors',
                        part.visible ? 'text-gray-300' : 'text-gray-600',
                      )}>
                        {part.name}
                      </span>

                      {/* State indicators */}
                      {part.loading && (
                        <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                      )}
                      {!part.loaded && !part.loading && (
                        <span className="text-[7px] text-gray-700">idle</span>
                      )}
                      {part.opacity < 1 && part.loaded && (
                        <span className="text-[8px] text-gray-600">{Math.round(part.opacity * 100)}%</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="px-3 py-2 border-t border-white/5 text-[8px] text-gray-600">
        {partStates.filter(p => p.loaded).length}/{partStates.length} partes cargadas
      </div>
    </div>
  );
}
