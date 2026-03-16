// ============================================================
// TEST: mastery-helpers.ts — BKT mastery visual functions
//
// Used by: KeywordCard, TopicProgress, SummaryView,
//          FlashcardReviewer, DeckScreen, StudyHubView
//
// All pure functions, zero mocks.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  getMasteryColor,
  getSafeMasteryColor,
  getMasteryLabel,
  getKeywordMastery,
  getMasteryTailwind,
} from '../mastery-helpers';
import type { MasteryColor, BktState } from '../mastery-helpers';

// ── helpers ───────────────────────────────────────────────

function makeBkt(pKnow: number, subtopicId?: string): BktState {
  return {
    subtopic_id: subtopicId ?? `sub-${pKnow}`,
    p_know: pKnow,
    total_attempts: 1,
  };
}

// ── getMasteryColor ───────────────────────────────────────

describe('getMasteryColor', () => {
  it('p_know >= 0.80 → green', () => {
    expect(getMasteryColor(0.80)).toBe('green');
    expect(getMasteryColor(0.95)).toBe('green');
    expect(getMasteryColor(1.00)).toBe('green');
  });

  it('p_know >= 0.50 and < 0.80 → yellow', () => {
    expect(getMasteryColor(0.50)).toBe('yellow');
    expect(getMasteryColor(0.65)).toBe('yellow');
    expect(getMasteryColor(0.79)).toBe('yellow');
  });

  it('p_know < 0.50 → red', () => {
    expect(getMasteryColor(0.49)).toBe('red');
    expect(getMasteryColor(0.10)).toBe('red');
    expect(getMasteryColor(0.00)).toBe('red');
  });

  // Boundary precision
  it('boundary: 0.7999 → yellow, 0.8000 → green', () => {
    expect(getMasteryColor(0.7999)).toBe('yellow');
    expect(getMasteryColor(0.8000)).toBe('green');
  });

  it('boundary: 0.4999 → red, 0.5000 → yellow', () => {
    expect(getMasteryColor(0.4999)).toBe('red');
    expect(getMasteryColor(0.5000)).toBe('yellow');
  });
});

// ── getSafeMasteryColor ───────────────────────────────────

describe('getSafeMasteryColor', () => {
  it('negative sentinel -1 → gray', () => {
    expect(getSafeMasteryColor(-1)).toBe('gray');
  });

  it('any negative value → gray', () => {
    expect(getSafeMasteryColor(-0.5)).toBe('gray');
    expect(getSafeMasteryColor(-100)).toBe('gray');
  });

  it('zero → delegates to getMasteryColor (red)', () => {
    expect(getSafeMasteryColor(0)).toBe('red');
  });

  it('positive values → delegates to getMasteryColor', () => {
    expect(getSafeMasteryColor(0.90)).toBe('green');
    expect(getSafeMasteryColor(0.60)).toBe('yellow');
    expect(getSafeMasteryColor(0.30)).toBe('red');
  });
});

// ── getMasteryLabel ───────────────────────────────────────

describe('getMasteryLabel', () => {
  it.each<[MasteryColor, string]>([
    ['green', 'Dominado'],
    ['yellow', 'Aprendiendo'],
    ['red', 'Debil'],
    ['gray', 'Sin datos'],
  ])('color "%s" → label "%s"', (color, label) => {
    expect(getMasteryLabel(color)).toBe(label);
  });
});

// ── getKeywordMastery ─────────────────────────────────────

describe('getKeywordMastery', () => {
  it('empty array → -1 (no data sentinel)', () => {
    expect(getKeywordMastery([])).toBe(-1);
  });

  it('single subtopic → returns its p_know', () => {
    expect(getKeywordMastery([makeBkt(0.75)])).toBe(0.75);
  });

  it('multiple subtopics → returns average', () => {
    const bkts = [makeBkt(0.80, 'a'), makeBkt(0.60, 'b')];
    expect(getKeywordMastery(bkts)).toBeCloseTo(0.70, 5);
  });

  it('all zero → returns 0', () => {
    const bkts = [makeBkt(0, 'a'), makeBkt(0, 'b')];
    expect(getKeywordMastery(bkts)).toBe(0);
  });

  it('all perfect → returns 1', () => {
    const bkts = [makeBkt(1, 'a'), makeBkt(1, 'b'), makeBkt(1, 'c')];
    expect(getKeywordMastery(bkts)).toBe(1);
  });
});

// ── getMasteryTailwind ────────────────────────────────────

describe('getMasteryTailwind', () => {
  const ALL_COLORS: MasteryColor[] = ['green', 'yellow', 'red', 'gray'];

  it('returns object with bg, text, ring, bgLight, textDark for every color', () => {
    for (const color of ALL_COLORS) {
      const tw = getMasteryTailwind(color);
      expect(tw.bg).toBeTruthy();
      expect(tw.text).toBeTruthy();
      expect(tw.ring).toBeTruthy();
      expect(tw.bgLight).toBeTruthy();
      expect(tw.textDark).toBeTruthy();
    }
  });

  it('green uses emerald classes', () => {
    const tw = getMasteryTailwind('green');
    expect(tw.bg).toContain('emerald');
    expect(tw.text).toContain('emerald');
  });

  it('yellow uses amber classes', () => {
    const tw = getMasteryTailwind('yellow');
    expect(tw.bg).toContain('amber');
    expect(tw.text).toContain('amber');
  });

  it('red uses red classes', () => {
    const tw = getMasteryTailwind('red');
    expect(tw.bg).toContain('red');
  });

  it('gray uses zinc classes', () => {
    const tw = getMasteryTailwind('gray');
    expect(tw.bg).toContain('zinc');
  });

  it('all classes start with valid Tailwind prefix', () => {
    for (const color of ALL_COLORS) {
      const tw = getMasteryTailwind(color);
      expect(tw.bg).toMatch(/^bg-/);
      expect(tw.text).toMatch(/^text-/);
      expect(tw.ring).toMatch(/^ring-/);
    }
  });
});
