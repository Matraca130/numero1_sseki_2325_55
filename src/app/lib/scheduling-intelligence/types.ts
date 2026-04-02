/**
 * Types for the scheduling intelligence module.
 * Separated from logic to avoid circular dependencies.
 */

import type { TopicDifficultyData } from '@/app/types/student';

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

// Re-export for convenience within the module
export type { TopicDifficultyData };
