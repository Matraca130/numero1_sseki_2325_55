// ============================================================
// TEST: flashcard-types.ts — Pure utilities & constants
//
// Covers: getMasteryStats, filterCardsByMastery, GRADES, RATINGS
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  getMasteryStats,
  filterCardsByMastery,
  GRADES,
  RATINGS,
} from '../flashcard-types';
import type { Flashcard } from '@/app/types/content';

// ── Test helpers ─────────────────────────────────────────

function makeCard(mastery: number, id?: string): Flashcard {
  return {
    id: id || `card-${mastery}`,
    front: 'Q',
    back: 'A',
    question: 'Q',
    answer: 'A',
    mastery,
    summary_id: 's1',
  } as Flashcard;
}

// ── GRADES & RATINGS constants ────────────────────────────

describe('GRADES constant (FSRS 1-4)', () => {
  it('should have exactly 4 grades', () => {
    expect(GRADES).toHaveLength(4);
  });

  it('should have values 1, 2, 3, 4', () => {
    expect(GRADES.map(g => g.value)).toEqual([1, 2, 3, 4]);
  });

  it('each grade should have label, color, and desc', () => {
    for (const grade of GRADES) {
      expect(grade.label).toBeTruthy();
      expect(grade.color).toBeTruthy();
      expect(grade.desc).toBeTruthy();
    }
  });
});

describe('RATINGS constant (SM-2 1-5)', () => {
  it('should have exactly 5 ratings', () => {
    expect(RATINGS).toHaveLength(5);
  });

  it('should have values 1, 2, 3, 4, 5', () => {
    expect(RATINGS.map(r => r.value)).toEqual([1, 2, 3, 4, 5]);
  });
});

// ── getMasteryStats ──────────────────────────────────────

describe('getMasteryStats', () => {
  it('should return zeros for empty array', () => {
    const stats = getMasteryStats([]);
    expect(stats.avg).toBe(0);
    expect(stats.pct).toBe(0);
    expect(stats.mastered).toBe(0);
    expect(stats.learning).toBe(0);
    expect(stats.newCards).toBe(0);
  });

  it('should classify cards: new (mastery <= 2), learning (3), mastered (>= 4)', () => {
    const cards = [
      makeCard(0, 'new1'),    // new
      makeCard(1, 'new2'),    // new
      makeCard(2, 'new3'),    // new
      makeCard(3, 'learn1'),  // learning
      makeCard(4, 'mast1'),   // mastered
      makeCard(5, 'mast2'),   // mastered
    ];
    const stats = getMasteryStats(cards);
    expect(stats.newCards).toBe(3);
    expect(stats.learning).toBe(1);
    expect(stats.mastered).toBe(2);
  });

  it('should compute correct average and percentage', () => {
    // Cards with mastery [2, 4] → avg = 3 → pct = (3/5)*100 = 60
    const cards = [makeCard(2, 'a'), makeCard(4, 'b')];
    const stats = getMasteryStats(cards);
    expect(stats.avg).toBe(3);
    expect(stats.pct).toBe(60);
  });

  it('should handle all-mastered scenario', () => {
    const cards = [makeCard(5, 'a'), makeCard(5, 'b'), makeCard(4, 'c')];
    const stats = getMasteryStats(cards);
    expect(stats.mastered).toBe(3);
    expect(stats.learning).toBe(0);
    expect(stats.newCards).toBe(0);
  });

  it('should handle all-new scenario', () => {
    const cards = [makeCard(0, 'a'), makeCard(1, 'b')];
    const stats = getMasteryStats(cards);
    expect(stats.mastered).toBe(0);
    expect(stats.learning).toBe(0);
    expect(stats.newCards).toBe(2);
  });
});

// ── filterCardsByMastery ──────────────────────────────────

describe('filterCardsByMastery', () => {
  const cards = [
    makeCard(0, 'new1'),    // new (mastery <= 2)
    makeCard(1, 'new2'),    // new
    makeCard(2, 'new3'),    // new
    makeCard(3, 'learn1'),  // learning (mastery === 3)
    makeCard(4, 'mast1'),   // mastered (mastery >= 4)
    makeCard(5, 'mast2'),   // mastered
  ];

  it('"all" should return all cards', () => {
    expect(filterCardsByMastery(cards, 'all')).toHaveLength(6);
  });

  it('"new" should return cards with mastery <= 2', () => {
    const result = filterCardsByMastery(cards, 'new');
    expect(result).toHaveLength(3);
    expect(result.every(c => c.mastery <= 2)).toBe(true);
  });

  it('"learning" should return cards with mastery === 3', () => {
    const result = filterCardsByMastery(cards, 'learning');
    expect(result).toHaveLength(1);
    expect(result[0].mastery).toBe(3);
  });

  it('"mastered" should return cards with mastery >= 4', () => {
    const result = filterCardsByMastery(cards, 'mastered');
    expect(result).toHaveLength(2);
    expect(result.every(c => c.mastery >= 4)).toBe(true);
  });

  it('should return empty array when no cards match filter', () => {
    const newOnly = [makeCard(0, 'a'), makeCard(1, 'b')];
    expect(filterCardsByMastery(newOnly, 'mastered')).toHaveLength(0);
    expect(filterCardsByMastery(newOnly, 'learning')).toHaveLength(0);
  });
});
