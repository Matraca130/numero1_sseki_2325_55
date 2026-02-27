// ============================================================
// Axon — ClozeInteraction (Student Cloze Card Interaction)
//
// Renders text with interactive {{blanks}} that reveal on tap.
// Tracks which blanks are revealed, shows counter, and calls
// onAllRevealed when all blanks have been tapped.
//
// Used inside FlashcardCard for cloze-type cards.
// ============================================================
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye } from 'lucide-react';

interface ClozeInteractionProps {
  /** The cloze text with {{word}} markers */
  text: string;
  /** Called when all blanks are revealed */
  onAllRevealed: () => void;
  /** Reset revealed state (e.g., when card changes) */
  resetKey?: string;
}

interface BlankInfo {
  index: number;
  word: string;
}

export function ClozeInteraction({ text, onAllRevealed, resetKey }: ClozeInteractionProps) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  // Parse blanks from text
  const blanks = useMemo<BlankInfo[]>(() => {
    const result: BlankInfo[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    let idx = 0;
    while ((match = regex.exec(text)) !== null) {
      result.push({ index: idx, word: match[1] });
      idx++;
    }
    return result;
  }, [text]);

  const totalBlanks = blanks.length;
  const revealedCount = revealed.size;
  const allRevealed = totalBlanks > 0 && revealedCount >= totalBlanks;

  // Reset when card changes
  useEffect(() => {
    setRevealed(new Set());
  }, [resetKey, text]);

  // Notify when all revealed
  useEffect(() => {
    if (allRevealed) {
      onAllRevealed();
    }
  }, [allRevealed, onAllRevealed]);

  const handleRevealOne = useCallback((index: number) => {
    setRevealed(prev => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const handleRevealAll = useCallback(() => {
    setRevealed(new Set(blanks.map(b => b.index)));
  }, [blanks]);

  // Render text with interactive blanks
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  let blankIdx = 0;

  return (
    <div className="space-y-4">
      {/* Cloze text */}
      <div className="text-lg text-zinc-100 text-center leading-relaxed">
        {parts.map((part, i) => {
          if (part.startsWith('{{') && part.endsWith('}}')) {
            const word = part.slice(2, -2);
            const idx = blankIdx++;
            const isRevealed = revealed.has(idx);

            return (
              <span key={i} className="inline-block mx-0.5 relative">
                <AnimatePresence mode="wait">
                  {isRevealed ? (
                    <motion.span
                      key="revealed"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      className="inline-block px-2 py-0.5 bg-emerald-500/25 text-emerald-300 rounded font-semibold border-b-2 border-emerald-400/50"
                    >
                      {word}
                    </motion.span>
                  ) : (
                    <motion.button
                      key="blank"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRevealOne(idx);
                      }}
                      className="inline-block px-3 py-0.5 bg-cyan-500/15 border-b-2 border-cyan-400/50 text-cyan-300/60 rounded cursor-pointer hover:bg-cyan-500/25 hover:text-cyan-200 transition-all min-w-[3rem] text-center active:scale-95"
                      whileTap={{ scale: 0.95 }}
                    >
                      ____
                    </motion.button>
                  )}
                </AnimatePresence>
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Counter */}
        <span className="text-xs text-zinc-500">
          {revealedCount}/{totalBlanks} revelado{revealedCount !== 1 ? 's' : ''}
        </span>

        {/* Reveal all button */}
        {!allRevealed && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRevealAll();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 text-xs font-medium hover:bg-cyan-500/25 transition-all border border-cyan-500/20"
          >
            <Eye size={12} />
            Revelar todos
          </button>
        )}

        {allRevealed && (
          <span className="text-xs text-emerald-400 font-medium">
            Todos revelados — califica abajo
          </span>
        )}
      </div>
    </div>
  );
}

export default ClozeInteraction;
