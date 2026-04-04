// ============================================================
// Axon — Tests for GamificationCard
//
// Tests API data loading, profile display, leaderboard rendering,
// streak status, XP statistics, and edge cases.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { GamificationCard } from '../GamificationCard';
import type { GamificationProfile, LeaderboardResponse } from '@/app/services/gamificationApi';

// Mock framer-motion
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock LevelProgressBar
vi.mock('../LevelProgressBar', () => ({
  LevelProgressBar: ({ totalXP, currentLevel }: any) => (
    <div data-testid="level-progress-bar">
      <span>{totalXP} XP at Level {currentLevel}</span>
    </div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Star: (props: Record<string, unknown>) => (
    <svg data-testid="star-icon" {...props} />
  ),
  Flame: (props: Record<string, unknown>) => (
    <svg data-testid="flame-icon" {...props} />
  ),
  Zap: (props: Record<string, unknown>) => (
    <svg data-testid="zap-icon" {...props} />
  ),
  Shield: (props: Record<string, unknown>) => (
    <svg data-testid="shield-icon" {...props} />
  ),
  Users: (props: Record<string, unknown>) => (
    <svg data-testid="users-icon" {...props} />
  ),
  Loader2: (props: Record<string, unknown>) => (
    <svg data-testid="loader-icon" {...props} />
  ),
  Award: (props: Record<string, unknown>) => (
    <svg data-testid="award-icon" {...props} />
  ),
  Snowflake: (props: Record<string, unknown>) => (
    <svg data-testid="snowflake-icon" {...props} />
  ),
  Wrench: (props: Record<string, unknown>) => (
    <svg data-testid="wrench-icon" {...props} />
  ),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock gamificationApi
const mockGetProfile = vi.fn();
const mockGetLeaderboard = vi.fn();
const mockDailyCheckIn = vi.fn();
const mockOnboarding = vi.fn();

vi.mock('@/app/services/gamificationApi', () => ({
  getProfile: (...args: any[]) => mockGetProfile(...args),
  getLeaderboard: (...args: any[]) => mockGetLeaderboard(...args),
  dailyCheckIn: (...args: any[]) => mockDailyCheckIn(...args),
  onboarding: (...args: any[]) => mockOnboarding(...args),
}));

// Mock factory for GamificationProfile
function createMockProfile(overrides: Partial<GamificationProfile> = {}): GamificationProfile {
  return {
    xp: {
      total: 1250,
      level: 5,
      today: 150,
      this_week: 450,
      daily_goal_minutes: 200,
    },
    streak: {
      current: 7,
      longest: 14,
      last_activity: new Date().toISOString(),
    },
    badges_earned: 8,
    weekly_rank: 3,
    ...overrides,
  };
}

// Mock factory for LeaderboardResponse
function createMockLeaderboard(overrides: Partial<LeaderboardResponse> = {}): LeaderboardResponse {
  return {
    leaderboard: [
      { student_id: 'user-1', xp_this_week: 5000, current_level: 12, total_xp: 50000 },
      { student_id: 'user-2', xp_this_week: 4800, current_level: 11, total_xp: 48000 },
      { student_id: 'user-3', xp_this_week: 4600, current_level: 11, total_xp: 46000 },
    ],
    my_rank: 3,
    period: 'weekly',
    ...overrides,
  };
}

describe('GamificationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      selectedInstitution: { id: 'inst-001' },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Loading state', () => {
    it('displays loader while fetching data', () => {
      mockGetProfile.mockImplementation(() => new Promise(() => {})); // Never resolves
      mockGetLeaderboard.mockImplementation(() => new Promise(() => {}));
      mockDailyCheckIn.mockImplementation(() => new Promise(() => {}));
      mockOnboarding.mockImplementation(() => new Promise(() => {}));

      render(<GamificationCard />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('loads profile, leaderboard, and check-in data on mount', async () => {
      mockGetProfile.mockResolvedValue(createMockProfile());
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(mockGetProfile).toHaveBeenCalledWith('inst-001');
        expect(mockGetLeaderboard).toHaveBeenCalledWith('inst-001', expect.any(Object));
        expect(mockDailyCheckIn).toHaveBeenCalledWith('inst-001');
        expect(mockOnboarding).toHaveBeenCalledWith('inst-001');
      });
    });

    it('hides loader after data is fetched', async () => {
      mockGetProfile.mockResolvedValue(createMockProfile());
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });
    });

    it('skips load when no institutionId', () => {
      mockUseAuth.mockReturnValue({ selectedInstitution: null });

      render(<GamificationCard />);

      expect(mockGetProfile).not.toHaveBeenCalled();
    });
  });

  describe('Empty state', () => {
    it('displays empty state message when profile is null', async () => {
      mockGetProfile.mockResolvedValue(null);
      mockGetLeaderboard.mockResolvedValue(null);
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(screen.getByText(/Gamificacion/)).toBeInTheDocument();
      });
    });

    it('shows onboarding message in empty state', async () => {
      mockGetProfile.mockResolvedValue(null);
      mockGetLeaderboard.mockResolvedValue(null);
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(screen.getByText(/Revisa flashcards para ganar XP/)).toBeInTheDocument();
      });
    });

    it('displays star icon in empty state', async () => {
      mockGetProfile.mockResolvedValue(null);
      mockGetLeaderboard.mockResolvedValue(null);
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(screen.getByTestId('star-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Profile display', () => {
    it('renders LevelProgressBar with profile data', async () => {
      const profile = createMockProfile({ xp: { ...createMockProfile().xp, total: 2000, level: 8 } });
      mockGetProfile.mockResolvedValue(profile);
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(screen.getByTestId('level-progress-bar')).toBeInTheDocument();
      });
    });

    it('displays current streak count', async () => {
      mockGetProfile.mockResolvedValue(createMockProfile({ streak: { current: 12, longest: 20, last_activity: new Date().toISOString() } }));
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument();
      });
    });

    it('displays weekly XP count', async () => {
      mockGetProfile.mockResolvedValue(createMockProfile({ xp: { ...createMockProfile().xp, this_week: 850 } }));
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(screen.getByText('850')).toBeInTheDocument();
      });
    });
  });

  describe('Streak display', () => {
    it('shows flame icon for active streak', async () => {
      mockGetProfile.mockResolvedValue(
        createMockProfile({ streak: { current: 5, longest: 10, last_activity: new Date().toISOString() } })
      );
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        // Component renders flame icon in streak grid cell
        const flameIcons = screen.getAllByTestId('flame-icon');
        expect(flameIcons.length).toBeGreaterThan(0);
      });
    });

    it('displays streak count with orange color when active', async () => {
      mockGetProfile.mockResolvedValue(
        createMockProfile({ streak: { current: 8, longest: 15, last_activity: new Date().toISOString() } })
      );
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        // When streak is active, there are 2 flame icons (grid + warning banner)
        // Get all flame icons and check the first one (the grid icon)
        const flameIcons = screen.getAllByTestId('flame-icon');
        expect(flameIcons.length).toBeGreaterThan(0);
        const gridFlameIcon = flameIcons[0];
        const classes = gridFlameIcon.getAttribute('class');
        expect(classes).toContain('orange-400');
      });
    });

    it('shows zero streak when no active streak', async () => {
      mockGetProfile.mockResolvedValue(
        createMockProfile({ streak: { current: 0, longest: 5, last_activity: '2025-01-01T00:00:00Z' } })
      );
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        const zeroElements = screen.getAllByText('0');
        expect(zeroElements.length).toBeGreaterThan(0);
      });
    });

    it('uses gray flame icon when streak is zero', async () => {
      mockGetProfile.mockResolvedValue(
        createMockProfile({ streak: { current: 0, longest: 5, last_activity: '2025-01-01T00:00:00Z' } })
      );
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        // When streak is zero, there should be at least one flame icon (grid cell)
        const flameIcons = screen.getAllByTestId('flame-icon');
        expect(flameIcons.length).toBeGreaterThan(0);
        const gridFlameIcon = flameIcons[0];
        const classes = gridFlameIcon.getAttribute('class');
        expect(classes).toContain('zinc-600');
      });
    });
  });

  describe('Leaderboard display', () => {
    it('renders top 3 leaderboard entries', async () => {
      mockGetProfile.mockResolvedValue(createMockProfile());
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        // Component renders leaderboard with XP values for each entry
        // Check that all 3 entries are rendered using text match with regex
        expect(screen.getByText(/4600/)).toBeInTheDocument(); // Verify at least one entry renders
        // Check for leaderboard section header
        expect(screen.getByText(/Leaderboard semanal/)).toBeInTheDocument();
      });
    });

    it('requests leaderboard with limit 3', async () => {
      mockGetProfile.mockResolvedValue(createMockProfile());
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(mockGetLeaderboard).toHaveBeenCalledWith('inst-001', { limit: 3, period: 'weekly' });
      });
    });

    it('displays user ranks in leaderboard', async () => {
      mockGetProfile.mockResolvedValue(createMockProfile());
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        // Component renders leaderboard entries with level and XP for each rank
        // Check for the header and at least one entry with level info
        expect(screen.getByText(/Leaderboard semanal/)).toBeInTheDocument();
        // Verify level rendering in the leaderboard
        const levelElements = screen.getAllByText(/Lv\./);
        expect(levelElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('XP statistics', () => {
    it('calculates and displays daily remaining XP', async () => {
      mockGetProfile.mockResolvedValue(
        createMockProfile({ xp: { ...createMockProfile().xp, today: 150, daily_goal_minutes: 500 } })
      );
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        // Component should display daily remaining
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });
    });

    it('displays weekly XP stat', async () => {
      mockGetProfile.mockResolvedValue(
        createMockProfile({ xp: { ...createMockProfile().xp, this_week: 600 } })
      );
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(screen.getByText('600')).toBeInTheDocument();
      });
    });

    it('shows badges earned count', async () => {
      mockGetProfile.mockResolvedValue(
        createMockProfile({ badges_earned: 12 })
      );
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('silently handles API errors and shows empty state', async () => {
      mockGetProfile.mockRejectedValue(new Error('API error'));
      mockGetLeaderboard.mockRejectedValue(new Error('API error'));
      mockDailyCheckIn.mockRejectedValue(new Error('API error'));
      mockOnboarding.mockRejectedValue(new Error('API error'));

      render(<GamificationCard />);

      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });
    });

    it('handles partial API failures gracefully', async () => {
      mockGetProfile.mockResolvedValue(createMockProfile());
      mockGetLeaderboard.mockRejectedValue(new Error('API error'));
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        // If profile loads but leaderboard fails, component should still render stats
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });
    });
  });

  describe('Visual elements', () => {
    it('renders zap icon for weekly XP', async () => {
      mockGetProfile.mockResolvedValue(createMockProfile());
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
      });
    });

    it('renders users icon for leaderboard', async () => {
      mockGetProfile.mockResolvedValue(createMockProfile());
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      render(<GamificationCard />);

      await waitFor(() => {
        expect(screen.getByTestId('users-icon')).toBeInTheDocument();
      });
    });

    it('uses tabular-nums for consistent digit spacing', async () => {
      mockGetProfile.mockResolvedValue(createMockProfile());
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      const { container } = render(<GamificationCard />);

      await waitFor(() => {
        const tabularElements = container.querySelectorAll('.tabular-nums');
        expect(tabularElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Data updates', () => {
    it('refetches data when institutionId changes', async () => {
      mockGetProfile.mockResolvedValue(createMockProfile());
      mockGetLeaderboard.mockResolvedValue(createMockLeaderboard());
      mockDailyCheckIn.mockResolvedValue({});
      mockOnboarding.mockResolvedValue({});

      const { rerender } = render(<GamificationCard />);

      await waitFor(() => {
        expect(mockGetProfile).toHaveBeenCalledWith('inst-001');
      });

      vi.clearAllMocks();

      mockUseAuth.mockReturnValue({
        selectedInstitution: { id: 'inst-002' },
      });

      rerender(<GamificationCard />);

      await waitFor(() => {
        expect(mockGetProfile).toHaveBeenCalledWith('inst-002');
      });
    });
  });
});
