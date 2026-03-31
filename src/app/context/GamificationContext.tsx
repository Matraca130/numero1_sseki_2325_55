// ============================================================
// Axon — Gamification Context (BUG-021 fix: wired to real API)
//
// Provides gamification state to all student components:
//   - QuizResults.tsx (streak, loading)
//   - QuizTaker.tsx (refresh, triggerBadgeCheck, levelUpEvent, newBadges)
//   - useQuizGamificationFeedback.ts (refresh, triggerBadgeCheck, xpDelta,
//     newBadges, levelUpEvent, dismissLevelUp, dismissNewBadges)
//
// Fetches profile + streak from gamificationApi on mount and when
// institutionId changes. refresh() re-fetches and computes xpDelta
// + levelUpEvent by comparing against previous values via refs.
// ============================================================

import React, { createContext, useContext, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { getProfile, getStreakStatus, checkBadges } from '@/app/services/gamificationApi';
import { getLevelInfo } from '@/app/utils/gamification-helpers';
import type { StreakStatus, BadgeWithEarnedStatus } from '@/app/types/gamification';
import type { BadgeWithStatus } from '@/app/services/gamificationApi';

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

// ── Helper: convert API BadgeWithStatus to BadgeWithEarnedStatus ──

function toBadgeWithEarnedStatus(b: BadgeWithStatus): BadgeWithEarnedStatus {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description,
    icon: b.icon_url ?? '',
    category: b.category as BadgeWithEarnedStatus['category'],
    rarity: b.rarity as BadgeWithEarnedStatus['rarity'],
    xp_reward: b.xp_reward,
    earned_at: b.earned_at!,
  };
}

// ── Provider (real API) ─────────────────────────────────

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id;

  const [loading, setLoading] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [xpDelta, setXpDelta] = useState(0);
  const [streak, setStreak] = useState<StreakStatus | null>(null);
  const [newBadges, setNewBadges] = useState<BadgeWithEarnedStatus[]>([]);
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);

  // Refs for computing deltas across refresh() calls
  const prevXpRef = useRef<number>(0);
  const prevLevelRef = useRef<number>(1);
  const initialFetchDone = useRef(false);

  // ── Fetch profile + streak ────────────────────────────

  const fetchData = useCallback(async (instId: string, isInitial: boolean) => {
    setLoading(true);
    try {
      const [profile, streakData] = await Promise.all([
        getProfile(instId),
        getStreakStatus(instId),
      ]);

      if (profile) {
        const newTotalXp = profile.xp.total;
        const levelInfo = getLevelInfo(newTotalXp);
        const newLevel = levelInfo.level;

        if (!isInitial) {
          // Compute XP delta from previous known value
          const delta = newTotalXp - prevXpRef.current;
          if (delta > 0) {
            setXpDelta(delta);
          }

          // Detect level-up
          if (newLevel > prevLevelRef.current) {
            setLevelUpEvent({
              newLevel,
              previousLevel: prevLevelRef.current,
            });
          }
        }

        // Update refs for next comparison
        prevXpRef.current = newTotalXp;
        prevLevelRef.current = newLevel;

        setTotalXp(newTotalXp);
        setLevel(newLevel);
      }

      if (streakData) {
        setStreak(streakData);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[GamificationContext] fetchData error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial fetch on mount / institutionId change ─────

  useEffect(() => {
    if (!institutionId) return;

    // Reset state for new institution
    initialFetchDone.current = false;
    setXpDelta(0);
    setLevelUpEvent(null);
    setNewBadges([]);

    fetchData(institutionId, true).then(() => {
      initialFetchDone.current = true;
    });
  }, [institutionId, fetchData]);

  // ── Actions ───────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (!institutionId) return;
    await fetchData(institutionId, !initialFetchDone.current);
  }, [institutionId, fetchData]);

  const triggerBadgeCheck = useCallback(async () => {
    if (!institutionId) return;
    try {
      const result = await checkBadges(institutionId);
      if (result && result.new_badges.length > 0) {
        const earned = result.new_badges
          .filter((b) => b.earned && b.earned_at)
          .map(toBadgeWithEarnedStatus);
        if (earned.length > 0) {
          setNewBadges(earned);
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[GamificationContext] triggerBadgeCheck error:', err);
      }
    }
  }, [institutionId]);

  const dismissLevelUp = useCallback(() => {
    setLevelUpEvent(null);
  }, []);

  const dismissNewBadges = useCallback(() => {
    setNewBadges([]);
  }, []);

  // ── Memoized value ────────────────────────────────────

  const value = useMemo<GamificationContextValue>(() => ({
    loading,
    totalXp,
    level,
    xpDelta,
    streak,
    newBadges,
    levelUpEvent,
    refresh,
    triggerBadgeCheck,
    dismissLevelUp,
    dismissNewBadges,
  }), [
    loading, totalXp, level, xpDelta, streak, newBadges, levelUpEvent,
    refresh, triggerBadgeCheck, dismissLevelUp, dismissNewBadges,
  ]);

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

export default GamificationContext;
