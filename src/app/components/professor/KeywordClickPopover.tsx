// ============================================================
// Axon — KeywordClickPopover (Professor: keyword info + connections)
//
// Floating popover that appears when the professor clicks on a
// highlighted keyword in the TipTap editor.
// Shows: keyword info header, definition, priority, connections.
//
// Positioning: @floating-ui/react with autoUpdate (replaces
// frozen {top,left} coordinates). Tracks scroll, resize, and
// layout shifts in all ancestor scroll containers.
//
// Dismiss: useDismiss (click-outside + Escape). No backdrop layer.
// Visibility: hide() middleware closes when anchor leaves viewport.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tag, X, Link2, Edit3, ChevronDown, ChevronUp,
  MessageSquare,
} from 'lucide-react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  hide,
  arrow,
  useDismiss,
  useInteractions,
} from '@floating-ui/react';
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

// ── Arrow constants (module-scope — no per-render allocation) ──
const STATIC_SIDE_MAP: Record<string, string> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

const ARROW_BORDERS: Record<string, Record<string, string>> = {
  top:    { borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' },
  bottom: { borderTop: '1px solid #e5e7eb', borderLeft: '1px solid #e5e7eb' },
  left:   { borderTop: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' },
  right:  { borderBottom: '1px solid #e5e7eb', borderLeft: '1px solid #e5e7eb' },
};

// ── Props ─────────────────────────────────────────────────
export interface KeywordClickPopoverProps {
  keyword: SummaryKeyword;
  allKeywords: SummaryKeyword[];
  /** Live DOM element to anchor the popover to */
  anchorEl: HTMLElement;
  onClose: () => void;
  onEdit?: (keyword: SummaryKeyword) => void;
}

export function KeywordClickPopover({
  keyword,
  allKeywords,
  anchorEl,
  onClose,
  onEdit,
}: KeywordClickPopoverProps) {
  const [showConnections, setShowConnections] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const arrowRef = useRef<HTMLDivElement>(null);

  const pc = priorityConfig[keyword.priority] || priorityConfig[0];

  // ── Floating UI ─────────────────────────────────────────
  const { refs, floatingStyles, context, middlewareData, placement } = useFloating({
    open: true,
    onOpenChange: (open) => {
      if (!open) onClose();
    },
    elements: { reference: anchorEl },
    placement: 'bottom',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({ padding: 16 }),
      shift({ padding: 12 }),
      hide({ strategy: 'referenceHidden' }),
      arrow({ element: arrowRef, padding: 12 }),
    ],
  });

  // ── Dismiss (click-outside + Escape) ────────────────────
  const dismiss = useDismiss(context, {
    outsidePress: true,
    escapeKey: true,
  });
  const { getFloatingProps } = useInteractions([dismiss]);

  // ── Close when anchor scrolls out of viewport ───────────
  useEffect(() => {
    if (middlewareData.hide?.referenceHidden) {
      onClose();
    }
  }, [middlewareData.hide?.referenceHidden, onClose]);

  // ── Arrow positioning ───────────────────────────────────
  // Generic staticSide pattern — handles all 4 placements
  // (top, bottom, left, right) even if flip produces unexpected sides.
  const arrowData = middlewareData.arrow;
  const basePlacement = placement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';
  const staticSide = STATIC_SIDE_MAP[basePlacement] as string;

  return createPortal(
    <motion.div
      ref={refs.setFloating}
      initial={{ opacity: 0, scale: 0.95, y: basePlacement === 'top' ? 6 : -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="z-[60]"
      style={{
        ...floatingStyles,
        width: '360px',
      }}
      {...getFloatingProps()}
    >
      {/* ── Card wrapper — overflow-hidden here, NOT on outer div ── */}
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden"
        style={{ maxHeight: 'min(480px, calc(100vh - 32px))' }}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-teal-50 to-teal-50 px-4 py-3 border-b border-gray-100">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                <Tag size={13} className="text-teal-600" />
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
                  className="p-1.5 rounded-lg hover:bg-teal-100 text-gray-400 hover:text-teal-600 transition-colors"
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
              <Link2 size={13} className="text-teal-500" />
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
                    summaryId={keyword.summary_id}
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
      </div>

      {/* ── Arrow — AFTER card in DOM order so it paints on top of the card border ── */}
      <div
        ref={arrowRef}
        className="absolute z-[1] w-2.5 h-2.5 bg-white rotate-45"
        style={{
          left: arrowData?.x != null ? `${arrowData.x}px` : '',
          top: arrowData?.y != null ? `${arrowData.y}px` : '',
          [staticSide]: '-5px',
          ...ARROW_BORDERS[basePlacement],
        }}
      />
    </motion.div>,
    document.body
  );
}