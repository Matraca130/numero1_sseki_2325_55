// ============================================================
// useFlashcardEngine — Session logic + backend persistence
// NOW CONNECTED TO REAL BACKEND:
//   - POST /study-sessions to start/close
//   - POST /reviews per card
//   - POST /fsrs-states to update scheduling
//
// FIX RT-001, RT-003 (2025-02-27):
//   - completed_at (not ended_at)
//   - removed duration_seconds (column doesn't exist)
//   - removed response_time_ms from submitReview (column doesn't exist)
// ============================================================

import { useState, useCallback, useRef } from 'react';
import type { Flashcard } from '@/app/types/content';
import * as sessionApi from '@/app/services/studySessionApi';

interface UseFlashcardEngineOpts {
  studentId: string | null;
  courseId: string;
  topicId?: string | null;
  onFinish: () => void;
}

export function useFlashcardEngine({ studentId, courseId, topicId, onFinish }: UseFlashcardEngineOpts) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState<number[]>([]);
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);

  // Track timing per card
  const cardStartTime = useRef<number>(Date.now());
  const sessionStartTime = useRef<number>(Date.now());
  // Backend session ID
  const sessionIdRef = useRef<string | null>(null);

  // ── Start Session ──

  const startSession = useCallback(async (cards: Flashcard[]) => {
    if (cards.length === 0) return;
    setSessionCards(cards);
    setCurrentIndex(0);
    setSessionStats([]);
    setIsRevealed(false);
    cardStartTime.current = Date.now();
    sessionStartTime.current = Date.now();

    // Create backend session (fire-and-forget, don't block UI)
    try {
      const session = await sessionApi.createStudySession({
        session_type: 'flashcard',
        course_id: courseId || undefined,
      });
      sessionIdRef.current = session.id;
      console.log(`[FlashcardEngine] Session created: ${session.id}`);
    } catch (err) {
      console.warn('[FlashcardEngine] Failed to create session (continuing offline):', err);
      sessionIdRef.current = `local-${Date.now()}`;
    }
  }, [courseId]);

  // ── Persist review + FSRS state to backend ──

  const persistCardResult = useCallback(async (card: Flashcard, grade: number, responseTimeMs: number) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    // 1. Submit review (no response_time_ms — column doesn't exist in reviews table)
    try {
      await sessionApi.submitReview({
        session_id: sessionId,
        item_id: card.id,
        instrument_type: 'flashcard',
        grade,
      });
    } catch (err) {
      console.warn('[FlashcardEngine] Failed to submit review:', err);
    }

    // 2. Compute and upsert FSRS state
    try {
      // Build a minimal current state from card metadata
      const currentState: sessionApi.FsrsState | null = card.fsrs_state
        ? {
            id: '',
            flashcard_id: card.id,
            stability: 1,
            difficulty: 5,
            due_at: card.due_at || new Date().toISOString(),
            reps: 0,
            lapses: 0,
            state: card.fsrs_state,
          }
        : null;

      const update = sessionApi.computeFsrsUpdate(currentState, grade);

      await sessionApi.upsertFsrsState({
        flashcard_id: card.id,
        stability: update.stability,
        difficulty: update.difficulty,
        due_at: update.due_at,
        last_review_at: new Date().toISOString(),
        reps: update.reps,
        lapses: update.lapses,
        state: update.state,
      });
    } catch (err) {
      console.warn('[FlashcardEngine] Failed to upsert FSRS state:', err);
    }
  }, []);

  // ── Close session on backend ──

  const closeSession = useCallback(async (stats: number[]) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || sessionId.startsWith('local-')) return;

    const correctReviews = stats.filter(s => s >= 3).length;

    try {
      await sessionApi.closeStudySession(sessionId, {
        completed_at: new Date().toISOString(),
        total_reviews: stats.length,
        correct_reviews: correctReviews,
      });
      console.log(`[FlashcardEngine] Session closed: ${sessionId}`);
    } catch (err) {
      console.warn('[FlashcardEngine] Failed to close session:', err);
    }
  }, []);

  // ── Handle Rating ──

  const handleRate = useCallback((rating: number) => {
    const responseTimeMs = Date.now() - cardStartTime.current;
    const card = sessionCards[currentIndex];

    // Persist to backend (fire-and-forget)
    if (card) {
      persistCardResult(card, rating, responseTimeMs);
    }

    setSessionStats(prev => [...prev, rating]);
    setIsRevealed(false);

    const isLast = currentIndex >= sessionCards.length - 1;

    if (isLast) {
      // Session complete
      const allStats = [...sessionStats, rating];
      closeSession(allStats);
      setTimeout(() => onFinish(), 200);
    } else {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        cardStartTime.current = Date.now();
      }, 200);
    }
  }, [sessionCards, currentIndex, sessionStats, persistCardResult, closeSession, onFinish]);

  // ── Restart / Exit ──

  const restartSession = useCallback(() => {
    setCurrentIndex(0);
    setSessionStats([]);
    setIsRevealed(false);
    cardStartTime.current = Date.now();
    sessionStartTime.current = Date.now();

    // Create a new backend session
    sessionApi.createStudySession({
      session_type: 'flashcard',
      course_id: courseId || undefined,
    }).then(session => {
      sessionIdRef.current = session.id;
    }).catch(() => {
      sessionIdRef.current = `local-${Date.now()}`;
    });
  }, [courseId]);

  return {
    isRevealed,
    setIsRevealed,
    currentIndex,
    sessionStats,
    sessionCards,
    startSession,
    handleRate,
    restartSession,
  };
}
