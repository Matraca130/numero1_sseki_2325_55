// ============================================================
// useOptimisticMastery — extracted from useAdaptiveSession
//
// Owns the keyword/card mastery side of an adaptive session:
//   - fetches initial keyword mastery for the topic
//   - keeps a local "current" mastery updated via BKT deltas
//   - tracks optimistic card-level updates (fsrs state, due_at,
//     p_know, stability, difficulty)
//   - tracks per-card mastery deltas for the summary screen
//   - applies backend-computed FSRS/BKT values once the batch
//     submit returns
//
// This hook owns refs that the parent hook exposes as part of
// its public return shape (`optimisticUpdates`, `masteryDeltas`).
// Those refs are preserved identically.
// ============================================================

import { useState, useCallback, useMemo, useRef } from 'react';
import type { Flashcard } from '@/app/types/content';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';
import {
  fetchKeywordMasteryByTopic,
  computeLocalKeywordMastery,
  computeTopicMasterySummary,
  type KeywordMasteryMap,
  type TopicMasterySummary,
} from '@/app/services/keywordMasteryApi';
import { estimateOptimisticDueAt } from './useFlashcardEngine';
import type { OptimisticCardUpdate, CardMasteryDelta } from './useFlashcardEngine';

export interface RecordOptimisticArgs {
  card: Flashcard;
  sq: StudyQueueItem | undefined;
  estimatedPKnow: number;
  previousPKnow: number;
  rating: number;
}

export function useOptimisticMastery() {
  const [initialMastery, setInitialMastery] = useState<KeywordMasteryMap>(new Map());
  const [currentMastery, setCurrentMastery] = useState<KeywordMasteryMap>(new Map());
  const [masteryLoading, setMasteryLoading] = useState(false);

  const optimisticRef = useRef<Map<string, OptimisticCardUpdate>>(new Map());
  const masteryDeltasRef = useRef<CardMasteryDelta[]>([]);
  const bktUpdatesRef = useRef<Map<string, number>>(new Map());

  const topicSummary = useMemo<TopicMasterySummary | null>(() => {
    if (currentMastery.size === 0) return null;
    return computeTopicMasterySummary(currentMastery);
  }, [currentMastery]);

  const recomputeMastery = useCallback(() => {
    if (initialMastery.size === 0) return;
    const updated = computeLocalKeywordMastery(initialMastery, bktUpdatesRef.current);
    setCurrentMastery(updated);
  }, [initialMastery]);

  const loadMasteryForTopic = useCallback((topicId: string | null) => {
    if (!topicId) return;
    setMasteryLoading(true);
    fetchKeywordMasteryByTopic(topicId)
      .then((mastery) => {
        setInitialMastery(mastery);
        setCurrentMastery(mastery);
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('[OptimisticMastery] Keyword mastery fetch failed:', err);
      })
      .finally(() => setMasteryLoading(false));
  }, []);

  const resetMasteryTracking = useCallback(() => {
    optimisticRef.current = new Map();
    masteryDeltasRef.current = [];
    bktUpdatesRef.current = new Map();
  }, []);

  const recordOptimistic = useCallback((args: RecordOptimisticArgs) => {
    const { card, sq, estimatedPKnow, previousPKnow, rating } = args;

    optimisticRef.current.set(card.id, {
      flashcard_id: card.id,
      p_know: estimatedPKnow,
      fsrs_state: sq?.fsrs_state === 'new' ? 'learning' : 'review',
      stability: sq?.stability ?? 0,
      difficulty: sq?.difficulty ?? 0,
      due_at: estimateOptimisticDueAt(rating),
    });

    masteryDeltasRef.current.push({
      cardId: card.id,
      before: previousPKnow,
      after: estimatedPKnow,
      grade: rating,
    });

    if (card.subtopic_id) {
      bktUpdatesRef.current.set(card.subtopic_id, estimatedPKnow);
    }
  }, []);

  /**
   * Patch optimisticRef with real FSRS/BKT values returned by the
   * backend batch-review endpoint (FASE 5).
   */
  const applyBackendComputedResults = useCallback((
    computedResults: Map<string, {
      fsrs?: { state: OptimisticCardUpdate['fsrs_state']; stability: number; difficulty: number; due_at: string };
      bkt?: { p_know: number };
    }> | undefined | null,
  ) => {
    if (!computedResults) return;
    for (const [itemId, computed] of computedResults) {
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
  }, []);

  return {
    // State
    initialMastery,
    currentMastery,
    masteryLoading,
    topicSummary,
    // Refs (exposed so parent can re-export them)
    optimisticRef,
    masteryDeltasRef,
    bktUpdatesRef,
    // Actions
    loadMasteryForTopic,
    resetMasteryTracking,
    recordOptimistic,
    recomputeMastery,
    applyBackendComputedResults,
  };
}
