// ============================================================
// Axon — Professor Add Connection Modal
//
// Modal form for professors to create keyword connections.
// Extracted from ProfessorKnowledgeMapPage for modularity.
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFocusTrap } from '@/app/components/content/mindmap/useFocusTrap';
import { invalidateGraphCache } from '@/app/components/content/mindmap/useGraphData';
import { CONNECTION_TYPES } from '@/app/types/mindmap';
import type { MapNode } from '@/app/types/mindmap';
import { apiCall } from '@/app/lib/api';
import { headingStyle } from '@/app/design-system';

interface ProfessorAddConnectionModalProps {
  open: boolean;
  onClose: () => void;
  nodes: MapNode[];
  topicId?: string;
  onCreated: () => void;
}

export function ProfessorAddConnectionModal({
  open,
  onClose,
  nodes,
  topicId,
  onCreated,
}: ProfessorAddConnectionModalProps) {
  const [connSource, setConnSource] = useState('');
  const [connTarget, setConnTarget] = useState('');
  const [connType, setConnType] = useState('asociacion');
  const [connLabel, setConnLabel] = useState('');
  const [connSaving, setConnSaving] = useState(false);
  const focusTrapRef = useFocusTrap(open);

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.label.localeCompare(b.label)),
    [nodes],
  );

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setConnSource('');
      setConnTarget('');
      setConnType('asociacion');
      setConnLabel('');
    }
  }, [open]);

  // Close on Escape + scroll lock + auto-focus
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      document.getElementById('conn-source')?.focus();
    });
    return () => {
      document.removeEventListener('keydown', handler);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleCreate = useCallback(async () => {
    if (!connSource || !connTarget || connSource === connTarget) return;
    setConnSaving(true);
    const [a, b] = connSource < connTarget ? [connSource, connTarget] : [connTarget, connSource];
    try {
      await apiCall('/keyword-connections', {
        method: 'POST',
        body: JSON.stringify({
          keyword_a_id: a,
          keyword_b_id: b,
          connection_type: connType,
          relationship: connLabel.trim() || undefined,
        }),
      });
      toast.success('Conexión creada');
      onClose();
      if (topicId) invalidateGraphCache(topicId);
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear conexión');
    } finally {
      setConnSaving(false);
    }
  }, [connSource, connTarget, connType, connLabel, topicId, onClose, onCreated]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/20 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          >
            <div
              ref={focusTrapRef}
              className="bg-white shadow-xl w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="prof-conn-modal-title"
            >
              {/* Mobile drag handle */}
              <div className="flex sm:hidden justify-center pt-2 pb-0">
                <div className="w-8 h-1 rounded-full bg-gray-300" />
              </div>
              <div className="flex items-center justify-between px-5 pt-4 sm:pt-5 pb-3">
                <h2
                  id="prof-conn-modal-title"
                  className="font-semibold text-gray-900"
                  style={{ ...headingStyle, fontSize: 'clamp(1rem, 2vw, 1.125rem)' }}
                >
                  Agregar conexión
                </h2>
                <button
                  onClick={onClose}
                  className="p-2.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label htmlFor="conn-source" className="block text-xs font-medium text-gray-600 mb-1">
                    Concepto origen *
                  </label>
                  <select
                    id="conn-source"
                    value={connSource}
                    onChange={(e) => setConnSource(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                  >
                    <option value="">Seleccionar...</option>
                    {sortedNodes.map((n) => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="conn-target" className="block text-xs font-medium text-gray-600 mb-1">
                    Concepto destino *
                  </label>
                  <select
                    id="conn-target"
                    value={connTarget}
                    onChange={(e) => setConnTarget(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                  >
                    <option value="">Seleccionar...</option>
                    {sortedNodes
                      .filter((n) => n.id !== connSource)
                      .map((n) => (
                        <option key={n.id} value={n.id}>{n.label}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="conn-type" className="block text-xs font-medium text-gray-600 mb-1">
                    Tipo de relación
                  </label>
                  <select
                    id="conn-type"
                    value={connType}
                    onChange={(e) => setConnType(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                  >
                    {CONNECTION_TYPES.map((ct) => (
                      <option key={ct.key} value={ct.key}>{ct.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="conn-label" className="block text-xs font-medium text-gray-600 mb-1">
                    Descripción (opcional)
                  </label>
                  <input
                    id="conn-label"
                    type="text"
                    value={connLabel}
                    onChange={(e) => setConnLabel(e.target.value)}
                    placeholder="Ej: regula, causa, parte de..."
                    className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none font-sans focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                    maxLength={100}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-5 pt-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={connSaving || !connSource || !connTarget || connSource === connTarget}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-full transition-colors hover:bg-amber-600 disabled:opacity-50"
                >
                  {connSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Crear conexión
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
