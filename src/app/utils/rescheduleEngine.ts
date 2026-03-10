// ============================================================
// Axon — Reschedule Engine  (Phase 5)
//
// Pure function that re-prioritizes and redistributes pending
// tasks across remaining available days after a task completion.
//
// ALGORITHM:
//   1. Separate completed + pending tasks
//   2. Recalculate priority score for each pending task's topic
//   3. Sort pending by priority (highest first)
//   4. Interleave: 2 high-priority, 1 normal (via shared util)
//   5. Distribute across remaining days using weeklyHours budget
//   6. Return updated task list with new dates + order_index
//
// DESIGN DECISIONS:
//   - Completed tasks KEEP their original dates (history)
//   - Only pending tasks are re-ordered and re-dated
//   - Time multipliers are recalculated from fresh mastery data
//   - If no mastery data for a topic, priority defaults to 50
//   - Graceful degradation: if no mastery data at all, tasks
//     keep their original order with new sequential dates
//
// DT-03 FIX: Uses shared utilities from planSchedulingUtils.ts
//   instead of duplicating getTimeMultiplier/interleave/distribute.
// ============================================================

import type { StudyPlanTask, StudyPlan } from '@/app/types/study-plan';
import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';
import { getAxonToday } from './constants';
import { getTimeMultiplier, interleaveByPriority, distributeAcrossDays } from './planSchedulingUtils';

// ── Types ────────────────────────────────────────────────

export interface RescheduleInput {
  plan: StudyPlan;
  /** Current mastery data (may be empty if not yet loaded) */
  topicMastery: Map<string, TopicMasteryInfo>;
  /** Time estimate getter (returns minutes per session for a method) */
  getTimeEstimate: (methodId: string) => { estimatedMinutes: number };
  /** Override "today" for testing / demo (defaults to AXON_TODAY) */
  today?: Date;
}

export interface RescheduleResult {
  /** Full task list (completed preserved + pending rescheduled) */
  tasks: StudyPlanTask[];
  /** Only the tasks whose date or order changed */
  changes: RescheduleChange[];
  /** Was any actual reordering performed? */
  didReschedule: boolean;
}

export interface RescheduleChange {
  taskId: string;
  newDate: Date;
  newOrderIndex: number;
  newEstimatedMinutes: number;
}

// ── Priority for a task given current mastery ────────────────

function getTaskPriority(task: StudyPlanTask, mastery: Map<string, TopicMasteryInfo>): number {
  if (!task.topicId) return 50;
  const m = mastery.get(task.topicId);
  return m?.priorityScore ?? 50;
}

// ── Main engine ──────────────────────────────────────────

export function rescheduleRemainingTasks(input: RescheduleInput): RescheduleResult {
  const { plan, topicMastery, getTimeEstimate, today = getAxonToday() } = input;
  const { tasks, completionDate, weeklyHours } = plan;

  // Step 1: Separate completed and pending
  const completed = tasks.filter(t => t.completed);
  const pending = tasks.filter(t => !t.completed);

  if (pending.length === 0) {
    return { tasks: [...completed], changes: [], didReschedule: false };
  }

  // Step 2: Recalculate estimated minutes and priority for each pending task
  const enriched = pending.map(task => {
    const est = getTimeEstimate(task.method);
    const multiplier = task.topicId ? getTimeMultiplier(task.topicId, topicMastery) : 1.0;
    const newMinutes = Math.round(est.estimatedMinutes * multiplier);
    const priority = getTaskPriority(task, topicMastery);

    return {
      task,
      priority,
      minutes: newMinutes, // matches DistributableItem interface
    };
  });

  // Step 3: Sort by priority (highest first = needs most work)
  enriched.sort((a, b) => b.priority - a.priority);

  // Step 4: Interleave — 2 high-priority, 1 normal (shared utility)
  const interleaved = interleaveByPriority(enriched, e => e.priority);

  // Step 5: Determine start date
  const endDate = completionDate instanceof Date ? completionDate : new Date(completionDate);
  let startDate = new Date(today);

  // Start from tomorrow if today already has completed tasks
  const todayStr = today.toISOString().slice(0, 10);
  const hasCompletedToday = completed.some(t =>
    t.date instanceof Date && t.date.toISOString().slice(0, 10) === todayStr
  );
  if (hasCompletedToday) {
    startDate.setDate(startDate.getDate() + 1);
  }

  // Step 6: Distribute across remaining days (shared utility)
  const distributed = distributeAcrossDays(interleaved, startDate, endDate, weeklyHours);

  // Step 7: Build results
  const rescheduledTasks: StudyPlanTask[] = [];
  const changes: RescheduleChange[] = [];
  let orderIndex = completed.length; // continue order after completed tasks

  for (const { item, date } of distributed) {
    const newTask: StudyPlanTask = {
      ...item.task,
      date,
      estimatedMinutes: item.minutes,
    };
    rescheduledTasks.push(newTask);

    // Track change
    const oldDateStr = item.task.date instanceof Date
      ? item.task.date.toISOString().slice(0, 10)
      : '';
    const newDateStr = date.toISOString().slice(0, 10);
    if (oldDateStr !== newDateStr || item.task.estimatedMinutes !== item.minutes) {
      changes.push({
        taskId: item.task.id,
        newDate: date,
        newOrderIndex: orderIndex,
        newEstimatedMinutes: item.minutes,
      });
    }

    orderIndex++;
  }

  // Step 8: Merge completed (keep original dates) + rescheduled
  const finalTasks = [...completed, ...rescheduledTasks];

  return {
    tasks: finalTasks,
    changes,
    didReschedule: changes.length > 0,
  };
}
