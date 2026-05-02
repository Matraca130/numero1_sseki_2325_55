// ============================================================
// Axon — AddNodeEdgeModal
//
// Modal for students to create custom nodes and edges in
// their knowledge graph. Supports two tabs:
//   - "Novo conceito" / "Nuevo concepto": create a custom node
//   - "Nova conexão" / "Nueva conexión": create a custom edge between existing nodes
//
// LANG: pt (default) | es — inline I18N
// ============================================================

import { useState, useMemo, useEffect, useRef, memo } from 'react';
import { X, Plus, Link2, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { createCustomNode, createCustomEdge } from '@/app/services/mindmapApi';
import type { CreateCustomNodePayload, CreateCustomEdgePayload } from '@/app/services/mindmapApi';
import { CONNECTION_TYPES, CONNECTION_TYPE_MAP } from '@/app/types/mindmap';
import type { MapNode, EdgeArrowType, EdgeLineStyle } from '@/app/types/mindmap';
import { colors, headingStyle } from '@/app/design-system';
import { useFocusTrap } from './useFocusTrap';
import { ArrowTypePicker } from './ArrowTypePicker';
import { LineStylePicker } from './LineStylePicker';
import { ColorPicker } from './ColorPicker';

// ── I18N ────────────────────────────────────────────────────

const I18N = {
  pt: {
    modalTitle: 'Personalizar mapa mental',
    close: 'Fechar',
    tabListLabel: 'Tipo de personalização',
    tabNode: 'Novo conceito',
    tabEdge: 'Nova conexão',
    nodeLabelField: 'Nome do conceito *',
    nodeLabelPlaceholder: 'Ex: Hemoglobina, Mitocôndria...',
    nodeDefField: 'Definição (opcional)',
    nodeDefPlaceholder: 'Breve descrição do conceito...',
    edgeSourceField: 'Conceito de origem *',
    edgeTargetField: 'Conceito de destino *',
    selectPlaceholder: 'Selecionar...',
    yours: '(seu)',
    edgeTypeField: 'Tipo de relação',
    directedToggle: 'Seta direcional',
    fromLabel: 'De',
    originFallback: 'origem',
    targetFallback: 'destino',
    arrowTypeField: 'Tipo de seta',
    arrowTypeGroupLabel: 'Tipo de seta',
    arrowTriangle: 'Triângulo',
    arrowDiamond: 'Diamante',
    arrowCircle: 'Círculo',
    arrowOpen: 'Aberta',
    lineStyleField: 'Estilo de linha',
    lineStyleGroupLabel: 'Estilo de linha',
    lineSolid: 'Sólida',
    lineDashed: 'Tracejada',
    lineDotted: 'Pontilhada',
    colorField: 'Cor',
    colorTitle: 'Cor da conexão',
    quickLabel: 'Rápido:',
    colorAriaLabel: (c: string) => `Cor ${c}`,
    edgeLabelField: 'Descrição (opcional)',
    edgeLabelPlaceholder: 'Ex: regula, causa, componente de...',
    cancel: 'Cancelar',
    addNodeBtn: 'Adicionar conceito',
    addEdgeBtn: 'Adicionar conexão',
    addShort: 'Adicionar',
    toastNodeSuccess: 'Conceito adicionado ao mapa',
    toastNodeError: 'Erro ao criar conceito',
    toastEdgeSuccess: 'Conexão adicionada ao mapa',
    toastEdgeError: 'Erro ao criar conexão',
  },
  es: {
    modalTitle: 'Personalizar mapa mental',
    close: 'Cerrar',
    tabListLabel: 'Tipo de personalización',
    tabNode: 'Nuevo concepto',
    tabEdge: 'Nueva conexión',
    nodeLabelField: 'Nombre del concepto *',
    nodeLabelPlaceholder: 'Ej: Hemoglobina, Mitocondria...',
    nodeDefField: 'Definición (opcional)',
    nodeDefPlaceholder: 'Breve descripción del concepto...',
    edgeSourceField: 'Concepto de origen *',
    edgeTargetField: 'Concepto de destino *',
    selectPlaceholder: 'Seleccionar...',
    yours: '(tuyo)',
    edgeTypeField: 'Tipo de relación',
    directedToggle: 'Flecha direccional',
    fromLabel: 'De',
    originFallback: 'origen',
    targetFallback: 'destino',
    arrowTypeField: 'Tipo de flecha',
    arrowTypeGroupLabel: 'Tipo de flecha',
    arrowTriangle: 'Triángulo',
    arrowDiamond: 'Diamante',
    arrowCircle: 'Círculo',
    arrowOpen: 'Abierta',
    lineStyleField: 'Estilo de línea',
    lineStyleGroupLabel: 'Estilo de línea',
    lineSolid: 'Sólida',
    lineDashed: 'Rayada',
    lineDotted: 'Punteada',
    colorField: 'Color',
    colorTitle: 'Color de la conexión',
    quickLabel: 'Rápido:',
    colorAriaLabel: (c: string) => `Color ${c}`,
    edgeLabelField: 'Descripción (opcional)',
    edgeLabelPlaceholder: 'Ej: regula, causa, componente de...',
    cancel: 'Cancelar',
    addNodeBtn: 'Añadir concepto',
    addEdgeBtn: 'Añadir conexión',
    addShort: 'Añadir',
    toastNodeSuccess: 'Concepto añadido al mapa',
    toastNodeError: 'Error al crear concepto',
    toastEdgeSuccess: 'Conexión añadida al mapa',
    toastEdgeError: 'Error al crear conexión',
  },
} as const;

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

export const AddNodeEdgeModal = memo(function AddNodeEdgeModal({
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
  const t = I18N['pt'];

  const [tab, setTab] = useState<TabType>(initialTab || 'node');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
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
  const [edgeLineStyle, setEdgeLineStyle] = useState<EdgeLineStyle>('solid');
  const [edgeColor, setEdgeColor] = useState<string>(colors.primary[500]);
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
    const rafId = requestAnimationFrame(() => {
      if (tab === 'node') nodeLabelRef.current?.focus();
      else edgeSourceRef.current?.focus();
    });
    return () => cancelAnimationFrame(rafId);
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
      setEdgeSource(initialEdgeSource || '');
      if (initialEdgeSource) setEdgeDirected(true); // Connect tool defaults to directed
      setEdgeTarget(initialEdgeTarget || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps — reset form state when modal opens; setters are stable and don't need to be deps
  }, [open, initialEdgeSource, initialEdgeTarget, initialTab]);

  // Escape key to close + prevent body scroll on mobile
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savingRef.current) { e.preventDefault(); e.stopPropagation(); onCloseRef.current(); }
    };
    document.addEventListener('keydown', handleKey);
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [open]);

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
      toast.success(t.toastNodeSuccess);
      onNodeCreated?.(res.id, payload);
      resetForms();
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.toastNodeError);
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSaving(false);
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
      toast.success(t.toastEdgeSuccess);
      onEdgeCreated?.(res.id, payload);
      resetForms();
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.toastEdgeError);
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSaving(false);
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
            onClick={() => { if (!savingRef.current) onClose(); }}
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
                  {t.modalTitle}
                </h2>
                <button
                  onClick={() => { if (!savingRef.current) onClose(); }}
                  className="p-3 -mr-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label={t.close}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div
                className="flex px-5 gap-1 border-b border-gray-100"
                role="tablist"
                aria-label={t.tabListLabel}
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
                  {t.tabNode}
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
                  {t.tabEdge}
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
                        {t.nodeLabelField}
                      </label>
                      <input
                        ref={nodeLabelRef}
                        id="custom-node-label"
                        type="text"
                        value={nodeLabel}
                        onChange={(e) => setNodeLabel(e.target.value)}
                        placeholder={t.nodeLabelPlaceholder}
                        className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none transition-colors font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label htmlFor="custom-node-def" className="block text-xs font-medium text-gray-600 mb-1">
                        {t.nodeDefField}
                      </label>
                      <textarea
                        id="custom-node-def"
                        value={nodeDefinition}
                        onChange={(e) => setNodeDefinition(e.target.value)}
                        placeholder={t.nodeDefPlaceholder}
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
                        {t.edgeSourceField}
                      </label>
                      <select
                        ref={edgeSourceRef}
                        id="custom-edge-source"
                        value={edgeSource}
                        onChange={(e) => setEdgeSource(e.target.value)}
                        className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"
                      >
                        <option value="">{t.selectPlaceholder}</option>
                        {sortedNodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.label}{n.isUserCreated ? ` ${t.yours}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="custom-edge-target" className="block text-xs font-medium text-gray-600 mb-1">
                        {t.edgeTargetField}
                      </label>
                      <select
                        id="custom-edge-target"
                        value={edgeTarget}
                        onChange={(e) => setEdgeTarget(e.target.value)}
                        className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"
                      >
                        <option value="">{t.selectPlaceholder}</option>
                        {sortedNodes
                          .filter((n) => n.id !== edgeSource)
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.label}{n.isUserCreated ? ` ${t.yours}` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="custom-edge-type" className="block text-xs font-medium text-gray-600 mb-1">
                        {t.edgeTypeField}
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
                          {t.directedToggle}
                        </label>
                        {edgeDirected && edgeSource && edgeTarget && (
                          <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                            {t.fromLabel} {sortedNodes.find(n => n.id === edgeSource)?.label ?? t.originFallback} → {sortedNodes.find(n => n.id === edgeTarget)?.label ?? t.targetFallback}
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
                      <ArrowTypePicker
                        value={edgeArrowType}
                        onChange={setEdgeArrowType}
                        groupLabel={t.arrowTypeGroupLabel}
                        fieldLabel={t.arrowTypeField}
                        optionLabels={{
                          triangle: t.arrowTriangle,
                          diamond: t.arrowDiamond,
                          circle: t.arrowCircle,
                          vee: t.arrowOpen,
                        }}
                      />
                    )}

                    {/* Line style + color row */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <LineStylePicker
                          value={edgeLineStyle}
                          onChange={setEdgeLineStyle}
                          groupLabel={t.lineStyleGroupLabel}
                          fieldLabel={t.lineStyleField}
                          optionLabels={{
                            solid: t.lineSolid,
                            dashed: t.lineDashed,
                            dotted: t.lineDotted,
                          }}
                        />
                      </div>
                      <div className="w-20">
                        <ColorPicker.Input
                          value={edgeColor}
                          onChange={setEdgeColor}
                          fieldLabel={t.colorField}
                          inputTitle={t.colorTitle}
                        />
                      </div>
                    </div>

                    {/* Quick color swatches */}
                    <ColorPicker.Swatches
                      value={edgeColor}
                      onChange={setEdgeColor}
                      quickLabel={t.quickLabel}
                      ariaLabel={t.colorAriaLabel}
                      palette={[
                        colors.primary[500],
                        colors.semantic.error,
                        '#f97316',
                        '#8b5cf6',
                        '#06b6d4',
                        '#64748b',
                      ]}
                    />

                    <div>
                      <label htmlFor="custom-edge-label" className="block text-xs font-medium text-gray-600 mb-1">
                        {t.edgeLabelField}
                      </label>
                      <input
                        id="custom-edge-label"
                        type="text"
                        value={edgeLabel}
                        onChange={(e) => setEdgeLabel(e.target.value)}
                        placeholder={t.edgeLabelPlaceholder}
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
                  {t.cancel}
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
                  <span className="hidden sm:inline">{tab === 'node' ? t.addNodeBtn : t.addEdgeBtn}</span>
                  <span className="sm:hidden">{t.addShort}</span>
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
});
