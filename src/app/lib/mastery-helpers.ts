// ============================================================
// Axon — Mastery Helper Functions
//
// Reads BKT data (written by Quiz and Flashcard agents) and
// returns visual mastery colors/labels.
//
// Keyword mastery = AVG(subtopics BKT p_know)
//   🟢 >= 0.80 (Dominado)
//   🟡 >= 0.50 (Aprendiendo)
//   🔴 <  0.50 (Debil)
//   ⚪ sin datos (gray)
// ============================================================

export type MasteryColor = 'green' | 'yellow' | 'red' | 'gray';

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

export function getMasteryColor(pKnow: number): MasteryColor {
  if (pKnow >= 0.80) return 'green';
  if (pKnow >= 0.50) return 'yellow';
  return 'red';
}

/**
 * M-6 FIX: Safe mastery color that handles the -1 (no data) sentinel.
 * Eliminates the duplicated `mastery < 0 ? 'gray' : getMasteryColor(mastery)`
 * pattern across 5+ files.
 */
export function getSafeMasteryColor(mastery: number): MasteryColor {
  return mastery < 0 ? 'gray' : getMasteryColor(mastery);
}

export function getMasteryLabel(color: MasteryColor): string {
  switch (color) {
    case 'green':  return 'Dominado';
    case 'yellow': return 'Aprendiendo';
    case 'red':    return 'Debil';
    case 'gray':   return 'Sin datos';
  }
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

/**
 * Tailwind classes for each mastery color.
 */
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
// Delta levels:
//   >= 1.10  -> blue   (Superado — con buffer)
//   >= 1.00  -> green  (Dominado — meta alcanzada)
//   >= 0.85  -> yellow (Proximo — casi listo)
//   >= 0.50  -> orange (Insuficiente)
//   <  0.50  -> red    (Critico)
// ============================================================

/**
 * Compute the domination threshold from a clinical priority [0.0-1.0].
 * Linear interpolation: priority 0.0 -> 0.70, priority 1.0 -> 0.90.
 */
export function getDominationThreshold(clinicalPriority: number): number {
  return 0.70 + clinicalPriority * 0.20;
}

export type DeltaColorLevel = 'red' | 'orange' | 'yellow' | 'green' | 'blue';

/**
 * Compute the delta color level from a display mastery and threshold.
 * delta = displayMastery / threshold.
 */
export function getDeltaColor(displayMastery: number, threshold: number): DeltaColorLevel {
  const delta = threshold > 0 ? displayMastery / threshold : 0;
  if (delta >= 1.10) return 'blue';     // Superado — con buffer
  if (delta >= 1.00) return 'green';    // Dominado — meta alcanzada
  if (delta >= 0.85) return 'yellow';   // Proximo — casi listo
  if (delta >= 0.50) return 'orange';   // Insuficiente
  return 'red';                          // Critico
}

/**
 * Map a DeltaColorLevel to Tailwind CSS classes.
 */
export function getDeltaColorClasses(level: DeltaColorLevel): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const map: Record<DeltaColorLevel, { bg: string; text: string; border: string; dot: string }> = {
    red:    { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-300',     dot: 'bg-red-500' },
    orange: { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-300',  dot: 'bg-orange-500' },
    yellow: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-300',   dot: 'bg-amber-500' },
    green:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500' },
    blue:   { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-300',    dot: 'bg-blue-500' },
  };
  return map[level];
}

/**
 * Spanish label for a DeltaColorLevel.
 */
export function getDeltaColorLabel(level: DeltaColorLevel): string {
  const labels: Record<DeltaColorLevel, string> = {
    red: 'Critico',
    orange: 'Insuficiente',
    yellow: 'Proximo',
    green: 'Dominado',
    blue: 'Superado',
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

export function getMasteryTailwind(color: MasteryColor): {
  bg: string;
  text: string;
  ring: string;
  bgLight: string;
  textDark: string;
} {
  switch (color) {
    case 'green':
      return {
        bg: 'bg-emerald-500',
        text: 'text-emerald-500',
        ring: 'ring-emerald-500',
        bgLight: 'bg-emerald-500/20',
        textDark: 'text-emerald-400',
      };
    case 'yellow':
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-500',
        ring: 'ring-amber-500',
        bgLight: 'bg-amber-500/20',
        textDark: 'text-amber-400',
      };
    case 'red':
      return {
        bg: 'bg-red-500',
        text: 'text-red-500',
        ring: 'ring-red-500',
        bgLight: 'bg-red-500/20',
        textDark: 'text-red-400',
      };
    case 'gray':
      return {
        bg: 'bg-zinc-400',
        text: 'text-zinc-400',
        ring: 'ring-zinc-400',
        bgLight: 'bg-zinc-500/20',
        textDark: 'text-zinc-500',
      };
  }
}