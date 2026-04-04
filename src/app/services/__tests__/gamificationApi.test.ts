// ============================================================
// Axon -- Tests for gamificationApi.ts
//
// Covers URL construction, HTTP methods, query params, payload
// shapes, and error fallback behavior for all 13+ endpoints.
//
// Approach: Mock apiCall() and inspect URL/options passed.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock apiCall BEFORE importing API module ──────────────
const mockApiCall = vi.fn().mockResolvedValue({});
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

import {
  getProfile,
  getXPHistory,
  getLeaderboard,
  getStreakStatus,
  dailyCheckIn,
  buyStreakFreeze,
  repairStreak,
  getBadges,
  checkBadges,
  getNotifications,
  updateDailyGoal,
  completeGoal,
  onboarding,
  getStudyQueue,
  getGamificationProfile,
  getGamificationNotifications,
  initializeGamification,
} from '@/app/services/gamificationApi';

beforeEach(() => {
  mockApiCall.mockClear();
  mockApiCall.mockResolvedValue({});
});

// ══════════════════════════════════════════════════════════════
// SUITE 1: getProfile
// ══════════════════════════════════════════════════════════════

describe('getProfile', () => {
  it('calls correct URL with institution_id query param', async () => {
    mockApiCall.mockResolvedValue({ xp: { total: 100 } });
    const result = await getProfile('inst-001');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/gamification/profile?institution_id=inst-001'
    );
    expect(result).toEqual({ xp: { total: 100 } });
  });

  it('returns null on API error', async () => {
    mockApiCall.mockRejectedValue(new Error('Network error'));
    const result = await getProfile('inst-001');
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: getXPHistory
// ══════════════════════════════════════════════════════════════

describe('getXPHistory', () => {
  it('uses default limit=20 and offset=0', async () => {
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    await getXPHistory('inst-001');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('institution_id=inst-001');
    expect(url).toContain('limit=20');
    expect(url).toContain('offset=0');
  });

  it('uses custom limit and offset', async () => {
    mockApiCall.mockResolvedValue({ items: [], total: 0, limit: 5, offset: 10 });
    await getXPHistory('inst-001', { limit: 5, offset: 10 });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('limit=5');
    expect(url).toContain('offset=10');
  });

  it('returns empty fallback on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    const result = await getXPHistory('inst-001', { limit: 10, offset: 5 });
    expect(result).toEqual({ items: [], total: 0, limit: 10, offset: 5 });
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: getLeaderboard
// ══════════════════════════════════════════════════════════════

describe('getLeaderboard', () => {
  it('defaults to limit=10 and period=weekly', async () => {
    mockApiCall.mockResolvedValue({ leaderboard: [], my_rank: null, period: 'weekly' });
    await getLeaderboard('inst-001');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('limit=10');
    expect(url).toContain('period=weekly');
  });

  it('accepts custom limit and daily period', async () => {
    mockApiCall.mockResolvedValue({ leaderboard: [], my_rank: 3, period: 'daily' });
    await getLeaderboard('inst-001', { limit: 5, period: 'daily' });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('limit=5');
    expect(url).toContain('period=daily');
  });

  it('returns empty fallback on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    const result = await getLeaderboard('inst-001');
    expect(result).toEqual({ leaderboard: [], my_rank: null, period: 'weekly' });
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: getStreakStatus
// ══════════════════════════════════════════════════════════════

describe('getStreakStatus', () => {
  it('calls correct URL', async () => {
    mockApiCall.mockResolvedValue({ current_streak: 5 });
    await getStreakStatus('inst-001');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/gamification/streak-status?institution_id=inst-001'
    );
  });

  it('returns null on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    const result = await getStreakStatus('inst-001');
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 5: dailyCheckIn
// ══════════════════════════════════════════════════════════════

describe('dailyCheckIn', () => {
  it('sends POST to correct URL', async () => {
    mockApiCall.mockResolvedValue({ streak_status: {}, events: [] });
    await dailyCheckIn('inst-001');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/gamification/daily-check-in?institution_id=inst-001',
      { method: 'POST' }
    );
  });

  it('returns null on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    const result = await dailyCheckIn('inst-001');
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 6: buyStreakFreeze
// ══════════════════════════════════════════════════════════════

describe('buyStreakFreeze', () => {
  it('sends POST to streak-freeze/buy', async () => {
    mockApiCall.mockResolvedValue({ freeze: {}, xp_spent: 50, remaining_xp: 450, freezes_owned: 1 });
    await buyStreakFreeze('inst-001');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/gamification/streak-freeze/buy?institution_id=inst-001',
      { method: 'POST' }
    );
  });

  it('returns null on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    expect(await buyStreakFreeze('inst-001')).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 7: repairStreak
// ══════════════════════════════════════════════════════════════

describe('repairStreak', () => {
  it('sends POST to streak-repair', async () => {
    mockApiCall.mockResolvedValue({ repaired: true, restored_streak: 5, xp_spent: 100, remaining_xp: 400 });
    await repairStreak('inst-001');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/gamification/streak-repair?institution_id=inst-001',
      { method: 'POST' }
    );
  });

  it('returns null on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    expect(await repairStreak('inst-001')).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 8: getBadges
// ══════════════════════════════════════════════════════════════

describe('getBadges', () => {
  it('calls /gamification/badges with no params when none provided', async () => {
    mockApiCall.mockResolvedValue({ badges: [], total: 0, earned_count: 0 });
    await getBadges();
    expect(mockApiCall).toHaveBeenCalledWith('/gamification/badges');
  });

  it('includes institution_id when provided', async () => {
    mockApiCall.mockResolvedValue({ badges: [], total: 0, earned_count: 0 });
    await getBadges('inst-001');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('institution_id=inst-001');
  });

  it('includes category filter when provided', async () => {
    mockApiCall.mockResolvedValue({ badges: [], total: 0, earned_count: 0 });
    await getBadges('inst-001', 'mastery');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('institution_id=inst-001');
    expect(url).toContain('category=mastery');
  });

  it('includes only category when no institutionId', async () => {
    mockApiCall.mockResolvedValue({ badges: [], total: 0, earned_count: 0 });
    await getBadges(undefined, 'study');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('category=study');
    expect(url).not.toContain('institution_id');
  });

  it('returns empty fallback on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    const result = await getBadges('inst-001');
    expect(result).toEqual({ badges: [], total: 0, earned_count: 0 });
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 9: checkBadges
// ══════════════════════════════════════════════════════════════

describe('checkBadges', () => {
  it('sends POST to check-badges', async () => {
    mockApiCall.mockResolvedValue({ new_badges: [], checked: 10, awarded: 0 });
    await checkBadges('inst-001');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/gamification/check-badges?institution_id=inst-001',
      { method: 'POST' }
    );
  });

  it('returns null on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    expect(await checkBadges('inst-001')).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 10: getNotifications
// ══════════════════════════════════════════════════════════════

describe('getNotifications', () => {
  it('defaults to limit=20', async () => {
    mockApiCall.mockResolvedValue({ notifications: [], total: 0 });
    await getNotifications('inst-001');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('limit=20');
  });

  it('accepts custom limit', async () => {
    mockApiCall.mockResolvedValue({ notifications: [], total: 0 });
    await getNotifications('inst-001', { limit: 5 });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('limit=5');
  });

  it('returns empty fallback on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    const result = await getNotifications('inst-001');
    expect(result).toEqual({ notifications: [], total: 0 });
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 11: updateDailyGoal
// ══════════════════════════════════════════════════════════════

describe('updateDailyGoal', () => {
  it('sends PUT with daily_goal_minutes in body (B-001 fix)', async () => {
    mockApiCall.mockResolvedValue({ ok: true });
    await updateDailyGoal('inst-001', 30);
    expect(mockApiCall).toHaveBeenCalledWith(
      '/gamification/daily-goal',
      {
        method: 'PUT',
        body: JSON.stringify({ institution_id: 'inst-001', daily_goal_minutes: 30 }),
      }
    );
  });

  it('returns null on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    expect(await updateDailyGoal('inst-001', 30)).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 12: completeGoal
// ══════════════════════════════════════════════════════════════

describe('completeGoal', () => {
  it('sends POST with institution_id and goal_type in body', async () => {
    mockApiCall.mockResolvedValue({ goal_type: 'daily', xp_awarded: 50, bonus_type: null });
    await completeGoal('inst-001', 'daily');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/gamification/goals/complete',
      {
        method: 'POST',
        body: JSON.stringify({ institution_id: 'inst-001', goal_type: 'daily' }),
      }
    );
  });

  it('returns null on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    expect(await completeGoal('inst-001', 'daily')).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 13: onboarding
// ══════════════════════════════════════════════════════════════

describe('onboarding', () => {
  it('sends POST with institution_id in body', async () => {
    mockApiCall.mockResolvedValue({ message: 'OK', already_exists: false });
    await onboarding('inst-001');
    expect(mockApiCall).toHaveBeenCalledWith(
      '/gamification/onboarding',
      {
        method: 'POST',
        body: JSON.stringify({ institution_id: 'inst-001' }),
      }
    );
  });

  it('returns null on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    expect(await onboarding('inst-001')).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 15: getStudyQueue
// ══════════════════════════════════════════════════════════════

describe('getStudyQueue', () => {
  it('calls /study-queue with no params by default', async () => {
    mockApiCall.mockResolvedValue({ queue: [], meta: {} });
    await getStudyQueue();
    expect(mockApiCall).toHaveBeenCalledWith('/study-queue');
  });

  it('includes course_id and limit when provided', async () => {
    mockApiCall.mockResolvedValue({ queue: [], meta: {} });
    await getStudyQueue({ course_id: 'c-001', limit: 10 });
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('course_id=c-001');
    expect(url).toContain('limit=10');
  });

  it('returns fallback with correct meta on error', async () => {
    mockApiCall.mockRejectedValue(new Error('fail'));
    const result = await getStudyQueue({ limit: 15, course_id: 'c-001' });
    expect(result.queue).toEqual([]);
    expect(result.meta.total_due).toBe(0);
    expect(result.meta.limit).toBe(15);
    expect(result.meta.course_id).toBe('c-001');
    expect(result.meta.algorithm).toBe('fsrs');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 16: Aliases
// ══════════════════════════════════════════════════════════════

describe('Aliases', () => {
  it('getGamificationProfile is the same function as getProfile', () => {
    expect(getGamificationProfile).toBe(getProfile);
  });

  it('getGamificationNotifications is the same function as getNotifications', () => {
    expect(getGamificationNotifications).toBe(getNotifications);
  });

  it('initializeGamification is the same function as onboarding', () => {
    expect(initializeGamification).toBe(onboarding);
  });
});
