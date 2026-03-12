/**
 * src/app/lib/__tests__/grade-mapper.test.ts — 25 tests
 * Tests for the grade translation pipeline:
 *   SM-2 (UI, 1-5) → FSRS (backend, 1-4) → continuous (0.0-1.0)
 *   + context-dependent isCorrect thresholds
 *   + recovery detection
 *
 * Run: npx vitest run src/app/lib/__tests__/grade-mapper.test.ts
 */
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
import type { FsrsGrade } from '../grade-mapper';

describe('grade-mapper', () => {
  // ═══ smRatingToFsrsGrade ═══
  describe('smRatingToFsrsGrade', () => {
    it('SM-2 1 → FSRS 1 (Again)', () => expect(smRatingToFsrsGrade(1)).toBe(1));
    it('SM-2 2 → FSRS 2 (Hard)', () => expect(smRatingToFsrsGrade(2)).toBe(2));
    it('SM-2 3 → FSRS 3 (Good)', () => expect(smRatingToFsrsGrade(3)).toBe(3));
    it('SM-2 4 → FSRS 3 (Good — collapsed bucket)', () => expect(smRatingToFsrsGrade(4)).toBe(3));
    it('SM-2 5 → FSRS 4 (Easy)', () => expect(smRatingToFsrsGrade(5)).toBe(4));
  });

  // ═══ fsrsGradeToFloat ═══
  describe('fsrsGradeToFloat', () => {
    it('Again (1) → 0.00', () => expect(fsrsGradeToFloat(1)).toBe(0.00));
    it('Hard (2) → 0.35', () => expect(fsrsGradeToFloat(2)).toBe(0.35));
    it('Good (3) → 0.65', () => expect(fsrsGradeToFloat(3)).toBe(0.65));
    it('Easy (4) → 1.00', () => expect(fsrsGradeToFloat(4)).toBe(1.00));
    it('unknown grade returns 0.0 (defensive)', () => {
      expect(fsrsGradeToFloat(99 as FsrsGrade)).toBe(0.0);
    });
  });

  // ═══ isCorrect ═══
  describe('isCorrect', () => {
    describe('FSRS context (threshold=2: Hard counts as correct)', () => {
      it('grade 1 is NOT correct', () => expect(isCorrect(1, 'fsrs')).toBe(false));
      it('grade 2 IS correct', () => expect(isCorrect(2, 'fsrs')).toBe(true));
      it('grade 3 IS correct', () => expect(isCorrect(3, 'fsrs')).toBe(true));
      it('grade 4 IS correct', () => expect(isCorrect(4, 'fsrs')).toBe(true));
    });

    describe('BKT context (threshold=3: only Good+ = knowledge demonstrated)', () => {
      it('grade 1 is NOT correct', () => expect(isCorrect(1, 'bkt')).toBe(false));
      it('grade 2 is NOT correct (Hard ≠ knowledge)', () => expect(isCorrect(2, 'bkt')).toBe(false));
      it('grade 3 IS correct', () => expect(isCorrect(3, 'bkt')).toBe(true));
      it('grade 4 IS correct', () => expect(isCorrect(4, 'bkt')).toBe(true));
    });

    describe('exam context (threshold=2, same as FSRS)', () => {
      it('grade 1 is NOT correct', () => expect(isCorrect(1, 'exam')).toBe(false));
      it('grade 2 IS correct', () => expect(isCorrect(2, 'exam')).toBe(true));
    });
  });

  // ═══ isRecovering ═══
  describe('isRecovering', () => {
    it('true when maxPKnow > threshold AND current < max', () => {
      expect(isRecovering(0.3, 0.8)).toBe(true); // 0.8 > 0.50 && 0.3 < 0.8
    });

    it('false when maxPKnow <= default threshold (0.50)', () => {
      expect(isRecovering(0.2, 0.4)).toBe(false); // 0.4 <= 0.50
    });

    it('false when current >= max', () => {
      expect(isRecovering(0.8, 0.8)).toBe(false); // 0.8 NOT < 0.8
    });

    it('false when current > max', () => {
      expect(isRecovering(0.9, 0.8)).toBe(false);
    });

    it('respects custom threshold parameter', () => {
      expect(isRecovering(0.3, 0.4, 0.3)).toBe(true);  // 0.4 > 0.3 threshold
      expect(isRecovering(0.3, 0.4, 0.5)).toBe(false); // 0.4 <= 0.5 threshold
    });
  });

  // ═══ translateRating — full pipeline ═══
  describe('translateRating — full pipeline', () => {
    it('SM-2 1 → Again across all contexts', () => {
      const r = translateRating(1);
      expect(r.smRating).toBe(1);
      expect(r.fsrsGrade).toBe(1);
      expect(r.continuousGrade).toBe(0.0);
      expect(r.isCorrectFsrs).toBe(false);
      expect(r.isCorrectBkt).toBe(false);
      expect(r.isCorrectExam).toBe(false);
    });

    it('SM-2 2 → FSRS correct but BKT incorrect (critical divergence)', () => {
      const r = translateRating(2);
      expect(r.fsrsGrade).toBe(2);
      expect(r.continuousGrade).toBe(0.35);
      expect(r.isCorrectFsrs).toBe(true);  // FSRS: Hard = successful recall
      expect(r.isCorrectBkt).toBe(false);   // BKT: Hard ≠ knowledge demonstrated
    });

    it('SM-2 3 → correct across all contexts', () => {
      const r = translateRating(3);
      expect(r.fsrsGrade).toBe(3);
      expect(r.continuousGrade).toBe(0.65);
      expect(r.isCorrectFsrs).toBe(true);
      expect(r.isCorrectBkt).toBe(true);
      expect(r.isCorrectExam).toBe(true);
    });

    it('SM-2 5 → Easy, max continuous grade', () => {
      const r = translateRating(5);
      expect(r.fsrsGrade).toBe(4);
      expect(r.continuousGrade).toBe(1.0);
      expect(r.isCorrectFsrs).toBe(true);
      expect(r.isCorrectBkt).toBe(true);
    });
  });

  // ═══ Constants integrity ═══
  describe('constants', () => {
    it('FSRS_GRADE_TO_FLOAT covers all 4 FSRS grades', () => {
      expect(Object.keys(FSRS_GRADE_TO_FLOAT)).toHaveLength(4);
    });

    it('IS_CORRECT_THRESHOLD has fsrs=2, bkt=3, exam=2', () => {
      expect(IS_CORRECT_THRESHOLD.fsrs).toBe(2);
      expect(IS_CORRECT_THRESHOLD.bkt).toBe(3);
      expect(IS_CORRECT_THRESHOLD.exam).toBe(2);
    });
  });
});
