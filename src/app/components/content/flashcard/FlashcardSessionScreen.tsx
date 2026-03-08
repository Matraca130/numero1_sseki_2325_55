// ============================================================
// FlashcardSessionScreen -- Active flashcard review session
//
// Full-screen card viewer with reveal/rate flow.
// STANDALONE: depends on react, motion/react, clsx, lucide-react,
//   AxonLogo, flashcard-types (RATINGS), mastery-colors.
//
// PHASE 3: Progress bar segments use getMasteryColor(rating).hex
//   for completed cards. Current card indicator remains brand teal.
//
// PERF v4.4.3:
//   [M5] Progress bar uses a single <div> with CSS linear-gradient
//        instead of N individual <div> elements. Reduces DOM nodes
//        from N to 1 and eliminates per-card re-render overhead.
// ============================================================

import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flashcard } from '@/app/types/content';
import clsx from 'clsx';
import { CheckCircle, Brain, X, Eye, HelpCircle } from 'lucide-react';
import { AxonLogo } from '@/app/components/shared/AxonLogo';
import { RATINGS } from '@/app/hooks/flashcard-types';
import { getMasteryColor } from './mastery-colors';

export function SessionScreen({ cards, currentIndex, isRevealed, setIsRevealed, handleRate, sessionStats, courseColor, onBack }: {
  cards: Flashcard[];
  currentIndex: number;
  isRevealed: boolean;
  setIsRevealed: (v: boolean) => void;
  handleRate: (r: number) => void;
  sessionStats: number[];
  /** @deprecated Colors now derived from mastery via getMasteryColor. Kept for caller compat. */
  courseColor: string;
  onBack: () => void;
}) {
  const currentCard = cards[currentIndex];
  
  // Guard: if cards are empty or index is out of bounds (e.g. after HMR reload),
  // navigate back via useEffect to avoid side effects during render.
  useEffect(() => {
    if (!currentCard) {
      onBack();
    }
  }, [currentCard, onBack]);

  // PERF v4.4.3: [M5] Progress bar uses a single <div> with CSS linear-gradient
  // instead of N individual <div> elements. Reduces DOM nodes
  // from N to 1 and eliminates per-card re-render overhead.
  // NOTE: Must be before early return to satisfy React hooks rules.
  const progressBarGradient = useMemo(() => {
    const total = cards.length;
    if (total === 0) return 'transparent';

    const stops: string[] = [];
    for (let i = 0; i < total; i++) {
      const startPct = ((i / total) * 100).toFixed(2);
      const endPct = (((i + 1) / total) * 100).toFixed(2);
      let color: string;
      if (i < currentIndex) {
        color = getMasteryColor(sessionStats[i]).hex;
      } else if (i === currentIndex) {
        color = '#0d9488';
      } else {
        color = 'transparent';
      }
      // Sharp stops: same color at start% and end% = discrete segment
      stops.push(`${color} ${startPct}%`);
      stops.push(`${color} ${endPct}%`);
    }
    return `linear-gradient(to right, ${stops.join(', ')})`;
  }, [cards.length, currentIndex, sessionStats]);

  // While waiting for the effect to fire, render nothing
  if (!currentCard) {
    return null;
  }

  const progress = ((currentIndex) / cards.length) * 100;
  const hasImage = !!(currentCard.image || currentCard.frontImageUrl || currentCard.backImageUrl);

  // Pick the right image depending on revealed state
  const currentImageUrl = isRevealed
    ? (currentCard.backImageUrl || currentCard.frontImageUrl || currentCard.image)
    : (currentCard.frontImageUrl || currentCard.image);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="flex flex-col h-full relative z-10 bg-[#0a0a0f] overflow-hidden"
    >
      {/* ── Main Card Area (fills entire screen) ── */}
      <div className="flex-1 flex items-center justify-center p-0 relative z-10 min-h-0">
        <div className="relative w-full h-full bg-white shadow-2xl shadow-black/40 overflow-hidden flex flex-col">

          {/* ═══ Top Progress Bar (full width) ═══ */}
          <div className="shrink-0 flex items-center gap-0 h-[6px] bg-gray-100">
            <div
              className="flex-1 h-full transition-all duration-500"
              style={{
                backgroundImage: progressBarGradient,
              }}
            />
          </div>

          {/* ═══ Header Bar (close + logo) ═══ */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-white">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
            >
              <X size={20} />
            </button>
            <AxonLogo size="xs" />
          </div>

          {/* ═══ Main Content Area ═══ */}
          <div className="flex-1 flex flex-row min-h-0 overflow-hidden">

            {/* ── LEFT COLUMN: Image ── */}
            {hasImage && (
              <div className="hidden md:flex w-[45%] lg:w-[48%] shrink-0 bg-gray-900 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={`img-${isRevealed ? 'back' : 'front'}-${currentIndex}`}
                    src={currentImageUrl!}
                    alt={currentCard.question}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </AnimatePresence>
              </div>
            )}

            {/* ── RIGHT COLUMN: Question / Answer / Controls ── */}
            <div className={clsx(
              "flex-1 flex flex-col min-h-0 min-w-0 relative bg-white",
              hasImage && "border-l border-gray-100"
            )}>

              {/* ── Mobile-only image (above question) ── */}
              {hasImage && (
                <div className="md:hidden shrink-0 w-full h-48 bg-gray-900 relative overflow-hidden">
                  <img
                    src={currentImageUrl!}
                    alt={currentCard.question}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* ── Question Area ── */}
              <motion.div
                layout
                className={clsx(
                  "p-6 md:p-8 lg:p-10 flex flex-col transition-colors duration-300 w-full",
                  isRevealed
                    ? "bg-gray-50 border-b border-gray-200 shrink-0"
                    : "flex-1 items-center justify-center text-center bg-white"
                )}
              >
                {/* Pergunta label */}
                <div className={clsx(
                  "flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-[0.15em] mb-4",
                  !isRevealed && "justify-center"
                )}>
                  <Brain size={13} />
                  <span>Pergunta:</span>
                </div>

                {/* Question text */}
                <motion.h3
                  layout="position"
                  className={clsx(
                    "font-semibold leading-tight transition-all duration-300",
                    isRevealed
                      ? "text-base text-left text-gray-500"
                      : "text-xl md:text-2xl lg:text-3xl text-gray-900"
                  )}
                >
                  {currentCard.question}
                </motion.h3>
              </motion.div>

              {/* ── Answer (only when revealed) ── */}
              <AnimatePresence>
                {isRevealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="flex-1 p-6 md:p-8 lg:p-10 bg-white flex flex-col justify-center overflow-y-auto min-h-0"
                  >
                    <div className="flex items-center gap-2 text-emerald-500 text-xs font-semibold uppercase tracking-[0.15em] mb-3">
                      <CheckCircle size={14} /> Resposta
                    </div>
                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 leading-relaxed text-balance">
                      {currentCard.answer}
                    </h3>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Reveal Button (only when NOT revealed) ── */}
              {!isRevealed && (
                <div className="mt-auto flex flex-col items-center pb-8 md:pb-10">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsRevealed(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsRevealed(true); }}
                    className="bg-gray-900 text-white px-7 py-3 rounded-full font-semibold shadow-lg shadow-gray-900/20 hover:-translate-y-1 hover:shadow-xl transition-all flex items-center gap-2.5 text-sm cursor-pointer outline-none"
                  >
                    <Eye size={16} /> Mostrar Resposta
                  </div>
                </div>
              )}

              {/* ── Rating Buttons (bottom, when revealed) ── */}
              <AnimatePresence mode="wait">
                {isRevealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-4"
                  >
                    <div className="w-full max-w-xl mx-auto grid grid-cols-5 gap-2">
                      {RATINGS.map((rate) => (
                        <button
                          key={rate.value}
                          onClick={() => handleRate(rate.value)}
                          className="group flex flex-col items-center gap-1.5 transition-transform active:scale-95 outline-none"
                        >
                          <div className={clsx(
                            "w-full h-12 rounded-xl flex flex-col items-center justify-center text-white shadow-md transition-all group-hover:-translate-y-1 group-hover:shadow-lg",
                            rate.color, rate.hover
                          )}>
                            <span className="text-base font-bold">{rate.value}</span>
                          </div>
                          <div className="text-center">
                            <span className={clsx("block text-[10px] font-bold uppercase tracking-wide", rate.text)}>{rate.label}</span>
                            <span className="block text-[9px] text-gray-400 font-medium hidden md:block">{rate.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ═══ Card Counter (bottom-right corner) ═══ */}
          <div className="absolute bottom-3 right-4 z-20">
            <span className="text-xs font-semibold text-gray-300 tabular-nums">
              {currentIndex + 1}/{cards.length}
            </span>
          </div>

        </div>
      </div>
    </motion.div>
  );
}