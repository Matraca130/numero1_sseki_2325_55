// ============================================================
// Axon — SubtopicsPanel (Professor: CRUD subtopics per keyword)
//
// Shown when expanding a keyword in KeywordsManager.
// Routes: GET /subtopics?keyword_id=xxx, POST, PUT, DELETE
// order_index starts at 0. is_active toggleable.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Plus, Trash2, Save, X, Loader2, GripVertical, ToggleLeft, ToggleRight,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import * as api from '@/app/services/summariesApi';
import type { Subtopic } from '@/app/services/summariesApi';

// ── Helper ────────────────────────────────────────────────
function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

interface SubtopicsPanelProps {
  keywordId: string;
}

export function SubtopicsPanel({ keywordId }: SubtopicsPanelProps) {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline add
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch ───────────────────────────────────────────────
  const fetchSubtopics = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getSubtopics(keywordId);
      setSubtopics(
        extractItems<Subtopic>(result).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      );
    } catch (err: any) {
      console.error('[SubtopicsPanel] fetch error:', err);
      setSubtopics([]);
    } finally {
      setLoading(false);
    }
  }, [keywordId]);

  useEffect(() => { fetchSubtopics(); }, [fetchSubtopics]);

  // ── Add ─────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await api.createSubtopic({
        keyword_id: keywordId,
        name: newName.trim(),
        order_index: subtopics.length, // next index
      });
      toast.success('Subtema agregado');
      setNewName('');
      await fetchSubtopics();
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar subtema');
    } finally {
      setAdding(false);
    }
  };

  // ── Update name ─────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      await api.updateSubtopic(editingId, { name: editName.trim() });
      toast.success('Subtema actualizado');
      setEditingId(null);
      await fetchSubtopics();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ───────────────────────────────────────
  const handleToggleActive = async (sub: Subtopic) => {
    try {
      await api.updateSubtopic(sub.id, { is_active: !sub.is_active });
      toast.success(sub.is_active ? 'Subtema desactivado' : 'Subtema activado');
      await fetchSubtopics();
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado');
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await api.deleteSubtopic(deletingId);
      toast.success('Subtema eliminado');
      setDeletingId(null);
      await fetchSubtopics();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pl-4 py-2 space-y-2">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="pl-4 py-2">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
        Subtemas ({subtopics.length})
      </p>

      {/* Subtopics list */}
      <AnimatePresence mode="popLayout">
        {subtopics.map((sub, idx) => (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 py-1.5 group"
          >
            <span className="text-[10px] text-gray-300 w-4 text-right shrink-0">
              {sub.order_index}
            </span>

            {editingId === sub.id ? (
              <>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="h-7 text-xs flex-1"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} className="text-emerald-600" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                  <X size={12} className="text-gray-400" />
                </Button>
              </>
            ) : (
              <>
                <span
                  className={clsx(
                    "text-xs flex-1 cursor-pointer hover:text-violet-600 transition-colors truncate",
                    sub.is_active ? "text-gray-700" : "text-gray-400 line-through"
                  )}
                  onClick={() => { setEditingId(sub.id); setEditName(sub.name); }}
                  title="Click para editar"
                >
                  {sub.name}
                </span>

                <button
                  onClick={() => handleToggleActive(sub)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title={sub.is_active ? 'Desactivar' : 'Activar'}
                >
                  {sub.is_active ? (
                    <ToggleRight size={14} className="text-emerald-500" />
                  ) : (
                    <ToggleLeft size={14} className="text-gray-400" />
                  )}
                </button>

                <button
                  onClick={() => setDeletingId(sub.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar"
                >
                  <Trash2 size={12} className="text-red-400 hover:text-red-600" />
                </button>
              </>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Inline add */}
      <div className="flex items-center gap-2 mt-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nuevo subtema..."
          className="h-7 text-xs flex-1"
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-violet-600 hover:text-violet-700"
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
        >
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          <span className="ml-1">Agregar</span>
        </Button>
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={open => { if (!open) setDeletingId(null); }}
        title="Eliminar subtema"
        description="Este subtema sera eliminado permanentemente. Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
