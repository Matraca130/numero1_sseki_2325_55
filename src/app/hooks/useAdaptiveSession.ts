// ============================================================
// useAdaptiveSession — Orchestrates multi-round adaptive flashcard sessions
// Fase 3 del plan "Sesion Adaptativa de Flashcards con IA" (v4.5)
//
// This hook is a thin COMPOSER over three focused sub-hooks:
//   - useRoundLifecycle      → rounds, card navigation, stats
//   - useOptimisticMastery   → keyword mastery + optimistic card state
//   - useAdaptiveGeneration  → AI-batch generation state + abort
//
// It owns the session lifecycle (phase, session id, batch), wires
// the sub-hooks together, and preserves the EXACT public API that
// consumers/tests rely on. See the original implementation history
// for the rationale of composing over useReviewBatch directly.
//
// SESSION LIFECYCLE:
//   idle → reviewing(professor) → partial-summary
//     → generating → reviewing(ai) → partial-summary
//     → generating → reviewing(ai) → partial-summary  (repeatable)
//     → completed (final submit + close)
//
// SAFETY:
//   - Rule S1: does NOT touch useReviewBatch/fsrs-engine/bkt-engine
//   - Rule S2: does NOT change useFlashcardEngine signature
//   - Rule S4: uses the EXISTING useReviewBatch (no duplicate)
//   - Rule S6: BKT only persisted at session end via batch
// ============================================================

import { useState, useCallback, useRef, useMemo } from 'react';
import type { Flashcard } from '@/app/types/content';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';
import * as sessionApi from '@/app/services/studySessionApi';
import {
  useReviewBatch,
  type QueueReviewResult,
} from './useReviewBatch';
import { postSessionAnalytics } from '@/app/lib/sessionAnalytics';
import { mapBatchToFlashcards } from '@/app/services/adaptiveGenerationApi';
import { countCorrect } from '@/app/lib/session-stats';
import { uiRatingToFsrsGrade, type SmRating } from '@/app/lib/grade-mapper';
import { useRoundLifecycle, type RoundInfo } from './useRoundLifecycle';
import { useOptimisticMastery } from './useOptimisticMastery';
import {
  useAdaptiveGeneration,
  type GenerationProgressInfo,
} from './useAdaptiveGeneration';

// ── Types (public API — must stay identical) ─────────────────

export type AdaptivePhase =
  | 'idle'
  | 'reviewing'
  | 'partial-summary'
  | 'generating'
  | 'completed';

export type { RoundInfo, GenerationProgressInfo };

export interface UseAdaptiveSessionOpts {
  studentId: string | null;
  courseId: string;
  topicId: string | null;
  institutionId?: string;
  masteryMap?: Map<string, StudyQueueItem>;
}

// ── Constants ─────────────────────────────────────────────

const POST_PERSIST_GRACE_MS = 400;

// ════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════

export function useAdaptiveSession(opts: UseAdaptiveSessionOpts) {
  const { studentId, courseId, topicId, institutionId, masteryMap } = opts;

  const [phase, setPhase] = useState<AdaptivePhase>('idle');

  // Session-level refs
  const sessionIdRef = useRef<string | null>(null);
  const isFinishingSessionRef = useRef(false);
  const isStartingRef = useRef(false);
  const summaryIdsRef = useRef<string[]>([]);

  const rounds = useRoundLifecycle();
  const mastery = useOptimisticMastery();
  const generation = useAdaptiveGeneration();

  const { queueReview, submitBatch, reset: batchReset } = useReviewBatch();

  const currentCard = phase === 'reviewing' && rounds.roundCards.length > 0
    ? rounds.roundCards[rounds.currentIndex] ?? null
    : null;

  const finishCurrentRound = useCallback(() => {
    rounds.finalizeCurrentRound();
    mastery.recomputeMastery();
    setPhase('partial-summary');
  }, [rounds, mastery]);

  // ══ PUBLIC: startSession ══

  const startSession = useCallback(async (professorCards: Flashcard[]) => {
    if (professorCards.length === 0) return;
    if (!studentId) {
      if (import.meta.env.DEV) console.warn('[AdaptiveSession] startSession called without studentId');
      return;
    }
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    rounds.resetRounds();
    generation.resetGeneration();
    mastery.resetMasteryTracking();
    isFinishingSessionRef.current = false;
    batchReset();

    rounds.beginFirstRound(professorCards);

    try {
      const session = await sessionApi.createStudySession({ session_type: 'flashcard', course_id: courseId || undefined });
      sessionIdRef.current = session.id;
      if (import.meta.env.DEV) console.log(`[AdaptiveSession] Session created: ${session.id}`);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[AdaptiveSession] Session creation failed (continuing offline):', err);
      sessionIdRef.current = `local-${Date.now()}`;
    }

    mastery.loadMasteryForTopic(topicId);

    const uniqueSummaryIds = [...new Set(professorCards.map(card => card.summary_id).filter((id): id is string => !!id))];
    summaryIdsRef.current = uniqueSummaryIds;

    setPhase('reviewing');
    isStartingRef.current = false;
  }, [courseId, topicId, batchReset, studentId, rounds, mastery, generation]);

  // ══ PUBLIC: handleRate ══

  const handleRate = useCallback((rating: number) => {
    if (phase !== 'reviewing') return;
    if (rounds.isFinishingRoundRef.current) return;

    const card = rounds.roundCards[rounds.currentIndex];
    if (!card) return;

    const responseTimeMs = Date.now() - rounds.cardStartTimeRef.current;
    const sq = masteryMap?.get(card.id);

    // AUDIT P0 #1: translate SM-2 UI rating (1-5) to FSRS grade (1-4)
    // before handing it to the batch hook / backend. Without this, a SM-2
    // rating of 5 would reach the backend as grade=5 and get silently
    // clamped, corrupting FSRS stability/difficulty updates. Mirrors the
    // same fix applied in useFlashcardEngine on fix/flashcards-session-p0.
    const fsrsGrade = uiRatingToFsrsGrade(rating as SmRating);

    const result: QueueReviewResult = queueReview({
      card, grade: fsrsGrade, responseTimeMs, currentPKnow: sq?.p_know,
    });

    mastery.recordOptimistic({
      card,
      sq,
      estimatedPKnow: result.estimatedPKnow,
      previousPKnow: result.previousPKnow,
      rating,
    });

    rounds.recordRating(rating);

    const isLast = rounds.currentIndex >= rounds.roundCards.length - 1;

    if (isLast) {
      rounds.isFinishingRoundRef.current = true;
      finishCurrentRound();
    } else {
      rounds.advanceCard();
    }
  }, [phase, rounds, masteryMap, queueReview, finishCurrentRound, mastery]);

  // ══ PUBLIC: generateMore ══

  const generateMore = useCallback(async (count: number) => {
    if (phase !== 'partial-summary') {
      if (import.meta.env.DEV) console.warn(`[AdaptiveSession] generateMore called in wrong phase: ${phase}`);
      return;
    }
    if (generation.isGeneratingRef.current) return;

    setPhase('generating');

    const { result, aborted } = await generation.runGeneration({
      count,
      institutionId,
      summaryIds: summaryIdsRef.current,
    });

    if (aborted) return;

    if (!result) {
      // runGeneration already set generationError (unless it was a no-result no-error path)
      setPhase('partial-summary');
      return;
    }

    const aiCards = mapBatchToFlashcards(result);

    if (aiCards.length === 0) {
      generation.setNoCardsError();
      setPhase('partial-summary');
      return;
    }

    rounds.beginNextRound(aiCards);
    setPhase('reviewing');

    if (import.meta.env.DEV) {
      const roundNumber = rounds.currentRoundRef.current?.roundNumber ?? '?';
      console.log(`[AdaptiveSession] AI round ${roundNumber}: ${aiCards.length} cards (${result.stats.uniqueKeywords} unique keywords, ${result.stats.failed} failed)`);
    }
  }, [phase, institutionId, generation, rounds]);

  // ══ PUBLIC: abortGeneration ══

  const abortGeneration = useCallback(() => {
    if (phase !== 'generating') return;
    generation.abortGeneration();
    setPhase('partial-summary');
  }, [phase, generation]);

  // ══ PUBLIC: finishSession ══

  const finishSession = useCallback(async () => {
    if (isFinishingSessionRef.current) return;
    if (phase !== 'partial-summary' && phase !== 'reviewing') return;
    isFinishingSessionRef.current = true;

    if (phase === 'reviewing' && rounds.currentRoundRef.current) {
      rounds.finalizeCurrentRoundForSessionEnd();
      mastery.recomputeMastery();
    } else {
      // From 'partial-summary': the round was already pushed by
      // finishCurrentRound; just refresh snapshots for the completed screen.
      rounds.refreshSnapshots();
    }

    setPhase('completed');

    const sessionId = sessionIdRef.current;
    const allStats = rounds.allStatsRef.current;

    // 1. Submit ALL reviews in ONE batch
    if (sessionId) {
      try {
        const batchResult = await submitBatch(sessionId);
        // FASE 5: Patch optimisticRef with real FSRS values from backend
        mastery.applyBackendComputedResults(batchResult?.computedResults);
        if (import.meta.env.DEV) console.log(`[AdaptiveSession] Batch submitted for session ${sessionId}`);
      } catch (err) {
        if (import.meta.env.DEV) console.error('[AdaptiveSession] Batch submission failed:', err);
      }
    }

    // 2. Close session on backend
    if (sessionId && !sessionId.startsWith('local-')) {
      const correctReviews = countCorrect(allStats);
      try {
        await sessionApi.closeStudySession(sessionId, {
          completed_at: new Date().toISOString(),
          total_reviews: allStats.length,
          correct_reviews: correctReviews,
        });
        if (import.meta.env.DEV) console.log(`[AdaptiveSession] Session closed: ${sessionId}`);
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[AdaptiveSession] Session close failed:', err);
      }
    }

    // 3. Grace period for Supabase eventual consistency
    await new Promise(r => setTimeout(r, POST_PERSIST_GRACE_MS));

    // 4. GAP 1+2+3 FIX: Post daily-activities + student-stats (READ-THEN-INCREMENT)
    const durationSeconds = Math.round((Date.now() - rounds.sessionStartTimeRef.current) / 1000);
    const correctForAnalytics = countCorrect(allStats);
    await postSessionAnalytics({
      totalReviews: allStats.length,
      correctReviews: correctForAnalytics,
      durationSeconds,
    });
  }, [phase, submitBatch, rounds, mastery]);

  // ── Derived returns ──────────────────────────────────────

  const roundCount = useMemo(
    () => rounds.completedRounds.length + (phase === 'reviewing' ? 1 : 0),
    [rounds.completedRounds.length, phase],
  );

  // ══ RETURN ══

  return {
    phase,
    startSession,
    generateMore,
    abortGeneration,
    finishSession,
    currentCard,
    currentIndex: rounds.currentIndex,
    totalCards: rounds.roundCards.length,
    isRevealed: rounds.isRevealed,
    setIsRevealed: rounds.setIsRevealed,
    handleRate,
    currentRound: rounds.currentRoundRef.current,
    currentRoundSource: rounds.currentRoundRef.current?.source ?? null,
    completedRounds: rounds.completedRounds,
    roundCount,
    allStats: rounds.allStatsSnapshot,
    allReviewCount: rounds.snapshotReviewCount,
    allCorrectCount: rounds.snapshotCorrectCount,
    keywordMastery: mastery.currentMastery,
    topicSummary: mastery.topicSummary,
    masteryLoading: mastery.masteryLoading,
    generationProgress: generation.generationProgress,
    lastGenerationResult: generation.lastGenerationResult,
    generationError: generation.generationError,
    optimisticUpdates: mastery.optimisticRef,
    masteryDeltas: mastery.masteryDeltasRef,
    sessionCards: rounds.roundCards,
    sessionStats: rounds.allStatsSnapshot,
  };
}
