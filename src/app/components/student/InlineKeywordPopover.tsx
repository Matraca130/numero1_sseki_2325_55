// ============================================================
// Axon — InlineKeywordPopover
//
// Portal-based popover that opens when clicking a highlighted
// keyword in the summary text. Uses @floating-ui/react for
// dynamic positioning that tracks the anchor element through
// scroll, resize, and layout shifts.
//
// Positioning: useFloating + autoUpdate (replaces useSmartPosition)
// Dismiss: useDismiss (click-outside + Escape, no backdrop layer)
// Visibility: hide() middleware closes when anchor leaves viewport
//
// Renders KeywordPopup content inside a dark-glass card.
// ============================================================
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
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
import { KeywordPopup } from './KeywordPopup';
import type { SummaryKeyword } from '@/app/services/summariesApi';
import type { BktState } from '@/app/lib/mastery-helpers';

// ── Arrow constants (module-scope — no per-render allocation) ──
const STATIC_SIDE_MAP: Record<string, string> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

// ── Props ─────────────────────────────────────────────────

interface InlineKeywordPopoverProps {
  keyword: SummaryKeyword;
  allKeywords: SummaryKeyword[];
  bktMap: Map<string, BktState>;
  /** Live reference to the anchor span element (not a frozen DOMRect) */
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

// ── Component ─────────────────────────────────────────────

export function InlineKeywordPopover({
  keyword,
  allKeywords,
  bktMap,
  anchorEl,
  onClose,
  onNavigateKeyword,
}: InlineKeywordPopoverProps) {
  // ── Arrow ref for Floating UI arrow middleware ───────────
  const arrowRef = useRef<HTMLDivElement>(null);

  // ── Floating UI: positioning engine ─────────────────────
  //
  // elements.reference: live HTMLElement — Floating UI calls
  //   .getBoundingClientRect() on every update cycle, so the
  //   position stays correct through scroll/resize/layout.
  //
  // whileElementsMounted: autoUpdate installs listeners on:
  //   - scroll (ALL ancestor scroll containers, not just window)
  //   - resize (window)
  //   - ResizeObserver (reference + floating elements)
  //   - PerformanceObserver for layout shifts (if available)
  //   Cleans up automatically on unmount.
  //
  // middleware order matters:
  //   offset → flip → shift → hide → arrow
  //   (each reads the result of the previous one)
  //
  const { refs, floatingStyles, context, middlewareData, placement } =
    useFloating({
      open: true,
      onOpenChange: (open) => {
        if (!open) onClose();
      },
      elements: { reference: anchorEl },
      placement: 'top',
      middleware: [
        offset(10),
        flip({ padding: 16 }),
        shift({ padding: 12 }),
        hide({ strategy: 'referenceHidden' }),
        arrow({ element: arrowRef, padding: 12 }),
      ],
      whileElementsMounted: autoUpdate,
    });

  // ── Dismiss: Escape + click-outside (no backdrop) ───────
  //
  // useDismiss adds a pointerdown listener on document (capture
  // phase). If the click target is outside the floating element,
  // it calls onOpenChange(false) → onClose(). No blocking layer
  // needed — the user can interact with the entire page.
  //
  const dismiss = useDismiss(context, {
    outsidePress: true,
    escapeKey: true,
  });
  const { getFloatingProps } = useInteractions([dismiss]);

  // ── Close when anchor scrolls out of viewport ───────────
  //
  // hide({ strategy: 'referenceHidden' }) checks if the anchor
  // rect is completely outside the viewport clipping area.
  // This replaces the arbitrary "scroll > 150px" threshold.
  //
  useEffect(() => {
    if (middlewareData.hide?.referenceHidden) {
      onClose();
    }
  }, [middlewareData.hide?.referenceHidden, onClose]);

  // ── Guard ───────────────────────────────────────────────
  if (!anchorEl) return null;

  // ── Arrow positioning from middleware data ───────────────
  //
  // Floating UI's arrow middleware computes { x, y } relative
  // to the floating element. staticSide places the arrow on
  // the edge facing the anchor (e.g. placement=top → arrow
  // sits at bottom of the popup, pointing down).
  //
  const arrowData = middlewareData.arrow;
  const basePlacement = placement.split('-')[0];
  const staticSide = STATIC_SIDE_MAP[basePlacement] as string;

  // ── Render ──────────────────────────────────────────────

  return createPortal(
    <motion.div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        width: 'max-content',
        maxWidth: '400px',
        minWidth: '300px',
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="z-50"
      {...getFloatingProps()}
    >
      {/* Arrow — rotated square positioned by Floating UI */}
      <div
        ref={arrowRef}
        className="absolute w-3 h-3 bg-zinc-800 rotate-45"
        style={{
          left: arrowData?.x != null ? `${arrowData.x}px` : '',
          top: arrowData?.y != null ? `${arrowData.y}px` : '',
          [staticSide]: '-6px',
        }}
      />

      {/* Card wrapper — dimensions & overflow match original */}
      <div className="rounded-2xl shadow-2xl shadow-black/40 overflow-x-hidden overflow-y-auto max-h-[70vh]">
        {/* KeywordPopup renders its own dark bg-zinc-900 card */}
        <KeywordPopup
          keyword={keyword}
          allKeywords={allKeywords}
          bktMap={bktMap}
          onClose={onClose}
          onNavigateKeyword={onNavigateKeyword}
        />
      </div>
    </motion.div>,
    document.body,
  );
}