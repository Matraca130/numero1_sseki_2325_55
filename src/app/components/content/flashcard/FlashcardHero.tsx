// ============================================================
// FlashcardHero -- Hero section for the Flashcard landing page
//
// Sections:
//   1. Greeting with time-of-day + student name
//   2. CTA card "Repaso del d\u00EDa" with animated spine + progress
//   3. Quick Stats row (4 metrics)
//
// STANDALONE: only depends on react, motion/react, lucide-react.
// All data is passed via props -- no hooks/context dependencies.
//
// PHASE 2: imports shared ProgressBar + focusRing from constants.
// ============================================================

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Layers,
  Flame,
  Clock,
  CheckCircle2,
  Brain,
  Target,
} from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { focusRing } from './constants';

// ── Types ─────────────────────────────────────────────────

export interface FlashcardHeroProps {
  /** Student display name */
  userName: string;
  /** Cards due today */
  totalDue: number;
  /** Total cards across all decks */
  totalCards: number;
  /** Cards considered mastered (BKT >= 0.80) */
  totalMastered: number;
  /** Global accuracy 0-100 */
  globalAccuracy: number;
  /** Best streak in days */
  longestStreak: number;
  /** Decks (topics) with pending cards */
  decksWithDue: number;
  /** New cards not yet studied */
  totalNewCards: number;
  /** Deck spine segments for animated CTA */
  deckSpine: { id: string; hasDue: boolean }[];
  /** Callback when "Start review" is clicked */
  onStartReview: () => void;
}

// ── Main component ────────────────────────────────────────

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
          initial: { y: 20, opacity: 0 } as const,
          animate: { y: 0, opacity: 1 } as const,
          transition: { duration: 0.5, delay },
        };

  // Time-based greeting
  const timeOfDay = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos d\u00EDas';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const masteryPercent =
    totalCards > 0 ? Math.round((totalMastered / totalCards) * 100) : 0;

  return (
    <section className="relative overflow-hidden rounded-2xl">
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#004D44] via-[#003D35] to-[#00201A]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.07] bg-[#e9e9f6]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(0,187,167,0.9) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Animated orbs */}
      {!shouldReduce && (
        <>
          <motion.div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#00BBA7]/20 blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#009688]/20 blur-3xl"
            animate={{ x: [0, -20, 0], y: [0, 15, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-[#00D4BD]/10 blur-3xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {/* ── Content ── */}
      <div className="relative max-w-5xl mx-auto px-6 pt-10 pb-12">
        {/* Brand Ombr\u00E9 overlay */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(168deg, #1DD4C0 0%, #00BBA7 38%, #00917E 100%)',
            opacity: 0.9,
          }}
        />

        {/* ── Greeting ── */}
        <motion.div {...fadeUp(0)} className="relative">
          <div className="flex items-center gap-2.5 mb-3">
            <motion.span
              className="text-xl"
              animate={
                shouldReduce
                  ? undefined
                  : { rotate: [0, 14, -8, 14, -4, 10, 0] }
              }
              transition={{ duration: 1.5, delay: 0.3 }}
            >
              {'\uD83E\uDDE0'}
            </motion.span>
            <span className="text-sm text-[#1E293B]" style={{ fontWeight: 500 }}>
              {timeOfDay}, {userName}
            </span>
          </div>

          <h1
            className="text-3xl text-[#0F172A] mb-2 tracking-tight"
            style={{ fontWeight: 700 }}
          >
            Tus Flashcards
          </h1>
          <p
            className="text-[#1E293B] text-sm max-w-lg"
            style={{ fontWeight: 400 }}
          >
            {'Ten\u00E9s '}
            <span className="text-[#0F172A] bg-white/25 rounded px-1.5 py-0.5" style={{ fontWeight: 600 }}>
              {totalDue} cards pendientes
            </span>
            {' hoy.'}
            {longestStreak > 0 && (
              <>
                {' Tu mejor racha es de '}
                <span className="text-[#0F172A] bg-white/25 rounded px-1.5 py-0.5" style={{ fontWeight: 600 }}>
                  {longestStreak} d{'\u00EDas'}
                </span>
                {'.'}
              </>
            )}
          </p>
        </motion.div>

        {/* ── CTA Card ── */}
        <motion.button
          onClick={onStartReview}
          className={`w-full text-left mt-7 bg-white/[0.22] backdrop-blur-xl border border-white/30 rounded-2xl p-6 hover:bg-white/[0.28] hover:border-white/40 transition-all group cursor-pointer relative overflow-hidden shadow-lg shadow-[#00201A]/10 ${focusRing}`}
          style={{ borderTopColor: 'rgba(255,255,255,0.45)' }}
          {...fadeUp(0.3)}
          whileHover={shouldReduce ? undefined : { y: -3 }}
        >
          {/* Card spine */}
          <div className="absolute left-2.5 top-5 bottom-5 flex flex-col items-center gap-1.5">
            {deckSpine.map((deck, i) => (
              <motion.div
                key={deck.id}
                className={`w-1.5 flex-1 rounded-full ${
                  deck.hasDue
                    ? 'bg-[#009688] shadow-[0_0_6px_rgba(0,150,136,0.4)]'
                    : 'bg-[#00201A]/10'
                }`}
                initial={shouldReduce ? false : { scaleY: 0 }}
                animate={{
                  scaleY: 1,
                  opacity:
                    deck.hasDue && i === 0 && !shouldReduce
                      ? [0.6, 1, 0.6]
                      : 1,
                }}
                transition={{
                  scaleY: { delay: 0.4 + i * 0.08, duration: 0.3 },
                  opacity:
                    deck.hasDue && i === 0
                      ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                      : undefined,
                }}
                style={{ originY: 0 }}
              />
            ))}
          </div>

          <div className="flex items-start gap-6 pl-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-[#009688]" />
                <span
                  className="text-xs text-[#1E293B] bg-[#009688]/12 px-2.5 py-0.5 rounded-full border border-[#009688]/20"
                  style={{ fontWeight: 600 }}
                >
                  Repaso del d{'\u00EDa'}
                </span>
                <span
                  className="text-xs text-[#475569] ml-auto"
                  style={{ fontWeight: 500 }}
                >
                  ~{Math.round(totalDue * 0.2)} min
                </span>
              </div>

              <h2
                className="text-lg text-[#0F172A] mb-1.5 tracking-tight"
                style={{ fontWeight: 700 }}
              >
                {totalDue} cards para repasar
              </h2>

              <p
                className="text-xs text-[#475569] mb-5"
                style={{ fontWeight: 400 }}
              >
                De {decksWithDue} mazos diferentes {'\u00B7'} {totalNewCards} nuevas +{' '}
                {Math.max(totalDue - totalNewCards, 0)} repaso
              </p>

              <div className="flex items-center gap-5">
                <div className="flex-1 max-w-xs">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[#475569]" style={{ fontWeight: 500 }}>
                      Dominio global
                    </span>
                    <span
                      className="text-[#1E293B]"
                      style={{ fontWeight: 700 }}
                    >
                      {masteryPercent}%
                    </span>
                  </div>
                  <ProgressBar
                    value={totalCards > 0 ? totalMastered / totalCards : 0}
                    color="bg-gradient-to-r from-[#009688] to-[#00BBA7]"
                    className="h-2"
                    animated
                    dark
                  />
                </div>

                <div
                  className="flex items-center gap-1.5 text-xs text-[#64748B]"
                  style={{ fontWeight: 500 }}
                >
                  <Brain className="w-3.5 h-3.5" />
                  {totalMastered}/{totalCards} dominadas
                </div>
              </div>
            </div>

            {/* CTA play button */}
            <motion.div
              className="w-16 h-16 bg-gradient-to-br from-[#007A6C] to-[#005C52] rounded-2xl flex items-center justify-center shrink-0 shadow-xl shadow-[#005C52]/30 group-hover:shadow-[#005C52]/45 transition-shadow"
              whileHover={shouldReduce ? undefined : { scale: 1.08, rotate: 3 }}
              whileTap={shouldReduce ? undefined : { scale: 0.95 }}
            >
              <Layers className="w-7 h-7 text-white" />
            </motion.div>
          </div>
        </motion.button>

        {/* ── Quick Stats ── */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6"
          {...fadeUp(0.6)}
        >
          {[
            {
              label: 'Pendientes',
              value: `${totalDue}`,
              sub: 'para hoy',
              icon: Clock,
              accent: 'text-[#0891B2]',
            },
            {
              label: 'Precisi\u00F3n',
              value: `${globalAccuracy}%`,
              sub: 'promedio global',
              icon: Target,
              accent: 'text-[#059669]',
            },
            {
              label: 'Dominadas',
              value: `${totalMastered}`,
              sub: `de ${totalCards} total`,
              icon: CheckCircle2,
              accent: 'text-[#00BBA7]',
            },
            {
              label: 'Racha',
              value: `${longestStreak}d`,
              sub: 'mejor racha',
              icon: Flame,
              accent: 'text-[#E17B2F]',
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3.5"
              {...fadeUp(0.65 + i * 0.07)}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-3.5 h-3.5 ${stat.accent}`} />
                <span
                  className="text-[11px] text-[#475569]"
                  style={{ fontWeight: 500 }}
                >
                  {stat.label}
                </span>
              </div>
              <p
                className="text-xl text-[#0F172A] tracking-tight"
                style={{ fontWeight: 700 }}
              >
                {stat.value}
              </p>
              <p
                className="text-[11px] text-[#64748B] mt-0.5"
                style={{ fontWeight: 400 }}
              >
                {stat.sub}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
