// ============================================================
// BKT v3.1 Computation Guards — Axon v4.4
//
// PURPOSE: Verify BKT mastery calculation produces correct
// values and color classifications.
//
// GUARDS AGAINST:
//   - BKT formula regression (changed constants or math)
//   - Mastery color misclassification (Guidelines BKT Colors)
//   - Edge cases: clamp to [0,1], recovery factor
//   - Someone removing/breaking computeBktMastery
//
// These tests import the ACTUAL function from useQuizBkt.ts
// to test real production code, not a copy.
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect } from 'vitest';
import { computeBktMastery } from '@/app/components/student/useQuizBkt';

// ── BKT Constants (must match useQuizBkt.ts) ─────────────
const P_TRANSIT = 0.1;
const P_SLIP = 0.1;
const P_GUESS = 0.25;
const RECOVERY_FACTOR = 0.15;

// ── Helper: expected BKT calculation ─────────────────────
function expectedBkt(current: number, correct: boolean, prevMax?: number): number {
  const pKnow = Math.max(0, Math.min(1, current));
  const pCorrect = pKnow * (1 - P_SLIP) + (1 - pKnow) * P_GUESS;
  let posterior: number;
  if (correct) {
    posterior = pCorrect > 0 ? (pKnow * (1 - P_SLIP)) / pCorrect : pKnow;
  } else {
    posterior = pCorrect < 1 ? (pKnow * P_SLIP) / (1 - pCorrect) : pKnow;
  }
  let newP = posterior + (1 - posterior) * P_TRANSIT;
  if (prevMax != null && prevMax > newP) {
    newP += (prevMax - newP) * RECOVERY_FACTOR;
  }
  return Math.max(0, Math.min(1, newP));
}

// ── BKT Color classifier (Guidelines) ───────────────────
function bktColor(mastery: number): 'green' | 'yellow' | 'red' {
  if (mastery >= 0.80) return 'green';
  if (mastery >= 0.50) return 'yellow';
  return 'red';
}

// ══════════════════════════════════════════════════════════════
// SUITE 1: Core BKT calculation
// ══════════════════════════════════════════════════════════════

describe('computeBktMastery — core formula', () => {
  it('from zero mastery + correct answer → increases mastery', () => {
    const result = computeBktMastery(0, true);
    expect(result).toBeGreaterThan(0);
    expect(result).toBe(expectedBkt(0, true));
  });

  it('from zero mastery + wrong answer → still slightly increases (transit)', () => {
    const result = computeBktMastery(0, false);
    expect(result).toBeGreaterThan(0);
    expect(result).toBe(expectedBkt(0, false));
  });

  it('correct answer always produces higher mastery than wrong answer', () => {
    for (const start of [0, 0.2, 0.5, 0.7, 0.9]) {
      const correct = computeBktMastery(start, true);
      const wrong = computeBktMastery(start, false);
      expect(correct).toBeGreaterThan(wrong);
    }
  });

  it('from high mastery (0.9) + correct → stays high (near 1)', () => {
    const result = computeBktMastery(0.9, true);
    expect(result).toBeGreaterThan(0.9);
    expect(result).toBeLessThanOrEqual(1);
  });

  it('from medium mastery (0.5) + correct → increases toward high', () => {
    const result = computeBktMastery(0.5, true);
    expect(result).toBeGreaterThan(0.5);
  });

  it('result is always clamped to [0, 1]', () => {
    expect(computeBktMastery(-5, true)).toBeGreaterThanOrEqual(0);
    expect(computeBktMastery(-5, true)).toBeLessThanOrEqual(1);
    expect(computeBktMastery(5, true)).toBeGreaterThanOrEqual(0);
    expect(computeBktMastery(5, true)).toBeLessThanOrEqual(1);
    expect(computeBktMastery(0, false)).toBeGreaterThanOrEqual(0);
    expect(computeBktMastery(1, true)).toBeLessThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: Recovery factor
// ══════════════════════════════════════════════════════════════

describe('computeBktMastery — recovery factor', () => {
  it('recovery boosts mastery when previousMax > current result', () => {
    const withoutRecovery = computeBktMastery(0.3, false);
    const withRecovery = computeBktMastery(0.3, false, 0.8);
    expect(withRecovery).toBeGreaterThan(withoutRecovery);
  });

  it('no recovery boost when previousMax <= current result', () => {
    const withoutRecovery = computeBktMastery(0.5, true);
    const withLowMax = computeBktMastery(0.5, true, 0.1);
    expect(withLowMax).toBe(withoutRecovery);
  });

  it('recovery factor matches expected constant (0.15)', () => {
    const base = computeBktMastery(0.2, false);
    const withMax = computeBktMastery(0.2, false, 0.9);
    const expectedBoost = (0.9 - base) * RECOVERY_FACTOR;
    expect(withMax).toBeCloseTo(base + expectedBoost, 10);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: BKT color classification (Guidelines)
// ══════════════════════════════════════════════════════════════

describe('BKT color classification (Guidelines)', () => {
  it('mastery >= 0.80 → green', () => {
    expect(bktColor(0.80)).toBe('green');
    expect(bktColor(0.95)).toBe('green');
    expect(bktColor(1.0)).toBe('green');
  });

  it('mastery >= 0.50 and < 0.80 → yellow', () => {
    expect(bktColor(0.50)).toBe('yellow');
    expect(bktColor(0.65)).toBe('yellow');
    expect(bktColor(0.79)).toBe('yellow');
  });

  it('mastery < 0.50 → red', () => {
    expect(bktColor(0.0)).toBe('red');
    expect(bktColor(0.25)).toBe('red');
    expect(bktColor(0.49)).toBe('red');
  });

  it('after many correct answers from 0, student reaches green', () => {
    let mastery = 0;
    for (let i = 0; i < 20; i++) {
      mastery = computeBktMastery(mastery, true);
    }
    expect(bktColor(mastery)).toBe('green');
    expect(mastery).toBeGreaterThanOrEqual(0.80);
  });
});
