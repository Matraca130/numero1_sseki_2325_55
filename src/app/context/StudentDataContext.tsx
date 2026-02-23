// ============================================================
// Axon — Student Data Context
// Provides student data from REAL backend (daily-activities,
// student-stats, bkt-states) to all student views.
//
// Connected to AuthContext — uses authenticated user's JWT.
// The backend extracts student_id from X-Access-Token, so no
// need to pass student IDs in the URL.
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import {
  getDailyActivities,
  getStudentStatsReal,
  upsertDailyActivity,
  upsertStudentStats,
  getAllBktStates,
} from '@/app/services/platformApi';
import type {
  DailyActivityRecord,
  StudentStatsRecord,
  BktStateRecord,
} from '@/app/services/platformApi';
import type {
  StudentStats,
  DailyActivity,
} from '@/app/types/student';

// @refresh reset

// ── Adapters: backend → frontend types ──────────────────────

function adaptStats(raw: StudentStatsRecord | null): StudentStats | null {
  if (!raw) return null;
  return {
    totalStudyMinutes: Math.round(raw.total_time_seconds / 60),
    totalSessions: raw.total_sessions,
    totalCardsReviewed: raw.total_reviews,
    totalQuizzesCompleted: 0, // not tracked in student-stats yet
    currentStreak: raw.current_streak,
    longestStreak: raw.longest_streak,
    averageDailyMinutes: raw.total_sessions > 0
      ? Math.round(raw.total_time_seconds / 60 / Math.max(raw.current_streak, 1))
      : 0,
    lastStudyDate: raw.last_study_date || '',
    weeklyActivity: [], // populated from daily-activities below
  };
}

function adaptDailyActivities(raw: DailyActivityRecord[]): DailyActivity[] {
  return raw.map(r => ({
    date: r.activity_date,
    studyMinutes: Math.round(r.time_spent_seconds / 60),
    sessionsCount: r.sessions_count,
    cardsReviewed: r.reviews_count,
    retentionPercent: r.correct_count > 0 && r.reviews_count > 0
      ? Math.round((r.correct_count / r.reviews_count) * 100)
      : undefined,
  }));
}

// ── Streak calculation ──────────────────────────────────────

function calculateStreak(lastStudyDate: string | null, currentStreak: number): {
  newStreak: number;
  isNewDay: boolean;
} {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  if (!lastStudyDate) return { newStreak: 1, isNewDay: true };
  if (lastStudyDate === today) return { newStreak: currentStreak, isNewDay: false };

  const last = new Date(lastStudyDate + 'T12:00:00');
  const now = new Date(today + 'T12:00:00');
  const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return { newStreak: currentStreak + 1, isNewDay: true };
  return { newStreak: 1, isNewDay: true }; // streak broken
}

// ── Context type ────────────────────────────────────────────

interface StudentDataContextType {
  // Adapted data (matches existing frontend types)
  stats: StudentStats | null;
  dailyActivity: DailyActivity[];
  // Raw backend data
  bktStates: BktStateRecord[];
  rawStats: StudentStatsRecord | null;
  // State
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  studentId: string | null;
  // Actions
  refresh: () => Promise<void>;
  /** Record a completed study session (updates daily-activities + student-stats) */
  recordSessionComplete: (session: {
    reviewsCount: number;
    correctCount: number;
    timeSpentSeconds: number;
    type: 'flashcard' | 'quiz' | 'reading';
  }) => Promise<void>;
  // Legacy compat (some views may still reference these)
  courseProgress: any[];
  sessions: any[];
  reviews: any[];
  profile: any;
  updateProfile: (data: any) => Promise<void>;
  updateStats: (data: any) => Promise<void>;
  logSession: (data: any) => Promise<void>;
  saveReviews: (reviews: any[]) => Promise<void>;
  seedAndLoad: () => Promise<void>;
}

const defaultCtx: StudentDataContextType = {
  stats: null,
  dailyActivity: [],
  bktStates: [],
  rawStats: null,
  loading: true,
  error: null,
  isConnected: false,
  studentId: null,
  refresh: async () => {},
  recordSessionComplete: async () => {},
  courseProgress: [],
  sessions: [],
  reviews: [],
  profile: null,
  updateProfile: async () => {},
  updateStats: async () => {},
  logSession: async () => {},
  saveReviews: async () => {},
  seedAndLoad: async () => {},
};

const StudentDataContext = createContext<StudentDataContextType>(defaultCtx);

// ── Provider ────────────────────────────────────────────────

export function StudentDataProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const userId = user?.id || null;

  const [rawStats, setRawStats] = useState<StudentStatsRecord | null>(null);
  const [rawDaily, setRawDaily] = useState<DailyActivityRecord[]>([]);
  const [bktStates, setBktStates] = useState<BktStateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastUserId = useRef<string | null>(null);

  // ── Fetch all data ──────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const today = new Date().toISOString().slice(0, 10);
    const from90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    try {
      const [statsRes, dailyRes, bktRes] = await Promise.allSettled([
        getStudentStatsReal(),
        getDailyActivities(from90, today, 90),
        getAllBktStates(undefined, 200),
      ]);

      setRawStats(statsRes.status === 'fulfilled' ? statsRes.value : null);
      setRawDaily(dailyRes.status === 'fulfilled' ? dailyRes.value : []);
      setBktStates(bktRes.status === 'fulfilled' ? bktRes.value : []);

      // Log results
      const statsOk = statsRes.status === 'fulfilled';
      const dailyOk = dailyRes.status === 'fulfilled';
      const bktOk = bktRes.status === 'fulfilled';
      console.log(`[StudentData] Loaded: stats=${statsOk}, daily=${dailyOk}(${dailyRes.status === 'fulfilled' ? dailyRes.value.length : 0}), bkt=${bktOk}(${bktRes.status === 'fulfilled' ? bktRes.value.length : 0})`);
    } catch (err: any) {
      console.error('[StudentData] fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-load on auth change ────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (lastUserId.current !== userId) {
      setRawStats(null);
      setRawDaily([]);
      setBktStates([]);
      lastUserId.current = userId;
    }
    if (userId) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [userId, status, fetchAll]);

  // ── Record session complete ─────────────────────────────
  const recordSessionComplete = useCallback(async (session: {
    reviewsCount: number;
    correctCount: number;
    timeSpentSeconds: number;
    type: 'flashcard' | 'quiz' | 'reading';
  }) => {
    const today = new Date().toISOString().slice(0, 10);

    try {
      // 1) Upsert daily activity
      await upsertDailyActivity({
        activity_date: today,
        reviews_count: session.reviewsCount,
        correct_count: session.correctCount,
        time_spent_seconds: session.timeSpentSeconds,
        sessions_count: 1,
      });

      // 2) Calculate streak and upsert student stats
      const { newStreak } = calculateStreak(
        rawStats?.last_study_date || null,
        rawStats?.current_streak || 0
      );
      const newTotal = (rawStats?.total_reviews || 0) + session.reviewsCount;
      const newTime = (rawStats?.total_time_seconds || 0) + session.timeSpentSeconds;
      const newSessions = (rawStats?.total_sessions || 0) + 1;
      const newLongest = Math.max(rawStats?.longest_streak || 0, newStreak);

      await upsertStudentStats({
        current_streak: newStreak,
        longest_streak: newLongest,
        total_reviews: newTotal,
        total_time_seconds: newTime,
        total_sessions: newSessions,
        last_study_date: today,
      });

      // 3) Refresh local state
      await fetchAll();
      console.log(`[StudentData] Session recorded: ${session.type}, +${session.reviewsCount} reviews, streak=${newStreak}`);
    } catch (err: any) {
      console.error('[StudentData] recordSessionComplete error:', err);
    }
  }, [rawStats, fetchAll]);

  // ── Adapt data for consumers ────────────────────────────
  const stats = adaptStats(rawStats);
  const dailyActivity = adaptDailyActivities(rawDaily);
  const isConnected = rawStats !== null || rawDaily.length > 0;

  // Build weekly activity from daily data
  if (stats && rawDaily.length > 0) {
    const weekActivity = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    for (const d of rawDaily) {
      const date = new Date(d.activity_date + 'T12:00:00');
      if (date >= weekStart) {
        const dayIdx = (date.getDay() + 6) % 7; // Mon=0 ... Sun=6
        weekActivity[dayIdx] += Math.round(d.time_spent_seconds / 60);
      }
    }
    stats.weeklyActivity = weekActivity;
  }

  // Legacy compat stubs
  const noop = async () => {};

  return (
    <StudentDataContext.Provider
      value={{
        stats,
        dailyActivity,
        bktStates,
        rawStats,
        loading,
        error,
        isConnected,
        studentId: userId,
        refresh: fetchAll,
        recordSessionComplete,
        // Legacy compat
        courseProgress: [],
        sessions: [],
        reviews: [],
        profile: userId ? { id: userId, name: user?.name || '', email: user?.email || '' } : null,
        updateProfile: noop,
        updateStats: noop,
        logSession: noop,
        saveReviews: noop,
        seedAndLoad: noop,
      }}
    >
      {children}
    </StudentDataContext.Provider>
  );
}

export function useStudentDataContext() {
  return useContext(StudentDataContext);
}
