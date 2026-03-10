// ============================================================
// Axon — Student Quiz: BKT Fire-and-Forget Hook (M-5 Extraction)
//
// Extracted from useQuizSession.ts to isolate BKT tracking logic.
//
// Manages:
//   - Running BKT mastery per subtopic (bktMasteryRef)
//   - Max mastery tracking for recovery factor (bktMaxMasteryRef)
//   - Fire-and-forget upsertBktState API calls
//   - Reset on session restart
//
// Architecture: stateless refs → Promise-based API
// BKT v3.1 parameters are in bkt-engine.ts (NEVER duplicate).
// ============================================================

import { useRef, useCallback } from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import { upsertBktState } from '@/app/services/quizApi';
import { updateBKT } from '@/app/lib/bkt-engine';
import { logger } from '@/app/lib/logger';

// ── Return type ──────────────────────────────────────────

export interface UseQuizBktReturn {
  /** Fire-and-forget: compute new BKT mastery + upsert to backend */
  handleBktUpdate: (question: QuizQuestion, isCorrect: boolean) => Promise<void>;
  /** Reset all BKT tracking refs (call on session restart) */
  resetBkt: () => void;
}

// ── Hook ─────────────────────────────────────────────

export function useQuizBkt(): UseQuizBktReturn {
  // Running BKT mastery per subtopic (accumulates across questions)
  const bktMasteryRef = useRef<Record<string, number>>({});
  const bktMaxMasteryRef = useRef<Record<string, number>>({});

  const handleBktUpdate = useCallback(async (question: QuizQuestion, isCorrect: boolean) => {
    const subtopicId = question.subtopic_id;
    if (!subtopicId) return;

    const prevMastery = bktMasteryRef.current[subtopicId] ?? 0;
    const prevMax = bktMaxMasteryRef.current[subtopicId] ?? 0;
    const newP = updateBKT(
      prevMastery,
      isCorrect,
      'quiz',
      prevMax > prevMastery ? prevMax : undefined,
    );
    bktMasteryRef.current[subtopicId] = newP;
    bktMaxMasteryRef.current[subtopicId] = Math.max(prevMax, newP);

    try {
      await upsertBktState({
        subtopic_id: subtopicId,
        p_know: newP,
        p_transit: 0.1,
        p_slip: 0.1,
        p_guess: 0.25,
        delta: newP - prevMastery,
        total_attempts: 1,
        correct_attempts: isCorrect ? 1 : 0,
        last_attempt_at: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('[useQuizBkt] BKT update failed (non-blocking):', err);
    }
  }, []);

  const resetBkt = useCallback(() => {
    bktMasteryRef.current = {};
    bktMaxMasteryRef.current = {};
  }, []);

  return { handleBktUpdate, resetBkt };
}
