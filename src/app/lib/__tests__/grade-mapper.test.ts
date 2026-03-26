// ============================================================
// Tests for grade-mapper.ts — Grade Translation Pipeline
//
// All functions under test are pure (no side effects, no DOM,
// no network). No mocks needed.
// ============================================================

import {
  smRatingToFsrsGrade,
  fsrsGradeToFloat,
  isCorrect,
  isRecovering,
  translateRating,
  FSRS_GRADE_TO_FLOAT,
  IS_CORRECT_THRESHOLD,
  type SmRating,
  type FsrsGrade,
} from '@/app/lib/grade-mapper';

// ── smRatingToFsrsGrade ─────────────────────────────────────

describe('smRatingToFsrsGrade', () => {
  it('SM-2 1 (again) → FSRS 1 (Again)', () => {
    expect(smRatingToFsrsGrade(1)).toBe(1);
  });

  it('SM-2 2 (hard) → FSRS 2 (Hard)', () => {
    expect(smRatingToFsrsGrade(2)).toBe(2);
  });

  it('SM-2 3 (ok) → FSRS 3 (Good)', () => {
    expect(smRatingToFsrsGrade(3)).toBe(3);
  });

  it('SM-2 4 (good) → FSRS 3 (Good) — same bucket as 3', () => {
    expect(smRatingToFsrsGrade(4)).toBe(3);
  });

  it('SM-2 5 (perfect) → FSRS 4 (Easy)', () => {
    expect(smRatingToFsrsGrade(5)).toBe(4);
  });
});

// ── fsrsGradeToFloat ────────────────────────────────────────

describe('fsrsGradeToFloat', () => {
  it('grade 1 (Again) → 0.0', () => {
    expect(fsrsGradeToFloat(1)).toBe(0.0);
  });

  it('grade 2 (Hard) → 0.35', () => {
    expect(fsrsGradeToFloat(2)).toBe(0.35);
  });

  it('grade 3 (Good) → 0.65', () => {
    expect(fsrsGradeToFloat(3)).toBe(0.65);
  });

  it('grade 4 (Easy) → 1.0', () => {
    expect(fsrsGradeToFloat(4)).toBe(1.0);
  });
});

// ── isCorrect ───────────────────────────────────────────────

describe('isCorrect', () => {
  describe('context: fsrs (threshold >= 2)', () => {
    it('grade 1 → false', () => {
      expect(isCorrect(1, 'fsrs')).toBe(false);
    });

    it('grade 2 → true (Hard counts as successful recall)', () => {
      expect(isCorrect(2, 'fsrs')).toBe(true);
    });

    it('grade 3 → true', () => {
      expect(isCorrect(3, 'fsrs')).toBe(true);
    });

    it('grade 4 → true', () => {
      expect(isCorrect(4, 'fsrs')).toBe(true);
    });
  });

  describe('context: bkt (threshold >= 3)', () => {
    it('grade 1 → false', () => {
      expect(isCorrect(1, 'bkt')).toBe(false);
    });

    it('grade 2 → false (Hard does NOT count for BKT)', () => {
      expect(isCorrect(2, 'bkt')).toBe(false);
    });

    it('grade 3 → true', () => {
      expect(isCorrect(3, 'bkt')).toBe(true);
    });

    it('grade 4 → true', () => {
      expect(isCorrect(4, 'bkt')).toBe(true);
    });
  });

  describe('context: exam (same thresholds as fsrs)', () => {
    it('grade 1 → false', () => {
      expect(isCorrect(1, 'exam')).toBe(false);
    });

    it('grade 2 → true', () => {
      expect(isCorrect(2, 'exam')).toBe(true);
    });

    it('grade 3 → true', () => {
      expect(isCorrect(3, 'exam')).toBe(true);
    });

    it('grade 4 → true', () => {
      expect(isCorrect(4, 'exam')).toBe(true);
    });
  });
});

// ── isRecovering ────────────────────────────────────────────

describe('isRecovering', () => {
  it('returns true when current < max and max > 0.5 (recovering)', () => {
    expect(isRecovering(0.3, 0.8)).toBe(true);
  });

  it('returns false when max < threshold (never mastered)', () => {
    expect(isRecovering(0.2, 0.3)).toBe(false);
  });

  it('returns false when current equals max (not declining)', () => {
    expect(isRecovering(0.8, 0.8)).toBe(false);
  });

  it('returns false when current > max (improving)', () => {
    expect(isRecovering(0.9, 0.8)).toBe(false);
  });

  it('returns false when max is exactly at threshold (not strictly greater)', () => {
    expect(isRecovering(0.3, 0.5)).toBe(false);
  });

  it('returns true when max is just above threshold', () => {
    expect(isRecovering(0.3, 0.51)).toBe(true);
  });

  it('respects custom recoveryThreshold', () => {
    // Default threshold 0.50: max=0.6 > 0.50 → recovering
    expect(isRecovering(0.3, 0.6, 0.50)).toBe(true);
    // Custom threshold 0.70: max=0.6 > 0.70 is false → not recovering
    expect(isRecovering(0.3, 0.6, 0.70)).toBe(false);
  });
});

// ── translateRating ─────────────────────────────────────────

describe('translateRating', () => {
  const cases: Array<{
    rating: SmRating;
    expected: {
      smRating: SmRating;
      fsrsGrade: FsrsGrade;
      continuousGrade: number;
      isCorrectFsrs: boolean;
      isCorrectBkt: boolean;
      isCorrectExam: boolean;
    };
  }> = [
    {
      rating: 1,
      expected: {
        smRating: 1, fsrsGrade: 1, continuousGrade: 0.0,
        isCorrectFsrs: false, isCorrectBkt: false, isCorrectExam: false,
      },
    },
    {
      rating: 2,
      expected: {
        smRating: 2, fsrsGrade: 2, continuousGrade: 0.35,
        isCorrectFsrs: true, isCorrectBkt: false, isCorrectExam: true,
      },
    },
    {
      rating: 3,
      expected: {
        smRating: 3, fsrsGrade: 3, continuousGrade: 0.65,
        isCorrectFsrs: true, isCorrectBkt: true, isCorrectExam: true,
      },
    },
    {
      rating: 4,
      expected: {
        smRating: 4, fsrsGrade: 3, continuousGrade: 0.65,
        isCorrectFsrs: true, isCorrectBkt: true, isCorrectExam: true,
      },
    },
    {
      rating: 5,
      expected: {
        smRating: 5, fsrsGrade: 4, continuousGrade: 1.0,
        isCorrectFsrs: true, isCorrectBkt: true, isCorrectExam: true,
      },
    },
  ];

  for (const { rating, expected } of cases) {
    it(`rating ${rating} → full pipeline result`, () => {
      const result = translateRating(rating);
      expect(result).toEqual(expected);
    });
  }
});

// ── Constants ───────────────────────────────────────────────

describe('FSRS_GRADE_TO_FLOAT constant', () => {
  it('has correct values for all 4 grades', () => {
    expect(FSRS_GRADE_TO_FLOAT).toEqual({
      1: 0.00,
      2: 0.35,
      3: 0.65,
      4: 1.00,
    });
  });
});

describe('IS_CORRECT_THRESHOLD constant', () => {
  it('has correct thresholds per context', () => {
    expect(IS_CORRECT_THRESHOLD).toEqual({
      fsrs: 2,
      bkt: 3,
      exam: 2,
    });
  });
});
