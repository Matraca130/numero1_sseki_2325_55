// ============================================================
// useStudyPlans — Fetches study plans from real backend and
// maps them to the frontend StudyPlan model used by ScheduleView.
//
// FLOW:
//   1. Fetch plans from GET /study-plans
//   2. For each plan, fetch tasks from GET /study-plan-tasks?study_plan_id=xxx
//   3. Enrich tasks with display data (title, subject, color) from content tree
//   4. Map to frontend StudyPlan/StudyPlanTask types
//   5. Sync to AppContext.studyPlans so ScheduleView works unchanged
//
// CRUD: createPlan, toggleTask, deletePlan, reorder tasks
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useApp, type StudyPlan, type StudyPlanTask } from '@/app/context/AppContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import {
  getStudyPlans,
  getStudyPlanTasks,
  createStudyPlan as apiCreatePlan,
  createStudyPlanTask as apiCreateTask,
  updateStudyPlanTask as apiUpdateTask,
  updateStudyPlan as apiUpdatePlan,
  deleteStudyPlan as apiDeletePlan,
  deleteStudyPlanTask as apiDeleteTask,
  reorderItems,
} from '@/app/services/platformApi';
import type {
  StudyPlanRecord,
  StudyPlanTaskRecord,
} from '@/app/services/platformApi';

// ── Content tree lookup helpers ─────────────────────────────

interface TopicLookup {
  topicTitle: string;
  sectionTitle: string;
  courseName: string;
  courseId: string;
  courseColor: string;
}

function buildTopicMap(tree: any): Map<string, TopicLookup> {
  const map = new Map<string, TopicLookup>();
  if (!tree?.courses) return map;

  const COLORS = [
    'bg-teal-500', 'bg-blue-500', 'bg-purple-500',
    'bg-amber-500', 'bg-pink-500', 'bg-emerald-500',
  ];

  tree.courses.forEach((course: any, ci: number) => {
    const color = COLORS[ci % COLORS.length];
    course.semesters?.forEach((sem: any) => {
      sem.sections?.forEach((sec: any) => {
        sec.topics?.forEach((topic: any) => {
          map.set(topic.id, {
            topicTitle: topic.name || topic.title || topic.id,
            sectionTitle: sec.name || sec.title || sec.id,
            courseName: course.name || course.title || course.id,
            courseId: course.id,
            courseColor: color,
          });
        });
      });
    });
  });

  return map;
}

// ── Method display info ─────────────────────────────────────

const METHOD_DEFAULTS: Record<string, { minutes: number }> = {
  flashcard: { minutes: 20 },
  quiz: { minutes: 15 },
  video: { minutes: 30 },
  resumo: { minutes: 25 },
  '3d': { minutes: 20 },
  reading: { minutes: 30 },
};

// ── Hook ────────────────────────────────────────────────────

export function useStudyPlans() {
  const { user, status: authStatus } = useAuth();
  const { addStudyPlan: syncToAppContext } = useApp();
  const { tree } = useContentTree();

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [backendPlans, setBackendPlans] = useState<StudyPlanRecord[]>([]);
  const [backendTasksMap, setBackendTasksMap] = useState<Map<string, StudyPlanTaskRecord[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const didInitialSync = useRef(false);

  // Build topic lookup from content tree
  const topicMap = useMemo(
    () => tree ? buildTopicMap(tree) : new Map<string, TopicLookup>(),
    [tree]
  );

  // ── Fetch all plans + tasks ───────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      const rawPlans = await getStudyPlans(undefined, 'active');
      setBackendPlans(rawPlans);

      // Fetch tasks for each plan in parallel
      const taskResults = await Promise.allSettled(
        rawPlans.map(p => getStudyPlanTasks(p.id))
      );

      const tasksMap = new Map<string, StudyPlanTaskRecord[]>();
      rawPlans.forEach((plan, i) => {
        const result = taskResults[i];
        tasksMap.set(
          plan.id,
          result.status === 'fulfilled' ? result.value : []
        );
      });
      setBackendTasksMap(tasksMap);

      console.log(`[useStudyPlans] Loaded ${rawPlans.length} plans`);
    } catch (err: any) {
      console.error('[useStudyPlans] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ── Map backend → frontend model ─────────────────────────

  useEffect(() => {
    const mapped: StudyPlan[] = backendPlans.map(bp => {
      const tasks = backendTasksMap.get(bp.id) || [];
      const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index);

      // Collect unique subjects from tasks
      const subjectSet = new Map<string, { id: string; name: string; color: string }>();

      const frontendTasks: StudyPlanTask[] = sortedTasks.map((bt, idx) => {
        const lookup = topicMap.get(bt.item_id);
        const courseName = lookup?.courseName || 'Materia';
        const courseId = lookup?.courseId || bt.item_id;
        const courseColor = lookup?.courseColor || 'bg-gray-500';
        const topicTitle = lookup?.topicTitle || bt.item_id;

        if (!subjectSet.has(courseId)) {
          subjectSet.set(courseId, { id: courseId, name: courseName, color: courseColor });
        }

        // Derive date from order_index (spread across plan creation + days)
        const planCreated = bp.created_at ? new Date(bp.created_at) : new Date();
        const dayOffset = Math.floor(idx / 3); // ~3 tasks per day
        const taskDate = new Date(planCreated);
        taskDate.setDate(taskDate.getDate() + dayOffset);

        return {
          id: bt.id,
          date: taskDate,
          title: topicTitle,
          subject: courseName,
          subjectColor: courseColor,
          method: bt.item_type,
          estimatedMinutes: METHOD_DEFAULTS[bt.item_type]?.minutes || 25,
          completed: bt.status === 'completed',
        };
      });

      return {
        id: bp.id,
        name: bp.name,
        subjects: Array.from(subjectSet.values()),
        methods: [...new Set(tasks.map(t => t.item_type))],
        selectedTopics: sortedTasks.map(bt => {
          const lookup = topicMap.get(bt.item_id);
          return {
            courseId: lookup?.courseId || '',
            courseName: lookup?.courseName || '',
            sectionTitle: lookup?.sectionTitle || '',
            topicTitle: lookup?.topicTitle || bt.item_id,
            topicId: bt.item_id,
          };
        }),
        completionDate: (() => {
          const d = bp.created_at ? new Date(bp.created_at) : new Date();
          d.setDate(d.getDate() + 30); // default 30-day plan
          return d;
        })(),
        weeklyHours: [2, 2, 2, 2, 2, 1, 1],
        tasks: frontendTasks,
        createdAt: bp.created_at ? new Date(bp.created_at) : new Date(),
        totalEstimatedHours: Math.round(
          frontendTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0) / 60
        ),
      };
    });

    setPlans(mapped);

    // Sync to AppContext on first load (so ScheduleView sees them)
    if (mapped.length > 0 && !didInitialSync.current) {
      didInitialSync.current = true;
      mapped.forEach(plan => syncToAppContext(plan));
    }
  }, [backendPlans, backendTasksMap, topicMap]);

  // ── Auto-fetch on mount ───────────────────────────────────

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (user?.id) fetchAll();
    else setLoading(false);
  }, [user?.id, authStatus, fetchAll]);

  // ── CRUD operations ───────────────────────────────────────

  /** Create a plan from the wizard's generated data */
  const createPlanFromWizard = useCallback(async (
    frontendPlan: StudyPlan
  ): Promise<void> => {
    try {
      // 1) Create the plan
      const record = await apiCreatePlan({
        name: frontendPlan.name,
        status: 'active',
      });

      // 2) Create tasks in parallel (batched for performance)
      const taskPromises = frontendPlan.tasks.map((task, idx) =>
        apiCreateTask({
          study_plan_id: record.id,
          item_type: task.method,
          item_id: frontendPlan.selectedTopics[idx % frontendPlan.selectedTopics.length]?.topicId || task.id,
          status: task.completed ? 'completed' : 'pending',
          order_index: idx,
        })
      );

      await Promise.allSettled(taskPromises);

      // 3) Sync the frontend plan with the real backend ID
      const syncedPlan: StudyPlan = {
        ...frontendPlan,
        id: record.id,
      };
      syncToAppContext(syncedPlan);

      // 4) Refresh from backend
      await fetchAll();

      console.log(`[useStudyPlans] Created plan "${record.name}" with ${frontendPlan.tasks.length} tasks`);
    } catch (err: any) {
      console.error('[useStudyPlans] createPlan error:', err);
      // Still add locally so UI works
      syncToAppContext(frontendPlan);
    }
  }, [fetchAll, syncToAppContext]);

  /** Toggle a task's completion status */
  const toggleTaskComplete = useCallback(async (
    planId: string,
    taskId: string
  ): Promise<void> => {
    // Find the backend task
    const tasks = backendTasksMap.get(planId);
    const task = tasks?.find(t => t.id === taskId);
    if (!task) {
      console.warn(`[useStudyPlans] Task ${taskId} not found in plan ${planId}`);
      return;
    }

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    try {
      await apiUpdateTask(taskId, {
        status: newStatus,
        completed_at: completedAt,
      });

      // Update local state immediately
      setBackendTasksMap(prev => {
        const next = new Map(prev);
        const planTasks = [...(next.get(planId) || [])];
        const idx = planTasks.findIndex(t => t.id === taskId);
        if (idx >= 0) {
          planTasks[idx] = { ...planTasks[idx], status: newStatus as any, completed_at: completedAt };
        }
        next.set(planId, planTasks);
        return next;
      });
    } catch (err: any) {
      console.error('[useStudyPlans] toggleTask error:', err);
    }
  }, [backendTasksMap]);

  /** Reorder tasks within a plan */
  const reorderTasks = useCallback(async (
    planId: string,
    orderedIds: string[]
  ): Promise<void> => {
    const items = orderedIds.map((id, idx) => ({ id, order_index: idx }));

    try {
      await reorderItems('study_plan_tasks', items);

      // Update local state
      setBackendTasksMap(prev => {
        const next = new Map(prev);
        const planTasks = [...(next.get(planId) || [])];
        const reordered = orderedIds
          .map(id => planTasks.find(t => t.id === id))
          .filter(Boolean)
          .map((t, idx) => ({ ...t!, order_index: idx }));
        next.set(planId, reordered);
        return next;
      });
    } catch (err: any) {
      console.error('[useStudyPlans] reorder error:', err);
    }
  }, []);

  /** Update a plan's status */
  const updatePlanStatus = useCallback(async (
    planId: string,
    status: 'active' | 'completed' | 'archived'
  ): Promise<void> => {
    try {
      await apiUpdatePlan(planId, { status });
      await fetchAll();
    } catch (err: any) {
      console.error('[useStudyPlans] updatePlanStatus error:', err);
    }
  }, [fetchAll]);

  /** Delete a plan and all its tasks */
  const deletePlan = useCallback(async (planId: string): Promise<void> => {
    try {
      // Delete all tasks first
      const tasks = backendTasksMap.get(planId) || [];
      await Promise.allSettled(tasks.map(t => apiDeleteTask(t.id)));
      // Then delete the plan
      await apiDeletePlan(planId);
      await fetchAll();
    } catch (err: any) {
      console.error('[useStudyPlans] deletePlan error:', err);
    }
  }, [backendTasksMap, fetchAll]);

  return {
    plans,
    loading,
    error,
    refresh: fetchAll,
    createPlanFromWizard,
    toggleTaskComplete,
    reorderTasks,
    updatePlanStatus,
    deletePlan,
  };
}