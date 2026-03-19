// ============================================================
// FlashcardStatsBar — Card type statistics display
//
// Shows counts for text / image / cloze flashcards as pills.
// Only renders when there are flashcards to show stats for.
// ============================================================
import React from 'react';
import {
  Type, Image as ImageIcon, TextCursorInput,
} from 'lucide-react';

interface FlashcardStatsBarProps {
  typeStats: { text: number; image: number; cloze: number; total: number };
  hasActiveFilters: boolean;
  filteredCount: number;
  totalCount: number;
}

export const FlashcardStatsBar = React.memo(function FlashcardStatsBar({
  typeStats,
  hasActiveFilters,
  filteredCount,
  totalCount,
}: FlashcardStatsBarProps) {
  if (typeStats.total === 0) return null;

  return (
    <div className="mb-4 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200">
        <Type size={12} className="text-violet-500" />
        <span className="text-[11px] font-medium text-violet-700">Texto: {typeStats.text}</span>
      </div>
      {typeStats.image > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200">
          <ImageIcon size={12} className="text-teal-500" />
          <span className="text-[11px] font-medium text-teal-700">
            Imagen: {typeStats.image}
            <span className="text-teal-500 ml-1">({Math.round(typeStats.image / typeStats.total * 100)}%)</span>
          </span>
        </div>
      )}
      {typeStats.cloze > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 border border-cyan-200">
          <TextCursorInput size={12} className="text-cyan-500" />
          <span className="text-[11px] font-medium text-cyan-700">Cloze: {typeStats.cloze}</span>
        </div>
      )}
      {hasActiveFilters && (
        <span className="text-[10px] text-gray-400 ml-auto">
          Mostrando {filteredCount} de {totalCount}
        </span>
      )}
    </div>
  );
});
