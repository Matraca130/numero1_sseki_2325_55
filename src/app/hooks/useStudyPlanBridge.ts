// ============================================================
// Axon — useStudyPlanBridge
// Auto-marks a study plan task as completed when a student
// finishes a session (flashcard/quiz/reading).
// ============================================================
import { useCallback } from 'react';
import { useNavigation } from '@/app/context/NavigationContext';
import { useStudyPlansContext } from '@/app/context/StudyPlansContext';

export type SessionType = 'flashcard' | 'quiz' | 'reading';

/** Map session types to the plan task methods they can match. */
const SESSION_TO_METHODS: Record<SessionType, string[]> = {
  flashcard: ['flashcard'],
  quiz: ['quiz'],
  reading: ['resumo', 'reading', 'video'], // reading sessions can match resumo or video tasks
};

export function useStudyPlanBridge() {
  const { currentTopic } = useNavigation();
  const { findPendingTask, toggleTaskComplete } = useStudyPlansContext();

  const markSessionComplete = useCallback(async (sessionType: SessionType) => {
    const topicId = currentTopic?.id;
    if (!topicId) return; // not studying a specific topic

    const methods = SESSION_TO_METHODS[sessionType];
    // Try each method until we find a matching pending task
    for (const method of methods) {
      const match = findPendingTask(topicId, method);
      if (match) {
        await toggleTaskComplete(match.planId, match.taskId);
        return; // only mark ONE task per session
      }
    }
    // No matching task found — this session is not part of a study plan. That's OK.
  }, [currentTopic?.id, findPendingTask, toggleTaskComplete]);

  return { markSessionComplete };
}
