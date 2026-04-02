/**
 * scheduling-intelligence — Barrel re-export
 * Módulos internos en ./scheduling-intelligence/
 * @see ./difficulty.ts
 * @see ./cognitive-load.ts
 * @see ./schedule-generation.ts
 * @see ./exam-countdown.ts
 */

// Types
export type { ScheduleTask, ScheduleDay, DifficultyTier, ExamReviewPlan } from './types';

// Difficulty classification & time adjustment
export { classifyDifficulty, adjustTimeByDifficulty, getDifficultyBadge } from './difficulty';

// Prerequisite ordering
export { orderByPrerequisites } from './prerequisite-ordering';

// Cognitive load balancing & interleaving
export { balanceCognitiveLoad, interleaveWithinDays } from './cognitive-load';

// Task enrichment & pipeline
export { enrichTasksWithDifficulty, runSchedulingPipeline } from './schedule-generation';

// Study momentum
export { computeStudyMomentum } from './momentum';

// Exam countdown
export { planExamCountdown } from './exam-countdown';
