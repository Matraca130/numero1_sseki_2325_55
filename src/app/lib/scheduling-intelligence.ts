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

// ─── Study Momentum Score ─────────────────────────────────────

/**
 * Compute a rolling study momentum score (0.5-1.5).
 *
 * Based on the ratio of completed sessions to scheduled sessions
 * over a rolling 7-day window, combined with time adherence.
 *
 * - 1.0 = baseline (student is on track)
 * - > 1.0 = student is ahead, can push harder (max 1.5)
 * - < 1.0 = student is behind, ease back (min 0.5)
 *
 * Used as a multiplier on daily task count.
 *
 * Research basis:
 * - Duckworth et al. (2007): Grit and sustained effort predict academic outcomes
 * - Zimmerman (2002): Self-regulated learners adjust pace based on recent performance
 * - Kornell & Bjork (2008): Spacing adjustments based on metacognitive monitoring
 *
 * @param recentSessions - Array of recent study sessions (ideally last 7-14 days)
 * @returns Object with momentum score, trend direction, and current streak count
 */
export function computeStudyMomentum(
  recentSessions: Array<{
    date: string;        // ISO date (YYYY-MM-DD)
    completed: boolean;
    scheduledMinutes: number;
    actualMinutes: number;
  }>,
): { score: number; trend: 'rising' | 'stable' | 'falling'; streak: number } {
  // Edge case: no sessions at all
  if (recentSessions.length === 0) {
    return { score: 1.0, trend: 'stable', streak: 0 };
  }

  // Step 1: Take only the last 7 days of sessions
  const sorted = [...recentSessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const last7 = sorted.slice(-14).filter((_, i, arr) => {
    // Keep only the most recent 7 unique dates
    return true;
  });

  // Deduplicate by date, aggregating within each day
  const byDate = new Map<string, { completed: number; total: number; actualMin: number; scheduledMin: number }>();
  for (const s of last7) {
    const dateKey = s.date.slice(0, 10); // normalize to YYYY-MM-DD
    const existing = byDate.get(dateKey) ?? { completed: 0, total: 0, actualMin: 0, scheduledMin: 0 };
    existing.total += 1;
    if (s.completed) existing.completed += 1;
    existing.actualMin += s.actualMinutes;
    existing.scheduledMin += s.scheduledMinutes;
    byDate.set(dateKey, existing);
  }

  // Keep only last 7 unique dates
  const dateEntries = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);

  if (dateEntries.length === 0) {
    return { score: 1.0, trend: 'stable', streak: 0 };
  }

  // Step 2: Compute completion rate
  let totalSessions = 0;
  let completedSessions = 0;
  for (const [, day] of dateEntries) {
    totalSessions += day.total;
    completedSessions += day.completed;
  }
  const completionRate = totalSessions > 0 ? completedSessions / totalSessions : 0;

  // Step 3: Compute time adherence (actual / scheduled)
  let totalScheduled = 0;
  let totalActual = 0;
  for (const [, day] of dateEntries) {
    totalScheduled += day.scheduledMin;
    totalActual += day.actualMin;
  }
  // Clamp time adherence to [0, 1.5] — studying 50% more than planned is the max bonus
  const rawTimeAdherence = totalScheduled > 0 ? totalActual / totalScheduled : 1.0;
  const timeAdherence = Math.min(rawTimeAdherence, 1.5);

  // Step 4: Combined score = 0.6 * completionRate + 0.4 * timeAdherence
  const rawScore = 0.6 * completionRate + 0.4 * timeAdherence;

  // Step 5: Clamp to [0.5, 1.5]
  const score = Math.round(Math.max(0.5, Math.min(1.5, rawScore)) * 100) / 100;

  // Step 6: Detect trend (first half vs second half of the window)
  const midpoint = Math.floor(dateEntries.length / 2);
  const firstHalf = dateEntries.slice(0, midpoint);
  const secondHalf = dateEntries.slice(midpoint);

  function halfCompletionRate(entries: Array<[string, { completed: number; total: number }]>): number {
    let t = 0, c = 0;
    for (const [, d] of entries) { t += d.total; c += d.completed; }
    return t > 0 ? c / t : 0;
  }

  const firstRate = halfCompletionRate(firstHalf);
  const secondRate = halfCompletionRate(secondHalf);
  const rateDelta = secondRate - firstRate;

  const TREND_THRESHOLD = 0.1; // 10% difference to register a trend
  const trend: 'rising' | 'stable' | 'falling' =
    rateDelta > TREND_THRESHOLD ? 'rising'
    : rateDelta < -TREND_THRESHOLD ? 'falling'
    : 'stable';

  // Step 7: Count current streak (consecutive days with at least 1 completed session, from most recent)
  let streak = 0;
  const reversedDates = [...dateEntries].reverse();
  for (const [, day] of reversedDates) {
    if (day.completed > 0) {
      streak++;
    } else {
      break;
    }
  }

  return { score, trend, streak };
}

// ─── Exam Countdown Mode ──────────────────────────────────────

/**
 * Review plan for a single topic in exam preparation mode.
 */
export interface ExamReviewPlan {
  topicId: string;
  topicName: string;
  difficulty: number;
  currentStability: number;    // FSRS stability (days until ~90% retrievability threshold)
  reviewDates: Date[];         // Optimal review dates before exam
  peakRetrievability: number;  // Expected retrievability on exam day (0-1)
  priority: 'critical' | 'moderate' | 'ready';  // Based on current state
}

/**
 * Compute optimal review timing for exam preparation.
 *
 * Given an exam date, distributes reviews so that each topic's
 * FSRS retrievability peaks on the exam day, not today.
 *
 * Based on the spacing effect: reviews should be timed so the
 * last review happens 1-2 days before the exam for optimal recall.
 *
 * FSRS retrievability model (Anki/FSRS):
 *   R(t) = (1 + t / (9 * S))^(-1)
 * where t = days since last review, S = stability.
 *
 * Each successful review multiplies stability by ~2.5 (FSRS average gain factor).
 * Hard topics (difficulty > 0.65) receive a reduced gain factor (~1.8).
 *
 * Research basis:
 * - Ebbinghaus (1885): Forgetting curve and spacing effect
 * - Pimsleur (1967): Graduated interval recall
 * - Ye et al. (2024): FSRS — A Modern Spaced Repetition Algorithm
 * - Cepeda et al. (2006): Optimal inter-study gap is ~10-20% of retention interval
 *
 * @param examDate - The date of the exam
 * @param topics - Topics with their current FSRS stability values
 * @param today - Current date (for calculating intervals)
 * @returns Array of recommended review dates per topic, sorted by priority
 */
export function planExamCountdown(
  examDate: Date,
  topics: Array<{
    topicId: string;
    topicName: string;
    difficulty: number;
    stability: number;         // Current FSRS stability in days
    lastReviewDate: Date | null;
    retrievability: number;    // Current retrievability (0-1)
  }>,
  today: Date = new Date(),
): ExamReviewPlan[] {
  const daysUntilExam = Math.max(
    0,
    Math.floor((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  );

  // If exam is today or already passed, return empty plans
  if (daysUntilExam <= 0) {
    return topics.map(t => ({
      topicId: t.topicId,
      topicName: t.topicName,
      difficulty: t.difficulty,
      currentStability: t.stability,
      reviewDates: [],
      peakRetrievability: t.retrievability,
      priority: t.retrievability < 0.5 ? 'critical' : t.retrievability < 0.8 ? 'moderate' : 'ready',
    }));
  }

  const plans: ExamReviewPlan[] = topics.map(topic => {
    const {
      topicId, topicName, difficulty, stability,
      lastReviewDate, retrievability,
    } = topic;

    // Compute days since last review
    const daysSinceReview = lastReviewDate
      ? Math.max(0, Math.floor((today.getTime() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24)))
      : Infinity;

    // FSRS retrievability at exam day if no further reviews
    // R(t) = (1 + t / (9 * S))^(-1)
    const totalDaysAtExam = daysSinceReview === Infinity
      ? daysUntilExam + 30 // assume long time if never reviewed
      : daysSinceReview + daysUntilExam;
    const examDayRetrievabilityNoReview = computeFsrsRetrievability(totalDaysAtExam, stability);

    // If stability is high enough that retrievability at exam day is >= 0.85,
    // the topic is "ready" and needs at most a light refresh
    if (examDayRetrievabilityNoReview >= 0.85 && stability > daysUntilExam) {
      return {
        topicId,
        topicName,
        difficulty,
        currentStability: stability,
        reviewDates: [],
        peakRetrievability: examDayRetrievabilityNoReview,
        priority: 'ready' as const,
      };
    }

    // Backsolve the review schedule
    // Gain factor per successful review (FSRS average)
    const isHard = difficulty > 0.65;
    const gainFactor = isHard ? 1.8 : 2.5;
    const extraReviewForHard = isHard ? 1 : 0;

    // Determine how many reviews are needed to build stability to cover exam
    // Target: after last review, stability should be >= daysUntilExam so R stays high
    let currentStab = stability > 0 ? stability : 0.5; // min stability
    let reviewsNeeded = 0;
    const MAX_REVIEWS = 10; // safety cap

    // We want: finalStability >= daysUntilExam (so R >= ~0.9 at exam)
    // Actually we want the last review's stability to cover the gap
    // from last review to exam day. We plan last review 1-2 days before exam.
    const lastReviewGap = isHard ? 1 : 2; // hard topics: review 1 day before; others: 2 days
    const targetStability = lastReviewGap + 1; // stability needed after last review

    // But first, how many reviews to get stability high enough overall?
    // Each review: newStability = currentStability * gainFactor
    // The real need: we need enough reviews that the student re-encodes the material
    // and the final stability covers the gap to exam day.

    // Simpler approach: figure out how many reviews needed so that
    // stability after last review >= lastReviewGap
    // (This is almost always 1-3 reviews since lastReviewGap is small)
    // But also consider the student needs to rebuild from current retrievability.

    // Number of reviews = ceil(log(targetStability / currentStab) / log(gainFactor))
    // But at minimum 1 review if retrievability < 0.85
    if (currentStab < targetStability) {
      reviewsNeeded = Math.ceil(
        Math.log(targetStability / currentStab) / Math.log(gainFactor),
      );
    }

    // If retrievability is already low, we need at least 1 review regardless
    if (retrievability < 0.85 && reviewsNeeded === 0) {
      reviewsNeeded = 1;
    }

    // Add extra review for hard topics
    reviewsNeeded += extraReviewForHard;

    // Cap reviews
    reviewsNeeded = Math.min(reviewsNeeded, MAX_REVIEWS);

    // Distribute reviews optimally across the available days
    const reviewDates = distributeReviewDates(
      today,
      daysUntilExam,
      reviewsNeeded,
      lastReviewGap,
      currentStab,
      gainFactor,
    );

    // Estimate retrievability on exam day after the planned reviews
    let simStability = currentStab;
    let simLastReviewDay = 0; // day 0 = today
    for (const rd of reviewDates) {
      const dayOffset = Math.floor((rd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      // Each review resets and increases stability
      simStability = simStability * gainFactor;
      simLastReviewDay = dayOffset;
    }
    const daysFromLastReviewToExam = daysUntilExam - simLastReviewDay;
    const peakRetrievability = reviewDates.length > 0
      ? computeFsrsRetrievability(Math.max(0, daysFromLastReviewToExam), simStability)
      : examDayRetrievabilityNoReview;

    // Priority classification
    const priority: 'critical' | 'moderate' | 'ready' =
      peakRetrievability < 0.6 ? 'critical'
      : peakRetrievability < 0.85 ? 'moderate'
      : 'ready';

    return {
      topicId,
      topicName,
      difficulty,
      currentStability: stability,
      reviewDates,
      peakRetrievability: Math.round(peakRetrievability * 1000) / 1000,
      priority,
    };
  });

  // Sort by priority: critical first, then moderate, then ready
  const priorityOrder = { critical: 0, moderate: 1, ready: 2 };
  plans.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return plans;
}

/**
 * FSRS retrievability function.
 * R(t) = (1 + t / (9 * S))^(-1)
 * where t = elapsed days, S = stability.
 */
function computeFsrsRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

/**
 * Distribute review dates across the available days before an exam.
 *
 * Strategy:
 * - Last review = lastReviewGap days before exam (1-2 days)
 * - Earlier reviews spaced at ~60% of stability interval (expanding spacing)
 * - Minimum 1 day between reviews
 */
function distributeReviewDates(
  today: Date,
  daysUntilExam: number,
  reviewCount: number,
  lastReviewGap: number,
  initialStability: number,
  gainFactor: number,
): Date[] {
  if (reviewCount <= 0 || daysUntilExam <= 0) return [];

  // Work backwards from exam
  const reviewDayOffsets: number[] = [];

  // Last review is `lastReviewGap` days before exam
  let currentOffset = daysUntilExam - lastReviewGap;
  if (currentOffset < 1) currentOffset = Math.max(1, daysUntilExam - 1);

  reviewDayOffsets.push(currentOffset);

  // Place earlier reviews working backwards
  let stab = initialStability;
  for (let i = 1; i < reviewCount; i++) {
    // Gap = ~60% of current stability, but at least 1 day
    const gap = Math.max(1, Math.round(stab * 0.6));
    currentOffset -= gap;

    // Don't go before today
    if (currentOffset < 1) {
      currentOffset = 1;
    }

    reviewDayOffsets.push(currentOffset);

    // Stability increases with each review (forward simulation)
    stab *= gainFactor;
  }

  // Sort chronologically and deduplicate
  const uniqueOffsets = [...new Set(reviewDayOffsets)].sort((a, b) => a - b);

  // Ensure minimum 1-day gap between reviews by shifting forward if needed
  for (let i = 1; i < uniqueOffsets.length; i++) {
    if (uniqueOffsets[i] <= uniqueOffsets[i - 1]) {
      uniqueOffsets[i] = uniqueOffsets[i - 1] + 1;
    }
  }

  // Filter out any offsets that exceed days until exam
  const validOffsets = uniqueOffsets.filter(o => o > 0 && o <= daysUntilExam);

  // Convert offsets to Date objects
  return validOffsets.map(offset => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

// ─── Difficulty Badge Helper ──────────────────────────────────

/**
 * Get a difficulty badge configuration for UI display.
 * Used by the study organizer wizard and schedule views.
 *
 * Classification thresholds match DIFFICULTY_THRESHOLDS used
 * throughout this module (hard >= 0.65, medium >= 0.35, easy < 0.35).
 *
 * @param difficulty - Difficulty value (0.0-1.0) or null if unknown
 * @returns Object with localized label, Tailwind-compatible color, and emoji
 */
export function getDifficultyBadge(
  difficulty: number | null,
): { label: string; color: string; emoji: string } {
  if (difficulty === null || difficulty === undefined) {
    return { label: '?', color: '#9ca3af', emoji: '\u2753' }; // gray, question mark
  }

  if (difficulty >= DIFFICULTY_THRESHOLDS.hard) {
    return { label: 'Dif\u00edcil', color: '#ef4444', emoji: '\uD83D\uDD34' }; // red circle
  }

  if (difficulty >= DIFFICULTY_THRESHOLDS.medium) {
    return { label: 'Moderado', color: '#f59e0b', emoji: '\uD83D\uDFE1' }; // yellow circle
  }

  return { label: 'F\u00e1cil', color: '#22c55e', emoji: '\uD83D\uDFE2' }; // green circle
}
