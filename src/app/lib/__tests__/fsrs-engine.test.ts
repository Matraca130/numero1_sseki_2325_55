/**
 * src/app/lib/__tests__/fsrs-engine.test.ts — 18 tests
 * Tests for the FSRS (Free Spaced Repetition Scheduler) engine.
 * Pure math, zero DOM dependency.
 *
 * Run: npx vitest run src/app/lib/__tests__/fsrs-engine.test.ts
 */
import { describe, it, expect } from 'vitest';
import { computeFsrsUpdate, getInitialFsrsState } from '../fsrs-engine';
import type { FsrsState } from '../fsrs-engine';

describe('fsrs-engine', () => {
  describe('getInitialFsrsState', () => {
    it('returns correct defaults', () => {
      const state = getInitialFsrsState();
      expect(state).toEqual({
        stability: 1,
        difficulty: 5,
        reps: 0,
        lapses: 0,
        state: 'new',
      });
    });
  });

  describe('computeFsrsUpdate', () => {
    const initial = getInitialFsrsState();

    // ═══ Grade 1 = Again (lapse) ═══
    describe('grade 1 (Again)', () => {
      it('increments lapses', () => {
        const result = computeFsrsUpdate(initial, 1);
        expect(result.lapses).toBe(1);
      });

      it('halves stability (min 0.5)', () => {
        // initial stability=1 → 1*0.5=0.5 → max(0.5,0.5)=0.5
        const result = computeFsrsUpdate(initial, 1);
        expect(result.stability).toBe(0.5);
      });

      it('stability floor is 0.5 (does not go below)', () => {
        // stability=0.8 → 0.8*0.5=0.4 → max(0.5,0.4)=0.5
        const lowStab: FsrsState = { ...initial, stability: 0.8 };
        const result = computeFsrsUpdate(lowStab, 1);
        expect(result.stability).toBe(0.5);
      });

      it('resets reps to 0', () => {
        const withReps: FsrsState = { ...initial, reps: 5 };
        const result = computeFsrsUpdate(withReps, 1);
        expect(result.reps).toBe(0);
      });

      it('sets state to relearning', () => {
        const result = computeFsrsUpdate(initial, 1);
        expect(result.state).toBe('relearning');
      });

      it('increases difficulty by 0.5 (grade < 3)', () => {
        // difficulty: 5 + 0.5 = 5.5
        const result = computeFsrsUpdate(initial, 1);
        expect(result.difficulty).toBe(5.5);
      });
    });

    // ═══ Grade 2 = Hard ═══
    describe('grade 2 (Hard)', () => {
      it('multiplies stability by 1.2', () => {
        // stability: 1 * 1.2 = 1.2
        const result = computeFsrsUpdate(initial, 2);
        expect(result.stability).toBe(1.2);
      });

      it('increments reps', () => {
        const result = computeFsrsUpdate(initial, 2);
        expect(result.reps).toBe(1);
      });

      it('sets state to review', () => {
        const result = computeFsrsUpdate(initial, 2);
        expect(result.state).toBe('review');
      });

      it('increases difficulty by 0.5 (grade < 3)', () => {
        const result = computeFsrsUpdate(initial, 2);
        expect(result.difficulty).toBe(5.5);
      });
    });

    // ═══ Grade 3 = Good ═══
    describe('grade 3 (Good)', () => {
      it('applies formula: stability * (2.5 - 0.15 * newDifficulty)', () => {
        // Step 1: difficulty adjusted first → 5 - 0.3 = 4.7
        // Step 2: stability = 1 * (2.5 - 0.15 * 4.7) = 1 * 1.795 = 1.795
        // Step 3: rounded to 2 decimals → 1.80
        const result = computeFsrsUpdate(initial, 3);
        expect(result.stability).toBe(1.8);
      });

      it('decreases difficulty by 0.3 (grade >= 3)', () => {
        const result = computeFsrsUpdate(initial, 3);
        expect(result.difficulty).toBe(4.7);
      });

      it('increments reps', () => {
        const result = computeFsrsUpdate(initial, 3);
        expect(result.reps).toBe(1);
      });
    });

    // ═══ Grade 4 = Easy ═══
    describe('grade 4 (Easy)', () => {
      it('applies formula: Good * 1.3 bonus', () => {
        // difficulty: 5 - 0.3 = 4.7
        // stability = 1 * (2.5 - 0.15 * 4.7) * 1.3 = 1.795 * 1.3 = 2.3335
        // rounded → 2.33
        const result = computeFsrsUpdate(initial, 4);
        expect(result.stability).toBe(2.33);
      });

      it('decreases difficulty by 0.3', () => {
        const result = computeFsrsUpdate(initial, 4);
        expect(result.difficulty).toBe(4.7);
      });
    });

    // ═══ Difficulty clamping [0, 10] ═══
    describe('difficulty clamping', () => {
      it('clamps difficulty at 10 (max)', () => {
        const highDiff: FsrsState = { ...initial, difficulty: 9.8 };
        const result = computeFsrsUpdate(highDiff, 1); // +0.5 → 10.3 → clamped 10
        expect(result.difficulty).toBe(10);
      });

      it('clamps difficulty at 0 (min)', () => {
        const lowDiff: FsrsState = { ...initial, difficulty: 0.1 };
        const result = computeFsrsUpdate(lowDiff, 4); // -0.3 → -0.2 → clamped 0
        expect(result.difficulty).toBe(0);
      });
    });

    // ═══ due_at scheduling ═══
    describe('due_at scheduling', () => {
      it('returns a valid ISO date string in the future', () => {
        const result = computeFsrsUpdate(initial, 3);
        const dueDate = new Date(result.due_at);
        expect(dueDate.getTime()).toBeGreaterThan(Date.now());
      });

      it('due_at is at least ~1 day in the future', () => {
        const result = computeFsrsUpdate(initial, 1); // low stability → min 1 day
        const dueDate = new Date(result.due_at);
        const diffHours = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
        expect(diffHours).toBeGreaterThan(20); // ~1 day with tolerance
      });
    });

    // ═══ Cumulative behavior ═══
    describe('cumulative behavior', () => {
      it('multiple Good reviews increase stability progressively', () => {
        let state: FsrsState = getInitialFsrsState();
        const stabilities: number[] = [];
        for (let i = 0; i < 5; i++) {
          const update = computeFsrsUpdate(state, 3);
          stabilities.push(update.stability);
          state = { stability: update.stability, difficulty: update.difficulty, reps: update.reps, lapses: update.lapses, state: update.state };
        }
        for (let i = 1; i < stabilities.length; i++) {
          expect(stabilities[i]).toBeGreaterThan(stabilities[i - 1]);
        }
      });

      it('lapse after reviews resets progress', () => {
        let state: FsrsState = getInitialFsrsState();
        for (let i = 0; i < 3; i++) {
          const u = computeFsrsUpdate(state, 3);
          state = { stability: u.stability, difficulty: u.difficulty, reps: u.reps, lapses: u.lapses, state: u.state };
        }
        const stableStability = state.stability;
        const afterLapse = computeFsrsUpdate(state, 1);
        expect(afterLapse.stability).toBeLessThan(stableStability);
        expect(afterLapse.lapses).toBe(1);
        expect(afterLapse.reps).toBe(0);
      });
    });
  });
});
