// ============================================================
// FlashcardMiniCard -- Compact card thumbnail for grid views
//
// Extracted from FlashcardDeckScreen.tsx for reusability.
// STANDALONE: depends on react, clsx, Flashcard type, mastery-colors.
//
// PHASE 1 (mastery-colors):
//   - Top accent bar → dynamic color per mastery level
//   - Number badge → dynamic bg/text per mastery level
//   - Dots → staggered colors (rose/orange/amber/teal/emerald)
//   - Wrapped in React.memo (custom comparator on id+mastery+idx)
// PHASE 8c: Added transition-colors to accent bar and number badge.
// ============================================================

import React from 'react';
import clsx from 'clsx';
import type { Flashcard } from '@/app/types/content';
import { getMasteryColor, DOT_COLORS } from './mastery-colors';

export interface FlashcardMiniCardProps {
  card: Flashcard;
  /** 0-based index (displayed as 1-based) */
  idx: number;
  /** Called when the card is clicked */
  onClick?: () => void;
}

function FlashcardMiniCardInner({ card, idx, onClick }: FlashcardMiniCardProps) {
  const colorSet = getMasteryColor(card.mastery);

  return (
    <div
      className={clsx(
        "group bg-white rounded-2xl border border-gray-200/80 hover:border-gray-300 hover:shadow-lg transition-all flex flex-col relative overflow-hidden min-h-0 shadow-sm",
        onClick && "cursor-pointer"
      )}
      role={onClick ? "button" : "article"}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Card ${idx + 1}: ${card.question}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {/* Top color accent — dynamic per mastery */}
      <div className={clsx('h-1 w-full shrink-0 transition-colors duration-300', colorSet.accent)} />

      <div className="flex-1 flex flex-col p-3 min-h-0 overflow-hidden gap-1.5">
        {/* Header row: number + mastery */}
        <div className="flex items-center justify-between shrink-0">
          <div className={clsx(
            'w-5 h-5 rounded-md flex items-center justify-center text-[10px] transition-colors duration-300',
            colorSet.accentLight,
            colorSet.text,
          )} style={{ fontWeight: 700 }}>
            {idx + 1}
          </div>
          <div className="flex items-center gap-0.5" aria-label={`Dominio: ${card.mastery} de 5`}>
            {DOT_COLORS.map((dotColor, i) => {
              const level = i + 1;
              const isFilled = level <= card.mastery;
              return (
                <div
                  key={level}
                  className={clsx(
                    'w-1 h-2.5 rounded-full transition-colors',
                    isFilled ? dotColor.dot : 'bg-gray-200',
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* Question */}
        <p className="text-xs text-gray-800 line-clamp-3 leading-snug" style={{ fontWeight: 600 }}>
          {card.question}
        </p>

        {/* Answer (subtle, revealed on hover) */}
        <p className="text-[11px] text-gray-400 group-hover:text-gray-600 line-clamp-2 mt-auto leading-snug transition-colors">
          {card.answer}
        </p>
      </div>
    </div>
  );
}

// ── React.memo with custom comparator ─────────────────────
// Only re-renders when card identity, mastery, or position changes.
// Avoids re-rendering 200+ cards when parent state changes.

export const FlashcardMiniCard = React.memo(
  FlashcardMiniCardInner,
  (prev, next) =>
    prev.card.id === next.card.id &&
    prev.card.mastery === next.card.mastery &&
    prev.idx === next.idx &&
    prev.onClick === next.onClick,
);
