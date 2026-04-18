// ============================================================
// Axon -- Tests for xp-constants.ts
//
// Client-side mirror of backend xp-engine.ts.
// Pure functions + constants — no mocks required.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  XP_TABLE,
  LEVEL_THRESHOLDS,
  DAILY_CAP,
  LEVEL_NAMES,
  AVG_READING_WPM,
  MAX_TIME_BASED_PROGRESS,
  READER_PAGE_KEY_PREFIX,
  calculateLevel,
  xpForNextLevel,
  xpForCurrentLevel,
  estimateReviewXP,
} from '@/app/lib/xp-constants';

describe('XP_TABLE constants', () => {
  it('exposes review_flashcard = 5', () => {
    expect(XP_TABLE.review_flashcard).toBe(5);
  });

  it('exposes review_correct = 10', () => {
    expect(XP_TABLE.review_correct).toBe(10);
  });

  it('exposes quiz_correct = 15', () => {
    expect(XP_TABLE.quiz_correct).toBe(15);
  });

  it('exposes complete_plan = 100', () => {
    expect(XP_TABLE.complete_plan).toBe(100);
  });

  it('exposes complete_session = 25', () => {
    expect(XP_TABLE.complete_session).toBe(25);
  });
});

describe('constants', () => {
  it('DAILY_CAP is 500', () => {
    expect(DAILY_CAP).toBe(500);
  });

  it('AVG_READING_WPM is 200', () => {
    expect(AVG_READING_WPM).toBe(200);
  });

  it('MAX_TIME_BASED_PROGRESS caps at 0.9', () => {
    expect(MAX_TIME_BASED_PROGRESS).toBe(0.9);
  });

  it('READER_PAGE_KEY_PREFIX starts with axon-', () => {
    expect(READER_PAGE_KEY_PREFIX).toMatch(/^axon-/);
  });
});

describe('LEVEL_THRESHOLDS', () => {
  it('is sorted descending by threshold (largest first)', () => {
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i += 1) {
      expect(LEVEL_THRESHOLDS[i][0]).toBeLessThan(LEVEL_THRESHOLDS[i - 1][0]);
    }
  });

  it('covers levels 2-12', () => {
    const levels = LEVEL_THRESHOLDS.map(([, lvl]) => lvl).sort((a, b) => a - b);
    expect(levels).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe('calculateLevel', () => {
  it('returns 1 for 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('returns 1 for XP below 100', () => {
    expect(calculateLevel(99)).toBe(1);
  });

  it('returns 2 at exactly 100 XP', () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it('returns 3 at 300 XP', () => {
    expect(calculateLevel(300)).toBe(3);
  });

  it('returns 5 at 1000 XP', () => {
    expect(calculateLevel(1000)).toBe(5);
  });

  it('returns 12 at 10000+ XP (max level)', () => {
    expect(calculateLevel(10000)).toBe(12);
    expect(calculateLevel(999999)).toBe(12);
  });

  it('returns lower level when just below a threshold', () => {
    expect(calculateLevel(9999)).toBe(11);
    expect(calculateLevel(7499)).toBe(10);
  });
});

describe('xpForNextLevel', () => {
  it('returns 100 for level 1 (next is level 2)', () => {
    expect(xpForNextLevel(1)).toBe(100);
  });

  it('returns 300 for level 2 (next is level 3)', () => {
    expect(xpForNextLevel(2)).toBe(300);
  });

  it('returns 10000 for level 11 (next is level 12)', () => {
    expect(xpForNextLevel(11)).toBe(10000);
  });

  it('returns the max threshold when already at top (level 12)', () => {
    expect(xpForNextLevel(12)).toBe(10000);
  });
});

describe('xpForCurrentLevel', () => {
  it('returns 0 for level 1', () => {
    expect(xpForCurrentLevel(1)).toBe(0);
  });

  it('returns 100 for level 2', () => {
    expect(xpForCurrentLevel(2)).toBe(100);
  });

  it('returns 10000 for level 12', () => {
    expect(xpForCurrentLevel(12)).toBe(10000);
  });

  it('returns 0 for an unknown level', () => {
    expect(xpForCurrentLevel(99)).toBe(0);
  });
});

describe('estimateReviewXP', () => {
  it('returns base 5 XP for grade 0 (fail)', () => {
    expect(estimateReviewXP(0)).toBe(5);
  });

  it('returns base 5 XP for grade 1', () => {
    expect(estimateReviewXP(1)).toBe(5);
  });

  it('returns base 5 XP for grade 2', () => {
    expect(estimateReviewXP(2)).toBe(5);
  });

  it('returns 5+10=15 XP for grade 3', () => {
    expect(estimateReviewXP(3)).toBe(15);
  });

  it('returns 15 XP for grade 4', () => {
    expect(estimateReviewXP(4)).toBe(15);
  });

  it('returns 15 XP for grade 5', () => {
    expect(estimateReviewXP(5)).toBe(15);
  });
});

describe('LEVEL_NAMES', () => {
  it('has entries for levels 1 through 12', () => {
    for (let l = 1; l <= 12; l += 1) {
      expect(typeof LEVEL_NAMES[l]).toBe('string');
      expect(LEVEL_NAMES[l].length).toBeGreaterThan(0);
    }
  });

  it('level 1 is "Novato"', () => {
    expect(LEVEL_NAMES[1]).toBe('Novato');
  });

  it('level 12 is "Iluminado"', () => {
    expect(LEVEL_NAMES[12]).toBe('Iluminado');
  });
});
