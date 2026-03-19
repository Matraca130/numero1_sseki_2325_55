// ============================================================
// Tests for the findPendingTask logic used by useStudyPlanBridge
// ============================================================
import { describe, it, expect } from 'vitest';
import type { StudyPlan, StudyPlanTask } from '@/app/context/AppContext';

// Inline the same logic used in StudyPlansContext so we can unit-test
// it without mounting React providers.
function findPendingTask(
  plans: StudyPlan[],
  topicId: string,
  method: string,
): { planId: string; taskId: string } | null {
  for (const plan of plans) {
    for (const task of plan.tasks) {
      if (!task.completed && task.topicId === topicId && task.method === method) {
        return { planId: plan.id, taskId: task.id };
      }
    }
  }
  return null;
}

// Also test the session-to-method mapping
const SESSION_TO_METHODS: Record<string, string[]> = {
  flashcard: ['flashcard'],
  quiz: ['quiz'],
  reading: ['resumo', 'reading', 'video'],
};

function makeTask(overrides: Partial<StudyPlanTask> = {}): StudyPlanTask {
  return {
    id: 'task-1',
    date: new Date(),
    title: 'Review Cardiology',
    subject: 'Cardiology',
    subjectColor: '#14b8a6',
    method: 'flashcard',
    estimatedMinutes: 30,
    completed: false,
    topicId: 'topic-abc',
    ...overrides,
  };
}

function makePlan(overrides: Partial<StudyPlan> & { tasks: StudyPlanTask[] }): StudyPlan {
  return {
    id: 'plan-1',
    name: 'Week 1 Plan',
    subjects: [],
    methods: ['flashcard', 'quiz'],
    selectedTopics: [],
    completionDate: new Date(),
    weeklyHours: [1, 1, 1, 1, 1, 0, 0],
    createdAt: new Date(),
    totalEstimatedHours: 5,
    ...overrides,
  };
}

describe('findPendingTask', () => {
  it('returns null when there are no plans', () => {
    expect(findPendingTask([], 'topic-abc', 'flashcard')).toBeNull();
  });

  it('finds a matching pending task', () => {
    const plans = [makePlan({ tasks: [makeTask()] })];
    const result = findPendingTask(plans, 'topic-abc', 'flashcard');
    expect(result).toEqual({ planId: 'plan-1', taskId: 'task-1' });
  });

  it('skips completed tasks', () => {
    const plans = [makePlan({ tasks: [makeTask({ completed: true })] })];
    expect(findPendingTask(plans, 'topic-abc', 'flashcard')).toBeNull();
  });

  it('skips tasks with different topicId', () => {
    const plans = [makePlan({ tasks: [makeTask({ topicId: 'topic-xyz' })] })];
    expect(findPendingTask(plans, 'topic-abc', 'flashcard')).toBeNull();
  });

  it('skips tasks with different method', () => {
    const plans = [makePlan({ tasks: [makeTask({ method: 'quiz' })] })];
    expect(findPendingTask(plans, 'topic-abc', 'flashcard')).toBeNull();
  });

  it('returns the first match across multiple plans', () => {
    const plans = [
      makePlan({ id: 'plan-1', tasks: [makeTask({ completed: true })] }),
      makePlan({ id: 'plan-2', tasks: [makeTask({ id: 'task-2' })] }),
    ];
    const result = findPendingTask(plans, 'topic-abc', 'flashcard');
    expect(result).toEqual({ planId: 'plan-2', taskId: 'task-2' });
  });

  it('handles tasks without topicId gracefully', () => {
    const plans = [makePlan({ tasks: [makeTask({ topicId: undefined })] })];
    expect(findPendingTask(plans, 'topic-abc', 'flashcard')).toBeNull();
  });
});

describe('SESSION_TO_METHODS mapping', () => {
  it('flashcard maps to flashcard method only', () => {
    expect(SESSION_TO_METHODS['flashcard']).toEqual(['flashcard']);
  });

  it('quiz maps to quiz method only', () => {
    expect(SESSION_TO_METHODS['quiz']).toEqual(['quiz']);
  });

  it('reading maps to resumo, reading, and video', () => {
    expect(SESSION_TO_METHODS['reading']).toEqual(['resumo', 'reading', 'video']);
  });

  it('reading session finds resumo task via iteration', () => {
    const plans = [makePlan({ tasks: [makeTask({ method: 'resumo' })] })];
    const methods = SESSION_TO_METHODS['reading'];
    let found = null;
    for (const method of methods) {
      found = findPendingTask(plans, 'topic-abc', method);
      if (found) break;
    }
    expect(found).toEqual({ planId: 'plan-1', taskId: 'task-1' });
  });
});
