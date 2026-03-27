// ============================================================
// Axon — FlashcardCard (Student 3D Flip Card)
//
// Renders 6 card types: text, text_image, image_text,
// image_image, text_both, cloze.
// Auto-detects type from front/back content encoding.
//
// Design: AXON Medical Academy palette (light theme), perspective 3D.
// Cloze cards get teal border accent.
// ============================================================
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Tag, Image as ImageIcon } from 'lucide-react';
import { ClozeInteraction } from './ClozeInteraction';
import { FlashcardImage } from '@/app/components/content/flashcard/FlashcardImage';
import { extractImageUrl, extractText, detectCardType } from '@/app/lib/flashcard-utils';
import type { CardType } from '@/app/lib/flashcard-utils';

// ── Render cloze back with highlighted words ──────────────

function renderClozeBack(text: string): React.ReactNode[] {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      const word = part.slice(2, -2);
      return (
        <span
          key={i}
          className="inline-block mx-0.5 px-1.5 py-0.5 bg-emerald-500/25 text-emerald-700 rounded font-semibold"
        >
          {word}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Card Image Component ──────────────────────────────────

function CardImage({
  url,
  alt,
  onClick,
  className = '',
}: {
  url: string;
  alt: string;
  onClick?: () => void;
  className?: string;
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-gray-100 rounded-lg ${className}`}>
        <ImageIcon size={24} className="text-gray-400" />
        <span className="text-[10px] text-gray-400">Imagen no disponible</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      )}
      <img
        src={url}
        alt={alt}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }}
        className={`w-full h-full object-contain transition-opacity ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${onClick ? 'cursor-zoom-in hover:brightness-110' : ''}`}
        draggable={false}
      />
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────

interface FlashcardCardProps {
  front: string;
  back: string;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  keywordName?: string | null;
  isFlipped: boolean;
  onFlip: () => void;
  onImageZoom?: (url: string) => void;
  onClozeComplete?: () => void;
}

// ── Side Content Renderer ─────────────────────────────────

function SideContent({
  content, explicitImageUrl, cardType, side, onImageZoom, cardId, onClozeComplete,
}: {
  content: string; explicitImageUrl?: string | null; cardType: CardType;
  side: 'front' | 'back'; onImageZoom?: (url: string) => void;
  cardId?: string; onClozeComplete?: () => void;
}) {
  const contentImageUrl = extractImageUrl(content);
  const imageUrl = explicitImageUrl || contentImageUrl;
  const text = extractText(content);

  if (cardType === 'cloze') {
    if (side === 'front') {
      return (
        <div className="w-full px-2" onClick={(e) => e.stopPropagation()}>
          <ClozeInteraction text={content} onAllRevealed={onClozeComplete || (() => {})} resetKey={cardId} />
        </div>
      );
    }
    return <div className="text-lg text-gray-800 text-center leading-relaxed">{renderClozeBack(content)}</div>;
  }

  const isImageOnly = (cardType === 'text_image' && side === 'back') || (cardType === 'image_text' && side === 'front') || cardType === 'image_image';

  if (isImageOnly && imageUrl) {
    return <CardImage url={imageUrl} alt={`${side} image`} onClick={onImageZoom ? () => onImageZoom(imageUrl) : undefined} className="max-w-[80%] max-h-[220px] mx-auto" />;
  }

  if (!isImageOnly && imageUrl && text) {
    return (
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <CardImage url={imageUrl} alt={`${side} image`} onClick={onImageZoom ? () => onImageZoom(imageUrl) : undefined} className="max-w-[80%] max-h-[180px]" />
        <p className={`text-center leading-relaxed ${side === 'front' ? 'text-base text-gray-900' : 'text-base text-gray-800'}`}>{text}</p>
      </div>
    );
  }

  if (!isImageOnly && imageUrl && !text) {
    return <CardImage url={imageUrl} alt={`${side} image`} onClick={onImageZoom ? () => onImageZoom(imageUrl) : undefined} className="max-w-[80%] max-h-[240px] mx-auto" />;
  }

  if (cardType === 'text_both') {
    return (
      <div className="flex flex-col items-center gap-3 w-full px-2">
        {text && <p className={`text-center leading-relaxed ${side === 'front' ? 'text-lg text-gray-900' : 'text-base text-gray-800'}`}>{text}</p>}
        {imageUrl && <CardImage url={imageUrl} alt={`${side} image`} onClick={onImageZoom ? () => onImageZoom(imageUrl) : undefined} className="max-w-[80%] max-h-[140px]" />}
      </div>
    );
  }

  return <p className={`text-center leading-relaxed ${side === 'front' ? 'text-xl text-gray-900' : 'text-lg text-gray-800'}`}>{text || content}</p>;
}

// ── Main Component ────────────────────────────────────────

export function FlashcardCard({ front, back, frontImageUrl, backImageUrl, keywordName, isFlipped, onFlip, onImageZoom, onClozeComplete }: FlashcardCardProps) {
  const cardType = useMemo(() => detectCardType(front, back), [front, back]);
  const isCloze = cardType === 'cloze';
  const hasAnyImage = !!(frontImageUrl || backImageUrl || extractImageUrl(front) || extractImageUrl(back));
  const typeBadge = useMemo(() => {
    switch (cardType) {
      case 'text_image': return 'Txt→Img';
      case 'image_text': return 'Img→Txt';
      case 'image_image': return 'Img→Img';
      case 'text_both': return 'Mixto';
      case 'cloze': return 'Cloze';
      default: return null;
    }
  }, [cardType]);
  const frontBorder = isCloze ? 'border-[#2a8c7a]/40' : 'border-[#2a8c7a]/25';
  const backBorder = isCloze ? 'border-[#2a8c7a]/30' : 'border-[#2a8c7a]/15';

  return (
    <div className="w-full max-w-xl mx-auto cursor-pointer select-none" style={{ perspective: '1000px' }} onClick={onFlip} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onFlip(); } }}>
      <motion.div className="relative w-full" style={{ transformStyle: 'preserve-3d', minHeight: (cardType === 'text_both' || hasAnyImage) ? '380px' : '320px' }} animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}>
        {/* ── Front Side ── */}
        <div className={`absolute inset-0 rounded-2xl border ${frontBorder} bg-white shadow-md shadow-gray-200/80 flex flex-col`} style={{ backfaceVisibility: 'hidden' }}>
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-2">
              {keywordName && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2a8c7a]/15 text-[#2a8c7a] text-[10px] font-semibold uppercase tracking-wider"><Tag size={10} />{keywordName}</span>}
              {typeBadge && <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${isCloze ? 'bg-[#2a8c7a]/10 text-[#2a8c7a]' : 'bg-gray-100 text-gray-500'}`}>{typeBadge}</span>}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Frente</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 gap-3">
            <FlashcardImage
              imageUrl={frontImageUrl ?? null}
              alt={extractText(front) || "Flashcard image"}
              size="full"
            />
            <SideContent content={front} cardType={cardType} side="front" onImageZoom={onImageZoom} cardId={front} onClozeComplete={onClozeComplete} />
          </div>
          <div className="pb-4 text-center"><span className="text-xs text-gray-400">{isCloze ? 'Toca cada blanco para revelar' : 'Toca o presiona espacio para voltear'}</span></div>
        </div>
        {/* ── Back Side ── */}
        <div className={`absolute inset-0 rounded-2xl border ${backBorder} bg-[#F0F2F5] shadow-md shadow-gray-200/80 flex flex-col`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-2">
              {keywordName && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2a8c7a]/10 text-[#2a8c7a]/70 text-[10px] font-semibold uppercase tracking-wider"><Tag size={10} />{keywordName}</span>}
              {typeBadge && <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${isCloze ? 'bg-[#2a8c7a]/10 text-[#2a8c7a]/60' : 'bg-gray-100 text-gray-400'}`}>{typeBadge}</span>}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0d9488]/70">Reverso</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 gap-3">
            <FlashcardImage
              imageUrl={backImageUrl ?? null}
              alt={extractText(back) || "Flashcard image"}
              size="full"
            />
            <SideContent content={back} cardType={cardType} side="back" onImageZoom={onImageZoom} />
          </div>
          <div className="pb-4 text-center"><span className="text-xs text-gray-400">Califica tu respuesta abajo</span></div>
        </div>
      </motion.div>
    </div>
  );
}

export { detectCardType };
export type { CardType };
export default FlashcardCard;
