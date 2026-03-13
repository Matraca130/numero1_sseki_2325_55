// ============================================================
// Axon v4.4 — useGamificationProfile Hook
//
// Sprint G1: Central hook for gamification state.
//
// AUDIT FIX: Profile response is now correctly mapped from
// backend composite {xp, streak, badges_earned} to flat UI shape.
//
// Responsibilities:
//   1. Fetch XP profile + streak status on mount
//   2. Fire daily check-in once per session (idempotent)
//   3. Provide refresh() for post-action XP updates
//   4. Detect XP changes for XpToast triggering
//
// ARCHITECTURE:
//   - Uses useAuth().selectedInstitution.id for institution_id
//   - Fire-and-forget daily check-in (never blocks UI)
//   - Graceful error handling (§8 — backend may have bloqueos)
//   - Polling disabled — manual refresh only (saves bandwidth)
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
} from '@/app/types/gamification';

// ── Types ─────────────────────────────────────────────────

export interface GamificationState {
  profile: GamificationProfile | null;
  streak: StreakStatus | null;
  loading: boolean;
  error: string | null;
  /** Events from latest daily check-in */
  checkInEvents: CheckInEvent[];
  /** XP gained since last refresh (for toast) */
  xpDelta: number;
  /** Refresh profile + streak (call after quiz/review/session) */
  refresh: () => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────

export function useGamificationProfile(): GamificationState {
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id ?? null;

  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [streak, setStreak] = useState<StreakStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkInEvents, setCheckInEvents] = useState<CheckInEvent[]>([]);
  const [xpDelta, setXpDelta] = useState(0);

  // Track previous XP for delta detection
  const prevXpRef = useRef<number | null>(null);
  // Ensure daily check-in fires only once per session
  const checkedInRef = useRef(false);

  // ── Fetch profile + streak ─────────────────────────
  // AUDIT FIX: getGamificationProfile now returns mapped flat profile.
  // getStreakStatus returns StreakStatus directly (separate endpoint).

  const fetchData = useCallback(async () => {
    if (!institutionId) return;

    try {
      setError(null);
      const [profileData, streakData] = await Promise.allSettled([
        getGamificationProfile(institutionId),
        getStreakStatus(institutionId),
      ]);

      if (profileData.status === 'fulfilled') {
        const newProfile = profileData.value;

        // Detect XP delta for toast
        if (prevXpRef.current !== null) {
          const delta = newProfile.total_xp - prevXpRef.current;
          if (delta > 0) setXpDelta(delta);
        }
        prevXpRef.current = newProfile.total_xp;
        setProfile(newProfile);
      } else {
        // Profile fetch failed — try graceful
        setError(profileData.reason?.message ?? 'Error cargando perfil XP');
      }

      if (streakData.status === 'fulfilled') {
        setStreak(streakData.value);
      }
      // Streak failure is non-critical — don't block
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  // ── Daily check-in (fire-and-forget) ────────────────

  const performCheckIn = useCallback(async () => {
    if (!institutionId || checkedInRef.current) return;
    checkedInRef.current = true;

    try {
      const result = await dailyCheckIn(institutionId);
      setCheckInEvents(result.events);
      setStreak(result.streak_status);
    } catch {
      // Fire-and-forget: never block UI on check-in failure
    }
  }, [institutionId]);

  // ── Public refresh ──────────────────────────────────

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // ── Effects ─────────────────────────────────────────

  useEffect(() => {
    if (!institutionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchData().then(() => {
      // After initial load, fire daily check-in
      performCheckIn();
    });
  }, [institutionId, fetchData, performCheckIn]);

  // Reset xpDelta after 5 seconds (toast auto-dismiss)
  useEffect(() => {
    if (xpDelta > 0) {
      const timer = setTimeout(() => setXpDelta(0), 5000);
      return () => clearTimeout(timer);
    }
  }, [xpDelta]);

  return {
    profile,
    streak,
    loading,
    error,
    checkInEvents,
    xpDelta,
    refresh,
  };
}
