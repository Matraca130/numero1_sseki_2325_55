// ============================================================
// Axon — Change History Panel
//
// Side panel showing a timeline of student actions on the
// knowledge map (node/edge create, delete). Persisted in
// sessionStorage per topic, cleared on tab close.
//
// LANG: Spanish
// ============================================================

import { useState, useMemo, useEffect, useRef } from 'react';
import { Clock, Plus, Link2, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { colors, headingStyle } from '@/app/design-system';
import type { HistoryEntry, HistoryActionType } from './changeHistoryHelpers';
import { formatRelativeTime } from './changeHistoryHelpers';

// Re-export types & helpers so consumers can import from one place
export type { HistoryEntry, HistoryActionType } from './changeHistoryHelpers';
export {
  loadHistory,
  saveHistory,
  clearHistoryStorage,
  createNodeEntry,
  createEdgeEntry,
  createDeleteNodeEntry,
  createDeleteEdgeEntry,
  formatRelativeTime,
} from './changeHistoryHelpers';

// ── Props ────────────────────────────────────────────────────

interface ChangeHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
  onClear: () => void;
}

// ── Icon / color maps ────────────────────────────────────────

const ACTION_ICON: Record<HistoryActionType, typeof Plus> = {
  'create-node': Plus,
  'create-edge': Link2,
  'delete-node': Trash2,
  'delete-edge': Trash2,
};

const DOT_COLOR: Record<HistoryActionType, string> = {
  'create-node': colors.primary[500],
  'create-edge': '#3b82f6',
  'delete-node': colors.semantic.error,
  'delete-edge': colors.semantic.error,
};

const ICON_BG: Record<HistoryActionType, string> = {
  'create-node': colors.primary[50],
  'create-edge': '#eff6ff',
  'delete-node': '#fef2f2',
  'delete-edge': '#fef2f2',
};

const ICON_COLOR: Record<HistoryActionType, string> = {
  'create-node': colors.primary[500],
  'create-edge': '#3b82f6',
  'delete-node': colors.semantic.error,
  'delete-edge': colors.semantic.error,
};

// ── Component ────────────────────────────────────────────────

export function ChangeHistoryPanel({ open, onClose, entries, onClear }: ChangeHistoryPanelProps) {
  // Re-render every 30s to keep relative timestamps fresh
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (open && entries.length > 0) {
      tickRef.current = setInterval(() => setTick(t => t + 1), 30_000);
    }
    return () => { clearInterval(tickRef.current); };
  }, [open, entries.length]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Newest-first ordering
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [entries],
  );

  const isEmpty = sortedEntries.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="absolute right-0 top-0 bottom-0 w-80 sm:w-[22rem] bg-surface-page border-l border-gray-200 shadow-lg z-20 flex flex-col overflow-hidden"
          role="complementary"
          aria-label="Panel de historial de cambios"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-ax-primary-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-ax-primary-500" aria-hidden="true" />
              </div>
              <h3
                className="font-semibold text-gray-900"
                style={{ ...headingStyle, fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
              >
                Historial
              </h3>
              {!isEmpty && (
                <span
                  className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium"
                  style={{ fontSize: 'clamp(0.625rem, 1vw, 0.6875rem)' }}
                >
                  {sortedEntries.length}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar historial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body -- scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            {isEmpty ? (
              <EmptyHistory />
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div
                  className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
                {/* Entries */}
                <div className="space-y-1" role="list" aria-label="Entradas del historial">
                  {sortedEntries.map((entry, idx) => (
                    <TimelineEntry key={entry.id} entry={entry} index={idx} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer -- clear button */}
          {!isEmpty && (
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-white">
              <button
                onClick={onClear}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-medium text-gray-500 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors"
                style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Limpiar historial
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ───────────────────────────────────────────

function EmptyHistory() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-ax-primary-50 flex items-center justify-center mb-4">
        <Clock className="w-7 h-7 text-ax-primary-500" aria-hidden="true" />
      </div>
      <h4
        className="font-semibold text-gray-900 mb-1.5"
        style={{ ...headingStyle, fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
      >
        Sin cambios
      </h4>
      <p
        className="text-gray-500 leading-relaxed"
        style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
      >
        Aún no has realizado cambios. Los conceptos y conexiones que crees aparecerán aquí.
      </p>
    </motion.div>
  );
}

function TimelineEntry({ entry, index }: { entry: HistoryEntry; index: number }) {
  const Icon = ACTION_ICON[entry.type] || Plus;
  const dotColor = DOT_COLOR[entry.type] || colors.text.tertiary;
  const iconBg = ICON_BG[entry.type] || '#f3f4f6';
  const iconColor = ICON_COLOR[entry.type] || colors.text.tertiary;

  return (
    <motion.div
      role="listitem"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.3), ease: 'easeOut' }}
      className="relative pl-9 py-2"
    >
      {/* Timeline dot */}
      <div
        className="absolute left-[11px] top-[18px] w-[9px] h-[9px] rounded-full border-2 border-white z-[1]"
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5">
        <div className="flex items-start gap-2.5">
          {/* Action icon */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: iconBg }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
          </div>

          {/* Text content */}
          <div className="min-w-0 flex-1">
            <p
              className="text-gray-700 leading-snug"
              style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
            >
              {entry.description}
            </p>

            <div className="flex items-center gap-2 mt-1.5">
              {/* Type badge */}
              <span
                className="px-2 py-0.5 rounded-full font-medium"
                style={{
                  fontSize: 'clamp(0.5625rem, 0.9vw, 0.625rem)',
                  backgroundColor: entry.badge === 'Nodo' ? colors.primary[50] : '#eff6ff',
                  color: entry.badge === 'Nodo' ? colors.primary[500] : '#3b82f6',
                }}
              >
                {entry.badge}
              </span>

              {/* Timestamp */}
              <span
                className="text-gray-400"
                style={{ fontSize: 'clamp(0.5625rem, 0.9vw, 0.625rem)' }}
              >
                {formatRelativeTime(entry.timestamp)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
