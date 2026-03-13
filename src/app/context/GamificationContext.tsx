// ============================================================
// Axon — Gamification Context (STUB)
//
// Minimal stub to unblock quiz build after PR #63 merge.
// Exports useGamification() with all properties consumed by:
//   - QuizResults.tsx (streak, loading)
//   - QuizTaker.tsx (refresh, triggerBadgeCheck, levelUpEvent, newBadges)
//   - useQuizGamificationFeedback.ts (refresh, triggerBadgeCheck, xpDelta,
//     newBadges, levelUpEvent, dismissLevelUp, dismissNewBadges)
//
// TODO: Replace with full GamificationProvider (Sprint G5).
// ============================================================

import React, { createContext, useContext, useCallback, useState } from 'react';
import type { StreakStatus, BadgeWithEarnedStatus } from '@/app/types/gamification';

// ── LevelUpEvent (matches useQuizGamificationFeedback expectation) ──

export interface LevelUpEvent {
  newLevel: number;
  previousLevel: number;
}

// ── Context shape ───────────────────────────────────────

export interface GamificationContextValue {
  // Profile
  loading: boolean;
  totalXp: number;
  level: number;
  xpDelta: number;

  // Streak
  streak: StreakStatus | null;

  // Badges
  newBadges: BadgeWithEarnedStatus[];

  // Level-up
  levelUpEvent: LevelUpEvent | null;

  // Actions
  refresh: () => Promise<void>;
  triggerBadgeCheck: () => Promise<void>;
  dismissLevelUp: () => void;
  dismissNewBadges: () => void;
}

const defaultValue: GamificationContextValue = {
  loading: false,
  totalXp: 0,
  level: 1,
  xpDelta: 0,
  streak: null,
  newBadges: [],
  levelUpEvent: null,
  refresh: async () => {},
  triggerBadgeCheck: async () => {},
  dismissLevelUp: () => {},
  dismissNewBadges: () => {},
};

const GamificationContext = createContext<GamificationContextValue>(defaultValue);

// ── Hook ─────────────────────────────────────────────────

export function useGamification(): GamificationContextValue {
  return useContext(GamificationContext);
}

// ── Provider (stub) ────────────────────────────────────

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [loading] = useState(false);

  const refresh = useCallback(async () => {
    // TODO: Fetch gamification profile from backend
  }, []);

  const triggerBadgeCheck = useCallback(async () => {
    // TODO: Check for newly earned badges
  }, []);

  const dismissLevelUp = useCallback(() => {
    // TODO: Clear levelUpEvent
  }, []);

  const dismissNewBadges = useCallback(() => {
    // TODO: Clear newBadges array
  }, []);

  const value: GamificationContextValue = {
    loading,
    totalXp: 0,
    level: 1,
    xpDelta: 0,
    streak: null,
    newBadges: [],
    levelUpEvent: null,
    refresh,
    triggerBadgeCheck,
    dismissLevelUp,
    dismissNewBadges,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

export default GamificationContext;
