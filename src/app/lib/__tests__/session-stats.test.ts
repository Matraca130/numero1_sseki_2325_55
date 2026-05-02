// ============================================================
// Tests for session-stats.ts — session-end statistics helpers
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  countCorrect,
  computeMasteryPct,
  computeDeltaStats,
} from '@/app/lib/session-stats';
import type { TopicMasterySummary } from '@/app/services/keywordMasteryApi';
import type { CardMasteryDelta } from '@/app/hooks/useFlashcardEngine';

describe('countCorrect', () => {
  it('counts ratings >= 3 as correct', () => {
    expect(countCorrect([1, 2, 3, 4, 5])).toBe(3);
  });

  it('returns 0 for empty array', () => {
    expect(countCorrect([])).toBe(0);
  });

  it('returns 0 when all ratings are below threshold', () => {
    expect(countCorrect([1, 2, 1, 2])).toBe(0);
  });

  it('returns full count when all ratings are >= 3', () => {
    expect(countCorrect([3, 4, 5, 3])).toBe(4);
  });

  it('treats exactly 3 as correct (boundary)', () => {
    expect(countCorrect([3])).toBe(1);
  });
});

describe('computeMasteryPct', () => {
  it('uses topic summary when keywordsTotal > 0', () => {
    const summary: TopicMasterySummary = {
      keywordsTotal: 4,
      keywordsMastered: 2,
      overallMastery: 0.6,
    } as TopicMasterySummary;

    expect(computeMasteryPct(summary, [])).toBe(60);
  });

  it('rounds the overallMastery percentage', () => {
    const summary: TopicMasterySummary = {
      keywordsTotal: 1,
      keywordsMastered: 0,
      overallMastery: 0.336,
    } as TopicMasterySummary;
    // 0.336 * 100 = 33.6 → rounds to 34
    expect(computeMasteryPct(summary, [])).toBe(34);
  });

  it('falls back to averaging stats when topicSummary is null', () => {
    // ratings 3,4,5 → avg=4 → 4/5 = 0.8 → 80%
    expect(computeMasteryPct(null, [3, 4, 5])).toBe(80);
  });

  it('falls back to averaging stats when keywordsTotal is 0', () => {
    const summary: TopicMasterySummary = {
      keywordsTotal: 0,
      keywordsMastered: 0,
      overallMastery: 0,
    } as TopicMasterySummary;
    expect(computeMasteryPct(summary, [5, 5, 5])).toBe(100);
  });

  it('returns 0 with no topic summary and no stats', () => {
    expect(computeMasteryPct(null, [])).toBe(0);
  });
});

describe('computeDeltaStats', () => {
  it('returns null for empty deltas', () => {
    expect(computeDeltaStats([])).toBeNull();
  });

  it('counts improved / declined / total correctly', () => {
    const deltas: CardMasteryDelta[] = [
      { cardId: 'c1', before: 0.3, after: 0.5 } as CardMasteryDelta, // improved
      { cardId: 'c2', before: 0.6, after: 0.4 } as CardMasteryDelta, // declined
      { cardId: 'c3', before: 0.5, after: 0.5 } as CardMasteryDelta, // neither
      { cardId: 'c4', before: 0.7, after: 0.9 } as CardMasteryDelta, // improved
    ];

    const stats = computeDeltaStats(deltas);
    expect(stats).not.toBeNull();
    expect(stats!.improved).toBe(2);
    expect(stats!.declined).toBe(1);
    expect(stats!.total).toBe(4);
  });

  it('detects "newlyMastered" when crossing the 0.75 threshold', () => {
    const deltas: CardMasteryDelta[] = [
      { cardId: 'c1', before: 0.6, after: 0.8 } as CardMasteryDelta, // newly mastered
      { cardId: 'c2', before: 0.7, after: 0.74 } as CardMasteryDelta, // not yet
      { cardId: 'c3', before: 0.8, after: 0.9 } as CardMasteryDelta, // already mastered
      { cardId: 'c4', before: 0.74, after: 0.75 } as CardMasteryDelta, // newly mastered (boundary)
    ];

    const stats = computeDeltaStats(deltas)!;
    expect(stats.newlyMastered).toBe(2);
  });

  it('handles a single declining card', () => {
    const stats = computeDeltaStats([
      { cardId: 'c1', before: 0.9, after: 0.5 } as CardMasteryDelta,
    ])!;
    expect(stats.improved).toBe(0);
    expect(stats.declined).toBe(1);
    expect(stats.newlyMastered).toBe(0);
    expect(stats.total).toBe(1);
  });
});
