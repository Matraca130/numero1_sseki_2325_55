// ============================================================
// Axon -- Tests for useSessionXP hook
//
// Covers:
//   1. Initial state values
//   2. initSession() fetches baseline and sets state
//   3. recordReview() — correct answer (grade >= 3)
//   4. recordReview() — incorrect answer (grade < 3)
//   5. Combo tracking (consecutive correct answers)
//   6. Combo reset on incorrect answer
//   7. Flow Zone bonus at 5+ combo
//   8. Level-up detection during session
//   9. endSession() reconciles with backend
//  10. endSession() checks badges
//  11. reset() restores initial state
//  12. Daily cap remaining decrements
//  13. initSession() fires daily check-in (fire-and-forget)
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mock xp-constants ──────────────────────────────────────

vi.mock('@/app/lib/xp-constants', () => ({
  estimateReviewXP: (grade: number) => (grade >= 3 ? 15 : 5),
  calculateLevel: (totalXp: number) => {
    if (totalXp >= 300) return 3;
    if (totalXp >= 100) return 2;
    return 1;
  },
  DAILY_CAP: 500,
  XP_TABLE: {
    review_flashcard: 5,
    review_correct: 10,
    complete_session: 25,
  },
  LEVEL_NAMES: {
    1: 'Novato',
    2: 'Aprendiz',
    3: 'Estudiante',
  },
}));

// ── Mock gamificationApi ──────────────────────────────────

const mockGetProfile = vi.fn();
const mockDailyCheckIn = vi.fn();
const mockCheckBadges = vi.fn();

vi.mock('@/app/services/gamificationApi', () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  dailyCheckIn: (...args: unknown[]) => mockDailyCheckIn(...args),
  checkBadges: (...args: unknown[]) => mockCheckBadges(...args),
}));

// ── Mock sonner ────────────────────────────────────────────

const mockToast = vi.fn();
vi.mock('sonner', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// ── Import AFTER mocks ────────────────────────────────────

import { useSessionXP } from '@/app/hooks/useSessionXP';

// ── Test data ──────────────────────────────────────────────

const MOCK_PROFILE = {
  xp: {
    total: 80,
    today: 20,
    this_week: 80,
    level: 1,
    daily_goal_minutes: 30,
    daily_cap: 500,
    streak_freezes_owned: 0,
  },
  streak: { current: 3, longest: 7, last_study_date: '2026-03-25' },
  badges_earned: 2,
};

const MOCK_PROFILE_AFTER_SESSION = {
  xp: {
    total: 180,
    today: 120,
    this_week: 180,
    level: 2,
    daily_goal_minutes: 30,
    daily_cap: 500,
    streak_freezes_owned: 0,
  },
  streak: { current: 3, longest: 7, last_study_date: '2026-03-26' },
  badges_earned: 3,
};

// ── Test suite ──────────────────────────────────────────────

describe('useSessionXP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetProfile.mockResolvedValue(MOCK_PROFILE);
    mockDailyCheckIn.mockResolvedValue({ streak_status: {}, events: [] });
    mockCheckBadges.mockResolvedValue({ new_badges: [], checked: 10, awarded: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Test 1: Initial state ──────────────────────────────────

  it('returns initial state with sensible defaults', () => {
    const { result } = renderHook(() => useSessionXP());

    expect(result.current.state.baselineXP).toBe(0);
    expect(result.current.state.baselineLevel).toBe(1);
    expect(result.current.state.totalSessionXP).toBe(0);
    expect(result.current.state.lastEvent).toBeNull();
    expect(result.current.state.comboCount).toBe(0);
    expect(result.current.state.reviewCount).toBe(0);
    expect(result.current.state.correctCount).toBe(0);
    expect(result.current.state.loaded).toBe(false);
    expect(result.current.state.leveledUp).toBe(false);
    expect(result.current.state.currentLevel).toBe(1);
    expect(result.current.state.dailyCapRemaining).toBe(500);
    expect(result.current.state.currentStreak).toBe(0);
  });

  // ── Test 2: initSession ────────────────────────────────────

  it('initSession() fetches profile and sets baseline state', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    expect(mockGetProfile).toHaveBeenCalledWith('inst-001');
    expect(result.current.state.baselineXP).toBe(80);
    expect(result.current.state.baselineLevel).toBe(1);
    expect(result.current.state.loaded).toBe(true);
    expect(result.current.state.xpToday).toBe(20);
    expect(result.current.state.dailyCapRemaining).toBe(480); // 500 - 20
    expect(result.current.state.currentStreak).toBe(3);
    expect(result.current.state.totalSessionXP).toBe(0);
  });

  // ── Test 3: initSession fires daily check-in ──────────────

  it('initSession() fires daily check-in as fire-and-forget', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    expect(mockDailyCheckIn).toHaveBeenCalledWith('inst-001');
  });

  // ── Test 4: initSession with null profile ──────────────────

  it('initSession() handles null profile gracefully', async () => {
    mockGetProfile.mockResolvedValue(null);

    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    expect(result.current.state.baselineXP).toBe(0);
    expect(result.current.state.baselineLevel).toBe(1);
    expect(result.current.state.loaded).toBe(true);
    expect(result.current.state.dailyCapRemaining).toBe(500);
  });

  // ── Test 5: recordReview — correct answer ──────────────────

  it('recordReview() with correct grade (>= 3) adds XP and increments combo', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    let event: ReturnType<typeof result.current.recordReview>;
    act(() => {
      event = result.current.recordReview(4);
    });

    expect(event!.isCorrect).toBe(true);
    expect(event!.xp).toBe(15); // estimateReviewXP(4) = 15 (grade >= 3)
    expect(event!.comboCount).toBe(1);
    expect(result.current.state.totalSessionXP).toBe(15);
    expect(result.current.state.reviewCount).toBe(1);
    expect(result.current.state.correctCount).toBe(1);
    expect(result.current.state.comboCount).toBe(1);
  });

  // ── Test 6: recordReview — incorrect answer ────────────────

  it('recordReview() with incorrect grade (< 3) gives base XP and resets combo', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    // First do a correct answer to build combo
    act(() => {
      result.current.recordReview(4);
    });
    expect(result.current.state.comboCount).toBe(1);

    // Now incorrect
    let event: ReturnType<typeof result.current.recordReview>;
    act(() => {
      event = result.current.recordReview(1);
    });

    expect(event!.isCorrect).toBe(false);
    expect(event!.xp).toBe(5); // estimateReviewXP(1) = 5 (grade < 3)
    expect(event!.comboCount).toBe(0);
    expect(result.current.state.comboCount).toBe(0);
    expect(result.current.state.reviewCount).toBe(2);
    expect(result.current.state.correctCount).toBe(1); // only first one was correct
  });

  // ── Test 7: Combo tracking ─────────────────────────────────

  it('tracks consecutive correct answers as combo', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    act(() => {
      result.current.recordReview(3);
      result.current.recordReview(4);
      result.current.recordReview(5);
    });

    expect(result.current.state.comboCount).toBe(3);
    expect(result.current.state.correctCount).toBe(3);
    expect(result.current.state.totalSessionXP).toBe(45); // 3 * 15
  });

  // ── Test 8: Combo reset ────────────────────────────────────

  it('resets combo on incorrect answer', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    act(() => {
      result.current.recordReview(4); // combo 1
      result.current.recordReview(4); // combo 2
      result.current.recordReview(1); // reset
    });

    expect(result.current.state.comboCount).toBe(0);
  });

  // ── Test 9: Flow Zone bonus at 5+ combo ────────────────────

  it('applies Flow Zone bonus label at 5+ consecutive correct answers', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    let event: ReturnType<typeof result.current.recordReview>;
    act(() => {
      result.current.recordReview(4); // combo 1
      result.current.recordReview(4); // combo 2
      result.current.recordReview(4); // combo 3
      result.current.recordReview(4); // combo 4
      event = result.current.recordReview(4); // combo 5 - should trigger Flow Zone
    });

    expect(event!.bonusLabel).toBe('Flow Zone');
    expect(event!.comboCount).toBe(5);
    // 15 * 1.25 = 18.75 → rounded to 19
    expect(event!.xp).toBe(19);
  });

  // ── Test 10: No Flow Zone on combo < 5 ─────────────────────

  it('does not apply Flow Zone when combo is less than 5', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    let event: ReturnType<typeof result.current.recordReview>;
    act(() => {
      result.current.recordReview(4); // combo 1
      result.current.recordReview(4); // combo 2
      result.current.recordReview(4); // combo 3
      event = result.current.recordReview(4); // combo 4
    });

    expect(event!.bonusLabel).toBeNull();
    expect(event!.xp).toBe(15); // No multiplier
  });

  // ── Test 11: Level-up detection ────────────────────────────

  it('detects level-up during session based on cumulative XP', async () => {
    const { result } = renderHook(() => useSessionXP());

    // Baseline: 80 XP, level 1. Need 100+ for level 2.
    await act(async () => {
      await result.current.initSession('inst-001');
    });

    expect(result.current.state.leveledUp).toBe(false);

    // Add enough XP to cross level threshold: 80 + 15 = 95 (still level 1)
    act(() => {
      result.current.recordReview(4); // +15, total = 95
    });
    expect(result.current.state.leveledUp).toBe(false);

    // 95 + 15 = 110 (level 2!)
    act(() => {
      result.current.recordReview(4); // +15, total = 110
    });
    expect(result.current.state.leveledUp).toBe(true);
    expect(result.current.state.currentLevel).toBe(2);
  });

  // ── Test 12: Daily cap remaining decrements ────────────────

  it('decrements dailyCapRemaining with each review', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    expect(result.current.state.dailyCapRemaining).toBe(480);

    act(() => {
      result.current.recordReview(4); // -15
    });
    expect(result.current.state.dailyCapRemaining).toBe(465);

    act(() => {
      result.current.recordReview(1); // -5
    });
    expect(result.current.state.dailyCapRemaining).toBe(460);
  });

  // ── Test 13: endSession reconciles with backend ────────────

  it('endSession() fetches actual XP from backend and returns summary', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    act(() => {
      result.current.recordReview(4); // +15
      result.current.recordReview(4); // +15
    });

    mockGetProfile.mockResolvedValue(MOCK_PROFILE_AFTER_SESSION);

    let summary: Awaited<ReturnType<typeof result.current.endSession>>;
    await act(async () => {
      summary = await result.current.endSession('inst-001');
    });

    // optimisticXP includes session_complete bonus (30 + 25 = 55)
    expect(summary!.optimisticXP).toBe(55);
    // actualXP = 180 - 80 = 100 (from backend)
    expect(summary!.actualXP).toBe(100);
    expect(summary!.newLevel).toBe(2);
    expect(summary!.leveledUp).toBe(true);
  });

  // ── Test 14: endSession checks badges ──────────────────────

  it('endSession() triggers badge check', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    mockGetProfile.mockResolvedValue(MOCK_PROFILE);

    await act(async () => {
      await result.current.endSession('inst-001');
    });

    expect(mockCheckBadges).toHaveBeenCalledWith('inst-001');
  });

  // ── Test 15: endSession with null profile ──────────────────

  it('endSession() handles null profile with optimistic fallback', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    act(() => {
      result.current.recordReview(4); // +15
    });

    mockGetProfile.mockResolvedValue(null);

    let summary: Awaited<ReturnType<typeof result.current.endSession>>;
    await act(async () => {
      summary = await result.current.endSession('inst-001');
    });

    // optimisticXP field = sessionXPRef.current (15 + 25 session bonus = 40)
    expect(summary!.optimisticXP).toBe(40);
    // actualTotal = baselineRef.xp + local optimisticXP (captured before bonus) = 80 + 15 = 95
    // actualXP = 95 - 80 = 15. Math.max(15, 15) = 15 (local var, not ref)
    expect(summary!.actualXP).toBe(15);
  });

  // ── Test 16: reset ─────────────────────────────────────────

  it('reset() restores all state to initial values', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    act(() => {
      result.current.recordReview(4);
      result.current.recordReview(4);
    });

    expect(result.current.state.totalSessionXP).toBeGreaterThan(0);
    expect(result.current.state.reviewCount).toBe(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.baselineXP).toBe(0);
    expect(result.current.state.totalSessionXP).toBe(0);
    expect(result.current.state.reviewCount).toBe(0);
    expect(result.current.state.comboCount).toBe(0);
    expect(result.current.state.loaded).toBe(false);
    expect(result.current.state.leveledUp).toBe(false);
    expect(result.current.state.dailyCapRemaining).toBe(500);
  });

  // ── Test 17: lastEvent tracks most recent review ───────────

  it('lastEvent reflects the most recent review', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    act(() => {
      result.current.recordReview(4); // correct
    });
    expect(result.current.state.lastEvent?.isCorrect).toBe(true);
    expect(result.current.state.lastEvent?.xp).toBe(15);

    act(() => {
      result.current.recordReview(1); // incorrect
    });
    expect(result.current.state.lastEvent?.isCorrect).toBe(false);
    expect(result.current.state.lastEvent?.xp).toBe(5);
  });

  // ── Test 18: endSession level-up toast ──────────────────────

  it('endSession() shows level-up toast when level increases', async () => {
    const { result } = renderHook(() => useSessionXP());

    await act(async () => {
      await result.current.initSession('inst-001');
    });

    mockGetProfile.mockResolvedValue(MOCK_PROFILE_AFTER_SESSION);

    await act(async () => {
      await result.current.endSession('inst-001');
    });

    // Advance timers to trigger the setTimeout toast
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockToast).toHaveBeenCalled();
  });
});

// ── afterEach import for cleanup ────────────────────────────
import { afterEach } from 'vitest';
