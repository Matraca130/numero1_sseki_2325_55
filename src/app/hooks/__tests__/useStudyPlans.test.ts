// ============================================================
// Hook Tests -- useStudyPlans
//
// Tests the useStudyPlans hook:
//   - Fetch plans + tasks from backend
//   - Map backend records to frontend StudyPlan model
//   - Task enrichment with content tree data
//   - CRUD: create, toggle, reorder, updateStatus, delete
//   - Error handling and loading states
//   - Reschedule guard behavior
//
// Mocks:
//   - @/app/context/AuthContext (useAuth)
//   - @/app/context/AppContext (useStudySession)
//   - @/app/context/ContentTreeContext (useContentTree)
//   - @/app/services/platformApi (all study plan API functions)
//   - @/app/utils/rescheduleEngine (rescheduleRemainingTasks, applyAiReschedule)
//   - @/app/services/aiService (aiReschedule)
//
// RUN: npx vitest run src/app/hooks/__tests__/useStudyPlans.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { StudyPlanRecord, StudyPlanTaskRecord } from '@/app/services/platformApi';

// ── Mock AuthContext ────────────────────────────────────────

const mockUser = { id: 'user-1', email: 'test@test.com' };

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    status: 'authenticated',
  }),
}));

// ── Mock AppContext ─────────────────────────────────────────

const mockSyncToAppContext = vi.fn();

vi.mock('@/app/context/AppContext', () => ({
  useStudySession: () => ({
    addStudyPlan: mockSyncToAppContext,
  }),
}));

// ── Mock ContentTreeContext ─────────────────────────────────

const mockTree = {
  courses: [
    {
      id: 'course-1',
      name: 'Calculus I',
      semesters: [
        {
          id: 'sem-1',
          sections: [
            {
              id: 'sec-1',
              name: 'Limits',
              topics: [
                { id: 'topic-1', name: 'Epsilon-delta' },
                { id: 'topic-2', name: 'Continuity' },
              ],
            },
          ],
        },
      ],
    },
  ],
};

vi.mock('@/app/context/ContentTreeContext', () => ({
  useContentTree: () => ({
    tree: mockTree,
    loading: false,
    error: null,
  }),
}));

// ── Mock platformApi ────────────────────────────────────────

const mockGetStudyPlans = vi.fn<() => Promise<StudyPlanRecord[]>>();
const mockGetStudyPlanTasks = vi.fn<(id: string) => Promise<StudyPlanTaskRecord[]>>();
const mockApiCreatePlan = vi.fn();
const mockApiCreateTask = vi.fn();
const mockApiUpdateTask = vi.fn();
const mockApiUpdatePlan = vi.fn();
const mockApiDeletePlan = vi.fn();
const mockApiBatchUpdate = vi.fn();
const mockReorderItems = vi.fn();

vi.mock('@/app/services/platformApi', () => ({
  getStudyPlans: (...args: unknown[]) => mockGetStudyPlans(...(args as [])),
  getStudyPlanTasks: (...args: unknown[]) => mockGetStudyPlanTasks(...(args as [string])),
  createStudyPlan: (...args: unknown[]) => mockApiCreatePlan(...args),
  createStudyPlanTask: (...args: unknown[]) => mockApiCreateTask(...args),
  updateStudyPlanTask: (...args: unknown[]) => mockApiUpdateTask(...args),
  updateStudyPlan: (...args: unknown[]) => mockApiUpdatePlan(...args),
  deleteStudyPlan: (...args: unknown[]) => mockApiDeletePlan(...args),
  batchUpdateTasks: (...args: unknown[]) => mockApiBatchUpdate(...args),
  reorderItems: (...args: unknown[]) => mockReorderItems(...args),
}));

// ── Mock rescheduleEngine ───────────────────────────────────

vi.mock('@/app/utils/rescheduleEngine', () => ({
  rescheduleRemainingTasks: vi.fn().mockReturnValue({
    tasks: [],
    changes: [],
    didReschedule: false,
  }),
  applyAiReschedule: vi.fn().mockReturnValue({
    tasks: [],
    changes: [],
    didReschedule: false,
  }),
}));

// ── Mock aiService ──────────────────────────────────────────

vi.mock('@/app/services/aiService', () => ({
  aiReschedule: vi.fn().mockResolvedValue(null),
}));

// ── Mock constants ──────────────────────────────────────────

vi.mock('@/app/utils/constants', () => ({
  METHOD_TIME_DEFAULTS: {
    flashcard: 20,
    quiz: 15,
    video: 35,
    resumo: 40,
    '3d': 15,
    reading: 30,
  },
  BACKEND_ITEM_TYPE_TO_METHOD: {
    flashcard: 'flashcard',
    quiz: 'quiz',
    reading: 'resumo',
    keyword: 'resumo',
  },
  METHOD_TO_BACKEND_ITEM_TYPE: {
    flashcard: 'flashcard',
    quiz: 'quiz',
    resumo: 'reading',
    video: 'reading',
    '3d': 'reading',
    reading: 'reading',
  },
}));

// ── Import AFTER mocks ──────────────────────────────────────

import { useStudyPlans } from '@/app/hooks/useStudyPlans';

// ── Test Data Factories ─────────────────────────────────────

function createBackendPlan(overrides: Partial<StudyPlanRecord> = {}): StudyPlanRecord {
  return {
    id: 'plan-1',
    name: 'Midterm prep',
    status: 'active',
    completion_date: '2026-04-15',
    weekly_hours: [2, 2, 2, 2, 2, 1, 1],
    created_at: '2026-03-20T00:00:00Z',
    ...overrides,
  };
}

function createBackendTask(overrides: Partial<StudyPlanTaskRecord> = {}): StudyPlanTaskRecord {
  return {
    id: 'task-1',
    study_plan_id: 'plan-1',
    item_type: 'flashcard',
    item_id: 'topic-1',
    status: 'pending',
    order_index: 0,
    original_method: 'flashcard',
    scheduled_date: '2026-03-26',
    estimated_minutes: 25,
    ...overrides,
  };
}

// ── Helpers ─────────────────────────────────────────────────

/** Flush async effects */
async function flushAsync() {
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

// ── Tests ───────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStudyPlans.mockResolvedValue([]);
  mockGetStudyPlanTasks.mockResolvedValue([]);
});

describe('useStudyPlans — initial fetch', () => {
  it('starts in loading state and fetches plans on mount', async () => {
    mockGetStudyPlans.mockResolvedValue([]);

    const { result } = renderHook(() => useStudyPlans());

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetStudyPlans).toHaveBeenCalledWith(undefined, 'active');
    expect(result.current.plans).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches plans and their tasks in parallel', async () => {
    const plan1 = createBackendPlan({ id: 'plan-1' });
    const plan2 = createBackendPlan({ id: 'plan-2', name: 'Final prep' });

    mockGetStudyPlans.mockResolvedValue([plan1, plan2]);
    mockGetStudyPlanTasks.mockImplementation((planId: string) => {
      if (planId === 'plan-1') {
        return Promise.resolve([createBackendTask({ id: 'task-1', study_plan_id: 'plan-1' })]);
      }
      return Promise.resolve([createBackendTask({ id: 'task-2', study_plan_id: 'plan-2' })]);
    });

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetStudyPlanTasks).toHaveBeenCalledWith('plan-1');
    expect(mockGetStudyPlanTasks).toHaveBeenCalledWith('plan-2');
    expect(result.current.plans).toHaveLength(2);
  });

  it('sets error on fetch failure', async () => {
    mockGetStudyPlans.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.plans).toEqual([]);
  });

  it('handles task fetch partial failures gracefully', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });
    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockRejectedValue(new Error('Task fetch failed'));

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Plan should still be mapped, just with empty tasks
    expect(result.current.plans).toHaveLength(1);
    expect(result.current.plans[0].tasks).toEqual([]);
  });
});

describe('useStudyPlans — backend to frontend mapping', () => {
  it('maps backend plan fields to frontend model', async () => {
    const plan = createBackendPlan({
      id: 'plan-1',
      name: 'Midterm prep',
      completion_date: '2026-04-15',
      weekly_hours: [2, 2, 2, 2, 2, 1, 1],
      created_at: '2026-03-20T00:00:00Z',
    });
    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const mapped = result.current.plans[0];
    expect(mapped.id).toBe('plan-1');
    expect(mapped.name).toBe('Midterm prep');
    expect(mapped.completionDate).toEqual(new Date('2026-04-15'));
    expect(mapped.weeklyHours).toEqual([2, 2, 2, 2, 2, 1, 1]);
  });

  it('maps backend tasks with content tree enrichment', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });
    const task = createBackendTask({
      id: 'task-1',
      item_id: 'topic-1',
      item_type: 'flashcard',
      original_method: 'flashcard',
      scheduled_date: '2026-03-26',
      estimated_minutes: 25,
      order_index: 0,
      status: 'pending',
    });

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([task]);

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const frontendTask = result.current.plans[0].tasks[0];
    expect(frontendTask.id).toBe('task-1');
    expect(frontendTask.title).toBe('Epsilon-delta'); // from content tree
    expect(frontendTask.subject).toBe('Calculus I');   // from content tree
    expect(frontendTask.method).toBe('flashcard');
    expect(frontendTask.estimatedMinutes).toBe(25);
    expect(frontendTask.completed).toBe(false);
    expect(frontendTask.topicId).toBe('topic-1');
  });

  it('sorts tasks by order_index', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });
    const tasks = [
      createBackendTask({ id: 'task-b', order_index: 2, item_id: 'topic-2' }),
      createBackendTask({ id: 'task-a', order_index: 0, item_id: 'topic-1' }),
      createBackendTask({ id: 'task-c', order_index: 1, item_id: 'topic-1' }),
    ];

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue(tasks);

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const taskIds = result.current.plans[0].tasks.map(t => t.id);
    expect(taskIds).toEqual(['task-a', 'task-c', 'task-b']);
  });

  it('uses original_method for display, falls back to BACKEND_ITEM_TYPE_TO_METHOD', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });
    const taskWithOriginalMethod = createBackendTask({
      id: 'task-1',
      original_method: 'video',
      item_type: 'reading',
    });
    const taskWithoutOriginalMethod = createBackendTask({
      id: 'task-2',
      original_method: null,
      item_type: 'reading',
      order_index: 1,
    });

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([taskWithOriginalMethod, taskWithoutOriginalMethod]);

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plans[0].tasks[0].method).toBe('video');
    expect(result.current.plans[0].tasks[1].method).toBe('resumo'); // BACKEND_ITEM_TYPE_TO_METHOD['reading']
  });

  it('uses estimated_minutes from backend, falls back to METHOD_TIME_DEFAULTS', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });
    const taskWithMinutes = createBackendTask({
      id: 'task-1',
      estimated_minutes: 45,
    });
    const taskWithoutMinutes = createBackendTask({
      id: 'task-2',
      estimated_minutes: null,
      item_type: 'flashcard',
      order_index: 1,
    });

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([taskWithMinutes, taskWithoutMinutes]);

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plans[0].tasks[0].estimatedMinutes).toBe(45);
    expect(result.current.plans[0].tasks[1].estimatedMinutes).toBe(20); // METHOD_TIME_DEFAULTS['flashcard']
  });

  it('falls back to legacy date calculation when scheduled_date is null', async () => {
    const plan = createBackendPlan({
      id: 'plan-1',
      created_at: '2026-03-20T00:00:00Z',
    });
    const task = createBackendTask({
      id: 'task-1',
      scheduled_date: null,
      order_index: 0,
    });

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([task]);

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Legacy: date = planCreated + floor(idx / 3)
    // idx=0 => floor(0/3)=0 => same day as plan created
    const taskDate = result.current.plans[0].tasks[0].date;
    expect(taskDate.toISOString().slice(0, 10)).toBe('2026-03-20');
  });

  it('uses legacy fallback for completion_date when null', async () => {
    const plan = createBackendPlan({
      id: 'plan-1',
      completion_date: null,
      created_at: '2026-03-20T00:00:00Z',
    });

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Legacy fallback: created_at + 30 days
    const expected = new Date('2026-03-20T00:00:00Z');
    expected.setDate(expected.getDate() + 30);
    expect(result.current.plans[0].completionDate.toISOString().slice(0, 10))
      .toBe(expected.toISOString().slice(0, 10));
  });

  it('uses legacy fallback for weekly_hours when not valid array', async () => {
    const plan = createBackendPlan({
      id: 'plan-1',
      weekly_hours: null,
    });

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.plans[0].weeklyHours).toEqual([2, 2, 2, 2, 2, 1, 1]);
  });

  it('collects unique subjects from tasks via content tree', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });
    const tasks = [
      createBackendTask({ id: 'task-1', item_id: 'topic-1', order_index: 0 }),
      createBackendTask({ id: 'task-2', item_id: 'topic-2', order_index: 1 }),
    ];

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue(tasks);

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Both topics are from same course, so only 1 subject
    expect(result.current.plans[0].subjects).toHaveLength(1);
    expect(result.current.plans[0].subjects[0].name).toBe('Calculus I');
  });

  it('syncs to AppContext on first load', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });
    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([createBackendTask()]);

    renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(mockSyncToAppContext).toHaveBeenCalled();
    });

    expect(mockSyncToAppContext).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'plan-1' })
    );
  });
});

describe('useStudyPlans — createPlanFromWizard', () => {
  it('creates plan and tasks on the backend, then refreshes', async () => {
    mockGetStudyPlans.mockResolvedValue([]);
    mockApiCreatePlan.mockResolvedValue({ id: 'new-plan', name: 'New Plan' });
    mockApiCreateTask.mockResolvedValue({ id: 'new-task' });

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const frontendPlan = {
      id: 'temp-id',
      name: 'New Plan',
      subjects: [{ id: 'sub-1', name: 'Math', color: 'bg-blue-500' }],
      methods: ['flashcard'],
      selectedTopics: [
        { courseId: 'c1', courseName: 'Math', sectionTitle: 'S1', topicTitle: 'T1', topicId: 'topic-1' },
      ],
      completionDate: new Date('2026-05-01'),
      weeklyHours: [2, 2, 2, 2, 2, 1, 1],
      tasks: [
        {
          id: 'temp-task-1',
          date: new Date('2026-03-26'),
          title: 'Study topic 1',
          subject: 'Math',
          subjectColor: 'bg-blue-500',
          method: 'flashcard',
          estimatedMinutes: 25,
          completed: false,
          topicId: 'topic-1',
        },
      ],
      createdAt: new Date(),
      totalEstimatedHours: 5,
    };

    await act(async () => {
      await result.current.createPlanFromWizard(frontendPlan);
    });

    expect(mockApiCreatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Plan',
        status: 'active',
      })
    );
    expect(mockApiCreateTask).toHaveBeenCalledTimes(1);
    // Should sync with the real backend ID
    expect(mockSyncToAppContext).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-plan' })
    );
  });

  it('falls back to local sync when backend create fails', async () => {
    mockGetStudyPlans.mockResolvedValue([]);
    mockApiCreatePlan.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const frontendPlan = {
      id: 'temp-id',
      name: 'Offline Plan',
      subjects: [],
      methods: [],
      selectedTopics: [],
      completionDate: new Date('2026-05-01'),
      weeklyHours: [2, 2, 2, 2, 2, 1, 1],
      tasks: [],
      createdAt: new Date(),
      totalEstimatedHours: 0,
    };

    await act(async () => {
      await result.current.createPlanFromWizard(frontendPlan);
    });

    // Should still sync locally even on error
    expect(mockSyncToAppContext).toHaveBeenCalledWith(frontendPlan);
  });
});

describe('useStudyPlans — toggleTaskComplete', () => {
  it('toggles a pending task to completed', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });
    const task = createBackendTask({ id: 'task-1', status: 'pending' });

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([task]);
    mockApiUpdateTask.mockResolvedValue({ ...task, status: 'completed' });

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleTaskComplete('plan-1', 'task-1');
    });

    expect(mockApiUpdateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({
      status: 'completed',
    }));
  });

  it('toggles a completed task back to pending', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });
    const task = createBackendTask({ id: 'task-1', status: 'completed' });

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([task]);
    mockApiUpdateTask.mockResolvedValue({ ...task, status: 'pending' });

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleTaskComplete('plan-1', 'task-1');
    });

    expect(mockApiUpdateTask).toHaveBeenCalledWith('task-1', expect.objectContaining({
      status: 'pending',
      completed_at: null,
    }));
  });

  it('does nothing when task not found', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleTaskComplete('plan-1', 'nonexistent');
    });

    expect(mockApiUpdateTask).not.toHaveBeenCalled();
  });
});

describe('useStudyPlans — reorderTasks', () => {
  it('calls reorderItems API and updates local state', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });
    const tasks = [
      createBackendTask({ id: 'task-a', order_index: 0, item_id: 'topic-1' }),
      createBackendTask({ id: 'task-b', order_index: 1, item_id: 'topic-2' }),
    ];

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue(tasks);
    mockReorderItems.mockResolvedValue(undefined);

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.reorderTasks('plan-1', ['task-b', 'task-a']);
    });

    expect(mockReorderItems).toHaveBeenCalledWith('study_plan_tasks', [
      { id: 'task-b', order_index: 0 },
      { id: 'task-a', order_index: 1 },
    ]);
  });

  it('handles reorder API error gracefully', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });
    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([]);
    mockReorderItems.mockRejectedValue(new Error('Reorder failed'));

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not throw
    await act(async () => {
      await result.current.reorderTasks('plan-1', []);
    });
  });
});

describe('useStudyPlans — updatePlanStatus', () => {
  it('calls updateStudyPlan API and refreshes', async () => {
    mockGetStudyPlans.mockResolvedValue([]);
    mockApiUpdatePlan.mockResolvedValue({});

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updatePlanStatus('plan-1', 'completed');
    });

    expect(mockApiUpdatePlan).toHaveBeenCalledWith('plan-1', { status: 'completed' });
    // fetchAll should be called again after update
    expect(mockGetStudyPlans).toHaveBeenCalledTimes(2); // once on mount, once after update
  });

  it('handles updatePlanStatus API error gracefully', async () => {
    mockGetStudyPlans.mockResolvedValue([]);
    mockApiUpdatePlan.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not throw
    await act(async () => {
      await result.current.updatePlanStatus('plan-1', 'archived');
    });
  });
});

describe('useStudyPlans — deletePlan', () => {
  it('calls deleteStudyPlan API and refreshes', async () => {
    mockGetStudyPlans.mockResolvedValue([]);
    mockApiDeletePlan.mockResolvedValue(undefined);

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deletePlan('plan-1');
    });

    expect(mockApiDeletePlan).toHaveBeenCalledWith('plan-1');
    expect(mockGetStudyPlans).toHaveBeenCalledTimes(2); // mount + post-delete
  });

  it('handles deletePlan API error gracefully', async () => {
    mockGetStudyPlans.mockResolvedValue([]);
    mockApiDeletePlan.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not throw
    await act(async () => {
      await result.current.deletePlan('plan-1');
    });
  });
});

describe('useStudyPlans — reschedule guards', () => {
  it('skips reschedule when no topicMastery or getTimeEstimate provided', async () => {
    const plan = createBackendPlan({ id: 'plan-1' });
    const task = createBackendTask({ id: 'task-1', status: 'pending' });

    mockGetStudyPlans.mockResolvedValue([plan]);
    mockGetStudyPlanTasks.mockResolvedValue([task]);
    mockApiUpdateTask.mockResolvedValue({ ...task, status: 'completed' });

    // No opts provided => reschedule should be skipped
    const { result } = renderHook(() => useStudyPlans());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.toggleTaskComplete('plan-1', 'task-1');
    });

    // Batch update should NOT be called (reschedule skipped)
    expect(mockApiBatchUpdate).not.toHaveBeenCalled();
  });
});

describe('useStudyPlans — return shape', () => {
  it('returns all expected properties', async () => {
    mockGetStudyPlans.mockResolvedValue([]);

    const { result } = renderHook(() => useStudyPlans());

    expect(result.current).toHaveProperty('plans');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refresh');
    expect(result.current).toHaveProperty('createPlanFromWizard');
    expect(result.current).toHaveProperty('toggleTaskComplete');
    expect(result.current).toHaveProperty('reorderTasks');
    expect(result.current).toHaveProperty('updatePlanStatus');
    expect(result.current).toHaveProperty('deletePlan');

    expect(typeof result.current.refresh).toBe('function');
    expect(typeof result.current.createPlanFromWizard).toBe('function');
    expect(typeof result.current.toggleTaskComplete).toBe('function');
    expect(typeof result.current.reorderTasks).toBe('function');
    expect(typeof result.current.updatePlanStatus).toBe('function');
    expect(typeof result.current.deletePlan).toBe('function');
  });
});
