// ============================================================
// Axon — AddNodeEdgeModal
//
// Modal for students to create custom nodes and edges in
// their knowledge graph. Supports two tabs:
//   - "Nuevo concepto": create a custom node
//   - "Nueva conexión": create a custom edge between existing nodes
//
// LANG: Spanish (student UI)
// ============================================================

import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Plus, Link2, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { createCustomNode, createCustomEdge } from '@/app/services/mindmapApi';
import type { CreateCustomNodePayload, CreateCustomEdgePayload } from '@/app/services/mindmapApi';
import { CONNECTION_TYPES, CONNECTION_TYPE_MAP } from '@/app/types/mindmap';
import type { MapNode, EdgeArrowType } from '@/app/types/mindmap';
import { colors, headingStyle } from '@/app/design-system';
import { useFocusTrap } from './useFocusTrap';

// ── Types ───────────────────────────────────────────────────

export type TabType = 'node' | 'edge';

interface AddNodeEdgeModalProps {
  open: boolean;
  onClose: () => void;
  topicId: string;
  /** Existing nodes for edge source/target selection */
  existingNodes: MapNode[];
  /** Called after successful creation to refetch graph */
  onCreated: () => void;
  /** Called with created node info for undo tracking */
  onNodeCreated?: (nodeId: string, payload: CreateCustomNodePayload) => void;
  /** Called with created edge info for undo tracking */
  onEdgeCreated?: (edgeId: string, payload: CreateCustomEdgePayload) => void;
  /** Pre-fill edge source node ID (from connect tool) */
  initialEdgeSource?: string;
  /** Pre-fill edge target node ID (from connect tool) */
  initialEdgeTarget?: string;
  /** Force open on edge tab */
  initialTab?: TabType;
}

// ── Component ───────────────────────────────────────────────

export function AddNodeEdgeModal({
  open,
  onClose,
  topicId,
  existingNodes,
  onCreated,
  onNodeCreated,
  onEdgeCreated,
  initialEdgeSource,
  initialEdgeTarget,
  initialTab,
}: AddNodeEdgeModalProps) {
  const [tab, setTab] = useState<TabType>(initialTab || 'node');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [shake, setShake] = useState(false);

  // Node form
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeDefinition, setNodeDefinition] = useState('');

  // Edge form
  const [edgeSource, setEdgeSource] = useState(initialEdgeSource || '');
  const [edgeTarget, setEdgeTarget] = useState(initialEdgeTarget || '');
  const [edgeLabel, setEdgeLabel] = useState('');
  const [edgeType, setEdgeType] = useState('asociacion');
  const [edgeDirected, setEdgeDirected] = useState(!!initialEdgeSource);
  const [edgeLineStyle, setEdgeLineStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [edgeColor, setEdgeColor] = useState(colors.primary[500]);
  const [edgeArrowType, setEdgeArrowType] = useState<EdgeArrowType>('triangle');

  // Clear target if it matches source (prevents self-loop edge)
  useEffect(() => {
    if (edgeSource && edgeSource === edgeTarget) setEdgeTarget('');
  }, [edgeSource, edgeTarget]);

  const focusTrapRef = useFocusTrap(open);
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

  // Reset form state when modal closes, apply initial values when it opens
  useEffect(() => {
    if (!open) {
      resetForms();
      setTab('node');
    } else {
      if (initialTab) setTab(initialTab);
      if (initialEdgeSource) {
        setEdgeSource(initialEdgeSource);
        setEdgeDirected(true); // Connect tool defaults to directed
      }
      if (initialEdgeTarget) setEdgeTarget(initialEdgeTarget);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape key to close + prevent body scroll on mobile
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savingRef.current) onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.documentElement.style.overflow = '';
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
    setEdgeDirected(false);
    setEdgeLineStyle('solid');
    setEdgeColor(colors.primary[500]);
    setEdgeArrowType('triangle');
  };

  const handleCreateNode = async () => {
    if (!nodeLabel.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const payload: CreateCustomNodePayload = {
        label: nodeLabel.trim(),
        definition: nodeDefinition.trim() || undefined,
        topic_id: topicId,
      };
      const res = await createCustomNode(payload);
      toast.success('Concepto añadido al mapa');
      onNodeCreated?.(res.id, payload);
      resetForms();
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear concepto');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleCreateEdge = async () => {
    if (!edgeSource || !edgeTarget || edgeSource === edgeTarget || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const payload: CreateCustomEdgePayload = {
        source_node_id: edgeSource,
        target_node_id: edgeTarget,
        label: edgeLabel.trim() || undefined,
        connection_type: edgeType,
        topic_id: topicId,
        line_style: edgeLineStyle !== 'solid' ? edgeLineStyle as 'dashed' | 'dotted' : undefined,
        custom_color: edgeColor !== colors.primary[500] ? edgeColor : undefined,
        directed: edgeDirected || undefined,
        arrow_type: edgeDirected && edgeArrowType !== 'triangle' ? edgeArrowType : undefined,
      };
      const res = await createCustomEdge(payload);
      toast.success('Conexión añadida al mapa');
      onEdgeCreated?.(res.id, payload);
      resetForms();
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al crear conexión');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!savingRef.current) onClose(); }}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            onClick={onClose}
          >
            <motion.div
              ref={focusTrapRef}
              className="bg-white shadow-lg w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90dvh] overflow-y-auto"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-modal-title"
            >
              {/* Mobile drag handle */}
              <div className="flex sm:hidden justify-center pt-2 pb-0">
                <div className="w-8 h-1 rounded-full bg-gray-300" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 sm:pt-5 pb-3">
                <h2
                  id="add-modal-title"
                  className="font-semibold text-gray-900"
                  style={{ ...headingStyle, fontSize: 'clamp(1rem, 2vw, 1.125rem)' }}
                >
                  Personalizar mapa mental
                </h2>
                <button
                  onClick={onClose}
                  className="p-3 -mr-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div
                className="flex px-5 gap-1 border-b border-gray-100"
                role="tablist"
                aria-label="Tipo de personalización"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    setTab(tab === 'node' ? 'edge' : 'node');
                  }
                }}
              >
                <button
                  id="tab-add-node"
                  onClick={() => setTab('node')}
                  role="tab"
                  aria-selected={tab === 'node'}
                  aria-controls="add-node-panel"
                  tabIndex={tab === 'node' ? 0 : -1}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === 'node'
                      ? 'border-ax-primary-500 text-ax-primary-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nuevo concepto
                </button>
                <button
                  id="tab-add-edge"
                  onClick={() => setTab('edge')}
                  role="tab"
                  aria-selected={tab === 'edge'}
                  aria-controls="add-edge-panel"
                  tabIndex={tab === 'edge' ? 0 : -1}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === 'edge'
                      ? 'border-ax-primary-500 text-ax-primary-500'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Nueva conexión
                </button>
              </div>

              {/* Body */}
              <motion.div
                className="px-5 py-4"
                animate={shake ? { x: [0, -3, 3, -3, 3, 0] } : { x: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                onAnimationComplete={() => { if (shake) setShake(false); }}
              >
                {tab === 'node' ? (
                  <form
                    id="add-node-panel"
                    role="tabpanel"
                    aria-labelledby="tab-add-node"
                    className="space-y-3"
                    onSubmit={(e) => { e.preventDefault(); if (nodeLabel.trim() && !saving) handleCreateNode(); }}
                  >
                    <div>
                      <label htmlFor="custom-node-label" className="block text-xs font-medium text-gray-600 mb-1">
                        Nombre del concepto *
                      </label>
                      <input
                        ref={nodeLabelRef}
                        id="custom-node-label"
                        type="text"
                        value={nodeLabel}
                        onChange={(e) => setNodeLabel(e.target.value)}
                        placeholder="Ej: Hemoglobina, Mitocondria..."
                        className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none transition-colors font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label htmlFor="custom-node-def" className="block text-xs font-medium text-gray-600 mb-1">
                        Definición (opcional)
                      </label>
                      <textarea
                        id="custom-node-def"
                        value={nodeDefinition}
                        onChange={(e) => setNodeDefinition(e.target.value)}
                        placeholder="Breve descripción del concepto..."
                        className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none resize-none transition-colors font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"
                        rows={2}
                        maxLength={300}
                      />
                    </div>
                  </form>
                ) : (
                  <form
                    id="add-edge-panel"
                    role="tabpanel"
                    aria-labelledby="tab-add-edge"
                    className="space-y-3"
                    onSubmit={(e) => { e.preventDefault(); if (edgeSource && edgeTarget && edgeSource !== edgeTarget && !saving) handleCreateEdge(); }}
                  >
                    <div>
                      <label htmlFor="custom-edge-source" className="block text-xs font-medium text-gray-600 mb-1">
                        Concepto de origen *
                      </label>
                      <select
                        ref={edgeSourceRef}
                        id="custom-edge-source"
                        value={edgeSource}
                        onChange={(e) => setEdgeSource(e.target.value)}
                        className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"
                      >
                        <option value="">Seleccionar...</option>
                        {sortedNodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label}{n.isUserCreated ? ' (tuyo)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="custom-edge-target" className="block text-xs font-medium text-gray-600 mb-1">
                        Concepto de destino *
                      </label>
                      <select
                        id="custom-edge-target"
                        value={edgeTarget}
                        onChange={(e) => setEdgeTarget(e.target.value)}
                        className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"
                      >
                        <option value="">Seleccionar...</option>
                        {sortedNodes
                          .filter((n) => n.id !== edgeSource)
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.label}{n.isUserCreated ? ' (tuyo)' : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="custom-edge-type" className="block text-xs font-medium text-gray-600 mb-1">
                        Tipo de relación
                      </label>
                      <select
                        id="custom-edge-type"
                        value={edgeType}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setEdgeType(newType);
                          // Auto-sync directed toggle from connection type metadata
                          const meta = CONNECTION_TYPE_MAP.get(newType);
                          if (meta) setEdgeDirected(meta.directed);
                        }}
                        className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"
                      >
                        {CONNECTION_TYPES.map((ct) => (
                          <option key={ct.key} value={ct.key}>
                            {ct.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Directed edge toggle */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <label htmlFor="custom-edge-directed" className="block text-xs font-medium text-gray-600">
                          Flecha direccional
                        </label>
                        {edgeDirected && edgeSource && edgeTarget && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                            De {sortedNodes.find(n => n.id === edgeSource)?.label ?? 'origen'} → {sortedNodes.find(n => n.id === edgeTarget)?.label ?? 'destino'}
                          </p>
                        )}
                      </div>
                      <button
                        id="custom-edge-directed"
                        type="button"
                        role="switch"
                        aria-checked={edgeDirected}
                        onClick={() => setEdgeDirected(d => !d)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ax-primary-500/20 ${
                          edgeDirected ? 'bg-ax-primary-500' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            edgeDirected ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    {/* Arrow type selector — only when directed */}
                    {edgeDirected && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Tipo de flecha
                        </label>
                        <div className="flex gap-1.5" role="radiogroup" aria-label="Tipo de flecha">
                          {([
                            { type: 'triangle' as const, label: 'Triángulo' },
                            { type: 'diamond' as const, label: 'Diamante' },
                            { type: 'circle' as const, label: 'Círculo' },
                            { type: 'vee' as const, label: 'Abierta' },
                          ]).map(({ type, label }) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setEdgeArrowType(type)}
                              className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-[10px] transition-colors ${
                                edgeArrowType === type
                                  ? 'border-ax-primary-500 bg-ax-primary-50 text-ax-primary-500 font-medium'
                                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                              role="radio"
                              aria-checked={edgeArrowType === type}
                              aria-label={label}
                            >
                              <svg width="28" height="14" viewBox="0 0 28 14" className="flex-shrink-0">
                                <line x1="0" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.5" />
                                {type === 'triangle' && (
                                  <polygon points="18,3 28,7 18,11" fill="currentColor" />
                                )}
                                {type === 'diamond' && (
                                  <polygon points="18,7 23,3 28,7 23,11" fill="currentColor" />
                                )}
                                {type === 'circle' && (
                                  <circle cx="23" cy="7" r="4" fill="currentColor" />
                                )}
                                {type === 'vee' && (
                                  <polyline points="18,3 28,7 18,11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                )}
                              </svg>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Line style + color row */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label htmlFor="custom-edge-line" className="block text-xs font-medium text-gray-600 mb-1">
                          Estilo de línea
                        </label>
                        <div className="flex gap-1.5" role="radiogroup" aria-label="Estilo de línea">
                          {(['solid', 'dashed', 'dotted'] as const).map((style) => (
                            <button
                              key={style}
                              type="button"
                              onClick={() => setEdgeLineStyle(style)}
                              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs transition-colors ${
                                edgeLineStyle === style
                                  ? 'border-ax-primary-500 bg-ax-primary-50 text-ax-primary-500 font-medium'
                                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                              role="radio"
                              aria-checked={edgeLineStyle === style}
                              aria-label={style === 'solid' ? 'Sólida' : style === 'dashed' ? 'Rayada' : 'Punteada'}
                            >
                              <svg width="24" height="2" className="flex-shrink-0">
                                <line
                                  x1="0" y1="1" x2="24" y2="1"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeDasharray={style === 'dashed' ? '4,3' : style === 'dotted' ? '1,3' : undefined}
                                />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="w-20">
                        <label htmlFor="custom-edge-color" className="block text-xs font-medium text-gray-600 mb-1">
                          Color
                        </label>
                        <div className="relative">
                          <input
                            id="custom-edge-color"
                            type="color"
                            value={edgeColor}
                            onChange={(e) => setEdgeColor(e.target.value)}
                            className="w-full h-[38px] rounded-lg border border-gray-200 cursor-pointer p-0.5"
                            title="Color de la conexión"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick color swatches */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 mr-1">Rápido:</span>
                      {[colors.primary[500], colors.semantic.error, '#f97316', '#8b5cf6', '#06b6d4', '#64748b'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEdgeColor(c)}
                          className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                            edgeColor === c ? 'border-gray-800 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`Color ${c}`}
                        />
                      ))}
                    </div>

                    <div>
                      <label htmlFor="custom-edge-label" className="block text-xs font-medium text-gray-600 mb-1">
                        Descripción (opcional)
                      </label>
                      <input
                        id="custom-edge-label"
                        type="text"
                        value={edgeLabel}
                        onChange={(e) => setEdgeLabel(e.target.value)}
                        placeholder="Ej: regula, causa, componente de..."
                        className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"
                        maxLength={100}
                      />
                    </div>
                  </form>
                )}
              </motion.div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-5 pt-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 min-h-[44px] text-sm font-medium text-gray-500 hover:text-gray-700 rounded-full transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const isInvalid = (tab === 'node' && !nodeLabel.trim()) || (tab === 'edge' && (!edgeSource || !edgeTarget || edgeSource === edgeTarget));
                    if (isInvalid && !saving) {
                      setShake(true);
                      return;
                    }
                    if (!saving) (tab === 'node' ? handleCreateNode : handleCreateEdge)();
                  }}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-sm font-medium text-white rounded-full transition-colors disabled:opacity-50 bg-ax-primary-500 hover:bg-ax-primary-600 shadow-sm"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{tab === 'node' ? 'Añadir concepto' : 'Añadir conexión'}</span>
                  <span className="sm:hidden">Añadir</span>
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
