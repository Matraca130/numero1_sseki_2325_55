/**
 * Tests for scheduling-intelligence.ts
 *
 * All exported functions are pure (no API calls, no side effects),
 * so we test them directly without mocks.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyDifficulty,
  adjustTimeByDifficulty,
  orderByPrerequisites,
  balanceCognitiveLoad,
  interleaveWithinDays,
  enrichTasksWithDifficulty,
  runSchedulingPipeline,
  computeStudyMomentum,
  planExamCountdown,
  getDifficultyBadge,
} from '@/app/lib/scheduling-intelligence';
import type {
  ScheduleTask,
  ScheduleDay,
  DifficultyTier,
} from '@/app/lib/scheduling-intelligence';
import type { TopicDifficultyData } from '@/app/types/student';

// ─── Helpers ────────────────────────────────────────────────────

function makeTask(overrides: Partial<ScheduleTask> = {}): ScheduleTask {
  return {
    topicId: 'topic-1',
    topicTitle: 'Test Topic',
    method: 'resumo',
    estimatedMinutes: 30,
    difficulty: 0.5,
    bloomLevel: 3,
    courseId: 'course-1',
    courseName: 'Test Course',
    sectionTitle: 'Section 1',
    ...overrides,
  };
}

function makeDay(overrides: Partial<ScheduleDay> = {}): ScheduleDay {
  return {
    date: new Date('2026-04-01'),
    availableMinutes: 120,
    tasks: [],
    cognitiveLoad: 0,
    ...overrides,
  };
}

function makeDifficultyData(
  overrides: Partial<TopicDifficultyData> = {},
): TopicDifficultyData {
  return {
    id: 'topic-1',
    name: 'Test Topic',
    section_name: 'Section 1',
    difficulty_estimate: 0.5,
    estimated_study_minutes: 30,
    bloom_level: 3,
    abstraction_level: 3,
    concept_density: 3,
    interrelation_score: 3,
    cohort_difficulty: null,
    prerequisite_topic_ids: [],
    ...overrides,
  };
}

// ─── classifyDifficulty ─────────────────────────────────────────

describe('classifyDifficulty', () => {
  it('returns "hard" for estimate >= 0.65', () => {
    expect(classifyDifficulty(0.65)).toBe('hard');
    expect(classifyDifficulty(0.8)).toBe('hard');
    expect(classifyDifficulty(1.0)).toBe('hard');
  });

  it('returns "medium" for estimate >= 0.35 and < 0.65', () => {
    expect(classifyDifficulty(0.35)).toBe('medium');
    expect(classifyDifficulty(0.5)).toBe('medium');
    expect(classifyDifficulty(0.6499)).toBe('medium');
  });

  it('returns "easy" for estimate < 0.35', () => {
    expect(classifyDifficulty(0.0)).toBe('easy');
    expect(classifyDifficulty(0.1)).toBe('easy');
    expect(classifyDifficulty(0.3499)).toBe('easy');
  });

  it('returns "medium" for null (unknown difficulty)', () => {
    expect(classifyDifficulty(null)).toBe('medium');
  });

  it('handles boundary values precisely', () => {
    expect(classifyDifficulty(0.35)).toBe('medium');
    expect(classifyDifficulty(0.65)).toBe('hard');
    // Just below boundaries
    expect(classifyDifficulty(0.34999)).toBe('easy');
    expect(classifyDifficulty(0.64999)).toBe('medium');
  });
});

// ─── adjustTimeByDifficulty ─────────────────────────────────────

describe('adjustTimeByDifficulty', () => {
  it('applies base multiplier correctly for null difficulty (defaults to 0.5)', () => {
    // null -> d=0.5, mastery=0 -> masteryMultiplier=1.3
    // multiplier = 0.75 + (0.5 * 0.65) = 1.075
    // result = 60 * 1.075 * 1.3 = 83.85 -> 84
    const result = adjustTimeByDifficulty(60, null);
    expect(result).toBe(84);
  });

  it('increases time for hard topics (difficulty 1.0)', () => {
    // d=1.0, mastery=0 -> masteryMultiplier=1.3
    // multiplier = 0.75 + (1.0 * 0.65) = 1.4
    // result = 60 * 1.4 * 1.3 = 109.2 -> 109
    const result = adjustTimeByDifficulty(60, 1.0);
    expect(result).toBe(109);
  });

  it('decreases time for easy topics (difficulty 0.0)', () => {
    // d=0.0, mastery=0 -> masteryMultiplier=1.3
    // multiplier = 0.75 + (0.0 * 0.65) = 0.75
    // result = 60 * 0.75 * 1.3 = 58.5 -> 59 (Math.round)
    const result = adjustTimeByDifficulty(60, 0.0);
    expect(result).toBe(59);
  });

  it('applies mastery reduction for high mastery (>=80)', () => {
    // d=0.5, mastery=80 -> masteryMultiplier=0.7
    // multiplier = 0.75 + (0.5 * 0.65) = 1.075
    // result = 60 * 1.075 * 0.7 = 45.15 -> 45
    const result = adjustTimeByDifficulty(60, 0.5, 80);
    expect(result).toBe(45);
  });

  it('applies mastery multiplier 0.85 for mastery >= 60', () => {
    // d=0.5, mastery=60 -> masteryMultiplier=0.85
    // result = 60 * 1.075 * 0.85 = 54.825 -> 55
    const result = adjustTimeByDifficulty(60, 0.5, 60);
    expect(result).toBe(55);
  });

  it('applies mastery multiplier 1.0 for mastery >= 40', () => {
    // d=0.5, mastery=40 -> masteryMultiplier=1.0
    // result = 60 * 1.075 * 1.0 = 64.5 -> 65 (Math.round)
    const result = adjustTimeByDifficulty(60, 0.5, 40);
    expect(result).toBe(65);
  });

  it('applies mastery multiplier 1.15 for mastery >= 20', () => {
    // d=0.5, mastery=20 -> masteryMultiplier=1.15
    // result = 60 * 1.075 * 1.15 = 74.175 -> 74
    const result = adjustTimeByDifficulty(60, 0.5, 20);
    expect(result).toBe(74);
  });

  it('applies mastery multiplier 1.3 for very low mastery (<20)', () => {
    // d=0.5, mastery=0 -> masteryMultiplier=1.3
    // result = 60 * 1.075 * 1.3 = 83.85 -> 84
    const result = adjustTimeByDifficulty(60, 0.5, 0);
    expect(result).toBe(84);
  });

  it('handles negative baseMinutes by clamping to 0', () => {
    expect(adjustTimeByDifficulty(-10, 0.5)).toBe(0);
  });

  it('returns 0 for baseMinutes of 0', () => {
    expect(adjustTimeByDifficulty(0, 0.8)).toBe(0);
  });

  it('defaults mastery to 0 when not provided', () => {
    const withDefault = adjustTimeByDifficulty(60, 0.5);
    const withExplicitZero = adjustTimeByDifficulty(60, 0.5, 0);
    expect(withDefault).toBe(withExplicitZero);
  });
});

// ─── orderByPrerequisites ───────────────────────────────────────

describe('orderByPrerequisites', () => {
  it('returns topics in original order when no prerequisites', () => {
    const topics = [
      { topicId: 'a', prerequisiteIds: [] },
      { topicId: 'b', prerequisiteIds: [] },
      { topicId: 'c', prerequisiteIds: [] },
    ];
    const result = orderByPrerequisites(topics);
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('places prerequisites before their dependents', () => {
    const topics = [
      { topicId: 'c', prerequisiteIds: ['b'] },
      { topicId: 'b', prerequisiteIds: ['a'] },
      { topicId: 'a', prerequisiteIds: [] },
    ];
    const result = orderByPrerequisites(topics);
    const idxA = result.indexOf('a');
    const idxB = result.indexOf('b');
    const idxC = result.indexOf('c');
    expect(idxA).toBeLessThan(idxB);
    expect(idxB).toBeLessThan(idxC);
  });

  it('handles diamond dependency pattern', () => {
    // a -> b, a -> c, b -> d, c -> d
    const topics = [
      { topicId: 'd', prerequisiteIds: ['b', 'c'] },
      { topicId: 'b', prerequisiteIds: ['a'] },
      { topicId: 'c', prerequisiteIds: ['a'] },
      { topicId: 'a', prerequisiteIds: [] },
    ];
    const result = orderByPrerequisites(topics);
    expect(result.indexOf('a')).toBeLessThan(result.indexOf('b'));
    expect(result.indexOf('a')).toBeLessThan(result.indexOf('c'));
    expect(result.indexOf('b')).toBeLessThan(result.indexOf('d'));
    expect(result.indexOf('c')).toBeLessThan(result.indexOf('d'));
  });

  it('ignores prerequisite IDs not in the topic set', () => {
    const topics = [
      { topicId: 'a', prerequisiteIds: ['external-id'] },
      { topicId: 'b', prerequisiteIds: [] },
    ];
    const result = orderByPrerequisites(topics);
    expect(result).toHaveLength(2);
    expect(result).toContain('a');
    expect(result).toContain('b');
  });

  it('handles cycles by falling back to original order for remaining topics', () => {
    // a -> b -> a (cycle)
    const topics = [
      { topicId: 'a', prerequisiteIds: ['b'] },
      { topicId: 'b', prerequisiteIds: ['a'] },
      { topicId: 'c', prerequisiteIds: [] },
    ];
    const result = orderByPrerequisites(topics);
    expect(result).toHaveLength(3);
    // c should be first since it has no prereqs
    expect(result[0]).toBe('c');
    // a and b are in the cycle, they get appended in original order
    expect(result).toContain('a');
    expect(result).toContain('b');
  });

  it('returns empty array for empty input', () => {
    expect(orderByPrerequisites([])).toEqual([]);
  });
});

// ─── balanceCognitiveLoad ───────────────────────────────────────

describe('balanceCognitiveLoad', () => {
  it('returns same structure for empty days', () => {
    const result = balanceCognitiveLoad([]);
    expect(result).toEqual([]);
  });

  it('does not mutate the input days', () => {
    const hardTask = makeTask({ difficulty: 0.9, estimatedMinutes: 30 });
    const easyTask = makeTask({ difficulty: 0.1, estimatedMinutes: 30, topicId: 'topic-2' });
    const days = [
      makeDay({ tasks: [hardTask, hardTask], availableMinutes: 120 }),
      makeDay({ tasks: [easyTask, easyTask], availableMinutes: 120 }),
    ];
    const originalTasks0 = [...days[0].tasks];
    balanceCognitiveLoad(days);
    // Original should be unchanged
    expect(days[0].tasks).toEqual(originalTasks0);
  });

  it('swaps tasks between overloaded and underloaded days', () => {
    const hardTask = makeTask({ topicId: 'hard-1', difficulty: 0.9, estimatedMinutes: 30 });
    const easyTask = makeTask({ topicId: 'easy-1', difficulty: 0.1, estimatedMinutes: 30 });
    const days = [
      makeDay({
        tasks: [hardTask, { ...hardTask, topicId: 'hard-2' }, { ...hardTask, topicId: 'hard-3' }],
        availableMinutes: 120,
      }),
      makeDay({
        tasks: [easyTask, { ...easyTask, topicId: 'easy-2' }, { ...easyTask, topicId: 'easy-3' }],
        availableMinutes: 120,
      }),
    ];
    const result = balanceCognitiveLoad(days);
    // After balancing, the loads should be closer to each other
    expect(result[0].cognitiveLoad).toBeLessThan(0.9);
    expect(result[1].cognitiveLoad).toBeGreaterThan(0.1);
  });

  it('handles single-day schedules without error', () => {
    const day = makeDay({ tasks: [makeTask({ difficulty: 0.8 })] });
    const result = balanceCognitiveLoad([day]);
    expect(result).toHaveLength(1);
    expect(result[0].tasks).toHaveLength(1);
  });
});

// ─── interleaveWithinDays ───────────────────────────────────────

describe('interleaveWithinDays', () => {
  it('does not reorder days with 2 or fewer tasks', () => {
    const day = makeDay({
      tasks: [makeTask({ difficulty: 0.9 }), makeTask({ difficulty: 0.1, topicId: 't2' })],
    });
    const result = interleaveWithinDays([day]);
    expect(result[0].tasks).toHaveLength(2);
  });

  it('interleaves tasks from different difficulty tiers', () => {
    const tasks = [
      makeTask({ topicId: 'h1', difficulty: 0.9 }),
      makeTask({ topicId: 'h2', difficulty: 0.8 }),
      makeTask({ topicId: 'e1', difficulty: 0.1 }),
      makeTask({ topicId: 'e2', difficulty: 0.2 }),
      makeTask({ topicId: 'm1', difficulty: 0.5 }),
      makeTask({ topicId: 'm2', difficulty: 0.4 }),
    ];
    const day = makeDay({ tasks });
    const result = interleaveWithinDays([day]);
    // All tasks should still be present
    expect(result[0].tasks).toHaveLength(6);
    const ids = result[0].tasks.map(t => t.topicId);
    expect(ids).toContain('h1');
    expect(ids).toContain('e1');
    expect(ids).toContain('m1');
  });

  it('handles all tasks of the same tier', () => {
    const tasks = [
      makeTask({ topicId: 't1', difficulty: 0.5 }),
      makeTask({ topicId: 't2', difficulty: 0.5 }),
      makeTask({ topicId: 't3', difficulty: 0.5 }),
    ];
    const day = makeDay({ tasks });
    const result = interleaveWithinDays([day]);
    expect(result[0].tasks).toHaveLength(3);
  });

  it('returns empty array for empty input', () => {
    expect(interleaveWithinDays([])).toEqual([]);
  });
});

// ─── enrichTasksWithDifficulty ──────────────────────────────────

describe('enrichTasksWithDifficulty', () => {
  it('enriches tasks with difficulty data from the map', () => {
    const tasks = [{ topicId: 'topic-1', estimatedMinutes: 30 }];
    const diffMap = new Map<string, TopicDifficultyData>([
      ['topic-1', makeDifficultyData({ difficulty_estimate: 0.7, name: 'Algebra', bloom_level: 4, section_name: 'Math' })],
    ]);

    const result = enrichTasksWithDifficulty(tasks, diffMap);
    expect(result).toHaveLength(1);
    expect(result[0].topicTitle).toBe('Algebra');
    expect(result[0].difficulty).toBe(0.7);
    expect(result[0].bloomLevel).toBe(4);
    expect(result[0].sectionTitle).toBe('Math');
  });

  it('uses defaults when topic not found in difficulty map', () => {
    const tasks = [{ topicId: 'unknown', estimatedMinutes: 30 }];
    const diffMap = new Map<string, TopicDifficultyData>();

    const result = enrichTasksWithDifficulty(tasks, diffMap);
    expect(result[0].topicTitle).toBe('unknown'); // falls back to topicId
    expect(result[0].difficulty).toBe(0.5); // default
    expect(result[0].bloomLevel).toBe(2); // default
  });

  it('adjusts time using mastery map', () => {
    const tasks = [{ topicId: 'topic-1', estimatedMinutes: 60 }];
    const diffMap = new Map<string, TopicDifficultyData>([
      ['topic-1', makeDifficultyData({ difficulty_estimate: 0.5 })],
    ]);
    const masteryMap = new Map([['topic-1', 80]]);

    const result = enrichTasksWithDifficulty(tasks, diffMap, masteryMap);
    // d=0.5, mastery=80 -> masteryMultiplier=0.7
    // 60 * 1.075 * 0.7 = 45.15 -> 45
    expect(result[0].estimatedMinutes).toBe(45);
  });

  it('uses method from task or defaults to "resumo"', () => {
    const withMethod = [{ topicId: 't1', estimatedMinutes: 30, method: 'quiz' }];
    const withoutMethod = [{ topicId: 't2', estimatedMinutes: 30 }];
    const diffMap = new Map<string, TopicDifficultyData>();

    expect(enrichTasksWithDifficulty(withMethod, diffMap)[0].method).toBe('quiz');
    expect(enrichTasksWithDifficulty(withoutMethod, diffMap)[0].method).toBe('resumo');
  });
});

// ─── computeStudyMomentum ───────────────────────────────────────

describe('computeStudyMomentum', () => {
  it('returns baseline score 1.0 for empty sessions', () => {
    const result = computeStudyMomentum([]);
    expect(result).toEqual({ score: 1.0, trend: 'stable', streak: 0 });
  });

  it('computes high score for perfect completion and adherence', () => {
    const sessions = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-03-${String(20 + i).padStart(2, '0')}`,
      completed: true,
      scheduledMinutes: 60,
      actualMinutes: 60,
    }));
    const result = computeStudyMomentum(sessions);
    // completionRate=1.0, timeAdherence=1.0
    // rawScore = 0.6*1 + 0.4*1 = 1.0
    expect(result.score).toBe(1.0);
    expect(result.streak).toBe(7);
  });

  it('computes low score for no completions', () => {
    const sessions = Array.from({ length: 5 }, (_, i) => ({
      date: `2026-03-${String(20 + i).padStart(2, '0')}`,
      completed: false,
      scheduledMinutes: 60,
      actualMinutes: 0,
    }));
    const result = computeStudyMomentum(sessions);
    // completionRate=0, timeAdherence=0
    // rawScore = 0 -> clamped to 0.5
    expect(result.score).toBe(0.5);
    expect(result.streak).toBe(0);
  });

  it('clamps score to 0.5 minimum', () => {
    const sessions = [{
      date: '2026-03-20',
      completed: false,
      scheduledMinutes: 100,
      actualMinutes: 0,
    }];
    const result = computeStudyMomentum(sessions);
    expect(result.score).toBeGreaterThanOrEqual(0.5);
  });

  it('clamps time adherence bonus at 1.5', () => {
    const sessions = [{
      date: '2026-03-20',
      completed: true,
      scheduledMinutes: 30,
      actualMinutes: 300, // 10x over schedule
    }];
    const result = computeStudyMomentum(sessions);
    // completionRate=1.0, timeAdherence clamped to 1.5
    // rawScore = 0.6*1 + 0.4*1.5 = 1.2
    expect(result.score).toBe(1.2);
  });

  it('detects rising trend when second half has better completion', () => {
    const sessions = [
      // First half: poor completion
      { date: '2026-03-18', completed: false, scheduledMinutes: 60, actualMinutes: 0 },
      { date: '2026-03-19', completed: false, scheduledMinutes: 60, actualMinutes: 0 },
      { date: '2026-03-20', completed: false, scheduledMinutes: 60, actualMinutes: 0 },
      // Second half: good completion
      { date: '2026-03-22', completed: true, scheduledMinutes: 60, actualMinutes: 60 },
      { date: '2026-03-23', completed: true, scheduledMinutes: 60, actualMinutes: 60 },
      { date: '2026-03-24', completed: true, scheduledMinutes: 60, actualMinutes: 60 },
      { date: '2026-03-25', completed: true, scheduledMinutes: 60, actualMinutes: 60 },
    ];
    const result = computeStudyMomentum(sessions);
    expect(result.trend).toBe('rising');
  });

  it('detects falling trend when second half has worse completion', () => {
    const sessions = [
      { date: '2026-03-18', completed: true, scheduledMinutes: 60, actualMinutes: 60 },
      { date: '2026-03-19', completed: true, scheduledMinutes: 60, actualMinutes: 60 },
      { date: '2026-03-20', completed: true, scheduledMinutes: 60, actualMinutes: 60 },
      { date: '2026-03-22', completed: false, scheduledMinutes: 60, actualMinutes: 0 },
      { date: '2026-03-23', completed: false, scheduledMinutes: 60, actualMinutes: 0 },
      { date: '2026-03-24', completed: false, scheduledMinutes: 60, actualMinutes: 0 },
      { date: '2026-03-25', completed: false, scheduledMinutes: 60, actualMinutes: 0 },
    ];
    const result = computeStudyMomentum(sessions);
    expect(result.trend).toBe('falling');
  });

  it('counts consecutive streak from most recent day', () => {
    const sessions = [
      { date: '2026-03-20', completed: false, scheduledMinutes: 60, actualMinutes: 0 },
      { date: '2026-03-21', completed: true, scheduledMinutes: 60, actualMinutes: 60 },
      { date: '2026-03-22', completed: true, scheduledMinutes: 60, actualMinutes: 60 },
      { date: '2026-03-23', completed: true, scheduledMinutes: 60, actualMinutes: 60 },
    ];
    const result = computeStudyMomentum(sessions);
    expect(result.streak).toBe(3);
  });
});

// ─── planExamCountdown ──────────────────────────────────────────

describe('planExamCountdown', () => {
  const today = new Date('2026-04-01');
  const examDate = new Date('2026-04-15'); // 14 days away

  it('returns empty plans for invalid exam date', () => {
    const result = planExamCountdown(new Date('invalid'), [], today);
    expect(result).toEqual([]);
  });

  it('returns no review dates when exam is today', () => {
    const sameDay = new Date('2026-04-01');
    const topics = [{
      topicId: 't1',
      topicName: 'Algebra',
      difficulty: 0.5,
      stability: 5,
      lastReviewDate: new Date('2026-03-28'),
      retrievability: 0.7,
    }];
    const result = planExamCountdown(sameDay, topics, today);
    expect(result[0].reviewDates).toEqual([]);
    expect(result[0].priority).toBe('moderate');
  });

  it('marks high-stability topics as "ready" with no reviews', () => {
    const topics = [{
      topicId: 't1',
      topicName: 'Easy Topic',
      difficulty: 0.2,
      stability: 30, // very high stability
      lastReviewDate: new Date('2026-03-31'), // yesterday
      retrievability: 0.95,
    }];
    const result = planExamCountdown(examDate, topics, today);
    expect(result[0].priority).toBe('ready');
    expect(result[0].reviewDates).toHaveLength(0);
  });

  it('schedules reviews for low-retrievability topics', () => {
    const topics = [{
      topicId: 't1',
      topicName: 'Hard Topic',
      difficulty: 0.8,
      stability: 0.5,
      lastReviewDate: new Date('2026-03-15'), // long ago
      retrievability: 0.2,
    }];
    const result = planExamCountdown(examDate, topics, today);
    expect(result[0].reviewDates.length).toBeGreaterThan(0);
    // All review dates should be between today and exam
    for (const rd of result[0].reviewDates) {
      expect(rd.getTime()).toBeGreaterThan(today.getTime());
      expect(rd.getTime()).toBeLessThanOrEqual(examDate.getTime());
    }
  });

  it('sorts results by priority: critical first, then moderate, then ready', () => {
    const topics = [
      {
        topicId: 'ready',
        topicName: 'Ready',
        difficulty: 0.2,
        stability: 50,
        lastReviewDate: new Date('2026-03-31'),
        retrievability: 0.95,
      },
      {
        topicId: 'critical',
        topicName: 'Critical',
        difficulty: 0.9,
        stability: 0.1,
        lastReviewDate: null,
        retrievability: 0.05,
      },
      {
        topicId: 'moderate',
        topicName: 'Moderate',
        difficulty: 0.5,
        stability: 3,
        lastReviewDate: new Date('2026-03-28'),
        retrievability: 0.6,
      },
    ];
    const result = planExamCountdown(examDate, topics, today);
    const priorities = result.map(r => r.priority);
    const critIdx = priorities.indexOf('critical');
    const modIdx = priorities.indexOf('moderate');
    const readyIdx = priorities.indexOf('ready');
    if (critIdx !== -1 && modIdx !== -1) expect(critIdx).toBeLessThan(modIdx);
    if (modIdx !== -1 && readyIdx !== -1) expect(modIdx).toBeLessThan(readyIdx);
  });

  it('gives hard topics an extra review compared to easier topics', () => {
    const hardTopic = {
      topicId: 'hard',
      topicName: 'Hard',
      difficulty: 0.8,
      stability: 1,
      lastReviewDate: new Date('2026-03-28'),
      retrievability: 0.5,
    };
    const easyTopic = {
      topicId: 'easy',
      topicName: 'Easy',
      difficulty: 0.3,
      stability: 1,
      lastReviewDate: new Date('2026-03-28'),
      retrievability: 0.5,
    };
    const hardResult = planExamCountdown(examDate, [hardTopic], today);
    const easyResult = planExamCountdown(examDate, [easyTopic], today);
    expect(hardResult[0].reviewDates.length).toBeGreaterThanOrEqual(easyResult[0].reviewDates.length);
  });

  it('handles topics with null lastReviewDate', () => {
    const topics = [{
      topicId: 't1',
      topicName: 'Never Reviewed',
      difficulty: 0.5,
      stability: 1,
      lastReviewDate: null,
      retrievability: 0.3,
    }];
    const result = planExamCountdown(examDate, topics, today);
    expect(result[0].reviewDates.length).toBeGreaterThan(0);
  });
});

// ─── getDifficultyBadge ─────────────────────────────────────────

describe('getDifficultyBadge', () => {
  it('returns red badge for hard difficulty (>= 0.65)', () => {
    const badge = getDifficultyBadge(0.8);
    expect(badge.color).toBe('#ef4444');
    expect(badge.label).toContain('cil'); // "Dificil" with accent
  });

  it('returns yellow badge for medium difficulty (>= 0.35)', () => {
    const badge = getDifficultyBadge(0.5);
    expect(badge.color).toBe('#f59e0b');
    expect(badge.label).toBe('Moderado');
  });

  it('returns green badge for easy difficulty (< 0.35)', () => {
    const badge = getDifficultyBadge(0.1);
    expect(badge.color).toBe('#22c55e');
    expect(badge.label).toContain('cil'); // "Facil" with accent
  });

  it('returns gray badge for null difficulty', () => {
    const badge = getDifficultyBadge(null);
    expect(badge.color).toBe('#9ca3af');
    expect(badge.label).toBe('?');
  });

  it('uses same thresholds as classifyDifficulty', () => {
    // Boundary: 0.65 should be hard
    expect(getDifficultyBadge(0.65).color).toBe('#ef4444');
    // Boundary: 0.35 should be medium
    expect(getDifficultyBadge(0.35).color).toBe('#f59e0b');
    // Just below 0.35 should be easy
    expect(getDifficultyBadge(0.34).color).toBe('#22c55e');
  });
});

// ─── runSchedulingPipeline ──────────────────────────────────────

describe('runSchedulingPipeline', () => {
  it('distributes tasks across multiple days', () => {
    const rawTasks = [
      { topicId: 't1', topicTitle: 'Topic 1', method: 'resumo', estimatedMinutes: 30, courseId: 'c1', courseName: 'Course', sectionTitle: 'S1' },
      { topicId: 't2', topicTitle: 'Topic 2', method: 'quiz', estimatedMinutes: 30, courseId: 'c1', courseName: 'Course', sectionTitle: 'S1' },
      { topicId: 't3', topicTitle: 'Topic 3', method: 'resumo', estimatedMinutes: 30, courseId: 'c1', courseName: 'Course', sectionTitle: 'S1' },
    ];
    const diffMap = new Map<string, TopicDifficultyData>([
      ['t1', makeDifficultyData({ id: 't1', difficulty_estimate: 0.3 })],
      ['t2', makeDifficultyData({ id: 't2', difficulty_estimate: 0.5 })],
      ['t3', makeDifficultyData({ id: 't3', difficulty_estimate: 0.8 })],
    ]);
    const scheduleDays = [
      { date: new Date('2026-04-01'), availableMinutes: 60 },
      { date: new Date('2026-04-02'), availableMinutes: 60 },
      { date: new Date('2026-04-03'), availableMinutes: 60 },
    ];

    const result = runSchedulingPipeline(rawTasks, diffMap, scheduleDays);
    expect(result).toHaveLength(3);
    // Total tasks across all days should equal input
    const totalTasks = result.reduce((sum, d) => sum + d.tasks.length, 0);
    expect(totalTasks).toBe(3);
  });

  it('respects prerequisite ordering', () => {
    const rawTasks = [
      { topicId: 'dep', topicTitle: 'Dependent', method: 'resumo', estimatedMinutes: 30, courseId: 'c1', courseName: 'C', sectionTitle: 'S' },
      { topicId: 'prereq', topicTitle: 'Prerequisite', method: 'resumo', estimatedMinutes: 30, courseId: 'c1', courseName: 'C', sectionTitle: 'S' },
    ];
    const diffMap = new Map<string, TopicDifficultyData>([
      ['dep', makeDifficultyData({ id: 'dep', difficulty_estimate: 0.5, prerequisite_topic_ids: ['prereq'] })],
      ['prereq', makeDifficultyData({ id: 'prereq', difficulty_estimate: 0.3, prerequisite_topic_ids: [] })],
    ]);
    const scheduleDays = [
      { date: new Date('2026-04-01'), availableMinutes: 120 },
      { date: new Date('2026-04-02'), availableMinutes: 120 },
    ];

    const result = runSchedulingPipeline(rawTasks, diffMap, scheduleDays);
    // Find which day has each task
    const allTasks = result.flatMap((d, dayIdx) => d.tasks.map(t => ({ ...t, dayIdx })));
    const prereqEntry = allTasks.find(t => t.topicId === 'prereq');
    const depEntry = allTasks.find(t => t.topicId === 'dep');
    expect(prereqEntry).toBeDefined();
    expect(depEntry).toBeDefined();
    // Prerequisite should be on same or earlier day
    expect(prereqEntry!.dayIdx).toBeLessThanOrEqual(depEntry!.dayIdx);
  });

  it('handles empty task list', () => {
    const result = runSchedulingPipeline(
      [],
      new Map(),
      [{ date: new Date('2026-04-01'), availableMinutes: 60 }],
    );
    expect(result).toHaveLength(1);
    expect(result[0].tasks).toHaveLength(0);
  });

  it('places tasks in least-loaded day when all days are full', () => {
    const rawTasks = Array.from({ length: 5 }, (_, i) => ({
      topicId: `t${i}`,
      topicTitle: `Topic ${i}`,
      method: 'resumo',
      estimatedMinutes: 60,
      courseId: 'c1',
      courseName: 'C',
      sectionTitle: 'S',
    }));
    const diffMap = new Map<string, TopicDifficultyData>();
    const scheduleDays = [
      { date: new Date('2026-04-01'), availableMinutes: 30 }, // very limited
    ];

    const result = runSchedulingPipeline(rawTasks, diffMap, scheduleDays);
    // All 5 tasks should be placed somewhere (even overflowing)
    const totalTasks = result.reduce((sum, d) => sum + d.tasks.length, 0);
    expect(totalTasks).toBe(5);
  });
});

// ─── Type exports ───────────────────────────────────────────────

describe('Type exports', () => {
  it('DifficultyTier type is correctly constrained', () => {
    const tiers: DifficultyTier[] = ['hard', 'medium', 'easy'];
    expect(tiers).toHaveLength(3);
  });
});
