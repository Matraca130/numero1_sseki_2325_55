// ============================================================
// useRoundLifecycle — extracted from useAdaptiveSession
//
// Manages the per-round card navigation state for an adaptive
// flashcard session:
//   - roundCards, currentIndex, isRevealed
//   - completedRounds history
//   - running stats (allStats, currentRoundStats)
//   - refs used for timing/guards
//   - snapshots published to the UI after each round completes
//
// The hook is DUMB about mastery, batching, or AI generation — it
// only knows rounds + card navigation + rating-count stats. The
// parent hook wires it to the other sub-hooks.
// ============================================================

import { useCallback, useRef, useState } from 'react';
import type { Flashcard } from '@/app/types/content';
import { countCorrect } from '@/app/lib/session-stats';

export interface RoundInfo {
  roundNumber: number;
  source: 'professor' | 'ai';
  cardCount: number;
  ratings: number[];
}

export const CARD_ADVANCE_DELAY_MS = 200;

export function useRoundLifecycle() {
  const [roundCards, setRoundCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [completedRounds, setCompletedRounds] = useState<RoundInfo[]>([]);

  // Snapshots published to the UI after a round / session finishes.
  const [allStatsSnapshot, setAllStatsSnapshot] = useState<number[]>([]);
  const [snapshotReviewCount, setSnapshotReviewCount] = useState(0);
  const [snapshotCorrectCount, setSnapshotCorrectCount] = useState(0);

  const currentRoundRef = useRef<RoundInfo | null>(null);
  const allStatsRef = useRef<number[]>([]);
  const currentRoundStatsRef = useRef<number[]>([]);
  const cardStartTimeRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const isFinishingRoundRef = useRef(false);

  const resetRounds = useCallback(() => {
    setRoundCards([]);
    setCurrentIndex(0);
    setIsRevealed(false);
    setCompletedRounds([]);
    setAllStatsSnapshot([]);
    setSnapshotReviewCount(0);
    setSnapshotCorrectCount(0);
    allStatsRef.current = [];
    currentRoundStatsRef.current = [];
    currentRoundRef.current = null;
    isFinishingRoundRef.current = false;
  }, []);

  const beginFirstRound = useCallback((cards: Flashcard[]) => {
    setRoundCards(cards);
    setCurrentIndex(0);
    setIsRevealed(false);
    currentRoundRef.current = {
      roundNumber: 1,
      source: 'professor',
      cardCount: cards.length,
      ratings: [],
    };
    currentRoundStatsRef.current = [];
    isFinishingRoundRef.current = false;
    const now = Date.now();
    cardStartTimeRef.current = now;
    sessionStartTimeRef.current = now;
  }, []);

  const beginNextRound = useCallback((cards: Flashcard[]) => {
    const nextRoundNumber = (currentRoundRef.current?.roundNumber ?? 0) + 1;
    currentRoundRef.current = {
      roundNumber: nextRoundNumber,
      source: 'ai',
      cardCount: cards.length,
      ratings: [],
    };
    setRoundCards(cards);
    setCurrentIndex(0);
    setIsRevealed(false);
    currentRoundStatsRef.current = [];
    isFinishingRoundRef.current = false;
    cardStartTimeRef.current = Date.now();
  }, []);

  const recordRating = useCallback((rating: number) => {
    allStatsRef.current.push(rating);
    currentRoundStatsRef.current.push(rating);
  }, []);

  const advanceCard = useCallback(() => {
    setIsRevealed(false);
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      cardStartTimeRef.current = Date.now();
    }, CARD_ADVANCE_DELAY_MS);
  }, []);

  /**
   * Publish the current round as completed and refresh the UI snapshots.
   */
  const finalizeCurrentRound = useCallback(() => {
    const round = currentRoundRef.current;
    if (round) {
      round.ratings = [...currentRoundStatsRef.current];
      setCompletedRounds((prev) => [...prev, { ...round }]);
    }
    setAllStatsSnapshot([...allStatsRef.current]);
    setSnapshotReviewCount(allStatsRef.current.length);
    setSnapshotCorrectCount(countCorrect(allStatsRef.current));
    currentRoundStatsRef.current = [];
    isFinishingRoundRef.current = false;
  }, []);

  /**
   * Same as finalize but WITHOUT clearing currentRoundStatsRef — used
   * when the user chooses to end the session mid-round.
   */
  const finalizeCurrentRoundForSessionEnd = useCallback(() => {
    const round = currentRoundRef.current;
    if (round) {
      round.ratings = [...currentRoundStatsRef.current];
      setCompletedRounds((prev) => [...prev, { ...round }]);
    }
    setAllStatsSnapshot([...allStatsRef.current]);
    setSnapshotReviewCount(allStatsRef.current.length);
    setSnapshotCorrectCount(countCorrect(allStatsRef.current));
  }, []);

  /**
   * Refresh the public snapshots from the current ref state without
   * mutating rounds or stats. Used when the session ends from
   * 'partial-summary' and the round has already been pushed.
   */
  const refreshSnapshots = useCallback(() => {
    setAllStatsSnapshot([...allStatsRef.current]);
    setSnapshotReviewCount(allStatsRef.current.length);
    setSnapshotCorrectCount(countCorrect(allStatsRef.current));
  }, []);

  return {
    // State
    roundCards,
    currentIndex,
    isRevealed,
    setIsRevealed,
    completedRounds,
    allStatsSnapshot,
    snapshotReviewCount,
    snapshotCorrectCount,
    // Refs
    currentRoundRef,
    allStatsRef,
    currentRoundStatsRef,
    cardStartTimeRef,
    sessionStartTimeRef,
    isFinishingRoundRef,
    // Actions
    resetRounds,
    beginFirstRound,
    beginNextRound,
    recordRating,
    advanceCard,
    finalizeCurrentRound,
    finalizeCurrentRoundForSessionEnd,
    refreshSnapshots,
  };
}
