/**
 * useStudyPlans — Main hook for study plan CRUD and reschedule.
 * Fetches plans from backend, maps to frontend model, syncs to AppContext.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useStudySession, type StudyPlan } from '@/app/context/AppContext';
import { useContentTree } from '@/app/context/ContentTreeContext';
import {
  getStudyPlans,
  getStudyPlanTasks,
  createStudyPlan as apiCreatePlan,
  createStudyPlanTask as apiCreateTask,
  updateStudyPlanTask as apiUpdateTask,
  updateStudyPlan as apiUpdatePlan,
  deleteStudyPlan as apiDeletePlan,
  reorderItems,
} from '@/app/services/platformApi';
import type { StudyPlanRecord, StudyPlanTaskRecord } from '@/app/services/platformApi';
import { METHOD_TO_BACKEND_ITEM_TYPE } from '@/app/utils/constants';
import type { UseStudyPlansOptions } from './types';
import { buildTopicMap } from './helpers';
import type { TopicLookup } from './types';
import { mapBackendPlanToFrontend } from './data-mapping';
import { executeReschedule } from './reschedule-runner';

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
      if (import.meta.env.DEV) console.error('[useStudyPlans] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // ── Map backend → frontend model ─────────────────────────

  useEffect(() => {
    const mapped: StudyPlan[] = backendPlans.map(bp => {
      const tasks = backendTasksMap.get(bp.id) || [];
      return mapBackendPlanToFrontend(bp, tasks, topicMap);
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

  // ── Reschedule helper ─────────────────────────────────────
  // NOTE: Receives pre-applied tasksSnapshot directly from toggleTaskComplete
  // (which already contains the optimistic status flip) instead of reading
  // from the derived `plans` state, which requires a React re-render cycle
  // to propagate. This eliminates the race condition where `plans` might
  // be stale at the time of invocation.

  const runReschedule = useCallback(async (
    planId: string,
    /** Pre-applied tasks snapshot (already contains the status flip) */
    tasksSnapshot: StudyPlanTaskRecord[],
    completedTaskId: string,
  ): Promise<void> => {
    if (!opts?.topicMastery || !opts?.getTimeEstimate) {
      if (import.meta.env.DEV) {
        console.log('[useStudyPlans] Reschedule skipped: mastery/estimate data not provided');
      }
      return;
    }

    if (isRescheduling.current) {
      if (import.meta.env.DEV) {
        console.log('[useStudyPlans] Reschedule skipped: already in progress');
      }
      return;
    }

    const bp = backendPlans.find(p => p.id === planId);
    if (!bp) {
      if (import.meta.env.DEV) {
        console.warn(`[useStudyPlans] Reschedule skipped: plan ${planId} not found in backendPlans`);
      }
      return;
    }

    isRescheduling.current = true;

    try {
      const result = await executeReschedule({
        planId,
        completedTaskId,
        tasksSnapshot,
        backendPlan: bp,
        topicMap,
        topicMastery: opts.topicMastery,
        getTimeEstimate: opts.getTimeEstimate,
        sessionHistory: opts.sessionHistory,
      });

      if (result.didReschedule && result.changes.length > 0) {
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
      }
    } finally {
      isRescheduling.current = false;
    }
  }, [backendPlans, topicMap, opts?.topicMastery, opts?.getTimeEstimate]);

  // ── CRUD operations ───────────────────────────────────────

  const createPlanFromWizard = useCallback(async (
    frontendPlan: StudyPlan
  ): Promise<void> => {
    try {
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

      const taskPromises = frontendPlan.tasks.map((task, idx) =>
        apiCreateTask({
          study_plan_id: record.id,
          item_type: METHOD_TO_BACKEND_ITEM_TYPE[task.method] || 'reading',
          item_id: task.topicId || frontendPlan.selectedTopics[idx % frontendPlan.selectedTopics.length]?.topicId || task.id,
          status: task.completed ? 'completed' : 'pending',
          order_index: idx,
          original_method: task.method,
          scheduled_date: task.date instanceof Date
            ? task.date.toISOString().slice(0, 10)
            : undefined,
          estimated_minutes: task.estimatedMinutes,
        })
      );

      const taskResults = await Promise.allSettled(taskPromises);
      const failed = taskResults.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.error(`[useStudyPlans] ${failed.length}/${taskPromises.length} tasks failed to persist`);
        if (import.meta.env.DEV) {
          failed.forEach((r, i) => {
            if (r.status === 'rejected') console.error(`  Task ${i}: ${r.reason}`);
          });
        }
      }

      const syncedPlan: StudyPlan = { ...frontendPlan, id: record.id };
      syncToAppContext(syncedPlan);
      await fetchAll();

      if (import.meta.env.DEV) {
        console.log(`[useStudyPlans] Created plan "${record.name}" with ${frontendPlan.tasks.length} tasks`);
      }
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[useStudyPlans] createPlan error:', err);
      syncToAppContext(frontendPlan);
    }
  }, [fetchAll, syncToAppContext]);

  const toggleTaskComplete = useCallback(async (
    planId: string,
    taskId: string
  ): Promise<void> => {
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

    const updatedTasks = (tasks || []).map(t =>
      t.id === taskId
        ? { ...t, status: newStatus as StudyPlanTaskRecord['status'], completed_at: completedAt }
        : t
    );

    try {
      await apiUpdateTask(taskId, { status: newStatus, completed_at: completedAt });
      setBackendTasksMap(prev => {
        const next = new Map(prev);
        next.set(planId, updatedTasks);
        return next;
      });

      if (newStatus === 'completed') {
        runReschedule(planId, updatedTasks, taskId);
      }
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[useStudyPlans] toggleTask error:', err);
    }
  }, [backendTasksMap, runReschedule]);

  const reorderTasks = useCallback(async (
    planId: string,
    orderedIds: string[]
  ): Promise<void> => {
    const items = orderedIds.map((id, idx) => ({ id, order_index: idx }));

    try {
      await reorderItems('study_plan_tasks', items);
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
      if (import.meta.env.DEV) console.error('[useStudyPlans] reorder error:', err);
    }
  }, []);

  const updatePlanStatus = useCallback(async (
    planId: string,
    status: 'active' | 'completed' | 'archived'
  ): Promise<void> => {
    try {
      await apiUpdatePlan(planId, { status });
      await fetchAll();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[useStudyPlans] updatePlanStatus error:', err);
    }
  }, [fetchAll]);

  const deletePlan = useCallback(async (planId: string): Promise<void> => {
    try {
      await apiDeletePlan(planId);
      await fetchAll();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('[useStudyPlans] deletePlan error:', err);
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
