// ============================================================
// Axon — FlashcardPreview (Live Card Preview for Editor)
//
// Shows a miniature, interactive preview of the card being edited.
// Supports all 6 card types with flip animation.
// Used inside FlashcardsManager create/edit modal.
//
// Light-themed container wrapping a dark-themed card preview
// to match the student experience.
// ============================================================
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Tag, RotateCcw, Image as ImageIcon } from 'lucide-react';
import type { CardType } from './FlashcardTypeSelector';

// ── Helpers ───────────────────────────────────────────────

/** Extract image URL from content: ![img](URL) or standalone URL */
export function extractImageUrl(content: string): string | null {
  const mdMatch = content.match(/!\[img\]\(([^)]+)\)/);
  if (mdMatch) return mdMatch[1];
  // Check if the whole content is a URL
  const trimmed = content.trim();
  if (trimmed.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|bmp)/i)) {
    return trimmed;
  }
  return null;
}

/** Extract text content (removing image markdown) */
export function extractText(content: string): string {
  return content.replace(/!\[img\]\([^)]+\)/g, '').trim();
}

/** Render cloze front: replace {{word}} with blanks */
export function renderClozeFront(text: string): React.ReactNode[] {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      return (
        <span
          key={i}
          className="inline-block mx-0.5 px-2 py-0.5 bg-blue-500/20 border-b-2 border-blue-400 text-blue-300 min-w-[3rem] text-center"
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
          className="inline-block mx-0.5 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-semibold"
        >
          {word}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Props ─────────────────────────────────────────────────

interface FlashcardPreviewProps {
  front: string;
  back: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  cardType: CardType;
  keywordName?: string | null;
}

// ── Image display component ───────────────────────────────

function PreviewImage({ url, alt }: { url: string; alt: string }) {
  const [error, setError] = useState(false);

  if (!url || error) {
    return (
      <div className="w-full h-32 rounded-lg bg-zinc-700/50 border border-zinc-600/50 flex flex-col items-center justify-center gap-1">
        <ImageIcon size={20} className="text-zinc-500" />
        <span className="text-[10px] text-zinc-500">
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
      className="w-full h-32 object-cover rounded-lg border border-zinc-600/30"
    />
  );
}

// ── Side content renderer ─────────────────────────────────

function SideContent({
  text,
  imageUrl,
  cardType,
  side,
}: {
  text: string;
  imageUrl?: string;
  cardType: CardType;
  side: 'front' | 'back';
}) {
  const isImageSide =
    (cardType === 'text_image' && side === 'back') ||
    (cardType === 'image_text' && side === 'front') ||
    (cardType === 'image_image');

  const isMixedSide = cardType === 'text_both';
  const isCloze = cardType === 'cloze';

  if (isCloze) {
    return (
      <div className="text-center leading-relaxed">
        {side === 'front'
          ? renderClozeFront(text || 'Escribe texto con {{blancos}}...')
          : renderClozeBack(text || 'Texto completo aparecera aqui...')}
      </div>
    );
  }

  if (isImageSide) {
    return imageUrl ? (
      <PreviewImage url={imageUrl} alt={`${side} image`} />
    ) : (
      <div className="w-full h-32 rounded-lg bg-zinc-700/50 border border-dashed border-zinc-600/50 flex flex-col items-center justify-center gap-1">
        <ImageIcon size={20} className="text-zinc-500" />
        <span className="text-[10px] text-zinc-500">Pega una URL de imagen</span>
      </div>
    );
  }

  if (isMixedSide) {
    return (
      <div className="space-y-2 w-full">
        <p className={`text-center leading-relaxed ${text ? '' : 'text-zinc-500 italic'}`}>
          {text || `${side === 'front' ? 'Frente' : 'Reverso'}...`}
        </p>
        {imageUrl ? (
          <PreviewImage url={imageUrl} alt={`${side} image`} />
        ) : (
          <div className="w-full h-20 rounded-lg bg-zinc-700/30 border border-dashed border-zinc-600/30 flex items-center justify-center">
            <span className="text-[10px] text-zinc-600">Imagen (opcional)</span>
          </div>
        )}
      </div>
    );
  }

  // Default: text only
  return (
    <p className={`text-center leading-relaxed ${text ? '' : 'text-zinc-500 italic'}`}>
      {text || `${side === 'front' ? 'Escribe el frente...' : 'Escribe el reverso...'}`}
    </p>
  );
}

// ── Main Component ────────────────────────────────────────

export function FlashcardPreview({
  front,
  back,
  frontImageUrl,
  backImageUrl,
  cardType,
  keywordName,
}: FlashcardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Card type badge */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Preview
        </span>
        <button
          type="button"
          onClick={() => setIsFlipped(!isFlipped)}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
          title="Voltear"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      {/* Card container with dark background */}
      <div
        className="w-full rounded-xl bg-zinc-950/95 p-4"
        style={{ perspective: '800px' }}
      >
        <div
          className="cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <motion.div
            className="relative w-full"
            style={{
              transformStyle: 'preserve-3d',
              minHeight: '220px',
            }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* ── Front ── */}
            <div
              className="absolute inset-0 rounded-xl border border-violet-500/30 bg-zinc-800 flex flex-col overflow-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              {/* Badges */}
              <div className="flex items-center justify-between px-3 pt-3">
                {keywordName ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-semibold uppercase tracking-wider">
                    <Tag size={8} />
                    {keywordName}
                  </span>
                ) : <div />}
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                  Frente
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 flex items-center justify-center px-4 py-4 text-sm text-zinc-100">
                <SideContent
                  text={front}
                  imageUrl={frontImageUrl}
                  cardType={cardType}
                  side="front"
                />
              </div>
            </div>

            {/* ── Back ── */}
            <div
              className="absolute inset-0 rounded-xl border border-violet-500/20 bg-zinc-900 flex flex-col overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="flex items-center justify-between px-3 pt-3">
                {keywordName ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400/70 text-[9px] font-semibold uppercase tracking-wider">
                    <Tag size={8} />
                    {keywordName}
                  </span>
                ) : <div />}
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/70">
                  Reverso
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center px-4 py-4 text-sm text-zinc-200">
                <SideContent
                  text={back}
                  imageUrl={backImageUrl}
                  cardType={cardType}
                  side="back"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <span className="text-[10px] text-gray-400">
        Click para voltear
      </span>
    </div>
  );
}

export default FlashcardPreview;
