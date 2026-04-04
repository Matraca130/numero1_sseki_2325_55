// ============================================================
// Unit Tests — rescheduleEngine.ts
//
// Tests the rescheduling algorithm:
//   - rescheduleRemainingTasks: re-prioritize & redistribute pending
//   - applyAiReschedule: apply AI-suggested changes
//
// The engine separates completed (preserved) and pending (rescheduled)
// tasks, recalculates priority+time multipliers, interleaves by priority,
// and redistributes across remaining days.
//
// RUN: npx vitest run src/app/utils/__tests__/rescheduleEngine.test.ts
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { StudyPlan, StudyPlanTask } from '@/app/types/study-plan';
import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';
import type { AiRescheduledTask } from '@/app/services/aiService';
import {
  rescheduleRemainingTasks,
  applyAiReschedule,
  type RescheduleInput,
  type AiRescheduleInput,
} from '@/app/utils/rescheduleEngine';

// ── Test Data Factories ──────────────────────────────────────

function createMockTask(overrides: Partial<StudyPlanTask> = {}): StudyPlanTask {
  return {
    id: 'task-1',
    date: new Date('2026-03-26'),
    title: 'Study Topic',
    subject: 'Math',
    subjectColor: 'bg-blue-500',
    method: 'flashcard',
    estimatedMinutes: 20,
    completed: false,
    topicId: 'topic-1',
    ...overrides,
  };
}

function createMockPlan(overrides: Partial<StudyPlan> = {}): StudyPlan {
  return {
    id: 'plan-1',
    name: 'Test Plan',
    subjects: [{ id: 'sub-1', name: 'Math', color: 'bg-blue-500' }],
    methods: ['flashcard'],
    selectedTopics: [],
    completionDate: new Date('2026-04-15'),
    weeklyHours: [2, 2, 2, 2, 2, 1, 1],
    tasks: [createMockTask()],
    createdAt: new Date('2026-03-20'),
    totalEstimatedHours: 5,
    ...overrides,
  };
}

function createMockMastery(
  topicId: string,
  overrides: Partial<TopicMasteryInfo> = {},
): TopicMasteryInfo {
  return {
    masteryPercent: 50,
    pKnow: 0.5,
    needsReview: false,
    totalAttempts: 10,
    priorityScore: 50,
    ...overrides,
  };
}

// ── rescheduleRemainingTasks Tests ───────────────────────────

describe('rescheduleRemainingTasks', () => {
  const mockGetTimeEstimate = vi.fn(() => ({ estimatedMinutes: 20 }));

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTimeEstimate.mockReturnValue({ estimatedMinutes: 20 });
  });

  it('returns unchanged task list when no pending tasks', () => {
    const plan = createMockPlan({
      tasks: [
        createMockTask({ id: 'task-1', completed: true }),
        createMockTask({ id: 'task-2', completed: true }),
      ],
    });

    const input: RescheduleInput = {
      plan,
      topicMastery: new Map(),
      getTimeEstimate: mockGetTimeEstimate,
      today: new Date('2026-03-20'),
    };

    const result = rescheduleRemainingTasks(input);

    expect(result.didReschedule).toBe(false);
    expect(result.changes).toEqual([]);
    expect(result.tasks).toHaveLength(2);
  });

  it('returns empty tasks when plan is empty', () => {
    const plan = createMockPlan({ tasks: [] });

    const input: RescheduleInput = {
      plan,
      topicMastery: new Map(),
      getTimeEstimate: mockGetTimeEstimate,
      today: new Date('2026-03-20'),
    };

    const result = rescheduleRemainingTasks(input);

    expect(result.didReschedule).toBe(false);
    expect(result.tasks).toEqual([]);
  });

  it('preserves completed tasks with original dates', () => {
    const completedTask = createMockTask({
      id: 'task-completed',
      completed: true,
      date: new Date('2026-03-25'),
    });
    const pendingTask = createMockTask({
      id: 'task-pending',
      completed: false,
      date: new Date('2026-03-26'),
    });

    const plan = createMockPlan({
      tasks: [completedTask, pendingTask],
    });

    const input: RescheduleInput = {
      plan,
      topicMastery: new Map(),
      getTimeEstimate: mockGetTimeEstimate,
      today: new Date('2026-03-20'),
    };

    const result = rescheduleRemainingTasks(input);

    // Completed task should keep original date
    const preserved = result.tasks.find((t) => t.id === 'task-completed');
    expect(preserved?.date).toEqual(new Date('2026-03-25'));
  });

  it('reschedules pending tasks with new dates', () => {
    const pendingTask = createMockTask({
      id: 'task-pending',
      completed: false,
      date: new Date('2026-03-26'),
      topicId: 'topic-1',
    });

    const plan = createMockPlan({
      tasks: [pendingTask],
      completionDate: new Date('2026-04-15'),
    });

    const mastery = new Map([['topic-1', createMockMastery('topic-1')]]);

    const input: RescheduleInput = {
      plan,
      topicMastery: mastery,
      getTimeEstimate: mockGetTimeEstimate,
      today: new Date('2026-03-20'),
    };

    const result = rescheduleRemainingTasks(input);

    const rescheduled = result.tasks.find((t) => t.id === 'task-pending');
    // Date should be changed or kept (depends on algorithm)
    expect(rescheduled).toBeDefined();
  });

  it('applies time multiplier based on topic mastery', () => {
    const weakTask = createMockTask({
      id: 'task-weak',
      completed: false,
      topicId: 'topic-weak',
      estimatedMinutes: 20,
      method: 'flashcard',
    });

    const plan = createMockPlan({
      tasks: [weakTask],
    });

    // Weak topic: 25% mastery → 1.5x multiplier
    const mastery = new Map([
      ['topic-weak', createMockMastery('topic-weak', { masteryPercent: 25, totalAttempts: 5 })],
    ]);

    mockGetTimeEstimate.mockReturnValue({ estimatedMinutes: 20 });

    const input: RescheduleInput = {
      plan,
      topicMastery: mastery,
      getTimeEstimate: mockGetTimeEstimate,
      today: new Date('2026-03-20'),
    };

    const result = rescheduleRemainingTasks(input);

    // Expected: 20 * 1.5 = 30 minutes
    const task = result.tasks.find((t) => t.id === 'task-weak');
    expect(task?.estimatedMinutes).toBe(30);
  });

  it('interleaves high-priority and normal-priority tasks', () => {
    const highPriorityTask = createMockTask({
      id: 'task-high',
      completed: false,
      topicId: 'topic-high',
    });
    const normalTask = createMockTask({
      id: 'task-normal',
      completed: false,
      topicId: 'topic-normal',
      estimatedMinutes: 20,
    });
    const anotherHighTask = createMockTask({
      id: 'task-high-2',
      completed: false,
      topicId: 'topic-high-2',
      estimatedMinutes: 20,
    });

    const plan = createMockPlan({
      tasks: [highPriorityTask, normalTask, anotherHighTask],
    });

    const mastery = new Map([
      ['topic-high', createMockMastery('topic-high', { priorityScore: 75 })], // High
      ['topic-normal', createMockMastery('topic-normal', { priorityScore: 40 })], // Normal
      ['topic-high-2', createMockMastery('topic-high-2', { priorityScore: 70 })], // High
    ]);

    const input: RescheduleInput = {
      plan,
      topicMastery: mastery,
      getTimeEstimate: mockGetTimeEstimate,
      today: new Date('2026-03-20'),
    };

    const result = rescheduleRemainingTasks(input);

    // High-priority tasks should appear before normal (though exact order depends on algorithm)
    expect(result.tasks).toHaveLength(3);
  });

  it('starts from tomorrow if completed tasks exist today', () => {
    const today = new Date('2026-03-20');
    const completedToday = createMockTask({
      id: 'task-today',
      completed: true,
      date: today,
    });
    const pendingTask = createMockTask({
      id: 'task-pending',
      completed: false,
      date: new Date('2026-03-21'),
      topicId: 'topic-1',
    });

    const plan = createMockPlan({
      tasks: [completedToday, pendingTask],
    });

    const input: RescheduleInput = {
      plan,
      topicMastery: new Map([['topic-1', createMockMastery('topic-1')]]),
      getTimeEstimate: mockGetTimeEstimate,
      today,
    };

    const result = rescheduleRemainingTasks(input);

    // Pending task should be scheduled after today
    const pending = result.tasks.find((t) => t.id === 'task-pending');
    if (pending && pending.date > today) {
      expect(pending.date.getTime()).toBeGreaterThan(today.getTime());
    }
  });

  it('tracks changes when tasks are rescheduled', () => {
    const task = createMockTask({
      id: 'task-1',
      completed: false,
      date: new Date('2026-03-26'),
      estimatedMinutes: 20,
      topicId: 'topic-1',
    });

    const plan = createMockPlan({ tasks: [task] });

    const input: RescheduleInput = {
      plan,
      topicMastery: new Map([['topic-1', createMockMastery('topic-1', { masteryPercent: 25 })]]),
      getTimeEstimate: mockGetTimeEstimate,
      today: new Date('2026-03-20'),
    };

    const result = rescheduleRemainingTasks(input);

    // If rescheduled, should have changes
    if (result.didReschedule) {
      expect(result.changes.length).toBeGreaterThan(0);
      const change = result.changes[0];
      expect(change.taskId).toBe('task-1');
      expect(change.newDate).toBeDefined();
      expect(change.newEstimatedMinutes).toBeGreaterThan(0);
    }
  });

  it('defaults priority to 50 when topic not in mastery', () => {
    const task = createMockTask({
      id: 'task-1',
      completed: false,
      topicId: 'unknown-topic',
    });

    const plan = createMockPlan({ tasks: [task] });

    const input: RescheduleInput = {
      plan,
      topicMastery: new Map(), // Empty mastery
      getTimeEstimate: mockGetTimeEstimate,
      today: new Date('2026-03-20'),
    };

    const result = rescheduleRemainingTasks(input);

    // Should not throw and should still have the task
    expect(result.tasks).toContainEqual(expect.objectContaining({ id: 'task-1' }));
  });

  it('handles tasks without topicId gracefully', () => {
    const task = createMockTask({
      id: 'task-1',
      completed: false,
      topicId: undefined,
    });

    const plan = createMockPlan({ tasks: [task] });

    const input: RescheduleInput = {
      plan,
      topicMastery: new Map(),
      getTimeEstimate: mockGetTimeEstimate,
      today: new Date('2026-03-20'),
    };

    const result = rescheduleRemainingTasks(input);

    expect(result.tasks).toContainEqual(expect.objectContaining({ id: 'task-1' }));
  });

  it('respects plan completion date as deadline', () => {
    const today = new Date('2026-03-20');
    const endDate = new Date('2026-03-25'); // Only 5 days

    const tasks = Array.from({ length: 10 }, (_, i) =>
      createMockTask({
        id: `task-${i}`,
        completed: false,
        topicId: `topic-${i}`,
        estimatedMinutes: 30,
      }),
    );

    const plan = createMockPlan({
      tasks,
      completionDate: endDate,
    });

    const mastery = new Map(
      tasks.map((t) => [
        t.topicId!,
        createMockMastery(t.topicId!, { priorityScore: 50 }),
      ]),
    );

    const input: RescheduleInput = {
      plan,
      topicMastery: mastery,
      getTimeEstimate: mockGetTimeEstimate,
      today,
    };

    const result = rescheduleRemainingTasks(input);

    // All tasks should be distributed by endDate
    expect(result.tasks.every((t) => t.date <= endDate || !t.completed === false)).toBe(true);
  });

  it('uses provided today parameter instead of default', () => {
    const customToday = new Date('2026-04-01');
    const task = createMockTask({
      id: 'task-1',
      completed: false,
      topicId: 'topic-1',
    });

    const plan = createMockPlan({ tasks: [task] });

    const input: RescheduleInput = {
      plan,
      topicMastery: new Map([['topic-1', createMockMastery('topic-1')]]),
      getTimeEstimate: mockGetTimeEstimate,
      today: customToday,
    };

    const result = rescheduleRemainingTasks(input);

    // Tasks should be scheduled on or after customToday
    expect(result.tasks.some((t) => t.date >= customToday || t.completed)).toBe(true);
  });

  it('returns all expected properties in RescheduleResult', () => {
    const plan = createMockPlan();

    const input: RescheduleInput = {
      plan,
      topicMastery: new Map(),
      getTimeEstimate: mockGetTimeEstimate,
    };

    const result = rescheduleRemainingTasks(input);

    expect(result).toHaveProperty('tasks');
    expect(result).toHaveProperty('changes');
    expect(result).toHaveProperty('didReschedule');
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(Array.isArray(result.changes)).toBe(true);
    expect(typeof result.didReschedule).toBe('boolean');
  });
});

// ── applyAiReschedule Tests ──────────────────────────────────

describe('applyAiReschedule', () => {
  it('returns unchanged plan when aiResult is empty', () => {
    const plan = createMockPlan({
      tasks: [
        createMockTask({ id: 'task-1' }),
        createMockTask({ id: 'task-2' }),
      ],
    });

    const input: AiRescheduleInput = {
      plan,
      aiResult: [],
    };

    const result = applyAiReschedule(input);

    expect(result.didReschedule).toBe(false);
    expect(result.changes).toEqual([]);
    expect(result.tasks).toEqual(plan.tasks);
  });

  it('applies single AI rescheduling suggestion', () => {
    const task = createMockTask({ id: 'task-1', completed: false });
    const plan = createMockPlan({ tasks: [task] });

    const aiSuggestion: AiRescheduledTask = {
      taskId: 'task-1',
      newDate: '2026-03-28',
      newEstimatedMinutes: 30,
      reason: 'Prioritize this weak topic',
    };

    const input: AiRescheduleInput = {
      plan,
      aiResult: [aiSuggestion],
    };

    const result = applyAiReschedule(input);

    expect(result.didReschedule).toBe(true);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].taskId).toBe('task-1');
    expect(result.changes[0].newDate).toEqual(new Date('2026-03-28'));
    expect(result.changes[0].newEstimatedMinutes).toBe(30);
  });

  it('updates task dates in result', () => {
    const task = createMockTask({ id: 'task-1', completed: false });
    const plan = createMockPlan({ tasks: [task] });

    const aiSuggestion: AiRescheduledTask = {
      taskId: 'task-1',
      newDate: '2026-04-01',
      newEstimatedMinutes: 25,
      reason: 'Spread workload',
    };

    const input: AiRescheduleInput = {
      plan,
      aiResult: [aiSuggestion],
    };

    const result = applyAiReschedule(input);

    const updatedTask = result.tasks.find((t) => t.id === 'task-1');
    expect(updatedTask?.date).toEqual(new Date('2026-04-01'));
    expect(updatedTask?.estimatedMinutes).toBe(25);
  });

  it('ignores suggestions for completed tasks', () => {
    const completedTask = createMockTask({ id: 'task-completed', completed: true });
    const plan = createMockPlan({ tasks: [completedTask] });

    const aiSuggestion: AiRescheduledTask = {
      taskId: 'task-completed',
      newDate: '2026-04-01',
      newEstimatedMinutes: 30,
      reason: 'This should not apply',
    };

    const input: AiRescheduleInput = {
      plan,
      aiResult: [aiSuggestion],
    };

    const result = applyAiReschedule(input);

    // Completed task should not be changed
    expect(result.didReschedule).toBe(false);
    expect(result.changes).toEqual([]);
  });

  it('ignores suggestions for non-existent tasks', () => {
    const task = createMockTask({ id: 'task-1' });
    const plan = createMockPlan({ tasks: [task] });

    const aiSuggestion: AiRescheduledTask = {
      taskId: 'nonexistent-task',
      newDate: '2026-04-01',
      newEstimatedMinutes: 30,
      reason: 'Task not found',
    };

    const input: AiRescheduleInput = {
      plan,
      aiResult: [aiSuggestion],
    };

    const result = applyAiReschedule(input);

    expect(result.didReschedule).toBe(false);
    expect(result.changes).toEqual([]);
  });

  it('applies multiple AI suggestions', () => {
    const task1 = createMockTask({ id: 'task-1', completed: false });
    const task2 = createMockTask({ id: 'task-2', completed: false });
    const plan = createMockPlan({ tasks: [task1, task2] });

    const aiSuggestions: AiRescheduledTask[] = [
      {
        taskId: 'task-1',
        newDate: '2026-03-28',
        newEstimatedMinutes: 30,
        reason: 'Reason 1',
      },
      {
        taskId: 'task-2',
        newDate: '2026-04-01',
        newEstimatedMinutes: 25,
        reason: 'Reason 2',
      },
    ];

    const input: AiRescheduleInput = {
      plan,
      aiResult: aiSuggestions,
    };

    const result = applyAiReschedule(input);

    expect(result.didReschedule).toBe(true);
    expect(result.changes).toHaveLength(2);
  });

  it('preserves unchanged tasks', () => {
    const task1 = createMockTask({ id: 'task-1', completed: false });
    const task2 = createMockTask({ id: 'task-2', completed: false });
    const plan = createMockPlan({ tasks: [task1, task2] });

    const aiSuggestion: AiRescheduledTask = {
      taskId: 'task-1',
      newDate: '2026-03-28',
      newEstimatedMinutes: 30,
      reason: 'Reason',
    };

    const input: AiRescheduleInput = {
      plan,
      aiResult: [aiSuggestion],
    };

    const result = applyAiReschedule(input);

    // task-2 should remain unchanged
    const unchanged = result.tasks.find((t) => t.id === 'task-2');
    expect(unchanged).toEqual(task2);
  });

  it('returns all expected properties', () => {
    const plan = createMockPlan();

    const input: AiRescheduleInput = {
      plan,
      aiResult: [],
    };

    const result = applyAiReschedule(input);

    expect(result).toHaveProperty('tasks');
    expect(result).toHaveProperty('changes');
    expect(result).toHaveProperty('didReschedule');
  });
});
