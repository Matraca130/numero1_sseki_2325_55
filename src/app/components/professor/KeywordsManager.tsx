// ============================================================
// Axon — KeywordsManager (Professor: full CRUD for keywords)
//
// Routes: GET /keywords?summary_id=xxx, POST, PUT, DELETE
// Features: table with name/definition/priority/subtopic count,
//   modal create/edit, expandable rows for SubtopicsPanel +
//   KeywordConnectionsPanel.
// priority is INTEGER: 1 (baja), 2 (media), 3 (alta). NEVER strings.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Plus, Edit3, Trash2, Save, X, Loader2, Tag,
  ChevronDown, ChevronUp, Link2, Layers, MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import { SubtopicsPanel } from './SubtopicsPanel';
import { KeywordConnectionsPanel } from './KeywordConnectionsPanel';
import { ProfessorNotesPanel, ProfessorNotesBadge } from './ProfessorNotesPanel';
import { apiCall } from '@/app/lib/api';
import * as api from '@/app/services/summariesApi';
import type { SummaryKeyword, Subtopic } from '@/app/services/summariesApi';

// ── Helper ────────────────────────────────────────────────
function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

// ── Priority config ───────────────────────────────────────
const priorityLabels: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Baja',  color: 'text-gray-500',    bg: 'bg-gray-100' },
  2: { label: 'Media', color: 'text-amber-600',   bg: 'bg-amber-50' },
  3: { label: 'Alta',  color: 'text-red-600',     bg: 'bg-red-50' },
};

interface KeywordsManagerProps {
  summaryId: string;
}

export function KeywordsManager({ summaryId }: KeywordsManagerProps) {
  const [keywords, setKeywords] = useState<SummaryKeyword[]>([]);
  const [loading, setLoading] = useState(true);

  // Subtopic counts
  const [subtopicCounts, setSubtopicCounts] = useState<Record<string, number>>({});

  // Note counts
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});

  // Expanded panels
  const [expandedSubtopics, setExpandedSubtopics] = useState<string | null>(null);
  const [expandedConnections, setExpandedConnections] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);

  // Modal create/edit
  const [showModal, setShowModal] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<SummaryKeyword | null>(null);
  const [formName, setFormName] = useState('');
  const [formDefinition, setFormDefinition] = useState('');
  const [formPriority, setFormPriority] = useState<number>(2);
  const [savingModal, setSavingModal] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch keywords ──────────────────────────────────────
  const fetchKeywords = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getKeywords(summaryId);
      const items = extractItems<SummaryKeyword>(result).filter(k => k.is_active !== false);
      setKeywords(items);

      // Fetch subtopic counts in parallel
      const counts: Record<string, number> = {};
      await Promise.all(
        items.map(async (kw) => {
          try {
            const subResult = await api.getSubtopics(kw.id);
            const subs = extractItems<Subtopic>(subResult);
            counts[kw.id] = subs.filter(s => s.is_active !== false).length;
          } catch {
            counts[kw.id] = 0;
          }
        })
      );
      setSubtopicCounts(counts);

      // Fetch note counts in parallel
      const nCounts: Record<string, number> = {};
      await Promise.all(
        items.map(async (kw) => {
          try {
            const notesResult = await apiCall<any>(`/kw-prof-notes?keyword_id=${kw.id}`);
            const notes = extractItems<any>(notesResult);
            nCounts[kw.id] = notes.length;
          } catch {
            nCounts[kw.id] = 0;
          }
        })
      );
      setNoteCounts(nCounts);
    } catch (err: any) {
      console.error('[KeywordsManager] fetch error:', err);
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  }, [summaryId]);

  useEffect(() => { fetchKeywords(); }, [fetchKeywords]);

  // ── Open modal ──────────────────────────────────────────
  const openCreate = () => {
    setEditingKeyword(null);
    setFormName('');
    setFormDefinition('');
    setFormPriority(2);
    setShowModal(true);
  };

  const openEdit = (kw: SummaryKeyword) => {
    setEditingKeyword(kw);
    setFormName(kw.name);
    setFormDefinition(kw.definition || '');
    setFormPriority(kw.priority ?? 2);
    setShowModal(true);
  };

  // ── Save (create or update) ─────────────────────────────
  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSavingModal(true);
    try {
      if (editingKeyword) {
        await api.updateKeyword(editingKeyword.id, {
          name: formName.trim(),
          definition: formDefinition.trim() || undefined,
          priority: formPriority,
        });
        toast.success('Keyword actualizado');
      } else {
        await api.createKeyword({
          summary_id: summaryId,
          name: formName.trim(),
          definition: formDefinition.trim() || undefined,
          priority: formPriority,
        });
        toast.success('Keyword creado');
      }
      setShowModal(false);
      await fetchKeywords();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar keyword');
    } finally {
      setSavingModal(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await api.deleteKeyword(deletingId);
      toast.success('Keyword eliminado');
      setDeletingId(null);
      if (expandedSubtopics === deletingId) setExpandedSubtopics(null);
      if (expandedConnections === deletingId) setExpandedConnections(null);
      if (expandedNotes === deletingId) setExpandedNotes(null);
      await fetchKeywords();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Toggle panels ───────────────────────────────────────
  const toggleSubtopics = (kwId: string) => {
    setExpandedSubtopics(prev => prev === kwId ? null : kwId);
    if (expandedConnections === kwId) setExpandedConnections(null);
    if (expandedNotes === kwId) setExpandedNotes(null);
  };

  const toggleConnections = (kwId: string) => {
    setExpandedConnections(prev => prev === kwId ? null : kwId);
    if (expandedSubtopics === kwId) setExpandedSubtopics(null);
    if (expandedNotes === kwId) setExpandedNotes(null);
  };

  const toggleNotes = (kwId: string) => {
    setExpandedNotes(prev => prev === kwId ? null : kwId);
    if (expandedSubtopics === kwId) setExpandedSubtopics(null);
    if (expandedConnections === kwId) setExpandedConnections(null);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm text-gray-700 flex items-center gap-1.5">
            <Tag size={14} className="text-violet-500" />
            Keywords
            {!loading && (
              <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
                {keywords.length}
              </span>
            )}
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Gestiona palabras clave, subtemas y conexiones
          </p>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          className="bg-violet-600 hover:bg-violet-700 text-white h-7 text-xs px-3"
        >
          <Plus size={12} className="mr-1" />
          Nuevo Keyword
        </Button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-6 h-6 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-48 mb-2" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : keywords.length === 0 ? (
          <div className="text-center py-8">
            <Tag size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No hay keywords en este resumen</p>
            <p className="text-[10px] text-gray-300 mt-1">Crea el primer keyword para organizar el contenido</p>
          </div>
        ) : (
          <div className="space-y-1">
            {keywords.map(kw => {
              const prio = priorityLabels[kw.priority] || priorityLabels[2];
              const subCount = subtopicCounts[kw.id] ?? 0;
              const noteCount = noteCounts[kw.id] ?? 0;
              const isSubExpanded = expandedSubtopics === kw.id;
              const isConnExpanded = expandedConnections === kw.id;
              const isNotesExpanded = expandedNotes === kw.id;

              return (
                <motion.div
                  key={kw.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border border-gray-100 rounded-lg overflow-hidden"
                >
                  {/* Row */}
                  <div className="flex items-center gap-3 px-4 py-2.5 group hover:bg-gray-50/50 transition-colors">
                    <Tag size={13} className="text-violet-400 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-gray-800 truncate">{kw.name}</p>
                        <ProfessorNotesBadge count={noteCount} />
                      </div>
                      {kw.definition && (
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{kw.definition}</p>
                      )}
                    </div>

                    {/* Priority badge */}
                    <span className={clsx(
                      "text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                      prio.bg, prio.color
                    )}>
                      P{kw.priority} {prio.label}
                    </span>

                    {/* Subtopic count */}
                    <button
                      onClick={() => toggleSubtopics(kw.id)}
                      className={clsx(
                        "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors shrink-0",
                        isSubExpanded
                          ? "bg-violet-100 text-violet-700"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                      title="Subtemas"
                    >
                      <Layers size={10} />
                      {subCount}
                      {isSubExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>

                    {/* Connections toggle */}
                    <button
                      onClick={() => toggleConnections(kw.id)}
                      className={clsx(
                        "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors shrink-0",
                        isConnExpanded
                          ? "bg-violet-100 text-violet-700"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                      title="Conexiones"
                    >
                      <Link2 size={10} />
                    </button>

                    {/* Notes toggle */}
                    <button
                      onClick={() => toggleNotes(kw.id)}
                      className={clsx(
                        "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors shrink-0",
                        isNotesExpanded
                          ? "bg-violet-100 text-violet-700"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                      title="Notas"
                    >
                      <MessageSquare size={10} />
                      {noteCount}
                      {isNotesExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(kw)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Editar"
                    >
                      <Edit3 size={13} className="text-gray-400 hover:text-violet-600" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeletingId(kw.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar"
                    >
                      <Trash2 size={13} className="text-gray-400 hover:text-red-600" />
                    </button>
                  </div>

                  {/* Expanded: Subtopics */}
                  <AnimatePresence>
                    {isSubExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-50 bg-gray-50/30"
                      >
                        <SubtopicsPanel keywordId={kw.id} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Expanded: Connections */}
                  <AnimatePresence>
                    {isConnExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-50 bg-gray-50/30"
                      >
                        <KeywordConnectionsPanel
                          keywordId={kw.id}
                          keywordName={kw.name}
                          allKeywords={keywords}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Expanded: Notes */}
                  <AnimatePresence>
                    {isNotesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-50 bg-gray-50/30"
                      >
                        <ProfessorNotesPanel keywordId={kw.id} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CREATE / EDIT MODAL                                    */}
      {/* ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-sm text-gray-800 mb-4">
                {editingKeyword ? 'Editar Keyword' : 'Nuevo Keyword'}
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">Nombre *</label>
                  <Input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Nombre del keyword"
                    className="mt-1 h-8 text-xs"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">Definicion</label>
                  <Textarea
                    value={formDefinition}
                    onChange={e => setFormDefinition(e.target.value)}
                    placeholder="Definicion o descripcion (opcional)"
                    className="mt-1 text-xs min-h-[60px]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">Prioridad</label>
                  <div className="flex items-center gap-2 mt-1">
                    {[1, 2, 3].map(p => {
                      const cfg = priorityLabels[p];
                      return (
                        <button
                          key={p}
                          onClick={() => setFormPriority(p)}
                          className={clsx(
                            "flex-1 text-xs py-1.5 rounded-lg border transition-all",
                            formPriority === p
                              ? "border-violet-400 bg-violet-50 text-violet-700"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          )}
                        >
                          {cfg.label} ({p})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="h-8 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={savingModal || !formName.trim()}
                  className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {savingModal ? (
                    <Loader2 size={12} className="animate-spin mr-1" />
                  ) : (
                    <Save size={12} className="mr-1" />
                  )}
                  {editingKeyword ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={open => { if (!open) setDeletingId(null); }}
        title="Eliminar keyword"
        description="Se eliminaran tambien los subtemas asociados. Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}