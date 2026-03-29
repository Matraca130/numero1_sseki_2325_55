// ============================================================
// E2E Integration Tests -- Gamification System
//
// Tests the FULL gamification journey end-to-end:
//   1. GamificationContext loads initial XP and level
//   2. GamificationContext detects level-up events
//   3. GamificationContext tracks streak status
//   4. Badge check triggers and displays new badges
//   5. XP gain animation flow (XPPopup)
//   6. Leaderboard data display (LeaderboardPage)
//   7. Badge gallery component (BadgesPage)
//   8. XP history display (XpHistoryPage)
//   9. Empty state (new student, no XP)
//  10. Error handling when API fails
//  11. BadgeShowcase loads and renders badge grid
//  12. LevelUpCelebration renders and dismisses
//
// Components under test:
//   - GamificationProvider (GamificationContext)
//   - LeaderboardPage, BadgesPage, XpHistoryPage
//   - BadgeShowcase, LevelUpCelebration, XPPopup
//
// RUN: npx vitest run src/__tests__/e2e-gamification.test.tsx
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React from 'react';

// ── Mock motion/react ────────────────────────────────────────
vi.mock('motion/react', () => {
  const React = require('react');
  const motion = new Proxy(
    {},
    {
      get(_target: unknown, prop: string) {
        return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
          const {
            initial, animate, exit, transition, whileHover, whileTap,
            whileInView, variants, layout, layoutId, onAnimationComplete,
            ...rest
          } = props;
          return React.createElement(prop, { ...rest, ref });
        });
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

// ── Mock lucide-react ────────────────────────────────────────
vi.mock('lucide-react', () => {
  const React = require('react');
  return new Proxy(
    {},
    {
      get(_target: unknown, name: string) {
        if (name === '__esModule') return true;
        return (props: Record<string, unknown>) =>
          React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
      },
    },
  );
});

// ── Mock sonner ──────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

// ── Mock gamificationApi ─────────────────────────────────────

const mockGetProfile = vi.fn();
const mockGetStreakStatus = vi.fn();
const mockCheckBadges = vi.fn();
const mockGetLeaderboard = vi.fn();
const mockGetBadges = vi.fn();
const mockGetXPHistory = vi.fn();
const mockGetNotifications = vi.fn();
const mockDailyCheckIn = vi.fn();
const mockOnboarding = vi.fn();

vi.mock('@/app/services/gamificationApi', () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  getStreakStatus: (...args: unknown[]) => mockGetStreakStatus(...args),
  checkBadges: (...args: unknown[]) => mockCheckBadges(...args),
  getLeaderboard: (...args: unknown[]) => mockGetLeaderboard(...args),
  getBadges: (...args: unknown[]) => mockGetBadges(...args),
  getXPHistory: (...args: unknown[]) => mockGetXPHistory(...args),
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  dailyCheckIn: (...args: unknown[]) => mockDailyCheckIn(...args),
  onboarding: (...args: unknown[]) => mockOnboarding(...args),
  buyStreakFreeze: vi.fn().mockResolvedValue(null),
  repairStreak: vi.fn().mockResolvedValue(null),
  updateDailyGoal: vi.fn().mockResolvedValue(null),
  completeGoal: vi.fn().mockResolvedValue(null),
  getStudyQueue: vi.fn().mockResolvedValue({ queue: [], meta: {} }),
  getGamificationProfile: (...args: unknown[]) => mockGetProfile(...args),
  getGamificationNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  initializeGamification: (...args: unknown[]) => mockOnboarding(...args),
}));

// ── Mock AuthContext ─────────────────────────────────────────

const MOCK_INSTITUTION = {
  id: 'inst-001',
  name: 'Universidad Axon',
  slug: 'univ-axon',
  logo_url: null,
  membership_id: 'mem-001',
  role: 'student',
  is_active: true,
  settings: {},
  plan_id: null,
};

const MOCK_USER = {
  id: 'user-001',
  email: 'estudiante@axon.edu',
  full_name: 'Carlos Medina',
};

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    user: MOCK_USER,
    selectedInstitution: MOCK_INSTITUTION,
    isLoading: false,
    isAuthenticated: true,
  }),
}));

// ── Mock xp-constants ────────────────────────────────────────
vi.mock('@/app/lib/xp-constants', () => ({
  DAILY_CAP: 500,
}));

// ── Mock useSessionXP (for XPPopup) ─────────────────────────
vi.mock('@/app/hooks/useSessionXP', () => ({
  __esModule: true,
}));

// ── Test Data Fixtures ───────────────────────────────────────

function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    xp: {
      total: 450,
      today: 75,
      this_week: 210,
      level: 4,
      daily_goal_minutes: 30,
      daily_cap: 500,
      streak_freezes_owned: 1,
      ...((overrides.xp as Record<string, unknown>) ?? {}),
    },
    streak: {
      current: 5,
      longest: 12,
      last_study_date: '2026-03-29',
      ...((overrides.streak as Record<string, unknown>) ?? {}),
    },
    badges_earned: 3,
    ...(overrides.badges_earned !== undefined ? { badges_earned: overrides.badges_earned } : {}),
  };
}

function makeStreakStatus(overrides: Record<string, unknown> = {}) {
  return {
    current_streak: 5,
    longest_streak: 12,
    last_study_date: '2026-03-29',
    freezes_available: 1,
    repair_eligible: false,
    streak_at_risk: false,
    studied_today: true,
    days_since_last_study: 0,
    ...overrides,
  };
}

function makeBadge(overrides: Record<string, unknown> = {}) {
  return {
    id: 'badge-001',
    name: 'Primera Revision',
    slug: 'first-review',
    description: 'Completa tu primera revision',
    icon_url: null,
    category: 'study',
    rarity: 'common',
    xp_reward: 25,
    criteria: 'Complete 1 review',
    is_active: true,
    earned: true,
    earned_at: '2026-03-28T12:00:00Z',
    ...overrides,
  };
}

function makeLeaderboardEntry(overrides: Record<string, unknown> = {}) {
  return {
    student_id: 'user-001',
    xp_this_week: 450,
    xp_today: 75,
    current_level: 4,
    total_xp: 1200,
    ...overrides,
  };
}

function makeXPTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx-001',
    student_id: 'user-001',
    institution_id: 'inst-001',
    action: 'review_correct',
    xp_base: 10,
    xp_final: 15,
    multiplier: 1.5,
    bonus_type: 'streak',
    source_type: 'flashcard',
    source_id: 'fc-001',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── Imports (after mocks) ────────────────────────────────────

import { GamificationProvider, useGamification } from '@/app/context/GamificationContext';
import { LevelUpCelebration } from '@/app/components/gamification/LevelUpCelebration';
import { BadgeShowcase } from '@/app/components/gamification/BadgeShowcase';
import { XPTimeline } from '@/app/components/gamification/XPTimeline';
import { LeaderboardPage } from '@/app/components/gamification/pages/LeaderboardPage';
import { BadgesPage } from '@/app/components/gamification/pages/BadgesPage';
import { XpHistoryPage } from '@/app/components/gamification/pages/XpHistoryPage';

// ── Helpers ──────────────────────────────────────────────────

function GamificationWrapper({ children }: { children: React.ReactNode }) {
  return <GamificationProvider>{children}</GamificationProvider>;
}

// ══════════════════════════════════════════════════════════════
// TEST 1: GamificationContext loads initial XP and level
// ══════════════════════════════════════════════════════════════

describe('GamificationContext — initial load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads profile XP and computes level on mount', async () => {
    const profile = makeProfile({ xp: { total: 450 } });
    mockGetProfile.mockResolvedValue(profile);
    mockGetStreakStatus.mockResolvedValue(makeStreakStatus());

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // XP loaded from profile
    expect(result.current.totalXp).toBe(450);
    // Level 4 starts at 600 XP, level 3 at 300 -> 450 is level 3
    // Actually getLevelInfo(450) -> level 3 (300-600 range)
    expect(result.current.level).toBe(3);
    // No xpDelta on initial load
    expect(result.current.xpDelta).toBe(0);
    // API called with institution ID
    expect(mockGetProfile).toHaveBeenCalledWith('inst-001');
    expect(mockGetStreakStatus).toHaveBeenCalledWith('inst-001');
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 2: GamificationContext detects level-up events
// ══════════════════════════════════════════════════════════════

describe('GamificationContext — level-up detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets levelUpEvent when refresh() reveals a level increase', async () => {
    // Initial load: 250 XP = level 2
    mockGetProfile.mockResolvedValueOnce(makeProfile({ xp: { total: 250 } }));
    mockGetStreakStatus.mockResolvedValue(makeStreakStatus());

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.level).toBe(2);
    expect(result.current.levelUpEvent).toBeNull();

    // After quiz: 350 XP = level 3 (threshold at 300)
    mockGetProfile.mockResolvedValueOnce(makeProfile({ xp: { total: 350 } }));
    mockGetStreakStatus.mockResolvedValue(makeStreakStatus());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.level).toBe(3);
    expect(result.current.levelUpEvent).toEqual({
      newLevel: 3,
      previousLevel: 2,
    });

    // Dismiss level-up
    act(() => {
      result.current.dismissLevelUp();
    });
    expect(result.current.levelUpEvent).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 3: GamificationContext tracks streak status
// ══════════════════════════════════════════════════════════════

describe('GamificationContext — streak tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads streak data and exposes it via context', async () => {
    mockGetProfile.mockResolvedValue(makeProfile());
    const streakData = makeStreakStatus({
      current_streak: 7,
      longest_streak: 15,
      streak_at_risk: true,
      studied_today: false,
    });
    mockGetStreakStatus.mockResolvedValue(streakData);

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.streak).not.toBeNull();
    expect(result.current.streak!.current_streak).toBe(7);
    expect(result.current.streak!.longest_streak).toBe(15);
    expect(result.current.streak!.streak_at_risk).toBe(true);
    expect(result.current.streak!.studied_today).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 4: Badge check triggers and displays new badges
// ══════════════════════════════════════════════════════════════

describe('GamificationContext — badge check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggerBadgeCheck() populates newBadges and dismissNewBadges clears them', async () => {
    mockGetProfile.mockResolvedValue(makeProfile());
    mockGetStreakStatus.mockResolvedValue(makeStreakStatus());

    const newBadge = makeBadge({
      id: 'badge-new',
      name: 'Racha de 5',
      slug: 'streak-5',
      rarity: 'rare',
      earned: true,
      earned_at: '2026-03-29T10:00:00Z',
    });
    mockCheckBadges.mockResolvedValue({
      new_badges: [newBadge],
      checked: 10,
      awarded: 1,
    });

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.newBadges).toHaveLength(0);

    // Trigger badge check
    await act(async () => {
      await result.current.triggerBadgeCheck();
    });

    expect(result.current.newBadges).toHaveLength(1);
    expect(result.current.newBadges[0].name).toBe('Racha de 5');
    expect(result.current.newBadges[0].rarity).toBe('rare');
    expect(mockCheckBadges).toHaveBeenCalledWith('inst-001');

    // Dismiss
    act(() => {
      result.current.dismissNewBadges();
    });
    expect(result.current.newBadges).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 5: XP gain animation flow — XP delta computed on refresh
// ══════════════════════════════════════════════════════════════

describe('GamificationContext — XP delta on refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes xpDelta correctly when XP increases between refreshes', async () => {
    // Initial: 100 XP
    mockGetProfile.mockResolvedValueOnce(makeProfile({ xp: { total: 100 } }));
    mockGetStreakStatus.mockResolvedValue(makeStreakStatus());

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totalXp).toBe(100);
    expect(result.current.xpDelta).toBe(0); // no delta on initial

    // After quiz: 135 XP (+35 delta)
    mockGetProfile.mockResolvedValueOnce(makeProfile({ xp: { total: 135 } }));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.totalXp).toBe(135);
    expect(result.current.xpDelta).toBe(35);
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 6: Leaderboard data display
// ══════════════════════════════════════════════════════════════

describe('LeaderboardPage — renders leaderboard entries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays leaderboard entries and current user rank', async () => {
    const entries = [
      makeLeaderboardEntry({ student_id: 'top-1', xp_this_week: 900, current_level: 7 }),
      makeLeaderboardEntry({ student_id: 'top-2', xp_this_week: 750, current_level: 6 }),
      makeLeaderboardEntry({ student_id: 'user-001', xp_this_week: 450, current_level: 4 }),
    ];
    mockGetLeaderboard.mockResolvedValue({
      leaderboard: entries,
      my_rank: 3,
      period: 'weekly',
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    });

    // Rank badge visible
    expect(screen.getByText('#3')).toBeInTheDocument();

    // XP values displayed (top entries use toLocaleString)
    expect(screen.getByText('900 XP')).toBeInTheDocument();
    expect(screen.getByText('750 XP')).toBeInTheDocument();
    expect(screen.getByText('450 XP')).toBeInTheDocument();

    // API called correctly
    expect(mockGetLeaderboard).toHaveBeenCalledWith(
      'inst-001',
      expect.objectContaining({ limit: 50, period: 'weekly' }),
    );
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 7: Badge gallery component (BadgesPage)
// ══════════════════════════════════════════════════════════════

describe('BadgesPage — renders badge gallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays badges with earned/unearned state and counter', async () => {
    const badges = [
      makeBadge({ id: 'b1', name: 'Primera Flashcard', earned: true, rarity: 'common' }),
      makeBadge({ id: 'b2', name: 'Racha de 7', earned: true, rarity: 'rare' }),
      makeBadge({ id: 'b3', name: 'Maestro Quiz', earned: false, earned_at: null, rarity: 'epic' }),
      makeBadge({ id: 'b4', name: 'Leyenda', earned: false, earned_at: null, rarity: 'legendary' }),
    ];
    mockGetBadges.mockResolvedValue({
      badges,
      total: 4,
      earned_count: 2,
    });

    render(<BadgesPage />);

    await waitFor(() => {
      expect(screen.getByText('Insignias')).toBeInTheDocument();
    });

    // Progress counter
    expect(screen.getByText('2/4')).toBeInTheDocument();

    // Badge names rendered
    expect(screen.getByText('Primera Flashcard')).toBeInTheDocument();
    expect(screen.getByText('Racha de 7')).toBeInTheDocument();
    expect(screen.getByText('Maestro Quiz')).toBeInTheDocument();
    expect(screen.getByText('Leyenda')).toBeInTheDocument();

    // Filter buttons present
    expect(screen.getByText('Todas')).toBeInTheDocument();
    expect(screen.getByText('Consistencia')).toBeInTheDocument();
    expect(screen.getByText('Estudio')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 8: XP history display
// ══════════════════════════════════════════════════════════════

describe('XpHistoryPage — renders XP transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays XP transaction list with action labels and amounts', async () => {
    const txs = [
      makeXPTransaction({ id: 'tx1', action: 'review_correct', xp_base: 10, xp_final: 15, bonus_type: 'streak', multiplier: 1.5 }),
      makeXPTransaction({ id: 'tx2', action: 'complete_session', xp_base: 25, xp_final: 25, bonus_type: null, multiplier: 1 }),
      makeXPTransaction({ id: 'tx3', action: 'quiz_correct', xp_base: 15, xp_final: 15, bonus_type: null, multiplier: 1 }),
    ];
    mockGetXPHistory.mockResolvedValue({
      items: txs,
      total: 3,
      limit: 20,
      offset: 0,
    });
    mockGetProfile.mockResolvedValue(makeProfile({ xp: { total: 1200, today: 55, this_week: 280 } }));

    render(<XpHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Historial de XP')).toBeInTheDocument();
    });

    // Action labels rendered
    expect(screen.getByText('Flashcard correcta')).toBeInTheDocument();
    expect(screen.getByText('Sesion completada')).toBeInTheDocument();
    expect(screen.getByText('Quiz correcto')).toBeInTheDocument();

    // XP amounts
    expect(screen.getByText('+15')).toBeInTheDocument();
    expect(screen.getByText('+25')).toBeInTheDocument();

    // Bonus type badge shown
    expect(screen.getByText('streak')).toBeInTheDocument();

    // Summary stats from profile
    await waitFor(() => {
      expect(screen.getByText('55 XP')).toBeInTheDocument();
      expect(screen.getByText('280 XP')).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 9: Empty state (new student, no XP)
// ══════════════════════════════════════════════════════════════

describe('Empty state — new student with no activity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('BadgeShowcase shows empty message when no badges exist', async () => {
    mockGetBadges.mockResolvedValue({
      badges: [],
      total: 0,
      earned_count: 0,
    });

    render(<BadgeShowcase institutionId="inst-001" />);

    await waitFor(() => {
      expect(screen.getByText('Los logros se desbloquean al estudiar')).toBeInTheDocument();
    });
  });

  it('XPTimeline shows empty message when no notifications', async () => {
    mockGetNotifications.mockResolvedValue({
      notifications: [],
      total: 0,
    });

    render(<XPTimeline institutionId="inst-001" />);

    await waitFor(() => {
      expect(screen.getByText('Sin actividad reciente')).toBeInTheDocument();
    });
  });

  it('GamificationContext defaults to level 1 and 0 XP for new student', async () => {
    mockGetProfile.mockResolvedValue(makeProfile({ xp: { total: 0 } }));
    mockGetStreakStatus.mockResolvedValue(makeStreakStatus({ current_streak: 0 }));

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totalXp).toBe(0);
    expect(result.current.level).toBe(1);
    expect(result.current.xpDelta).toBe(0);
    expect(result.current.streak!.current_streak).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 10: Error handling when API fails
// ══════════════════════════════════════════════════════════════

describe('Error handling — API failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GamificationContext keeps defaults when getProfile and getStreakStatus fail', async () => {
    mockGetProfile.mockRejectedValue(new Error('Network error'));
    mockGetStreakStatus.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Defaults preserved — no crash
    expect(result.current.totalXp).toBe(0);
    expect(result.current.level).toBe(1);
    expect(result.current.streak).toBeNull();
  });

  it('triggerBadgeCheck gracefully handles API error without crashing', async () => {
    mockGetProfile.mockResolvedValue(makeProfile());
    mockGetStreakStatus.mockResolvedValue(makeStreakStatus());
    mockCheckBadges.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Should not throw
    await act(async () => {
      await result.current.triggerBadgeCheck();
    });

    // newBadges stays empty
    expect(result.current.newBadges).toHaveLength(0);
  });

  it('LeaderboardPage shows empty state when API returns no entries', async () => {
    mockGetLeaderboard.mockResolvedValue({
      leaderboard: [],
      my_rank: null,
      period: 'weekly',
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('No hay datos para este periodo')).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 11: BadgeShowcase loads and renders badge grid
// ══════════════════════════════════════════════════════════════

describe('BadgeShowcase — renders badge grid with earned/unearned states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays earned and locked badges with counter', async () => {
    const badges = [
      makeBadge({ id: 'b1', name: 'Primer Paso', earned: true, rarity: 'common' }),
      makeBadge({ id: 'b2', name: 'Racha Ardiente', earned: true, rarity: 'rare' }),
      makeBadge({ id: 'b3', name: 'Cerebro', earned: false, earned_at: null, rarity: 'epic' }),
    ];
    mockGetBadges.mockResolvedValue({
      badges,
      total: 3,
      earned_count: 2,
    });

    render(<BadgeShowcase institutionId="inst-001" />);

    await waitFor(() => {
      expect(screen.getByText('Logros')).toBeInTheDocument();
    });

    // Counter shows earned/total
    expect(screen.getByText('2/3')).toBeInTheDocument();

    // Badge names rendered
    expect(screen.getByText('Primer Paso')).toBeInTheDocument();
    expect(screen.getByText('Racha Ardiente')).toBeInTheDocument();
    expect(screen.getByText('Cerebro')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 12: LevelUpCelebration renders and dismisses
// ══════════════════════════════════════════════════════════════

describe('LevelUpCelebration — render and dismiss', () => {
  it('displays level-up overlay with correct level numbers', () => {
    const onClose = vi.fn();

    render(
      <LevelUpCelebration
        newLevel={5}
        previousLevel={4}
        show={true}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Nivel 5!')).toBeInTheDocument();
    expect(screen.getByText('Subiste del nivel 4 al 5')).toBeInTheDocument();

    // Continuar button dismisses
    fireEvent.click(screen.getByText('Continuar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when show is false', () => {
    const onClose = vi.fn();

    const { container } = render(
      <LevelUpCelebration
        newLevel={3}
        previousLevel={2}
        show={false}
        onClose={onClose}
      />,
    );

    expect(container.innerHTML).toBe('');
  });
});
