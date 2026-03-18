// ============================================================
// Axon — Graph Template Panel (Professor)
//
// Slide-in panel that lets professors save, browse, load, and
// delete graph templates. Mirrors the AiTutorPanel pattern:
//   - AnimatePresence slide from right
//   - Card-based list of templates
//   - Save current graph as new template
//   - Load a template into the active graph
//   - Delete with confirmation
//
// LANG: Spanish (professor UI)
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  LayoutTemplate, X, Save, Loader2, Trash2, Download, Plus, FileStack,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  fetchGraphTemplates,
  createGraphTemplate,
  deleteGraphTemplate,
} from '@/app/services/mindmapApi';
import type { GraphTemplate, MapNode, MapEdge } from '@/app/types/mindmap';
import { headingStyle } from '@/app/design-system';
import { ConfirmDialog } from './ConfirmDialog';
import { useFocusTrap } from './useFocusTrap';

// ── Brand colors (professor accent) ──────────────────────────

const BRAND = {
  primary: '#2a8c7a',
  dark: '#1B3B36',
  hover: '#244e47',
  light: '#e8f5f1',
  border: '#b3ddd2',
} as const;

// ── Props ────────────────────────────────────────────────────

interface GraphTemplatePanelProps {
  /** Whether the panel is open */
  open: boolean;
  onClose: () => void;
  /** Institution ID for scoping templates */
  institutionId: string;
  /** Current topic ID — used when saving a template */
  topicId: string;
  /** Current graph nodes to save as template */
  currentNodes: MapNode[];
  /** Current graph edges to save as template */
  currentEdges: MapEdge[];
  /** Called when a template is loaded — parent updates graph */
  onLoadTemplate: (nodes: MapNode[], edges: MapEdge[]) => void;
}

// ── Component ────────────────────────────────────────────────

export function GraphTemplatePanel({
  open,
  onClose,
  institutionId,
  topicId,
  currentNodes,
  currentEdges,
  onLoadTemplate,
}: GraphTemplatePanelProps) {
  // ── State ─────────────────────────────────────────────────
  const [templates, setTemplates] = useState<GraphTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GraphTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const savingRef = useRef(false);
  const deletingRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const focusTrapRef = useFocusTrap(open);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [loadTarget, setLoadTarget] = useState<GraphTemplate | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // ── Fetch templates on open ───────────────────────────────

  const loadTemplates = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const result = await fetchGraphTemplates(institutionId);
      if (mountedRef.current) setTemplates(result);
    } catch {
      if (mountedRef.current) toast.error('Error al cargar plantillas');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    if (open) {
      loadTemplates();
    } else {
      // Reset save form state when panel closes
      setShowSaveForm(false);
      setSaveName('');
      setSaveDescription('');
      setDeleteTarget(null);
      setLoadTarget(null);
    }
  }, [open, loadTemplates]);

  // Focus name input when save form opens
  useEffect(() => {
    if (showSaveForm && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [showSaveForm]);

  // ── Save handler ──────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (savingRef.current) return;
    const trimmedName = saveName.trim();
    if (!trimmedName) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (currentNodes.length === 0) {
      toast.error('El grafo actual no tiene nodos');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const created = await createGraphTemplate({
        name: trimmedName,
        description: saveDescription.trim() || undefined,
        institution_id: institutionId,
        topic_id: topicId,
        nodes: currentNodes,
        edges: currentEdges,
      });
      if (!mountedRef.current) return;
      setTemplates(prev => [created, ...prev]);
      setSaveName('');
      setSaveDescription('');
      setShowSaveForm(false);
      toast.success('Plantilla guardada');
    } catch (err: unknown) {
      if (mountedRef.current) {
        toast.error(err instanceof Error ? err.message : 'Error al guardar plantilla');
      }
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  }, [saveName, saveDescription, institutionId, topicId, currentNodes, currentEdges]);

  // ── Delete handler ────────────────────────────────────────

  const executeDelete = useCallback(async () => {
    if (!deleteTarget || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await deleteGraphTemplate(deleteTarget.id);
      if (!mountedRef.current) return;
      setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success('Plantilla eliminada');
    } catch (err: unknown) {
      if (mountedRef.current) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar plantilla');
      }
    } finally {
      deletingRef.current = false;
      if (mountedRef.current) setDeleting(false);
    }
  }, [deleteTarget]);

  // ── Load handler ──────────────────────────────────────────

  const executeLoad = useCallback(() => {
    if (!loadTarget) return;
    onLoadTemplate(loadTarget.nodes, loadTarget.edges);
    toast.success(`Plantilla "${loadTarget.name}" cargada`);
    setLoadTarget(null);
    onCloseRef.current();
  }, [loadTarget, onLoadTemplate]);

  // ── Render ────────────────────────────────────────────────

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            ref={focusTrapRef}
            className="absolute right-0 top-0 bottom-0 w-80 sm:w-[22rem] bg-surface-page border-l border-gray-200 shadow-lg z-20 flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Panel de plantillas de grafo"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: BRAND.light }}
                >
                  <LayoutTemplate className="w-4 h-4" style={{ color: BRAND.primary }} aria-hidden="true" />
                </div>
                <h3
                  className="font-semibold text-gray-900"
                  style={{ ...headingStyle, fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                >
                  Plantillas de Grafo
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 sm:w-8 sm:h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar panel de plantillas"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Save as template toggle */}
              {!showSaveForm ? (
                <button
                  onClick={() => setShowSaveForm(true)}
                  disabled={currentNodes.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 font-medium text-white rounded-full transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: BRAND.primary,
                    fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)',
                  }}
                  onMouseEnter={(e) => { if (currentNodes.length > 0) e.currentTarget.style.backgroundColor = BRAND.hover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = BRAND.primary; }}
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Guardar como plantilla
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3"
                >
                  <h4
                    className="flex items-center gap-1.5 font-medium text-gray-700"
                    style={{ ...headingStyle, fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
                  >
                    <Save className="w-3.5 h-3.5" style={{ color: BRAND.primary }} aria-hidden="true" />
                    Nueva plantilla
                  </h4>
                  <div>
                    <label
                      htmlFor="template-name"
                      className="block font-sans text-xs text-gray-500 mb-1"
                    >
                      Nombre *
                    </label>
                    <input
                      ref={nameInputRef}
                      id="template-name"
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Ej: Sistema cardiovascular base"
                      maxLength={100}
                      className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a] transition-shadow font-sans"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="template-description"
                      className="block font-sans text-xs text-gray-500 mb-1"
                    >
                      Descripción (opcional)
                    </label>
                    <textarea
                      id="template-description"
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      placeholder="Breve descripción de la plantilla..."
                      maxLength={300}
                      rows={2}
                      className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2a8c7a]/20 focus:border-[#2a8c7a] transition-shadow resize-none font-sans"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving || !saveName.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 font-medium text-white rounded-full transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: BRAND.primary,
                        fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)',
                      }}
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => { setShowSaveForm(false); setSaveName(''); setSaveDescription(''); }}
                      className="px-3 py-2 font-medium text-gray-500 bg-gray-50 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                      style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                    >
                      Cancelar
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 font-sans">
                    {currentNodes.length} nodos y {currentEdges.length} conexiones se guardarán.
                  </p>
                </motion.div>
              )}

              {/* Loading state */}
              {loading && (
                <div aria-live="polite" aria-atomic="true">
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: BRAND.primary }} aria-hidden="true" />
                  <p className="text-sm text-gray-400 font-sans">Cargando plantillas...</p>
                </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && templates.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: BRAND.light }}
                  >
                    <FileStack className="w-7 h-7" style={{ color: BRAND.primary }} aria-hidden="true" />
                  </div>
                  <h4
                    className="font-semibold text-gray-900 mb-1.5"
                    style={{ ...headingStyle, fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                  >
                    Sin plantillas
                  </h4>
                  <p
                    className="text-gray-500 leading-relaxed font-sans"
                    style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
                  >
                    Guarda un grafo como plantilla para reutilizarlo rápidamente en futuros tópicos.
                  </p>
                </motion.div>
              )}

              {/* Template list */}
              {!loading && templates.length > 0 && (
                <div className="space-y-2">
                  <p
                    className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1 font-sans"
                  >
                    {templates.length} plantilla{templates.length !== 1 ? 's' : ''} guardada{templates.length !== 1 ? 's' : ''}
                  </p>
                  {templates.map((template, index) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.04, ease: [0.32, 0.72, 0, 1] }}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 group hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4
                          className="font-medium text-gray-800 truncate"
                          style={{ ...headingStyle, fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
                          title={template.name}
                        >
                          {template.name}
                        </h4>
                      </div>
                      {template.description && (
                        <p
                          className="text-gray-400 font-sans line-clamp-2 mb-2"
                          style={{ fontSize: 'clamp(0.6875rem, 1.1vw, 0.75rem)' }}
                        >
                          {template.description}
                        </p>
                      )}
                      {/* Stats */}
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className="font-sans px-2 py-0.5 rounded-full"
                          style={{
                            fontSize: 'clamp(0.625rem, 1vw, 0.6875rem)',
                            backgroundColor: BRAND.light,
                            color: BRAND.primary,
                          }}
                        >
                          {template.nodes.length} nodos
                        </span>
                        <span
                          className="font-sans px-2 py-0.5 rounded-full bg-gray-50 text-gray-500"
                          style={{ fontSize: 'clamp(0.625rem, 1vw, 0.6875rem)' }}
                        >
                          {template.edges.length} conexiones
                        </span>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setLoadTarget(template)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 font-medium text-white rounded-full transition-colors"
                          style={{
                            backgroundColor: BRAND.primary,
                            fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = BRAND.hover; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = BRAND.primary; }}
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                          Cargar plantilla
                        </button>
                        <button
                          onClick={() => setDeleteTarget(template)}
                          className="w-8 h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                          aria-label={`Eliminar plantilla ${template.name}`}
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Date */}
                      <p
                        className="text-gray-300 font-sans mt-2"
                        style={{ fontSize: 'clamp(0.5625rem, 0.9vw, 0.625rem)' }}
                      >
                        {new Date(template.created_at).toLocaleDateString('es', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load confirmation */}
      {loadTarget && (
        <ConfirmDialog
          title="¿Cargar plantilla?"
          description={`Cargar "${loadTarget.name}" reemplazará el grafo actual. ¿Continuar?`}
          cancelLabel="Cancelar"
          confirmLabel="Cargar"
          onCancel={() => setLoadTarget(null)}
          onConfirm={executeLoad}
          zClass="z-[60]"
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="¿Eliminar plantilla?"
          description={`Se eliminará la plantilla "${deleteTarget.name}". Esta acción no se puede deshacer.`}
          cancelLabel="Cancelar"
          confirmLabel={deleting ? 'Eliminando...' : 'Eliminar'}
          onCancel={() => { if (!deleting) setDeleteTarget(null); }}
          onConfirm={executeDelete}
          confirmDisabled={deleting}
          zClass="z-[60]"
        />
      )}
    </>
  );
}
