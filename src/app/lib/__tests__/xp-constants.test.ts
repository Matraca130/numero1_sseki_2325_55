// ============================================================
// Tests for xp-constants.ts — Client-side XP / level helpers
//
// Pure functions — no mocks. The values must mirror the backend
// xp-engine.ts exactly, so these tests act as a guard: if a
// constant changes accidentally, the suite fails loudly.
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  XP_TABLE,
  LEVEL_THRESHOLDS,
  LEVEL_NAMES,
  DAILY_CAP,
  AVG_READING_WPM,
  MAX_TIME_BASED_PROGRESS,
  READER_PAGE_KEY_PREFIX,
  calculateLevel,
  xpForNextLevel,
  xpForCurrentLevel,
  estimateReviewXP,
} from '@/app/lib/xp-constants';

describe('XP_TABLE', () => {
  it('exposes the expected base XP values', () => {
    expect(XP_TABLE.review_flashcard).toBe(5);
    expect(XP_TABLE.review_correct).toBe(10);
    expect(XP_TABLE.quiz_answer).toBe(5);
    expect(XP_TABLE.quiz_correct).toBe(15);
    expect(XP_TABLE.complete_session).toBe(25);
    expect(XP_TABLE.complete_plan).toBe(100);
  });
});

describe('LEVEL_THRESHOLDS', () => {
  it('is sorted descending by threshold', () => {
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      expect(LEVEL_THRESHOLDS[i - 1][0]).toBeGreaterThan(LEVEL_THRESHOLDS[i][0]);
    }
  });

  it('covers levels 2 through 12', () => {
    const levels = LEVEL_THRESHOLDS.map(([, lvl]) => lvl).sort((a, b) => a - b);
    expect(levels).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe('calculateLevel', () => {
  it('returns 1 for 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('returns 1 just below the level-2 threshold', () => {
    expect(calculateLevel(99)).toBe(1);
  });

  it('returns the correct level at each threshold boundary', () => {
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(300)).toBe(3);
    expect(calculateLevel(600)).toBe(4);
    expect(calculateLevel(1000)).toBe(5);
    expect(calculateLevel(1500)).toBe(6);
    expect(calculateLevel(2200)).toBe(7);
    expect(calculateLevel(3000)).toBe(8);
    expect(calculateLevel(4000)).toBe(9);
    expect(calculateLevel(5500)).toBe(10);
    expect(calculateLevel(7500)).toBe(11);
    expect(calculateLevel(10000)).toBe(12);
  });

  it('caps at level 12 for very high XP', () => {
    expect(calculateLevel(99999)).toBe(12);
  });

  it('returns the lower level just under each threshold', () => {
    expect(calculateLevel(299)).toBe(2);
    expect(calculateLevel(599)).toBe(3);
    expect(calculateLevel(9999)).toBe(11);
  });
});

describe('xpForNextLevel', () => {
  it('returns the threshold of the next level', () => {
    expect(xpForNextLevel(1)).toBe(100);
    expect(xpForNextLevel(2)).toBe(300);
    expect(xpForNextLevel(5)).toBe(1500);
    expect(xpForNextLevel(11)).toBe(10000);
  });

  it('returns the max threshold when already at max level', () => {
    // Level 12 has no "next" — function falls back to the highest threshold.
    expect(xpForNextLevel(12)).toBe(10000);
  });
});

describe('xpForCurrentLevel', () => {
  it('returns 0 for level 1 (no threshold defined)', () => {
    expect(xpForCurrentLevel(1)).toBe(0);
  });

  it('returns the matching threshold for a given level', () => {
    expect(xpForCurrentLevel(2)).toBe(100);
    expect(xpForCurrentLevel(7)).toBe(2200);
    expect(xpForCurrentLevel(12)).toBe(10000);
  });
});

describe('estimateReviewXP', () => {
  it('returns 5 (base only) for grade 1 — incorrect', () => {
    expect(estimateReviewXP(1)).toBe(5);
  });

  it('returns 5 (base only) for grade 2 — incorrect', () => {
    expect(estimateReviewXP(2)).toBe(5);
  });

  it('returns 15 (base + correct bonus) for grade 3', () => {
    expect(estimateReviewXP(3)).toBe(15);
  });

  it('returns 15 for grade 4', () => {
    expect(estimateReviewXP(4)).toBe(15);
  });

  it('returns 15 for grade 5', () => {
    expect(estimateReviewXP(5)).toBe(15);
  });
});

describe('LEVEL_NAMES', () => {
  it('has a name for every level 1..12', () => {
    for (let lvl = 1; lvl <= 12; lvl++) {
      expect(typeof LEVEL_NAMES[lvl]).toBe('string');
      expect(LEVEL_NAMES[lvl].length).toBeGreaterThan(0);
    }
  });
});

describe('miscellaneous constants', () => {
  it('DAILY_CAP is 500', () => {
    expect(DAILY_CAP).toBe(500);
  });

  it('AVG_READING_WPM is 200', () => {
    expect(AVG_READING_WPM).toBe(200);
  });

  it('MAX_TIME_BASED_PROGRESS is 0.9', () => {
    expect(MAX_TIME_BASED_PROGRESS).toBe(0.9);
  });

  it('READER_PAGE_KEY_PREFIX is the canonical localStorage prefix', () => {
    expect(READER_PAGE_KEY_PREFIX).toBe('axon-reader-page-');
  });
});
