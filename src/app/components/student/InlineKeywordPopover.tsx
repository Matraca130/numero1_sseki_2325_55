// ============================================================
// Axon — InlineKeywordPopover
//
// Fixed-position popover that opens when clicking a highlighted
// keyword in the summary text. Uses useSmartPosition for
// intelligent 2-axis positioning with arrow indicator.
//
// Renders KeywordPopup content inside a dark-glass card.
// Portal-based to escape overflow:hidden parents.
// ============================================================
import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useSmartPosition, type Placement } from '@/app/hooks/useSmartPosition';
import { KeywordPopup } from './KeywordPopup';
import type { SummaryKeyword, Subtopic } from '@/app/services/summariesApi';
import type { BktState } from '@/app/lib/mastery-helpers';

// ── Arrow component ───────────────────────────────────────

function PopoverArrow({
  placement,
  arrowOffset,
}: {
  placement: Placement;
  arrowOffset: number;
}) {
  const isAbove = placement === 'above';
  return (
    <div
      className="absolute w-0 h-0"
      style={{
        left: `${arrowOffset}px`,
        transform: 'translateX(-50%)',
        ...(isAbove
          ? {
              bottom: -6,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '7px solid rgb(39, 39, 42)', // zinc-800
            }
          : {
              top: -6,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderBottom: '7px solid rgb(39, 39, 42)',
            }),
      }}
    />
  );
}

// ── Props ─────────────────────────────────────────────────

interface InlineKeywordPopoverProps {
  keyword: SummaryKeyword;
  allKeywords: SummaryKeyword[];
  bktMap: Map<string, BktState>;
  subtopicsCache?: Map<string, Subtopic[]>;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onNavigateKeyword?: (keywordId: string, summaryId: string) => void;
}

export function InlineKeywordPopover({
  keyword,
  allKeywords,
  bktMap,
  subtopicsCache,
  anchorRect,
  onClose,
  onNavigateKeyword,
}: InlineKeywordPopoverProps) {
  const { popoverRef, position, placement, arrowOffset, isReady } =
    useSmartPosition({
      anchorRect,
      gap: 10,
      viewportPadding: 12,
      topOffset: 56,
      centerThreshold: 0.15,
    });

  const backdropRef = useRef<HTMLDivElement>(null);

  // ── Close on Escape ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Close on scroll >150px ───────────────────────────────
  useEffect(() => {
    const startY = window.scrollY;
    const handler = () => {
      if (Math.abs(window.scrollY - startY) > 150) onClose();
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [onClose]);

  // ── Close on click outside ───────────────────────────────
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) onClose();
    },
    [onClose]
  );

  if (!anchorRect) return null;

  return createPortal(
    <AnimatePresence>
      <div
        ref={backdropRef}
        className="fixed inset-0 z-50"
        onClick={handleBackdropClick}
        style={{ background: 'transparent' }}
      >
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95, y: placement === 'above' ? 8 : -8 }}
          animate={{
            opacity: isReady ? 1 : 0,
            scale: 1,
            y: 0,
          }}
          exit={{ opacity: 0, scale: 0.95, y: placement === 'above' ? 8 : -8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed z-[51]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: 'max-content',
            maxWidth: '400px',
            minWidth: '300px',
            visibility: isReady ? 'visible' : 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow */}
          <PopoverArrow placement={placement} arrowOffset={arrowOffset} />

          {/* Card */}
          <div className="rounded-2xl shadow-2xl shadow-black/40 overflow-hidden max-h-[70vh] overflow-y-auto">
            {/* Close button overlaid on KeywordPopup's own header */}

            {/* Keyword popup content — renders its own dark bg-zinc-900 card */}
            <KeywordPopup
              keyword={keyword}
              allKeywords={allKeywords}
              bktMap={bktMap}
              subtopicsCache={subtopicsCache}
              onClose={onClose}
              onNavigateKeyword={onNavigateKeyword}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}