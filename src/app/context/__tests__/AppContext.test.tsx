// ============================================================
// Tests: AppContext — StudySessionProvider
//
// Validates the StudySession context (study plans, auto-start
// flags, task toggling) and the composed useApp hook.
// ============================================================

import React from 'react';
import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppProvider, useApp, useStudySession } from '@/app/context/AppContext';
import type { StudyPlan, StudyPlanTask } from '@/app/context/AppContext';

// ── Helpers ─────────────────────────────────────────────────

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AppProvider>{children}</AppProvider>;
  };
}

/** Factory for a StudyPlanTask with sensible defaults */
function createMockTask(overrides: Partial<StudyPlanTask> = {}): StudyPlanTask {
  return {
    id: 'task-1',
    date: new Date('2026-03-26'),
    title: 'Review chapter 1',
    subject: 'Mathematics',
    subjectColor: 'bg-blue-500',
    method: 'flashcards',
    estimatedMinutes: 30,
    completed: false,
    ...overrides,
  };
}

/** Factory for a StudyPlan with sensible defaults */
function createMockPlan(overrides: Partial<StudyPlan> = {}): StudyPlan {
  return {
    id: 'plan-1',
    name: 'Midterm prep',
    subjects: [{ id: 'sub-1', name: 'Mathematics', color: 'bg-blue-500' }],
    methods: ['flashcards', 'quiz'],
    selectedTopics: [
      {
        courseId: 'course-1',
        courseName: 'Calculus I',
        sectionTitle: 'Limits',
        topicTitle: 'Epsilon-delta',
        topicId: 'topic-1',
      },
    ],
    completionDate: new Date('2026-04-15'),
    weeklyHours: [1, 2, 1, 2, 1, 0, 0],
    tasks: [createMockTask()],
    createdAt: new Date('2026-03-20'),
    totalEstimatedHours: 10,
    ...overrides,
  };
}

// ── Test suites ─────────────────────────────────────────────

describe('useApp()', () => {
  it('returns all expected property groups (ui, navigation, studySession)', () => {
    const { result } = renderHook(() => useApp(), { wrapper: createWrapper() });

    // UI properties (from UIProvider)
    expect(result.current).toHaveProperty('isSidebarOpen');
    expect(result.current).toHaveProperty('setSidebarOpen');
    expect(result.current).toHaveProperty('theme');
    expect(result.current).toHaveProperty('setTheme');

    // Navigation properties (from NavigationProvider)
    expect(result.current).toHaveProperty('currentCourse');
    expect(result.current).toHaveProperty('setCurrentCourse');
    expect(result.current).toHaveProperty('currentTopic');
    expect(result.current).toHaveProperty('setCurrentTopic');

    // StudySession properties (from StudySessionProvider)
    expect(result.current).toHaveProperty('isStudySessionActive');
    expect(result.current).toHaveProperty('setStudySessionActive');
    expect(result.current).toHaveProperty('studyPlans');
    expect(result.current).toHaveProperty('addStudyPlan');
    expect(result.current).toHaveProperty('toggleTaskComplete');
    expect(result.current).toHaveProperty('quizAutoStart');
    expect(result.current).toHaveProperty('flashcardAutoStart');
  });
});

describe('useStudySession()', () => {
  it('returns all StudySession properties with correct initial values', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isStudySessionActive).toBe(false);
    expect(result.current.studyPlans).toEqual([]);
    expect(result.current.quizAutoStart).toBe(false);
    expect(result.current.flashcardAutoStart).toBe(false);
    expect(typeof result.current.setStudySessionActive).toBe('function');
    expect(typeof result.current.addStudyPlan).toBe('function');
    expect(typeof result.current.toggleTaskComplete).toBe('function');
    expect(typeof result.current.setQuizAutoStart).toBe('function');
    expect(typeof result.current.setFlashcardAutoStart).toBe('function');
  });
});

describe('setStudySessionActive()', () => {
  it('sets isStudySessionActive to true', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isStudySessionActive).toBe(false);

    act(() => {
      result.current.setStudySessionActive(true);
    });

    expect(result.current.isStudySessionActive).toBe(true);
  });

  it('sets isStudySessionActive back to false', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setStudySessionActive(true);
    });
    expect(result.current.isStudySessionActive).toBe(true);

    act(() => {
      result.current.setStudySessionActive(false);
    });
    expect(result.current.isStudySessionActive).toBe(false);
  });
});

describe('addStudyPlan()', () => {
  it('appends a new plan to the list', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    const plan = createMockPlan();

    act(() => {
      result.current.addStudyPlan(plan);
    });

    expect(result.current.studyPlans).toHaveLength(1);
    expect(result.current.studyPlans[0].id).toBe('plan-1');
    expect(result.current.studyPlans[0].name).toBe('Midterm prep');
  });

  it('appends multiple plans with different IDs', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.addStudyPlan(createMockPlan({ id: 'plan-1' }));
    });
    act(() => {
      result.current.addStudyPlan(createMockPlan({ id: 'plan-2', name: 'Final prep' }));
    });

    expect(result.current.studyPlans).toHaveLength(2);
    expect(result.current.studyPlans[0].id).toBe('plan-1');
    expect(result.current.studyPlans[1].id).toBe('plan-2');
  });

  it('replaces an existing plan with the same ID (dedup)', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.addStudyPlan(createMockPlan({ id: 'plan-1', name: 'Original' }));
    });
    expect(result.current.studyPlans[0].name).toBe('Original');

    act(() => {
      result.current.addStudyPlan(createMockPlan({ id: 'plan-1', name: 'Updated' }));
    });

    expect(result.current.studyPlans).toHaveLength(1);
    expect(result.current.studyPlans[0].name).toBe('Updated');
  });
});

describe('toggleTaskComplete()', () => {
  it('marks an incomplete task as completed', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    const task = createMockTask({ id: 'task-1', completed: false });
    const plan = createMockPlan({ id: 'plan-1', tasks: [task] });

    act(() => {
      result.current.addStudyPlan(plan);
    });
    expect(result.current.studyPlans[0].tasks[0].completed).toBe(false);

    act(() => {
      result.current.toggleTaskComplete('plan-1', 'task-1');
    });
    expect(result.current.studyPlans[0].tasks[0].completed).toBe(true);
  });

  it('marks a completed task as incomplete (toggle back)', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    const task = createMockTask({ id: 'task-1', completed: true });
    const plan = createMockPlan({ id: 'plan-1', tasks: [task] });

    act(() => {
      result.current.addStudyPlan(plan);
    });
    expect(result.current.studyPlans[0].tasks[0].completed).toBe(true);

    act(() => {
      result.current.toggleTaskComplete('plan-1', 'task-1');
    });
    expect(result.current.studyPlans[0].tasks[0].completed).toBe(false);
  });

  it('only toggles the matching task, leaving others unchanged', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    const tasks = [
      createMockTask({ id: 'task-1', completed: false }),
      createMockTask({ id: 'task-2', completed: false }),
    ];
    const plan = createMockPlan({ id: 'plan-1', tasks });

    act(() => {
      result.current.addStudyPlan(plan);
    });

    act(() => {
      result.current.toggleTaskComplete('plan-1', 'task-1');
    });

    expect(result.current.studyPlans[0].tasks[0].completed).toBe(true);
    expect(result.current.studyPlans[0].tasks[1].completed).toBe(false);
  });

  it('does nothing when planId does not match', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    const plan = createMockPlan({
      id: 'plan-1',
      tasks: [createMockTask({ id: 'task-1', completed: false })],
    });

    act(() => {
      result.current.addStudyPlan(plan);
    });

    act(() => {
      result.current.toggleTaskComplete('nonexistent-plan', 'task-1');
    });

    expect(result.current.studyPlans[0].tasks[0].completed).toBe(false);
  });
});

describe('quizAutoStart and flashcardAutoStart', () => {
  it('quizAutoStart can be set to true and reset to false', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.quizAutoStart).toBe(false);

    act(() => {
      result.current.setQuizAutoStart(true);
    });
    expect(result.current.quizAutoStart).toBe(true);

    act(() => {
      result.current.setQuizAutoStart(false);
    });
    expect(result.current.quizAutoStart).toBe(false);
  });

  it('flashcardAutoStart can be set to true and reset to false', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    expect(result.current.flashcardAutoStart).toBe(false);

    act(() => {
      result.current.setFlashcardAutoStart(true);
    });
    expect(result.current.flashcardAutoStart).toBe(true);

    act(() => {
      result.current.setFlashcardAutoStart(false);
    });
    expect(result.current.flashcardAutoStart).toBe(false);
  });

  it('quizAutoStart and flashcardAutoStart are independent', () => {
    const { result } = renderHook(() => useStudySession(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setQuizAutoStart(true);
    });

    expect(result.current.quizAutoStart).toBe(true);
    expect(result.current.flashcardAutoStart).toBe(false);

    act(() => {
      result.current.setFlashcardAutoStart(true);
    });

    expect(result.current.quizAutoStart).toBe(true);
    expect(result.current.flashcardAutoStart).toBe(true);

    act(() => {
      result.current.setQuizAutoStart(false);
    });

    expect(result.current.quizAutoStart).toBe(false);
    expect(result.current.flashcardAutoStart).toBe(true);
  });
});
