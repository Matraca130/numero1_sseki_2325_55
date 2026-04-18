/**
 * useKeywordMastery.test.ts — Tests for the keyword-level mastery hook.
 *
 * SISTEMA C (MASTERY-SYSTEMS.md): this hook consumes StudyQueueItem[]
 * (which carries `p_know` per card), groups by keyword_id, averages p_know,
 * and classifies via `getKeywordDeltaColorSafe(avg, priority=1)` →
 * threshold 0.70 (low priority default).
 *
 * Delta thresholds in use (all default priority 1 → threshold 0.70):
 *   delta = avg_p_know / 0.70
 *     < 0.50   → gray   (avg < 0.35)
 *     >= 0.50  → red    (avg >= 0.35)
 *     >= 0.85  → yellow (avg >= 0.595)
 *     >= 1.00  → green  (avg >= 0.70)
 *     >= 1.10  → blue   (avg >= 0.77)
 *   (delta rounded to 2 decimals before comparing)
 *
 * Coverage:
 *   - masteryMap construction (avg p_know + delta level per keyword)
 *   - getMastery / getPKnow for known + unknown keywords
 *   - getStats aggregation across mixed masteries
 *   - getSortedEntries ordering (weakest first by pKnow)
 *   - empty input → empty stats
 *   - loading is passed through verbatim
 *   - masteryConfig exports one entry per DeltaColorLevel
 *
 * RUN: npx vitest run src/app/hooks/__tests__/useKeywordMastery.test.ts
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';
import {
  useKeywordMastery,
  masteryConfig,
} from '@/app/hooks/useKeywordMastery';

// ── Fixture helpers ───────────────────────────────────────

function makeItem(
  keyword_id: string,
  p_know: number,
  overrides: Partial<StudyQueueItem> = {},
): StudyQueueItem {
  return {
    flashcard_id: `fc-${keyword_id}-${p_know}`,
    summary_id: 'sum-1',
    keyword_id,
    subtopic_id: `sub-${keyword_id}`,
    front: 'Q',
    back: 'A',
    front_image_url: null,
    back_image_url: null,
    need_score: 0.5,
    retention: 0.8,
    mastery_color: 'green',
    p_know,
    fsrs_state: 'review',
    due_at: null,
    stability: 10,
    difficulty: 5,
    is_new: false,
    is_leech: false,
    consecutive_lapses: 0,
    clinical_priority: 0,
    ...overrides,
  };
}

function buildByKeyword(
  groups: Record<string, number[]>,
): Map<string, StudyQueueItem[]> {
  const map = new Map<string, StudyQueueItem[]>();
  for (const [kw, scores] of Object.entries(groups)) {
    map.set(kw, scores.map((s) => makeItem(kw, s)));
  }
  return map;
}

// ─────────────────────────────────────────────────────────
// Suite 1: empty input
// ─────────────────────────────────────────────────────────

describe('useKeywordMastery', () => {
  describe('when input Map is empty', () => {
    it('returns an empty masteryMap', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(new Map(), false),
      );
      expect(result.current.masteryMap.size).toBe(0);
    });

    it('getStats returns all zeros', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(new Map(), false),
      );
      const stats = result.current.getStats();
      expect(stats).toEqual({
        gray: 0,
        red: 0,
        yellow: 0,
        green: 0,
        blue: 0,
        total: 0,
      });
    });

    it('getSortedEntries returns an empty array', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(new Map(), false),
      );
      expect(result.current.getSortedEntries()).toEqual([]);
    });

    it('getMastery / getPKnow return null for any keyword', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(new Map(), false),
      );
      expect(result.current.getMastery('whatever')).toBeNull();
      expect(result.current.getPKnow('whatever')).toBeNull();
    });

    it('propagates loading=true verbatim', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(new Map(), true),
      );
      expect(result.current.loading).toBe(true);
    });

    it('propagates loading=false verbatim', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(new Map(), false),
      );
      expect(result.current.loading).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────
  // Suite 2: single keyword, avg + classification
  // ─────────────────────────────────────────────────────────

  describe('single keyword with multiple cards', () => {
    it('computes avg(p_know) across cards', () => {
      // avg = (0.6 + 0.8) / 2 = 0.70
      const input = buildByKeyword({ 'kw-A': [0.6, 0.8] });
      const { result } = renderHook(() => useKeywordMastery(input, false));
      const entry = result.current.masteryMap.get('kw-A')!;
      expect(entry.pKnow).toBeCloseTo(0.7, 10);
      expect(entry.cardCount).toBe(2);
      expect(entry.keywordId).toBe('kw-A');
    });

    it('classifies avg=0.70 as green (delta=1.00 at threshold 0.70)', () => {
      const input = buildByKeyword({ 'kw-A': [0.6, 0.8] });
      const { result } = renderHook(() => useKeywordMastery(input, false));
      expect(result.current.masteryMap.get('kw-A')!.mastery).toBe('green');
    });

    it('classifies avg=0.20 as gray (delta≈0.29 < 0.50)', () => {
      const input = buildByKeyword({ 'kw-low': [0.2] });
      const { result } = renderHook(() => useKeywordMastery(input, false));
      expect(result.current.masteryMap.get('kw-low')!.mastery).toBe('gray');
    });

    it('classifies avg=0.40 as red (delta≈0.57 ≥ 0.50)', () => {
      const input = buildByKeyword({ 'kw-red': [0.4] });
      const { result } = renderHook(() => useKeywordMastery(input, false));
      expect(result.current.masteryMap.get('kw-red')!.mastery).toBe('red');
    });

    it('classifies avg=0.60 as yellow (delta≈0.86 ≥ 0.85)', () => {
      const input = buildByKeyword({ 'kw-yellow': [0.6] });
      const { result } = renderHook(() => useKeywordMastery(input, false));
      expect(result.current.masteryMap.get('kw-yellow')!.mastery).toBe('yellow');
    });

    it('classifies avg=0.80 as blue (delta≈1.14 ≥ 1.10)', () => {
      const input = buildByKeyword({ 'kw-blue': [0.8] });
      const { result } = renderHook(() => useKeywordMastery(input, false));
      expect(result.current.masteryMap.get('kw-blue')!.mastery).toBe('blue');
    });

    it('classifies avg=1.00 as blue (delta≈1.43)', () => {
      const input = buildByKeyword({ 'kw-max': [1.0, 1.0, 1.0] });
      const { result } = renderHook(() => useKeywordMastery(input, false));
      expect(result.current.masteryMap.get('kw-max')!.mastery).toBe('blue');
    });

    it('classifies avg=0.00 as gray (delta = 0)', () => {
      const input = buildByKeyword({ 'kw-zero': [0.0] });
      const { result } = renderHook(() => useKeywordMastery(input, false));
      expect(result.current.masteryMap.get('kw-zero')!.mastery).toBe('gray');
    });
  });

  // ─────────────────────────────────────────────────────────
  // Suite 3: multiple keywords → aggregation
  // ─────────────────────────────────────────────────────────

  describe('aggregation across multiple keywords', () => {
    const MIX: Record<string, number[]> = {
      'kw-gray': [0.1, 0.2],           // avg 0.15 → gray
      'kw-red': [0.4, 0.4],            // avg 0.40 → red
      'kw-yellow': [0.6, 0.6],         // avg 0.60 → yellow
      'kw-green': [0.7, 0.7, 0.7],     // avg 0.70 → green
      'kw-blue': [0.9, 0.9],           // avg 0.90 → blue
    };

    it('masteryMap contains every keyword', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(buildByKeyword(MIX), false),
      );
      expect(result.current.masteryMap.size).toBe(5);
      for (const kw of Object.keys(MIX)) {
        expect(result.current.masteryMap.has(kw)).toBe(true);
      }
    });

    it('getStats counts one keyword per bucket', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(buildByKeyword(MIX), false),
      );
      expect(result.current.getStats()).toEqual({
        gray: 1,
        red: 1,
        yellow: 1,
        green: 1,
        blue: 1,
        total: 5,
      });
    });

    it('getSortedEntries orders by pKnow ascending (weakest first)', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(buildByKeyword(MIX), false),
      );
      const sorted = result.current.getSortedEntries();
      const ids = sorted.map((e) => e.keywordId);
      expect(ids).toEqual([
        'kw-gray',
        'kw-red',
        'kw-yellow',
        'kw-green',
        'kw-blue',
      ]);
    });

    it('getMastery returns the correct level for a known keyword', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(buildByKeyword(MIX), false),
      );
      expect(result.current.getMastery('kw-blue')).toBe('blue');
      expect(result.current.getMastery('kw-gray')).toBe('gray');
    });

    it('getMastery returns null for an unknown keyword', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(buildByKeyword(MIX), false),
      );
      expect(result.current.getMastery('kw-does-not-exist')).toBeNull();
    });

    it('getPKnow returns the avg for a known keyword', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(buildByKeyword(MIX), false),
      );
      expect(result.current.getPKnow('kw-yellow')).toBeCloseTo(0.6, 10);
    });

    it('getPKnow returns null for an unknown keyword', () => {
      const { result } = renderHook(() =>
        useKeywordMastery(buildByKeyword(MIX), false),
      );
      expect(result.current.getPKnow('kw-missing')).toBeNull();
    });

    it('same keyword appearing multiple times is averaged once (single entry)', () => {
      // Users must come in pre-indexed by useStudyQueueData; we verify the
      // hook honors the indexed shape (one entry per key).
      const input = buildByKeyword({ 'kw-dup': [0.2, 0.4, 0.6, 0.8] });
      const { result } = renderHook(() => useKeywordMastery(input, false));
      expect(result.current.masteryMap.size).toBe(1);
      const entry = result.current.masteryMap.get('kw-dup')!;
      expect(entry.cardCount).toBe(4);
      // avg = 0.50 → delta 0.71 → red
      expect(entry.pKnow).toBeCloseTo(0.5, 10);
      expect(entry.mastery).toBe('red');
    });
  });

  // ─────────────────────────────────────────────────────────
  // Suite 4: memoization stability
  // ─────────────────────────────────────────────────────────

  describe('memoization', () => {
    it('masteryMap is stable across re-renders with the same input', () => {
      const input = buildByKeyword({ 'kw-A': [0.5] });
      const { result, rerender } = renderHook(
        ({ m, l }: { m: Map<string, StudyQueueItem[]>; l: boolean }) =>
          useKeywordMastery(m, l),
        { initialProps: { m: input, l: false } },
      );
      const firstMap = result.current.masteryMap;
      rerender({ m: input, l: false });
      expect(result.current.masteryMap).toBe(firstMap);
    });

    it('masteryMap is rebuilt when input reference changes', () => {
      const input1 = buildByKeyword({ 'kw-A': [0.5] });
      const input2 = buildByKeyword({ 'kw-A': [0.5] });
      const { result, rerender } = renderHook(
        ({ m }: { m: Map<string, StudyQueueItem[]> }) =>
          useKeywordMastery(m, false),
        { initialProps: { m: input1 } },
      );
      const firstMap = result.current.masteryMap;
      rerender({ m: input2 });
      expect(result.current.masteryMap).not.toBe(firstMap);
    });
  });

  // ─────────────────────────────────────────────────────────
  // Suite 5: masteryConfig export
  // ─────────────────────────────────────────────────────────

  describe('masteryConfig export', () => {
    it('contains one entry per delta level', () => {
      const levels = Object.keys(masteryConfig).sort();
      expect(levels).toEqual(['blue', 'gray', 'green', 'red', 'yellow']);
    });

    it('each entry has label / color / bg / border / description as strings', () => {
      for (const level of ['gray', 'red', 'yellow', 'green', 'blue'] as const) {
        const cfg = masteryConfig[level];
        expect(typeof cfg.label).toBe('string');
        expect(typeof cfg.color).toBe('string');
        expect(typeof cfg.bg).toBe('string');
        expect(typeof cfg.border).toBe('string');
        expect(typeof cfg.description).toBe('string');
      }
    });

    it('label is the Spanish localized delta label', () => {
      // Spot-check the canonical mapping without reasserting helper logic.
      expect(masteryConfig.gray.label).toBe('Por descubrir');
      expect(masteryConfig.blue.label).toBe('Maestría');
    });
  });
});
