// ============================================================
// Axon — useSessionXP Hook
//
// Tracks XP optimistically during a flashcard review session.
// Uses client-side XP_TABLE for instant feedback (+XP popups)
// and reconciles with backend after session ends.
//
// Flow:
//   1. initSession() → GET /gamification/profile (baseline)
//   2. recordReview(grade) → optimistic XP (sync, instant)
//   3. endSession() → GET /gamification/profile (real delta)
//              + POST /gamification/check-badges → toast notifications
//
// The hook emits XP events that UI components consume:
//   - xpGained: per-review XP amount
//   - comboCount: consecutive correct answers
//   - totalSessionXP: running total
//   - leveledUp: true if level changed
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { estimateReviewXP, calculateLevel, DAILY_CAP, XP_TABLE, LEVEL_NAMES } from '@/app/lib/xp-constants';
import * as gamificationApi from '@/app/services/gamificationApi';
import type { BadgeWithStatus } from '@/app/services/gamificationApi';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────

export interface XPEvent {
  xp: number;
  isCorrect: boolean;
  comboCount: number;
  bonusLabel: string | null;
}

export interface SessionXPState {
  /** XP before session started */
  baselineXP: number;
  baselineLevel: number;
  /** Optimistic running total of XP earned this session */
  totalSessionXP: number;
  /** Latest XP event (for popup animation) */
  lastEvent: XPEvent | null;
  /** Consecutive correct answers (grade >= 3) */
  comboCount: number;
  /** Total reviews done in session */
  reviewCount: number;
  /** Total correct reviews */
  correctCount: number;
  /** Whether XP data was loaded from backend */
  loaded: boolean;
  /** Whether level has changed during session */
  leveledUp: boolean;
  /** Current optimistic level */
  currentLevel: number;
  /** XP used today (from backend) */
  xpToday: number;
  /** Daily cap remaining */
  dailyCapRemaining: number;
  /** Current streak (from backend) */
  currentStreak: number;
}

export interface UseSessionXPReturn {
  state: SessionXPState;
  /** Call when session starts (fetches baseline XP) */
  initSession: (institutionId: string) => Promise<void>;
  /** Call when a card is graded (optimistic XP) */
  recordReview: (grade: number) => XPEvent;
  /** Call when session ends (reconciles with backend + checks badges) */
  endSession: (institutionId: string) => Promise<{
    optimisticXP: number;
    actualXP: number;
    newLevel: number;
    leveledUp: boolean;
    newBadges: BadgeWithStatus[];
  }>;
  /** Reset state for a new session */
  reset: () => void;
}

// ── Initial state ────────────────────────────────────────

const initialState: SessionXPState = {
  baselineXP: 0,
  baselineLevel: 1,
  totalSessionXP: 0,
  lastEvent: null,
  comboCount: 0,
  reviewCount: 0,
  correctCount: 0,
  loaded: false,
  leveledUp: false,
  currentLevel: 1,
  xpToday: 0,
  dailyCapRemaining: DAILY_CAP,
  currentStreak: 0,
};

// ── Hook ─────────────────────────────────────────────

export function useSessionXP(): UseSessionXPReturn {
  const [state, setState] = useState<SessionXPState>(initialState);
  const comboRef = useRef(0);
  const sessionXPRef = useRef(0);
  const baselineRef = useRef({ xp: 0, level: 1 });

  const initSession = useCallback(async (institutionId: string) => {
    // Fetch current XP + streak from backend in ONE call
    const profile = await gamificationApi.getProfile(institutionId);

    const baseXP = profile?.xp.total ?? 0;
    const baseLevel = profile?.xp.level ?? 1;
    const xpToday = profile?.xp.today ?? 0;
    const streak = profile?.streak.current ?? 0;

    baselineRef.current = { xp: baseXP, level: baseLevel };
    comboRef.current = 0;
    sessionXPRef.current = 0;

    setState({
      baselineXP: baseXP,
      baselineLevel: baseLevel,
      totalSessionXP: 0,
      lastEvent: null,
      comboCount: 0,
      reviewCount: 0,
      correctCount: 0,
      loaded: true,
      leveledUp: false,
      currentLevel: baseLevel,
      xpToday,
      dailyCapRemaining: Math.max(0, DAILY_CAP - xpToday),
      currentStreak: streak,
    });

    // Fire daily check-in (idempotent, fire-and-forget)
    gamificationApi.dailyCheckIn(institutionId).catch((err) => { console.warn('[useSessionXP] dailyCheckIn failed:', err); });
  }, []);

  const recordReview = useCallback((grade: number): XPEvent => {
    const isCorrect = grade >= 3;
    const baseXP = estimateReviewXP(grade);

    // Update combo
    if (isCorrect) {
      comboRef.current += 1;
    } else {
      comboRef.current = 0;
    }

    // Estimate bonus (client-side can't know variable reward or exact on-time)
    let bonusLabel: string | null = null;
    let multiplier = 1.0;

    // Combo bonus: 5+ correct in a row → show "Flow Zone" label
    if (comboRef.current >= 5 && isCorrect) {
      bonusLabel = 'Flow Zone';
      multiplier += 0.25;
    }

    const xpEarned = Math.round(baseXP * multiplier);
    sessionXPRef.current += xpEarned;

    const event: XPEvent = {
      xp: xpEarned,
      isCorrect,
      comboCount: comboRef.current,
      bonusLabel,
    };

    // Check for level-up
    const newTotalXP = baselineRef.current.xp + sessionXPRef.current;
    const newLevel = calculateLevel(newTotalXP);
    const leveledUp = newLevel > baselineRef.current.level;

    setState(prev => ({
      ...prev,
      totalSessionXP: sessionXPRef.current,
      lastEvent: event,
      comboCount: comboRef.current,
      reviewCount: prev.reviewCount + 1,
      correctCount: prev.correctCount + (isCorrect ? 1 : 0),
      leveledUp,
      currentLevel: newLevel,
      dailyCapRemaining: Math.max(0, prev.dailyCapRemaining - xpEarned),
    }));

    return event;
  }, []);

  const endSession = useCallback(async (institutionId: string) => {
    const optimisticXP = sessionXPRef.current;

    // Also add session completion bonus
    sessionXPRef.current += XP_TABLE.complete_session;

    // Reconcile with backend (single call gets xp + streak + badges)
    const profile = await gamificationApi.getProfile(institutionId);
    const actualTotal = profile?.xp.total ?? (baselineRef.current.xp + optimisticXP);
    const actualXP = actualTotal - baselineRef.current.xp;
    const newLevel = profile?.xp.level ?? calculateLevel(actualTotal);
    const leveledUp = newLevel > baselineRef.current.level;

    setState(prev => ({
      ...prev,
      totalSessionXP: sessionXPRef.current,
      currentLevel: newLevel,
      leveledUp,
    }));

    // ── Check for new badges ──
    // FIX: await the badge check so newBadges is populated before return.
    // Previously this was fire-and-forget (.then), so newBadges was always [].
    let newBadges: BadgeWithStatus[] = [];
    try {
      const result = await gamificationApi.checkBadges(institutionId);
      if (result && result.new_badges.length > 0) {
        newBadges = result.new_badges;

        // Fire a toast for each new badge (staggered for premium feel)
        result.new_badges.forEach((badge, idx) => {
          setTimeout(() => {
            const rarityEmoji =
              badge.rarity === 'legendary' ? '\u2728' :
              badge.rarity === 'epic' ? '\ud83d\udc8e' :
              badge.rarity === 'rare' ? '\ud83d\udd37' : '\ud83c\udfc5';

            toast(`${rarityEmoji} ${badge.name}`, {
              description: badge.description,
              duration: 5000,
            });
          }, 1500 + idx * 800); // Stagger: 1.5s delay + 0.8s between each
        });
      }
    } catch {
      // Silent fail — badges are non-critical
    }

    // ── Level-up toast ──
    if (leveledUp) {
      const levelName = LEVEL_NAMES[newLevel] || `Nivel ${newLevel}`;
      setTimeout(() => {
        toast('\ud83c\udf89 Subiste de nivel!', {
          description: `Ahora eres ${levelName} (Nivel ${newLevel})`,
          duration: 6000,
        });
      }, 800);
    }

    return {
      optimisticXP: sessionXPRef.current,
      actualXP: Math.max(actualXP, optimisticXP), // Show whichever is higher (backend may have bonuses)
      newLevel,
      leveledUp,
      newBadges,
    };
  }, []);

  const reset = useCallback(() => {
    comboRef.current = 0;
    sessionXPRef.current = 0;
    baselineRef.current = { xp: 0, level: 1 };
    setState(initialState);
  }, []);

  return { state, initSession, recordReview, endSession, reset };
}
