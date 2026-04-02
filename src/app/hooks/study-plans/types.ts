/**
 * Types for the useStudyPlans hook.
 * Extracted to avoid circular dependencies between sub-modules.
 */

import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';

export interface TopicLookup {
  topicTitle: string;
  sectionTitle: string;
  courseName: string;
  courseId: string;
  courseColor: string;
}

export interface UseStudyPlansOptions {
  /** Current mastery data from useTopicMastery (Phase 5 reschedule) */
  topicMastery?: Map<string, TopicMasteryInfo>;
  /** Time estimate getter from useStudyTimeEstimates (Phase 5 reschedule) */
  getTimeEstimate?: (methodId: string) => { estimatedMinutes: number };
}
