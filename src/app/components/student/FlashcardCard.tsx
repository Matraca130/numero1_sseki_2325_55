// ============================================================
// Axon — FlashcardCard (Student 3D Flip Card)
//
// Renders 6 card types: text, text_image, image_text,
// image_image, text_both, cloze.
// Auto-detects type from front/back content encoding.
//
// Design: dark theme (zinc-800/900), violet accent, perspective 3D.
// Cloze cards get cyan border accent.
// ============================================================
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Tag, Image as ImageIcon } from 'lucide-react';
import { ClozeInteraction } from './ClozeInteraction';

// ── Card type detection ───────────────────────────────────

type CardType = 'text' | 'text_image' | 'image_text' | 'image_image' | 'text_both' | 'cloze';

function extractImageUrl(content: string): string | null {
  const mdMatch = content.match(/!\[img\]\(([^)]+)\)/);
  if (mdMatch) return mdMatch[1];
  const trimmed = content.trim();
  if (trimmed.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|bmp)/i)) {
    return trimmed;
  }
  return null;
}

function extractText(content: string): string {
  return content.replace(/!\[img\]\([^)]+\)/g, '').trim();
}

function detectCardType(front: string, back: string): CardType {
  if (/\{\{.+?\}\}/.test(front)) return 'cloze';
  const fImg = extractImageUrl(front);
  const bImg = extractImageUrl(back);
  const fTxt = extractText(front);
  const bTxt = extractText(back);
  if (fImg && bImg && fTxt && bTxt) return 'text_both';
  if (fImg && bImg) return 'image_image';
  if (fImg && !bImg) return 'image_text';
  if (!fImg && bImg) return 'text_image';
  return 'text';
}

// ── Render cloze back with highlighted words ──────────────

function renderClozeBack(text: string): React.ReactNode[] {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      const word = part.slice(2, -2);
      return (
        <span
          key={i}
          className="inline-block mx-0.5 px-1.5 py-0.5 bg-emerald-500/25 text-emerald-300 rounded font-semibold"
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
      <div className={`flex flex-col items-center justify-center gap-1 bg-zinc-700/30 rounded-lg ${className}`}>
        <ImageIcon size={24} className="text-zinc-600" />
        <span className="text-[10px] text-zinc-600">Imagen no disponible</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-zinc-700/50 animate-pulse rounded-lg" />
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
  /** Called when an image is clicked for zoom */
  onImageZoom?: (url: string) => void;
  /** Called when all cloze blanks are revealed (triggers grading) */
  onClozeComplete?: () => void;
}

// ── Side Content Renderer ─────────────────────────────────

function SideContent({
  content,
  explicitImageUrl,
  cardType,
  side,
  onImageZoom,
  cardId,
  onClozeComplete,
}: {
  content: string;
  explicitImageUrl?: string | null;
  cardType: CardType;
  side: 'front' | 'back';
  onImageZoom?: (url: string) => void;
  cardId?: string;
  onClozeComplete?: () => void;
}) {
  // Prefer explicit image URL over content-embedded URL
  const contentImageUrl = extractImageUrl(content);
  const imageUrl = explicitImageUrl || contentImageUrl;
  const text = extractText(content);

  // ── Cloze ──
  if (cardType === 'cloze') {
    if (side === 'front') {
      return (
        <div className="w-full px-2" onClick={(e) => e.stopPropagation()}>
          <ClozeInteraction
            text={content}
            onAllRevealed={onClozeComplete || (() => {})}
            resetKey={cardId}
          />
        </div>
      );
    }
    // Back: show full text with revealed words highlighted
    return (
      <div className="text-lg text-zinc-200 text-center leading-relaxed">
        {renderClozeBack(content)}
      </div>
    );
  }

  // ── Image-only side ──
  const isImageOnly =
    (cardType === 'text_image' && side === 'back') ||
    (cardType === 'image_text' && side === 'front') ||
    cardType === 'image_image';

  if (isImageOnly && imageUrl) {
    return (
      <CardImage
        url={imageUrl}
        alt={`${side} image`}
        onClick={onImageZoom ? () => onImageZoom(imageUrl) : undefined}
        className="max-w-[80%] max-h-[220px] mx-auto"
      />
    );
  }

  // ── Has explicit image but text-based card type: show image + text ──
  if (!isImageOnly && imageUrl && text) {
    return (
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <CardImage
          url={imageUrl}
          alt={`${side} image`}
          onClick={onImageZoom ? () => onImageZoom(imageUrl) : undefined}
          className="max-w-[80%] max-h-[180px]"
        />
        <p className={`text-center leading-relaxed ${
          side === 'front' ? 'text-base text-zinc-100' : 'text-base text-zinc-200'
        }`}>
          {text}
        </p>
      </div>
    );
  }

  // ── Only explicit image, no text ──
  if (!isImageOnly && imageUrl && !text) {
    return (
      <CardImage
        url={imageUrl}
        alt={`${side} image`}
        onClick={onImageZoom ? () => onImageZoom(imageUrl) : undefined}
        className="max-w-[80%] max-h-[240px] mx-auto"
      />
    );
  }

  // ── Mixed (text + image from content) ──
  if (cardType === 'text_both') {
    return (
      <div className="flex flex-col items-center gap-3 w-full px-2">
        {text && (
          <p className={`text-center leading-relaxed ${
            side === 'front' ? 'text-lg text-zinc-100' : 'text-base text-zinc-200'
          }`}>
            {text}
          </p>
        )}
        {imageUrl && (
          <CardImage
            url={imageUrl}
            alt={`${side} image`}
            onClick={onImageZoom ? () => onImageZoom(imageUrl) : undefined}
            className="max-w-[80%] max-h-[140px]"
          />
        )}
      </div>
    );
  }

  // ── Text only (default) ──
  return (
    <p className={`text-center leading-relaxed ${
      side === 'front' ? 'text-xl text-zinc-100' : 'text-lg text-zinc-200'
    }`}>
      {text || content}
    </p>
  );
}

// ── Main Component ────────────────────────────────────────

export function FlashcardCard({
  front,
  back,
  frontImageUrl,
  backImageUrl,
  keywordName,
  isFlipped,
  onFlip,
  onImageZoom,
  onClozeComplete,
}: FlashcardCardProps) {
  const cardType = useMemo(() => detectCardType(front, back), [front, back]);
  const isCloze = cardType === 'cloze';
  const hasAnyImage = !!(frontImageUrl || backImageUrl || extractImageUrl(front) || extractImageUrl(back));

  // Card type badge labels
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

  // Border color varies by type
  const frontBorder = isCloze ? 'border-cyan-500/30' : 'border-violet-500/30';
  const backBorder = isCloze ? 'border-cyan-500/20' : 'border-violet-500/20';

  return (
    <div
      className="w-full max-w-xl mx-auto cursor-pointer select-none"
      style={{ perspective: '1000px' }}
      onClick={onFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onFlip();
        }
      }}
    >
      <motion.div
        className="relative w-full"
        style={{
          transformStyle: 'preserve-3d',
          minHeight: (cardType === 'text_both' || hasAnyImage) ? '380px' : '320px',
        }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* ── Front Side ── */}
        <div
          className={`absolute inset-0 rounded-2xl border ${frontBorder} bg-zinc-800 shadow-xl shadow-black/30 flex flex-col`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Badges row */}
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-2">
              {keywordName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-semibold uppercase tracking-wider">
                  <Tag size={10} />
                  {keywordName}
                </span>
              )}
              {typeBadge && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                  isCloze
                    ? 'bg-cyan-500/15 text-cyan-400'
                    : 'bg-zinc-700/50 text-zinc-400'
                }`}>
                  {typeBadge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Frente
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center px-8 py-8">
            <SideContent
              content={front}
              explicitImageUrl={frontImageUrl}
              cardType={cardType}
              side="front"
              onImageZoom={onImageZoom}
              cardId={front}
              onClozeComplete={onClozeComplete}
            />
          </div>

          {/* Hint */}
          <div className="pb-4 text-center">
            <span className="text-xs text-zinc-500">
              {isCloze
                ? 'Toca cada blanco para revelar'
                : 'Toca o presiona espacio para voltear'}
            </span>
          </div>
        </div>

        {/* ── Back Side ── */}
        <div
          className={`absolute inset-0 rounded-2xl border ${backBorder} bg-zinc-900 shadow-xl shadow-black/30 flex flex-col`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Badges row */}
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-2">
              {keywordName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-400/70 text-[10px] font-semibold uppercase tracking-wider">
                  <Tag size={10} />
                  {keywordName}
                </span>
              )}
              {typeBadge && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                  isCloze
                    ? 'bg-cyan-500/10 text-cyan-500/60'
                    : 'bg-zinc-700/30 text-zinc-500'
                }`}>
                  {typeBadge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70">
              Reverso
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center px-8 py-8">
            <SideContent
              content={back}
              explicitImageUrl={backImageUrl}
              cardType={cardType}
              side="back"
              onImageZoom={onImageZoom}
            />
          </div>

          {/* Hint */}
          <div className="pb-4 text-center">
            <span className="text-xs text-zinc-500">
              Califica tu respuesta abajo
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Re-export card type detection for use by FlashcardReviewer
export { detectCardType };
export type { CardType };
export default FlashcardCard;