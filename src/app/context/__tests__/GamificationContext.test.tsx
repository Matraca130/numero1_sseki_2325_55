// ============================================================
// Axon -- Tests for GamificationContext (GamificationProvider + useGamification)
//
// Covers:
//   1. useGamification() returns default values outside provider
//   2. Initial fetch on mount with institutionId
//   3. XP delta computation on refresh()
//   4. Level-up detection on refresh()
//   5. triggerBadgeCheck() with new badges
//   6. dismissLevelUp() and dismissNewBadges()
//   7. Error handling (API failures)
//   8. Institution change resets state
//   9. Initial fetch does NOT compute delta
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// ── Test data fixtures ──────────────────────────────────────

const MOCK_PROFILE_LEVEL1 = {
  xp: {
    total: 80,
    today: 30,
    this_week: 80,
    level: 1,
    daily_goal_minutes: 30,
    daily_cap: 500,
    streak_freezes_owned: 0,
  },
  streak: { current: 3, longest: 7, last_study_date: '2026-03-25' },
  badges_earned: 2,
};

const MOCK_PROFILE_LEVEL2 = {
  xp: {
    total: 150,
    today: 100,
    this_week: 150,
    level: 2,
    daily_goal_minutes: 30,
    daily_cap: 500,
    streak_freezes_owned: 1,
  },
  streak: { current: 4, longest: 7, last_study_date: '2026-03-26' },
  badges_earned: 3,
};

const MOCK_STREAK = {
  current_streak: 3,
  longest_streak: 7,
  last_study_date: '2026-03-25',
  freezes_available: 0,
  repair_eligible: false,
  streak_at_risk: false,
  studied_today: true,
  days_since_last_study: 0,
};

const MOCK_BADGE: import('@/app/services/gamificationApi').BadgeWithStatus = {
  id: 'badge-001',
  name: 'First Steps',
  slug: 'first-steps',
  description: 'Complete your first review',
  icon_url: 'https://example.com/icon.png',
  category: 'study',
  rarity: 'common',
  xp_reward: 10,
  criteria: 'complete_first_review',
  is_active: true,
  earned: true,
  earned_at: '2026-03-26T12:00:00Z',
};

// ── Mock useAuth ──────────────────────────────────────────

let mockSelectedInstitution: { id: string } | undefined = { id: 'inst-001' };

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    selectedInstitution: mockSelectedInstitution,
  }),
}));

// ── Mock gamificationApi ──────────────────────────────────

const mockGetProfile = vi.fn();
const mockGetStreakStatus = vi.fn();
const mockCheckBadges = vi.fn();

vi.mock('@/app/services/gamificationApi', () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  getStreakStatus: (...args: unknown[]) => mockGetStreakStatus(...args),
  checkBadges: (...args: unknown[]) => mockCheckBadges(...args),
}));

// ── Mock getLevelInfo ─────────────────────────────────────

vi.mock('@/app/types/gamification', () => ({
  getLevelInfo: (totalXP: number) => {
    // Simplified level calculation for tests
    if (totalXP >= 300) return { level: 3, xp: 300, title: 'Practicante' };
    if (totalXP >= 100) return { level: 2, xp: 100, title: 'Aprendiz' };
    return { level: 1, xp: 0, title: 'Novato' };
  },
}));

// ── Import AFTER mocks ──────────────────────────────────────

import { GamificationProvider, useGamification } from '../GamificationContext';

// ── Helpers ──────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  return <GamificationProvider>{children}</GamificationProvider>;
}

function setupDefaultMocks() {
  mockGetProfile.mockResolvedValue(MOCK_PROFILE_LEVEL1);
  mockGetStreakStatus.mockResolvedValue(MOCK_STREAK);
  mockCheckBadges.mockResolvedValue({ new_badges: [], checked: 10, awarded: 0 });
}

// ── Test suite ──────────────────────────────────────────────

describe('GamificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedInstitution = { id: 'inst-001' };
    setupDefaultMocks();
  });

  // ── Test 1: Default values without provider ────────────────

  it('useGamification() returns defaults when used outside provider', () => {
    const { result } = renderHook(() => useGamification());

    expect(result.current.loading).toBe(false);
    expect(result.current.totalXp).toBe(0);
    expect(result.current.level).toBe(1);
    expect(result.current.xpDelta).toBe(0);
    expect(result.current.streak).toBeNull();
    expect(result.current.newBadges).toEqual([]);
    expect(result.current.levelUpEvent).toBeNull();
  });

  // ── Test 2: Initial fetch on mount ─────────────────────────

  it('fetches profile and streak on mount when institutionId exists', async () => {
    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetProfile).toHaveBeenCalledWith('inst-001');
    expect(mockGetStreakStatus).toHaveBeenCalledWith('inst-001');
    expect(result.current.totalXp).toBe(80);
    expect(result.current.level).toBe(1);
    expect(result.current.streak).toEqual(MOCK_STREAK);
  });

  // ── Test 3: No fetch when no institutionId ─────────────────

  it('does not fetch when institutionId is undefined', async () => {
    mockSelectedInstitution = undefined;

    renderHook(() => useGamification(), { wrapper });

    // Give time for any potential fetch to fire
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockGetProfile).not.toHaveBeenCalled();
    expect(mockGetStreakStatus).not.toHaveBeenCalled();
  });

  // ── Test 4: XP delta computation on refresh ────────────────

  it('computes xpDelta when refresh() is called after initial fetch', async () => {
    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Initial XP = 80, now simulate XP increase
    mockGetProfile.mockResolvedValue(MOCK_PROFILE_LEVEL2);
    mockGetStreakStatus.mockResolvedValue(MOCK_STREAK);

    await act(async () => {
      await result.current.refresh();
    });

    // Delta: 150 - 80 = 70
    expect(result.current.xpDelta).toBe(70);
    expect(result.current.totalXp).toBe(150);
  });

  // ── Test 5: Initial fetch does NOT compute delta ──────────

  it('does not compute xpDelta on initial fetch', async () => {
    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.xpDelta).toBe(0);
  });

  // ── Test 6: Level-up detection ─────────────────────────────

  it('detects level-up when new level is higher after refresh', async () => {
    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.level).toBe(1);
    expect(result.current.levelUpEvent).toBeNull();

    // Simulate level-up: totalXP jumps from 80 to 150 (level 1 -> 2)
    mockGetProfile.mockResolvedValue(MOCK_PROFILE_LEVEL2);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.level).toBe(2);
    expect(result.current.levelUpEvent).toEqual({
      newLevel: 2,
      previousLevel: 1,
    });
  });

  // ── Test 7: No level-up event when level stays same ────────

  it('does not set levelUpEvent when level stays the same', async () => {
    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // XP increases but stays in same level
    mockGetProfile.mockResolvedValue({
      ...MOCK_PROFILE_LEVEL1,
      xp: { ...MOCK_PROFILE_LEVEL1.xp, total: 95 },
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.levelUpEvent).toBeNull();
  });

  // ── Test 8: triggerBadgeCheck with new badges ──────────────

  it('sets newBadges when triggerBadgeCheck finds earned badges', async () => {
    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockCheckBadges.mockResolvedValue({
      new_badges: [MOCK_BADGE],
      checked: 10,
      awarded: 1,
    });

    await act(async () => {
      await result.current.triggerBadgeCheck();
    });

    expect(result.current.newBadges).toHaveLength(1);
    expect(result.current.newBadges[0].name).toBe('First Steps');
    expect(result.current.newBadges[0].earned_at).toBe('2026-03-26T12:00:00Z');
  });

  // ── Test 9: triggerBadgeCheck filters unearned badges ──────

  it('filters out badges without earned_at from newBadges', async () => {
    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockCheckBadges.mockResolvedValue({
      new_badges: [
        { ...MOCK_BADGE, earned: false, earned_at: null },
      ],
      checked: 10,
      awarded: 0,
    });

    await act(async () => {
      await result.current.triggerBadgeCheck();
    });

    expect(result.current.newBadges).toHaveLength(0);
  });

  // ── Test 10: dismissLevelUp ────────────────────────────────

  it('dismissLevelUp clears the levelUpEvent', async () => {
    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Trigger level-up
    mockGetProfile.mockResolvedValue(MOCK_PROFILE_LEVEL2);
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.levelUpEvent).not.toBeNull();

    // Dismiss
    act(() => {
      result.current.dismissLevelUp();
    });
    expect(result.current.levelUpEvent).toBeNull();
  });

  // ── Test 11: dismissNewBadges ──────────────────────────────

  it('dismissNewBadges clears newBadges array', async () => {
    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockCheckBadges.mockResolvedValue({
      new_badges: [MOCK_BADGE],
      checked: 10,
      awarded: 1,
    });

    await act(async () => {
      await result.current.triggerBadgeCheck();
    });
    expect(result.current.newBadges).toHaveLength(1);

    act(() => {
      result.current.dismissNewBadges();
    });
    expect(result.current.newBadges).toHaveLength(0);
  });

  // ── Test 12: Error handling — fetchData ────────────────────

  it('handles API errors gracefully without crashing', async () => {
    mockGetProfile.mockRejectedValue(new Error('Network error'));
    mockGetStreakStatus.mockRejectedValue(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should retain default values
    expect(result.current.totalXp).toBe(0);
    expect(result.current.level).toBe(1);
    expect(result.current.streak).toBeNull();

    consoleSpy.mockRestore();
  });

  // ── Test 13: Error handling — triggerBadgeCheck ─────────────

  it('handles triggerBadgeCheck API errors gracefully', async () => {
    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockCheckBadges.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      await result.current.triggerBadgeCheck();
    });

    // Should not crash, badges stay empty
    expect(result.current.newBadges).toHaveLength(0);

    consoleSpy.mockRestore();
  });

  // ── Test 14: refresh without institutionId is no-op ────────

  it('refresh() is a no-op when institutionId is undefined', async () => {
    mockSelectedInstitution = undefined;

    const { result } = renderHook(() => useGamification(), { wrapper });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  // ── Test 15: triggerBadgeCheck without institutionId ────────

  it('triggerBadgeCheck() is a no-op when institutionId is undefined', async () => {
    mockSelectedInstitution = undefined;

    const { result } = renderHook(() => useGamification(), { wrapper });

    await act(async () => {
      await result.current.triggerBadgeCheck();
    });

    expect(mockCheckBadges).not.toHaveBeenCalled();
  });

  // ── Test 16: Profile is null ───────────────────────────────

  it('handles null profile response gracefully', async () => {
    mockGetProfile.mockResolvedValue(null);

    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Defaults should remain
    expect(result.current.totalXp).toBe(0);
    expect(result.current.level).toBe(1);
  });

  // ── Test 17: Streak is null ────────────────────────────────

  it('handles null streak response gracefully', async () => {
    mockGetStreakStatus.mockResolvedValue(null);

    const { result } = renderHook(() => useGamification(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.streak).toBeNull();
    // But profile data should still load
    expect(result.current.totalXp).toBe(80);
  });
});
