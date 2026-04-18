// ============================================================
// Axon -- Tests for session-stats.ts
//
// Pure functions: countCorrect, computeMasteryPct, computeDeltaStats
// ============================================================

import { describe, it, expect } from 'vitest';

import {
  countCorrect,
  computeMasteryPct,
  computeDeltaStats,
} from '@/app/lib/session-stats';

// ================================================================
// countCorrect
// ================================================================

describe('countCorrect', () => {
  it('returns 0 for empty array', () => {
    expect(countCorrect([])).toBe(0);
  });

  it('counts ratings >= 3 as correct', () => {
    expect(countCorrect([1, 2, 3, 4, 5])).toBe(3);
  });

  it('returns 0 when all ratings are below 3', () => {
    expect(countCorrect([0, 1, 2])).toBe(0);
  });

  it('returns total length when all ratings >= 3', () => {
    expect(countCorrect([3, 4, 5, 3, 4])).toBe(5);
  });

  it('treats exactly 3 as correct (inclusive)', () => {
    expect(countCorrect([3])).toBe(1);
    expect(countCorrect([2])).toBe(0);
  });
});

// ================================================================
// computeMasteryPct
// ================================================================

describe('computeMasteryPct', () => {
  it('returns 0 when summary is null and stats are empty', () => {
    expect(computeMasteryPct(null, [])).toBe(0);
  });

  it('uses topicSummary when it has keywords', () => {
    const summary = { keywordsTotal: 10, keywordsMastered: 5, overallMastery: 0.73 } as any;
    expect(computeMasteryPct(summary, [])).toBe(73);
  });

  it('rounds topic summary mastery to nearest integer', () => {
    const summary = { keywordsTotal: 5, keywordsMastered: 2, overallMastery: 0.555 } as any;
    expect(computeMasteryPct(summary, [])).toBe(56);
  });

  it('falls back to stats average when summary has zero keywords', () => {
    const summary = { keywordsTotal: 0, keywordsMastered: 0, overallMastery: 0 } as any;
    // average 4 => 4/5 = 0.8 => 80%
    expect(computeMasteryPct(summary, [4, 4, 4, 4])).toBe(80);
  });

  it('falls back to stats average when summary is null', () => {
    // avg = 3 -> 60%
    expect(computeMasteryPct(null, [3, 3, 3])).toBe(60);
  });

  it('handles max rating correctly', () => {
    expect(computeMasteryPct(null, [5, 5, 5, 5])).toBe(100);
  });

  it('handles mixed ratings correctly', () => {
    // [1,2,3,4,5] avg = 3 -> 60%
    expect(computeMasteryPct(null, [1, 2, 3, 4, 5])).toBe(60);
  });
});

// ================================================================
// computeDeltaStats
// ================================================================

describe('computeDeltaStats', () => {
  it('returns null for empty array', () => {
    expect(computeDeltaStats([])).toBeNull();
  });

  it('counts improved when after > before', () => {
    const result = computeDeltaStats([
      { cardId: 'a', before: 0.2, after: 0.4, grade: 4 },
      { cardId: 'b', before: 0.5, after: 0.6, grade: 3 },
    ]);
    expect(result).toEqual({ improved: 2, declined: 0, newlyMastered: 0, total: 2 });
  });

  it('counts declined when after < before', () => {
    const result = computeDeltaStats([
      { cardId: 'a', before: 0.8, after: 0.5, grade: 1 },
    ]);
    expect(result).toEqual({ improved: 0, declined: 1, newlyMastered: 0, total: 1 });
  });

  it('does not count equal before/after as improved or declined', () => {
    const result = computeDeltaStats([
      { cardId: 'a', before: 0.5, after: 0.5, grade: 3 },
    ]);
    expect(result).toEqual({ improved: 0, declined: 0, newlyMastered: 0, total: 1 });
  });

  it('counts newlyMastered when crossing 0.75 threshold', () => {
    const result = computeDeltaStats([
      { cardId: 'a', before: 0.5, after: 0.8, grade: 5 },
      { cardId: 'b', before: 0.74, after: 0.75, grade: 4 },
    ]);
    expect(result?.newlyMastered).toBe(2);
  });

  it('does not count as newlyMastered when already above 0.75 before', () => {
    const result = computeDeltaStats([
      { cardId: 'a', before: 0.8, after: 0.9, grade: 5 },
    ]);
    expect(result?.newlyMastered).toBe(0);
    expect(result?.improved).toBe(1);
  });

  it('does not count as newlyMastered when after stays below 0.75', () => {
    const result = computeDeltaStats([
      { cardId: 'a', before: 0.5, after: 0.7, grade: 4 },
    ]);
    expect(result?.newlyMastered).toBe(0);
    expect(result?.improved).toBe(1);
  });

  it('aggregates mixed deltas correctly', () => {
    const result = computeDeltaStats([
      { cardId: 'a', before: 0.2, after: 0.8, grade: 5 }, // improved + newlyMastered
      { cardId: 'b', before: 0.9, after: 0.3, grade: 1 }, // declined
      { cardId: 'c', before: 0.5, after: 0.5, grade: 3 }, // nothing
      { cardId: 'd', before: 0.4, after: 0.6, grade: 4 }, // improved only
    ]);
    expect(result).toEqual({ improved: 2, declined: 1, newlyMastered: 1, total: 4 });
  });
});
