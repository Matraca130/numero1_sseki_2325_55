import { describe, it, expect } from 'vitest';
import {
  computeTopicMasterySummary,
  computeLocalKeywordMastery,
  MASTERY_THRESHOLD,
  type KeywordMasteryInfo,
  type KeywordMasteryMap,
  type SubtopicMasteryInfo,
} from '../keywordMasteryApi';

// ── Helpers to build test data ──────────────────────────────

function makeSubtopic(
  overrides: Partial<SubtopicMasteryInfo> & { id: string; keyword_id: string }
): SubtopicMasteryInfo {
  return {
    name: `Subtopic ${overrides.id}`,
    order_index: 0,
    p_know: 0,
    total_attempts: 0,
    correct_attempts: 0,
    hasData: false,
    isMastered: false,
    ...overrides,
  };
}

function makeKeyword(
  overrides: Partial<KeywordMasteryInfo> & { keyword_id: string }
): KeywordMasteryInfo {
  const subtopics = overrides.subtopics ?? [];
  const subtopicsTotal = subtopics.length;
  const subtopicsMastered = subtopics.filter((s) => s.isMastered).length;
  const mastery = overrides.mastery ?? -1;
  return {
    name: `Keyword ${overrides.keyword_id}`,
    definition: '',
    summary_id: 'sum-1',
    priority: 1,
    mastery,
    subtopics,
    isMastered: mastery >= MASTERY_THRESHOLD,
    subtopicsMastered,
    subtopicsTotal,
    ...overrides,
  };
}

function buildMap(keywords: KeywordMasteryInfo[]): KeywordMasteryMap {
  const map: KeywordMasteryMap = new Map();
  for (const kw of keywords) {
    map.set(kw.keyword_id, kw);
  }
  return map;
}

// ── computeTopicMasterySummary ──────────────────────────────

describe('computeTopicMasterySummary', () => {
  it('returns zeroed summary for an empty map', () => {
    const summary = computeTopicMasterySummary(new Map());
    expect(summary.keywordsTotal).toBe(0);
    expect(summary.keywordsMastered).toBe(0);
    expect(summary.overallMastery).toBe(0);
    expect(summary.weakestKeywords).toEqual([]);
    expect(summary.allKeywordsByMastery).toEqual([]);
  });

  it('excludes mastery=-1 keywords from overallMastery average', () => {
    const map = buildMap([
      makeKeyword({ keyword_id: 'kw1', mastery: 0.5 }),
      makeKeyword({ keyword_id: 'kw2', mastery: -1 }), // no data
      makeKeyword({ keyword_id: 'kw3', mastery: 0.9, isMastered: true }),
    ]);

    const summary = computeTopicMasterySummary(map);

    // Average should be (0.5 + 0.9) / 2 = 0.7, NOT (0.5 + -1 + 0.9) / 3
    expect(summary.overallMastery).toBeCloseTo(0.7, 5);
    expect(summary.keywordsTotal).toBe(3);
  });

  it('excludes mastery=-1 keywords from weakestKeywords', () => {
    const map = buildMap([
      makeKeyword({ keyword_id: 'kw1', mastery: -1 }), // no data
      makeKeyword({ keyword_id: 'kw2', mastery: 0.3 }),
    ]);

    const summary = computeTopicMasterySummary(map);

    // weakestKeywords should only contain kw2 (has data, not mastered)
    expect(summary.weakestKeywords).toHaveLength(1);
    expect(summary.weakestKeywords[0].keyword_id).toBe('kw2');
  });

  it('sorts allKeywordsByMastery ascending, priority descending as tiebreaker', () => {
    const map = buildMap([
      makeKeyword({ keyword_id: 'kw-a', mastery: 0.5, priority: 2 }),
      makeKeyword({ keyword_id: 'kw-b', mastery: 0.2, priority: 1 }),
      makeKeyword({ keyword_id: 'kw-c', mastery: 0.5, priority: 5 }), // same mastery as kw-a, higher priority
      makeKeyword({ keyword_id: 'kw-d', mastery: 0.8, priority: 3, isMastered: true }),
    ]);

    const summary = computeTopicMasterySummary(map);
    const ids = summary.allKeywordsByMastery.map((kw) => kw.keyword_id);

    // 0.2 first, then 0.5 tie broken by priority desc (5 before 2), then 0.8
    expect(ids).toEqual(['kw-b', 'kw-c', 'kw-a', 'kw-d']);
  });

  it('returns empty weakestKeywords when all keywords are mastered', () => {
    const map = buildMap([
      makeKeyword({ keyword_id: 'kw1', mastery: 0.85, isMastered: true }),
      makeKeyword({ keyword_id: 'kw2', mastery: 0.95, isMastered: true }),
    ]);

    const summary = computeTopicMasterySummary(map);
    expect(summary.weakestKeywords).toEqual([]);
    expect(summary.keywordsMastered).toBe(2);
  });

  it('handles mastery exactly at MASTERY_THRESHOLD boundary', () => {
    // At threshold: isMastered should be true (>=)
    const atThreshold = makeKeyword({
      keyword_id: 'kw-at',
      mastery: MASTERY_THRESHOLD,
      isMastered: true,
    });
    // Just below threshold
    const belowThreshold = makeKeyword({
      keyword_id: 'kw-below',
      mastery: MASTERY_THRESHOLD - 0.001,
      isMastered: false,
    });

    const map = buildMap([atThreshold, belowThreshold]);
    const summary = computeTopicMasterySummary(map);

    expect(summary.keywordsMastered).toBe(1);
    // weakestKeywords should contain only the below-threshold one
    expect(summary.weakestKeywords).toHaveLength(1);
    expect(summary.weakestKeywords[0].keyword_id).toBe('kw-below');
  });

  it('includes mastery=-1 keywords in allKeywordsByMastery but not weakestKeywords', () => {
    const map = buildMap([
      makeKeyword({ keyword_id: 'kw1', mastery: -1 }),
      makeKeyword({ keyword_id: 'kw2', mastery: 0.4 }),
    ]);

    const summary = computeTopicMasterySummary(map);

    // allKeywordsByMastery includes all keywords
    expect(summary.allKeywordsByMastery).toHaveLength(2);
    // mastery=-1 sorts before 0.4
    expect(summary.allKeywordsByMastery[0].keyword_id).toBe('kw1');

    // weakestKeywords excludes mastery=-1
    expect(summary.weakestKeywords).toHaveLength(1);
    expect(summary.weakestKeywords[0].keyword_id).toBe('kw2');
  });

  it('overallMastery is 0 when all keywords have mastery=-1', () => {
    const map = buildMap([
      makeKeyword({ keyword_id: 'kw1', mastery: -1 }),
      makeKeyword({ keyword_id: 'kw2', mastery: -1 }),
    ]);

    const summary = computeTopicMasterySummary(map);
    expect(summary.overallMastery).toBe(0);
  });
});

// ── computeLocalKeywordMastery ──────────────────────────────

describe('computeLocalKeywordMastery', () => {
  it('returns the same map reference when sessionBktUpdates is empty', () => {
    const map = buildMap([
      makeKeyword({ keyword_id: 'kw1', mastery: 0.5 }),
    ]);

    const result = computeLocalKeywordMastery(map, new Map());
    expect(result).toBe(map); // same reference, not just deep equal
  });

  it('updates subtopic p_know and recalculates keyword mastery', () => {
    const sub1 = makeSubtopic({
      id: 'st-1',
      keyword_id: 'kw1',
      p_know: 0.3,
      hasData: true,
      isMastered: false,
    });
    const sub2 = makeSubtopic({
      id: 'st-2',
      keyword_id: 'kw1',
      p_know: 0.4,
      hasData: true,
      isMastered: false,
    });

    const kw = makeKeyword({
      keyword_id: 'kw1',
      mastery: 0.35, // avg(0.3, 0.4)
      subtopics: [sub1, sub2],
    });
    const map = buildMap([kw]);

    // Update only subtopic st-1 to 0.9
    const updates = new Map([['st-1', 0.9]]);
    const result = computeLocalKeywordMastery(map, updates);

    const updatedKw = result.get('kw1')!;
    // New mastery = avg(0.9, 0.4) = 0.65
    expect(updatedKw.mastery).toBeCloseTo(0.65, 5);
    expect(updatedKw.subtopics[0].p_know).toBe(0.9);
    expect(updatedKw.subtopics[0].isMastered).toBe(true);
    expect(updatedKw.subtopics[1].p_know).toBe(0.4); // unchanged
  });

  it('sets hasData=true on updated subtopics', () => {
    const sub = makeSubtopic({
      id: 'st-1',
      keyword_id: 'kw1',
      p_know: 0,
      hasData: false,
    });

    const kw = makeKeyword({
      keyword_id: 'kw1',
      mastery: 0,
      subtopics: [sub],
    });
    const map = buildMap([kw]);

    const updates = new Map([['st-1', 0.6]]);
    const result = computeLocalKeywordMastery(map, updates);

    expect(result.get('kw1')!.subtopics[0].hasData).toBe(true);
  });

  it('does not mutate the original map', () => {
    const sub = makeSubtopic({
      id: 'st-1',
      keyword_id: 'kw1',
      p_know: 0.3,
      hasData: true,
    });
    const kw = makeKeyword({
      keyword_id: 'kw1',
      mastery: 0.3,
      subtopics: [sub],
    });
    const map = buildMap([kw]);

    const updates = new Map([['st-1', 0.9]]);
    computeLocalKeywordMastery(map, updates);

    // Original should be unchanged
    expect(map.get('kw1')!.mastery).toBe(0.3);
    expect(map.get('kw1')!.subtopics[0].p_know).toBe(0.3);
  });

  it('reuses keyword entries that have no updated subtopics', () => {
    const sub1 = makeSubtopic({ id: 'st-1', keyword_id: 'kw1', p_know: 0.5, hasData: true });
    const sub2 = makeSubtopic({ id: 'st-2', keyword_id: 'kw2', p_know: 0.3, hasData: true });

    const kw1 = makeKeyword({ keyword_id: 'kw1', mastery: 0.5, subtopics: [sub1] });
    const kw2 = makeKeyword({ keyword_id: 'kw2', mastery: 0.3, subtopics: [sub2] });
    const map = buildMap([kw1, kw2]);

    // Only update kw1's subtopic
    const updates = new Map([['st-1', 0.8]]);
    const result = computeLocalKeywordMastery(map, updates);

    // kw2 should be the exact same object reference (immutable optimization)
    expect(result.get('kw2')).toBe(map.get('kw2'));
    // kw1 should be a new object
    expect(result.get('kw1')).not.toBe(map.get('kw1'));
  });

  it('correctly recalculates isMastered and subtopicsMastered', () => {
    const sub1 = makeSubtopic({
      id: 'st-1', keyword_id: 'kw1', p_know: 0.3, hasData: true, isMastered: false,
    });
    const sub2 = makeSubtopic({
      id: 'st-2', keyword_id: 'kw1', p_know: 0.4, hasData: true, isMastered: false,
    });

    const kw = makeKeyword({
      keyword_id: 'kw1',
      mastery: 0.35,
      subtopics: [sub1, sub2],
    });
    const map = buildMap([kw]);

    // Push both above threshold
    const updates = new Map([['st-1', 0.8], ['st-2', 0.9]]);
    const result = computeLocalKeywordMastery(map, updates);

    const updated = result.get('kw1')!;
    expect(updated.mastery).toBeCloseTo(0.85, 5);
    expect(updated.isMastered).toBe(true);
    expect(updated.subtopicsMastered).toBe(2);
    expect(updated.subtopicsTotal).toBe(2);
  });

  it('handles keyword with no subtopics (mastery stays -1)', () => {
    const kw = makeKeyword({
      keyword_id: 'kw1',
      mastery: -1,
      subtopics: [],
    });
    const map = buildMap([kw]);

    // Update references a subtopic that does not belong to this keyword
    const updates = new Map([['st-nonexistent', 0.9]]);
    const result = computeLocalKeywordMastery(map, updates);

    // No change -- keyword has no subtopics to match
    expect(result.get('kw1')).toBe(map.get('kw1'));
  });
});
