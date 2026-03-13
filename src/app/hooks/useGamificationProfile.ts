// ============================================================
// Axon v4.4 — useGamificationProfile Hook
//
// Sprint G1: Central hook for gamification state.
// Sprint G5: Added level-up detection + badge event tracking.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import {
  getGamificationProfile,
  getStreakStatus,
  dailyCheckIn,
} from '@/app/services/gamificationApi';
import type {
  GamificationProfile,
  StreakStatus,
  CheckInEvent,
  BadgeWithEarnedStatus,
} from '@/app/types/gamification';

export interface LevelUpEvent {
  previousLevel: number;
  newLevel: number;
}

export interface GamificationState {
  profile: GamificationProfile | null;
  streak: StreakStatus | null;
  loading: boolean;
  error: string | null;
  checkInEvents: CheckInEvent[];
  xpDelta: number;
  levelUpEvent: LevelUpEvent | null;
  newBadges: BadgeWithEarnedStatus[];
  refresh: () => Promise<void>;
  triggerBadgeCheck: () => Promise<void>;
  dismissLevelUp: () => void;
  dismissNewBadges: () => void;
}

export function useGamificationProfile(): GamificationState {
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id ?? null;

  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [streak, setStreak] = useState<StreakStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkInEvents, setCheckInEvents] = useState<CheckInEvent[]>([]);
  const [xpDelta, setXpDelta] = useState(0);
  const [levelUpEvent, setLevelUpEvent] = useState<LevelUpEvent | null>(null);
  const [newBadges, setNewBadges] = useState<BadgeWithEarnedStatus[]>([]);

  const prevXpRef = useRef<number | null>(null);
  const prevLevelRef = useRef<number | null>(null);
  const checkedInRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!institutionId) return;
    try {
      setError(null);
      const [profileData, streakData] = await Promise.allSettled([
        getGamificationProfile(institutionId),
        getStreakStatus(institutionId),
      ]);
      if (profileData.status === 'fulfilled') {
        const p = profileData.value;
        if (prevXpRef.current !== null) {
          const delta = p.total_xp - prevXpRef.current;
          if (delta > 0) setXpDelta(delta);
        }
        prevXpRef.current = p.total_xp;
        if (prevLevelRef.current !== null && p.current_level > prevLevelRef.current) {
          setLevelUpEvent({ previousLevel: prevLevelRef.current, newLevel: p.current_level });
        }
        prevLevelRef.current = p.current_level;
        setProfile(p);
      } else {
        setError(profileData.reason?.message ?? 'Error cargando perfil XP');
      }
      if (streakData.status === 'fulfilled') setStreak(streakData.value);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally { setLoading(false); }
  }, [institutionId]);

  const performCheckIn = useCallback(async () => {
    if (!institutionId || checkedInRef.current) return;
    checkedInRef.current = true;
    try {
      const result = await dailyCheckIn(institutionId);
      setCheckInEvents(result.events);
      setStreak(result.streak_status);
    } catch { /* fire-and-forget */ }
  }, [institutionId]);

  const refresh = useCallback(async () => { await fetchData(); }, [fetchData]);
  const dismissLevelUp = useCallback(() => { setLevelUpEvent(null); }, []);
  const dismissNewBadges = useCallback(() => { setNewBadges([]); }, []);

  const triggerBadgeCheck = useCallback(async () => {
    if (!institutionId) return;
    try {
      const { checkBadges } = await import('@/app/services/gamificationApi');
      const result = await checkBadges(institutionId);
      if (result.awarded > 0 && result.new_badges?.length > 0) setNewBadges(result.new_badges);
    } catch { /* non-blocking */ }
  }, [institutionId]);

  useEffect(() => {
    if (!institutionId) { setLoading(false); return; }
    setLoading(true);
    fetchData().then(() => { performCheckIn(); });
  }, [institutionId, fetchData, performCheckIn]);

  useEffect(() => {
    if (xpDelta > 0) { const t = setTimeout(() => setXpDelta(0), 5000); return () => clearTimeout(t); }
  }, [xpDelta]);

  return { profile, streak, loading, error, checkInEvents, xpDelta, levelUpEvent, newBadges, refresh, triggerBadgeCheck, dismissLevelUp, dismissNewBadges };
}
