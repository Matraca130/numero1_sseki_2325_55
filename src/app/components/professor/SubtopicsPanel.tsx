// ============================================================
// Axon — SubtopicsPanel (Professor: CRUD subtopics per keyword)
//
// Shown when expanding a keyword in KeywordsManager.
// Routes: GET /subtopics?keyword_id=xxx, POST, PUT, DELETE
// order_index starts at 0. is_active toggleable.
//
// Data layer: React Query hooks from useSubtopicMutations.
// Cache key: kwSubtopics(keywordId) — shared with student-side
// useKeywordMasteryQuery batch seeding.
//
// Business rule: max 6 subtopics per keyword.
// ============================================================
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Trash2, Save, X, Loader2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { ConfirmDialog } from '@/app/components/shared/ConfirmDialog';
import {
  useSubtopicsQuery,
  useCreateSubtopicMutation,
  useUpdateSubtopicMutation,
  useDeleteSubtopicMutation,
  MAX_SUBTOPICS_PER_KEYWORD,
} from '@/app/hooks/queries/useSubtopicMutations';

interface SubtopicsPanelProps {
  keywordId: string;
  summaryId: string;
}

export function SubtopicsPanel({ keywordId, summaryId }: SubtopicsPanelProps) {
  // ── Data (React Query) ────────────────────────────────────
  const { data: subtopics = [], isLoading: loading } = useSubtopicsQuery(keywordId);

  // Mutations
  const createMutation = useCreateSubtopicMutation(summaryId);
  const updateMutation = useUpdateSubtopicMutation(summaryId);
  const deleteMutation = useDeleteSubtopicMutation(summaryId);

  // ── Inline add ────────────────────────────────────────────
  const [newName, setNewName] = useState('');

  // ── Inline edit ───────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // ── Delete ────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Derived ───────────────────────────────────────────────
  const activeCount = subtopics.filter(s => s.is_active !== false).length;
  const atLimit = activeCount >= MAX_SUBTOPICS_PER_KEYWORD;

  // ── Handlers ──────────────────────────────────────────────

  const handleAdd = () => {
    if (!newName.trim() || atLimit) return;
    createMutation.mutate(
      {
        keyword_id: keywordId,
        name: newName.trim(),
        order_index: subtopics.length,
      },
      { onSuccess: () => setNewName('') },
    );
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateMutation.mutate(
      {
        subtopicId: editingId,
        keywordId,
        data: { name: editName.trim() },
      },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const handleToggleActive = (sub: { id: string; is_active: boolean }) => {
    // Prevent activating beyond limit
    if (!sub.is_active && atLimit) return;
    updateMutation.mutate({
      subtopicId: sub.id,
      keywordId,
      data: { is_active: !sub.is_active },
    });
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(
      { subtopicId: deletingId, keywordId },
      { onSuccess: () => setDeletingId(null) },
    );
  };

  // ── Loading state ─────────────────────────────────────────
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
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">
          Subtemas ({activeCount}/{MAX_SUBTOPICS_PER_KEYWORD})
        </p>
        {atLimit && (
          <span className="text-[9px] text-amber-500">
            Limite alcanzado
          </span>
        )}
      </div>

      {/* Subtopics list */}
      <AnimatePresence mode="popLayout">
        {subtopics.map(sub => (
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
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Save size={12} className="text-emerald-600" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setEditingId(null)}
                >
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
                  className={clsx(
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    !sub.is_active && atLimit && "cursor-not-allowed opacity-30"
                  )}
                  title={
                    !sub.is_active && atLimit
                      ? `Limite de ${MAX_SUBTOPICS_PER_KEYWORD} subtemas activos`
                      : sub.is_active ? 'Desactivar' : 'Activar'
                  }
                  disabled={!sub.is_active && atLimit}
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
          placeholder={atLimit ? `Max ${MAX_SUBTOPICS_PER_KEYWORD} subtemas` : "Nuevo subtema..."}
          className="h-7 text-xs flex-1"
          disabled={atLimit}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-violet-600 hover:text-violet-700"
          onClick={handleAdd}
          disabled={createMutation.isPending || !newName.trim() || atLimit}
        >
          {createMutation.isPending
            ? <Loader2 size={12} className="animate-spin" />
            : <Plus size={12} />}
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
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
