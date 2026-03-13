// ============================================================
// Axon — Gamification React Query Hooks v2 (VERIFIED)
//
// ALL gamification endpoints require institution_id.
// Hooks accept institutionId param — get it from AuthContext
// or PlatformDataContext.
//
// queryKey factory pattern per GUIDELINES.md.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGamificationProfile,
  getXPHistory,
  getStreakStatus,
  dailyCheckIn,
  repairStreak,
  buyStreakFreeze,
  updateDailyGoal,
  getBadges,
  checkBadges,
  getLeaderboard,
  getGamificationNotifications,
  getStudyQueue,
  initializeGamification,
  completeGoal,
} from '@/app/services/gamificationApi';
import type {
  CheckInResponse,
} from '@/app/services/gamificationApi';

// ── Query Key Factory ───────────────────────────────────

export const gamificationKeys = {
  all: ['gamification'] as const,
  profile: (instId: string) =>
    [...gamificationKeys.all, 'profile', instId] as const,
  xpHistory: (instId: string) =>
    [...gamificationKeys.all, 'xp-history', instId] as const,
  streak: (instId: string) =>
    [...gamificationKeys.all, 'streak', instId] as const,
  badges: (category?: string) =>
    [...gamificationKeys.all, 'badges', { category }] as const,
  leaderboard: (instId: string, period?: string) =>
    [...gamificationKeys.all, 'leaderboard', instId, { period }] as const,
  notifications: (instId: string) =>
    [...gamificationKeys.all, 'notifications', instId] as const,
  studyQueue: (courseId?: string) =>
    [...gamificationKeys.all, 'study-queue', { courseId }] as const,
};

// ── Profile (Composite: XP + streak + badges) ─────────────

export function useGamificationProfile(institutionId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.profile(institutionId ?? ''),
    queryFn: () => getGamificationProfile(institutionId!),
    enabled: !!institutionId,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}

// ── XP History ────────────────────────────────────────

export function useXPHistory(institutionId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.xpHistory(institutionId ?? ''),
    queryFn: () => getXPHistory(institutionId!, { limit: 50 }),
    enabled: !!institutionId,
    staleTime: 1 * 60 * 1000,
  });
}

// ── Streak ────────────────────────────────────────────

export function useStreakStatus(institutionId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.streak(institutionId ?? ''),
    queryFn: () => getStreakStatus(institutionId!),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useDailyCheckIn(institutionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!institutionId) throw new Error('No institution_id');
      return dailyCheckIn(institutionId);
    },
    onSuccess: (result: CheckInResponse | null) => {
      if (!result) return; // S2 FIX: dailyCheckIn returns null on network error
      qc.setQueryData(
        gamificationKeys.streak(institutionId ?? ''),
        result.streak_status
      );
      qc.invalidateQueries({ queryKey: gamificationKeys.profile(institutionId ?? '') });
    },
  });
}

export function useStreakRepair(institutionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!institutionId) throw new Error('No institution_id');
      return repairStreak(institutionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificationKeys.streak(institutionId ?? '') });
      qc.invalidateQueries({ queryKey: gamificationKeys.profile(institutionId ?? '') });
    },
  });
}

export function useBuyStreakFreeze(institutionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!institutionId) throw new Error('No institution_id');
      return buyStreakFreeze(institutionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificationKeys.streak(institutionId ?? '') });
      qc.invalidateQueries({ queryKey: gamificationKeys.profile(institutionId ?? '') });
    },
  });
}

// ── Daily Goal ────────────────────────────────────────

export function useUpdateDailyGoal(institutionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dailyGoal: number) => {
      if (!institutionId) throw new Error('No institution_id');
      return updateDailyGoal(institutionId, dailyGoal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificationKeys.profile(institutionId ?? '') });
    },
  });
}

// ── Badges ────────────────────────────────────────────

export function useBadges(category?: string) {
  return useQuery({
    queryKey: gamificationKeys.badges(category),
    queryFn: () => getBadges(undefined, category),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCheckBadges(institutionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!institutionId) throw new Error('No institution_id');
      return checkBadges(institutionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificationKeys.badges() });
      qc.invalidateQueries({ queryKey: gamificationKeys.profile(institutionId ?? '') });
    },
  });
}

// ── Leaderboard ───────────────────────────────────────

export function useLeaderboard(
  institutionId: string | undefined,
  period: 'weekly' | 'daily' = 'weekly'
) {
  return useQuery({
    queryKey: gamificationKeys.leaderboard(institutionId ?? '', period),
    queryFn: () => getLeaderboard(institutionId!, { period, limit: 20 }),
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Notifications ─────────────────────────────────────

export function useGamificationNotifications(institutionId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.notifications(institutionId ?? ''),
    queryFn: () => getGamificationNotifications(institutionId!, { limit: 20 }),
    enabled: !!institutionId,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Onboarding ────────────────────────────────────────

export function useInitializeGamification(institutionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!institutionId) throw new Error('No institution_id');
      return initializeGamification(institutionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificationKeys.all });
    },
  });
}

// ── Goal Completion ─────────────────────────────────────

export function useCompleteGoal(institutionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalType: string) => {
      if (!institutionId) throw new Error('No institution_id');
      return completeGoal(institutionId, goalType);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamificationKeys.profile(institutionId ?? '') });
    },
  });
}

// ── Study Queue (no institution_id needed) ────────────────

export function useStudyQueue(courseId?: string) {
  return useQuery({
    queryKey: gamificationKeys.studyQueue(courseId),
    queryFn: () => getStudyQueue({ course_id: courseId, limit: 20 }),
    staleTime: 3 * 60 * 1000,
  });
}
