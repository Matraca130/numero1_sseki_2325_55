// ============================================================
// Flashcard Types, Constants & Pure Utilities
// Shared across all flashcard screens and hooks.
//
// ── Mastery systems (see MASTERY-SYSTEMS.md in repo root) ──
// RATINGS below is SISTEMA A — rating INPUT (1-5, momentáneo).
// NO es mastery output. Para color de card dominada usar Sistema B
// (components/content/flashcard/mastery-colors.ts). Para color de
// keyword con priority usar Sistema C (lib/mastery-helpers.ts).
// NO intercambiar sistemas — cada uno existe por razones distintas.
// ============================================================

import type { Flashcard } from '@/app/types/content';

// ── Types ──

export type FlashcardViewState = 'hub' | 'section' | 'deck' | 'session' | 'summary';

export interface MasteryStats {
  avg: number;
  pct: number;
  mastered: number;
  learning: number;
  newCards: number;
}

// ── Constants ──

/**
 * 5-level UI rating buttons — the ONLY scale the flashcard
 * session screen renders. Axon does NOT use the SM-2 algorithm;
 * the extra granularity is purely a UX choice. Real scheduling
 * runs on FSRS v4 on the backend.
 *
 * Flow of a rating through the system:
 *   1. User clicks one of these buttons → rating: 1..5
 *   2. `useFlashcardEngine.handleRate(rating)` receives it
 *   3. `uiRatingToFsrsGrade(rating)` (from `@/app/lib/grade-mapper`)
 *      translates 1..5 → FSRS 1..4
 *   4. The FSRS grade is what reaches `useReviewBatch` and the
 *      backend `POST /review-batch` endpoint (PATH B)
 *
 * Do NOT pass these values directly to `queueReview()` or any
 * backend call — always run them through `uiRatingToFsrsGrade()`
 * first. See audit 2026-04-14 P0 #1 for history.
 */
export const RATINGS = [
  { value: 1, label: 'No sé', color: 'bg-rose-500', hover: 'hover:bg-rose-600', text: 'text-rose-500', desc: 'Repetir pronto' },
  { value: 2, label: 'Difícil', color: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-orange-500', desc: 'Necesito repasar' },
  { value: 3, label: 'Regular', color: 'bg-yellow-400', hover: 'hover:bg-yellow-500', text: 'text-yellow-500', desc: 'Algo de duda' },
  { value: 4, label: 'Fácil', color: 'bg-lime-500', hover: 'hover:bg-lime-600', text: 'text-lime-600', desc: 'Lo entendí bien' },
  { value: 5, label: 'Perfecto', color: 'bg-emerald-500', hover: 'hover:bg-emerald-600', text: 'text-emerald-500', desc: 'Memorizado' },
] as const;

// ── Pure Utilities ──

export function getMasteryStats(cards: Flashcard[]): MasteryStats {
  if (cards.length === 0) return { avg: 0, pct: 0, mastered: 0, learning: 0, newCards: 0 };

  let sum = 0;
  let mastered = 0;
  let learning = 0;
  let newCards = 0;

  for (const c of cards) {
    sum += c.mastery;
    if (c.mastery >= 4) mastered++;
    else if (c.mastery === 3) learning++;
    else newCards++;
  }

  const avg = sum / cards.length;
  return {
    avg,
    pct: (avg / 5) * 100,
    mastered,
    learning,
    newCards,
  };
}

export type MasteryFilter = 'all' | 'new' | 'learning' | 'mastered';

export function filterCardsByMastery(cards: Flashcard[], filter: MasteryFilter): Flashcard[] {
  switch (filter) {
    case 'new': return cards.filter(c => c.mastery <= 2);
    case 'learning': return cards.filter(c => c.mastery === 3);
    case 'mastered': return cards.filter(c => c.mastery >= 4);
    default: return cards;
  }
}