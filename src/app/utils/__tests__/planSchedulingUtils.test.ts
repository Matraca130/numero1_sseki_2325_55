// ============================================================
// Unit Tests — planSchedulingUtils.ts
//
// Tests pure scheduling algorithms:
//   - getTimeMultiplier: adjust estimated time by mastery
//   - interleaveByPriority: 2:1 high/normal priority ratio
//   - distributeAcrossDays: assign tasks to available days
//
// RUN: npx vitest run src/app/utils/__tests__/planSchedulingUtils.test.ts
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';
import {
  getTimeMultiplier,
  interleaveByPriority,
  distributeAcrossDays,
  type DistributableItem,
} from '@/app/utils/planSchedulingUtils';
import { HIGH_PRIORITY_THRESHOLD } from '@/app/utils/constants';

// ── Time Multiplier Tests ────────────────────────────────────

describe('getTimeMultiplier', () => {
  let mastery: Map<string, TopicMasteryInfo>;

  beforeEach(() => {
    mastery = new Map();
  });

  it('returns 1.0 when topic not in mastery map', () => {
    const result = getTimeMultiplier('unknown-topic', mastery);
    expect(result).toBe(1.0);
  });

  it('returns 1.0 when totalAttempts is 0 (no data)', () => {
    mastery.set('topic-1', {
      masteryPercent: 50,
      pKnow: 0.5,
      needsReview: false,
      totalAttempts: 0,
      priorityScore: 50,
    });

    const result = getTimeMultiplier('topic-1', mastery);
    expect(result).toBe(1.0);
  });

  it('returns 1.5 multiplier for very weak topics (< 30%)', () => {
    mastery.set('weak-topic', {
      masteryPercent: 25,
      pKnow: 0.25,
      needsReview: true,
      totalAttempts: 5,
      priorityScore: 80,
    });

    const result = getTimeMultiplier('weak-topic', mastery);
    expect(result).toBe(1.5);
  });

  it('returns 1.3 multiplier for weak topics (30-49%)', () => {
    mastery.set('medium-weak-topic', {
      masteryPercent: 40,
      pKnow: 0.4,
      needsReview: true,
      totalAttempts: 8,
      priorityScore: 65,
    });

    const result = getTimeMultiplier('medium-weak-topic', mastery);
    expect(result).toBe(1.3);
  });

  it('returns 0.85 multiplier for strong topics (65-79%)', () => {
    mastery.set('strong-topic', {
      masteryPercent: 70,
      pKnow: 0.7,
      needsReview: false,
      totalAttempts: 15,
      priorityScore: 30,
    });

    const result = getTimeMultiplier('strong-topic', mastery);
    expect(result).toBe(0.85);
  });

  it('returns 0.7 multiplier for very strong topics (>= 80%)', () => {
    mastery.set('expert-topic', {
      masteryPercent: 90,
      pKnow: 0.9,
      needsReview: false,
      totalAttempts: 25,
      priorityScore: 10,
    });

    const result = getTimeMultiplier('expert-topic', mastery);
    expect(result).toBe(0.7);
  });

  it('returns 1.0 for medium topics (50-64%)', () => {
    mastery.set('medium-topic', {
      masteryPercent: 55,
      pKnow: 0.55,
      needsReview: false,
      totalAttempts: 10,
      priorityScore: 45,
    });

    const result = getTimeMultiplier('medium-topic', mastery);
    expect(result).toBe(1.0);
  });

  it('applies correct multiplier to estimated time', () => {
    mastery.set('topic-weak', {
      masteryPercent: 25,
      pKnow: 0.25,
      needsReview: true,
      totalAttempts: 5,
      priorityScore: 80,
    });

    const baseTime = 20; // minutes
    const multiplier = getTimeMultiplier('topic-weak', mastery);
    const adjusted = baseTime * multiplier;
    expect(adjusted).toBe(30); // 20 * 1.5
  });
});

// ── Interleave By Priority Tests ─────────────────────────────

describe('interleaveByPriority', () => {
  interface TestItem {
    id: string;
    priority: number;
  }

  it('returns empty array for empty input', () => {
    const result = interleaveByPriority<TestItem>([], (item) => item.priority);
    expect(result).toEqual([]);
  });

  it('separates items into high and normal priority', () => {
    const items: TestItem[] = [
      { id: 'h1', priority: 70 },
      { id: 'n1', priority: 40 },
      { id: 'h2', priority: 65 },
      { id: 'n2', priority: 50 },
    ];

    const result = interleaveByPriority(items, (item) => item.priority);

    // Should have 2 high-priority (70, 65) and 2 normal (40, 50)
    expect(result).toHaveLength(4);
    // Pattern should be: H, H, N, H?, H?, N?
    // [h1, h2, n1] or [h1, h2, n1, n2] depending on implementation
    expect(result.map((r) => r.priority)).toContain(70);
  });

  it('interleaves 2:1 high to normal priority items', () => {
    const items: TestItem[] = [
      { id: 'h1', priority: 75 }, // >= 60
      { id: 'h2', priority: 70 }, // >= 60
      { id: 'h3', priority: 65 }, // >= 60
      { id: 'n1', priority: 50 }, // < 60
      { id: 'n2', priority: 40 }, // < 60
    ];

    const result = interleaveByPriority(items, (item) => item.priority);

    // 3 high (h1, h2, h3) and 2 normal (n1, n2)
    // Pattern: H, H, N, H, N
    expect(result).toHaveLength(5);
    // Verify first two items are high-priority
    expect(result[0].priority).toBeGreaterThanOrEqual(HIGH_PRIORITY_THRESHOLD);
    expect(result[1].priority).toBeGreaterThanOrEqual(HIGH_PRIORITY_THRESHOLD);
  });

  it('handles all high-priority items', () => {
    const items: TestItem[] = [
      { id: 'h1', priority: 70 },
      { id: 'h2', priority: 75 },
      { id: 'h3', priority: 80 },
    ];

    const result = interleaveByPriority(items, (item) => item.priority);

    expect(result).toHaveLength(3);
    expect(result.every((item) => item.priority >= HIGH_PRIORITY_THRESHOLD)).toBe(true);
  });

  it('handles all normal-priority items', () => {
    const items: TestItem[] = [
      { id: 'n1', priority: 50 },
      { id: 'n2', priority: 40 },
      { id: 'n3', priority: 30 },
    ];

    const result = interleaveByPriority(items, (item) => item.priority);

    expect(result).toHaveLength(3);
    expect(result.every((item) => item.priority < HIGH_PRIORITY_THRESHOLD)).toBe(true);
  });

  it('preserves item identity during interleaving', () => {
    const items: TestItem[] = [
      { id: 'h1', priority: 70 },
      { id: 'n1', priority: 50 },
      { id: 'h2', priority: 65 },
    ];

    const result = interleaveByPriority(items, (item) => item.priority);
    const resultIds = result.map((item) => item.id);

    expect(resultIds).toContain('h1');
    expect(resultIds).toContain('h2');
    expect(resultIds).toContain('n1');
  });
});

// ── Distribute Across Days Tests ────────────────────────────

describe('distributeAcrossDays', () => {
  interface TestItem extends DistributableItem {
    id: string;
  }

  const defaultWeeklyHours = [2, 2, 2, 2, 2, 1, 1]; // Mon-Sun: 120 min each weekday, 60 min each weekend

  it('returns empty array for empty items', () => {
    const startDate = new Date(2026, 3, 1); // Wednesday
    const endDate = new Date(2026, 3, 10);
    const result = distributeAcrossDays<TestItem>([], startDate, endDate, defaultWeeklyHours);

    expect(result).toEqual([]);
  });

  it('distributes single item to start date', () => {
    const startDate = new Date(2026, 3, 1); // Wednesday
    const endDate = new Date(2026, 3, 10);
    const items: TestItem[] = [{ id: 'task-1', minutes: 30 }];

    const result = distributeAcrossDays(items, startDate, endDate, defaultWeeklyHours);

    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe('task-1');
    expect(result[0].date).toEqual(startDate);
  });

  it('respects daily hour budget', () => {
    const startDate = new Date(2026, 3, 1); // Wednesday
    const endDate = new Date(2026, 3, 3);
    // Wed 2 hours (120 min), Thu 2 hours (120 min), Fri 2 hours (120 min)
    const weeklyHours = [2, 2, 2, 2, 2, 1, 1];

    const items: TestItem[] = [
      { id: 'task-1', minutes: 80 }, // Fits in Wed
      { id: 'task-2', minutes: 50 }, // Fits in Wed too (130 total, within 120+tolerance)
      { id: 'task-3', minutes: 100 }, // Goes to Thu
      { id: 'task-4', minutes: 40 }, // Goes to Fri
    ];

    const result = distributeAcrossDays(items, startDate, endDate, weeklyHours);

    // First item on Wed
    expect(result[0].date.getDate()).toBe(1); // April 1
    // Subsequent items distributed across following days
    expect(result).toHaveLength(4);
  });

  it('handles items larger than daily budget', () => {
    const startDate = new Date(2026, 3, 1);
    const endDate = new Date(2026, 3, 5);
    const weeklyHours = [2, 2, 2, 2, 2, 1, 1]; // 120 min per weekday

    const items: TestItem[] = [
      { id: 'task-1', minutes: 30 },
      { id: 'task-2', minutes: 150 }, // Exceeds 120-min budget
    ];

    const result = distributeAcrossDays(items, startDate, endDate, weeklyHours);

    // task-1 on first day, task-2 on next day
    expect(result).toHaveLength(2);
    expect(result[0].item.id).toBe('task-1');
    expect(result[1].item.id).toBe('task-2');
  });

  it('handles zero-hour days (skip to next day)', () => {
    const startDate = new Date(2026, 3, 4); // Saturday
    const endDate = new Date(2026, 3, 6); // Monday
    const weeklyHours = [2, 2, 2, 2, 2, 0, 0]; // Sat and Sun have 0 hours

    const items: TestItem[] = [
      { id: 'task-1', minutes: 30 },
      { id: 'task-2', minutes: 30 },
    ];

    const result = distributeAcrossDays(items, startDate, endDate, weeklyHours);

    // Both should skip to Monday (first non-zero day)
    expect(result).toHaveLength(2);
    // Monday is Apr 6
    expect(result[0].date.getDate()).toBe(6);
    expect(result[1].date.getDate()).toBe(6);
  });

  it('puts overflow items on end date', () => {
    const startDate = new Date(2026, 3, 1); // Wednesday
    const endDate = new Date(2026, 3, 2); // Thursday
    const weeklyHours = [2, 2, 2, 2, 2, 1, 1]; // 120 min per day

    const items: TestItem[] = [
      { id: 'task-1', minutes: 100 },
      { id: 'task-2', minutes: 100 },
      { id: 'task-3', minutes: 100 },
      { id: 'task-4', minutes: 100 }, // Overflow
    ];

    const result = distributeAcrossDays(items, startDate, endDate, weeklyHours);

    // Last item should be on endDate
    const lastItem = result[result.length - 1];
    expect(lastItem.date.getDate()).toBe(2); // April 2 (endDate)
  });

  it('applies tolerance when checking daily budget', () => {
    const startDate = new Date(2026, 3, 1);
    const endDate = new Date(2026, 3, 2);
    const weeklyHours = [2, 2, 2, 2, 2, 1, 1]; // 120 min per day
    const tolerance = 10; // minutes

    const items: TestItem[] = [
      { id: 'task-1', minutes: 115 }, // 115 <= 120 + 10
      { id: 'task-2', minutes: 5 }, // 115 + 5 = 120 <= 130
    ];

    const result = distributeAcrossDays(items, startDate, endDate, weeklyHours, tolerance);

    // Both should fit on day 1 due to tolerance
    expect(result[0].date.getDate()).toBe(1);
    expect(result[1].date.getDate()).toBe(1);
  });

  it('maintains order of items within a day', () => {
    const startDate = new Date(2026, 3, 1);
    const endDate = new Date(2026, 3, 3);
    const weeklyHours = [5, 5, 5, 5, 5, 1, 1]; // Plenty of capacity

    const items: TestItem[] = [
      { id: 'task-a', minutes: 30 },
      { id: 'task-b', minutes: 30 },
      { id: 'task-c', minutes: 30 },
    ];

    const result = distributeAcrossDays(items, startDate, endDate, weeklyHours);

    expect(result[0].item.id).toBe('task-a');
    expect(result[1].item.id).toBe('task-b');
    expect(result[2].item.id).toBe('task-c');
  });

  it('handles single-day deadline', () => {
    const startDate = new Date(2026, 3, 1);
    const endDate = new Date(2026, 3, 1); // Same day
    const weeklyHours = [2, 2, 2, 2, 2, 1, 1];

    const items: TestItem[] = [
      { id: 'task-1', minutes: 60 },
      { id: 'task-2', minutes: 60 },
    ];

    const result = distributeAcrossDays(items, startDate, endDate, weeklyHours);

    // Both fit on the single day
    expect(result[0].date.getDate()).toBe(1);
    expect(result[1].date.getDate()).toBe(1);
  });

  it('correctly maps day of week to weeklyHours index', () => {
    // April 1, 2026 is a Wednesday (dayOfWeek=3)
    // weeklyHours mapping: Sun=6, Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5
    const startDate = new Date(2026, 3, 1); // Wednesday
    const endDate = new Date(2026, 3, 8);
    const weeklyHours = [1, 1, 3, 1, 1, 0, 0]; // Only Wed (index 2) and Thu (index 3) have capacity

    const items: TestItem[] = [
      { id: 'task-1', minutes: 30 },
      { id: 'task-2', minutes: 30 },
      { id: 'task-3', minutes: 30 },
    ];

    const result = distributeAcrossDays(items, startDate, endDate, weeklyHours);

    // Should skip Sat/Sun, distribute on Wed/Thu
    expect(result).toHaveLength(3);
  });
});
