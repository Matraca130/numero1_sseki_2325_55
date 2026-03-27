/**
 * Unit tests for scheduling-intelligence.ts
 *
 * Covers: orderByPrerequisites, balanceCognitiveLoad, interleaveWithinDays,
 * computeStudyMomentum, planExamCountdown, adjustTimeByDifficulty,
 * distributeReviewDates (via planExamCountdown), classifyDifficulty.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  classifyDifficulty,
  adjustTimeByDifficulty,
  orderByPrerequisites,
  balanceCognitiveLoad,
  interleaveWithinDays,
  computeStudyMomentum,
  planExamCountdown,
  type ScheduleTask,
  type ScheduleDay,
  type DifficultyTier,
} from '@/app/lib/scheduling-intelligence';

// ── Helpers ─────────────────────────────────────────────────────

function makeTask(overrides: Partial<ScheduleTask> & { topicId: string }): ScheduleTask {
  return {
    topicTitle: overrides.topicId,
    method: 'resumo',
    estimatedMinutes: 30,
    difficulty: 0.5,
    bloomLevel: 2,
    courseId: 'c1',
    courseName: 'Course 1',
    sectionTitle: 'Section 1',
    ...overrides,
  };
}

function makeDay(overrides: Partial<ScheduleDay> & { tasks: ScheduleTask[] }): ScheduleDay {
  return {
    date: new Date('2026-04-01'),
    availableMinutes: 120,
    cognitiveLoad: 0,
    ...overrides,
  };
}

// ── 1. orderByPrerequisites ─────────────────────────────────────

describe('orderByPrerequisites', () => {
  it('orders a normal DAG: A depends on B, B depends on C => C, B, A', () => {
    const topics = [
      { topicId: 'A', prerequisiteIds: ['B'] },
      { topicId: 'B', prerequisiteIds: ['C'] },
      { topicId: 'C', prerequisiteIds: [] },
    ];
    const result = orderByPrerequisites(topics);
    expect(result).toEqual(['C', 'B', 'A']);
  });

  it('returns all independent topics (no prerequisites) in any order', () => {
    const topics = [
      { topicId: 'X', prerequisiteIds: [] },
      { topicId: 'Y', prerequisiteIds: [] },
      { topicId: 'Z', prerequisiteIds: [] },
    ];
    const result = orderByPrerequisites(topics);
    expect(result).toHaveLength(3);
    expect(result).toContain('X');
    expect(result).toContain('Y');
    expect(result).toContain('Z');
  });

  it('handles cycle gracefully: A->B->C->A => all topics returned', () => {
    const topics = [
      { topicId: 'A', prerequisiteIds: ['C'] },
      { topicId: 'B', prerequisiteIds: ['A'] },
      { topicId: 'C', prerequisiteIds: ['B'] },
    ];
    const result = orderByPrerequisites(topics);
    expect(result).toHaveLength(3);
    expect(result).toContain('A');
    expect(result).toContain('B');
    expect(result).toContain('C');
  });

  it('handles self-reference: A->A => A is returned', () => {
    const topics = [{ topicId: 'A', prerequisiteIds: ['A'] }];
    const result = orderByPrerequisites(topics);
    expect(result).toEqual(['A']);
  });

  it('returns empty array for empty input', () => {
    const result = orderByPrerequisites([]);
    expect(result).toEqual([]);
  });

  it('returns single topic for single input', () => {
    const topics = [{ topicId: 'solo', prerequisiteIds: [] }];
    const result = orderByPrerequisites(topics);
    expect(result).toEqual(['solo']);
  });
});

// ── 2. balanceCognitiveLoad ─────────────────────────────────────

describe('balanceCognitiveLoad', () => {
  it('returns unchanged for single day with mixed difficulty', () => {
    const tasks = [
      makeTask({ topicId: 'hard1', difficulty: 0.9 }),
      makeTask({ topicId: 'easy1', difficulty: 0.1 }),
    ];
    const days = [makeDay({ tasks })];
    const result = balanceCognitiveLoad(days);
    expect(result).toHaveLength(1);
    // With only one day, no swaps are possible
    expect(result[0].tasks).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    const result = balanceCognitiveLoad([]);
    expect(result).toEqual([]);
  });

  it('swaps to equalize when one day is all-hard and neighbor is all-easy', () => {
    const hardTasks = [
      makeTask({ topicId: 'h1', difficulty: 0.9, estimatedMinutes: 30 }),
      makeTask({ topicId: 'h2', difficulty: 0.85, estimatedMinutes: 30 }),
      makeTask({ topicId: 'h3', difficulty: 0.8, estimatedMinutes: 30 }),
    ];
    const easyTasks = [
      makeTask({ topicId: 'e1', difficulty: 0.1, estimatedMinutes: 30 }),
      makeTask({ topicId: 'e2', difficulty: 0.15, estimatedMinutes: 30 }),
      makeTask({ topicId: 'e3', difficulty: 0.2, estimatedMinutes: 30 }),
    ];
    const days = [
      makeDay({ tasks: hardTasks, availableMinutes: 120 }),
      makeDay({ tasks: easyTasks, availableMinutes: 120 }),
    ];

    const result = balanceCognitiveLoad(days);

    // After balancing, the cognitive loads should be closer to each other
    const loadDifference = Math.abs(result[0].cognitiveLoad - result[1].cognitiveLoad);
    // The original difference was ~0.7; after swap it should be smaller
    const originalDiff = Math.abs(0.85 - 0.15); // rough
    expect(loadDifference).toBeLessThan(originalDiff);
  });
});

// ── 3. interleaveWithinDays (REGRESSION: fix 1b) ────────────────

describe('interleaveWithinDays', () => {
  it('does not skip any tier: hard, easy, medium all present in output', () => {
    const tasks = [
      makeTask({ topicId: 'h1', difficulty: 0.9 }),
      makeTask({ topicId: 'e1', difficulty: 0.1 }),
      makeTask({ topicId: 'm1', difficulty: 0.5 }),
      makeTask({ topicId: 'h2', difficulty: 0.8 }),
      makeTask({ topicId: 'e2', difficulty: 0.2 }),
      makeTask({ topicId: 'm2', difficulty: 0.4 }),
    ];
    const days = [makeDay({ tasks })];
    const result = interleaveWithinDays(days);

    const reordered = result[0].tasks;
    // All tasks present (none skipped)
    expect(reordered).toHaveLength(6);
    const ids = reordered.map(t => t.topicId);
    expect(ids).toContain('h1');
    expect(ids).toContain('h2');
    expect(ids).toContain('e1');
    expect(ids).toContain('e2');
    expect(ids).toContain('m1');
    expect(ids).toContain('m2');

    // Verify interleaving: check that all three tiers appear in output
    const tiers = reordered.map(t => classifyDifficulty(t.difficulty));
    expect(tiers).toContain('hard');
    expect(tiers).toContain('easy');
    expect(tiers).toContain('medium');
  });

  it('returns day unchanged when it has <= 2 tasks', () => {
    const tasks = [
      makeTask({ topicId: 't1', difficulty: 0.9 }),
      makeTask({ topicId: 't2', difficulty: 0.1 }),
    ];
    const days = [makeDay({ tasks })];
    const result = interleaveWithinDays(days);
    expect(result[0].tasks.map(t => t.topicId)).toEqual(['t1', 't2']);
  });

  it('returns tasks as-is when all are same tier (all hard)', () => {
    const tasks = [
      makeTask({ topicId: 'h1', difficulty: 0.9 }),
      makeTask({ topicId: 'h2', difficulty: 0.8 }),
      makeTask({ topicId: 'h3', difficulty: 0.7 }),
    ];
    const days = [makeDay({ tasks })];
    const result = interleaveWithinDays(days);
    // All tasks should still be present
    expect(result[0].tasks).toHaveLength(3);
    const ids = result[0].tasks.map(t => t.topicId);
    expect(ids).toContain('h1');
    expect(ids).toContain('h2');
    expect(ids).toContain('h3');
  });
});

// ── 4. computeStudyMomentum ─────────────────────────────────────

describe('computeStudyMomentum', () => {
  it('returns { score: 1.0, trend: "stable", streak: 0 } for empty sessions', () => {
    const result = computeStudyMomentum([]);
    expect(result).toEqual({ score: 1.0, trend: 'stable', streak: 0 });
  });

  it('handles sessions with scheduledMinutes=0 without division by zero', () => {
    const sessions = [
      { date: '2026-03-20', completed: true, scheduledMinutes: 0, actualMinutes: 30 },
      { date: '2026-03-21', completed: true, scheduledMinutes: 0, actualMinutes: 0 },
    ];
    const result = computeStudyMomentum(sessions);
    expect(result.score).toBeGreaterThanOrEqual(0.5);
    expect(result.score).toBeLessThanOrEqual(1.5);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it('returns high score for all completed sessions', () => {
    const sessions = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(18 + i).padStart(2, '0')}`,
      completed: true,
      scheduledMinutes: 60,
      actualMinutes: 60,
    }));
    const result = computeStudyMomentum(sessions);
    expect(result.score).toBeGreaterThanOrEqual(0.9);
    expect(result.streak).toBe(7);
  });

  it('returns low score (>= 0.5) for all incomplete sessions', () => {
    const sessions = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(18 + i).padStart(2, '0')}`,
      completed: false,
      scheduledMinutes: 60,
      actualMinutes: 5,
    }));
    const result = computeStudyMomentum(sessions);
    expect(result.score).toBeGreaterThanOrEqual(0.5);
    expect(result.score).toBeLessThan(0.9);
    expect(result.streak).toBe(0);
  });
});

// ── 5. planExamCountdown ────────────────────────────────────────

describe('planExamCountdown', () => {
  const sampleTopics = [
    {
      topicId: 't1',
      topicName: 'Topic 1',
      difficulty: 0.7,
      stability: 2,
      lastReviewDate: new Date('2026-03-10'),
      retrievability: 0.4,
    },
    {
      topicId: 't2',
      topicName: 'Topic 2',
      difficulty: 0.3,
      stability: 5,
      lastReviewDate: new Date('2026-03-15'),
      retrievability: 0.7,
    },
  ];

  it('returns plans with empty reviewDates for past exam date', () => {
    const pastExam = new Date('2026-03-01');
    const today = new Date('2026-03-25');
    const result = planExamCountdown(pastExam, sampleTopics, today);
    expect(result).toHaveLength(2);
    for (const plan of result) {
      expect(plan.reviewDates).toEqual([]);
    }
  });

  it('returns plans with empty reviewDates when exam is today', () => {
    const today = new Date('2026-03-25');
    const result = planExamCountdown(today, sampleTopics, today);
    expect(result).toHaveLength(2);
    for (const plan of result) {
      expect(plan.reviewDates).toEqual([]);
    }
  });

  it('returns empty array for NaN exam date', () => {
    const result = planExamCountdown(new Date('not-a-date'), sampleTopics);
    expect(result).toEqual([]);
  });

  it('generates review dates for normal case: exam in 14 days', () => {
    const today = new Date('2026-03-25');
    const examDate = new Date('2026-04-08');
    const result = planExamCountdown(examDate, sampleTopics, today);

    expect(result.length).toBeGreaterThan(0);
    for (const plan of result) {
      // All review dates should be between today and exam
      for (const rd of plan.reviewDates) {
        expect(rd.getTime()).toBeGreaterThan(today.getTime());
        expect(rd.getTime()).toBeLessThanOrEqual(examDate.getTime());
      }
      // priority should be a valid value
      expect(['critical', 'moderate', 'ready']).toContain(plan.priority);
    }
  });
});

// ── 6. adjustTimeByDifficulty ───────────────────────────────────

describe('adjustTimeByDifficulty', () => {
  it('clamps negative baseMinutes to 0', () => {
    const result = adjustTimeByDifficulty(-10, 0.5, 0);
    expect(result).toBe(0);
  });

  it('defaults to medium difficulty (0.5) when difficulty is null', () => {
    const withNull = adjustTimeByDifficulty(60, null, 0);
    const withHalf = adjustTimeByDifficulty(60, 0.5, 0);
    expect(withNull).toBe(withHalf);
  });

  it('reduces time for high mastery (90%)', () => {
    const highMastery = adjustTimeByDifficulty(60, 0.5, 90);
    const noMastery = adjustTimeByDifficulty(60, 0.5, 0);
    expect(highMastery).toBeLessThan(noMastery);
  });

  it('increases time for low mastery (10%)', () => {
    const lowMastery = adjustTimeByDifficulty(60, 0.5, 10);
    const midMastery = adjustTimeByDifficulty(60, 0.5, 50);
    expect(lowMastery).toBeGreaterThan(midMastery);
  });
});

// ── 7. distributeReviewDates (via planExamCountdown) REGRESSION: fix 1a ──

describe('distributeReviewDates (expanding spacing)', () => {
  it('earlier reviews have smaller gaps than later ones', () => {
    const today = new Date('2026-03-25');
    const examDate = new Date('2026-04-25'); // 31 days out, plenty of room
    const topics = [
      {
        topicId: 'r1',
        topicName: 'Review Topic',
        difficulty: 0.7,
        stability: 1,          // low stability forces multiple reviews
        lastReviewDate: new Date('2026-03-10'),
        retrievability: 0.2,   // low retrievability
      },
    ];
    const result = planExamCountdown(examDate, topics, today);
    expect(result).toHaveLength(1);

    const dates = result[0].reviewDates;
    if (dates.length >= 3) {
      // Compute gaps between consecutive review dates
      const gaps: number[] = [];
      for (let i = 1; i < dates.length; i++) {
        const gap = Math.round(
          (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24),
        );
        gaps.push(gap);
      }
      // Expanding spacing: later gaps should be >= earlier gaps
      for (let i = 1; i < gaps.length; i++) {
        expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1]);
      }
    }
  });

  it('single review is placed near lastReviewGap before exam', () => {
    const today = new Date('2026-03-25');
    const examDate = new Date('2026-04-08'); // 14 days
    // High stability + moderate retrievability => only 1 review needed
    const topics = [
      {
        topicId: 'single',
        topicName: 'Single Review',
        difficulty: 0.3, // easy => lastReviewGap = 2
        stability: 10,
        lastReviewDate: new Date('2026-03-20'),
        retrievability: 0.6,
      },
    ];
    const result = planExamCountdown(examDate, topics, today);
    expect(result).toHaveLength(1);

    const dates = result[0].reviewDates;
    if (dates.length === 1) {
      // Should be placed about lastReviewGap (2) days before exam
      // Allow +-1 day tolerance for timezone/DST rounding
      const daysBeforeExam = Math.round(
        (examDate.getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysBeforeExam).toBeGreaterThanOrEqual(1);
      expect(daysBeforeExam).toBeLessThanOrEqual(3);
    }
  });
});

// ── 8. classifyDifficulty ───────────────────────────────────────

describe('classifyDifficulty', () => {
  it('returns "medium" for null', () => {
    expect(classifyDifficulty(null)).toBe('medium');
  });

  it('returns "easy" for 0.0', () => {
    expect(classifyDifficulty(0.0)).toBe('easy');
  });

  it('returns "medium" for 0.5', () => {
    expect(classifyDifficulty(0.5)).toBe('medium');
  });

  it('returns "hard" for 0.9', () => {
    expect(classifyDifficulty(0.9)).toBe('hard');
  });
});
