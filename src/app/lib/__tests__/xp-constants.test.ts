// ============================================================
// TEST: xp-constants.ts — Gamification XP system
//
// These values must stay in sync with backend xp-engine.ts.
// Tests catch drift between frontend optimistic UI and backend truth.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  XP_TABLE,
  LEVEL_THRESHOLDS,
  DAILY_CAP,
  LEVEL_NAMES,
  calculateLevel,
  xpForNextLevel,
  xpForCurrentLevel,
  estimateReviewXP,
} from '../xp-constants';

// ── Constants integrity ───────────────────────────────────

describe('XP_TABLE', () => {
  it('should have review_flashcard = 5', () => {
    expect(XP_TABLE.review_flashcard).toBe(5);
  });

  it('should have review_correct = 10', () => {
    expect(XP_TABLE.review_correct).toBe(10);
  });

  it('should have complete_session = 25', () => {
    expect(XP_TABLE.complete_session).toBe(25);
  });

  it('should have at least 8 action types', () => {
    expect(Object.keys(XP_TABLE).length).toBeGreaterThanOrEqual(8);
  });

  it('all XP values should be positive integers', () => {
    for (const [key, val] of Object.entries(XP_TABLE)) {
      expect(val, `XP_TABLE.${key}`).toBeGreaterThan(0);
      expect(Number.isInteger(val), `XP_TABLE.${key} should be integer`).toBe(true);
    }
  });
});

describe('DAILY_CAP', () => {
  it('should be 500', () => {
    expect(DAILY_CAP).toBe(500);
  });
});

describe('LEVEL_THRESHOLDS', () => {
  it('should be sorted descending by XP', () => {
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      expect(
        LEVEL_THRESHOLDS[i - 1][0],
        `threshold[${i-1}] should be > threshold[${i}]`,
      ).toBeGreaterThan(LEVEL_THRESHOLDS[i][0]);
    }
  });

  it('should have levels sorted descending', () => {
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      expect(LEVEL_THRESHOLDS[i - 1][1]).toBeGreaterThan(LEVEL_THRESHOLDS[i][1]);
    }
  });

  it('max level should be 12', () => {
    expect(LEVEL_THRESHOLDS[0][1]).toBe(12);
  });

  it('min level in table should be 2', () => {
    expect(LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1][1]).toBe(2);
  });
});

describe('LEVEL_NAMES', () => {
  it('should have names for levels 1-12', () => {
    for (let level = 1; level <= 12; level++) {
      expect(LEVEL_NAMES[level], `missing name for level ${level}`).toBeTruthy();
    }
  });

  it('level 1 = Novato', () => {
    expect(LEVEL_NAMES[1]).toBe('Novato');
  });

  it('level 12 = Iluminado', () => {
    expect(LEVEL_NAMES[12]).toBe('Iluminado');
  });
});

// ── calculateLevel ────────────────────────────────────────

describe('calculateLevel', () => {
  it('0 XP → level 1', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('99 XP → level 1 (below first threshold)', () => {
    expect(calculateLevel(99)).toBe(1);
  });

  it('100 XP → level 2', () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it('300 XP → level 3', () => {
    expect(calculateLevel(300)).toBe(3);
  });

  it('10000 XP → level 12 (max)', () => {
    expect(calculateLevel(10000)).toBe(12);
  });

  it('99999 XP → level 12 (above max threshold)', () => {
    expect(calculateLevel(99999)).toBe(12);
  });

  it('boundary: 599 → level 3, 600 → level 4', () => {
    expect(calculateLevel(599)).toBe(3);
    expect(calculateLevel(600)).toBe(4);
  });

  it('should be monotonically non-decreasing', () => {
    let prevLevel = 0;
    for (let xp = 0; xp <= 15000; xp += 100) {
      const level = calculateLevel(xp);
      expect(level, `level at ${xp} XP`).toBeGreaterThanOrEqual(prevLevel);
      prevLevel = level;
    }
  });
});

// ── xpForNextLevel / xpForCurrentLevel ────────────────────

describe('xpForNextLevel', () => {
  it('level 1 → 100 (threshold for level 2)', () => {
    expect(xpForNextLevel(1)).toBe(100);
  });

  it('level 11 → 10000 (threshold for level 12)', () => {
    expect(xpForNextLevel(11)).toBe(10000);
  });

  it('level 12 (max) → returns max threshold', () => {
    // Already at max, returns highest threshold
    expect(xpForNextLevel(12)).toBe(10000);
  });
});

describe('xpForCurrentLevel', () => {
  it('level 1 → 0 (no threshold)', () => {
    expect(xpForCurrentLevel(1)).toBe(0);
  });

  it('level 2 → 100', () => {
    expect(xpForCurrentLevel(2)).toBe(100);
  });

  it('level 12 → 10000', () => {
    expect(xpForCurrentLevel(12)).toBe(10000);
  });
});

// ── estimateReviewXP ──────────────────────────────────────

describe('estimateReviewXP', () => {
  it('grade < 3 (incorrect) → base XP only (5)', () => {
    expect(estimateReviewXP(1)).toBe(5);
    expect(estimateReviewXP(2)).toBe(5);
  });

  it('grade >= 3 (correct) → base + bonus (5 + 10 = 15)', () => {
    expect(estimateReviewXP(3)).toBe(15);
    expect(estimateReviewXP(4)).toBe(15);
    expect(estimateReviewXP(5)).toBe(15);
  });

  it('correct review XP = review_flashcard + review_correct', () => {
    expect(estimateReviewXP(3)).toBe(XP_TABLE.review_flashcard + XP_TABLE.review_correct);
  });

  it('incorrect review XP = review_flashcard only', () => {
    expect(estimateReviewXP(1)).toBe(XP_TABLE.review_flashcard);
  });
});
