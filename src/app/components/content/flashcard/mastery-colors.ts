// ============================================================
// Mastery Colors \u2014 Single Source of Truth
//
// Centralizes ALL color decisions for mastery levels (0-5).
// Every flashcard component imports from here instead of
// hardcoding teal/emerald/rose individually.
//
// DESIGN:
//   - 6 static objects (zero allocation at runtime)
//   - getMasteryColor() is O(1) Record lookup
//   - Safe against undefined, NaN, negatives, >5
//   - DOT_COLORS[0..4] maps to mastery levels 1-5 for
//     the 5-dot progress indicator on FlashcardMiniCard
//
// COLOR SCHEME (5 colors + 1 base):
//   0 = Slate   \u2192 nueva / sin estudiar
//   1 = Rose    \u2192 critico (coincide con RATINGS[1])
//   2 = Orange  \u2192 dificil (coincide con RATINGS[2])
//   3 = Amber   \u2192 medio   (coincide con RATINGS[3])
//   4 = Teal    \u2192 bien    (identidad Axon)
//   5 = Emerald \u2192 dominada (coincide con RATINGS[5])
//
// MIGRATION HISTORY (Mastery Dynamic Colors \u2014 10 phases):
//   Phase 0: Created mastery-colors.ts (this file) as single source of truth
//   Phase 1: FlashcardMiniCard \u2014 accent bar, number badge, dots
//   Phase 2: Extracted ProgressBar + MasteryRing primitives, DeckScreen cleanup
//   Phase 3: SessionScreen progress bar, SpeedometerGauge, SummaryScreen ring + CTA
//   Phase 4: DeckList deck cards + SectionScreen \u2014 per-entity mastery colors
//   Phase 5: DeckScreen header CTA + new-cards indicator
//   Phase 6: Hardened ProgressBar default (bg-zinc-400) + MasteryRing default (MASTERY_HEX_SCALE[0])
//   Phase 7: Cross-module audit \u2014 0 mastery-teal found outside flashcard/
//   Phase 8: Polish \u2014 dynamic boxShadow (SummaryScreen, DeckList), transition-colors (MiniCard)
//   Phase 9: Documentation \u2014 header comments updated across all module files
// ============================================================

// \u2500\u2500 Types \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export interface MasteryColorSet {
  /** Mastery level 0-5 */
  level: 0 | 1 | 2 | 3 | 4 | 5;
  /** Hex color for SVG stroke, inline styles \u2014 e.g. '#f43f5e' */
  hex: string;
  /** Tailwind bg class for accent bars \u2014 e.g. 'bg-rose-500' */
  accent: string;
  /** Tailwind bg class for light backgrounds \u2014 e.g. 'bg-rose-50' */
  accentLight: string;
  /** Tailwind bg class for dots/indicators \u2014 e.g. 'bg-rose-500' */
  dot: string;
  /** Tailwind text class for labels \u2014 e.g. 'text-rose-600' */
  text: string;
  /** Tailwind border class \u2014 e.g. 'border-rose-300' */
  border: string;
  /** Tailwind hover bg class \u2014 e.g. 'hover:bg-rose-600' */
  hoverAccent: string;
  /** Human-readable label (Spanish) */
  label: string;
}

// \u2500\u2500 Static color sets (ZERO runtime allocation) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const SLATE: MasteryColorSet = {
  level: 0,
  hex: '#94a3b8',
  accent: 'bg-slate-400',
  accentLight: 'bg-slate-50',
  dot: 'bg-slate-400',
  text: 'text-slate-500',
  border: 'border-slate-300',
  hoverAccent: 'hover:bg-slate-500',
  label: 'Nueva',
} as const;

const ROSE: MasteryColorSet = {
  level: 1,
  hex: '#f43f5e',
  accent: 'bg-rose-500',
  accentLight: 'bg-rose-50',
  dot: 'bg-rose-500',
  text: 'text-rose-600',
  border: 'border-rose-300',
  hoverAccent: 'hover:bg-rose-600',
  label: 'No sabe',
} as const;

const ORANGE: MasteryColorSet = {
  level: 2,
  hex: '#f97316',
  accent: 'bg-orange-500',
  accentLight: 'bg-orange-50',
  dot: 'bg-orange-500',
  text: 'text-orange-600',
  border: 'border-orange-300',
  hoverAccent: 'hover:bg-orange-600',
  label: 'Dificil',
} as const;

const AMBER: MasteryColorSet = {
  level: 3,
  hex: '#f59e0b',
  accent: 'bg-amber-500',
  accentLight: 'bg-amber-50',
  dot: 'bg-amber-500',
  text: 'text-amber-600',
  border: 'border-amber-300',
  hoverAccent: 'hover:bg-amber-600',
  label: 'En progreso',
} as const;

const TEAL: MasteryColorSet = {
  level: 4,
  hex: '#2a8c7a',
  accent: 'bg-[#2a8c7a]',
  accentLight: 'bg-[#e6f5f1]',
  dot: 'bg-[#2a8c7a]',
  text: 'text-[#2a8c7a]',
  border: 'border-[#2a8c7a]/30',
  hoverAccent: 'hover:bg-[#244e47]',
  label: 'Bien',
} as const;

const EMERALD: MasteryColorSet = {
  level: 5,
  hex: '#10b981',
  accent: 'bg-emerald-500',
  accentLight: 'bg-emerald-50',
  dot: 'bg-emerald-500',
  text: 'text-emerald-600',
  border: 'border-emerald-300',
  hoverAccent: 'hover:bg-emerald-600',
  label: 'Dominada',
} as const;

// \u2500\u2500 Lookup table \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const MASTERY_COLORS: Record<number, MasteryColorSet> = {
  0: SLATE,
  1: ROSE,
  2: ORANGE,
  3: AMBER,
  4: TEAL,
  5: EMERALD,
};

// \u2500\u2500 Public API \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

/**
 * Get the color set for a discrete mastery level (0-5).
 *
 * Safe against: undefined, NaN, Infinity, negatives, >5.
 * Always returns a valid MasteryColorSet (defaults to SLATE).
 */
export function getMasteryColor(mastery: number | undefined | null): MasteryColorSet {
  if (mastery == null || !Number.isFinite(mastery)) return SLATE;
  const clamped = Math.max(0, Math.min(5, Math.round(mastery)));
  return MASTERY_COLORS[clamped] ?? SLATE;
}

/**
 * Get the color set for a 0-1 ratio (e.g. masteredCards / totalCards).
 *
 * Thresholds align with pKnowToMastery() in useFlashcardNavigation:
 *   >=0.90 \u2192 5 (emerald)
 *   >=0.75 \u2192 4 (teal)
 *   >=0.60 \u2192 3 (amber)
 *   >=0.40 \u2192 2 (orange)
 *   >=0.20 \u2192 1 (rose)
 *   < 0.20 \u2192 0 (slate)
 */
export function getMasteryColorFromPct(ratio: number): MasteryColorSet {
  if (ratio >= 0.90) return EMERALD;
  if (ratio >= 0.75) return TEAL;
  if (ratio >= 0.60) return AMBER;
  if (ratio >= 0.40) return ORANGE;
  if (ratio >= 0.20) return ROSE;
  return SLATE;
}

/**
 * Dot colors for the 5-dot progress indicator.
 * Index 0 = dot for mastery 1 (rose), ..., index 4 = dot for mastery 5 (emerald).
 *
 * Usage: dots[i] is "filled" if `i < card.mastery`, using DOT_COLORS[i].
 *        dots[i] is "empty" (gray) if `i >= card.mastery`.
 */
export const DOT_COLORS: readonly MasteryColorSet[] = [
  ROSE,    // dot 1 \u2014 mastery 1
  ORANGE,  // dot 2 \u2014 mastery 2
  AMBER,   // dot 3 \u2014 mastery 3
  TEAL,    // dot 4 \u2014 mastery 4
  EMERALD, // dot 5 \u2014 mastery 5
] as const;

/**
 * Flat hex array for quick SVG/inline usage.
 * Index = mastery level (0-5).
 */
export const MASTERY_HEX_SCALE: readonly string[] = [
  '#94a3b8', // 0 \u2014 slate
  '#f43f5e', // 1 \u2014 rose
  '#f97316', // 2 \u2014 orange
  '#f59e0b', // 3 \u2014 amber
  '#2a8c7a', // 4 \u2014 teal
  '#10b981', // 5 \u2014 emerald
] as const;

// \u2500\u2500 v4.2: Server mastery_color \u2192 MasteryColorSet \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Maps the 6-value string returned by get_study_queue RPC
// to our local color system.

const BLUE: MasteryColorSet = {
  level: 5,
  hex: '#3b82f6',
  accent: 'bg-blue-500',
  accentLight: 'bg-blue-50',
  dot: 'bg-blue-500',
  text: 'text-blue-600',
  border: 'border-blue-300',
  hoverAccent: 'hover:bg-blue-600',
  label: 'Superada',
} as const;

/**
 * Map server mastery_color string to MasteryColorSet.
 *
 * Server returns: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'gray'
 * Uses 5-color scale with relative \u0394 (\u00A76.2).
 */
export function getMasteryColorFromServer(
  color: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'gray' | string,
): MasteryColorSet {
  switch (color) {
    case 'blue':   return BLUE;
    case 'green':  return EMERALD;
    case 'yellow': return AMBER;
    case 'orange': return ORANGE;
    case 'red':    return ROSE;
    case 'gray':   return SLATE;
    default:       return SLATE;
  }
}
