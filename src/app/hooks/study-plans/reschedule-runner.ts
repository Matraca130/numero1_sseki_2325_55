/**
 * Reschedule execution logic for study plans.
 * Called after task completion to redistribute pending tasks.
 * Tries AI-powered reschedule first, falls back to algorithmic.
 */

import type { StudyPlan, StudyPlanTask } from '@/app/context/AppContext';
import type { StudyPlanRecord, StudyPlanTaskRecord } from '@/app/services/platformApi';
import {
  updateStudyPlanTask as apiUpdateTask,
  batchUpdateTasks as apiBatchUpdate,
} from '@/app/services/platformApi';
import {
  METHOD_TIME_DEFAULTS,
  BACKEND_ITEM_TYPE_TO_METHOD,
} from '@/app/utils/constants';
import {
  rescheduleRemainingTasks,
  applyAiReschedule,
  type RescheduleChange,
} from '@/app/utils/rescheduleEngine';
import { aiReschedule } from '@/app/services/aiService';
import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';
import type { TopicLookup } from './types';

export interface RescheduleParams {
  planId: string;
  tasksSnapshot: StudyPlanTaskRecord[];
  backendPlan: StudyPlanRecord;
  topicMap: Map<string, TopicLookup>;
  topicMastery: Map<string, TopicMasteryInfo>;
  getTimeEstimate: (methodId: string) => { estimatedMinutes: number };
}

export interface RescheduleResult {
  didReschedule: boolean;
  changes: RescheduleChange[];
  source: 'ai' | 'algorithmic' | 'none';
}

/**
 * Execute reschedule logic and persist changes.
 * Returns the changes applied (for optimistic state update by the caller).
 */
export async function executeReschedule(params: RescheduleParams): Promise<RescheduleResult> {
  const { planId, tasksSnapshot, backendPlan, topicMap, topicMastery, getTimeEstimate } = params;

  // Build a fresh frontend StudyPlan snapshot from backend data
  const sortedTasks = [...tasksSnapshot].sort((a, b) => a.order_index - b.order_index);
  const planCreated = backendPlan.created_at ? new Date(backendPlan.created_at) : new Date();

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
    id: backendPlan.id,
    name: backendPlan.name,
    subjects: [],
    methods: [],
    selectedTopics: [],
    completionDate: backendPlan.completion_date
      ? new Date(backendPlan.completion_date)
      : (() => { const d = new Date(planCreated); d.setDate(d.getDate() + 30); return d; })(),
    weeklyHours: Array.isArray(backendPlan.weekly_hours) && backendPlan.weekly_hours.length === 7
      ? backendPlan.weekly_hours
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
    return { didReschedule: false, changes: [], source: 'none' };
  }

  // ── Try AI-powered reschedule first ──────────────────────
  try {
    const profile = {
      topicMastery: Object.fromEntries(
        Array.from(topicMastery.entries()).map(([id, info]) => [id, {
          masteryPercent: info.masteryPercent,
          pKnow: info.pKnow,
          needsReview: info.needsReview,
          totalAttempts: info.totalAttempts,
          priorityScore: info.priorityScore,
        }])
      ),
      sessionHistory: [] as { sessionType: string; durationMinutes: number; createdAt: string; topicId?: string }[],
      dailyActivity: [] as { date: string; studyMinutes: number; sessionsCount: number }[],
      stats: { totalStudyMinutes: 0, totalSessions: 0, currentStreak: 0, avgMinutesPerSession: null as number | null },
      studyMethods: planSnapshot.methods || [],
    };

    const planContext = {
      tasks: planSnapshot.tasks.map(t => ({
        topicId: t.topicId || '',
        topicTitle: t.title,
        method: t.method,
        estimatedMinutes: t.estimatedMinutes,
        completed: t.completed,
        scheduledDate: t.date instanceof Date ? t.date.toISOString().slice(0, 10) : '',
      })),
      completionDate: planSnapshot.completionDate instanceof Date
        ? planSnapshot.completionDate.toISOString().slice(0, 10) : '',
      weeklyHours: planSnapshot.weeklyHours,
    };

    const aiResponse = await aiReschedule(profile, planContext, /* completedTaskId */ '');
    if (aiResponse?.rescheduledTasks?.length && aiResponse._meta?.aiPowered) {
      const aiResult = applyAiReschedule({ plan: planSnapshot, aiResult: aiResponse.rescheduledTasks });
      if (aiResult.didReschedule && aiResult.changes.length > 0) {
        if (import.meta.env.DEV) {
          console.log(`[useStudyPlans] AI reschedule: ${aiResult.changes.length} task(s) will be updated`);
        }

        await persistChanges(planId, aiResult.changes);
        return { didReschedule: true, changes: aiResult.changes, source: 'ai' };
      }
    }
  } catch (aiErr) {
    if (import.meta.env.DEV) {
      console.log('[useStudyPlans] AI reschedule failed, falling back to algorithmic:', aiErr);
    }
    // Fall through to algorithmic reschedule below
  }

  // ── Algorithmic fallback ─────────────────────────────────
  try {
    const result = rescheduleRemainingTasks({
      plan: planSnapshot,
      topicMastery,
      getTimeEstimate,
    });

    if (!result.didReschedule || result.changes.length === 0) {
      if (import.meta.env.DEV) {
        console.log('[useStudyPlans] Reschedule: no changes needed');
      }
      return { didReschedule: false, changes: [], source: 'none' };
    }

    if (import.meta.env.DEV) {
      console.log(`[useStudyPlans] Reschedule: ${result.changes.length} task(s) will be updated`);
    }

    await persistChanges(planId, result.changes);
    return { didReschedule: true, changes: result.changes, source: 'algorithmic' };
  } catch (err: any) {
    if (import.meta.env.DEV) console.error('[useStudyPlans] Reschedule error (non-blocking):', err);
    return { didReschedule: false, changes: [], source: 'none' };
  }
}

/** Persist reschedule changes via batch endpoint, with individual fallback. */
async function persistChanges(planId: string, changes: RescheduleChange[]): Promise<void> {
  const batchPayload = {
    study_plan_id: planId,
    updates: changes.map((c: RescheduleChange) => ({
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
}
