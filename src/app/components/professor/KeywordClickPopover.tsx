// ============================================================
// Axon — KeywordClickPopover (Professor: keyword info + connections)
//
// Floating popover that appears when the professor clicks on a
// highlighted keyword in the TipTap editor.
// Shows: keyword info header, definition, priority, connections.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tag, X, Link2, Edit3, ChevronDown, ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { KeywordConnectionsPanel } from './KeywordConnectionsPanel';
import { ProfessorNotesPanel } from './ProfessorNotesPanel';
import type { SummaryKeyword } from '@/app/services/summariesApi';

// ── Priority config ───────────────────────────────────────
const priorityConfig: Record<number, { label: string; dot: string; bg: string; text: string }> = {
  0: { label: '', dot: 'bg-gray-300', bg: 'bg-gray-50', text: 'text-gray-500' },
  1: { label: 'Baja', dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  2: { label: 'Media', dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
  3: { label: 'Alta', dot: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-700' },
};

// ── Props ─────────────────────────────────────────────────
export interface KeywordClickPopoverProps {
  keyword: SummaryKeyword;
  allKeywords: SummaryKeyword[];
  /** Position relative to viewport */
  position: { top: number; left: number };
  onClose: () => void;
  onEdit?: (keyword: SummaryKeyword) => void;
  /** Called when connected keywords change (to update visual highlights) */
  onConnectionsChanged?: () => void;
}

export function KeywordClickPopover({
  keyword,
  allKeywords,
  position,
  onClose,
  onEdit,
  onConnectionsChanged,
}: KeywordClickPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showConnections, setShowConnections] = useState(true);
  const [showNotes, setShowNotes] = useState(true);

  const pc = priorityConfig[keyword.priority] || priorityConfig[0];

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Clamp position so popover stays in viewport
  const popoverWidth = 360;
  const clampedLeft = Math.max(16, Math.min(position.left - popoverWidth / 2, window.innerWidth - popoverWidth - 16));
  const clampedTop = Math.max(16, position.top + 8);

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.95, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -6 }}
        transition={{ duration: 0.15 }}
        className="fixed z-[60] bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden"
        style={{
          top: `${clampedTop}px`,
          left: `${clampedLeft}px`,
          width: `${popoverWidth}px`,
          maxHeight: 'min(480px, calc(100vh - 32px))',
        }}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3 border-b border-gray-100">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                <Tag size={13} className="text-violet-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>
                  {keyword.name}
                </h3>
                {pc.label && (
                  <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full mt-1 ${pc.bg} ${pc.text} border border-current/10`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
                    Prioridad {pc.label}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {onEdit && (
                <button
                  onClick={() => { onEdit(keyword); onClose(); }}
                  className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-600 transition-colors"
                  title="Editar keyword"
                >
                  <Edit3 size={13} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Definition */}
          {keyword.definition && (
            <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-3 pl-9">
              {keyword.definition}
            </p>
          )}
        </div>

        {/* ── Scrollable body with sections ───────────────── */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(min(480px, calc(100vh - 32px)) - 90px)' }}>
          {/* ── Connections section ─────────────────────────── */}
          <button
            onClick={() => setShowConnections(p => !p)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
          >
            <div className="flex items-center gap-2">
              <Link2 size={13} className="text-violet-500" />
              <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>
                Conexiones
              </span>
            </div>
            {showConnections
              ? <ChevronUp size={13} className="text-gray-400" />
              : <ChevronDown size={13} className="text-gray-400" />
            }
          </button>

          <AnimatePresence>
            {showConnections && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="px-2 pb-3">
                  <KeywordConnectionsPanel
                    keywordId={keyword.id}
                    keywordName={keyword.name}
                    allKeywords={allKeywords}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Notes for students section ──────────────────── */}
          <button
            onClick={() => setShowNotes(p => !p)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={13} className="text-pink-500" />
              <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>
                Notas para alumnos
              </span>
            </div>
            {showNotes
              ? <ChevronUp size={13} className="text-gray-400" />
              : <ChevronDown size={13} className="text-gray-400" />
            }
          </button>

          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="pb-3">
                  <ProfessorNotesPanel
                    keywordId={keyword.id}
                    keywordName={keyword.name}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}