// ============================================================
// Hook Tests — useGamification (React Query wrappers)
//
// Coverage (observable behaviour only):
//   - Queries disabled without institutionId (return null/defaults)
//   - Queries call the underlying API when institutionId provided
//   - Query keys include institutionId / period parts
//   - useStudyQueue always calls the API (no institutionId gating)
//   - useDailyCheckIn / useStreakRepair invalidate streak+profile caches
//
// Ownership note: useGamification.ts is SHARED with the Gamification
// agent. These tests target observable React-Query behaviour of the
// hook; they do NOT assert on the API service internals.
//
// Mocks:
//   - @/app/services/gamificationApi (all functions used by the hook)
//
// Run: npx vitest run src/app/hooks/__tests__/useGamification.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────

const mockGetProfile = vi.fn();
const mockGetStreakStatus = vi.fn();
const mockGetBadges = vi.fn();
const mockGetLeaderboard = vi.fn();
const mockGetXPHistory = vi.fn();
const mockGetStudyQueue = vi.fn();
const mockDailyCheckIn = vi.fn();
const mockRepairStreak = vi.fn();

vi.mock('@/app/services/gamificationApi', () => ({
  getProfile: (...a: unknown[]) => mockGetProfile(...a),
  getStreakStatus: (...a: unknown[]) => mockGetStreakStatus(...a),
  getBadges: (...a: unknown[]) => mockGetBadges(...a),
  getLeaderboard: (...a: unknown[]) => mockGetLeaderboard(...a),
  getXPHistory: (...a: unknown[]) => mockGetXPHistory(...a),
  getStudyQueue: (...a: unknown[]) => mockGetStudyQueue(...a),
  dailyCheckIn: (...a: unknown[]) => mockDailyCheckIn(...a),
  repairStreak: (...a: unknown[]) => mockRepairStreak(...a),
}));

// ── Import AFTER mocks ────────────────────────────────────

import {
  useGamificationProfile,
  useStreakStatus,
  useBadges,
  useLeaderboard,
  useXPHistory,
  useStudyQueue,
  useDailyCheckIn,
  useStreakRepair,
} from '@/app/hooks/useGamification';

// ── Wrapper factory ──────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper, queryClient };
}

const INST = 'inst-42';

// ── Reset mocks ───────────────────────────────────────────

beforeEach(() => {
  mockGetProfile.mockReset();
  mockGetStreakStatus.mockReset();
  mockGetBadges.mockReset();
  mockGetLeaderboard.mockReset();
  mockGetXPHistory.mockReset();
  mockGetStudyQueue.mockReset();
  mockDailyCheckIn.mockReset();
  mockRepairStreak.mockReset();
});

// ============================================================
// useGamificationProfile
// ============================================================

describe('useGamificationProfile', () => {
  it('is disabled when institutionId is missing (no API call)', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useGamificationProfile(undefined), { wrapper });
    // disabled → stays in idle-like state; fetchStatus 'idle'
    expect(mockGetProfile).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('calls getProfile with institutionId when provided', async () => {
    mockGetProfile.mockResolvedValueOnce({
      xp: {
        total: 120,
        today: 10,
        this_week: 50,
        level: 2,
        daily_goal_minutes: 30,
        daily_cap: 500,
        streak_freezes_owned: 0,
      },
      streak: { current: 3, longest: 7, last_study_date: '2026-04-17' },
      badges_earned: 1,
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useGamificationProfile(INST), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetProfile).toHaveBeenCalledWith(INST);
    expect(result.current.data?.xp.total).toBe(120);
  });
});

// ============================================================
// useStreakStatus
// ============================================================

describe('useStreakStatus', () => {
  it('is disabled without institutionId', () => {
    const { wrapper } = createWrapper();
    renderHook(() => useStreakStatus(undefined), { wrapper });
    expect(mockGetStreakStatus).not.toHaveBeenCalled();
  });

  it('calls getStreakStatus and returns the payload', async () => {
    mockGetStreakStatus.mockResolvedValueOnce({
      current_streak: 5,
      longest_streak: 10,
      last_check_in: '2026-04-17',
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStreakStatus(INST), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetStreakStatus).toHaveBeenCalledWith(INST);
    expect(result.current.data?.current_streak).toBe(5);
  });
});

// ============================================================
// useBadges
// ============================================================

describe('useBadges', () => {
  it('always calls getBadges (no gating on institutionId)', async () => {
    mockGetBadges.mockResolvedValueOnce({ badges: [], total: 0, earned_count: 0 });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBadges(INST), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetBadges).toHaveBeenCalledWith(INST);
  });

  it('forwards undefined institutionId to getBadges (public badges)', async () => {
    mockGetBadges.mockResolvedValueOnce({ badges: [], total: 0, earned_count: 0 });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useBadges(undefined), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetBadges).toHaveBeenCalledWith(undefined);
  });
});

// ============================================================
// useLeaderboard
// ============================================================

describe('useLeaderboard', () => {
  it('is disabled without institutionId', () => {
    const { wrapper } = createWrapper();
    renderHook(() => useLeaderboard(undefined), { wrapper });
    expect(mockGetLeaderboard).not.toHaveBeenCalled();
  });

  it('calls getLeaderboard with default weekly period', async () => {
    mockGetLeaderboard.mockResolvedValueOnce({
      leaderboard: [],
      my_rank: null,
      period: 'weekly',
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLeaderboard(INST), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetLeaderboard).toHaveBeenCalledWith(INST, { period: 'weekly' });
  });

  it('passes daily period through', async () => {
    mockGetLeaderboard.mockResolvedValueOnce({
      leaderboard: [],
      my_rank: null,
      period: 'daily',
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLeaderboard(INST, 'daily'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetLeaderboard).toHaveBeenCalledWith(INST, { period: 'daily' });
  });

  it('uses different cache entries for different periods', async () => {
    mockGetLeaderboard.mockResolvedValue({
      leaderboard: [],
      my_rank: null,
      period: 'weekly',
    });
    const { wrapper } = createWrapper();
    const { result: weekly } = renderHook(() => useLeaderboard(INST, 'weekly'), { wrapper });
    const { result: daily } = renderHook(() => useLeaderboard(INST, 'daily'), { wrapper });
    await waitFor(() => expect(weekly.current.isSuccess).toBe(true));
    await waitFor(() => expect(daily.current.isSuccess).toBe(true));
    // Each hook fetched separately → two calls
    expect(mockGetLeaderboard).toHaveBeenCalledTimes(2);
  });
});

// ============================================================
// useXPHistory
// ============================================================

describe('useXPHistory', () => {
  it('is disabled without institutionId', () => {
    const { wrapper } = createWrapper();
    renderHook(() => useXPHistory(undefined), { wrapper });
    expect(mockGetXPHistory).not.toHaveBeenCalled();
  });

  it('calls getXPHistory with limit=50', async () => {
    mockGetXPHistory.mockResolvedValueOnce({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useXPHistory(INST), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetXPHistory).toHaveBeenCalledWith(INST, { limit: 50 });
  });
});

// ============================================================
// useStudyQueue
// ============================================================

describe('useStudyQueue', () => {
  it('calls getStudyQueue with limit=20 (no institutionId gate)', async () => {
    mockGetStudyQueue.mockResolvedValueOnce({
      queue: [],
      meta: {
        total_due: 0,
        total_new: 0,
        total_in_queue: 0,
        returned: 0,
        limit: 20,
        include_future: false,
        course_id: null,
        generated_at: '2026-04-18T00:00:00Z',
        algorithm: 'fsrs',
        engine: 'sql',
      },
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStudyQueue(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetStudyQueue).toHaveBeenCalledWith({ limit: 20 });
  });
});

// ============================================================
// useDailyCheckIn (mutation)
// ============================================================

describe('useDailyCheckIn', () => {
  it('resolves to null and does not call API when institutionId missing', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDailyCheckIn(undefined), { wrapper });
    await act(async () => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDailyCheckIn).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('calls dailyCheckIn with institutionId and invalidates streak + profile caches', async () => {
    mockDailyCheckIn.mockResolvedValueOnce({
      streak_status: { current_streak: 1, longest_streak: 1, last_check_in: '2026-04-18' },
      events: [{ type: 'streak_started', message: 'ok' }],
    });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDailyCheckIn(INST), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDailyCheckIn).toHaveBeenCalledWith(INST);

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] }).queryKey,
    );
    // Keys from hook: ['gamification','streak',INST] and ['gamification','profile',INST]
    expect(invalidatedKeys).toContainEqual(['gamification', 'streak', INST]);
    expect(invalidatedKeys).toContainEqual(['gamification', 'profile', INST]);
  });
});

// ============================================================
// useStreakRepair (mutation)
// ============================================================

describe('useStreakRepair', () => {
  it('resolves to null without calling API when institutionId missing', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStreakRepair(undefined), { wrapper });
    await act(async () => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRepairStreak).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('calls repairStreak and invalidates streak + profile caches on success', async () => {
    mockRepairStreak.mockResolvedValueOnce({
      repaired: true,
      restored_streak: 5,
      xp_spent: 50,
      remaining_xp: 100,
    });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useStreakRepair(INST), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRepairStreak).toHaveBeenCalledWith(INST);
    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] }).queryKey,
    );
    expect(invalidatedKeys).toContainEqual(['gamification', 'streak', INST]);
    expect(invalidatedKeys).toContainEqual(['gamification', 'profile', INST]);
  });
});
