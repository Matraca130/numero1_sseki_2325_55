// ============================================================
// Axon — Client-side XP Constants (mirror of backend xp-engine.ts)
//
// Used for OPTIMISTIC UI during flashcard sessions.
// The backend is the source of truth. These values are used
// to show instant feedback (+XP popups) without waiting for
// network responses.
//
// KEEP IN SYNC with backend xp-engine.ts.
// ============================================================

/** XP values per action — mirror of backend XP_TABLE */
export const XP_TABLE: Record<string, number> = {
  review_flashcard: 5,
  review_correct: 10,
  quiz_answer: 5,
  quiz_correct: 15,
  complete_session: 25,
  complete_reading: 30,
  complete_video: 20,
  streak_daily: 15,
  complete_plan_task: 15,
  complete_plan: 100,
  rag_question: 5,
};

/** Level thresholds — mirror of backend LEVEL_THRESHOLDS */
export const LEVEL_THRESHOLDS: [number, number][] = [
  [10000, 12],
  [7500, 11],
  [5500, 10],
  [4000, 9],
  [3000, 8],
  [2200, 7],
  [1500, 6],
  [1000, 5],
  [600, 4],
  [300, 3],
  [100, 2],
];

/** Daily XP cap */
export const DAILY_CAP = 500;

/** Calculate level from total XP */
export function calculateLevel(totalXp: number): number {
  for (const [threshold, level] of LEVEL_THRESHOLDS) {
    if (totalXp >= threshold) return level;
  }
  return 1;
}

/** Get XP needed for next level */
export function xpForNextLevel(currentLevel: number): number {
  // Find the threshold for (currentLevel + 1)
  for (const [threshold, level] of LEVEL_THRESHOLDS) {
    if (level === currentLevel + 1) return threshold;
  }
  // Already max level
  return LEVEL_THRESHOLDS[0][0];
}

/** Get XP threshold for current level */
export function xpForCurrentLevel(currentLevel: number): number {
  for (const [threshold, level] of LEVEL_THRESHOLDS) {
    if (level === currentLevel) return threshold;
  }
  return 0;
}

/** Level names for display */
export const LEVEL_NAMES: Record<number, string> = {
  1: 'Novato',
  2: 'Aprendiz',
  3: 'Estudiante',
  4: 'Practicante',
  5: 'Conocedor',
  6: 'Avanzado',
  7: 'Experto',
  8: 'Maestro',
  9: 'Sabio',
  10: 'Erudito',
  11: 'Leyenda',
  12: 'Iluminado',
};

/**
 * Calculate optimistic XP for a single flashcard review.
 * Returns the base XP (without server-side bonuses like variable reward).
 */
export function estimateReviewXP(grade: number): number {
  let xp = XP_TABLE.review_flashcard; // 5 XP for any review
  if (grade >= 3) {
    xp += XP_TABLE.review_correct; // +10 XP for correct (grade >= 3)
  }
  return xp;
}
