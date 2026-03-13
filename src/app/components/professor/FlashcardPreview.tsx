// ============================================================
// Axon — FlashcardPreview (Live Card Preview for Editor)
//
// Shows a miniature, interactive preview of the card being edited.
// Supports all 6 card types with flip animation.
// Used inside FlashcardsManager create/edit modal.
//
// Light-themed container wrapping a card preview
// to match the student experience.
// ============================================================
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Tag, RotateCcw, Image as ImageIcon } from 'lucide-react';
import type { CardType } from '@/app/lib/flashcard-utils';
import { extractImageUrl, extractText } from '@/app/lib/flashcard-utils';

// Re-export utilities so FlashcardsManager (GitHub version) can import from here.
// The canonical location is @/app/lib/flashcard-utils — prefer importing from there.
export { extractImageUrl, extractText };

// ── Helpers ───────────────────────────────────────────

/** Render cloze front: replace {{word}} with blanks */
export function renderClozeFront(text: string): React.ReactNode[] {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      return (
        <span
          key={i}
          className="inline-block mx-0.5 px-2 py-0.5 bg-[#2a8c7a]/15 border-b-2 border-[#2a8c7a]/40 text-[#2a8c7a]/60 min-w-[3rem] text-center"
        >
          ____
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Render cloze back: highlight the revealed words */
export function renderClozeBack(text: string): React.ReactNode[] {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      const word = part.slice(2, -2);
      return (
        <span
          key={i}
          className="inline-block mx-0.5 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-700 rounded font-semibold"
        >
          {word}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Props ─────────────────────────────────────────────

interface FlashcardPreviewProps {
  front: string;
  back: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  cardType: CardType;
  keywordName?: string | null;
}

// ── Image display component ─────────────────────────────

function PreviewImage({ url, alt }: { url: string; alt: string }) {
  const [error, setError] = useState(false);

  if (!url || error) {
    return (
      <div className="w-full h-32 rounded-lg bg-gray-100 border border-gray-200 flex flex-col items-center justify-center gap-1">
        <ImageIcon size={20} className="text-gray-400" />
        <span className="text-[10px] text-gray-400">
          {url ? 'Error al cargar' : 'Sin imagen'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      onError={() => setError(true)}
      className="w-full h-32 object-cover rounded-lg border border-gray-200"
    />
  );
}

// ── Side content renderer ───────────────────────────────

function SideContent({ text, imageUrl, cardType, side }: { text: string; imageUrl?: string; cardType: CardType; side: 'front' | 'back' }) {
  const isImageSide = (cardType === 'text_image' && side === 'back') || (cardType === 'image_text' && side === 'front') || (cardType === 'image_image');
  const isMixedSide = cardType === 'text_both';
  const isCloze = cardType === 'cloze';

  if (isCloze) {
    return (
      <div className="text-center leading-relaxed">
        {side === 'front' ? renderClozeFront(text || 'Escribe texto con {{blancos}}...') : renderClozeBack(text || 'Texto completo aparecera aqui...')}
      </div>
    );
  }

  if (isImageSide) {
    return imageUrl ? <PreviewImage url={imageUrl} alt={`${side} image`} /> : (
      <div className="w-full h-32 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1">
        <ImageIcon size={20} className="text-gray-400" />
        <span className="text-[10px] text-gray-400">Pega una URL de imagen</span>
      </div>
    );
  }

  if (isMixedSide) {
    return (
      <div className="space-y-2 w-full">
        <p className={`text-center leading-relaxed ${text ? '' : 'text-gray-400 italic'}`}>{text || `${side === 'front' ? 'Frente' : 'Reverso'}...`}</p>
        {imageUrl ? <PreviewImage url={imageUrl} alt={`${side} image`} /> : (
          <div className="w-full h-20 rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
            <span className="text-[10px] text-gray-400">Imagen (opcional)</span>
          </div>
        )}
      </div>
    );
  }

  return <p className={`text-center leading-relaxed ${text ? '' : 'text-gray-400 italic'}`}>{text || `${side === 'front' ? 'Escribe el frente...' : 'Escribe el reverso...'}`}</p>;
}

// ── Main Component ────────────────────────────────────────

export function FlashcardPreview({ front, back, frontImageUrl, backImageUrl, cardType, keywordName }: FlashcardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Preview</span>
        <button type="button" onClick={() => setIsFlipped(!isFlipped)} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all" title="Voltear">
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="w-full rounded-xl bg-[#F0F2F5] p-4 border border-gray-200" style={{ perspective: '800px' }}>
        <div className="cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <motion.div className="relative w-full" style={{ transformStyle: 'preserve-3d', minHeight: '220px' }} animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}>
            {/* ── Front ── */}
            <div className="absolute inset-0 rounded-xl border border-[#2a8c7a]/25 bg-white flex flex-col overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
              <div className="flex items-center justify-between px-3 pt-3">
                {keywordName ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2a8c7a]/15 text-[#2a8c7a] text-[9px] font-semibold uppercase tracking-wider"><Tag size={8} />{keywordName}</span> : <div />}
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Frente</span>
              </div>
              <div className="flex-1 flex items-center justify-center px-4 py-4 text-sm text-gray-900">
                <SideContent text={front} imageUrl={frontImageUrl} cardType={cardType} side="front" />
              </div>
            </div>
            {/* ── Back ── */}
            <div className="absolute inset-0 rounded-xl border border-[#2a8c7a]/15 bg-[#F0F2F5] flex flex-col overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <div className="flex items-center justify-between px-3 pt-3">
                {keywordName ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2a8c7a]/10 text-[#2a8c7a]/70 text-[9px] font-semibold uppercase tracking-wider"><Tag size={8} />{keywordName}</span> : <div />}
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#0d9488]/70">Reverso</span>
              </div>
              <div className="flex-1 flex items-center justify-center px-4 py-4 text-sm text-gray-800">
                <SideContent text={back} imageUrl={backImageUrl} cardType={cardType} side="back" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <span className="text-[10px] text-gray-400">Click para voltear</span>
    </div>
  );
}

export default FlashcardPreview;
