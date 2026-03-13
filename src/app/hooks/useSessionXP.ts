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
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { estimateReviewXP, calculateLevel, DAILY_CAP, XP_TABLE } from '@/app/lib/xp-constants';
import * as gamificationApi from '@/app/services/gamificationApi';

export interface XPEvent {
  xp: number;
  isCorrect: boolean;
  comboCount: number;
  bonusLabel: string | null;
}

export interface SessionXPState {
  baselineXP: number;
  baselineLevel: number;
  totalSessionXP: number;
  lastEvent: XPEvent | null;
  comboCount: number;
  reviewCount: number;
  correctCount: number;
  loaded: boolean;
  leveledUp: boolean;
  currentLevel: number;
  xpToday: number;
  dailyCapRemaining: number;
  currentStreak: number;
}

export interface UseSessionXPReturn {
  state: SessionXPState;
  initSession: (institutionId: string) => Promise<void>;
  recordReview: (grade: number) => XPEvent;
  endSession: (institutionId: string) => Promise<{
    optimisticXP: number;
    actualXP: number;
    newLevel: number;
    leveledUp: boolean;
  }>;
  reset: () => void;
}

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

export function useSessionXP(): UseSessionXPReturn {
  const [state, setState] = useState<SessionXPState>(initialState);
  const comboRef = useRef(0);
  const sessionXPRef = useRef(0);
  const baselineRef = useRef({ xp: 0, level: 1 });

  const initSession = useCallback(async (institutionId: string) => {
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
    gamificationApi.dailyCheckIn(institutionId).catch(() => {});
  }, []);

  const recordReview = useCallback((grade: number): XPEvent => {
    const isCorrect = grade >= 3;
    const baseXP = estimateReviewXP(grade);
    if (isCorrect) {
      comboRef.current += 1;
    } else {
      comboRef.current = 0;
    }
    let bonusLabel: string | null = null;
    let multiplier = 1.0;
    if (comboRef.current >= 5 && isCorrect) {
      bonusLabel = 'Flow Zone';
      multiplier += 0.25;
    }
    const xpEarned = Math.round(baseXP * multiplier);
    sessionXPRef.current += xpEarned;
    const event: XPEvent = { xp: xpEarned, isCorrect, comboCount: comboRef.current, bonusLabel };
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
    sessionXPRef.current += XP_TABLE.complete_session;
    const profile = await gamificationApi.getProfile(institutionId);
    const actualTotal = profile?.xp.total ?? (baselineRef.current.xp + optimisticXP);
    const actualXP = actualTotal - baselineRef.current.xp;
    const newLevel = profile?.xp.level ?? calculateLevel(actualTotal);
    setState(prev => ({
      ...prev,
      totalSessionXP: sessionXPRef.current,
      currentLevel: newLevel,
      leveledUp: newLevel > baselineRef.current.level,
    }));
    return {
      optimisticXP: sessionXPRef.current,
      actualXP: Math.max(actualXP, optimisticXP),
      newLevel,
      leveledUp: newLevel > baselineRef.current.level,
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
