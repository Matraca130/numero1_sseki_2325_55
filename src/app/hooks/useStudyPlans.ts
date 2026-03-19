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
// CRUD: createPlan, toggleTask (+ reschedule), deletePlan, reorder tasks
//
// Phase 5 additions:
//   - toggleTaskComplete calls rescheduleRemainingTasks after status update
//   - Reschedule changes persisted via PUT /study-plan-tasks/batch
//   - CREATE sends original_method, scheduled_date, estimated_minutes
//   - READ uses scheduled_date/original_method/estimated_minutes with legacy fallbacks
//   - DELETE simplified via CASCADE (no N+1 task deletes)
//   - Accepts optional topicMastery + getTimeEstimate for reschedule (Opcion B)
// ============================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useStudySession, type StudyPlan, type StudyPlanTask } from '@/app/context/AppContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import {
  getStudyPlans,
  getStudyPlanTasks,
  createStudyPlan as apiCreatePlan,
  createStudyPlanTask as apiCreateTask,
  updateStudyPlanTask as apiUpdateTask,
  updateStudyPlan as apiUpdatePlan,
  deleteStudyPlan as apiDeletePlan,
  batchUpdateTasks as apiBatchUpdate,
  reorderItems,
} from '@/app/services/platformApi';
import type {
  StudyPlanRecord,
  StudyPlanTaskRecord,
} from '@/app/services/platformApi';
import {
  METHOD_TIME_DEFAULTS,
  BACKEND_ITEM_TYPE_TO_METHOD,
  METHOD_TO_BACKEND_ITEM_TYPE,
} from '@/app/utils/constants';
import {
  rescheduleRemainingTasks,
  type RescheduleChange,
} from '@/app/utils/rescheduleEngine';
import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';

// ── PERF-12: Module-level constant (no re-creation per call) ──
const TOPIC_COLORS = [
  'bg-teal-500', 'bg-blue-500', 'bg-purple-500',
  'bg-amber-500', 'bg-pink-500', 'bg-emerald-500',
] as const;

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

  tree.courses.forEach((course: any, ci: number) => {
    const color = TOPIC_COLORS[ci % TOPIC_COLORS.length];
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

// ── Hook Options ────────────────────────────────────────────
// Phase 5 — Opcion B: accept mastery + time estimate data as
// optional props so the caller can share already-loaded data.
// If not provided, reschedule gracefully degrades (no-op).

export interface UseStudyPlansOptions {
  /** Current mastery data from useTopicMastery (Phase 5 reschedule) */
  topicMastery?: Map<string, TopicMasteryInfo>;
  /** Time estimate getter from useStudyTimeEstimates (Phase 5 reschedule) */
  getTimeEstimate?: (methodId: string) => { estimatedMinutes: number };
}

// ── Hook ────────────────────────────────────────────────────

export function useStudyPlans(opts?: UseStudyPlansOptions) {
  const { user, status: authStatus } = useAuth();
  const { addStudyPlan: syncToAppContext } = useStudySession();
  const { tree } = useContentTree();

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [backendPlans, setBackendPlans] = useState<StudyPlanRecord[]>([]);
  const [backendTasksMap, setBackendTasksMap] = useState<Map<string, StudyPlanTaskRecord[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const didInitialSync = useRef(false);

  // Phase 5: Guard against concurrent reschedule operations
  const isRescheduling = useRef(false);

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

      if (import.meta.env.DEV) {
        console.log(`[useStudyPlans] Loaded ${rawPlans.length} plans`);
      }
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

        // Phase 5: Use scheduled_date from backend, fallback to derived date for legacy tasks
        const planCreated = bp.created_at ? new Date(bp.created_at) : new Date();
        const taskDate = bt.scheduled_date
          ? new Date(bt.scheduled_date)
          : (() => {
              const d = new Date(planCreated);
              d.setDate(d.getDate() + Math.floor(idx / 3)); // legacy: ~3 tasks per day
              return d;
            })();

        // Phase 5: Use original_method for display (preserves 'video', '3d', etc.)
        // Falls back to reverse-mapped item_type for legacy tasks
        const displayMethod = bt.original_method
          || BACKEND_ITEM_TYPE_TO_METHOD[bt.item_type]
          || bt.item_type;

        // Phase 5: Use persisted estimated_minutes, fallback to defaults
        const estMinutes = bt.estimated_minutes
          ?? METHOD_TIME_DEFAULTS[bt.item_type]
          ?? METHOD_TIME_DEFAULTS[displayMethod]
          ?? 25;

        return {
          id: bt.id,
          date: taskDate,
          title: topicTitle,
          subject: courseName,
          subjectColor: courseColor,
          method: displayMethod,
          estimatedMinutes: estMinutes,
          completed: bt.status === 'completed',
          topicId: bt.item_id,
        };
      });

      return {
        id: bp.id,
        name: bp.name,
        subjects: Array.from(subjectSet.values()),
        methods: [...new Set(tasks.map(t =>
          t.original_method || BACKEND_ITEM_TYPE_TO_METHOD[t.item_type] || t.item_type
        ))],
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
          // DT-02: read persisted completion_date, fallback for legacy plans
          if (bp.completion_date) return new Date(bp.completion_date);
          const d = bp.created_at ? new Date(bp.created_at) : new Date();
          d.setDate(d.getDate() + 30); // legacy fallback: 30-day plan
          return d;
        })(),
        // DT-02: read persisted weekly_hours, fallback for legacy plans
        weeklyHours: Array.isArray(bp.weekly_hours) && bp.weekly_hours.length === 7
          ? bp.weekly_hours
          : [2, 2, 2, 2, 2, 1, 1], // legacy fallback
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
  }, [backendPlans, backendTasksMap, topicMap, syncToAppContext]);

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
      // 1) Create the plan — DT-02: persists completion_date, weekly_hours, metadata
      const record = await apiCreatePlan({
        name: frontendPlan.name,
        status: 'active',
        completion_date: frontendPlan.completionDate
          ? frontendPlan.completionDate.toISOString().slice(0, 10)
          : undefined,
        weekly_hours: frontendPlan.weeklyHours ?? undefined,
        metadata: {
          methods: frontendPlan.methods,
          totalEstimatedHours: frontendPlan.totalEstimatedHours,
          subjectCount: frontendPlan.subjects.length,
          createdByWizard: true,
        },
      });

      // 2) Create tasks in parallel — Phase 5: sends original_method, scheduled_date, estimated_minutes
      const taskPromises = frontendPlan.tasks.map((task, idx) =>
        apiCreateTask({
          study_plan_id: record.id,
          // DT-12 fix: map wizard methods to valid backend item_type
          item_type: METHOD_TO_BACKEND_ITEM_TYPE[task.method] || 'reading',
          item_id: task.topicId || frontendPlan.selectedTopics[idx % frontendPlan.selectedTopics.length]?.topicId || task.id,
          status: task.completed ? 'completed' : 'pending',
          order_index: idx,
          // Phase 5: preserve original wizard data
          original_method: task.method,
          scheduled_date: task.date instanceof Date
            ? task.date.toISOString().slice(0, 10)
            : undefined,
          estimated_minutes: task.estimatedMinutes,
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

      if (import.meta.env.DEV) {
        console.log(`[useStudyPlans] Created plan "${record.name}" with ${frontendPlan.tasks.length} tasks`);
      }
    } catch (err: any) {
      console.error('[useStudyPlans] createPlan error:', err);
      // Still add locally so UI works
      syncToAppContext(frontendPlan);
    }
  }, [fetchAll, syncToAppContext]);

  // ── Phase 5: Reschedule helper ────────────────────────────
  // Called after a task status change to redistribute pending tasks.
  // Gracefully no-ops if mastery data is unavailable.
  //
  // NOTE: Builds plan snapshot directly from backendPlans + backendTasksMap
  // (which already contain the optimistic update from toggleTaskComplete)
  // instead of reading from the derived `plans` state, which requires
  // a React re-render cycle to propagate. This eliminates the race
  // condition where `plans` might be stale at the time of invocation.

  const runReschedule = useCallback(async (
    planId: string,
    /** Pre-applied tasks snapshot (already contains the status flip) */
    tasksSnapshot: StudyPlanTaskRecord[],
  ): Promise<void> => {
    // Guard: need both mastery and time estimate data
    if (!opts?.topicMastery || !opts?.getTimeEstimate) {
      if (import.meta.env.DEV) {
        console.log('[useStudyPlans] Reschedule skipped: mastery/estimate data not provided');
      }
      return;
    }

    // Guard: prevent concurrent reschedule
    if (isRescheduling.current) {
      if (import.meta.env.DEV) {
        console.log('[useStudyPlans] Reschedule skipped: already in progress');
      }
      return;
    }

    // Find the backend plan record for metadata
    const bp = backendPlans.find(p => p.id === planId);
    if (!bp) {
      if (import.meta.env.DEV) {
        console.warn(`[useStudyPlans] Reschedule skipped: plan ${planId} not found in backendPlans`);
      }
      return;
    }

    // Build a fresh frontend StudyPlan snapshot from backend data
    // (mirrors the mapping effect logic, but inline and synchronous)
    const sortedTasks = [...tasksSnapshot].sort((a, b) => a.order_index - b.order_index);
    const planCreated = bp.created_at ? new Date(bp.created_at) : new Date();

    const frontendTasks: StudyPlanTask[] = sortedTasks.map((bt, idx) => {
      const lookup = topicMap.get(bt.item_id);
      const displayMethod = bt.original_method
        || BACKEND_ITEM_TYPE_TO_METHOD[bt.item_type]
        || bt.item_type;
      const estMinutes = bt.estimated_minutes
        ?? METHOD_TIME_DEFAULTS[bt.item_type]
        ?? METHOD_TIME_DEFAULTS[displayMethod]
        ?? 25;

      const taskDate = bt.scheduled_date
        ? new Date(bt.scheduled_date)
        : (() => {
            const d = new Date(planCreated);
            d.setDate(d.getDate() + Math.floor(idx / 3));
            return d;
          })();

      return {
        id: bt.id,
        date: taskDate,
        title: lookup?.topicTitle || bt.item_id,
        subject: lookup?.courseName || 'Materia',
        subjectColor: lookup?.courseColor || 'bg-gray-500',
        method: displayMethod,
        estimatedMinutes: estMinutes,
        completed: bt.status === 'completed',
        topicId: bt.item_id,
      };
    });

    const planSnapshot: StudyPlan = {
      id: bp.id,
      name: bp.name,
      subjects: [],
      methods: [],
      selectedTopics: [],
      completionDate: bp.completion_date
        ? new Date(bp.completion_date)
        : (() => { const d = new Date(planCreated); d.setDate(d.getDate() + 30); return d; })(),
      weeklyHours: Array.isArray(bp.weekly_hours) && bp.weekly_hours.length === 7
        ? bp.weekly_hours
        : [2, 2, 2, 2, 2, 1, 1],
      tasks: frontendTasks,
      createdAt: planCreated,
      totalEstimatedHours: Math.round(frontendTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0) / 60),
    };

    // Only reschedule if there are pending tasks
    const pendingCount = planSnapshot.tasks.filter(t => !t.completed).length;
    if (pendingCount === 0) {
      if (import.meta.env.DEV) {
        console.log('[useStudyPlans] Reschedule skipped: no pending tasks');
      }
      return;
    }

    isRescheduling.current = true;

    try {
      const result = rescheduleRemainingTasks({
        plan: planSnapshot,
        topicMastery: opts.topicMastery,
        getTimeEstimate: opts.getTimeEstimate,
      });

      if (!result.didReschedule || result.changes.length === 0) {
        if (import.meta.env.DEV) {
          console.log('[useStudyPlans] Reschedule: no changes needed');
        }
        return;
      }

      if (import.meta.env.DEV) {
        console.log(`[useStudyPlans] Reschedule: ${result.changes.length} task(s) will be updated`);
      }

      // Persist changes via batch endpoint
      const batchPayload = {
        study_plan_id: planId,
        updates: result.changes.map((c: RescheduleChange) => ({
          id: c.taskId,
          scheduled_date: c.newDate.toISOString().slice(0, 10),
          estimated_minutes: c.newEstimatedMinutes,
          order_index: c.newOrderIndex,
        })),
      };

      try {
        const batchResult = await apiBatchUpdate(batchPayload);
        if (import.meta.env.DEV) {
          console.log(`[useStudyPlans] Batch update: ${batchResult.succeeded}/${batchResult.total} succeeded`);
        }
      } catch (batchErr: any) {
        // Batch endpoint not yet deployed — fall back to individual PUTs
        if (import.meta.env.DEV) {
          console.warn('[useStudyPlans] Batch endpoint unavailable, falling back to individual updates:', batchErr.message);
        }
        await Promise.allSettled(
          batchPayload.updates.map(u =>
            apiUpdateTask(u.id, {
              scheduled_date: u.scheduled_date,
              estimated_minutes: u.estimated_minutes,
              order_index: u.order_index,
            })
          )
        );
      }

      // Update local state optimistically with rescheduled tasks
      setBackendTasksMap(prev => {
        const next = new Map(prev);
        const planTasks = [...(next.get(planId) || [])];

        for (const change of result.changes) {
          const idx = planTasks.findIndex(t => t.id === change.taskId);
          if (idx >= 0) {
            planTasks[idx] = {
              ...planTasks[idx],
              scheduled_date: change.newDate.toISOString().slice(0, 10),
              estimated_minutes: change.newEstimatedMinutes,
              order_index: change.newOrderIndex,
            };
          }
        }

        next.set(planId, planTasks);
        return next;
      });
    } catch (err: any) {
      console.error('[useStudyPlans] Reschedule error (non-blocking):', err);
      // Non-blocking: task status was already saved, reschedule is best-effort
    } finally {
      isRescheduling.current = false;
    }
  }, [backendPlans, topicMap, opts?.topicMastery, opts?.getTimeEstimate]);

  /** Toggle a task's completion status + trigger reschedule */
  const toggleTaskComplete = useCallback(async (
    planId: string,
    taskId: string
  ): Promise<void> => {
    // Find the backend task
    const tasks = backendTasksMap.get(planId);
    const task = tasks?.find(t => t.id === taskId);
    if (!task) {
      if (import.meta.env.DEV) {
        console.warn(`[useStudyPlans] Task ${taskId} not found in plan ${planId}`);
      }
      return;
    }

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    // Build the tasks snapshot WITH the status flip already applied
    // This is the ground truth for the reschedule engine — no race condition.
    const updatedTasks = (tasks || []).map(t =>
      t.id === taskId
        ? { ...t, status: newStatus as StudyPlanTaskRecord['status'], completed_at: completedAt }
        : t
    );

    try {
      // Step 1: Update task status on backend
      await apiUpdateTask(taskId, {
        status: newStatus,
        completed_at: completedAt,
      });

      // Step 2: Optimistic local update
      setBackendTasksMap(prev => {
        const next = new Map(prev);
        next.set(planId, updatedTasks);
        return next;
      });

      // Step 3: Phase 5 — Trigger reschedule after completing a task
      // Pass the already-updated tasks snapshot directly (no setTimeout needed)
      if (newStatus === 'completed') {
        runReschedule(planId, updatedTasks);
      }
    } catch (err: any) {
      console.error('[useStudyPlans] toggleTask error:', err);
    }
  }, [backendTasksMap, runReschedule]);

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

  /** Delete a plan — Phase 5: simplified via CASCADE (tasks auto-deleted) */
  const deletePlan = useCallback(async (planId: string): Promise<void> => {
    try {
      // CASCADE FK auto-deletes all study_plan_tasks for this plan
      await apiDeletePlan(planId);
      await fetchAll();
    } catch (err: any) {
      console.error('[useStudyPlans] deletePlan error:', err);
    }
  }, [fetchAll]);

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
