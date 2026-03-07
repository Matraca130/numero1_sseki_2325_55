// ============================================================
// useFlashcardEngine — Session logic + backend persistence
//
// v4.4.4 — Refactored to use useReviewBatch hook:
//   The batch queue, FSRS+BKT computation, intra-session BKT
//   accumulation, and batch submission are now delegated to
//   useReviewBatch — a reusable hook shared with FlashcardReviewer
//   and ReviewSessionView.
//
//   This file retains:
//     - Session lifecycle (create, close, restart)
//     - Card navigation + timing
//     - Optimistic updates + mastery deltas (SummaryScreen)
//     - [M2] sessionStatsRef pattern (no sessionStats dep)
//
// Uses the SAME FSRS algorithm as FlashcardReviewer and
// ReviewSessionView (lib/fsrs-engine.ts) to guarantee consistent
// scheduling across all review flows.
// ============================================================

import { useState, useCallback, useRef } from 'react';
import type { Flashcard } from '@/app/types/content';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';
import * as sessionApi from '@/app/services/studySessionApi';
import type { FsrsState } from '@/app/lib/fsrs-engine';
import { useReviewBatch } from './useReviewBatch';

// ── Optimistic update type ────────────────────────────────

export interface OptimisticCardUpdate {
  flashcard_id: string;
  p_know: number;
  fsrs_state: string;
  stability: number;
  difficulty: number;
  due_at: string;
}

// ── Per-card mastery delta (for SummaryScreen) ────────────

export interface CardMasteryDelta {
  cardId: string;
  before: number;  // p_know before review
  after: number;   // p_know after review
  grade: number;   // rating given (1-5)
}

// ── Hook options ──────────────────────────────────────────

interface UseFlashcardEngineOpts {
  studentId: string | null;
  courseId: string;
  topicId?: string | null;
  /** Study-queue mastery map: flashcard_id → StudyQueueItem (real FSRS values) */
  masteryMap?: Map<string, StudyQueueItem>;
  onFinish: () => void;
}

/** Grace period (ms) after awaiting all persists, before calling onFinish.
 *  Gives Supabase time to propagate writes for the subsequent GET. */
const POST_PERSIST_GRACE_MS = 400;

// ══════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════

export function useFlashcardEngine({ studentId, courseId, topicId, masteryMap, onFinish }: UseFlashcardEngineOpts) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState<number[]>([]);

  // [M2] Ref mirror of sessionStats for handleRate — avoids dependency on
  // sessionStats state, preventing handleRate identity from changing every rating.
  const sessionStatsRef = useRef<number[]>([]);

  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);

  // Track timing per card
  const cardStartTime = useRef<number>(Date.now());
  const sessionStartTime = useRef<number>(Date.now());
  // Backend session ID
  const sessionIdRef = useRef<string | null>(null);

  // ── Guard: prevent double-fire of session close ──
  const isFinishingRef = useRef(false);

  // ── Optimistic mastery updates (cardId → computed values) ──
  const optimisticRef = useRef<Map<string, OptimisticCardUpdate>>(new Map());

  // ── Per-card mastery deltas for SummaryScreen ──
  const masteryDeltasRef = useRef<CardMasteryDelta[]>([]);

  // ── Batch review hook (queue + compute + submit) ──────────
  // Replaces the old batchQueueRef + sessionBktRef + persistCardResult.
  // All FSRS+BKT computation and intra-session BKT accumulation
  // are now handled inside useReviewBatch.
  const { queueReview, submitBatch, reset: batchReset } = useReviewBatch();

  // ── Reset all per-session refs ──

  const resetSessionRefs = useCallback(() => {
    sessionStatsRef.current = [];
    optimisticRef.current = new Map();
    masteryDeltasRef.current = [];
    batchReset();
    isFinishingRef.current = false;
  }, [batchReset]);

  // ── Start Session ──

  const startSession = useCallback(async (cards: Flashcard[]) => {
    if (cards.length === 0) return;
    setSessionCards(cards);
    setCurrentIndex(0);
    setSessionStats([]);
    setIsRevealed(false);
    cardStartTime.current = Date.now();
    sessionStartTime.current = Date.now();

    resetSessionRefs();

    // Create backend session (fire-and-forget, don't block UI)
    try {
      const session = await sessionApi.createStudySession({
        session_type: 'flashcard',
        course_id: courseId || undefined,
      });
      sessionIdRef.current = session.id;
      if (import.meta.env.DEV) {
        console.log(`[FlashcardEngine] Session created: ${session.id}`);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[FlashcardEngine] Failed to create session (continuing offline):', err);
      }
      sessionIdRef.current = `local-${Date.now()}`;
    }
  }, [courseId, resetSessionRefs]);

  // ── Build real FSRS state from masteryMap or card fields ──

  const buildExistingFsrs = useCallback((card: Flashcard): FsrsState | undefined => {
    // 1. Try masteryMap (real values from study-queue)
    const sq = masteryMap?.get(card.id);
    if (sq) {
      return {
        stability: sq.stability,
        difficulty: sq.difficulty,
        reps: 0,     // study-queue doesn't expose reps/lapses; backend will merge
        lapses: 0,
        state: sq.fsrs_state,
      };
    }

    // 2. Fallback: use card.fsrs_state if set (from enrichment)
    if (card.fsrs_state) {
      return {
        stability: 1,
        difficulty: 5,
        reps: 0,
        lapses: 0,
        state: card.fsrs_state,
      };
    }

    // 3. No data → undefined (computeCardReviewData will use initial state)
    return undefined;
  }, [masteryMap]);

  // ── Close session on backend ──

  const closeSession = useCallback(async (stats: number[]) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || sessionId.startsWith('local-')) return;

    const durationSeconds = Math.round((Date.now() - sessionStartTime.current) / 1000);
    const correctReviews = stats.filter(s => s >= 3).length;

    try {
      await sessionApi.closeStudySession(sessionId, {
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        total_reviews: stats.length,
        correct_reviews: correctReviews,
      });
      if (import.meta.env.DEV) {
        console.log(`[FlashcardEngine] Session closed: ${sessionId}`);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[FlashcardEngine] Failed to close session:', err);
      }
    }
  }, []);

  // ── Handle Rating ──

  const handleRate = useCallback((rating: number) => {
    // Guard: prevent double-fire on last card (rapid clicks or re-renders)
    if (isFinishingRef.current) return;

    const responseTimeMs = Date.now() - cardStartTime.current;
    const card = sessionCards[currentIndex];

    // ── Compute + queue via useReviewBatch (sync, zero network) ──
    if (card) {
      const sq = masteryMap?.get(card.id);
      const existingFsrs = buildExistingFsrs(card);

      // queueReview handles: grade clamping, FSRS+BKT computation,
      // intra-session BKT accumulation, and BatchReviewItem queuing.
      // Returns computed values so we can build optimistic updates.
      const result = queueReview({
        card,
        grade: rating,
        responseTimeMs,
        existingFsrs,
        currentPKnow: sq?.p_know,
      });

      // Build optimistic update (engine-specific, not in hook)
      optimisticRef.current.set(card.id, {
        flashcard_id: card.id,
        p_know: result.newPKnow,
        fsrs_state: result.fsrsUpdate.state,
        stability: result.fsrsUpdate.stability,
        difficulty: result.fsrsUpdate.difficulty,
        due_at: result.fsrsUpdate.due_at,
      });

      // Track mastery delta for SummaryScreen
      masteryDeltasRef.current.push({
        cardId: card.id,
        before: result.previousPKnow,
        after: result.newPKnow,
        grade: rating,
      });
    }

    // [M2] Update both state (for UI reactivity) and ref (for handleRate closure)
    sessionStatsRef.current = [...sessionStatsRef.current, rating];
    setSessionStats(sessionStatsRef.current);
    setIsRevealed(false);

    const isLast = currentIndex >= sessionCards.length - 1;

    if (isLast) {
      // ── Session complete ──
      isFinishingRef.current = true;

      // [M2] Use ref instead of state — no dependency on sessionStats
      const allStats = sessionStatsRef.current;
      const sessionId = sessionIdRef.current;

      (async () => {
        // 1. [M1] Submit all reviews in ONE batch request
        //    submitBatch handles: local- guard, empty check, fallback to individual POSTs
        if (sessionId) {
          await submitBatch(sessionId);
        }

        // 2. Close the session on backend
        await closeSession(allStats);

        // 3. Grace period for Supabase eventual consistency
        await new Promise(r => setTimeout(r, POST_PERSIST_GRACE_MS));

        // 4. NOW safe to refresh mastery from backend
        onFinish();
      })();
    } else {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        cardStartTime.current = Date.now();
      }, 200);
    }
  }, [sessionCards, currentIndex, queueReview, submitBatch, buildExistingFsrs, masteryMap, closeSession, onFinish]);
  // ^^^ [M2] sessionStats REMOVED from deps — uses sessionStatsRef instead

  // ── Restart / Exit ──

  const restartSession = useCallback(() => {
    setCurrentIndex(0);
    setSessionStats([]);
    setIsRevealed(false);
    cardStartTime.current = Date.now();
    sessionStartTime.current = Date.now();

    resetSessionRefs();

    // Create a new backend session
    sessionApi.createStudySession({
      session_type: 'flashcard',
      course_id: courseId || undefined,
    }).then(session => {
      sessionIdRef.current = session.id;
    }).catch(() => {
      sessionIdRef.current = `local-${Date.now()}`;
    });
  }, [courseId, resetSessionRefs]);

  return {
    isRevealed,
    setIsRevealed,
    currentIndex,
    sessionStats,
    sessionCards,
    startSession,
    handleRate,
    restartSession,
    // ── Exposed for real-time mastery ──
    optimisticUpdates: optimisticRef,
    masteryDeltas: masteryDeltasRef,
  };
}
