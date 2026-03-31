/**
 * Exam countdown mode — optimal review timing for exam preparation.
 * Distributes reviews so each topic's FSRS retrievability peaks on exam day.
 */

import type { ExamReviewPlan } from './types';
import { SPACING_RATIO, GAIN_FACTOR_DEFAULT, GAIN_FACTOR_HARD } from './constants';

/**
 * @internal — not yet consumed, planned for future iteration
 *
 * Compute optimal review timing for exam preparation.
 *
 * Given an exam date, distributes reviews so that each topic's
 * FSRS retrievability peaks on the exam day, not today.
 *
 * FSRS retrievability model (Anki/FSRS):
 *   R(t) = (1 + t / (9 * S))^(-1)
 * where t = days since last review, S = stability.
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
  if (isNaN(examDate.getTime())) return [];

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
    const isHard = difficulty > 0.65;
    const gainFactor = isHard ? GAIN_FACTOR_HARD : GAIN_FACTOR_DEFAULT;
    const extraReviewForHard = isHard ? 1 : 0;

    // Determine how many reviews are needed to build stability to cover exam
    let currentStab = stability > 0 ? stability : 0.5; // min stability
    let reviewsNeeded = 0;
    const MAX_REVIEWS = 10; // safety cap

    const lastReviewGap = isHard ? 1 : 2; // hard topics: review 1 day before; others: 2 days
    const targetStability = lastReviewGap + 1; // stability needed after last review

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
    const gap = Math.max(1, Math.round(stab * SPACING_RATIO));
    currentOffset -= gap;

    // Don't go before today
    if (currentOffset < 1) {
      currentOffset = 1;
    }

    reviewDayOffsets.push(currentOffset);

    // Stability decreases going backward (earlier reviews had lower stability)
    stab /= gainFactor;
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
