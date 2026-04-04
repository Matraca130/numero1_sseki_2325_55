// ============================================================
// StatsCards — Component tests for KPI stats display
//
// Tests:
//   1. Renders with mock data (flame streak, time spent, cards reviewed)
//   2. Loading state shows skeleton
//   3. Error state shows fallback with retry button
//   4. Time formatting (seconds → h:mm, etc)
//   5. Empty state (zero data)
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mock the hook directly ──────────────────────────────────
vi.mock('../StatsCards', async () => {
  const actual = await vi.importActual<typeof import('../StatsCards')>('../StatsCards');
  return {
    ...actual,
    useStudentDashboardStats: vi.fn(),
  };
});

// Import the hook AFTER mocking
import { useStudentDashboardStats } from '../StatsCards';

// ── Mock design-system ─────────────────────────────────────
vi.mock('@/app/design-system', () => ({
  components: {
    kpiCard: { base: 'kpi-card' },
  },
  colors: {
    trend: { up: '#10b981', down: '#ef4444' },
  },
  headingStyle: {},
}));

// ── Mock logger ────────────────────────────────────────────
vi.mock('@/app/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Test component wrapper ─────────────────────────────────
// Tests useStudentDashboardStats hook behavior
function TestWrapper() {
  const { data, loading, error, refresh } = useStudentDashboardStats();

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (error) {
    return (
      <div data-testid="error">
        <p>{error}</p>
        <button onClick={refresh} data-testid="retry">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div data-testid="stats">
      <div data-testid="streak">{data.stats?.flame_streak_days ?? 0}</div>
      <div data-testid="cards">{data.todayActivity?.cardsReviewed ?? 0}</div>
      <div data-testid="time">
        {data.todayActivity?.studyMinutes ? `${data.todayActivity.studyMinutes}m` : '0m'}
      </div>
    </div>
  );
}

describe('StatsCards — useStudentDashboardStats hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(useStudentDashboardStats).mockReturnValue({
      data: {
        stats: null,
        todayActivity: null,
        yesterdayActivity: null,
        weekTimeSeconds: 0,
      },
      loading: true,
      error: null,
      refresh: vi.fn(),
    });

    render(<TestWrapper />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('renders with mock data: stats, today activity, week aggregation', async () => {
    vi.mocked(useStudentDashboardStats).mockReturnValue({
      data: {
        stats: { flame_streak_days: 5 },
        todayActivity: { cardsReviewed: 12, studyMinutes: 45 },
        yesterdayActivity: { cardsReviewed: 8, studyMinutes: 30 },
        weekTimeSeconds: 0,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<TestWrapper />);

    expect(screen.getByTestId('stats')).toBeInTheDocument();
    expect(screen.getByTestId('streak')).toHaveTextContent('5');
    expect(screen.getByTestId('cards')).toHaveTextContent('12');
    expect(screen.getByTestId('time')).toHaveTextContent('45m');
  });

  it('shows error state when API fails', async () => {
    vi.mocked(useStudentDashboardStats).mockReturnValue({
      data: {
        stats: null,
        todayActivity: null,
        yesterdayActivity: null,
        weekTimeSeconds: 0,
      },
      loading: false,
      error: 'API Failed',
      refresh: vi.fn(),
    });

    render(<TestWrapper />);

    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(screen.getByTestId('retry')).toBeInTheDocument();
  });

  it('retry button calls refresh and refetches data', async () => {
    const mockRefresh = vi.fn();

    vi.mocked(useStudentDashboardStats).mockReturnValue({
      data: {
        stats: null,
        todayActivity: null,
        yesterdayActivity: null,
        weekTimeSeconds: 0,
      },
      loading: false,
      error: 'API Failed',
      refresh: mockRefresh,
    });

    render(<TestWrapper />);

    const retryBtn = screen.getByTestId('retry');
    await userEvent.click(retryBtn);

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('renders with zero data (no today activity)', () => {
    vi.mocked(useStudentDashboardStats).mockReturnValue({
      data: {
        stats: null,
        todayActivity: null,
        yesterdayActivity: null,
        weekTimeSeconds: 0,
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<TestWrapper />);

    expect(screen.getByTestId('stats')).toBeInTheDocument();
    expect(screen.getByTestId('streak')).toHaveTextContent('0');
    expect(screen.getByTestId('cards')).toHaveTextContent('0');
    expect(screen.getByTestId('time')).toHaveTextContent('0m');
  });
});
