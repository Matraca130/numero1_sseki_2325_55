// ============================================================
// Axon — Student Data Context v2 (Coordinator commit)
// ============================================================
// MIGRATION: studentApi → platformApi for stats/daily/bkt
// - Profile: constructed from AuthContext (no API call)
// - Stats: platformApi.getStudentStatsReal() + adaptStats()
// - DailyActivity: platformApi.getDailyActivities() + adapter
// - BKT States: platformApi.getAllBktStates() (NEW)
// - Legacy stubs: courseProgress=[], sessions=[], reviews=[]
// - Legacy mutators: noop with console.warn
//
// BACKWARDS COMPATIBLE: All 9 existing consumers keep working.
// NEW: bktStates, rawStats, recordSessionComplete
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { getAxonToday } from '@/app/utils/constants';

// ── Platform API (real backend) ──
import {
  getStudentStatsReal,
  getDailyActivities,
  getAllBktStates,
} from '@/app/services/platformApi';
import type {
  StudentStatsRecord,
  DailyActivityRecord,
  BktStateRecord,
} from '@/app/services/platformApi';

// ── Frontend types (unchanged) ──
import type {
  StudentProfile,
  StudentPreferences,
  StudentStats,
  CourseProgress,
  DailyActivity,
  StudySession,
  FlashcardReview,
} from '@/app/types/student';

// @refresh reset

// ────────────────────────────────────────────────────────────
// Adapters: backend records → frontend types
// ────────────────────────────────────────────────────────────

function adaptStats(
  raw: StudentStatsRecord | null,
  rawDaily: DailyActivityRecord[]
): StudentStats | null {
  if (!raw) return null;

  // Build weeklyActivity from daily activities (Mon=0 ... Sun=6)
  const weekActivity = [0, 0, 0, 0, 0, 0, 0];
  const now = getAxonToday();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  for (const d of rawDaily) {
    const date = new Date(d.activity_date + 'T00:00:00');
    if (date >= startOfWeek && date <= now) {
      const idx = (date.getDay() + 6) % 7; // Mon=0, Sun=6
      weekActivity[idx] += Math.round(d.time_spent_seconds / 60);
    }
  }

  const totalMinutes = Math.round(raw.total_time_seconds / 60);
  const totalSessions = raw.total_sessions ?? 0;
  const streakDays = raw.current_streak || 1;

  return {
    totalStudyMinutes: totalMinutes,
    totalSessions,
    totalCardsReviewed: raw.total_reviews,
    totalQuizzesCompleted: 0, // not tracked in student-stats table yet
    currentStreak: raw.current_streak,
    longestStreak: raw.longest_streak,
    averageDailyMinutes:
      totalSessions > 0 ? Math.round(totalMinutes / streakDays) : 0,
    lastStudyDate: raw.last_study_date || '',
    weeklyActivity: weekActivity,
  };
}

function adaptDailyActivities(raw: DailyActivityRecord[]): DailyActivity[] {
  return raw.map((r) => ({
    date: r.activity_date,
    studyMinutes: Math.round(r.time_spent_seconds / 60),
    sessionsCount: r.sessions_count,
    cardsReviewed: r.reviews_count,
    retentionPercent:
      r.correct_count > 0 && r.reviews_count > 0
        ? Math.round((r.correct_count / r.reviews_count) * 100)
        : undefined,
  }));
}

// ────────────────────────────────────────────────────────────
// Default preferences (used when constructing profile from auth)
// ────────────────────────────────────────────────────────────

const DEFAULT_PREFERENCES: StudentPreferences = {
  theme: 'light',
  language: 'pt-BR',
  dailyGoalMinutes: 60,
  notificationsEnabled: true,
  spacedRepetitionAlgorithm: 'fsrs',
};

// ────────────────────────────────────────────────────────────
// State & Context types
// ────────────────────────────────────────────────────────────

export interface StudentDataState {
  profile: StudentProfile | null;
  stats: StudentStats | null;
  courseProgress: CourseProgress[];
  dailyActivity: DailyActivity[];
  sessions: StudySession[];
  reviews: FlashcardReview[];
  // ── NEW (v2) ──
  bktStates: BktStateRecord[];
  rawStats: StudentStatsRecord | null;
}

interface StudentDataContextType extends StudentDataState {
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  /** The resolved student ID being used (real user or fallback) */
  studentId: string | null;
  refresh: () => Promise<void>;
  /** @deprecated Legacy — does nothing in v2 (no /seed endpoint) */
  seedAndLoad: () => Promise<void>;
  /** @deprecated Legacy — profile comes from AuthContext now */
  updateProfile: (data: Partial<StudentProfile>) => Promise<void>;
  /** @deprecated Legacy — stats come from platformApi now */
  updateStats: (data: Partial<StudentStats>) => Promise<void>;
  /** @deprecated Legacy — use recordSessionComplete instead */
  logSession: (data: Omit<StudySession, 'studentId'>) => Promise<void>;
  /** @deprecated Legacy — reviews are submitted via platformApi.submitReview */
  saveReviews: (reviews: FlashcardReview[]) => Promise<void>;
  // ── NEW (v2) ──
  /** Signals a session is complete; triggers data refresh (DB triggers handle writes) */
  recordSessionComplete: (session: {
    reviewsCount: number;
    correctCount: number;
    timeSpentSeconds: number;
    type: 'flashcard' | 'quiz' | 'reading';
  }) => Promise<void>;
}

// ────────────────────────────────────────────────────────────
// Context + defaults
// ────────────────────────────────────────────────────────────

const StudentDataContext = createContext<StudentDataContextType>({
  profile: null,
  stats: null,
  courseProgress: [],
  dailyActivity: [],
  sessions: [],
  reviews: [],
  bktStates: [],
  rawStats: null,
  loading: true,
  error: null,
  isConnected: false,
  studentId: null,
  refresh: async () => {},
  seedAndLoad: async () => {},
  updateProfile: async () => {},
  updateStats: async () => {},
  logSession: async () => {},
  saveReviews: async () => {},
  recordSessionComplete: async () => {},
});

// ────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────

export function StudentDataProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const userId = user?.id || undefined;

  const [data, setData] = useState<StudentDataState>({
    profile: null,
    stats: null,
    courseProgress: [],
    dailyActivity: [],
    sessions: [],
    reviews: [],
    bktStates: [],
    rawStats: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasAttemptedLoad = useRef(false);
  const lastLoadedUserId = useRef<string | undefined>(undefined);

  // ── Construct profile from AuthContext (no API call) ──
  const buildProfile = useCallback((): StudentProfile | null => {
    if (!user) return null;
    const meta = (user as any).user_metadata || {};
    return {
      id: user.id,
      name:
        meta.full_name ||
        meta.name ||
        (user.email ? user.email.split('@')[0] : 'Estudante'),
      email: user.email || '',
      avatarUrl: meta.avatar_url || undefined,
      enrolledCourseIds: [],
      createdAt: (user as any).created_at || getAxonToday().toISOString(),
      preferences: DEFAULT_PREFERENCES,
    };
  }, [user]);

  // ── Main data fetch (platformApi) ──
  const fetchAll = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const today = getAxonToday().toISOString().slice(0, 10);
      const thirtyDaysAgoDate = getAxonToday();
      thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);
      const thirtyDaysAgo = thirtyDaysAgoDate.toISOString().slice(0, 10);

      const [rawStatsResult, rawDailyResult, bktResult] =
        await Promise.allSettled([
          getStudentStatsReal(),
          getDailyActivities(thirtyDaysAgo, today, 90),
          getAllBktStates(undefined, 500),
        ]);

      const rawStats =
        rawStatsResult.status === 'fulfilled' ? rawStatsResult.value : null;
      const rawDaily =
        rawDailyResult.status === 'fulfilled' ? rawDailyResult.value : [];
      const bktStates =
        bktResult.status === 'fulfilled' ? bktResult.value : [];

      // Adapt to frontend types
      const stats = adaptStats(rawStats, rawDaily);
      const dailyActivity = adaptDailyActivities(rawDaily);
      const profile = buildProfile();

      setData({
        profile,
        stats,
        courseProgress: [], // computed from static content tree, not API
        dailyActivity,
        sessions: [], // legacy — use getStudySessions() directly
        reviews: [], // legacy — reviews submitted via platformApi.submitReview
        bktStates,
        rawStats,
      });

      setLoading(false);
      return !!profile;
    } catch (err: any) {
      console.error('[StudentDataContext] fetch error:', err);
      setError(err.message || 'Error loading student data');
      // Still set profile from auth even if API fails
      setData((prev) => ({
        ...prev,
        profile: buildProfile(),
      }));
      setLoading(false);
      return false;
    }
  }, [buildProfile]);

  // ── NEW: recordSessionComplete ──
  const recordSessionComplete = useCallback(
    async (_session: {
      reviewsCount: number;
      correctCount: number;
      timeSpentSeconds: number;
      type: 'flashcard' | 'quiz' | 'reading';
    }) => {
      // The DB triggers (trg_review_inserted + trg_study_session_completed)
      // handle all writes to student-stats and daily-activities tables.
      // We just need to refresh the data to reflect the updated state.
      console.log(
        '[StudentDataContext] Session complete, refreshing data...',
        _session.type
      );
      await fetchAll();
    },
    [fetchAll]
  );

  // ── Legacy mutator stubs (backwards compat, no-op) ──
  const seedAndLoad = useCallback(async () => {
    console.warn(
      '[StudentDataContext] seedAndLoad() is deprecated in v2. /seed endpoint does not exist in real backend.'
    );
    await fetchAll();
  }, [fetchAll]);

  const updateProfileFn = useCallback(
    async (_data: Partial<StudentProfile>) => {
      console.warn(
        '[StudentDataContext] updateProfile() is deprecated in v2. Profile is derived from AuthContext.'
      );
    },
    []
  );

  const updateStatsFn = useCallback(async (_data: Partial<StudentStats>) => {
    console.warn(
      '[StudentDataContext] updateStats() is deprecated in v2. Stats are managed by DB triggers.'
    );
  }, []);

  const logSessionFn = useCallback(
    async (_session: Omit<StudySession, 'studentId'>) => {
      console.warn(
        '[StudentDataContext] logSession() is deprecated in v2. Use recordSessionComplete() or platformApi.createStudySession().'
      );
    },
    []
  );

  const saveReviewsFn = useCallback(async (_reviews: FlashcardReview[]) => {
    console.warn(
      '[StudentDataContext] saveReviews() is deprecated in v2. Use platformApi.submitReview() directly.'
    );
  }, []);

  // ── Auto-load on auth change ──
  useEffect(() => {
    if (status === 'loading') return;

    // Reset on user change
    if (lastLoadedUserId.current !== userId) {
      setData({
        profile: null,
        stats: null,
        courseProgress: [],
        dailyActivity: [],
        sessions: [],
        reviews: [],
        bktStates: [],
        rawStats: null,
      });
      hasAttemptedLoad.current = false;
      lastLoadedUserId.current = userId;
    }

    async function init() {
      if (hasAttemptedLoad.current) return;
      hasAttemptedLoad.current = true;

      console.log(
        `[StudentDataContext] Loading data for user: ${userId || 'anonymous (fallback)'}`
      );
      try {
        await fetchAll();
      } catch (err: any) {
        console.error('[StudentDataContext] init failed:', err);
        setLoading(false);
      }
    }
    init();
  }, [fetchAll, userId, status]);

  // isConnected = true if we have a user AND stats loaded from backend
  const isConnected = !!data.profile && data.rawStats !== null;

  return (
    <StudentDataContext.Provider
      value={{
        ...data,
        loading,
        error,
        isConnected,
        studentId: userId || null,
        refresh: fetchAll,
        seedAndLoad,
        updateProfile: updateProfileFn,
        updateStats: updateStatsFn,
        logSession: logSessionFn,
        saveReviews: saveReviewsFn,
        recordSessionComplete,
      }}
    >
      {children}
    </StudentDataContext.Provider>
  );
}

export function useStudentDataContext() {
  return useContext(StudentDataContext);
}
