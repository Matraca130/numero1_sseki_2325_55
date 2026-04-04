/**
 * Cognitive load balancing and adaptive interleaving.
 * Redistributes tasks across days and reorders within days
 * to optimize learning based on difficulty tiers.
 */

import type { ScheduleDay, ScheduleTask, DifficultyTier } from './types';
import {
  TARGET_DAILY_COGNITIVE_LOAD,
  COGNITIVE_LOAD_TOLERANCE,
  TIME_OVERFLOW_TOLERANCE_MIN,
  MAX_CONSECUTIVE_SAME_TIER,
} from './constants';
import { classifyDifficulty } from './difficulty';
import { logger } from '@/app/lib/logger';

/**
 * Redistribute tasks across days to balance cognitive load.
 *
 * Principle: Each day should have a mix of hard, medium, and easy tasks.
 * Avoid scheduling 3+ hard tasks on the same day.
 *
 * Algorithm:
 * 1. Classify tasks into hard/medium/easy tiers
 * 2. For each day, try to maintain TARGET_DAILY_COGNITIVE_LOAD ± tolerance
 * 3. If a day is overloaded, swap a hard task with an easy task from an adjacent day
 */
export function balanceCognitiveLoad(
  days: ScheduleDay[],
): ScheduleDay[] {
  // Deep clone to avoid mutations
  const balanced = days.map(d => ({
    ...d,
    tasks: [...d.tasks],
  }));

  // Calculate cognitive load per day
  for (const day of balanced) {
    day.cognitiveLoad = computeDayCognitiveLoad(day.tasks);
  }

  // Iterative balancing (max 10 passes to prevent infinite loops)
  for (let pass = 0; pass < 10; pass++) {
    let swapped = false;

    for (let i = 0; i < balanced.length; i++) {
      const day = balanced[i];
      const load = day.cognitiveLoad;

      if (load > TARGET_DAILY_COGNITIVE_LOAD + COGNITIVE_LOAD_TOLERANCE) {
        // Day is too hard — find an easy task to swap with a neighbor
        const hardTaskIdx = day.tasks.findIndex(t =>
          classifyDifficulty(t.difficulty) === 'hard'
        );

        if (hardTaskIdx === -1) continue;

        // Look for an underloaded neighbor day
        for (const neighborIdx of [i - 1, i + 1]) {
          if (neighborIdx < 0 || neighborIdx >= balanced.length) continue;
          const neighbor = balanced[neighborIdx];

          if (neighbor.cognitiveLoad < TARGET_DAILY_COGNITIVE_LOAD - COGNITIVE_LOAD_TOLERANCE) {
            const easyTaskIdx = neighbor.tasks.findIndex(t =>
              classifyDifficulty(t.difficulty) === 'easy'
            );

            if (easyTaskIdx === -1) continue;

            // Check time constraints
            const hardTask = day.tasks[hardTaskIdx];
            const easyTask = neighbor.tasks[easyTaskIdx];

            const dayTimeAfterSwap = day.tasks.reduce((s, t) => s + t.estimatedMinutes, 0)
              - hardTask.estimatedMinutes + easyTask.estimatedMinutes;
            const neighborTimeAfterSwap = neighbor.tasks.reduce((s, t) => s + t.estimatedMinutes, 0)
              - easyTask.estimatedMinutes + hardTask.estimatedMinutes;

            if (dayTimeAfterSwap <= day.availableMinutes + TIME_OVERFLOW_TOLERANCE_MIN &&
                neighborTimeAfterSwap <= neighbor.availableMinutes + TIME_OVERFLOW_TOLERANCE_MIN) {
              // Swap
              day.tasks[hardTaskIdx] = easyTask;
              neighbor.tasks[easyTaskIdx] = hardTask;
              day.cognitiveLoad = computeDayCognitiveLoad(day.tasks);
              neighbor.cognitiveLoad = computeDayCognitiveLoad(neighbor.tasks);
              logger.debug('SchedulingIntelligence', 'Cognitive load swap', { pass, fromDay: i, toDay: neighborIdx });
              swapped = true;
              break;
            }
          }
        }
      }
    }

    if (!swapped) break; // stable
  }

  return balanced;
}

export function computeDayCognitiveLoad(tasks: ScheduleTask[]): number {
  if (tasks.length === 0) return 0;
  // Weighted average: longer tasks contribute more to perceived load
  const totalMinutes = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
  if (totalMinutes === 0) return 0;
  return tasks.reduce((s, t) => s + t.difficulty * t.estimatedMinutes, 0) / totalMinutes;
}

/**
 * Reorder tasks within each day to avoid consecutive same-tier tasks.
 *
 * Based on interleaving research (Rohrer, 2012):
 * alternating between different difficulty levels improves long-term retention.
 */
export function interleaveWithinDays(days: ScheduleDay[]): ScheduleDay[] {
  return days.map(day => {
    if (day.tasks.length <= 2) return day;

    const tasks = [...day.tasks];
    const reordered: ScheduleTask[] = [];
    const byTier = {
      hard: tasks.filter(t => classifyDifficulty(t.difficulty) === 'hard'),
      medium: tasks.filter(t => classifyDifficulty(t.difficulty) === 'medium'),
      easy: tasks.filter(t => classifyDifficulty(t.difficulty) === 'easy'),
    };

    // Round-robin: hard, easy, medium, hard, easy, medium...
    const tierOrder: DifficultyTier[] = ['hard', 'easy', 'medium'];
    let tierIdx = 0;
    let consecutive = 0;
    let lastTier: DifficultyTier | null = null;

    while (reordered.length < tasks.length) {
      const tier = tierOrder[tierIdx % 3];

      if (byTier[tier].length > 0) {
        const task = byTier[tier].shift()!;
        reordered.push(task);

        if (tier === lastTier) {
          consecutive++;
        } else {
          consecutive = 1;
          lastTier = tier;
        }

        // If we've hit max consecutive, force switch
        if (consecutive >= MAX_CONSECUTIVE_SAME_TIER) {
          tierIdx++;
        } else {
          tierIdx++;
        }
      } else {
        tierIdx++;
      }

      // Safety: if all remaining tasks are same tier, just append them
      const remaining = byTier.hard.length + byTier.medium.length + byTier.easy.length;
      if (remaining > 0) {
        const nonEmptyTiers = (['hard', 'medium', 'easy'] as const).filter(t => byTier[t].length > 0);
        if (nonEmptyTiers.length === 1) {
          reordered.push(...byTier[nonEmptyTiers[0]]);
          byTier[nonEmptyTiers[0]] = [];
          break;
        }
      }
    }

    return { ...day, tasks: reordered };
  });
}
