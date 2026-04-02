// ============================================================
// Gamification helpers — runtime logic extracted from types/gamification.ts
// ============================================================

import { LEVEL_THRESHOLDS } from '@/app/types/gamification';

export function getLevelInfo(totalXP: number) {
  let current = LEVEL_THRESHOLDS[0];
  let next = LEVEL_THRESHOLDS[1] ?? null;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i].xp) {
      current = LEVEL_THRESHOLDS[i];
      next = LEVEL_THRESHOLDS[i + 1] ?? null;
      break;
    }
  }

  const xpInLevel = totalXP - current.xp;
  const xpForNext = next ? next.xp - current.xp : 0;
  const progress = next ? Math.min(1, xpInLevel / xpForNext) : 1;

  return { ...current, next, xpInLevel, xpForNext, progress };
}
