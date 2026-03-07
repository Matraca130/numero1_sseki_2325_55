// ============================================================
// FlashcardManagerCard — Individual card in professor grid
// Extracted from FlashcardsManager.tsx (refactoring #6)
// ============================================================
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import type { FlashcardItem } from '@/app/services/flashcardApi';
import type { Keyword } from '@/app/types/platform';
import type { Subtopic } from '@/app/types/flashcard-manager';
import { extractImageUrl, extractText, detectCardType } from '@/app/lib/flashcard-utils';
import {
  Pencil, Trash2, Tag,
  Eye, EyeOff, ArchiveRestore,
  ToggleLeft, ToggleRight,
  Copy, CheckSquare, Square,
} from 'lucide-react';

interface FlashcardManagerCardProps {
  card: FlashcardItem;
  keywords: Keyword[];
  subtopicsMap: Map<string, Subtopic[]>;
  onEdit: (card: FlashcardItem) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onToggleActive: (id: string, currentActive: boolean) => void;
  onDuplicate: (card: FlashcardItem) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

export function FlashcardManagerCard({
  card,
  keywords,
  subtopicsMap,
  onEdit,
  onDelete,
  onRestore,
  onToggleActive,
  onDuplicate,
  isSelected,
  onToggleSelect,
}: FlashcardManagerCardProps) {
  const [flipped, setFlipped] = useState(false);
  const keyword = keywords.find(k => k.id === card.keyword_id);
  const isDeleted = !!card.deleted_at;
  const isInactive = !card.is_active && !isDeleted;
  const cardType = detectCardType(card.front, card.back);

  // Find subtopic name
  const subtopicName = useMemo(() => {
    if (!card.subtopic_id) return null;
    for (const subs of subtopicsMap.values()) {
      const found = subs.find(s => s.id === card.subtopic_id);
      if (found) return found.name;
    }
    return null;
  }, [card.subtopic_id, subtopicsMap]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`bg-white rounded-xl border transition-all group ${
        isSelected
          ? 'border-purple-300 bg-purple-50/30 ring-1 ring-purple-200'
          : isDeleted
            ? 'border-red-200 bg-red-50/30 opacity-70'
            : isInactive
              ? 'border-amber-200 bg-amber-50/20 opacity-80'
              : 'border-gray-100 hover:border-purple-200 hover:shadow-sm'
      }`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {/* Selection checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(card.id); }}
            className={`p-0.5 rounded transition-all ${isSelected ? 'text-purple-600' : 'text-gray-300 hover:text-gray-500'}`}
          >
            {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
          </button>
          {keyword && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-semibold uppercase tracking-wide shrink-0">
              <Tag size={10} />
              {keyword.term}
            </span>
          )}
          {subtopicName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-medium shrink-0">
              {subtopicName}
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            card.source === 'ai'
              ? 'bg-amber-50 text-amber-600'
              : card.source === 'manual'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-50 text-gray-500'
          }`}>
            {card.source === 'ai' ? 'IA' : card.source === 'manual' ? 'Manual' : card.source}
          </span>
          {isDeleted && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
              Eliminado
            </span>
          )}
          {isInactive && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">
              Inactivo
            </span>
          )}
          {/* Card type badge */}
          {cardType !== 'text' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              cardType === 'cloze'
                ? 'bg-cyan-50 text-cyan-600'
                : 'bg-teal-50 text-teal-600'
            }`}>
              {cardType === 'cloze' ? 'Cloze'
                : cardType === 'text_image' ? 'Txt\u2192Img'
                : cardType === 'image_text' ? 'Img\u2192Txt'
                : cardType === 'image_image' ? 'Img\u2192Img'
                : cardType === 'text_both' ? 'Mixto'
                : cardType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setFlipped(!flipped)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
            title={flipped ? 'Ver frente' : 'Ver reverso'}
          >
            {flipped ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {!isDeleted && (
            <>
              <button
                onClick={() => onToggleActive(card.id, card.is_active)}
                className={`p-1.5 rounded-lg transition-all ${
                  card.is_active
                    ? 'hover:bg-amber-50 text-gray-400 hover:text-amber-600'
                    : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                }`}
                title={card.is_active ? 'Desactivar' : 'Activar'}
              >
                {card.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              </button>
              <button
                onClick={() => onEdit(card)}
                className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-all"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDuplicate(card)}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all"
                title="Duplicar"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => onDelete(card.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
          {isDeleted && (
            <button
              onClick={() => onRestore(card.id)}
              className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-all"
              title="Restaurar"
            >
              <ArchiveRestore size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Card content */}
      <div className="px-4 py-3 min-h-[72px]">
        <div className="flex items-start gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 shrink-0 ${
            flipped ? 'text-emerald-500' : 'text-purple-400'
          }`}>
            {flipped ? 'Reverso' : 'Frente'}
          </span>
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* Thumbnail if card has image */}
            {(() => {
              const imgUrl = flipped
                ? (card.back_image_url || extractImageUrl(card.back))
                : (card.front_image_url || extractImageUrl(card.front));
              return imgUrl ? (
                <img
                  src={imgUrl}
                  alt=""
                  className="w-10 h-10 rounded-md object-cover shrink-0 border border-gray-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : null;
            })()}
            <p className="text-sm text-gray-700 leading-relaxed">
              {extractText(flipped ? card.back : card.front) || (flipped ? card.back : card.front)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
