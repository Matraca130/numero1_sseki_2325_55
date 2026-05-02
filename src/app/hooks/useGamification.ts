// ============================================================
// Axon — useGamification (React Query hooks)
//
// Wraps gamificationApi.ts service functions with React Query
// for caching, deduplication, and automatic refetching.
//
// Used by GamificationView.tsx (student gamification dashboard).
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as gamificationApi from '@/app/services/gamificationApi';
import type {
  GamificationProfile,
  StreakStatus,
  CheckInResult,
  BadgesResponse,
  LeaderboardResponse,
  XPHistoryResponse,
} from '@/app/services/gamificationApi';
import type { StudyQueueResponse } from '@/app/types/gamification';

// ── Query keys ────────────────────────────────────────────

const keys = {
  profile: (instId?: string) => ['gamification', 'profile', instId] as const,
  streak: (instId?: string) => ['gamification', 'streak', instId] as const,
  badges: (instId?: string) => ['gamification', 'badges', instId] as const,
  leaderboard: (instId?: string, period?: string) =>
    ['gamification', 'leaderboard', instId, period] as const,
  xpHistory: (instId?: string) => ['gamification', 'xp-history', instId] as const,
  studyQueue: () => ['gamification', 'study-queue'] as const,
};

// ── Queries ───────────────────────────────────────────────

export function useGamificationProfile(institutionId?: string) {
  return useQuery<GamificationProfile | null>({
    queryKey: keys.profile(institutionId),
    queryFn: () =>
      institutionId ? gamificationApi.getProfile(institutionId) : Promise.resolve(null),
    enabled: !!institutionId,
    staleTime: 30_000,
  });
}

export function useStreakStatus(institutionId?: string) {
  return useQuery<StreakStatus | null>({
    queryKey: keys.streak(institutionId),
    queryFn: () =>
      institutionId ? gamificationApi.getStreakStatus(institutionId) : Promise.resolve(null),
    enabled: !!institutionId,
    staleTime: 60_000,
  });
}

export function useBadges(institutionId?: string) {
  return useQuery<BadgesResponse>({
    queryKey: keys.badges(institutionId),
    queryFn: () => gamificationApi.getBadges(institutionId),
    staleTime: 120_000,
  });
}

export function useLeaderboard(
  institutionId?: string,
  period: 'weekly' | 'daily' = 'weekly'
) {
  return useQuery<LeaderboardResponse>({
    queryKey: keys.leaderboard(institutionId, period),
    queryFn: () =>
      institutionId
        ? gamificationApi.getLeaderboard(institutionId, { period })
        : Promise.resolve({ leaderboard: [], my_rank: null, period }),
    enabled: !!institutionId,
    staleTime: 60_000,
  });
}

export function useXPHistory(institutionId?: string) {
  return useQuery<XPHistoryResponse>({
    queryKey: keys.xpHistory(institutionId),
    queryFn: () =>
      institutionId
        ? gamificationApi.getXPHistory(institutionId, { limit: 50 })
        : Promise.resolve({ items: [], total: 0, limit: 50, offset: 0 }),
    enabled: !!institutionId,
    staleTime: 30_000,
  });
}

export function useStudyQueue() {
  return useQuery<StudyQueueResponse>({
    queryKey: keys.studyQueue(),
    queryFn: () => gamificationApi.getStudyQueue({ limit: 20 }),
    staleTime: 30_000,
  });
}

// ── Mutations ─────────────────────────────────────────────

export function useDailyCheckIn(institutionId?: string) {
  const qc = useQueryClient();
  return useMutation<CheckInResult | null, Error>({
    mutationFn: () =>
      institutionId
        ? gamificationApi.dailyCheckIn(institutionId)
        : Promise.resolve(null),
    onSuccess: () => {
      // Refetch streak + profile after check-in
      qc.invalidateQueries({ queryKey: keys.streak(institutionId) });
      qc.invalidateQueries({ queryKey: keys.profile(institutionId) });
    },
  });
}

export function useStreakRepair(institutionId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      institutionId
        ? gamificationApi.repairStreak(institutionId)
        : Promise.resolve(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.streak(institutionId) });
      qc.invalidateQueries({ queryKey: keys.profile(institutionId) });
    },
  });
}
