// ============================================================
// FlashcardSessionScreen -- Active flashcard review session
//
// Full-screen card viewer with reveal/rate flow.
// STANDALONE: depends on react, motion/react, clsx, lucide-react,
//   AxonLogo, flashcard-types (RATINGS), mastery-colors.
//
// v4.5.1 UX AUDIT:
//   - All text translated to Spanish (was Portuguese)
//   - Keyboard shortcuts: Space/Enter = reveal, 1-5 = rate
//   - Keyboard hint bar at bottom
//   - Better visual hierarchy between question/answer
//   - Softer bg (was pure black #0a0a0f → dark slate)
//   - Progress counter improved with remaining count
//   - Rating buttons with keyboard shortcut indicators
// ============================================================

import React, { useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flashcard } from '@/app/types/content';
import clsx from 'clsx';
import { CheckCircle, Brain, X, Eye, AlertTriangle, Stethoscope, Keyboard } from 'lucide-react';
import { AxonLogo } from '@/app/components/shared/AxonLogo';
import { RATINGS } from '@/app/hooks/flashcard-types';
import { getMasteryColor } from './mastery-colors';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';
import { SessionGraphPanel } from './SessionGraphPanel';
import type { MapNode } from '@/app/types/mindmap';

export function SessionScreen({ cards, currentIndex, isRevealed, setIsRevealed, handleRate, sessionStats, courseColor, onBack, masteryMap, topicId, onGraphNodeClick }: {
  cards: Flashcard[];
  currentIndex: number;
  isRevealed: boolean;
  setIsRevealed: (v: boolean) => void;
  handleRate: (r: number) => void;
  sessionStats: number[];
  /** @deprecated Colors now derived from mastery via getMasteryColor. Kept for caller compat. */
  courseColor: string;
  onBack: () => void;
  /** v4.2: Optional study-queue mastery map for leech/priority badges */
  masteryMap?: Map<string, StudyQueueItem>;
  /** Topic ID for the mini knowledge graph */
  topicId?: string;
  /** Callback when a graph node is clicked */
  onGraphNodeClick?: (node: MapNode) => void;
}) {
  const currentCard = cards[currentIndex];
  
  // Guard: if cards are empty or index is out of bounds
  useEffect(() => {
    if (!currentCard) {
      onBack();
    }
  }, [currentCard, onBack]);

  // ── Keyboard shortcuts ──
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore when typing in inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (!isRevealed) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsRevealed(true);
      }
    } else {
      // 1-5 to rate
      const num = parseInt(e.key);
      if (num >= 1 && num <= 5) {
        e.preventDefault();
        handleRate(num);
      }
    }
  }, [isRevealed, setIsRevealed, handleRate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Progress bar gradient
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
        color = '#2a8c7a';
      } else {
        color = 'transparent';
      }
      stops.push(`${color} ${startPct}%`);
      stops.push(`${color} ${endPct}%`);
    }
    return `linear-gradient(to right, ${stops.join(', ')})`;
  }, [cards.length, currentIndex, sessionStats]);

  if (!currentCard) {
    return null;
  }

  const remaining = cards.length - currentIndex - 1;
  const hasImage = !!(currentCard.image || currentCard.frontImageUrl || currentCard.backImageUrl);

  const currentImageUrl = isRevealed
    ? (currentCard.backImageUrl || currentCard.frontImageUrl || currentCard.image)
    : (currentCard.frontImageUrl || currentCard.image);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="flex flex-col h-full relative z-10 bg-[#111118] overflow-hidden"
    >
      {/* ── Main Card Area ── */}
      <div className="flex-1 flex items-center justify-center p-0 relative z-10 min-h-0">
        <div className="relative w-full h-full bg-white shadow-2xl shadow-black/40 overflow-hidden flex flex-col">

          {/* ═══ Top Progress Bar ═══ */}
          <div className="shrink-0 flex items-center gap-0 h-[6px] bg-gray-100">
            <div
              className="flex-1 h-full transition-all duration-500"
              style={{ backgroundImage: progressBarGradient }}
            />
          </div>

          {/* ═══ Header Bar ═══ */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100">
            <button
              onClick={onBack}
              className="flex items-center gap-2 p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-50"
              title="Salir de la sesión (Esc)"
            >
              <X size={18} />
              <span className="text-xs hidden sm:inline" style={{ fontWeight: 500 }}>Salir</span>
            </button>

            {/* Center: Progress counter */}
            <div className="flex items-center gap-3">
              {/* Leech + Priority badges */}
              {masteryMap?.get(currentCard.id)?.is_leech && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100" style={{ fontWeight: 600 }}>
                  <AlertTriangle size={10} />
                  Leech
                </span>
              )}
              {(masteryMap?.get(currentCard.id)?.clinical_priority ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100" style={{ fontWeight: 600 }}>
                  <Stethoscope size={10} />
                  P{Math.round((masteryMap?.get(currentCard.id)?.clinical_priority ?? 0) * 100)}
                </span>
              )}

              <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
                <span className="text-sm tabular-nums" style={{ fontWeight: 700, color: '#1B3B36' }}>
                  {currentIndex + 1}
                </span>
                <span className="text-xs text-gray-400" style={{ fontWeight: 500 }}>
                  / {cards.length}
                </span>
                {remaining > 0 && (
                  <span className="text-[10px] text-gray-400 ml-1" style={{ fontWeight: 400 }}>
                    ({remaining} restantes)
                  </span>
                )}
              </div>
            </div>

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

              {/* ── Mobile-only image ── */}
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
                    ? "bg-gray-50/80 border-b border-gray-200/60 shrink-0"
                    : "flex-1 items-center justify-center text-center bg-white"
                )}
              >
                {/* Label */}
                <div className={clsx(
                  "flex items-center gap-2 text-[#2a8c7a] text-xs uppercase tracking-[0.15em] mb-4",
                  !isRevealed && "justify-center"
                )} style={{ fontWeight: 600 }}>
                  <Brain size={13} />
                  <span>Pregunta</span>
                </div>

                {/* Question text */}
                <motion.h3
                  layout="position"
                  className={clsx(
                    "leading-tight transition-all duration-300",
                    isRevealed
                      ? "text-base text-left text-gray-500"
                      : "text-xl md:text-2xl lg:text-3xl text-gray-900"
                  )}
                  style={{ fontWeight: isRevealed ? 500 : 700 }}
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
                    <div className="flex items-center gap-2 text-emerald-500 text-xs uppercase tracking-[0.15em] mb-3" style={{ fontWeight: 600 }}>
                      <CheckCircle size={14} /> Respuesta
                    </div>
                    <h3 className="text-lg md:text-xl lg:text-2xl text-gray-900 leading-relaxed text-balance" style={{ fontWeight: 700 }}>
                      {currentCard.answer}
                    </h3>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Mini Knowledge Graph (collapsible) ── */}
              <SessionGraphPanel
                topicId={topicId}
                currentKeywordId={currentCard.keyword_id}
                onNodeClick={onGraphNodeClick}
              />

              {/* ── Reveal Button (only when NOT revealed) ── */}
              {!isRevealed && (
                <div className="mt-auto flex flex-col items-center pb-8 md:pb-10 gap-3">
                  <motion.div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsRevealed(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsRevealed(true); }}
                    className="bg-[#1B3B36] text-white px-8 py-3.5 rounded-full shadow-lg shadow-[#1B3B36]/20 hover:-translate-y-1 hover:shadow-xl hover:bg-[#244e47] transition-all flex items-center gap-2.5 text-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2a8c7a] focus-visible:ring-offset-2"
                    style={{ fontWeight: 600 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Eye size={16} /> Mostrar Respuesta
                  </motion.div>
                  <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-gray-300">
                    <Keyboard size={10} />
                    Espacio o Enter para revelar
                  </span>
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
                    {/* Rating label */}
                    <p className="text-center text-[11px] text-gray-400 mb-2 sm:mb-3" style={{ fontWeight: 500 }}>
                      ¿Qué tan bien lo sabías?
                    </p>
                    <div className="w-full max-w-xl mx-auto grid grid-cols-5 gap-1.5 sm:gap-2">
                      {RATINGS.map((rate) => (
                        <button
                          key={rate.value}
                          onClick={() => handleRate(rate.value)}
                          className="group flex flex-col items-center gap-1.5 transition-transform active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#2a8c7a] rounded-xl"
                        >
                          <div className={clsx(
                            "w-full h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center text-white shadow-md transition-all group-hover:-translate-y-1 group-hover:shadow-lg relative",
                            rate.color, rate.hover
                          )}>
                            <span className="text-base" style={{ fontWeight: 700 }}>{rate.value}</span>
                            {/* Keyboard shortcut indicator */}
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white shadow border border-gray-200 text-[8px] text-gray-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontWeight: 700 }}>
                              {rate.value}
                            </span>
                          </div>
                          <div className="text-center">
                            <span className={clsx("block text-[10px] uppercase tracking-wide", rate.text)} style={{ fontWeight: 700 }}>{rate.label}</span>
                            <span className="block text-[9px] text-gray-400 hidden sm:block" style={{ fontWeight: 500 }}>{rate.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Keyboard hint — desktop only */}
                    <p className="hidden sm:flex text-center text-[10px] text-gray-300 mt-3 items-center justify-center gap-1.5">
                      <Keyboard size={10} />
                      Presiona 1-5 en tu teclado para calificar
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}