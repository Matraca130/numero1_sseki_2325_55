// ============================================================
// Axon — FlashcardCard (Student 3D Flip Card)
//
// Pure presentational component for a flip card with rotateY
// animation. Used inside FlashcardReviewer.
//
// Design: dark theme (zinc-800/900), violet accent, perspective 3D.
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import { Tag } from 'lucide-react';

interface FlashcardCardProps {
  front: string;
  back: string;
  keywordName?: string | null;
  isFlipped: boolean;
  onFlip: () => void;
}

export function FlashcardCard({
  front,
  back,
  keywordName,
  isFlipped,
  onFlip,
}: FlashcardCardProps) {
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
          minHeight: '320px',
        }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* ── Front Side ── */}
        <div
          className="absolute inset-0 rounded-2xl border border-violet-500/30 bg-zinc-800 shadow-xl shadow-black/30 flex flex-col"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Keyword badge */}
          {keywordName && (
            <div className="absolute top-4 left-4 z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-semibold uppercase tracking-wider">
                <Tag size={10} />
                {keywordName}
              </span>
            </div>
          )}

          {/* Side indicator */}
          <div className="absolute top-4 right-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Frente
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center px-8 py-16">
            <p className="text-xl text-zinc-100 text-center leading-relaxed">
              {front}
            </p>
          </div>

          {/* Hint */}
          <div className="pb-4 text-center">
            <span className="text-xs text-zinc-500">
              Toca o presiona espacio para voltear
            </span>
          </div>
        </div>

        {/* ── Back Side ── */}
        <div
          className="absolute inset-0 rounded-2xl border border-violet-500/20 bg-zinc-900 shadow-xl shadow-black/30 flex flex-col"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* Keyword badge */}
          {keywordName && (
            <div className="absolute top-4 left-4 z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-400/70 text-[10px] font-semibold uppercase tracking-wider">
                <Tag size={10} />
                {keywordName}
              </span>
            </div>
          )}

          {/* Side indicator */}
          <div className="absolute top-4 right-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70">
              Reverso
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center px-8 py-16">
            <p className="text-lg text-zinc-200 text-center leading-relaxed">
              {back}
            </p>
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

export default FlashcardCard;
