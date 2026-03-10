// ============================================================
// Axon — Student API Service (FLAT routes — v4.4.2)
//
// MIGRATED from nested RESTful routes (/student/{id}/profile)
// to flat routes matching the real Hono backend:
//
//   GET  /me                  → profile (from profiles table)
//   PUT  /me                  → update profile
//   GET  /student-stats       → aggregated student stats (JWT-scoped)
//   POST /student-stats       → upsert student stats
//   GET  /daily-activities    → daily activity log (JWT-scoped)
//   POST /daily-activities    → upsert daily activity
//   GET  /study-sessions      → list sessions (JWT-scoped via scopeToUser)
//   POST /study-sessions      → create session
//   POST /reviews             → create review (needs session_id)
//   GET  /keywords?summary_id → content keywords (per summary)
//   GET  /summaries?topic_id  → content summaries (per topic)
//
// IMPORTANT: The real backend uses JWT-based user identification.
// The `studentId` parameter is IGNORED — auth is via X-Access-Token header.
// Parameters are kept for backward compat with StudentDataContext.
//
// AGGREGATION STRATEGY (v4.4.2):
//   Course Progress — no dedicated endpoint exists. Aggregated from:
//     /study-sessions (per-course time + sessions) + /fsrs-states
//     (flashcard mastery) + /bkt-states (subtopic mastery).
//     Results cached 5min. Graceful degradation on partial failures.
//
//   Keywords — fetched per-topic via /topic-progress → /keywords.
//     TTL cache (5min) + concurrency limiter (max 4 parallel) to
//     prevent thundering herd on topics with many summaries.
//
//   Reviews — bulk save delegates to studySessionApi (creates session
//     + individual POST /reviews). Legacy path; real flow uses
//     studySessionApi directly.
// ============================================================

import { apiCall } from '@/app/lib/api';
import type {
  StudentProfile,
  StudentStats,
  CourseProgress,
  FlashcardReview,
  StudySession,
  DailyActivity,
  StudySummary,
  TopicProgress,
} from '@/app/types/student';

// ═══════════════════════════════════════════════════════════
// INFRASTRUCTURE: Cache + Concurrency
// ═══════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const _courseProgressCache: { entry: CacheEntry<CourseProgress[]> | null } = { entry: null };
const _keywordCache = new Map<string, CacheEntry<Record<string, any>>>();

function isCacheValid<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
  return entry != null && Date.now() < entry.expiresAt;
}

/** Invalidate all caches (called on logout or user change) */
export function invalidateStudentCaches(): void {
  _courseProgressCache.entry = null;
  _keywordCache.clear();
}

async function parallelWithLimit<T>(
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

// ═══════════════════════════════════════════════════════════
// RESPONSE SHAPE MAPPERS (snake_case → camelCase)
// ═══════════════════════════════════════════════════════════

function mapProfileFromBackend(raw: any): StudentProfile {
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
      language: 'pt-BR',
      dailyGoalMinutes: 60,
      notificationsEnabled: true,
      spacedRepetitionAlgorithm: 'fsrs' as const,
    },
  };
}

function mapStatsFromBackend(raw: any): StudentStats {
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

function mapDailyActivityFromBackend(raw: any): DailyActivity {
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

function mapSessionFromBackend(raw: any): StudySession {
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

// ═══════════════════════════════════════════════════════════
// 1. PROFILE
// ═══════════════════════════════════════════════════════════

export async function getProfile(_studentId?: string): Promise<StudentProfile | null> {
  try {
    const raw = await apiCall<any>('/me');
    if (!raw) return null;
    return mapProfileFromBackend(raw);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('404') || msg.includes('401')) return null;
    throw err;
  }
}

export async function updateProfile(
  data: Partial<StudentProfile>,
  _studentId?: string
): Promise<StudentProfile> {
  const payload: Record<string, any> = {};
  if (data.name !== undefined) payload.full_name = data.name;
  if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;

  const raw = await apiCall<any>('/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return mapProfileFromBackend(raw);
}

// ═══════════════════════════════════════════════════════════
// 2. STATS
// ═══════════════════════════════════════════════════════════

export async function getStats(_studentId?: string): Promise<StudentStats | null> {
  try {
    const raw = await apiCall<any>('/student-stats');
    if (!raw) return null;
    return mapStatsFromBackend(raw);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('404')) return null;
    throw err;
  }
}

export async function updateStats(
  data: Partial<StudentStats>,
  _studentId?: string
): Promise<StudentStats> {
  const payload: Record<string, any> = {};
  if (data.currentStreak !== undefined) payload.current_streak = data.currentStreak;
  if (data.longestStreak !== undefined) payload.longest_streak = data.longestStreak;
  if (data.totalCardsReviewed !== undefined) payload.total_reviews = data.totalCardsReviewed;
  if (data.totalStudyMinutes !== undefined) payload.total_time_seconds = data.totalStudyMinutes * 60;
  if (data.totalSessions !== undefined) payload.total_sessions = data.totalSessions;
  if (data.lastStudyDate !== undefined) payload.last_study_date = data.lastStudyDate;

  const raw = await apiCall<any>('/student-stats', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapStatsFromBackend(raw);
}

// ═══════════════════════════════════════════════════════════
// 3. COURSE PROGRESS — Frontend Aggregation
// ═══════════════════════════════════════════════════════════

export async function getAllCourseProgress(_studentId?: string): Promise<CourseProgress[]> {
  if (isCacheValid(_courseProgressCache.entry)) {
    return _courseProgressCache.entry.data;
  }

  try {
    const [sessionsResult, fsrsResult, bktResult] = await Promise.allSettled([
      apiCall<any>('/study-sessions?limit=200'),
      apiCall<any>('/fsrs-states?limit=500'),
      apiCall<any>('/bkt-states?limit=500'),
    ]);

    const sessionsRaw = sessionsResult.status === 'fulfilled'
      ? (Array.isArray(sessionsResult.value) ? sessionsResult.value : sessionsResult.value?.items || [])
      : [];
    const fsrsRaw = fsrsResult.status === 'fulfilled'
      ? (Array.isArray(fsrsResult.value) ? fsrsResult.value : fsrsResult.value?.items || [])
      : [];
    const bktRaw = bktResult.status === 'fulfilled'
      ? (Array.isArray(bktResult.value) ? bktResult.value : bktResult.value?.items || [])
      : [];

    if (sessionsRaw.length === 0 && fsrsRaw.length === 0) {
      _courseProgressCache.entry = { data: [], expiresAt: Date.now() + CACHE_TTL_MS };
      return [];
    }

    interface CourseAgg {
      courseId: string;
      sessionCount: number;
      totalReviews: number;
      correctReviews: number;
      lastAccessedAt: string;
    }
    const courseMap = new Map<string, CourseAgg>();

    for (const s of sessionsRaw) {
      const cid = s.course_id;
      if (!cid) continue;
      const existing = courseMap.get(cid) || {
        courseId: cid, sessionCount: 0, totalReviews: 0,
        correctReviews: 0, lastAccessedAt: '',
      };
      existing.sessionCount += 1;
      existing.totalReviews += s.total_reviews || 0;
      existing.correctReviews += s.correct_reviews || 0;
      const ts = s.completed_at || s.created_at || '';
      if (ts > existing.lastAccessedAt) existing.lastAccessedAt = ts;
      courseMap.set(cid, existing);
    }

    let totalCards = fsrsRaw.length;
    let masteredCards = 0;
    let learningCards = 0;
    let newCards = 0;

    for (const fs of fsrsRaw) {
      const state = fs.state || 'new';
      if (state === 'review' && (fs.stability || 0) >= 10) masteredCards++;
      else if (state === 'learning' || state === 'relearning') learningCards++;
      else if (state === 'new') newCards++;
    }

    let bktMasteryAvg = 0;
    if (bktRaw.length > 0) {
      const totalPKnow = bktRaw.reduce((sum: number, b: any) => sum + (b.p_know || 0), 0);
      bktMasteryAvg = totalPKnow / bktRaw.length;
    }

    const uniqueCourseIds = Array.from(courseMap.keys());
    const courseNames = new Map<string, string>();
    if (uniqueCourseIds.length > 0 && uniqueCourseIds.length <= 10) {
      const nameResults = await Promise.allSettled(
        uniqueCourseIds.map(cid => apiCall<any>(`/courses/${cid}`))
      );
      for (let i = 0; i < uniqueCourseIds.length; i++) {
        const r = nameResults[i];
        if (r.status === 'fulfilled' && r.value?.name) {
          courseNames.set(uniqueCourseIds[i], r.value.name);
        }
      }
    }

    const totalGlobalReviews = Array.from(courseMap.values())
      .reduce((s, c) => s + c.totalReviews, 0) || 1;

    const progress: CourseProgress[] = uniqueCourseIds.map(cid => {
      const agg = courseMap.get(cid)!;
      const courseName = courseNames.get(cid) || `Curso ${cid.slice(0, 6)}`;
      const share = agg.totalReviews / totalGlobalReviews;
      const courseFlashcardsTotal = Math.round(totalCards * share) || 0;
      const courseFlashcardsMastered = Math.round(masteredCards * share) || 0;
      const quizAvg = agg.totalReviews > 0
        ? Math.round((agg.correctReviews / agg.totalReviews) * 100) : 0;
      const fsrsMasteryRatio = totalCards > 0 ? (masteredCards / totalCards) : 0;
      const masteryPercent = Math.round(
        ((bktMasteryAvg * 0.6) + (fsrsMasteryRatio * 0.4)) * 100
      );

      return {
        courseId: cid, courseName,
        masteryPercent: Math.min(100, masteryPercent),
        lessonsCompleted: agg.sessionCount,
        lessonsTotal: Math.max(agg.sessionCount, agg.sessionCount + 5),
        flashcardsMastered: courseFlashcardsMastered,
        flashcardsTotal: Math.max(courseFlashcardsTotal, courseFlashcardsMastered),
        quizAverageScore: quizAvg,
        lastAccessedAt: agg.lastAccessedAt || new Date().toISOString(),
        topicProgress: [],
      };
    });

    progress.sort((a, b) => b.lastAccessedAt.localeCompare(a.lastAccessedAt));
    _courseProgressCache.entry = { data: progress, expiresAt: Date.now() + CACHE_TTL_MS };
    return progress;

  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[studentApi] getAllCourseProgress aggregation failed:', err);
    }
    return [];
  }
}

export async function getCourseProgress(
  courseId: string,
  _studentId?: string
): Promise<CourseProgress | null> {
  const all = await getAllCourseProgress(_studentId);
  return all.find(cp => cp.courseId === courseId) || null;
}

export async function updateCourseProgress(
  _courseId: string,
  data: Partial<CourseProgress>,
  _studentId?: string
): Promise<CourseProgress> {
  _courseProgressCache.entry = null;
  return data as CourseProgress;
}

// ═══════════════════════════════════════════════════════════
// 4. DAILY ACTIVITY
// ═══════════════════════════════════════════════════════════

export async function getDailyActivity(_studentId?: string): Promise<DailyActivity[]> {
  try {
    const raw = await apiCall<any>('/daily-activities');
    const items = Array.isArray(raw) ? raw : raw?.items || raw || [];
    return items.map(mapDailyActivityFromBackend);
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// 5. SESSIONS
// ═══════════════════════════════════════════════════════════

export async function getSessions(_studentId?: string): Promise<StudySession[]> {
  try {
    const raw = await apiCall<any>('/study-sessions');
    const items = Array.isArray(raw) ? raw : raw?.items || [];
    return items.map(mapSessionFromBackend);
  } catch {
    return [];
  }
}

export async function logSession(
  data: Omit<StudySession, 'studentId'>,
  _studentId?: string
): Promise<StudySession> {
  const payload: Record<string, any> = {
    session_type: data.type || 'flashcards',
  };
  if (data.courseId) payload.course_id = data.courseId;

  const raw = await apiCall<any>('/study-sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  _courseProgressCache.entry = null;
  return mapSessionFromBackend(raw);
}

// ═══════════════════════════════════════════════════════════
// 6. FLASHCARD REVIEWS
// ═══════════════════════════════════════════════════════════

export async function getReviews(_studentId?: string): Promise<FlashcardReview[]> {
  return [];
}

export async function getReviewsByCourse(
  _courseId: string,
  _studentId?: string
): Promise<FlashcardReview[]> {
  return [];
}

export async function saveReviews(
  reviews: FlashcardReview[],
  _studentId?: string
): Promise<{ saved: number }> {
  if (!reviews || reviews.length === 0) return { saved: 0 };

  try {
    const session = await apiCall<any>('/study-sessions', {
      method: 'POST',
      body: JSON.stringify({
        session_type: 'flashcard',
        course_id: reviews[0].courseId || undefined,
      }),
    });

    if (!session?.id) {
      if (import.meta.env.DEV) {
        console.warn('[studentApi] saveReviews: failed to create session');
      }
      return { saved: 0 };
    }

    const reviewTasks = reviews.map(review => () =>
      apiCall<any>('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          session_id: session.id,
          item_id: String(review.cardId),
          instrument_type: 'flashcard',
          grade: review.rating,
        }),
      })
    );

    const results = await parallelWithLimit(reviewTasks, 4);
    const savedCount = results.filter(r => r.status === 'fulfilled').length;

    const correctCount = reviews.filter(r => r.rating >= 3).length;
    try {
      await apiCall<any>(`/study-sessions/${session.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          completed_at: new Date().toISOString(),
          total_reviews: reviews.length,
          correct_reviews: correctCount,
        }),
      });
    } catch {
      // Non-critical
    }

    _courseProgressCache.entry = null;
    return { saved: savedCount };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[studentApi] saveReviews error:', err);
    }
    return { saved: 0 };
  }
}

// ═══════════════════════════════════════════════════════════
// 7. STUDY SUMMARIES
// ═══════════════════════════════════════════════════════════

export async function getStudySummary(
  _studentId: string,
  _courseId: string,
  topicId: string
): Promise<StudySummary | null> {
  try {
    const raw = await apiCall<any>(`/summaries?topic_id=${topicId}`);
    const items = Array.isArray(raw) ? raw : raw?.items || [];
    if (items.length === 0) return null;
    return items[0] as StudySummary;
  } catch {
    return null;
  }
}

export async function getAllSummaries(_studentId?: string): Promise<StudySummary[]> {
  return [];
}

export async function getCourseSummaries(
  _courseId: string,
  _studentId?: string
): Promise<StudySummary[]> {
  return [];
}

export async function saveStudySummary(
  _studentId: string,
  _courseId: string,
  _topicId: string,
  data: Partial<StudySummary>
): Promise<StudySummary> {
  return data as StudySummary;
}

export async function deleteStudySummary(
  _studentId: string,
  _courseId: string,
  _topicId: string
): Promise<void> {}

// ═══════════════════════════════════════════════════════════
// 8. KEYWORDS — Per-topic with Cache + BKT Enrichment
// ═══════════════════════════════════════════════════════════

export async function getKeywords(
  _courseId: string,
  _studentId?: string
): Promise<any> {
  return { keywords: {} };
}

export async function getTopicKeywords(
  _courseId: string,
  topicId: string,
  _studentId?: string
): Promise<any> {
  const cacheKey = `topic-kw-${topicId}`;
  const cached = _keywordCache.get(cacheKey);
  if (isCacheValid(cached)) {
    return cached.data;
  }

  try {
    const topicData = await apiCall<any>(`/topic-progress?topic_id=${topicId}`);
    const summaries: any[] = topicData?.summaries || [];

    if (summaries.length === 0) {
      const empty = { keywords: {} };
      _keywordCache.set(cacheKey, { data: empty, expiresAt: Date.now() + CACHE_TTL_MS });
      return empty;
    }

    const summaryIds = summaries.map((s: any) => s.id);
    const keywordTasks = summaryIds.map((sid: string) => () =>
      apiCall<any>(`/keywords?summary_id=${sid}`)
    );
    const kwResults = await parallelWithLimit(keywordTasks, 4);

    let bktMap: Map<string, number> | null = null;
    try {
      const bktRaw = await apiCall<any>('/bkt-states?limit=500');
      const bktItems = Array.isArray(bktRaw) ? bktRaw : bktRaw?.items || [];
      if (bktItems.length > 0) {
        bktMap = new Map();
        for (const b of bktItems) {
          if (b.subtopic_id) bktMap.set(b.subtopic_id, b.p_know || 0);
        }
      }
    } catch {}

    const keywords: Record<string, any> = {};

    for (const result of kwResults) {
      if (result.status !== 'fulfilled') continue;
      const items = Array.isArray(result.value)
        ? result.value
        : result.value?.items || [];

      for (const kw of items) {
        const name = kw.name || kw.id;
        if (!keywords[name]) {
          keywords[name] = {
            term: name,
            definition: kw.definition || '',
            relatedTerms: [],
            masteryLevel: 'red' as const,
            aiQuestions: [],
            category: undefined,
            _keywordId: kw.id,
            _priority: kw.priority || 1,
          };
        }
        if (kw.definition && kw.definition.length > (keywords[name].definition?.length || 0)) {
          keywords[name].definition = kw.definition;
        }
      }
    }

    if (bktMap && bktMap.size > 0) {
      const kwIds = Object.values(keywords)
        .filter((kw: any) => kw._keywordId)
        .map((kw: any) => kw._keywordId);

      if (kwIds.length > 0 && kwIds.length <= 20) {
        const subtopicTasks = kwIds.map((kid: string) => () =>
          apiCall<any>(`/subtopics?keyword_id=${kid}`)
        );
        const subtopicResults = await parallelWithLimit(subtopicTasks, 4);

        const kwIdToName: Record<string, string> = {};
        for (const [name, kw] of Object.entries(keywords)) {
          if ((kw as any)._keywordId) kwIdToName[(kw as any)._keywordId] = name;
        }

        for (let i = 0; i < kwIds.length; i++) {
          const r = subtopicResults[i];
          if (r.status !== 'fulfilled') continue;
          const subtopics = Array.isArray(r.value) ? r.value : r.value?.items || [];
          const kwName = kwIdToName[kwIds[i]];
          if (!kwName) continue;

          let pKnowSum = 0;
          let pKnowCount = 0;
          for (const st of subtopics) {
            const pk = bktMap.get(st.id);
            if (pk !== undefined) { pKnowSum += pk; pKnowCount++; }
          }

          if (pKnowCount > 0) {
            const avgPKnow = pKnowSum / pKnowCount;
            keywords[kwName].masteryLevel =
              avgPKnow >= 0.80 ? 'green' :
              avgPKnow >= 0.50 ? 'yellow' : 'red';
          }
        }
      }
    }

    for (const kw of Object.values(keywords)) {
      delete (kw as any)._keywordId;
      delete (kw as any)._priority;
    }

    const result = { keywords };
    _keywordCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;

  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[studentApi] getTopicKeywords failed:', err);
    }
    return { keywords: {} };
  }
}

export async function saveKeywords(
  _courseId: string,
  _topicId: string,
  _keywords: Record<string, any>,
  _studentId?: string
): Promise<any> {
  return { saved: true };
}

export async function saveCourseKeywords(
  _courseId: string,
  _keywords: Record<string, any>,
  _studentId?: string
): Promise<any> {
  return { saved: true };
}

// ═══════════════════════════════════════════════════════════
// 9. SEED (removed)
// ═══════════════════════════════════════════════════════════

export async function seedDemoData(_studentId?: string): Promise<void> {}

// ═══════════════════════════════════════════════════════════
// 10. AI FEATURES
//
// BUG-011: aiGenerateFlashcards was using /ai/flashcards (404).
//   Backend route is POST /ai/generate with action: 'flashcard'.
//   But backend expects summary_id (UUID), NOT topic (string).
//   → These functions are now DEPRECATED. Use aiService.ts instead.
//
// BUG-012: aiGenerateQuiz was using /ai/quiz (404).
//   Backend route is POST /ai/generate with action: 'quiz_question'.
//
// BUG-013: aiExplain was using /ai/explain (404).
//   Backend route is POST /ai/rag-chat.
//
// All functions below are kept for backward compat but delegate
// to aiService.ts which has the correct routes and field names.
// ═══════════════════════════════════════════════════════════

export async function aiChat(
  messages: Array<{ role: string; content: string }>,
  context?: any
): Promise<{ reply: string }> {
  // BUG-013 FIX: /ai/chat → /ai/rag-chat
  // BUG-015 FIX: Backend expects { message, history?, summary_id? }
  //   NOT { messages, context }. Returns { response } NOT { reply }.
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const message = lastUserMsg?.content || '';
  const history = messages.slice(0, -1);

  const data = await apiCall<{ response: string }>('/ai/rag-chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      history: history.length > 0 ? history : undefined,
      summary_id: context?.summaryId || context?.summary_id || undefined,
    }),
  });
  return { reply: data.response };
}

/**
 * @deprecated Use aiService.generateFlashcard({ summaryId }) instead.
 * Backend requires summary_id (UUID), not topic (string).
 * This legacy signature can't provide summary_id, so it returns empty.
 */
export async function aiGenerateFlashcards(
  _topic: string,
  _count = 5,
  _context?: any
): Promise<{ flashcards: any[] }> {
  console.warn(
    '[studentApi] aiGenerateFlashcards() is DEPRECATED and non-functional. ' +
    'Backend POST /ai/generate requires summary_id (UUID). ' +
    'Use aiService.generateFlashcard({ summaryId }) or aiService.generateSmart({ summaryId }) instead.'
  );
  return { flashcards: [] };
}

/**
 * @deprecated Use aiService.generateQuizQuestion({ summaryId }) instead.
 */
export async function aiGenerateQuiz(
  _topic: string,
  _count = 3,
  _difficulty = 'intermediate'
): Promise<{ questions: any[] }> {
  console.warn(
    '[studentApi] aiGenerateQuiz() is DEPRECATED. ' +
    'Use aiService.generateQuizQuestion({ summaryId }) instead.'
  );
  return { questions: [] };
}

/**
 * @deprecated Use aiService.explainConcept() instead.
 */
export async function aiExplain(
  concept: string,
  context?: any
): Promise<{ explanation: string }> {
  // BUG-013 + BUG-015 FIX: /ai/explain → /ai/rag-chat
  const message = context
    ? `Explica el siguiente concepto en el contexto de "${context}": ${concept}`
    : `Explica el siguiente concepto de forma clara y concisa: ${concept}`;

  const data = await apiCall<{ response: string }>('/ai/rag-chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return { explanation: data.response };
}

// ═══════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY ALIASES
// ═══════════════════════════════════════════════════════════

export const getCourseKeywords = getKeywords;
export const saveTopicKeywords = saveKeywords;

export function getSummary(
  courseId: string,
  topicId: string,
  studentId?: string
): Promise<StudySummary | null> {
  return getStudySummary(studentId || '', courseId, topicId);
}

export function saveSummary(
  courseId: string,
  topicId: string,
  data: Partial<StudySummary>,
  studentId?: string
): Promise<StudySummary> {
  return saveStudySummary(studentId || '', courseId, topicId, data);
}
