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
