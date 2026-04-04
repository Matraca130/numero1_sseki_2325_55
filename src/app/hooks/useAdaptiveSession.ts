// ============================================================
// useAdaptiveSession — Orchestrates multi-round adaptive flashcard sessions
// Fase 3 del plan "Sesion Adaptativa de Flashcards con IA" (v4.5)
//
// PURPOSE:
//   Manages the lifecycle of an adaptive flashcard session where
//   the student first reviews professor-created cards, then can
//   generate AI cards targeting their weakest keywords, review
//   those, generate more, and so on until satisfied.
//
// SESSION LIFECYCLE:
//   idle → reviewing(professor) → partial-summary
//     → generating → reviewing(ai) → partial-summary
//     → generating → reviewing(ai) → partial-summary  (repeatable)
//     → completed (final submit + close)
//
// WHY NOT wrap useFlashcardEngine:
//   useFlashcardEngine creates ONE session and submits ONE batch
//   when the last card is rated. It also closes the session
//   automatically. In the adaptive flow, we need:
//     - ONE backend session spanning ALL rounds
//     - ONE batch accumulating ALL reviews across rounds
//     - Multiple "rounds" of card review
//   Modifying useFlashcardEngine's lifecycle would violate rule S2
//   (don't change its signature). Instead, we compose DIRECTLY
//   over useReviewBatch (the shared batch hook) and implement
//   our own card navigation (~50 lines). This gives us full
//   control over when the batch is submitted and when the
//   session is closed.
//
// COMPOSITION:
//   useReviewBatch   → batch queue + BKT heuristic + submit
//   Fase 1 services  → keyword mastery aggregation + local updates
//   Fase 2 services  → AI adaptive batch generation
//   Card navigation  → implemented inline (simple state machine)
//
// SAFETY:
//   - New file, zero risk of regression
//   - Does NOT modify any existing hook or component
//   - useFlashcardEngine continues working for non-adaptive flows
//   - Rule S1: does NOT touch useReviewBatch/fsrs-engine/bkt-engine
//   - Rule S2: does NOT change useFlashcardEngine signature
//   - Rule S4: uses the EXISTING useReviewBatch (no duplicate)
//   - Rule S6: BKT only persisted at session end via batch
//
// DEPENDENCIES:
//   - useReviewBatch (hooks/useReviewBatch.ts)
//   - keywordMasteryApi (services/keywordMasteryApi.ts) [Fase 1]
//   - adaptiveGenerationApi (services/adaptiveGenerationApi.ts) [Fase 2]
//   - studySessionApi (services/studySessionApi.ts)
//   - Flashcard type (types/content.ts)
//   - StudyQueueItem type (lib/studyQueueApi.ts)
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
import { estimateOptimisticDueAt } from './useFlashcardEngine';
import {
  fetchKeywordMasteryByTopic,
  computeLocalKeywordMastery,
  computeTopicMasterySummary,
  type KeywordMasteryMap,
  type TopicMasterySummary,
} from '@/app/services/keywordMasteryApi';
import {
  generateAdaptiveBatch,
  mapBatchToFlashcards,
  type AdaptiveGenerationResult,
} from '@/app/services/adaptiveGenerationApi';
import { countCorrect } from '@/app/lib/session-stats';
import type { OptimisticCardUpdate, CardMasteryDelta } from './useFlashcardEngine';

// ── Types ─────────────────────────────────────────────────

export type AdaptivePhase =
  | 'idle'
  | 'reviewing'
  | 'partial-summary'
  | 'generating'
  | 'completed';

export interface RoundInfo {
  roundNumber: number;
  source: 'professor' | 'ai';
  cardCount: number;
  ratings: number[];
}

export interface GenerationProgressInfo {
  completed: number;
  total: number;
  generated: number;
  failed: number;
}

export interface UseAdaptiveSessionOpts {
  studentId: string | null;
  courseId: string;
  topicId: string | null;
  institutionId?: string;
  masteryMap?: Map<string, StudyQueueItem>;
}

// ── Constants ─────────────────────────────────────────────

const POST_PERSIST_GRACE_MS = 400;
const CARD_ADVANCE_DELAY_MS = 200;

// ════════════════════════════════════════════════════════
// HOOK
// ════════════════════════════════════════════════════════

export function useAdaptiveSession(opts: UseAdaptiveSessionOpts) {
  const { studentId, courseId, topicId, institutionId, masteryMap } = opts;

  const [phase, setPhase] = useState<AdaptivePhase>('idle');
  const [roundCards, setRoundCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [completedRounds, setCompletedRounds] = useState<RoundInfo[]>([]);
  const currentRoundRef = useRef<RoundInfo | null>(null);
  const allStatsRef = useRef<number[]>([]);
  const currentRoundStatsRef = useRef<number[]>([]);
  const cardStartTimeRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string | null>(null);
  const isFinishingRoundRef = useRef(false);
  const isFinishingSessionRef = useRef(false);
  const isStartingRef = useRef(false);
  const isGeneratingRef = useRef(false);
  const optimisticRef = useRef<Map<string, OptimisticCardUpdate>>(new Map());
  const masteryDeltasRef = useRef<CardMasteryDelta[]>([]);
  const bktUpdatesRef = useRef<Map<string, number>>(new Map());
  const summaryIdsRef = useRef<string[]>([]);
  const generationAbortRef = useRef<AbortController | null>(null);

  const [initialMastery, setInitialMastery] = useState<KeywordMasteryMap>(new Map());
  const [currentMastery, setCurrentMastery] = useState<KeywordMasteryMap>(new Map());
  const [masteryLoading, setMasteryLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgressInfo | null>(null);
  const [lastGenerationResult, setLastGenerationResult] = useState<AdaptiveGenerationResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [allStatsSnapshot, setAllStatsSnapshot] = useState<number[]>([]);
  const [snapshotReviewCount, setSnapshotReviewCount] = useState(0);
  const [snapshotCorrectCount, setSnapshotCorrectCount] = useState(0);

  const { queueReview, submitBatch, reset: batchReset } = useReviewBatch();

  const topicSummary = useMemo<TopicMasterySummary | null>(() => {
    if (currentMastery.size === 0) return null;
    return computeTopicMasterySummary(currentMastery);
  }, [currentMastery]);

  const currentCard = phase === 'reviewing' && roundCards.length > 0
    ? roundCards[currentIndex] ?? null
    : null;

  const recomputeMastery = useCallback(() => {
    if (initialMastery.size === 0) return;
    const updated = computeLocalKeywordMastery(initialMastery, bktUpdatesRef.current);
    setCurrentMastery(updated);
  }, [initialMastery]);

  const finishCurrentRound = useCallback(() => {
    const round = currentRoundRef.current;
    if (round) {
      round.ratings = [...currentRoundStatsRef.current];
      setCompletedRounds(prev => [...prev, { ...round }]);
    }
    recomputeMastery();
    setAllStatsSnapshot([...allStatsRef.current]);
    setSnapshotReviewCount(allStatsRef.current.length);
    setSnapshotCorrectCount(countCorrect(allStatsRef.current));
    currentRoundStatsRef.current = [];
    isFinishingRoundRef.current = false;
    setPhase('partial-summary');
  }, [recomputeMastery]);

  // ══ PUBLIC: startSession ══

  const startSession = useCallback(async (professorCards: Flashcard[]) => {
    if (professorCards.length === 0) return;
    if (!studentId) {
      if (import.meta.env.DEV) console.warn('[AdaptiveSession] startSession called without studentId');
      return;
    }
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    setRoundCards(professorCards);
    setCurrentIndex(0);
    setIsRevealed(false);
    setCompletedRounds([]);
    setAllStatsSnapshot([]);
    setSnapshotReviewCount(0);
    setSnapshotCorrectCount(0);
    setGenerationProgress(null);
    setLastGenerationResult(null);
    allStatsRef.current = [];
    currentRoundStatsRef.current = [];
    optimisticRef.current = new Map();
    masteryDeltasRef.current = [];
    bktUpdatesRef.current = new Map();
    isFinishingRoundRef.current = false;
    isFinishingSessionRef.current = false;
    batchReset();

    currentRoundRef.current = {
      roundNumber: 1, source: 'professor', cardCount: professorCards.length, ratings: [],
    };

    cardStartTimeRef.current = Date.now();
    sessionStartTimeRef.current = Date.now();

    try {
      const session = await sessionApi.createStudySession({ session_type: 'flashcard', course_id: courseId || undefined });
      sessionIdRef.current = session.id;
      if (import.meta.env.DEV) console.log(`[AdaptiveSession] Session created: ${session.id}`);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[AdaptiveSession] Session creation failed (continuing offline):', err);
      sessionIdRef.current = `local-${Date.now()}`;
    }

    if (topicId) {
      setMasteryLoading(true);
      fetchKeywordMasteryByTopic(topicId)
        .then((mastery) => { setInitialMastery(mastery); setCurrentMastery(mastery); })
        .catch((err) => { if (import.meta.env.DEV) console.warn('[AdaptiveSession] Keyword mastery fetch failed:', err); })
        .finally(() => setMasteryLoading(false));
    }

    const uniqueSummaryIds = [...new Set(professorCards.map(card => card.summary_id).filter((id): id is string => !!id))];
    summaryIdsRef.current = uniqueSummaryIds;

    setPhase('reviewing');
    isStartingRef.current = false;
  }, [courseId, topicId, batchReset, studentId]);

  // ══ PUBLIC: handleRate ══

  const handleRate = useCallback((rating: number) => {
    if (phase !== 'reviewing') return;
    if (isFinishingRoundRef.current) return;

    const card = roundCards[currentIndex];
    if (!card) return;

    const responseTimeMs = Date.now() - cardStartTimeRef.current;
    const sq = masteryMap?.get(card.id);

    const result: QueueReviewResult = queueReview({
      card, grade: rating, responseTimeMs, currentPKnow: sq?.p_know,
    });

    optimisticRef.current.set(card.id, {
      flashcard_id: card.id,
      p_know: result.estimatedPKnow,
      fsrs_state: sq?.fsrs_state === 'new' ? 'learning' : 'review',
      stability: sq?.stability ?? 0,
      difficulty: sq?.difficulty ?? 0,
      due_at: estimateOptimisticDueAt(rating),
    });

    masteryDeltasRef.current.push({
      cardId: card.id, before: result.previousPKnow, after: result.estimatedPKnow, grade: rating,
    });

    if (card.subtopic_id) {
      bktUpdatesRef.current.set(card.subtopic_id, result.estimatedPKnow);
    }

    allStatsRef.current.push(rating);
    currentRoundStatsRef.current.push(rating);

    const isLast = currentIndex >= roundCards.length - 1;

    if (isLast) {
      isFinishingRoundRef.current = true;
      finishCurrentRound();
    } else {
      setIsRevealed(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        cardStartTimeRef.current = Date.now();
      }, CARD_ADVANCE_DELAY_MS);
    }
  }, [phase, roundCards, currentIndex, masteryMap, queueReview, finishCurrentRound]);

  // ══ PUBLIC: generateMore ══

  const generateMore = useCallback(async (count: number) => {
    if (phase !== 'partial-summary') {
      if (import.meta.env.DEV) console.warn(`[AdaptiveSession] generateMore called in wrong phase: ${phase}`);
      return;
    }
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    setPhase('generating');
    setGenerationProgress({ completed: 0, total: count, generated: 0, failed: 0 });
    setGenerationError(null);

    generationAbortRef.current = new AbortController();
    const signal = generationAbortRef.current.signal;

    try {
      const result = await generateAdaptiveBatch({
        count, institutionId, related: true, signal,
        onProgress: (progress) => {
          setGenerationProgress({ completed: progress.completed, total: progress.total, generated: progress.generated, failed: progress.failed });
        },
        summaryIds: summaryIdsRef.current,
      });

      if (signal.aborted) return;

      setLastGenerationResult(result);
      const aiCards = mapBatchToFlashcards(result);

      if (aiCards.length === 0) {
        setGenerationError('No se pudieron generar flashcards válidas. Inténtalo de nuevo.');
        setPhase('partial-summary');
        return;
      }

      const nextRoundNumber = (currentRoundRef.current?.roundNumber ?? 0) + 1;
      currentRoundRef.current = { roundNumber: nextRoundNumber, source: 'ai', cardCount: aiCards.length, ratings: [] };

      setRoundCards(aiCards);
      setCurrentIndex(0);
      setIsRevealed(false);
      currentRoundStatsRef.current = [];
      isFinishingRoundRef.current = false;
      cardStartTimeRef.current = Date.now();

      setPhase('reviewing');

      if (import.meta.env.DEV) {
        console.log(`[AdaptiveSession] AI round ${nextRoundNumber}: ${aiCards.length} cards (${result.stats.uniqueKeywords} unique keywords, ${result.stats.failed} failed)`);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[AdaptiveSession] Generation failed:', err);
      setGenerationError('La generación de flashcards falló. Inténtalo de nuevo.');
      setPhase('partial-summary');
    } finally {
      isGeneratingRef.current = false;
      generationAbortRef.current = null;
    }
  }, [phase, institutionId]);

  // ══ PUBLIC: abortGeneration ══

  const abortGeneration = useCallback(() => {
    if (phase !== 'generating') return;
    const controller = generationAbortRef.current;
    if (controller) {
      controller.abort();
      if (import.meta.env.DEV) console.log('[AdaptiveSession] Generation aborted');
    }
    setPhase('partial-summary');
    setGenerationProgress(null);
    setGenerationError(null);
  }, [phase]);

  // ══ PUBLIC: finishSession ══

  const finishSession = useCallback(async () => {
    if (isFinishingSessionRef.current) return;
    if (phase !== 'partial-summary' && phase !== 'reviewing') return;
    isFinishingSessionRef.current = true;

    if (phase === 'reviewing' && currentRoundRef.current) {
      const round = currentRoundRef.current;
      round.ratings = [...currentRoundStatsRef.current];
      setCompletedRounds(prev => [...prev, { ...round }]);
      recomputeMastery();
    }

    setPhase('completed');
    setAllStatsSnapshot([...allStatsRef.current]);
    setSnapshotReviewCount(allStatsRef.current.length);
    setSnapshotCorrectCount(countCorrect(allStatsRef.current));

    const sessionId = sessionIdRef.current;
    const allStats = allStatsRef.current;

    // 1. Submit ALL reviews in ONE batch
    if (sessionId) {
      try {
        const batchResult = await submitBatch(sessionId);
        // FASE 5: Patch optimisticRef with real FSRS values from backend
        if (batchResult?.computedResults) {
          for (const [itemId, computed] of batchResult.computedResults) {
            const existing = optimisticRef.current.get(itemId);
            if (existing && computed.fsrs) {
              existing.fsrs_state = computed.fsrs.state;
              existing.stability = computed.fsrs.stability;
              existing.difficulty = computed.fsrs.difficulty;
              existing.due_at = computed.fsrs.due_at;
            }
            if (existing && computed.bkt) {
              existing.p_know = computed.bkt.p_know;
            }
          }
        }
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
    const durationSeconds = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
    const correctForAnalytics = countCorrect(allStats);
    await postSessionAnalytics({
      totalReviews: allStats.length,
      correctReviews: correctForAnalytics,
      durationSeconds,
    });
  }, [phase, submitBatch, recomputeMastery]);

  // ══ RETURN ══

  return {
    phase,
    startSession,
    generateMore,
    abortGeneration,
    finishSession,
    currentCard,
    currentIndex,
    totalCards: roundCards.length,
    isRevealed,
    setIsRevealed,
    handleRate,
    currentRound: currentRoundRef.current,
    currentRoundSource: currentRoundRef.current?.source ?? null,
    completedRounds,
    roundCount: completedRounds.length + (phase === 'reviewing' ? 1 : 0),
    allStats: allStatsSnapshot,
    allReviewCount: snapshotReviewCount,
    allCorrectCount: snapshotCorrectCount,
    keywordMastery: currentMastery,
    topicSummary,
    masteryLoading,
    generationProgress,
    lastGenerationResult,
    generationError,
    optimisticUpdates: optimisticRef,
    masteryDeltas: masteryDeltasRef,
    sessionCards: roundCards,
    sessionStats: allStatsSnapshot,
  };
}
