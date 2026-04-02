/**
 * Backend-to-frontend data mapping for study plans.
 * Pure function that converts backend records to frontend models.
 */

import type { StudyPlan, StudyPlanTask } from '@/app/context/AppContext';
import type { StudyPlanRecord, StudyPlanTaskRecord } from '@/app/services/platformApi';
import {
  METHOD_TIME_DEFAULTS,
  BACKEND_ITEM_TYPE_TO_METHOD,
} from '@/app/utils/constants';
import type { TopicLookup } from './types';

/**
 * Map a single backend plan + its tasks to a frontend StudyPlan model.
 */
export function mapBackendPlanToFrontend(
  bp: StudyPlanRecord,
  tasks: StudyPlanTaskRecord[],
  topicMap: Map<string, TopicLookup>,
): StudyPlan {
  const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index);

  // Collect unique subjects from tasks
  const subjectSet = new Map<string, { id: string; name: string; color: string }>();

  const planCreated = bp.created_at ? new Date(bp.created_at) : new Date();

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
    const taskDate = bt.scheduled_date
      ? new Date(bt.scheduled_date)
      : (() => {
          const d = new Date(planCreated);
          d.setDate(d.getDate() + Math.floor(idx / 3)); // legacy: ~3 tasks per day
          return d;
        })();

    // Phase 5: Use original_method for display (preserves 'video', '3d', etc.)
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
    createdAt: planCreated,
    totalEstimatedHours: Math.round(
      frontendTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0) / 60
    ),
  };
}
