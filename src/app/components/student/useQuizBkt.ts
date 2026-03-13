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
//
// BKT v3.1 computation is inlined below. Server-side BKT runs
// in backend batch-review.ts (PATH B).
// ============================================================

import { useRef, useCallback } from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import { upsertBktState } from '@/app/services/quizApi';
import { logger } from '@/app/lib/logger';

// ── BKT v3.1 Inline Computation ─────────────────────────
// Parameters match what we send to upsertBktState.

const P_TRANSIT = 0.1;
const P_SLIP = 0.1;
const P_GUESS = 0.25;
const RECOVERY_FACTOR = 0.15; // boost when previousMax > current

/**
 * Compute updated BKT mastery (p_know) after a single attempt.
 *
 * Formula (standard BKT with recovery):
 *   1. p_correct = p_know * (1 - p_slip) + (1 - p_know) * p_guess
 *   2. posterior = correct
 *        ? p_know * (1 - p_slip) / p_correct
 *        : p_know * p_slip / (1 - p_correct)
 *   3. new_p_know = posterior + (1 - posterior) * p_transit
 *   4. If previousMaxMastery > current → add recovery boost
 *   5. Clamp to [0, 1]
 */
function computeBktMastery(
  currentMastery: number,
  isCorrect: boolean,
  previousMaxMastery?: number,
): number {
  const pKnow = Math.max(0, Math.min(1, currentMastery));
  const pCorrect = pKnow * (1 - P_SLIP) + (1 - pKnow) * P_GUESS;

  let posterior: number;
  if (isCorrect) {
    posterior = pCorrect > 0 ? (pKnow * (1 - P_SLIP)) / pCorrect : pKnow;
  } else {
    posterior = pCorrect < 1 ? (pKnow * P_SLIP) / (1 - pCorrect) : pKnow;
  }

  let newP = posterior + (1 - posterior) * P_TRANSIT;

  // Recovery: if student previously had higher mastery, give a small boost
  if (previousMaxMastery != null && previousMaxMastery > newP) {
    newP += (previousMaxMastery - newP) * RECOVERY_FACTOR;
  }

  return Math.max(0, Math.min(1, newP));
}

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
    const newP = computeBktMastery(
      prevMastery,
      isCorrect,
      prevMax > prevMastery ? prevMax : undefined,
    );
    bktMasteryRef.current[subtopicId] = newP;
    bktMaxMasteryRef.current[subtopicId] = Math.max(prevMax, newP);

    try {
      await upsertBktState({
        subtopic_id: subtopicId,
        p_know: newP,
        p_transit: P_TRANSIT,
        p_slip: P_SLIP,
        p_guess: P_GUESS,
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
