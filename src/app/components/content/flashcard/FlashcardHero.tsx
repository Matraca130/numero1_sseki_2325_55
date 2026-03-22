// ============================================================
// FlashcardHero -- Compact hero for the Flashcard landing page
//
// Shows only the essentials:
//   - Cards due today + decks with pending
//   - Mastery progress bar
//   - Start review CTA
//
// Palette: AXON Medical Academy official colors
//   Dark Teal #1B3B36, Teal Accent #2a8c7a, Hover #244e47
//   Progress gradient #2dd4a8→0d9488, Page bg #F0F2F5, Cards #FFFFFF
// ============================================================

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Layers, Clock, Brain, ChevronRight } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { focusRing } from './constants';
import { headingStyle } from '@/app/design-system';

// ── Types ─────────────────────────────────────────────────────

export interface FlashcardHeroProps {
  userName: string;
  totalDue: number;
  totalCards: number;
  totalMastered: number;
  globalAccuracy: number;
  longestStreak: number;
  decksWithDue: number;
  totalNewCards: number;
  deckSpine: { id: string; hasDue: boolean }[];
  onStartReview: () => void;
}

// ── Main component ────────────────────────────────────────────

export function FlashcardHero({
  userName,
  totalDue,
  totalCards,
  totalMastered,
  globalAccuracy,
  longestStreak,
  decksWithDue,
  totalNewCards,
  deckSpine,
  onStartReview,
}: FlashcardHeroProps) {
  const shouldReduce = useReducedMotion();

  const fadeUp = (delay: number) =>
    shouldReduce
      ? {}
      : {
          initial: { y: 12, opacity: 0 } as const,
          animate: { y: 0, opacity: 1 } as const,
          transition: { duration: 0.4, delay },
        };

  const masteryPercent =
    totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

  const reviewCards = Math.max(totalDue - totalNewCards, 0);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#1B3B36]">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(45,212,168,0.8) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Soft glow */}
      {!shouldReduce && (
        <motion.div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#2a8c7a]/15 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* ── Content ── */}
      <div className="relative px-4 py-6 sm:px-6 sm:py-8">
        {/* Top row: due count + time estimate */}
        <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-5 sm:mb-6 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-[#2a8c7a] flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span
                className="text-xs text-[#2dd4a8] uppercase tracking-wider"
                style={{ fontWeight: 600 }}
              >
                Repaso del día
              </span>
            </div>
            <h1
              className="text-xl sm:text-[clamp(1.25rem,2.5vw,1.5rem)] text-white tracking-tight mt-2"
              style={{ ...headingStyle, fontWeight: 700 }}
            >
              {totalDue} cards pendientes
            </h1>
            <p
              className="text-xs sm:text-sm text-white/60 mt-1"
              style={{ fontWeight: 400 }}
            >
              {decksWithDue} {decksWithDue === 1 ? 'mazo' : 'mazos'} · {totalNewCards} nuevas + {reviewCards} repaso
            </p>
          </div>

          {/* Time estimate badge */}
          <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5 self-start">
            <Clock className="w-3.5 h-3.5 text-[#2dd4a8]" />
            <span
              className="text-xs text-white/80"
              style={{ fontWeight: 500 }}
            >
              ~{Math.max(Math.round(totalDue * 0.2), 1)} min
            </span>
          </div>
        </motion.div>

        {/* Mastery progress */}
        <motion.div {...fadeUp(0.15)} className="mb-5 sm:mb-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-[#2dd4a8]" />
              <span className="text-white/60" style={{ fontWeight: 500 }}>
                Dominio global
              </span>
            </div>
            <span className="text-white/90" style={{ fontWeight: 700 }}>
              {totalMastered}/{totalCards} · {masteryPercent}%
            </span>
          </div>
          <ProgressBar
            value={totalCards > 0 ? totalMastered / totalCards : 0}
            color="bg-gradient-to-r from-[#0d9488] to-[#2dd4a8]"
            className="h-2"
            animated
            dark
          />
        </motion.div>

        {/* CTA Button */}
        <motion.button
          onClick={onStartReview}
          disabled={totalDue === 0}
          className={`w-full flex items-center justify-between bg-[#2a8c7a] hover:bg-[#244e47] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3.5 sm:px-5 sm:py-4 transition-colors group cursor-pointer ${focusRing}`}
          {...fadeUp(0.3)}
          whileHover={shouldReduce ? undefined : { y: -2 }}
          whileTap={shouldReduce ? undefined : { scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <span
                className="text-sm text-white block"
                style={{ fontWeight: 600 }}
              >
                {totalDue > 0 ? 'Comenzar repaso' : 'Sin cards pendientes'}
              </span>
              {totalDue > 0 && (
                <span
                  className="text-xs text-white/60 block"
                  style={{ fontWeight: 400 }}
                >
                  {totalDue} cards · {decksWithDue} {decksWithDue === 1 ? 'mazo' : 'mazos'}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </motion.button>
      </div>
    </section>
  );
}