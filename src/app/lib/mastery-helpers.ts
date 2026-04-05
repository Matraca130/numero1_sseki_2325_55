// ============================================================
// Axon — Mastery Helper Functions
//
// Reads BKT data (written by Quiz and Flashcard agents) and
// returns visual mastery colors/labels using the Delta Mastery Scale.
//
// Keyword mastery = AVG(subtopics BKT p_know)
// Delta = mastery / threshold (threshold depends on clinical_priority)
//
// Delta Mastery Scale:
//   gray   — Por descubrir (no data or delta < 0.50)
//   red    — Emergente (delta >= 0.50)
//   yellow — En progreso (delta >= 0.85)
//   green  — Consolidado (delta >= 1.00)
//   blue   — Maestria (delta >= 1.10)
// ============================================================

import { colors } from '@/app/design-system/colors';

export interface BktState {
  id?: string;
  student_id?: string;
  subtopic_id: string;
  p_know: number;
  p_transit?: number;
  p_slip?: number;
  p_guess?: number;
  delta?: number;
  total_attempts: number;
  correct_attempts?: number;
  last_attempt_at?: string | null;
}

/**
 * Returns average p_know for a keyword's subtopics.
 * -1 = no data available.
 */
export function getKeywordMastery(subtopicBkts: BktState[]): number {
  if (subtopicBkts.length === 0) return -1;
  const sum = subtopicBkts.reduce((acc, s) => acc + s.p_know, 0);
  return sum / subtopicBkts.length;
}

// ============================================================
// Spec v4.2 section 6.2 — Relative Delta Color Scale
//
// Instead of absolute mastery thresholds, colors are based on
// delta = displayMastery / threshold, where threshold depends
// on clinical_priority (0.0-1.0).
//
// Priority mapping (API sends integer 1-3):
//   1 (low)    -> clinicalPriority 0.0 -> threshold 0.70
//   2 (medium) -> clinicalPriority 0.5 -> threshold 0.80
//   3 (high)   -> clinicalPriority 1.0 -> threshold 0.90
//
// Delta levels (unified):
//   >= 1.10  -> blue   (Maestria)
//   >= 1.00  -> green  (Consolidado)
//   >= 0.85  -> yellow (En progreso)
//   >= 0.50  -> red    (Emergente)
//   <  0.50  -> gray   (Por descubrir)
// ============================================================

/**
 * Compute the domination threshold from a clinical priority [0.0-1.0].
 * Linear interpolation: priority 0.0 -> 0.70, priority 1.0 -> 0.90.
 */
export function getDominationThreshold(clinicalPriority: number): number {
  return 0.70 + clinicalPriority * 0.20;
}

export type DeltaColorLevel = 'gray' | 'red' | 'yellow' | 'green' | 'blue';

/**
 * Compute the delta color level from a display mastery and threshold.
 * delta = displayMastery / threshold.
 */
export function getDeltaColor(displayMastery: number, threshold: number): DeltaColorLevel {
  const rawDelta = threshold > 0 ? displayMastery / threshold : 0;
  const delta = Math.round(rawDelta * 100) / 100; // Round to 2 decimals to avoid floating-point boundary errors
  if (delta >= 1.10) return 'blue';     // Maestria
  if (delta >= 1.00) return 'green';    // Consolidado
  if (delta >= 0.85) return 'yellow';   // En progreso
  if (delta >= 0.50) return 'red';      // Emergente
  return 'gray';                         // Por descubrir
}

/**
 * Map a DeltaColorLevel to Tailwind CSS classes.
 */
export function getDeltaColorClasses(level: DeltaColorLevel): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  bgLight: string;
  hoverBg: string;
  ring: string;
  hex: string;
} {
  const map: Record<DeltaColorLevel, {
    bg: string; text: string; border: string; dot: string;
    bgLight: string; hoverBg: string; ring: string; hex: string;
  }> = {
    // Hex values sourced from the canonical Delta Mastery Scale (colors.mastery)
    gray:   { bg: 'bg-zinc-50',    text: 'text-zinc-500',    border: 'border-zinc-300',    dot: 'bg-zinc-400',    bgLight: 'bg-zinc-100/60',    hoverBg: 'hover:bg-zinc-200/80',    ring: 'ring-zinc-400',    hex: colors.mastery.descubrir },
    red:    { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-300',     dot: 'bg-red-500',     bgLight: 'bg-red-100/60',     hoverBg: 'hover:bg-red-200/80',     ring: 'ring-red-500',     hex: colors.mastery.emergente },
    yellow: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-300',   dot: 'bg-amber-500',   bgLight: 'bg-amber-100/60',   hoverBg: 'hover:bg-amber-200/80',   ring: 'ring-amber-500',   hex: colors.mastery.enProgreso },
    green:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500', bgLight: 'bg-emerald-100/60', hoverBg: 'hover:bg-emerald-200/80', ring: 'ring-emerald-500', hex: colors.mastery.consolidado },
    blue:   { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-300',    dot: 'bg-blue-500',    bgLight: 'bg-blue-100/60',    hoverBg: 'hover:bg-blue-200/80',    ring: 'ring-blue-500',    hex: colors.mastery.maestria },
  };
  return map[level];
}

/**
 * Spanish label for a DeltaColorLevel.
 */
export function getDeltaColorLabel(level: DeltaColorLevel): string {
  const labels: Record<DeltaColorLevel, string> = {
    gray: 'Por descubrir',
    red: 'Emergente',
    yellow: 'En progreso',
    green: 'Consolidado',
    blue: 'Maestría',
  };
  return labels[level];
}

/**
 * Convenience wrapper for keyword-level delta color.
 *
 * The API returns priority as an integer 1-3:
 *   1 (low)    -> clinicalPriority 0.0
 *   2 (medium) -> clinicalPriority 0.5
 *   3 (high)   -> clinicalPriority 1.0
 *
 * @param mastery - keyword mastery [0-1]
 * @param priority - professor-assigned priority (integer 1-3, defaults to 1)
 */
export function getKeywordDeltaColor(mastery: number, priority: number = 1): DeltaColorLevel {
  const clinicalPriority = Math.max(0, Math.min(1, (priority - 1) / 2));
  const threshold = getDominationThreshold(clinicalPriority);
  return getDeltaColor(mastery, threshold);
}

/**
 * Safe wrapper for keyword-level delta color that handles null / no-data sentinels.
 * Returns 'gray' for null or negative mastery values.
 *
 * @param mastery - keyword mastery [0-1], or null/-1 for no data
 * @param priority - professor-assigned priority (integer 1-3, defaults to 1)
 */
export function getKeywordDeltaColorSafe(mastery: number | null, priority: number = 1): DeltaColorLevel {
  if (mastery === null || mastery < 0) return 'gray';
  return getKeywordDeltaColor(mastery, priority);
}
