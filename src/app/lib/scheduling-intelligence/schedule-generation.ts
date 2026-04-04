/**
 * Task enrichment and full scheduling pipeline.
 * Combines difficulty data, prerequisite ordering, cognitive load balancing,
 * and interleaving into a single pipeline.
 */

import type { ScheduleTask, ScheduleDay, TopicDifficultyData } from './types';
import { TIME_OVERFLOW_TOLERANCE_MIN } from './constants';
import { adjustTimeByDifficulty } from './difficulty';
import { orderByPrerequisites } from './prerequisite-ordering';
import { balanceCognitiveLoad } from './cognitive-load';
import { interleaveWithinDays } from './cognitive-load';

/**
 * Enrich plan tasks with difficulty data from the study-intelligence API.
 * Maps TopicDifficultyData to the task's difficulty fields.
 */
export function enrichTasksWithDifficulty(
  tasks: Array<{ topicId: string; estimatedMinutes: number; method?: string }>,
  difficultyMap: Map<string, TopicDifficultyData>,
  masteryMap?: Map<string, number>,
): ScheduleTask[] {
  return tasks.map(task => {
    const diff = difficultyMap.get(task.topicId);
    const mastery = masteryMap?.get(task.topicId) ?? 0;

    return {
      ...task,
      topicTitle: diff?.name ?? task.topicId,
      method: task.method ?? 'resumo',
      difficulty: diff?.difficulty_estimate ?? 0.5,
      bloomLevel: diff?.bloom_level ?? 2,
      courseId: '',
      courseName: '',
      sectionTitle: diff?.section_name ?? '',
      estimatedMinutes: adjustTimeByDifficulty(
        task.estimatedMinutes,
        diff?.difficulty_estimate ?? null,
        mastery,
      ),
    };
  });
}

/**
 * Run the complete scheduling intelligence pipeline.
 *
 * Pipeline:
 *   1. Enrich tasks with difficulty data
 *   2. Order by prerequisites
 *   3. Distribute across days (respecting time budgets)
 *   4. Balance cognitive load between days
 *   5. Interleave within each day
 */
export function runSchedulingPipeline(
  rawTasks: Array<{
    topicId: string;
    topicTitle: string;
    method: string;
    estimatedMinutes: number;
    courseId: string;
    courseName: string;
    sectionTitle: string;
  }>,
  difficultyMap: Map<string, TopicDifficultyData>,
  scheduleDays: Array<{ date: Date; availableMinutes: number }>,
  masteryMap?: Map<string, number>,
): ScheduleDay[] {
  // Step 1: Enrich with difficulty
  const enriched = enrichTasksWithDifficulty(rawTasks, difficultyMap, masteryMap);

  // Step 2: Order by prerequisites
  const prereqOrder = orderByPrerequisites(
    enriched.map(t => ({
      topicId: t.topicId,
      prerequisiteIds: difficultyMap.get(t.topicId)?.prerequisite_topic_ids ?? [],
    })),
  );

  // Sort tasks by prerequisite order (O(N) lookup via index map)
  const prereqIndex = new Map(prereqOrder.map((id, i) => [id, i]));
  const ordered = [...enriched].sort((a, b) => {
    const aIdx = prereqIndex.get(a.topicId) ?? Infinity;
    const bIdx = prereqIndex.get(b.topicId) ?? Infinity;
    return aIdx - bIdx;
  });

  // Step 3: Distribute across days
  const days: ScheduleDay[] = scheduleDays.map(d => ({
    ...d,
    tasks: [],
    cognitiveLoad: 0,
  }));

  let dayIdx = 0;
  for (const task of ordered) {
    // Find next day with capacity
    let placed = false;
    for (let attempts = 0; attempts < days.length; attempts++) {
      const idx = (dayIdx + attempts) % days.length;
      const day = days[idx];
      const usedMinutes = day.tasks.reduce((s, t) => s + t.estimatedMinutes, 0);

      if (usedMinutes + task.estimatedMinutes <= day.availableMinutes + TIME_OVERFLOW_TOLERANCE_MIN) {
        day.tasks.push(task);
        dayIdx = (idx + 1) % days.length; // next task starts on next day
        placed = true;
        break;
      }
    }

    // If no day has capacity, add to the least-loaded day
    if (!placed) {
      const leastLoaded = days.reduce((min, d) => {
        const used = d.tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
        const minUsed = min.tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
        return used < minUsed ? d : min;
      }, days[0]);
      leastLoaded.tasks.push(task);
    }
  }

  // Step 4: Balance cognitive load between days
  const balanced = balanceCognitiveLoad(days);

  // Step 5: Interleave within days
  return interleaveWithinDays(balanced);
}
