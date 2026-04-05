/**
 * Reschedule execution logic for study plans.
 * Called after task completion to redistribute pending tasks.
 * Tries AI-powered reschedule first, falls back to scheduling pipeline.
 */

import type { StudyPlan, StudyPlanTask } from '@/app/context/AppContext';
import type { StudyPlanRecord, StudyPlanTaskRecord, StudySessionRecord } from '@/app/services/platformApi';
import {
  updateStudyPlanTask as apiUpdateTask,
  batchUpdateTasks as apiBatchUpdate,
} from '@/app/services/platformApi';
import {
  METHOD_TIME_DEFAULTS,
  BACKEND_ITEM_TYPE_TO_METHOD,
} from '@/app/utils/constants';
import {
  applyAiReschedule,
  type RescheduleChange,
} from '@/app/utils/rescheduleEngine';
import { aiReschedule } from '@/app/services/aiService';
import { runSchedulingPipeline } from '@/app/lib/scheduling-intelligence';
import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';
import { mapSessionHistoryForAI } from '@/app/utils/session-history-mapper';
import { getAxonToday } from '@/app/utils/constants';
import type { TopicLookup } from './types';

export interface RescheduleParams {
  planId: string;
  completedTaskId: string;
  tasksSnapshot: StudyPlanTaskRecord[];
  backendPlan: StudyPlanRecord;
  topicMap: Map<string, TopicLookup>;
  topicMastery: Map<string, TopicMasteryInfo>;
  getTimeEstimate: (methodId: string) => { estimatedMinutes: number };
  // G1: Real student session history for AI profile
  sessionHistory?: StudySessionRecord[];
}

export interface RescheduleResult {
  didReschedule: boolean;
  changes: RescheduleChange[];
  source: 'ai' | 'algorithmic' | 'none';
}

/**
 * Build schedule days from a plan's remaining date range and weekly hours.
 * Only includes days from today onwards up to the completion date.
 */
function buildScheduleDaysFromPlan(
  plan: StudyPlan,
): Array<{ date: Date; availableMinutes: number }> {
  const today = getAxonToday();
  const endDate = plan.completionDate instanceof Date
    ? plan.completionDate
    : new Date(plan.completionDate);

  const days: Array<{ date: Date; availableMinutes: number }> = [];
  const current = new Date(today);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const hoursIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weeklyHours = plan.weeklyHours;
    const availableMinutes = (weeklyHours[hoursIdx] ?? 0) * 60;
    if (availableMinutes > 0) {
      days.push({ date: new Date(current), availableMinutes });
    }
    current.setDate(current.getDate() + 1);
  }

  // If no future days, add at least the end date as fallback
  if (days.length === 0) {
    days.push({ date: new Date(endDate), availableMinutes: 120 });
  }

  return days;
}

/**
 * Execute reschedule logic and persist changes.
 * Returns the changes applied (for optimistic state update by the caller).
 */
export async function executeReschedule(params: RescheduleParams): Promise<RescheduleResult> {
  const { planId, completedTaskId, tasksSnapshot, backendPlan, topicMap, topicMastery, getTimeEstimate, sessionHistory } = params;

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
      sessionHistory: sessionHistory ? mapSessionHistoryForAI(sessionHistory) : [],
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

    const aiResponse = await aiReschedule(profile, planContext, completedTaskId);
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
      console.log('[useStudyPlans] AI reschedule failed, falling back to scheduling pipeline:', aiErr);
    }
    // Fall through to pipeline-based fallback below
  }

  // ── Intelligent algorithmic fallback (scheduling pipeline) ──
  try {
    const pendingTasks = planSnapshot.tasks.filter(t => !t.completed);
    const scheduleDays = buildScheduleDaysFromPlan(planSnapshot);

    const rawTasks = pendingTasks.map(t => {
      const lookup = topicMap.get(t.topicId || '');
      return {
        topicId: t.topicId || '',
        topicTitle: t.title,
        method: t.method,
        estimatedMinutes: t.estimatedMinutes,
        courseId: lookup?.courseId || '',
        courseName: t.subject,
        sectionTitle: lookup?.sectionTitle || '',
      };
    });

    const masteryMap = new Map(
      Array.from(topicMastery.entries()).map(([id, info]) => [id, info.masteryPercent])
    );

    // Use empty difficultyMap — pipeline defaults to 0.5 for all topics.
    // Main value: better distribution + interleaving vs previous simple approach.
    const days = runSchedulingPipeline(rawTasks, new Map(), scheduleDays, masteryMap);

    // Convert ScheduleDay[] → RescheduleChange[]
    // Use a consumed-set to avoid assigning the same task ID twice
    // when multiple pipeline tasks share topicId + method.
    const changes: RescheduleChange[] = [];
    const consumedTaskIds = new Set<string>();
    let orderIndex = 0;
    for (const day of days) {
      for (const task of day.tasks) {
        const matchingTask = pendingTasks.find(
          pt => pt.topicId === task.topicId && pt.method === task.method
            && !consumedTaskIds.has(pt.id)
        );
        if (matchingTask) {
          consumedTaskIds.add(matchingTask.id);
          changes.push({
            taskId: matchingTask.id,
            newDate: day.date,
            newEstimatedMinutes: task.estimatedMinutes,
            newOrderIndex: orderIndex++,
          });
        }
      }
    }

    if (changes.length === 0) {
      if (import.meta.env.DEV) {
        console.log('[useStudyPlans] Pipeline reschedule: no changes needed');
      }
      return { didReschedule: false, changes: [], source: 'none' };
    }

    if (import.meta.env.DEV) {
      console.log(`[useStudyPlans] Pipeline reschedule: ${changes.length} task(s) will be updated`);
    }

    await persistChanges(planId, changes);
    return { didReschedule: true, changes, source: 'algorithmic' };
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
