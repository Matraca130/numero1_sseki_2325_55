// ============================================================
// TEST: session-stats.ts — Session statistics helpers
//
// Pure functions used by AdaptiveCompletedScreen and
// AdaptivePartialSummary. Zero mocks needed.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  countCorrect,
  computeMasteryPct,
  computeDeltaStats,
} from '../session-stats';
import type { DeltaStats } from '../session-stats';

// ── countCorrect ──────────────────────────────────────────

describe('countCorrect', () => {
  it('should count ratings >= 3 as correct', () => {
    expect(countCorrect([1, 2, 3, 4, 5])).toBe(3);
  });

  it('should return 0 for empty array', () => {
    expect(countCorrect([])).toBe(0);
  });

  it('should return 0 when all ratings are < 3', () => {
    expect(countCorrect([1, 1, 2, 2])).toBe(0);
  });

  it('should count all when all ratings are >= 3', () => {
    expect(countCorrect([3, 4, 5, 3])).toBe(4);
  });

  it('should handle boundary value 3 as correct', () => {
    expect(countCorrect([3])).toBe(1);
  });

  it('should handle boundary value 2 as incorrect', () => {
    expect(countCorrect([2])).toBe(0);
  });
});

// ── computeMasteryPct ─────────────────────────────────────

describe('computeMasteryPct', () => {
  it('should prefer topicSummary.overallMastery when available', () => {
    const summary = { overallMastery: 0.75, keywordsTotal: 10, keywordsMastered: 7 } as any;
    // allStats should be ignored
    expect(computeMasteryPct(summary, [1, 1, 1])).toBe(75);
  });

  it('should round topicSummary mastery to integer', () => {
    const summary = { overallMastery: 0.333, keywordsTotal: 3, keywordsMastered: 1 } as any;
    expect(computeMasteryPct(summary, [])).toBe(33);
  });

  it('should fall back to allStats average when no topicSummary', () => {
    // ratings [5, 5, 5] → avg 5 → (5/5)*100 = 100%
    expect(computeMasteryPct(null, [5, 5, 5])).toBe(100);
  });

  it('should fall back to allStats when topicSummary has 0 keywords', () => {
    const summary = { overallMastery: 0.90, keywordsTotal: 0, keywordsMastered: 0 } as any;
    // keywordsTotal=0 → fallback to allStats
    expect(computeMasteryPct(summary, [3, 3])).toBe(60); // avg 3 → (3/5)*100 = 60
  });

  it('should return 0 for empty allStats and no summary', () => {
    expect(computeMasteryPct(null, [])).toBe(0);
  });

  it('should compute mixed ratings correctly', () => {
    // [1, 3, 5] → avg 3 → (3/5)*100 = 60%
    expect(computeMasteryPct(null, [1, 3, 5])).toBe(60);
  });
});

// ── computeDeltaStats ─────────────────────────────────────

describe('computeDeltaStats', () => {
  it('should return null for empty deltas', () => {
    expect(computeDeltaStats([])).toBeNull();
  });

  it('should count improved (after > before)', () => {
    const deltas = [
      { cardId: 'a', before: 0.3, after: 0.6 },
      { cardId: 'b', before: 0.5, after: 0.8 },
    ] as any;
    const stats = computeDeltaStats(deltas)!;
    expect(stats.improved).toBe(2);
    expect(stats.declined).toBe(0);
    expect(stats.total).toBe(2);
  });

  it('should count declined (after < before)', () => {
    const deltas = [
      { cardId: 'a', before: 0.8, after: 0.4 },
    ] as any;
    const stats = computeDeltaStats(deltas)!;
    expect(stats.improved).toBe(0);
    expect(stats.declined).toBe(1);
  });

  it('should count newlyMastered (before < 0.75, after >= 0.75)', () => {
    const deltas = [
      { cardId: 'a', before: 0.70, after: 0.80 }, // crossed threshold
      { cardId: 'b', before: 0.30, after: 0.75 }, // exactly at threshold
      { cardId: 'c', before: 0.80, after: 0.90 }, // already mastered, NOT newly
    ] as any;
    const stats = computeDeltaStats(deltas)!;
    expect(stats.newlyMastered).toBe(2);
    expect(stats.improved).toBe(3);
  });

  it('should handle no change (after === before)', () => {
    const deltas = [
      { cardId: 'a', before: 0.5, after: 0.5 },
    ] as any;
    const stats = computeDeltaStats(deltas)!;
    expect(stats.improved).toBe(0);
    expect(stats.declined).toBe(0);
    expect(stats.newlyMastered).toBe(0);
    expect(stats.total).toBe(1);
  });

  it('should handle mixed improvements and declines', () => {
    const deltas = [
      { cardId: 'a', before: 0.3, after: 0.8 }, // improved + newly mastered
      { cardId: 'b', before: 0.9, after: 0.4 }, // declined
      { cardId: 'c', before: 0.5, after: 0.5 }, // unchanged
    ] as any;
    const stats = computeDeltaStats(deltas)!;
    expect(stats.improved).toBe(1);
    expect(stats.declined).toBe(1);
    expect(stats.newlyMastered).toBe(1);
    expect(stats.total).toBe(3);
  });
});
