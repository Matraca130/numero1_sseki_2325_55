// ============================================================
// Tests: StudyPlansContext
//
// Validates the StudyPlansProvider context wrapper:
//   - Exposes useStudyPlans hook values through context
//   - findPendingTask locates first incomplete task by topicId + method
//   - useStudyPlansContext throws when used outside provider
//
// Mocks:
//   - @/app/hooks/useStudyPlans
//   - @/app/context/TopicMasteryContext
//   - @/app/context/StudyTimeEstimatesContext
//
// RUN: npx vitest run src/app/context/__tests__/StudyPlansContext.test.tsx
// ============================================================

import React from 'react';
import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock useTopicMasteryContext ──────────────────────────────

const mockTopicMastery = new Map();

vi.mock('@/app/context/TopicMasteryContext', () => ({
  useTopicMasteryContext: () => ({
    topicMastery: mockTopicMastery,
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

// ── Mock useStudyTimeEstimatesContext ────────────────────────

const mockGetEstimate = vi.fn().mockReturnValue({ estimatedMinutes: 25 });

vi.mock('@/app/context/StudyTimeEstimatesContext', () => ({
  useStudyTimeEstimatesContext: () => ({
    getEstimate: mockGetEstimate,
    loading: false,
    error: null,
  }),
}));

// ── Mock useStudyPlans hook ─────────────────────────────────

const mockRefresh = vi.fn().mockResolvedValue(undefined);
const mockCreatePlanFromWizard = vi.fn().mockResolvedValue(undefined);
const mockToggleTaskComplete = vi.fn().mockResolvedValue(undefined);
const mockReorderTasks = vi.fn().mockResolvedValue(undefined);
const mockUpdatePlanStatus = vi.fn().mockResolvedValue(undefined);
const mockDeletePlan = vi.fn().mockResolvedValue(undefined);

let mockPlans: Array<{
  id: string;
  name: string;
  tasks: Array<{
    id: string;
    completed: boolean;
    topicId: string;
    method: string;
    date: Date;
    title: string;
    subject: string;
    subjectColor: string;
    estimatedMinutes: number;
  }>;
  subjects: Array<{ id: string; name: string; color: string }>;
  methods: string[];
  selectedTopics: Array<{ courseId: string; courseName: string; sectionTitle: string; topicTitle: string; topicId: string }>;
  completionDate: Date;
  weeklyHours: number[];
  createdAt: Date;
  totalEstimatedHours: number;
}> = [];

vi.mock('@/app/hooks/useStudyPlans', () => ({
  useStudyPlans: () => ({
    plans: mockPlans,
    loading: false,
    error: null,
    refresh: mockRefresh,
    createPlanFromWizard: mockCreatePlanFromWizard,
    toggleTaskComplete: mockToggleTaskComplete,
    reorderTasks: mockReorderTasks,
    updatePlanStatus: mockUpdatePlanStatus,
    deletePlan: mockDeletePlan,
  }),
}));

// ── Import AFTER mocks ──────────────────────────────────────

import { StudyPlansProvider, useStudyPlansContext } from '@/app/context/StudyPlansContext';

// ── Helpers ─────────────────────────────────────────────────

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <StudyPlansProvider>{children}</StudyPlansProvider>;
  };
}

function createMockTask(overrides: Partial<typeof mockPlans[0]['tasks'][0]> = {}) {
  return {
    id: 'task-1',
    date: new Date('2026-03-26'),
    title: 'Review chapter 1',
    subject: 'Mathematics',
    subjectColor: 'bg-blue-500',
    method: 'flashcard',
    estimatedMinutes: 30,
    completed: false,
    topicId: 'topic-1',
    ...overrides,
  };
}

function createMockPlan(overrides: Partial<typeof mockPlans[0]> = {}) {
  return {
    id: 'plan-1',
    name: 'Midterm prep',
    subjects: [{ id: 'sub-1', name: 'Mathematics', color: 'bg-blue-500' }],
    methods: ['flashcard', 'quiz'],
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

// ── Tests ───────────────────────────────────────────────────

beforeEach(() => {
  mockPlans = [];
  vi.clearAllMocks();
});

describe('useStudyPlansContext() outside provider', () => {
  it('throws when used outside StudyPlansProvider', () => {
    // Suppress console.error for expected throw
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useStudyPlansContext());
    }).toThrow('useStudyPlansContext must be used within a StudyPlansProvider');

    consoleSpy.mockRestore();
  });
});

describe('StudyPlansProvider — context values', () => {
  it('exposes all expected properties from useStudyPlans', () => {
    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toHaveProperty('plans');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refresh');
    expect(result.current).toHaveProperty('createPlanFromWizard');
    expect(result.current).toHaveProperty('toggleTaskComplete');
    expect(result.current).toHaveProperty('reorderTasks');
    expect(result.current).toHaveProperty('updatePlanStatus');
    expect(result.current).toHaveProperty('deletePlan');
    expect(result.current).toHaveProperty('findPendingTask');
  });

  it('returns plans from the hook', () => {
    const plan = createMockPlan();
    mockPlans = [plan];

    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    expect(result.current.plans).toHaveLength(1);
    expect(result.current.plans[0].id).toBe('plan-1');
    expect(result.current.plans[0].name).toBe('Midterm prep');
  });

  it('returns loading=false and error=null from mock', () => {
    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('delegates refresh to the hook', async () => {
    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('delegates createPlanFromWizard to the hook', async () => {
    const plan = createMockPlan();

    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.createPlanFromWizard(plan);
    });

    expect(mockCreatePlanFromWizard).toHaveBeenCalledWith(plan);
  });

  it('delegates toggleTaskComplete to the hook', async () => {
    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.toggleTaskComplete('plan-1', 'task-1');
    });

    expect(mockToggleTaskComplete).toHaveBeenCalledWith('plan-1', 'task-1');
  });

  it('delegates reorderTasks to the hook', async () => {
    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.reorderTasks('plan-1', ['task-2', 'task-1']);
    });

    expect(mockReorderTasks).toHaveBeenCalledWith('plan-1', ['task-2', 'task-1']);
  });

  it('delegates updatePlanStatus to the hook', async () => {
    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.updatePlanStatus('plan-1', 'completed');
    });

    expect(mockUpdatePlanStatus).toHaveBeenCalledWith('plan-1', 'completed');
  });

  it('delegates deletePlan to the hook', async () => {
    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.deletePlan('plan-1');
    });

    expect(mockDeletePlan).toHaveBeenCalledWith('plan-1');
  });
});

describe('findPendingTask()', () => {
  it('returns the first pending task matching topicId and method', () => {
    mockPlans = [
      createMockPlan({
        id: 'plan-1',
        tasks: [
          createMockTask({ id: 'task-1', topicId: 'topic-1', method: 'flashcard', completed: false }),
          createMockTask({ id: 'task-2', topicId: 'topic-1', method: 'quiz', completed: false }),
        ],
      }),
    ];

    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    const found = result.current.findPendingTask('topic-1', 'flashcard');
    expect(found).toEqual({ planId: 'plan-1', taskId: 'task-1' });
  });

  it('returns null when no matching pending task exists', () => {
    mockPlans = [
      createMockPlan({
        id: 'plan-1',
        tasks: [
          createMockTask({ id: 'task-1', topicId: 'topic-1', method: 'flashcard', completed: true }),
        ],
      }),
    ];

    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    const found = result.current.findPendingTask('topic-1', 'flashcard');
    expect(found).toBeNull();
  });

  it('returns null when topicId does not match', () => {
    mockPlans = [
      createMockPlan({
        id: 'plan-1',
        tasks: [
          createMockTask({ id: 'task-1', topicId: 'topic-1', method: 'flashcard', completed: false }),
        ],
      }),
    ];

    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    const found = result.current.findPendingTask('topic-999', 'flashcard');
    expect(found).toBeNull();
  });

  it('returns null when method does not match', () => {
    mockPlans = [
      createMockPlan({
        id: 'plan-1',
        tasks: [
          createMockTask({ id: 'task-1', topicId: 'topic-1', method: 'flashcard', completed: false }),
        ],
      }),
    ];

    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    const found = result.current.findPendingTask('topic-1', 'quiz');
    expect(found).toBeNull();
  });

  it('skips completed tasks and finds the next pending one', () => {
    mockPlans = [
      createMockPlan({
        id: 'plan-1',
        tasks: [
          createMockTask({ id: 'task-1', topicId: 'topic-1', method: 'flashcard', completed: true }),
          createMockTask({ id: 'task-2', topicId: 'topic-1', method: 'flashcard', completed: false }),
        ],
      }),
    ];

    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    const found = result.current.findPendingTask('topic-1', 'flashcard');
    expect(found).toEqual({ planId: 'plan-1', taskId: 'task-2' });
  });

  it('searches across multiple plans', () => {
    mockPlans = [
      createMockPlan({
        id: 'plan-1',
        tasks: [
          createMockTask({ id: 'task-1', topicId: 'topic-1', method: 'flashcard', completed: true }),
        ],
      }),
      createMockPlan({
        id: 'plan-2',
        tasks: [
          createMockTask({ id: 'task-3', topicId: 'topic-1', method: 'flashcard', completed: false }),
        ],
      }),
    ];

    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    const found = result.current.findPendingTask('topic-1', 'flashcard');
    expect(found).toEqual({ planId: 'plan-2', taskId: 'task-3' });
  });

  it('returns null when no plans exist', () => {
    mockPlans = [];

    const { result } = renderHook(() => useStudyPlansContext(), {
      wrapper: createWrapper(),
    });

    const found = result.current.findPendingTask('topic-1', 'flashcard');
    expect(found).toBeNull();
  });
});
