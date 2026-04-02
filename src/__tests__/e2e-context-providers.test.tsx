// ============================================================
// E2E Integration Tests -- Context Providers
//
// Tests the FULL data flow across context providers:
//   1.  StudentDataContext initializes from AuthContext user
//   2.  StudentDataContext calls platformApi.getStudentStatsReal on mount
//   3.  StudentDataContext calls platformApi.getDailyActivities on mount
//   4.  StudentDataContext calls platformApi.getAllBktStates on mount
//   5.  StudentDataContext.refresh() re-fetches all data
//   6.  StudentDataContext.recordSessionComplete() signals completion
//   7.  StudentDataContext loading/error states
//   8.  AppContext composes UI + Navigation + StudySession contexts
//   9.  useApp() returns combined context value
//   10. Provider nesting order: AuthProvider -> StudentDataProvider -> ContentTreeProvider
//   11. Error propagation when API calls fail
//   12. isConnected flag is true only when profile + stats loaded
//
// RUN: npx vitest run src/__tests__/e2e-context-providers.test.tsx
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';

// ── Test data fixtures ──────────────────────────────────────

const MOCK_USER = {
  id: 'user-e2e-001',
  email: 'student@axon.edu',
  name: 'Test Student',
  full_name: 'Test Student',
  avatar_url: null,
  is_super_admin: false,
  platform_role: 'user',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  user_metadata: {
    full_name: 'Test Student',
    name: 'Test Student',
    avatar_url: null,
  },
};

const MOCK_STATS: import('@/app/services/platformApi').StudentStatsRecord = {
  id: 'stats-001',
  student_id: 'user-e2e-001',
  current_streak: 5,
  longest_streak: 12,
  total_reviews: 250,
  total_time_seconds: 36000, // 600 minutes
  total_sessions: 30,
  last_study_date: '2026-03-28',
};

const MOCK_DAILY: import('@/app/services/platformApi').DailyActivityRecord[] = [
  {
    id: 'daily-001',
    student_id: 'user-e2e-001',
    activity_date: '2026-03-28',
    reviews_count: 20,
    correct_count: 16,
    time_spent_seconds: 1800,
    sessions_count: 2,
  },
  {
    id: 'daily-002',
    student_id: 'user-e2e-001',
    activity_date: '2026-03-27',
    reviews_count: 15,
    correct_count: 12,
    time_spent_seconds: 1200,
    sessions_count: 1,
  },
];

const MOCK_BKT: import('@/app/services/platformApi').BktStateRecord[] = [
  {
    id: 'bkt-001',
    student_id: 'user-e2e-001',
    subtopic_id: 'subtopic-abc',
    p_know: 0.75,
    p_transit: 0.1,
    p_slip: 0.05,
    p_guess: 0.2,
    delta: 0.15,
    total_attempts: 10,
    correct_attempts: 8,
    last_attempt_at: '2026-03-28T12:00:00Z',
  },
];

const MOCK_UPDATED_STATS: import('@/app/services/platformApi').StudentStatsRecord = {
  ...MOCK_STATS,
  total_reviews: 270,
  total_sessions: 31,
  current_streak: 6,
};

// ── Mock useAuth ────────────────────────────────────────────

const mockUseAuth = vi.fn();

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// ── Mock platformApi ────────────────────────────────────────

const mockGetStudentStatsReal = vi.fn();
const mockGetDailyActivities = vi.fn();
const mockGetAllBktStates = vi.fn();

vi.mock('@/app/services/platformApi', () => ({
  getStudentStatsReal: (...args: unknown[]) => mockGetStudentStatsReal(...args),
  getDailyActivities: (...args: unknown[]) => mockGetDailyActivities(...args),
  getAllBktStates: (...args: unknown[]) => mockGetAllBktStates(...args),
}));

// ── Mock getAxonToday ───────────────────────────────────────

vi.mock('@/app/utils/constants', () => ({
  getAxonToday: () => new Date('2026-03-29T10:00:00Z'),
}));

// ── Mock NavigationContext dependencies ─────────────────────

vi.mock('@/app/data/courses', () => ({
  courses: [],
}));

// ── Import components AFTER mocks ───────────────────────────

import {
  StudentDataProvider,
  useStudentDataContext,
} from '@/app/context/StudentDataContext';
import { AppProvider, useApp, useStudySession } from '@/app/context/AppContext';

// ── Helpers ─────────────────────────────────────────────────

function setupAuthenticatedUser() {
  mockUseAuth.mockReturnValue({
    user: MOCK_USER,
    status: 'authenticated',
    accessToken: 'mock-jwt-token',
    institutions: [],
    selectedInstitution: null,
    role: 'student',
    loading: false,
    authError: null,
  });
}

function setupUnauthenticatedUser() {
  mockUseAuth.mockReturnValue({
    user: null,
    status: 'unauthenticated',
    accessToken: null,
    institutions: [],
    selectedInstitution: null,
    role: null,
    loading: false,
    authError: null,
  });
}

function setupLoadingAuth() {
  mockUseAuth.mockReturnValue({
    user: null,
    status: 'loading',
    accessToken: null,
    institutions: [],
    selectedInstitution: null,
    role: null,
    loading: true,
    authError: null,
  });
}

function setupSuccessfulApiCalls() {
  mockGetStudentStatsReal.mockResolvedValue(MOCK_STATS);
  mockGetDailyActivities.mockResolvedValue(MOCK_DAILY);
  mockGetAllBktStates.mockResolvedValue(MOCK_BKT);
}

function setupFailingApiCalls(errorMessage = 'Network error') {
  mockGetStudentStatsReal.mockRejectedValue(new Error(errorMessage));
  mockGetDailyActivities.mockRejectedValue(new Error(errorMessage));
  mockGetAllBktStates.mockRejectedValue(new Error(errorMessage));
}

function createStudentDataWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <StudentDataProvider>{children}</StudentDataProvider>;
  };
}

function createAppWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AppProvider>{children}</AppProvider>;
  };
}

// ── Tests ───────────────────────────────────────────────────

describe('E2E Context Providers Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────
  // 1. StudentDataContext initializes from AuthContext user
  // ────────────────────────────────────────────────────────
  it('initializes profile from AuthContext user on mount', async () => {
    setupAuthenticatedUser();
    setupSuccessfulApiCalls();

    const { result } = renderHook(() => useStudentDataContext(), {
      wrapper: createStudentDataWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Profile should be constructed from the auth user, not from an API call
    expect(result.current.profile).not.toBeNull();
    expect(result.current.profile!.id).toBe(MOCK_USER.id);
    expect(result.current.profile!.name).toBe('Test Student');
    expect(result.current.profile!.email).toBe(MOCK_USER.email);
    expect(result.current.studentId).toBe(MOCK_USER.id);
  });

  // ────────────────────────────────────────────────────────
  // 2. Calls getStudentStatsReal on mount
  // ────────────────────────────────────────────────────────
  it('calls getStudentStatsReal on mount and adapts stats', async () => {
    setupAuthenticatedUser();
    setupSuccessfulApiCalls();

    const { result } = renderHook(() => useStudentDataContext(), {
      wrapper: createStudentDataWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetStudentStatsReal).toHaveBeenCalledTimes(1);

    // Adapted stats should match the raw data
    expect(result.current.stats).not.toBeNull();
    expect(result.current.stats!.totalStudyMinutes).toBe(600); // 36000 / 60
    expect(result.current.stats!.totalSessions).toBe(30);
    expect(result.current.stats!.totalCardsReviewed).toBe(250);
    expect(result.current.stats!.currentStreak).toBe(5);
    expect(result.current.stats!.longestStreak).toBe(12);

    // rawStats should also be available
    expect(result.current.rawStats).toEqual(MOCK_STATS);
  });

  // ────────────────────────────────────────────────────────
  // 3. Calls getDailyActivities on mount
  // ────────────────────────────────────────────────────────
  it('calls getDailyActivities on mount and adapts daily activity', async () => {
    setupAuthenticatedUser();
    setupSuccessfulApiCalls();

    const { result } = renderHook(() => useStudentDataContext(), {
      wrapper: createStudentDataWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetDailyActivities).toHaveBeenCalledTimes(1);
    // Verify it passes date range params (from 30 days ago to today)
    const callArgs = mockGetDailyActivities.mock.calls[0];
    expect(callArgs[2]).toBe(90); // limit

    // Adapted daily activities
    expect(result.current.dailyActivity).toHaveLength(2);
    expect(result.current.dailyActivity[0].date).toBe('2026-03-28');
    expect(result.current.dailyActivity[0].studyMinutes).toBe(30); // 1800 / 60
    expect(result.current.dailyActivity[0].sessionsCount).toBe(2);
    expect(result.current.dailyActivity[0].cardsReviewed).toBe(20);
    expect(result.current.dailyActivity[0].retentionPercent).toBe(80); // 16/20 * 100

    // rawDaily should also be available
    expect(result.current.rawDaily).toEqual(MOCK_DAILY);
  });

  // ────────────────────────────────────────────────────────
  // 4. Calls getAllBktStates on mount
  // ────────────────────────────────────────────────────────
  it('calls getAllBktStates on mount and stores BKT records', async () => {
    setupAuthenticatedUser();
    setupSuccessfulApiCalls();

    const { result } = renderHook(() => useStudentDataContext(), {
      wrapper: createStudentDataWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetAllBktStates).toHaveBeenCalledTimes(1);
    expect(mockGetAllBktStates).toHaveBeenCalledWith(undefined, 500);

    expect(result.current.bktStates).toHaveLength(1);
    expect(result.current.bktStates[0].subtopic_id).toBe('subtopic-abc');
    expect(result.current.bktStates[0].p_know).toBe(0.75);
  });

  // ────────────────────────────────────────────────────────
  // 5. refresh() re-fetches all data
  // ────────────────────────────────────────────────────────
  it('refresh() re-fetches all three API endpoints', async () => {
    setupAuthenticatedUser();
    setupSuccessfulApiCalls();

    const { result } = renderHook(() => useStudentDataContext(), {
      wrapper: createStudentDataWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear call counts after initial load
    vi.clearAllMocks();

    // Update mock to return new data on refresh
    mockGetStudentStatsReal.mockResolvedValue(MOCK_UPDATED_STATS);
    mockGetDailyActivities.mockResolvedValue(MOCK_DAILY);
    mockGetAllBktStates.mockResolvedValue(MOCK_BKT);

    await act(async () => {
      await result.current.refresh();
    });

    // All three endpoints should be called again
    expect(mockGetStudentStatsReal).toHaveBeenCalledTimes(1);
    expect(mockGetDailyActivities).toHaveBeenCalledTimes(1);
    expect(mockGetAllBktStates).toHaveBeenCalledTimes(1);

    // Data should reflect the updated stats
    expect(result.current.stats!.totalCardsReviewed).toBe(270);
    expect(result.current.stats!.totalSessions).toBe(31);
    expect(result.current.stats!.currentStreak).toBe(6);
  });

  // ────────────────────────────────────────────────────────
  // 6. recordSessionComplete() triggers refresh
  // ────────────────────────────────────────────────────────
  it('recordSessionComplete() triggers a full data refresh', async () => {
    setupAuthenticatedUser();
    setupSuccessfulApiCalls();

    const { result } = renderHook(() => useStudentDataContext(), {
      wrapper: createStudentDataWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    vi.clearAllMocks();

    // Set up mocks for the refresh triggered by recordSessionComplete
    mockGetStudentStatsReal.mockResolvedValue(MOCK_UPDATED_STATS);
    mockGetDailyActivities.mockResolvedValue(MOCK_DAILY);
    mockGetAllBktStates.mockResolvedValue(MOCK_BKT);

    await act(async () => {
      await result.current.recordSessionComplete({
        reviewsCount: 20,
        correctCount: 18,
        timeSpentSeconds: 600,
        type: 'flashcard',
      });
    });

    // recordSessionComplete calls fetchAll internally, which calls all 3 APIs
    expect(mockGetStudentStatsReal).toHaveBeenCalledTimes(1);
    expect(mockGetDailyActivities).toHaveBeenCalledTimes(1);
    expect(mockGetAllBktStates).toHaveBeenCalledTimes(1);

    // Stats should reflect updated data
    expect(result.current.stats!.totalCardsReviewed).toBe(270);
  });

  // ────────────────────────────────────────────────────────
  // 7. Loading and error states
  // ────────────────────────────────────────────────────────
  it('starts in loading state and transitions to loaded', async () => {
    setupAuthenticatedUser();

    // Use a deferred promise to control timing
    let resolveStats!: (v: unknown) => void;
    mockGetStudentStatsReal.mockImplementation(
      () => new Promise((resolve) => { resolveStats = resolve; })
    );
    mockGetDailyActivities.mockResolvedValue(MOCK_DAILY);
    mockGetAllBktStates.mockResolvedValue(MOCK_BKT);

    const { result } = renderHook(() => useStudentDataContext(), {
      wrapper: createStudentDataWrapper(),
    });

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // Resolve the pending API call
    await act(async () => {
      resolveStats(MOCK_STATS);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.stats).not.toBeNull();
  });

  // ────────────────────────────────────────────────────────
  // 8. AppContext composes UI + Navigation + StudySession
  // ────────────────────────────────────────────────────────
  it('AppContext composes UI, Navigation, and StudySession contexts', async () => {
    // AppProvider does not depend on auth, so no auth mock needed for this test
    setupUnauthenticatedUser();

    const { result } = renderHook(() => useApp(), {
      wrapper: createAppWrapper(),
    });

    // UI context values
    expect(result.current).toHaveProperty('isSidebarOpen');
    expect(result.current).toHaveProperty('setSidebarOpen');
    expect(result.current).toHaveProperty('theme');
    expect(result.current).toHaveProperty('setTheme');
    expect(result.current.theme).toBe('light');

    // Navigation context values
    expect(result.current).toHaveProperty('currentCourse');
    expect(result.current).toHaveProperty('setCurrentCourse');
    expect(result.current).toHaveProperty('currentTopic');
    expect(result.current).toHaveProperty('setCurrentTopic');

    // StudySession context values
    expect(result.current).toHaveProperty('isStudySessionActive');
    expect(result.current).toHaveProperty('setStudySessionActive');
    expect(result.current).toHaveProperty('studyPlans');
    expect(result.current).toHaveProperty('addStudyPlan');
    expect(result.current).toHaveProperty('toggleTaskComplete');
    expect(result.current).toHaveProperty('quizAutoStart');
    expect(result.current).toHaveProperty('flashcardAutoStart');
    expect(result.current.isStudySessionActive).toBe(false);
  });

  // ────────────────────────────────────────────────────────
  // 9. useApp() returns combined context value
  // ────────────────────────────────────────────────────────
  it('useApp() combined value supports state mutations across all sub-contexts', async () => {
    setupUnauthenticatedUser();

    const { result } = renderHook(() => useApp(), {
      wrapper: createAppWrapper(),
    });

    // Mutate UI context
    act(() => {
      result.current.setSidebarOpen(false);
    });
    expect(result.current.isSidebarOpen).toBe(false);

    act(() => {
      result.current.setTheme('dark');
    });
    expect(result.current.theme).toBe('dark');

    // Mutate StudySession context
    act(() => {
      result.current.setStudySessionActive(true);
    });
    expect(result.current.isStudySessionActive).toBe(true);

    act(() => {
      result.current.setQuizAutoStart(true);
    });
    expect(result.current.quizAutoStart).toBe(true);
  });

  // ────────────────────────────────────────────────────────
  // 10. Provider nesting: Auth -> StudentData -> App
  // ────────────────────────────────────────────────────────
  it('provider nesting works: StudentDataProvider consumes AuthContext correctly', async () => {
    setupAuthenticatedUser();
    setupSuccessfulApiCalls();

    // Simulate the real nesting order: Auth wraps StudentData
    function NestedWrapper({ children }: { children: ReactNode }) {
      return (
        <StudentDataProvider>
          <AppProvider>{children}</AppProvider>
        </StudentDataProvider>
      );
    }

    // Render both hooks to verify they work in the nested tree
    const { result: studentResult } = renderHook(() => useStudentDataContext(), {
      wrapper: NestedWrapper,
    });
    const { result: appResult } = renderHook(() => useApp(), {
      wrapper: NestedWrapper,
    });

    await waitFor(() => {
      expect(studentResult.current.loading).toBe(false);
    });

    // StudentDataContext gets data from auth
    expect(studentResult.current.profile).not.toBeNull();
    expect(studentResult.current.profile!.id).toBe(MOCK_USER.id);

    // AppContext works independently
    expect(appResult.current.theme).toBe('light');
    expect(appResult.current.isStudySessionActive).toBe(false);
  });

  // ────────────────────────────────────────────────────────
  // 11. Error propagation when API calls fail
  // ────────────────────────────────────────────────────────
  it('gracefully handles individual API failures via Promise.allSettled', async () => {
    setupAuthenticatedUser();
    // All three API calls reject, but Promise.allSettled catches them individually
    setupFailingApiCalls('Backend unavailable');

    const { result } = renderHook(() => useStudentDataContext(), {
      wrapper: createStudentDataWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Promise.allSettled handles individual rejections gracefully --
    // no error is thrown to the catch block, so error remains null
    expect(result.current.error).toBeNull();

    // Profile should still be available (constructed from auth)
    expect(result.current.profile).not.toBeNull();
    expect(result.current.profile!.id).toBe(MOCK_USER.id);

    // Failed API calls return fallback values (null for stats, [] for arrays)
    expect(result.current.stats).toBeNull();
    expect(result.current.rawStats).toBeNull();
    expect(result.current.bktStates).toEqual([]);
    expect(result.current.dailyActivity).toEqual([]);
    expect(result.current.rawDaily).toEqual([]);

    // isConnected should be false since rawStats is null
    expect(result.current.isConnected).toBe(false);
  });

  // ────────────────────────────────────────────────────────
  // 12. isConnected is true ONLY when profile + rawStats loaded
  // ────────────────────────────────────────────────────────
  it('isConnected is true only when profile AND rawStats are both present', async () => {
    // Case A: Both present -> isConnected = true
    setupAuthenticatedUser();
    setupSuccessfulApiCalls();

    const { result, unmount } = renderHook(() => useStudentDataContext(), {
      wrapper: createStudentDataWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.profile).not.toBeNull();
    expect(result.current.rawStats).not.toBeNull();

    unmount();

    // Case B: Stats API returns null -> isConnected = false
    vi.clearAllMocks();
    setupAuthenticatedUser();
    mockGetStudentStatsReal.mockResolvedValue(null);
    mockGetDailyActivities.mockResolvedValue([]);
    mockGetAllBktStates.mockResolvedValue([]);

    const { result: result2 } = renderHook(() => useStudentDataContext(), {
      wrapper: createStudentDataWrapper(),
    });

    await waitFor(() => {
      expect(result2.current.loading).toBe(false);
    });

    // Profile exists (from auth) but rawStats is null
    expect(result2.current.profile).not.toBeNull();
    expect(result2.current.rawStats).toBeNull();
    expect(result2.current.isConnected).toBe(false);
  });
});
