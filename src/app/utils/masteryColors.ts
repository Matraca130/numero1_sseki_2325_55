// ============================================================
// Axon — Mastery Color Helpers (shared across Wizard, Mastery, etc.)
//
// Consolidates the repeated >=70 emerald / >=40 amber / else red/orange
// pattern used for mastery percentage styling.
// ============================================================

type MasteryTier = 'high' | 'mid' | 'low' | 'none';

/** Determine mastery tier from a 0-100 percentage */
export function masteryTier(pct: number): MasteryTier {
  if (pct >= 70) return 'high';
  if (pct >= 40) return 'mid';
  if (pct > 0) return 'low';
  return 'none';
}

// ── Text colors ──
const TEXT_MAP: Record<MasteryTier, string> = {
  high: 'text-emerald-500',
  mid: 'text-amber-500',
  low: 'text-orange-500',
  none: 'text-gray-400',
};

export function masteryTextColor(pct: number): string {
  return TEXT_MAP[masteryTier(pct)];
}

// ── Inline text (slightly different shade, used in topic lists) ──
const INLINE_TEXT_MAP: Record<MasteryTier, string> = {
  high: 'text-emerald-600',
  mid: 'text-amber-600',
  low: 'text-red-600',
  none: 'text-gray-400',
};

export function masteryInlineTextColor(pct: number): string {
  return INLINE_TEXT_MAP[masteryTier(pct)];
}

// ── Progress bar fill ──
const BAR_MAP: Record<MasteryTier, string> = {
  high: 'bg-emerald-400',
  mid: 'bg-amber-400',
  low: 'bg-teal-400',
  none: 'bg-gray-200',
};

export function masteryBarColor(pct: number): string {
  return BAR_MAP[masteryTier(pct)];
}

// ── Badge pill (bg + text) ──
const BADGE_MAP: Record<MasteryTier, string> = {
  high: 'bg-emerald-100 text-emerald-700',
  mid: 'bg-amber-100 text-amber-700',
  low: 'bg-red-100 text-red-700',
  none: 'bg-gray-100 text-gray-500',
};

export function masteryBadgeClasses(pct: number): string {
  return BADGE_MAP[masteryTier(pct)];
}

// ── Dot indicator ──
const DOT_MAP: Record<MasteryTier, string> = {
  high: 'bg-emerald-400',
  mid: 'bg-amber-400',
  low: 'bg-red-400',
  none: 'bg-teal-400',
};

export function masteryDotColor(pct: number, hasData: boolean = true): string {
  return hasData ? DOT_MAP[masteryTier(pct)] : 'bg-teal-400';
}

// ── Surface (card bg + border) ──
const SURFACE_MAP: Record<MasteryTier, string> = {
  high: 'bg-emerald-50 border-emerald-200',
  mid: 'bg-amber-50 border-amber-200',
  low: 'bg-red-50 border-red-200',
  none: 'bg-gray-50 border-gray-200',
};

export function masterySurfaceClasses(pct: number): string {
  return SURFACE_MAP[masteryTier(pct)];
}

// ── Icon container (used in banners) ──
const ICON_BOX_MAP: Record<MasteryTier, string> = {
  high: 'bg-emerald-100 text-emerald-600',
  mid: 'bg-amber-100 text-amber-600',
  low: 'bg-red-100 text-red-600',
  none: 'bg-gray-100 text-gray-500',
};

export function masteryIconBoxClasses(pct: number): string {
  return ICON_BOX_MAP[masteryTier(pct)];
}
