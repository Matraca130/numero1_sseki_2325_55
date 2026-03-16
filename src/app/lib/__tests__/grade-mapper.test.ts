// ============================================================
// TEST: grade-mapper.ts — Grade translation across scales
//
// Covers the FSRS/BKT/SM-2 grade translation pipeline.
// Pure functions, zero mocks needed.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  smRatingToFsrsGrade,
  fsrsGradeToFloat,
  isCorrect,
  isRecovering,
  translateRating,
  FSRS_GRADE_TO_FLOAT,
  IS_CORRECT_THRESHOLD,
} from '../grade-mapper';
import type { FsrsGrade, SmRating } from '../grade-mapper';

// ── smRatingToFsrsGrade ──────────────────────────────────

describe('smRatingToFsrsGrade', () => {
  it('should map SM-2 1 (again) → FSRS 1 (Again)', () => {
    expect(smRatingToFsrsGrade(1)).toBe(1);
  });

  it('should map SM-2 2 (hard) → FSRS 2 (Hard)', () => {
    expect(smRatingToFsrsGrade(2)).toBe(2);
  });

  it('should map SM-2 3 (ok) → FSRS 3 (Good)', () => {
    expect(smRatingToFsrsGrade(3)).toBe(3);
  });

  it('should map SM-2 4 (good) → FSRS 3 (Good) — same bucket', () => {
    expect(smRatingToFsrsGrade(4)).toBe(3);
  });

  it('should map SM-2 5 (perfect) → FSRS 4 (Easy)', () => {
    expect(smRatingToFsrsGrade(5)).toBe(4);
  });

  it('SM-2 3 and 4 should map to same FSRS grade (collapse test)', () => {
    expect(smRatingToFsrsGrade(3)).toBe(smRatingToFsrsGrade(4));
  });
});

// ── fsrsGradeToFloat ─────────────────────────────────────

describe('fsrsGradeToFloat', () => {
  it.each([
    [1, 0.00],
    [2, 0.35],
    [3, 0.65],
    [4, 1.00],
  ] as [FsrsGrade, number][])('should map FSRS grade %d to %f', (grade, expected) => {
    expect(fsrsGradeToFloat(grade)).toBeCloseTo(expected, 2);
  });

  it('should have consistent FSRS_GRADE_TO_FLOAT constant', () => {
    expect(Object.keys(FSRS_GRADE_TO_FLOAT)).toHaveLength(4);
  });
});

// ── isCorrect (threshold differences) ─────────────────────

describe('isCorrect', () => {
  describe('FSRS context (threshold = 2)', () => {
    it('grade 1 (Again) should be incorrect', () => {
      expect(isCorrect(1, 'fsrs')).toBe(false);
    });
    it('grade 2 (Hard) should be CORRECT — successful recall', () => {
      expect(isCorrect(2, 'fsrs')).toBe(true);
    });
    it('grade 3 (Good) should be correct', () => {
      expect(isCorrect(3, 'fsrs')).toBe(true);
    });
    it('grade 4 (Easy) should be correct', () => {
      expect(isCorrect(4, 'fsrs')).toBe(true);
    });
  });

  describe('BKT context (threshold = 3)', () => {
    it('grade 1 (Again) should be incorrect', () => {
      expect(isCorrect(1, 'bkt')).toBe(false);
    });
    it('grade 2 (Hard) should be INCORRECT — not knowledge demonstrated', () => {
      expect(isCorrect(2, 'bkt')).toBe(false);
    });
    it('grade 3 (Good) should be correct', () => {
      expect(isCorrect(3, 'bkt')).toBe(true);
    });
    it('grade 4 (Easy) should be correct', () => {
      expect(isCorrect(4, 'bkt')).toBe(true);
    });
  });

  it('CRITICAL: FSRS and BKT disagree on grade 2 (Hard)', () => {
    expect(isCorrect(2, 'fsrs')).toBe(true);
    expect(isCorrect(2, 'bkt')).toBe(false);
  });

  it('exam context should use same threshold as FSRS', () => {
    expect(IS_CORRECT_THRESHOLD.exam).toBe(IS_CORRECT_THRESHOLD.fsrs);
  });
});

// ── isRecovering ─────────────────────────────────────────

describe('isRecovering', () => {
  it('should return true when max_p_know > 0.50 and current < max', () => {
    expect(isRecovering(0.30, 0.80)).toBe(true);
  });

  it('should return false when max_p_know <= 0.50 (never learned)', () => {
    expect(isRecovering(0.10, 0.40)).toBe(false);
  });

  it('should return false when current >= max (not declining)', () => {
    expect(isRecovering(0.80, 0.80)).toBe(false);
  });

  it('should return false for brand new card (both zero)', () => {
    expect(isRecovering(0, 0)).toBe(false);
  });

  it('should respect custom recoveryThreshold', () => {
    // With threshold 0.70, max_p_know=0.60 is below threshold
    expect(isRecovering(0.30, 0.60, 0.70)).toBe(false);
    // With threshold 0.40, max_p_know=0.60 is above threshold
    expect(isRecovering(0.30, 0.60, 0.40)).toBe(true);
  });
});

// ── translateRating (full pipeline) ───────────────────────

describe('translateRating', () => {
  it('should return all fields for SM-2 rating 1 (Again)', () => {
    const result = translateRating(1);
    expect(result.smRating).toBe(1);
    expect(result.fsrsGrade).toBe(1);
    expect(result.continuousGrade).toBe(0.0);
    expect(result.isCorrectFsrs).toBe(false);
    expect(result.isCorrectBkt).toBe(false);
    expect(result.isCorrectExam).toBe(false);
  });

  it('should return all fields for SM-2 rating 3 (OK)', () => {
    const result = translateRating(3);
    expect(result.smRating).toBe(3);
    expect(result.fsrsGrade).toBe(3);
    expect(result.continuousGrade).toBe(0.65);
    expect(result.isCorrectFsrs).toBe(true);
    expect(result.isCorrectBkt).toBe(true);
    expect(result.isCorrectExam).toBe(true);
  });

  it('should return all fields for SM-2 rating 5 (Perfect)', () => {
    const result = translateRating(5);
    expect(result.smRating).toBe(5);
    expect(result.fsrsGrade).toBe(4);
    expect(result.continuousGrade).toBe(1.0);
    expect(result.isCorrectFsrs).toBe(true);
    expect(result.isCorrectBkt).toBe(true);
    expect(result.isCorrectExam).toBe(true);
  });

  it('SM-2 2 should be correct for FSRS but NOT for BKT', () => {
    const result = translateRating(2);
    expect(result.isCorrectFsrs).toBe(true);
    expect(result.isCorrectBkt).toBe(false);
  });
});
