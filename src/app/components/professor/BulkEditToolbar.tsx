// ============================================================
// Axon — Professor: Bulk Edit Toolbar (P4 Feature)
//
// Agent: EDITOR
// Provides bulk operations for quiz questions:
//   - Select all / Deselect all
//   - Bulk delete (soft delete)
//   - Bulk activate / deactivate
//   - Move up / Move down (reorder)
//
// Design: purple accent, compact toolbar, confirmation dialog.
// ============================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  CheckSquare, Square, Trash2, Eye,
  AlertTriangle, X, Loader2,
  ArrowUp, ArrowDown,
} from 'lucide-react';

// ── Props ────────────────────────────────────────────────

interface BulkEditToolbarProps {
  selectedIds: Set<string>;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  onBulkRestore: (ids: string[]) => Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

// ── Component ────────────────────────────────────────────

export const BulkEditToolbar = React.memo(function BulkEditToolbar({
  selectedIds,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkRestore,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: BulkEditToolbarProps) {
  const [confirmAction, setConfirmAction] = useState<'delete' | 'restore' | null>(null);
  const [processing, setProcessing] = useState(false);

  const count = selectedIds.size;
  const allSelected = count === totalCount && totalCount > 0;

  const handleBulkAction = async (action: 'delete' | 'restore') => {
    setProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      if (action === 'delete') await onBulkDelete(ids);
      else await onBulkRestore(ids);
    } finally {
      setProcessing(false);
      setConfirmAction(null);
    }
  };

  if (count === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border-b border-zinc-200">
        <button
          onClick={onSelectAll}
          disabled={totalCount === 0}
          className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-30"
          style={{ fontWeight: 600 }}
        >
          <Square size={13} />
          Seleccionar todo
        </button>
        <div className="flex-1" />
        {/* Reorder disabled when nothing selected */}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border-b border-purple-200">
      {/* Select/Deselect */}
      <button
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="flex items-center gap-1.5 text-[11px] text-purple-600 hover:text-purple-800 transition-colors"
        style={{ fontWeight: 600 }}
      >
        {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
        {allSelected ? 'Deseleccionar' : 'Seleccionar todo'}
      </button>

      {/* Count badge */}
      <span className="text-[10px] text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200" style={{ fontWeight: 700 }}>
        {count} seleccionada{count !== 1 ? 's' : ''}
      </span>

      <div className="flex-1" />

      {/* Reorder buttons (single selection only) */}
      {count === 1 && (
        <div className="flex items-center gap-1 mr-2">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1 rounded text-purple-500 hover:bg-purple-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Mover arriba"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1 rounded text-purple-500 hover:bg-purple-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Mover abajo"
          >
            <ArrowDown size={14} />
          </button>
        </div>
      )}

      {/* Bulk actions */}
      <button
        onClick={() => setConfirmAction('restore')}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-colors"
        style={{ fontWeight: 600 }}
      >
        <Eye size={12} />
        Activar
      </button>
      <button
        onClick={() => setConfirmAction('delete')}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
        style={{ fontWeight: 600 }}
      >
        <Trash2 size={12} />
        Eliminar
      </button>
      <button
        onClick={onDeselectAll}
        className="p-1 rounded text-purple-400 hover:text-purple-600 hover:bg-purple-100 transition-colors"
        title="Cancelar seleccion"
      >
        <X size={14} />
      </button>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => !processing && setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden"
            >
              <div className="px-5 py-4 flex items-center gap-3">
                <div className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  confirmAction === 'delete' ? 'bg-red-100' : 'bg-emerald-100',
                )}>
                  <AlertTriangle size={18} className={confirmAction === 'delete' ? 'text-red-500' : 'text-emerald-500'} />
                </div>
                <div>
                  <h3 className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
                    {confirmAction === 'delete' ? 'Eliminar preguntas' : 'Activar preguntas'}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {count} pregunta{count !== 1 ? 's' : ''} seleccionada{count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="px-5 pb-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={processing}
                  className="px-4 py-2 text-[12px] text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleBulkAction(confirmAction)}
                  disabled={processing}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 text-[12px] text-white rounded-lg transition-all',
                    confirmAction === 'delete'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-emerald-500 hover:bg-emerald-600',
                  )}
                  style={{ fontWeight: 600 }}
                >
                  {processing ? (
                    <><Loader2 size={14} className="animate-spin" /> Procesando...</>
                  ) : (
                    confirmAction === 'delete' ? 'Eliminar' : 'Activar'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});