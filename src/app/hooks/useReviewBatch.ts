// ============================================================
// useReviewBatch — Reusable batch review queue + submission
//
// Extracts the batch pattern (Fase 1 + Fase 2) from
// useFlashcardEngine into a hook that ANY review consumer
// can use: useFlashcardEngine, FlashcardReviewer,
// ReviewSessionView, or any future review flow.
//
// Responsibilities:
//   1. Queue reviews during a session (zero network calls)
//   2. Compute FSRS + BKT per card (via computeCardReviewData)
//   3. Track intra-session BKT accumulation (Fase 2 fix)
//   4. Submit all reviews in ONE POST /review-batch at end
//   5. Fallback to individual POSTs if batch fails
//
// NOT responsible for:
//   - Creating / closing backend sessions
//   - Optimistic UI updates (consumer handles these)
//   - Session-specific state (timer, grade history, etc.)
//
// Usage:
//   const { queueReview, submitBatch, reset } = useReviewBatch();
//
//   // During session — per card, sync, zero network:
//   const result = queueReview({ card, grade, responseTimeMs, existingFsrs, currentPKnow });
//
//   // At session end — one network call:
//   const batchResult = await submitBatch(sessionId);
//
//   // On restart:
//   reset();
// ============================================================

import { useRef, useCallback } from 'react';
import * as sessionApi from '@/app/services/studySessionApi';
import type { BatchReviewItem, BatchReviewResponse } from '@/app/services/studySessionApi';
import type { FsrsState } from '@/app/lib/fsrs-engine';
import type { FsrsUpdate } from '@/app/lib/fsrs-engine';
import { computeCardReviewData } from '@/app/lib/tracking';

// ── Minimal card interface ────────────────────────────────
// Accepts both Flashcard (useFlashcardEngine) and
// FlashcardItem (FlashcardReviewer, ReviewSessionView)
// without coupling to either type.

export interface ReviewableCard {
  id: string;
  subtopic_id?: string | null;
}

// ── queueReview input ─────────────────────────────────────

export interface QueueReviewParams {
  /** Card being reviewed — only needs id + subtopic_id */
  card: ReviewableCard;
  /** Original grade from the UI (1-5 or 1-4). Clamped to 1-4 for FSRS. */
  grade: number;
  /** Time in ms the student took to respond */
  responseTimeMs: number;
  /** Existing FSRS state from masteryMap / fsrsState. Omit for new cards. */
  existingFsrs?: FsrsState;
  /**
   * Current BKT p_know for this card's subtopic (0-1).
   * Overridden by the intra-session accumulator if we already
   * reviewed another card from the same subtopic in this session.
   * Defaults to 0 if omitted (safe for first review).
   */
  currentPKnow?: number;
}

// ── queueReview output ────────────────────────────────────
// Returned synchronously so consumers can build optimistic
// updates without duplicating computation.

export interface QueueReviewResult {
  /** BKT p_know AFTER this review (0-1) */
  newPKnow: number;
  /** BKT p_know BEFORE this review (0-1) — the resolved value used for computation */
  previousPKnow: number;
  /** Full FSRS scheduling update */
  fsrsUpdate: FsrsUpdate;
  /** Whether grade >= 3 */
  isCorrect: boolean;
}

// ══════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════

export function useReviewBatch() {
  // ── Batch queue: collects BatchReviewItems during session ──
  const batchQueueRef = useRef<BatchReviewItem[]>([]);

  // ── Intra-session BKT accumulator (Fase 2) ──────────────
  // Maps subtopic_id → latest p_know within THIS session.
  // When multiple cards share a subtopic, the 2nd card sees
  // the accumulated p_know from the 1st, not the stale
  // study-queue value.
  const sessionBktRef = useRef<Map<string, number>>(new Map());

  // ── queueReview ─────────────────────────────────────────
  // Pure computation + queue push. ZERO network calls.
  // Returns computed values for optional consumer use.

  const queueReview = useCallback((params: QueueReviewParams): QueueReviewResult => {
    const { card, grade, responseTimeMs, existingFsrs, currentPKnow } = params;

    // 1. Clamp grade to FSRS range (1-4)
    const fsrsGrade = Math.max(1, Math.min(4, Math.round(grade))) as 1 | 2 | 3 | 4;

    // 2. Resolve p_know: intra-session accumulator > caller param > 0
    //    Priority: sessionBktRef (most recent) > currentPKnow (study-queue) > 0
    const sessionPKnow = card.subtopic_id
      ? sessionBktRef.current.get(card.subtopic_id)
      : undefined;
    const resolvedPKnow = sessionPKnow ?? currentPKnow ?? 0;

    // 3. Pure FSRS + BKT computation (NO network calls)
    const computed = computeCardReviewData({
      flashcardId: card.id,
      subtopicId: card.subtopic_id || null,
      grade: fsrsGrade,
      existingFsrsState: existingFsrs,
      currentPKnow: resolvedPKnow,
    });

    // 4. Update intra-session BKT accumulator (Fase 2)
    if (card.subtopic_id) {
      sessionBktRef.current.set(card.subtopic_id, computed.newPKnow);
    }

    // 5. Build BatchReviewItem
    const batchItem: BatchReviewItem = {
      item_id: card.id,
      instrument_type: 'flashcard',
      grade,  // original grade (preserves 1-5 if engine uses RATINGS)
      response_time_ms: responseTimeMs,
      fsrs_update: {
        stability: computed.fsrsUpdate.stability,
        difficulty: computed.fsrsUpdate.difficulty,
        due_at: computed.fsrsUpdate.due_at,
        last_review_at: new Date().toISOString(),
        reps: computed.fsrsUpdate.reps,
        lapses: computed.fsrsUpdate.lapses,
        state: computed.fsrsUpdate.state as 'new' | 'learning' | 'review' | 'relearning',
      },
    };

    // 6. Add BKT update if card has a subtopic
    if (card.subtopic_id) {
      batchItem.bkt_update = {
        subtopic_id: card.subtopic_id,
        p_know: computed.newPKnow,
        p_transit: 0.1,
        p_slip: 0.1,
        p_guess: 0.25,
        delta: computed.newPKnow - resolvedPKnow,
        total_attempts: 1,
        correct_attempts: computed.isCorrect ? 1 : 0,
        last_attempt_at: new Date().toISOString(),
      };
    }

    // 7. Push to queue
    batchQueueRef.current.push(batchItem);

    // 8. Return computed values for consumer use
    return {
      newPKnow: computed.newPKnow,
      previousPKnow: resolvedPKnow,
      fsrsUpdate: computed.fsrsUpdate,
      isCorrect: computed.isCorrect,
    };
  }, []);

  // ── submitBatch ─────────────────────────────────────────
  // Sends all queued reviews in ONE POST /review-batch.
  // Falls back to individual POSTs if batch endpoint fails.
  // Clears the queue after submission (success or fallback).
  // Returns null if nothing to submit or if fallback was used.

  const submitBatch = useCallback(async (
    sessionId: string,
  ): Promise<BatchReviewResponse | null> => {
    const batchItems = [...batchQueueRef.current]; // snapshot

    // Guard: nothing to submit
    if (!sessionId || sessionId.startsWith('local-') || batchItems.length === 0) {
      batchQueueRef.current = [];
      return null;
    }

    try {
      const result = await sessionApi.submitReviewBatch(sessionId, batchItems);

      if (import.meta.env.DEV) {
        console.log(
          `[ReviewBatch] Batch submitted: ${result.reviews_created} reviews, ` +
          `${result.fsrs_updated} FSRS, ${result.bkt_updated} BKT`,
        );
        if (result.errors?.length) {
          console.warn(
            `[ReviewBatch] Batch had ${result.errors.length} partial errors:`,
            result.errors,
          );
        }
      }

      batchQueueRef.current = [];
      return result;
    } catch (batchErr) {
      // ── FALLBACK: batch failed → fire individual POSTs ──
      if (import.meta.env.DEV) {
        console.warn('[ReviewBatch] Batch failed, falling back to individual POSTs:', batchErr);
      }

      await sessionApi.fallbackToIndividualPosts(sessionId, batchItems);
      batchQueueRef.current = [];
      return null;
    }
  }, []);

  // ── reset ───────────────────────────────────────────────
  // Clears all internal state. Call on session restart.

  const reset = useCallback(() => {
    batchQueueRef.current = [];
    sessionBktRef.current = new Map();
  }, []);

  // ── getBatchSize ────────────────────────────────────────
  // Utility for logging / debugging.

  const getBatchSize = useCallback((): number => {
    return batchQueueRef.current.length;
  }, []);

  return {
    queueReview,
    submitBatch,
    reset,
    getBatchSize,
  };
}
