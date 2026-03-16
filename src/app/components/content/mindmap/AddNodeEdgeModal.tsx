// ============================================================
// Axon — AddNodeEdgeModal
//
// Modal for students to create custom nodes and edges in
// their knowledge graph. Supports two tabs:
//   - "Novo conceito": create a custom node
//   - "Nova conexão": create a custom edge between existing nodes
//
// LANG: Brazilian Portuguese (student UI)
// ============================================================

import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Plus, Link2, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { createCustomNode, createCustomEdge } from '@/app/services/mindmapApi';
import { CONNECTION_TYPES } from '@/app/types/mindmap';
import type { MapNode } from '@/app/types/mindmap';
import { headingStyle } from '@/app/design-system';

// ── Types ───────────────────────────────────────────────────

type TabType = 'node' | 'edge';

interface AddNodeEdgeModalProps {
  open: boolean;
  onClose: () => void;
  topicId: string;
  /** Existing nodes for edge source/target selection */
  existingNodes: MapNode[];
  /** Called after successful creation to refetch graph */
  onCreated: () => void;
}

// ── Component ───────────────────────────────────────────────

export function AddNodeEdgeModal({
  open,
  onClose,
  topicId,
  existingNodes,
  onCreated,
}: AddNodeEdgeModalProps) {
  const [tab, setTab] = useState<TabType>('node');
  const [saving, setSaving] = useState(false);

  // Node form
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeDefinition, setNodeDefinition] = useState('');

  // Edge form
  const [edgeSource, setEdgeSource] = useState('');
  const [edgeTarget, setEdgeTarget] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('');
  const [edgeType, setEdgeType] = useState('asociacion');

  const nodeLabelRef = useRef<HTMLInputElement>(null);
  const edgeSourceRef = useRef<HTMLSelectElement>(null);

  // Focus first field when switching tabs
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      if (tab === 'node') nodeLabelRef.current?.focus();
      else edgeSourceRef.current?.focus();
    });
  }, [tab, open]);

  const sortedNodes = useMemo(
    () => [...existingNodes].sort((a, b) => a.label.localeCompare(b.label)),
    [existingNodes],
  );

  // Escape key to close + prevent body scroll on mobile
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const resetForms = () => {
    setNodeLabel('');
    setNodeDefinition('');
    setEdgeSource('');
    setEdgeTarget('');
    setEdgeLabel('');
    setEdgeType('asociacion');
  };

  const handleCreateNode = async () => {
    if (!nodeLabel.trim()) return;
    setSaving(true);
    try {
      await createCustomNode({
        label: nodeLabel.trim(),
        definition: nodeDefinition.trim() || undefined,
        topic_id: topicId,
      });
      toast.success('Conceito adicionado ao mapa');
      resetForms();
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conceito');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEdge = async () => {
    if (!edgeSource || !edgeTarget || edgeSource === edgeTarget) return;
    setSaving(true);
    try {
      await createCustomEdge({
        source_node_id: edgeSource,
        target_node_id: edgeTarget,
        label: edgeLabel.trim() || undefined,
        connection_type: edgeType,
        topic_id: topicId,
      });
      toast.success('Conexão adicionada ao mapa');
      resetForms();
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conexão');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/20 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          >
            <div
              className="bg-white shadow-xl w-full max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Personalizar mapa"
            >
              {/* Mobile drag handle */}
              <div className="flex sm:hidden justify-center pt-2 pb-0">
                <div className="w-8 h-1 rounded-full bg-gray-300" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 sm:pt-5 pb-3">
                <h2
                  className="text-lg font-semibold text-gray-900"
                  style={headingStyle}
                >
                  Personalizar mapa
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex px-5 gap-1 border-b border-gray-100" role="tablist" aria-label="Tipo de personalização">
                <button
                  onClick={() => setTab('node')}
                  role="tab"
                  aria-selected={tab === 'node'}
                  aria-controls="add-node-panel"
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === 'node'
                      ? 'border-[#2a8c7a] text-[#2a8c7a]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo conceito
                </button>
                <button
                  onClick={() => setTab('edge')}
                  role="tab"
                  aria-selected={tab === 'edge'}
                  aria-controls="add-edge-panel"
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    tab === 'edge'
                      ? 'border-[#2a8c7a] text-[#2a8c7a]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Nova conexão
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                {tab === 'node' ? (
                  <div id="add-node-panel" role="tabpanel" className="space-y-3">
                    <div>
                      <label htmlFor="custom-node-label" className="block text-xs font-medium text-gray-600 mb-1">
                        Nome do conceito *
                      </label>
                      <input
                        ref={nodeLabelRef}
                        id="custom-node-label"
                        type="text"
                        value={nodeLabel}
                        onChange={(e) => setNodeLabel(e.target.value)}
                        placeholder="Ex: Hemoglobina, Mitocondria..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none transition-colors font-sans focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a]"
                        style={{ borderColor: nodeLabel ? '#2a8c7a' : undefined }}
                        maxLength={100}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label htmlFor="custom-node-def" className="block text-xs font-medium text-gray-600 mb-1">
                        Definição (opcional)
                      </label>
                      <textarea
                        id="custom-node-def"
                        value={nodeDefinition}
                        onChange={(e) => setNodeDefinition(e.target.value)}
                        placeholder="Breve descrição do conceito..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none resize-none transition-colors font-sans focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a]"
                        rows={2}
                        maxLength={300}
                      />
                    </div>
                  </div>
                ) : (
                  <div id="add-edge-panel" role="tabpanel" className="space-y-3">
                    <div>
                      <label htmlFor="custom-edge-source" className="block text-xs font-medium text-gray-600 mb-1">
                        Conceito de origem *
                      </label>
                      <select
                        ref={edgeSourceRef}
                        id="custom-edge-source"
                        value={edgeSource}
                        onChange={(e) => setEdgeSource(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a]"
                      >
                        <option value="">Selecione...</option>
                        {sortedNodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label}{n.isUserCreated ? ' (seu)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="custom-edge-target" className="block text-xs font-medium text-gray-600 mb-1">
                        Conceito de destino *
                      </label>
                      <select
                        id="custom-edge-target"
                        value={edgeTarget}
                        onChange={(e) => setEdgeTarget(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a]"
                      >
                        <option value="">Selecione...</option>
                        {sortedNodes
                          .filter((n) => n.id !== edgeSource)
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.label}{n.isUserCreated ? ' (seu)' : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="custom-edge-type" className="block text-xs font-medium text-gray-600 mb-1">
                        Tipo de relação
                      </label>
                      <select
                        id="custom-edge-type"
                        value={edgeType}
                        onChange={(e) => setEdgeType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a]"
                      >
                        {CONNECTION_TYPES.map((ct) => (
                          <option key={ct.key} value={ct.key}>
                            {ct.labelPt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="custom-edge-label" className="block text-xs font-medium text-gray-600 mb-1">
                        Descrição (opcional)
                      </label>
                      <input
                        id="custom-edge-label"
                        type="text"
                        value={edgeLabel}
                        onChange={(e) => setEdgeLabel(e.target.value)}
                        placeholder="Ex: regula, causa, componente de..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none font-sans focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a]"
                        maxLength={100}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-5 pb-5 sm:pb-5 pt-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={tab === 'node' ? handleCreateNode : handleCreateEdge}
                  disabled={
                    saving ||
                    (tab === 'node' && !nodeLabel.trim()) ||
                    (tab === 'edge' && (!edgeSource || !edgeTarget || edgeSource === edgeTarget))
                  }
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-full transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#2a8c7a' }}
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  {tab === 'node' ? 'Adicionar conceito' : 'Adicionar conexão'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
