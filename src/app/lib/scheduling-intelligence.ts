/**
 * scheduling-intelligence.ts — Intelligent scheduling utilities
 *
 * Pure functions that enhance study plan generation with
 * AI-analyzed difficulty data from the backend.
 *
 * These functions are consumed by StudyOrganizerWizard and
 * the study plan generation pipeline. They do NOT call any APIs —
 * they operate on pre-fetched TopicDifficultyData.
 *
 * Features:
 *   - Cognitive load balancing (distribute hard/easy across days)
 *   - Prerequisite ordering (study prereqs before dependent topics)
 *   - Time estimation adjustment (scale time by real difficulty)
 *   - Adaptive interleaving (mix topics from different clusters)
 *
 * sessioncalendario — 2026-03-21
 */

import type { TopicDifficultyData } from '@/app/types/student';

// ─── Types ──────────────────────────────────────────────────────

export interface ScheduleTask {
  topicId: string;
  topicTitle: string;
  method: string;
  estimatedMinutes: number;
  difficulty: number;     // 0.0-1.0
  bloomLevel: number;     // 1-6
  courseId: string;
  courseName: string;
  sectionTitle: string;
}

export interface ScheduleDay {
  date: Date;
  availableMinutes: number;
  tasks: ScheduleTask[];
  cognitiveLoad: number;  // 0.0-1.0 aggregate difficulty of the day
}

export type DifficultyTier = 'hard' | 'medium' | 'easy';

// ─── Constants ──────────────────────────────────────────────────

const DIFFICULTY_THRESHOLDS = {
  hard: 0.65,    // >= 0.65 is hard
  medium: 0.35,  // >= 0.35 is medium
  // < 0.35 is easy
};

/** Max consecutive tasks of the same difficulty tier */
const MAX_CONSECUTIVE_SAME_TIER = 2;

/** Target daily cognitive load (0.5 = balanced mix of hard/easy) */
const TARGET_DAILY_COGNITIVE_LOAD = 0.5;

/** Tolerance band around target (±0.15) */
const COGNITIVE_LOAD_TOLERANCE = 0.15;

// ─── Difficulty Tier Classification ─────────────────────────────

export function classifyDifficulty(estimate: number | null): DifficultyTier {
  if (estimate === null) return 'medium'; // unknown = assume medium
  if (estimate >= DIFFICULTY_THRESHOLDS.hard) return 'hard';
  if (estimate >= DIFFICULTY_THRESHOLDS.medium) return 'medium';
  return 'easy';
}

// ─── Time Adjustment by Difficulty ──────────────────────────────

/**
 * Adjust estimated study minutes based on topic difficulty.
 * Hard topics get more time, easy topics get less.
 *
 * Based on Bjork & Bjork (2011) desirable difficulties framework:
 * - Hard topics need ~40% more time for adequate encoding
 * - Easy topics can be covered ~25% faster
 */
export function adjustTimeByDifficulty(
  baseMinutes: number,
  difficulty: number | null,
  masteryPercent: number = 0,
): number {
  const d = difficulty ?? 0.5;

  // Base multiplier from difficulty (0.75 to 1.4)
  const difficultyMultiplier = 0.75 + (d * 0.65);

  // Mastery adjustment: high mastery = less time needed
  const masteryMultiplier = masteryPercent >= 80 ? 0.7
    : masteryPercent >= 60 ? 0.85
    : masteryPercent >= 40 ? 1.0
    : masteryPercent >= 20 ? 1.15
    : 1.3; // very low mastery = more time

  return Math.round(baseMinutes * difficultyMultiplier * masteryMultiplier);
}

// ─── Prerequisite Ordering ──────────────────────────────────────

/**
 * Topological sort of topics based on prerequisite_topic_ids.
 * Topics with no prerequisites come first.
 * Falls back to original order if cycles are detected.
 */
export function orderByPrerequisites(
  topics: Array<{ topicId: string; prerequisiteIds: string[] }>,
): string[] {
  const graph = new Map<string, string[]>(); // topic -> prerequisites
  const allIds = new Set(topics.map(t => t.topicId));

  // Build dependency graph (only include prerequisites that are in our topic set)
  for (const t of topics) {
    const validPrereqs = t.prerequisiteIds.filter(id => allIds.has(id));
    graph.set(t.topicId, validPrereqs);
  }

  // Kahn's algorithm for topological sort
  const inDegree = new Map<string, number>();
  for (const id of allIds) inDegree.set(id, 0);

  for (const [, prereqs] of graph) {
    for (const p of prereqs) {
      // This topic depends on p, so p has an edge to this topic
      // But we track in-degree of the dependent, not the prerequisite
    }
  }

  // Recalculate: for each topic, count how many topics list it as a prerequisite
  for (const [topicId, prereqs] of graph) {
    inDegree.set(topicId, prereqs.length);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const result: string[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);

    // Find topics that depend on this one
    for (const [topicId, prereqs] of graph) {
      if (prereqs.includes(current) && !visited.has(topicId)) {
        const newDegree = (inDegree.get(topicId) ?? 0) - 1;
        inDegree.set(topicId, newDegree);
        if (newDegree <= 0) {
          queue.push(topicId);
        }
      }
    }
  }

  // If not all topics were visited (cycle detected), append remaining in original order
  if (result.length < allIds.size) {
    for (const t of topics) {
      if (!visited.has(t.topicId)) {
        result.push(t.topicId);
      }
    }
  }

  return result;
}

// ─── Cognitive Load Balancing ───────────────────────────────────

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

            if (dayTimeAfterSwap <= day.availableMinutes + 10 &&
                neighborTimeAfterSwap <= neighbor.availableMinutes + 10) {
              // Swap
              day.tasks[hardTaskIdx] = easyTask;
              neighbor.tasks[easyTaskIdx] = hardTask;
              day.cognitiveLoad = computeDayCognitiveLoad(day.tasks);
              neighbor.cognitiveLoad = computeDayCognitiveLoad(neighbor.tasks);
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

function computeDayCognitiveLoad(tasks: ScheduleTask[]): number {
  if (tasks.length === 0) return 0;
  // Weighted average: longer tasks contribute more to perceived load
  const totalMinutes = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
  if (totalMinutes === 0) return 0;
  return tasks.reduce((s, t) => s + t.difficulty * t.estimatedMinutes, 0) / totalMinutes;
}

// ─── Adaptive Interleaving ──────────────────────────────────────

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
        }
      }

      tierIdx++;

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

// ─── Enrichment: Add difficulty to tasks from backend data ──────

/**
 * Enrich plan tasks with difficulty data from the study-intelligence API.
 * Maps TopicDifficultyData to the task's difficulty fields.
 */
export function enrichTasksWithDifficulty(
  tasks: Array<{ topicId: string; estimatedMinutes: number }>,
  difficultyMap: Map<string, TopicDifficultyData>,
  masteryMap?: Map<string, number>,
): ScheduleTask[] {
  return tasks.map(task => {
    const diff = difficultyMap.get(task.topicId);
    const mastery = masteryMap?.get(task.topicId) ?? 0;

    return {
      ...task,
      topicTitle: diff?.name ?? task.topicId,
      method: (task as Record<string, unknown>).method as string ?? 'resumo',
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

// ─── Full Pipeline ──────────────────────────────────────────────

/**
 * Run the complete scheduling intelligence pipeline.
 *
 * Input: raw tasks + difficulty data + schedule days
 * Output: optimized schedule with balanced cognitive load
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

  // Sort tasks by prerequisite order
  const ordered = [...enriched].sort((a, b) => {
    const aIdx = prereqOrder.indexOf(a.topicId);
    const bIdx = prereqOrder.indexOf(b.topicId);
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

      if (usedMinutes + task.estimatedMinutes <= day.availableMinutes + 10) {
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
      });
      leastLoaded.tasks.push(task);
    }
  }

  // Step 4: Balance cognitive load between days
  const balanced = balanceCognitiveLoad(days);

  // Step 5: Interleave within days
  return interleaveWithinDays(balanced);
}
