// ============================================================
// Axon v4.4 — Quiz Gamification Feedback Hook (Q-UX1)
//
// Orchestrates post-quiz gamification feedback:
//   1. On mount: waits 800ms for backend afterWrite hooks
//   2. refresh() → useGamificationProfile detects xpDelta & levelUp
//   3. triggerBadgeCheck() → detects newly earned badges
//   4. Syncs all events from context into local state
//
// Architecture:
//   - Consumes useGamification() context (single instance)
//   - Relies on context's built-in xpDelta / levelUpEvent detection
//     (which compares prevXpRef vs new profile after fetch)
//   - Fire-and-forget with graceful fallback
//   - StrictMode-safe (useRef guard against double-fire)
//   - Auto-dismiss timers for celebrations
//
// NEVER calls POST /award-xp — XP is server-side via afterWrite.
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGamification } from '@/app/context/GamificationContext';
import type { BadgeWithEarnedStatus } from '@/app/types/gamification';
import { logger } from '@/app/lib/logger';

// ── LevelUpEvent type (inline — matches GamificationContext shape) ──
// Previously imported from useGamificationProfile.ts which is created
// by the gamification session. Defined inline here to avoid broken import.

export interface LevelUpEvent {
  newLevel: number;
  previousLevel: number;
}

// ── Return type ──────────────────────────────────────────

export interface QuizGamificationFeedback {
  /** Real XP delta detected from server (0 if unavailable) */
  confirmedXpDelta: number;
  /** Whether the server confirmation has completed */
  isConfirmed: boolean;
  /** Whether we're still loading the server data */
  isLoading: boolean;
  /** Newly earned badges from this quiz session */
  earnedBadges: BadgeWithEarnedStatus[];
  /** Level-up event (null if no level change) */
  levelUp: LevelUpEvent | null;
  /** Whether to show the level-up celebration */
  showLevelCelebration: boolean;
  /** Dismiss level-up celebration */
  dismissLevelUp: () => void;
  /** Dismiss earned badges */
  dismissBadges: () => void;
}

// ── Hook ─────────────────────────────────────────────────

export function useQuizGamificationFeedback(): QuizGamificationFeedback {
  const gamification = useGamification();

  const [confirmedXpDelta, setConfirmedXpDelta] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [earnedBadges, setEarnedBadges] = useState<BadgeWithEarnedStatus[]>([]);
  const [levelUp, setLevelUp] = useState<LevelUpEvent | null>(null);
  const [showLevelCelebration, setShowLevelCelebration] = useState(false);

  // StrictMode guard — only fire once
  const firedRef = useRef(false);

  // ── Orchestrate post-quiz feedback ─────────────────────
  // Strategy: Call refresh() + triggerBadgeCheck() which update
  // the GamificationContext state. Then we SYNC from context
  // via separate useEffects below (React state is async).

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    let cancelled = false;
    let initialDelayId: ReturnType<typeof setTimeout> | undefined;
    let finalizeDelayId: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        // Wait for backend afterWrite hooks to complete
        // (quiz_attempt → award XP → update profile)
        await new Promise<void>((r) => { initialDelayId = setTimeout(r, 800); });
        if (cancelled) return;

        // Step 1: Refresh profile — this triggers xpDelta and
        // levelUpEvent detection inside useGamificationProfile
        await gamification.refresh();
        if (cancelled) return;

        // Step 2: Check for new badges earned from this quiz
        await gamification.triggerBadgeCheck();
      } catch (err) {
        if (!cancelled) {
          logger.error('[QuizGamificationFeedback] Post-quiz feedback error (non-blocking):', err);
        }
      } finally {
        // Mark as done — sync effects below will pick up the data.
        // Small delay to ensure React has batched the state updates.
        if (!cancelled) {
          finalizeDelayId = setTimeout(() => {
            if (cancelled) return;
            setIsLoading(false);
            setIsConfirmed(true);
          }, 100);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (initialDelayId) clearTimeout(initialDelayId);
      if (finalizeDelayId) clearTimeout(finalizeDelayId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — fire once on mount

  // ── Sync xpDelta from context ──────────────────────────
  // useGamificationProfile internally compares prevXpRef vs
  // new total_xp and sets xpDelta. We pick it up here.

  useEffect(() => {
    if (gamification.xpDelta > 0) {
      setConfirmedXpDelta((prev) => Math.max(prev, gamification.xpDelta));
    }
  }, [gamification.xpDelta]);

  // ── Sync new badges from context ───────────────────────

  useEffect(() => {
    if (gamification.newBadges.length > 0) {
      setEarnedBadges(gamification.newBadges);
    }
  }, [gamification.newBadges]);

  // ── Sync level-up from context ─────────────────────────

  useEffect(() => {
    if (gamification.levelUpEvent && !levelUp) {
      setLevelUp(gamification.levelUpEvent);
      setShowLevelCelebration(true);
    }
  }, [gamification.levelUpEvent, levelUp]);

  // ── Dismiss handlers ───────────────────────────────────

  const dismissLevelUp = useCallback(() => {
    setShowLevelCelebration(false);
    gamification.dismissLevelUp();
  }, [gamification]);

  const dismissBadges = useCallback(() => {
    setEarnedBadges([]);
    gamification.dismissNewBadges();
  }, [gamification]);

  return {
    confirmedXpDelta,
    isConfirmed,
    isLoading,
    earnedBadges,
    levelUp,
    showLevelCelebration,
    dismissLevelUp,
    dismissBadges,
  };
}
