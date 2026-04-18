// ============================================================
// useReviewBatch — Reusable batch review queue + submission
//
// PATH B (v4.5): Frontend solo encola grade + subtopic_id.
// El backend computa FSRS v4 Petrick + BKT v4 Recovery.
//
// La heuristica BKT local (3 lineas) es SOLO para feedback
// visual instantaneo durante la sesion. Los valores REALES
// los computa el backend al procesar el batch.
//
// Responsibilities:
//   1. Queue reviews during a session (zero network calls)
//   2. Estimate BKT visually (heuristic, NOT persisted)
//   3. Track intra-session BKT estimation accumulation
//   4. Submit all reviews in ONE POST /review-batch at end
//   5. Parse computed results from enriched response
//   6. Fallback to individual POSTs if batch fails
//   7. Persist pending batch to localStorage for offline resilience
//   8. Retry pending batches on app mount via retryPendingBatches()
//
// NOT responsible for:
//   - Computing FSRS (backend does this)
//   - Computing real BKT (backend does this)
//   - Creating / closing backend sessions
//   - Optimistic UI updates (consumer handles these)
// ============================================================

import { useRef, useCallback } from 'react';
import * as sessionApi from '@/app/services/studySessionApi';
import type {
  BatchReviewItem,
  BatchReviewResponse,
  BatchComputedResult,
} from '@/app/services/studySessionApi';

// ── Minimal card interface ────────────────────────────────
export interface ReviewableCard {
  id: string;
  subtopic_id?: string | null;
}

// ── queueReview input ─────────────────────────────────
export interface QueueReviewParams {
  /** Card being reviewed — only needs id + subtopic_id */
  card: ReviewableCard;
  /** FSRS grade (1-4). Callers rendering the 1-5 UI rating buttons
   *  must translate via `uiRatingToFsrsGrade` from
   *  `@/app/lib/grade-mapper` BEFORE calling queueReview. */
  grade: number;
  /** Time in ms the student took to respond */
  responseTimeMs: number;
  /**
   * Current BKT p_know for this card's subtopic (0-1).
   * Overridden by the intra-session accumulator if we already
   * reviewed another card from the same subtopic in this session.
   * Defaults to 0 if omitted (safe for first review).
   */
  currentPKnow?: number;
  /**
   * Backend session id for this review.
   * When provided, each call to queueReview also writes the
   * running batch to localStorage so a tab crash / hard refresh
   * does not lose the already-answered cards (audit P1 #5).
   * Local/offline ids (prefix `local-`) are ignored.
   */
  sessionId?: string | null;
  // NOTE: existingFsrs is NO LONGER accepted.
  // PATH B: the backend reads FSRS state from the DB.
}

// ── queueReview output ────────────────────────────────
export interface QueueReviewResult {
  /** Whether grade >= 3 (Good or Easy) */
  isCorrect: boolean;
  /**
   * ESTIMATED BKT p_know after this review.
   * This is a lightweight heuristic for instant visual feedback.
   * The REAL value is computed by the backend with BKT v4 Recovery.
   */
  estimatedPKnow: number;
  /** BKT p_know BEFORE this review (the resolved value) */
  previousPKnow: number;
}

// ── submitBatch output ────────────────────────────────
export interface BatchSubmitResult {
  response: BatchReviewResponse;
  /**
   * Per-item computed values from the backend (PATH B).
   * Map key = item_id. Only present if backend returns results.
   */
  computedResults: Map<string, BatchComputedResult>;
}

// ── BKT Visual Heuristic Constants ──────────────────────
const P_LEARN_ESTIMATE = 0.18;
const P_FORGET_ESTIMATE = 0.25;

// ════════════════════════════════════════════════════════
// LOCALSTORAGE PERSISTENCE — Offline resilience
// ════════════════════════════════════════════════════════

const LS_KEY = 'axon_pending_review_batch';

interface PendingBatch {
  sessionId: string;
  items: BatchReviewItem[];
  savedAt: string;
}

type BatchError = NonNullable<BatchReviewResponse['errors']>[number];

function savePendingBatch(sessionId: string, items: BatchReviewItem[]): void {
  try {
    const pending: PendingBatch = { sessionId, items, savedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(pending));
  } catch {
    // localStorage full or unavailable
  }
}

function clearPendingBatch(): void {
  try { localStorage.removeItem(LS_KEY); } catch { /* silent */ }
}

function loadPendingBatch(): PendingBatch | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingBatch;
    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (age > 24 * 60 * 60 * 1000) { clearPendingBatch(); return null; }
    return parsed;
  } catch { clearPendingBatch(); return null; }
}

function collectFailedItems(
  items: BatchReviewItem[],
  errors?: BatchError[],
): BatchReviewItem[] {
  if (!errors?.length) return [];

  const failedIndexes = new Set<number>();
  for (const error of errors) {
    if (Number.isInteger(error.index) && error.index >= 0 && error.index < items.length) {
      failedIndexes.add(error.index);
    }
  }

  return [...failedIndexes]
    .sort((a, b) => a - b)
    .map((index) => items[index])
    .filter((item): item is BatchReviewItem => Boolean(item));
}

function persistPendingFailures(
  sessionId: string,
  items: BatchReviewItem[],
  errors?: BatchError[],
): BatchReviewItem[] {
  if (!errors?.length) {
    clearPendingBatch();
    return [];
  }

  const failedItems = collectFailedItems(items, errors);
  if (failedItems.length > 0) {
    savePendingBatch(sessionId, failedItems);
    return failedItems;
  }

  if (import.meta.env.DEV) {
    console.warn(
      '[ReviewBatch] Partial errors did not include valid indexes; keeping full batch for retry.',
      errors,
    );
  }
  savePendingBatch(sessionId, items);
  return items;
}

export async function retryPendingBatches(): Promise<boolean> {
  const pending = loadPendingBatch();
  if (!pending || pending.items.length === 0) return false;

  if (import.meta.env.DEV) {
    console.log(`[ReviewBatch] Found pending batch: ${pending.items.length} reviews from session ${pending.sessionId} (saved ${pending.savedAt})`);
  }

  try {
    const response = await sessionApi.submitReviewBatch(pending.sessionId, pending.items);
    const failedItems = persistPendingFailures(pending.sessionId, pending.items, response.errors);

    if (failedItems.length === 0) {
      if (import.meta.env.DEV) console.log('[ReviewBatch] Pending batch retried successfully');
      return true;
    }

    if (import.meta.env.DEV) {
      console.warn(
        `[ReviewBatch] Pending batch retry still has ${failedItems.length} failed item(s); keeping them in localStorage`,
        response.errors,
      );
    }
    return false;
  } catch (batchErr) {
    try {
      await sessionApi.fallbackToIndividualPosts(pending.sessionId, pending.items);
      clearPendingBatch();
      if (import.meta.env.DEV) console.log('[ReviewBatch] Pending batch retried via individual fallback');
      return true;
    } catch {
      if (import.meta.env.DEV) console.warn('[ReviewBatch] Pending batch retry failed again, keeping in localStorage');
      return false;
    }
  }
}

// ════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════

export function useReviewBatch() {
  const batchQueueRef = useRef<BatchReviewItem[]>([]);
  const sessionBktRef = useRef<Map<string, number>>(new Map());

  const queueReview = useCallback((params: QueueReviewParams): QueueReviewResult => {
    const { card, grade, responseTimeMs, currentPKnow, sessionId } = params;

    const isCorrect = grade >= 3;

    const sessionPKnow = card.subtopic_id ? sessionBktRef.current.get(card.subtopic_id) : undefined;
    const resolvedPKnow = sessionPKnow ?? currentPKnow ?? 0;

    const estimatedPKnow = isCorrect
      ? resolvedPKnow + (1 - resolvedPKnow) * P_LEARN_ESTIMATE
      : resolvedPKnow * (1 - P_FORGET_ESTIMATE);

    if (card.subtopic_id) {
      sessionBktRef.current.set(card.subtopic_id, estimatedPKnow);
    }

    const batchItem: BatchReviewItem = {
      item_id: card.id,
      instrument_type: 'flashcard',
      grade,
      response_time_ms: responseTimeMs,
    };

    if (card.subtopic_id) {
      batchItem.subtopic_id = card.subtopic_id;
    }

    batchQueueRef.current.push(batchItem);

    // AUDIT P1 #5: persist the in-progress batch after every queued
    // review so an unexpected tab close / crash / refresh still lets
    // `retryPendingBatches()` replay the answers on next mount.
    // Skip local/offline sessions — the backend has no record to
    // attach them to yet.
    if (sessionId && !sessionId.startsWith('local-')) {
      savePendingBatch(sessionId, batchQueueRef.current);
    }

    return { isCorrect, estimatedPKnow, previousPKnow: resolvedPKnow };
  }, []);

  const submitBatch = useCallback(async (sessionId: string): Promise<BatchSubmitResult | null> => {
    const batchItems = [...batchQueueRef.current];

    if (!sessionId || sessionId.startsWith('local-') || batchItems.length === 0) {
      batchQueueRef.current = [];
      return null;
    }

    savePendingBatch(sessionId, batchItems);

    try {
      const response = await sessionApi.submitReviewBatch(sessionId, batchItems);

      if (import.meta.env.DEV) {
        console.log(
          `[ReviewBatch] Batch submitted: ${response.reviews_created} reviews, ` +
          `${response.fsrs_updated} FSRS, ${response.bkt_updated} BKT` +
          (response.results ? ` (${response.results.length} computed results)` : ''),
        );
        if (response.errors?.length) {
          if (import.meta.env.DEV) console.warn(`[ReviewBatch] Batch had ${response.errors.length} partial errors:`, response.errors);
        }
      }

      const computedResults = new Map<string, BatchComputedResult>();
      if (response.results) {
        for (const result of response.results) {
          computedResults.set(result.item_id, result);
        }
      }

      const failedItems = persistPendingFailures(sessionId, batchItems, response.errors);
      if (failedItems.length > 0 && import.meta.env.DEV) {
        console.warn(
          `[ReviewBatch] Keeping ${failedItems.length} failed item(s) in localStorage for retry`,
          response.errors,
        );
      }
      batchQueueRef.current = [];
      return { response, computedResults };
    } catch (batchErr) {
      if (import.meta.env.DEV) {
        console.warn('[ReviewBatch] Batch failed, falling back to individual POSTs:', batchErr);
      }

      try {
        await sessionApi.fallbackToIndividualPosts(sessionId, batchItems);
        clearPendingBatch();
      } catch (fallbackErr) {
        if (import.meta.env.DEV) console.error(
          '[ReviewBatch] Both batch and fallback failed. ' +
          `${batchItems.length} reviews saved to localStorage for retry.`,
          fallbackErr,
        );
      }

      batchQueueRef.current = [];
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    batchQueueRef.current = [];
    sessionBktRef.current = new Map();
  }, []);

  const getBatchSize = useCallback((): number => {
    return batchQueueRef.current.length;
  }, []);

  return { queueReview, submitBatch, reset, getBatchSize };
}
