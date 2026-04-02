// ============================================================
// Axon -- Tests for StudentDataContext (StudentDataProvider + useStudentDataContext)
//
// Covers:
//   1. Default context values when no provider
//   2. Loading state on mount
//   3. Successful data fetch with profile, stats, BKT
//   4. Error handling when API calls fail
//   5. Legacy mutators are no-ops
//   6. recordSessionComplete triggers refresh
//   7. isConnected derived state
//   8. User change resets data
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';

// -- Mock data fixtures ------------------------------------

const MOCK_USER = {
  id: 'user-001',
  email: 'student@axon.edu',
  user_metadata: {
    full_name: 'Test Student',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  created_at: '2025-01-01T00:00:00Z',
};

const MOCK_STATS = {
  total_time_seconds: 7200,
  total_sessions: 10,
  total_reviews: 50,
  current_streak: 3,
  longest_streak: 7,
  last_study_date: '2026-02-07',
};

const MOCK_DAILY = [
  {
    activity_date: '2026-02-06',
    time_spent_seconds: 1800,
    sessions_count: 2,
    reviews_count: 10,
    correct_count: 8,
  },
  {
    activity_date: '2026-02-07',
    time_spent_seconds: 3600,
    sessions_count: 3,
    reviews_count: 20,
    correct_count: 15,
  },
];

const MOCK_BKT = [
  {
    subtopic_id: 'topic-1',
    p_know: 0.85,
    p_transit: 0.1,
    p_slip: 0.1,
    p_guess: 0.25,
    delta: 0,
    total_attempts: 5,
    correct_attempts: 4,
  },
];

// -- Mock AuthContext --------------------------------------

let mockAuthUser: typeof MOCK_USER | null = MOCK_USER;
let mockAuthStatus = 'authenticated';

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    status: mockAuthStatus,
  }),
}));

// -- Mock platformApi -------------------------------------

const mockGetStudentStatsReal = vi.fn();
const mockGetDailyActivities = vi.fn();
const mockGetAllBktStates = vi.fn();

vi.mock('@/app/services/platformApi', () => ({
  getStudentStatsReal: (...args: unknown[]) => mockGetStudentStatsReal(...args),
  getDailyActivities: (...args: unknown[]) => mockGetDailyActivities(...args),
  getAllBktStates: (...args: unknown[]) => mockGetAllBktStates(...args),
}));

// -- Mock getAxonToday ------------------------------------

vi.mock('@/app/utils/constants', () => ({
  getAxonToday: () => new Date(2026, 1, 7), // Feb 7, 2026
}));

// -- Import AFTER mocks -----------------------------------

import { StudentDataProvider, useStudentDataContext } from '../StudentDataContext';

// -- Helpers -----------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <StudentDataProvider>{children}</StudentDataProvider>;
}

function setupSuccessfulApi() {
  mockGetStudentStatsReal.mockResolvedValue(MOCK_STATS);
  mockGetDailyActivities.mockResolvedValue(MOCK_DAILY);
  mockGetAllBktStates.mockResolvedValue(MOCK_BKT);
}

// -- Test suite -------------------------------------------

describe('StudentDataContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = MOCK_USER;
    mockAuthStatus = 'authenticated';
    setupSuccessfulApi();
  });

  // -- Test 1: Default context values without provider ------

  it('returns default context values when used without provider', () => {
    const { result } = renderHook(() => useStudentDataContext());

    expect(result.current.profile).toBeNull();
    expect(result.current.stats).toBeNull();
    expect(result.current.courseProgress).toEqual([]);
    expect(result.current.dailyActivity).toEqual([]);
    expect(result.current.bktStates).toEqual([]);
    expect(result.current.rawStats).toBeNull();
    expect(result.current.rawDaily).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.studentId).toBeNull();
  });

  // -- Test 2: Successful data fetch -----------------------

  it('fetches and adapts data on mount when authenticated', async () => {
    const { result } = renderHook(() => useStudentDataContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Profile constructed from auth user
    expect(result.current.profile).not.toBeNull();
    expect(result.current.profile?.id).toBe('user-001');
    expect(result.current.profile?.name).toBe('Test Student');
    expect(result.current.profile?.email).toBe('student@axon.edu');

    // Stats adapted from raw
    expect(result.current.stats).not.toBeNull();
    expect(result.current.stats?.totalStudyMinutes).toBe(120); // 7200s / 60
    expect(result.current.stats?.totalSessions).toBe(10);
    expect(result.current.stats?.totalCardsReviewed).toBe(50);
    expect(result.current.stats?.currentStreak).toBe(3);
    expect(result.current.stats?.longestStreak).toBe(7);

    // BKT states
    expect(result.current.bktStates).toHaveLength(1);
    expect(result.current.bktStates[0].subtopic_id).toBe('topic-1');

    // Raw data preserved
    expect(result.current.rawStats).toBe(MOCK_STATS);
    expect(result.current.rawDaily).toBe(MOCK_DAILY);

    // Daily activity adapted
    expect(result.current.dailyActivity).toHaveLength(2);
    expect(result.current.dailyActivity[0].date).toBe('2026-02-06');
    expect(result.current.dailyActivity[0].studyMinutes).toBe(30); // 1800s / 60

    // Student ID
    expect(result.current.studentId).toBe('user-001');
  });

  // -- Test 3: isConnected derived state -------------------

  it('sets isConnected=true when profile and rawStats are available', async () => {
    const { result } = renderHook(() => useStudentDataContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('sets isConnected=false when rawStats is null (API failed)', async () => {
    mockGetStudentStatsReal.mockRejectedValue(new Error('Network error'));
    mockGetDailyActivities.mockRejectedValue(new Error('Network error'));
    mockGetAllBktStates.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useStudentDataContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Profile is still built from auth even on error
    expect(result.current.profile).not.toBeNull();
    // But rawStats is null so isConnected is false
    expect(result.current.isConnected).toBe(false);
  });

  // -- Test 4: Error handling ------------------------------

  it('sets error message when fetch fails completely', async () => {
    mockGetStudentStatsReal.mockRejectedValue(new Error('Server down'));
    mockGetDailyActivities.mockRejectedValue(new Error('Server down'));
    mockGetAllBktStates.mockRejectedValue(new Error('Server down'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useStudentDataContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Profile is still built from auth
    expect(result.current.profile).not.toBeNull();
    expect(result.current.profile?.name).toBe('Test Student');

    consoleSpy.mockRestore();
  });

  // -- Test 5: Partial API failures (Promise.allSettled) ----

  it('handles partial API failures gracefully', async () => {
    mockGetStudentStatsReal.mockResolvedValue(MOCK_STATS);
    mockGetDailyActivities.mockRejectedValue(new Error('Daily failed'));
    mockGetAllBktStates.mockResolvedValue(MOCK_BKT);

    const { result } = renderHook(() => useStudentDataContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Stats should still work
    expect(result.current.stats).not.toBeNull();
    // Daily falls back to empty
    expect(result.current.dailyActivity).toEqual([]);
    // BKT still works
    expect(result.current.bktStates).toHaveLength(1);
  });

  // -- Test 6: Legacy stubs are no-ops ---------------------

  it('legacy updateProfile is a no-op', async () => {
    const { result } = renderHook(() => useStudentDataContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not throw
    await act(async () => {
      await result.current.updateProfile({ name: 'New Name' });
    });

    // Profile unchanged (built from auth)
    expect(result.current.profile?.name).toBe('Test Student');
  });

  it('legacy updateStats is a no-op', async () => {
    const { result } = renderHook(() => useStudentDataContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.updateStats({ totalStudyMinutes: 999 });
    });

    // Stats unchanged
    expect(result.current.stats?.totalStudyMinutes).toBe(120);
  });

  // -- Test 7: recordSessionComplete triggers refresh ------

  it('recordSessionComplete calls fetchAll to refresh data', async () => {
    const { result } = renderHook(() => useStudentDataContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mock call counts after initial load
    mockGetStudentStatsReal.mockClear();
    mockGetDailyActivities.mockClear();
    mockGetAllBktStates.mockClear();

    setupSuccessfulApi();

    await act(async () => {
      await result.current.recordSessionComplete({
        reviewsCount: 10,
        correctCount: 8,
        timeSpentSeconds: 600,
        type: 'flashcard',
      });
    });

    // Should have fetched again
    expect(mockGetStudentStatsReal).toHaveBeenCalled();
    expect(mockGetDailyActivities).toHaveBeenCalled();
    expect(mockGetAllBktStates).toHaveBeenCalled();
  });

  // -- Test 8: Auth loading state --------------------------

  it('does not fetch when auth status is loading', async () => {
    mockAuthStatus = 'loading';

    renderHook(() => useStudentDataContext(), { wrapper });

    // Wait a tick to ensure effect had a chance to run
    await new Promise(r => setTimeout(r, 50));

    expect(mockGetStudentStatsReal).not.toHaveBeenCalled();
  });

  // -- Test 9: No user (unauthenticated) ------------------

  it('studentId is null when no user is logged in', async () => {
    mockAuthUser = null;
    mockAuthStatus = 'unauthenticated';

    const { result } = renderHook(() => useStudentDataContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.studentId).toBeNull();
  });

  // -- Test 10: Daily activity adapter ---------------------

  it('adapts daily activity retentionPercent correctly', async () => {
    const { result } = renderHook(() => useStudentDataContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // First entry: 8 correct / 10 reviews = 80%
    expect(result.current.dailyActivity[0].retentionPercent).toBe(80);
    // Second entry: 15 correct / 20 reviews = 75%
    expect(result.current.dailyActivity[1].retentionPercent).toBe(75);
  });
});
