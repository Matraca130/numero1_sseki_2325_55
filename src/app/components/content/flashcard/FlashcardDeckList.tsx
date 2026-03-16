// ============================================================
// FlashcardDeckList -- Deck cards with filters + mastery rings
//
// STANDALONE: only depends on react, motion/react, lucide-react.
// All data is passed via props -- no hooks/context dependencies.
//
// LAYOUT: This is the LEFT column in a 2-column layout.
//   flex-1 min-w-0  (parent uses flex gap-8)
//
// PHASE 2: imports shared ProgressBar, MasteryRing, focusRing.
// PHASE 4: mastery-derived colors per deck, courseColor deprecated.
// PHASE 8b: Dynamic boxShadow on deck cards (base + whileHover).
// ============================================================

import React, { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  Layers,
  Flame,
  CheckCircle2,
  ArrowRight,
  Target,
  Sparkles,
  CircleDot,
} from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { MasteryRing } from './MasteryRing';
import { focusRing } from './constants';
import { getMasteryColorFromPct } from './mastery-colors';

// ── Types ─────────────────────────────────────────────────────

export interface FlashcardDeck {
  id: string;
  topicName: string;
  sectionName: string;
  totalCards: number;
  dueToday: number;
  newCards: number;
  masteredCards: number;
  accuracy: number;
  lastReviewed: string | null;
  streakDays: number;
  /** @deprecated Colors now derived from mastery via getMasteryColorFromPct. Kept for caller compat. */
  courseColor?: string;
}

export interface FlashcardDeckListProps {
  decks: FlashcardDeck[];
  onDeckClick: (deckId: string) => void;
}

// ── Main component ────────────────────────────────────────

export function FlashcardDeckList({ decks, onDeckClick }: FlashcardDeckListProps) {
  const shouldReduce = useReducedMotion();
  const [deckFilter, setDeckFilter] = useState<'all' | 'due' | 'mastered'>('due');

  const totalCards = decks.reduce((a, d) => a + d.totalCards, 0);
  const totalDue = decks.reduce((a, d) => a + d.dueToday, 0);

  const filteredDecks = decks.filter(d => {
    if (deckFilter === 'due') return d.dueToday > 0;
    if (deckFilter === 'mastered') return d.masteredCards === d.totalCards;
    return true;
  });

  const fadeUp = (delay: number) =>
    shouldReduce
      ? {}
      : {
          initial: { y: 20, opacity: 0 } as const,
          animate: { y: 0, opacity: 1 } as const,
          transition: { duration: 0.5, delay },
        };

  return (
    <div className="flex-1 min-w-0">
      {/* ── Section header + filters ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm text-zinc-900" style={{ fontWeight: 700 }}>
              Tus Mazos
            </h3>
            <p className="text-xs text-zinc-500" style={{ fontWeight: 400 }}>
              {decks.length} mazos {'\u00B7'} {totalCards} cards en total
            </p>
          </div>
        </div>

        {/* Filter pills — scrollable on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
          {(
            [
              { key: 'due', label: 'Pendientes' },
              { key: 'all', label: 'Todos' },
              { key: 'mastered', label: 'Dominados' },
            ] as const
          ).map(f => (
            <button
              key={f.key}
              onClick={() => setDeckFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer shrink-0 ${focusRing} ${
                deckFilter === f.key
                  ? 'bg-[#c2e8df] text-[#1B3B36] border border-[#2a8c7a]/20'
                  : 'text-zinc-500 hover:bg-zinc-100 border border-transparent'
              }`}
              style={{ fontWeight: 600 }}
            >
              {f.label}
              {f.key === 'due' && totalDue > 0 && (
                <span
                  className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full"
                  style={{ fontWeight: 700 }}
                >
                  {totalDue}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Deck cards ── */}
      <div className="space-y-2.5 sm:space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredDecks.map((deck, idx) => {
            const deckMastery = getMasteryColorFromPct(deck.accuracy / 100);
            return (
            <motion.button
              key={deck.id}
              layout
              onClick={() => onDeckClick(deck.id)}
              className={`w-full text-left bg-white border rounded-2xl p-3.5 sm:p-5 transition-all cursor-pointer relative overflow-hidden group ${focusRing} ${
                deck.dueToday > 0
                  ? 'border-zinc-200 hover:border-[#2a8c7a]/30'
                  : 'border-zinc-100 hover:border-zinc-200'
              }`}
              style={{ boxShadow: `0 2px 8px ${deckMastery.hex}12` }}
              initial={shouldReduce ? false : { y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ delay: idx * 0.06 }}
              whileHover={shouldReduce ? undefined : { y: -3, boxShadow: `0 12px 32px ${deckMastery.hex}25` }}
            >
              {/* Color accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{ backgroundColor: deckMastery.hex }}
              />

              <div className="flex items-start gap-3 sm:gap-4">
                {/* Mastery ring */}
                <div className="relative shrink-0">
                  <MasteryRing
                    value={deck.totalCards > 0 ? deck.masteredCards / deck.totalCards : 0}
                    color={deckMastery.hex}
                    size={36}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <h4
                        className="text-sm text-zinc-900 truncate"
                        style={{ fontWeight: 600 }}
                      >
                        {deck.topicName}
                      </h4>
                      <p
                        className="text-[11px] text-zinc-400 mt-0.5"
                        style={{ fontWeight: 400 }}
                      >
                        {deck.sectionName}
                      </p>
                    </div>

                    {/* Due badge */}
                    {deck.dueToday > 0 ? (
                      <span
                        className="shrink-0 text-[11px] px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center gap-1"
                        style={{ fontWeight: 600 }}
                      >
                        <CircleDot className="w-3 h-3" />
                        {deck.dueToday} pendientes
                      </span>
                    ) : (
                      <motion.span
                        className="shrink-0 text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1"
                        style={{ fontWeight: 600 }}
                        initial={shouldReduce ? false : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, delay: 0.5 }}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Al d{'\u00EDa'}
                      </motion.span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex-1">
                      <ProgressBar
                        value={deck.totalCards > 0 ? deck.masteredCards / deck.totalCards : 0}
                        color={
                          deck.masteredCards === deck.totalCards
                            ? 'bg-emerald-500'
                            : deckMastery.accent
                        }
                        className="h-1.5"
                        animated
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 shrink-0">
                      <span className="flex items-center gap-1" style={{ fontWeight: 500 }}>
                        <Target className="w-3 h-3" />
                        {deck.accuracy}%
                      </span>
                      <span className="flex items-center gap-1" style={{ fontWeight: 500 }}>
                        <Layers className="w-3 h-3" />
                        {deck.masteredCards}/{deck.totalCards}
                      </span>
                      {deck.streakDays > 0 && (
                        <span
                          className="flex items-center gap-1 text-orange-500"
                          style={{ fontWeight: 600 }}
                        >
                          <Flame className="w-3 h-3" />
                          {deck.streakDays}d
                        </span>
                      )}
                    </div>
                  </div>

                  {/* New cards indicator */}
                  {deck.newCards > 0 && (
                    <div
                      className={clsx("flex items-center gap-1.5 mt-2.5 text-[11px]", deckMastery.text)}
                      style={{ fontWeight: 500 }}
                    >
                      <Sparkles className="w-3 h-3" />
                      {deck.newCards} cards nuevas por aprender
                    </div>
                  )}

                  {deck.lastReviewed && (
                    <p
                      className="text-[10px] text-zinc-300 mt-2 hidden sm:block"
                      style={{ fontWeight: 400 }}
                    >
                      {'\u00DAltimo'} repaso: {deck.lastReviewed}
                    </p>
                  )}
                </div>

                {/* Hover arrow — desktop only */}
                <motion.div className="absolute bottom-4 right-4 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                  <ArrowRight className="w-4 h-4 text-zinc-600" />
                </motion.div>
              </div>
            </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {filteredDecks.length === 0 && (
          <motion.div className="text-center py-12 text-zinc-400" {...fadeUp(0)}>
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-300" />
            <p className="text-sm" style={{ fontWeight: 600 }}>
              {deckFilter === 'due'
                ? 'No hay cards pendientes! Est\u00E1s al d\u00EDa.'
                : 'No hay mazos en esta categor\u00EDa.'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
