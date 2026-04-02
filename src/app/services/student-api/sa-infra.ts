// ============================================================
// Axon — Student API: Infrastructure (Cache, Mappers, Concurrency)
// Extracted from studentApi.ts (zero functional changes)
// ============================================================

import type {
  StudentProfile,
  StudentStats,
  DailyActivity,
  StudySession,
} from '@/app/types/student';

// ═════════════════════════════════════════════════════════
// CACHE
// ═════════════════════════════════════════════════════════

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

import type { CourseProgress } from '@/app/types/student';

export const _courseProgressCache: { entry: CacheEntry<CourseProgress[]> | null } = { entry: null };
export const _keywordCache = new Map<string, CacheEntry<Record<string, any>>>();

export function isCacheValid<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
  return entry != null && Date.now() < entry.expiresAt;
}

/** Invalidate all caches (called on logout or user change) */
export function invalidateStudentCaches(): void {
  _courseProgressCache.entry = null;
  _keywordCache.clear();
}

// ═════════════════════════════════════════════════════════
// CONCURRENCY
// ═════════════════════════════════════════════════════════

export async function parallelWithLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const i = index++;
      try {
        const value = await tasks[i]();
        results[i] = { status: 'fulfilled', value };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

// ═════════════════════════════════════════════════════════
// RESPONSE SHAPE MAPPERS (snake_case → camelCase)
// ═════════════════════════════════════════════════════════

export function mapProfileFromBackend(raw: any): StudentProfile {
  return {
    id: raw.id,
    name: raw.full_name || raw.email?.split('@')[0] || '',
    email: raw.email || '',
    avatarUrl: raw.avatar_url || undefined,
    university: raw.university || undefined,
    course: raw.course || undefined,
    semester: raw.semester || undefined,
    enrolledCourseIds: raw.enrolled_course_ids || [],
    createdAt: raw.created_at || new Date().toISOString(),
    preferences: raw.preferences || {
      theme: 'light' as const,
      language: 'es-AR',
      dailyGoalMinutes: 60,
      notificationsEnabled: true,
      spacedRepetitionAlgorithm: 'fsrs' as const,
    },
  };
}

export function mapStatsFromBackend(raw: any): StudentStats {
  return {
    totalStudyMinutes: Math.round((raw.total_time_seconds || 0) / 60),
    totalSessions: raw.total_sessions || 0,
    totalCardsReviewed: raw.total_reviews || 0,
    totalQuizzesCompleted: raw.total_quizzes || 0,
    currentStreak: raw.current_streak || 0,
    longestStreak: raw.longest_streak || 0,
    averageDailyMinutes: raw.avg_daily_minutes || 0,
    lastStudyDate: raw.last_study_date || '',
    weeklyActivity: raw.weekly_activity || [0, 0, 0, 0, 0, 0, 0],
  };
}

export function mapDailyActivityFromBackend(raw: any): DailyActivity {
  const reviewsCount = raw.reviews_count || 0;
  const correctCount = raw.correct_count || 0;
  return {
    date: raw.activity_date || raw.date || '',
    studyMinutes: Math.round((raw.time_spent_seconds || 0) / 60),
    sessionsCount: raw.sessions_count || 0,
    cardsReviewed: reviewsCount,
    retentionPercent: reviewsCount > 0
      ? Math.round((correctCount / reviewsCount) * 100)
      : undefined,
  };
}

export function mapSessionFromBackend(raw: any): StudySession {
  const startedAt = raw.started_at || raw.created_at || '';
  const endedAt = raw.completed_at || null;
  let durationMinutes = 0;
  if (startedAt && endedAt) {
    durationMinutes = Math.round(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000
    );
  }
  return {
    id: raw.id,
    studentId: raw.student_id || '',
    courseId: raw.course_id || '',
    topicId: raw.topic_id || undefined,
    type: raw.session_type || 'mixed',
    startedAt,
    endedAt: endedAt || startedAt,
    durationMinutes,
    cardsReviewed: raw.total_reviews || 0,
    quizScore: raw.correct_reviews != null && raw.total_reviews
      ? Math.round((raw.correct_reviews / raw.total_reviews) * 100)
      : undefined,
  };
}
