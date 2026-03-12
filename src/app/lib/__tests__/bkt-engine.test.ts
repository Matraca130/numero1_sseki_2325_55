/**
 * src/app/lib/__tests__/bkt-engine.test.ts — 16 tests
 * Tests for BKT (Bayesian Knowledge Tracing) engine.
 * Pure math, zero DOM dependency.
 *
 * Constants verified from source:
 *   P_LEARN=0.18, P_FORGET=0.25, RECOVERY_FACTOR=3.0
 *   QUIZ_MULTIPLIER=0.70, FLASHCARD_MULTIPLIER=1.00
 *
 * Run: npx vitest run src/app/lib/__tests__/bkt-engine.test.ts
 */
import { describe, it, expect } from 'vitest';
import { updateBKT } from '../bkt-engine';

describe('bkt-engine', () => {
  describe('updateBKT', () => {
    // ═══ Correct answer — flashcard ═══
    describe('correct answer — flashcard (multiplier=1.0)', () => {
      it('increases mastery from 0', () => {
        // 0 + (1-0) * 0.18 * 1.0 * 1.0 = 0.18
        expect(updateBKT(0, true, 'flashcard')).toBeCloseTo(0.18, 5);
      });

      it('increases mastery from 0.5', () => {
        // 0.5 + (1-0.5) * 0.18 * 1.0 * 1.0 = 0.5 + 0.09 = 0.59
        expect(updateBKT(0.5, true, 'flashcard')).toBeCloseTo(0.59, 5);
      });

      it('increases mastery from 0.9 (diminishing returns)', () => {
        // 0.9 + (1-0.9) * 0.18 * 1.0 * 1.0 = 0.9 + 0.018 = 0.918
        expect(updateBKT(0.9, true, 'flashcard')).toBeCloseTo(0.918, 5);
      });
    });

    // ═══ Correct answer — quiz ═══
    describe('correct answer — quiz (multiplier=0.70)', () => {
      it('increases mastery less than flashcard', () => {
        // 0 + (1-0) * 0.18 * 0.70 * 1.0 = 0.126
        expect(updateBKT(0, true, 'quiz')).toBeCloseTo(0.126, 5);
      });

      it('quiz gain < flashcard gain at same mastery', () => {
        const flashcard = updateBKT(0.5, true, 'flashcard');
        const quiz = updateBKT(0.5, true, 'quiz');
        expect(quiz).toBeLessThan(flashcard);
      });
    });

    // ═══ Incorrect answer ═══
    describe('incorrect answer', () => {
      it('decreases mastery by P_FORGET factor (0.25)', () => {
        // 0.8 * (1 - 0.25) = 0.8 * 0.75 = 0.6
        expect(updateBKT(0.8, false, 'flashcard')).toBeCloseTo(0.6, 5);
      });

      it('same formula regardless of instrument type', () => {
        const flashcard = updateBKT(0.8, false, 'flashcard');
        const quiz = updateBKT(0.8, false, 'quiz');
        expect(flashcard).toBeCloseTo(quiz, 5);
      });

      it('from 0 stays at 0', () => {
        expect(updateBKT(0, false, 'flashcard')).toBe(0);
      });
    });

    // ═══ Recovery mode ═══
    describe('recovery mode (previousMaxMastery)', () => {
      it('applies RECOVERY_FACTOR=3.0 when previousMax > current', () => {
        // 0.3 + (1-0.3) * 0.18 * 1.0 * 3.0 = 0.3 + 0.378 = 0.678
        expect(updateBKT(0.3, true, 'flashcard', 0.8)).toBeCloseTo(0.678, 5);
      });

      it('no recovery when previousMax <= current', () => {
        const withLowMax = updateBKT(0.5, true, 'flashcard', 0.3);
        const noMax = updateBKT(0.5, true, 'flashcard');
        expect(withLowMax).toBeCloseTo(noMax, 5);
      });

      it('no recovery when previousMax undefined', () => {
        const withUndef = updateBKT(0.5, true, 'flashcard', undefined);
        const noArg = updateBKT(0.5, true, 'flashcard');
        expect(withUndef).toBeCloseTo(noArg, 5);
      });

      it('no recovery when previousMax equals current (not strictly greater)', () => {
        const result = updateBKT(0.5, true, 'flashcard', 0.5);
        const noRecovery = updateBKT(0.5, true, 'flashcard');
        expect(result).toBeCloseTo(noRecovery, 5);
      });
    });

    // ═══ Output clamping [0, 1] ═══
    describe('output clamping [0, 1]', () => {
      it('never exceeds 1 even with recovery', () => {
        const result = updateBKT(0.95, true, 'flashcard', 1.0);
        expect(result).toBeLessThanOrEqual(1);
      });

      it('never goes below 0', () => {
        const result = updateBKT(0, false, 'flashcard');
        expect(result).toBeGreaterThanOrEqual(0);
      });
    });

    // ═══ Convergence ═══
    describe('convergence behavior', () => {
      it('approaches 1.0 with 50 consecutive correct flashcard answers', () => {
        let mastery = 0;
        for (let i = 0; i < 50; i++) {
          mastery = updateBKT(mastery, true, 'flashcard');
        }
        expect(mastery).toBeGreaterThan(0.95);
      });

      it('approaches 0 with 30 consecutive incorrect answers', () => {
        let mastery = 0.99;
        for (let i = 0; i < 30; i++) {
          mastery = updateBKT(mastery, false, 'flashcard');
        }
        expect(mastery).toBeLessThan(0.01);
      });
    });
  });
});
