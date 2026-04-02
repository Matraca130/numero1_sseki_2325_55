/**
 * scheduling-intelligence.ts — Barrel re-export
 * Módulos internos en ./scheduling-intelligence/
 * @see ./scheduling-intelligence/index.ts
 */

export {
  classifyDifficulty,
  adjustTimeByDifficulty,
  getDifficultyBadge,
  orderByPrerequisites,
  balanceCognitiveLoad,
  interleaveWithinDays,
  enrichTasksWithDifficulty,
  runSchedulingPipeline,
  computeStudyMomentum,
  planExamCountdown,
} from './scheduling-intelligence/index';

export type {
  ScheduleTask,
  ScheduleDay,
  DifficultyTier,
  ExamReviewPlan,
} from './scheduling-intelligence/index';
