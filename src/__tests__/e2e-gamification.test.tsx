// ============================================================
// E2E Integration Tests -- Gamification System
//
// Tests the FULL gamification journey end-to-end:
//   1. GamificationContext loads initial XP and level
//   2. GamificationContext detects level-up events
//   3. GamificationContext tracks streak status
//   4. Badge check triggers and displays new badges
//   5. XP gain animation flow (xpDelta computed on refresh)
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
//   - BadgeShowcase, LevelUpCelebration, XPTimeline
//
// RUN: npx vitest run src/__tests__/e2e-gamification.test.tsx
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React from 'react';

// ── Mock supabase + api (prevent real HTTP) ──────────────────

vi.mock('@/app/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
}));

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn().mockRejectedValue(new Error('mocked')),
  API_BASE: 'https://test.supabase.co/functions/v1/server',
  ANON_KEY: 'test-anon-key',
}));

vi.mock('@/app/lib/api-helpers', () => ({
  extractItems: (d: unknown) => d,
}));

// ── Mock motion/react (non-Proxy, explicit elements) ─────────

vi.mock('motion/react', () => {
  const React = require('react');
  const Dummy = React.forwardRef(({ children, ...rest }: any, ref: any) =>
    React.createElement('div', { ...rest, ref }, children),
  );
  return {
    motion: {
      div: Dummy, button: Dummy, span: Dummy, p: Dummy, section: Dummy,
      article: Dummy, h1: Dummy, h2: Dummy, h3: Dummy, ul: Dummy, li: Dummy,
      img: Dummy, a: Dummy, form: Dummy, input: Dummy, nav: Dummy,
      aside: Dummy, header: Dummy, footer: Dummy, main: Dummy, table: Dummy,
    },
    AnimatePresence: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
  };
});

// ── Mock lucide-react (explicit named exports) ───────────────

vi.mock('lucide-react', () => {
  const React = require('react');
  const I = (name: string) => (props: any) =>
    React.createElement('span', { 'data-testid': `icon-${name}`, ...props });
  return {
    __esModule: true,
    Sparkles: I('Sparkles'), X: I('X'), Award: I('Award'), Lock: I('Lock'),
    Loader2: I('Loader2'), Zap: I('Zap'), Flame: I('Flame'), Clock: I('Clock'),
    Star: I('Star'), Shield: I('Shield'), Users: I('Users'), Snowflake: I('Snowflake'),
    Wrench: I('Wrench'), Trophy: I('Trophy'), Crown: I('Crown'), Medal: I('Medal'),
    AlertTriangle: I('AlertTriangle'), TrendingUp: I('TrendingUp'), User: I('User'),
    History: I('History'), ChevronDown: I('ChevronDown'), Target: I('Target'),
    BookOpen: I('BookOpen'), Brain: I('Brain'), CreditCard: I('CreditCard'),
    CheckCircle: I('CheckCircle'), ListTodo: I('ListTodo'), Check: I('Check'),
  };
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
    loading: false,
    status: 'authenticated',
  }),
}));

// ── Mock xp-constants ────────────────────────────────────────

vi.mock('@/app/lib/xp-constants', () => ({ DAILY_CAP: 500 }));

// ── Test Data Fixtures ───────────────────────────────────────

function makeProfile(overrides: Record<string, unknown> = {}) {
  const xpDefaults = {
    total: 450,
    today: 75,
    this_week: 210,
    level: 4,
    daily_goal_minutes: 30,
    daily_cap: 500,
    streak_freezes_owned: 1,
  };
  const streakDefaults = {
    current: 5,
    longest: 12,
    last_study_date: '2026-03-29',
  };
  return {
    xp: { ...xpDefaults, ...((overrides.xp as Record<string, unknown>) ?? {}) },
    streak: { ...streakDefaults, ...((overrides.streak as Record<string, unknown>) ?? {}) },
    badges_earned: overrides.badges_earned !== undefined ? overrides.badges_earned : 3,
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
  beforeEach(() => { vi.clearAllMocks(); });

  it('loads profile XP and computes level on mount', async () => {
    // 450 XP -> level 3 (thresholds: 0/100/300/600)
    mockGetProfile.mockResolvedValue(makeProfile({ xp: { total: 450 } }));
    mockGetStreakStatus.mockResolvedValue(makeStreakStatus());

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totalXp).toBe(450);
    expect(result.current.level).toBe(3); // 300 <= 450 < 600
    expect(result.current.xpDelta).toBe(0); // no delta on initial
    expect(mockGetProfile).toHaveBeenCalledWith('inst-001');
    expect(mockGetStreakStatus).toHaveBeenCalledWith('inst-001');
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 2: GamificationContext detects level-up events
// ══════════════════════════════════════════════════════════════

describe('GamificationContext — level-up detection', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sets levelUpEvent when refresh() reveals a level increase', async () => {
    // Initial: 250 XP = level 2 (100 <= 250 < 300)
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

    await act(async () => { await result.current.refresh(); });

    expect(result.current.level).toBe(3);
    expect(result.current.levelUpEvent).toEqual({
      newLevel: 3,
      previousLevel: 2,
    });

    // Dismiss clears the event
    act(() => { result.current.dismissLevelUp(); });
    expect(result.current.levelUpEvent).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 3: GamificationContext tracks streak status
// ══════════════════════════════════════════════════════════════

describe('GamificationContext — streak tracking', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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
  beforeEach(() => { vi.clearAllMocks(); });

  it('triggerBadgeCheck() populates newBadges; dismissNewBadges clears them', async () => {
    mockGetProfile.mockResolvedValue(makeProfile());
    mockGetStreakStatus.mockResolvedValue(makeStreakStatus());
    mockCheckBadges.mockResolvedValue({
      new_badges: [
        makeBadge({
          id: 'badge-new', name: 'Racha de 5', slug: 'streak-5',
          rarity: 'rare', earned: true, earned_at: '2026-03-29T10:00:00Z',
        }),
      ],
      checked: 10,
      awarded: 1,
    });

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.newBadges).toHaveLength(0);

    await act(async () => { await result.current.triggerBadgeCheck(); });

    expect(result.current.newBadges).toHaveLength(1);
    expect(result.current.newBadges[0].name).toBe('Racha de 5');
    expect(result.current.newBadges[0].rarity).toBe('rare');
    expect(mockCheckBadges).toHaveBeenCalledWith('inst-001');

    act(() => { result.current.dismissNewBadges(); });
    expect(result.current.newBadges).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 5: XP delta computed correctly on refresh
// ══════════════════════════════════════════════════════════════

describe('GamificationContext — XP delta on refresh', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('computes xpDelta when XP increases between refreshes', async () => {
    mockGetProfile.mockResolvedValueOnce(makeProfile({ xp: { total: 100 } }));
    mockGetStreakStatus.mockResolvedValue(makeStreakStatus());

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totalXp).toBe(100);
    expect(result.current.xpDelta).toBe(0);

    // After quiz: 135 XP (+35)
    mockGetProfile.mockResolvedValueOnce(makeProfile({ xp: { total: 135 } }));

    await act(async () => { await result.current.refresh(); });

    expect(result.current.totalXp).toBe(135);
    expect(result.current.xpDelta).toBe(35);
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 6: Leaderboard data display
// ══════════════════════════════════════════════════════════════

describe('LeaderboardPage — renders leaderboard entries', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('displays leaderboard entries and user rank', async () => {
    mockGetLeaderboard.mockResolvedValue({
      leaderboard: [
        makeLeaderboardEntry({ student_id: 'top-1', xp_this_week: 900, current_level: 7 }),
        makeLeaderboardEntry({ student_id: 'top-2', xp_this_week: 750, current_level: 6 }),
        makeLeaderboardEntry({ student_id: 'user-001', xp_this_week: 450, current_level: 4 }),
      ],
      my_rank: 3,
      period: 'weekly',
    });

    render(<LeaderboardPage />);

    await waitFor(() => {
      expect(screen.getByText('900 XP')).toBeInTheDocument();
    });

    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('900 XP')).toBeInTheDocument();
    expect(screen.getByText('750 XP')).toBeInTheDocument();
    expect(screen.getByText('450 XP')).toBeInTheDocument();
    expect(mockGetLeaderboard).toHaveBeenCalledWith(
      'inst-001',
      expect.objectContaining({ limit: 50, period: 'weekly' }),
    );
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 7: Badge gallery (BadgesPage)
// ══════════════════════════════════════════════════════════════

describe('BadgesPage — renders badge gallery', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('displays badges with earned/unearned state and counter', async () => {
    mockGetBadges.mockResolvedValue({
      badges: [
        makeBadge({ id: 'b1', name: 'Primera Flashcard', earned: true, rarity: 'common' }),
        makeBadge({ id: 'b2', name: 'Racha de 7', earned: true, rarity: 'rare' }),
        makeBadge({ id: 'b3', name: 'Maestro Quiz', earned: false, earned_at: null, rarity: 'epic' }),
        makeBadge({ id: 'b4', name: 'Leyenda', earned: false, earned_at: null, rarity: 'legendary' }),
      ],
      total: 4,
      earned_count: 2,
    });

    render(<BadgesPage />);

    await waitFor(() => expect(screen.getByText('Insignias')).toBeInTheDocument());

    expect(screen.getByText('2/4')).toBeInTheDocument();
    expect(screen.getByText('Primera Flashcard')).toBeInTheDocument();
    expect(screen.getByText('Racha de 7')).toBeInTheDocument();
    expect(screen.getByText('Maestro Quiz')).toBeInTheDocument();
    expect(screen.getByText('Leyenda')).toBeInTheDocument();
    // "Todas" appears in both category button and rarity select
    expect(screen.getAllByText('Todas').length).toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════════
// TEST 8: XP history display
// ══════════════════════════════════════════════════════════════

describe('XpHistoryPage — renders XP transactions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('displays transaction list with labels, amounts, and bonuses', async () => {
    mockGetXPHistory.mockResolvedValue({
      items: [
        makeXPTransaction({ id: 'tx1', action: 'review_correct', xp_base: 10, xp_final: 15, bonus_type: 'streak', multiplier: 1.5 }),
        makeXPTransaction({ id: 'tx2', action: 'complete_session', xp_base: 25, xp_final: 25, bonus_type: null, multiplier: 1 }),
        makeXPTransaction({ id: 'tx3', action: 'quiz_correct', xp_base: 15, xp_final: 15, bonus_type: null, multiplier: 1 }),
      ],
      total: 3,
      limit: 20,
      offset: 0,
    });
    mockGetProfile.mockResolvedValue(makeProfile({ xp: { total: 1200, today: 55, this_week: 280 } }));

    render(<XpHistoryPage />);

    await waitFor(() => expect(screen.getByText('Historial de XP')).toBeInTheDocument());

    expect(screen.getByText('Flashcard correcta')).toBeInTheDocument();
    expect(screen.getByText('Sesion completada')).toBeInTheDocument();
    expect(screen.getByText('Quiz correcto')).toBeInTheDocument();
    // XP amounts are rendered as +{xp_final} in spans; text may be split
    // across nodes, so check the full page text content
    const body = document.body.textContent!;
    expect(body).toContain('+15');
    expect(body).toContain('+25');
    expect(screen.getByText('streak')).toBeInTheDocument();

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
  beforeEach(() => { vi.clearAllMocks(); });

  it('BadgeShowcase shows empty message when no badges', async () => {
    mockGetBadges.mockResolvedValue({ badges: [], total: 0, earned_count: 0 });

    render(<BadgeShowcase institutionId="inst-001" />);

    await waitFor(() => {
      expect(screen.getByText('Los logros se desbloquean al estudiar')).toBeInTheDocument();
    });
  });

  it('XPTimeline shows empty message when no notifications', async () => {
    mockGetNotifications.mockResolvedValue({ notifications: [], total: 0 });

    render(<XPTimeline institutionId="inst-001" />);

    await waitFor(() => {
      expect(screen.getByText('Sin actividad reciente')).toBeInTheDocument();
    });
  });

  it('GamificationContext defaults to level 1 / 0 XP for new student', async () => {
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
  beforeEach(() => { vi.clearAllMocks(); });

  it('GamificationContext keeps defaults when APIs reject', async () => {
    mockGetProfile.mockRejectedValue(new Error('Network error'));
    mockGetStreakStatus.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.totalXp).toBe(0);
    expect(result.current.level).toBe(1);
    expect(result.current.streak).toBeNull();
  });

  it('triggerBadgeCheck gracefully handles API error', async () => {
    mockGetProfile.mockResolvedValue(makeProfile());
    mockGetStreakStatus.mockResolvedValue(makeStreakStatus());
    mockCheckBadges.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useGamification(), {
      wrapper: GamificationWrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Should not throw
    await act(async () => { await result.current.triggerBadgeCheck(); });

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
// TEST 11: BadgeShowcase renders earned/unearned badges
// ══════════════════════════════════════════════════════════════

describe('BadgeShowcase — renders badge grid', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('displays earned and locked badges with counter', async () => {
    mockGetBadges.mockResolvedValue({
      badges: [
        makeBadge({ id: 'b1', name: 'Primer Paso', earned: true, rarity: 'common' }),
        makeBadge({ id: 'b2', name: 'Racha Ardiente', earned: true, rarity: 'rare' }),
        makeBadge({ id: 'b3', name: 'Cerebro', earned: false, earned_at: null, rarity: 'epic' }),
      ],
      total: 3,
      earned_count: 2,
    });

    render(<BadgeShowcase institutionId="inst-001" />);

    await waitFor(() => expect(screen.getByText('Logros')).toBeInTheDocument());

    expect(screen.getByText('2/3')).toBeInTheDocument();
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
      <LevelUpCelebration newLevel={5} previousLevel={4} show={true} onClose={onClose} />,
    );

    expect(screen.getByText('Nivel 5!')).toBeInTheDocument();
    expect(screen.getByText('Subiste del nivel 4 al 5')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Continuar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when show is false', () => {
    const onClose = vi.fn();

    const { container } = render(
      <LevelUpCelebration newLevel={3} previousLevel={2} show={false} onClose={onClose} />,
    );

    expect(container.innerHTML).toBe('');
  });
});
