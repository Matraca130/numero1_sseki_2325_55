// ============================================================
// Axon — Student API Service (REAL BACKEND)
//
// ALL routes use apiCall() from lib/api.ts.
// The backend auto-filters by JWT (X-Access-Token) — no studentId
// in the URL. The studentId parameter is kept for backward compat
// but is IGNORED (the backend resolves the user from the JWT).
//
// Routes are FLAT with query params:
//   GET /student-stats        → student stats (auto-filtered by JWT)
//   GET /daily-activities     → daily activity entries
//   POST /study-sessions      → create session
//   PUT  /study-sessions/:id  → end session
//   POST /reviews             → submit a review
//   GET  /bkt-states          → mastery data
//   GET  /fsrs-states         → flashcard scheduling
//   GET/POST /study-plans     → study plans CRUD
//
// Response patterns (after apiCall unwraps { data: ... }):
//   CRUD factory lists → { items: [...], total, limit, offset }
//   Custom lists       → [...] (plain array)
//   Single/upsert      → { ... }
//   Nullable            → { ... } | null
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
} from '@/app/types/student';

// ── Helpers: extract items from various response shapes ───

function extractItems<T>(result: any): T[] {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

// ── Profile ───────────────────────────────────────────────
// The real backend does NOT have a /student-profile endpoint.
// Profile data comes from AuthContext (supabase.auth + GET /me).
// These functions return null / no-op so the context degrades
// gracefully. The UI should use useAuth().user instead.

export async function getProfile(_studentId?: string): Promise<StudentProfile | null> {
  // No dedicated profile endpoint — synthesized from AuthContext
  return null;
}

export async function updateProfile(
  _data: Partial<StudentProfile>,
  _studentId?: string
): Promise<StudentProfile> {
  throw new Error('Student profile is managed via AuthContext (GET /me)');
}

// ── Stats ────────────────────────────────────────────────
// GET /student-stats → returns the student's stats object (auto-filtered by JWT)
// POST /student-stats → upsert

export async function getStats(_studentId?: string): Promise<StudentStats | null> {
  try {
    const raw = await apiCall<any>('/student-stats');
    // Handle both { items: [...] } and direct object
    const obj = Array.isArray(raw) ? raw[0] : (raw?.items ? raw.items[0] : raw);
    if (!obj) return null;
    return mapStatsFromBackend(obj);
  } catch (err: any) {
    if (err.message?.includes('404') || err.message?.includes('not found')) return null;
    console.warn('[studentApi] getStats error:', err.message);
    return null;
  }
}

export async function updateStats(
  data: Partial<StudentStats>,
  _studentId?: string
): Promise<StudentStats> {
  const payload: Record<string, any> = {};
  if (data.totalStudyMinutes !== undefined) payload.total_study_minutes = data.totalStudyMinutes;
  if (data.totalSessions !== undefined) payload.total_sessions = data.totalSessions;
  if (data.totalCardsReviewed !== undefined) payload.total_cards_reviewed = data.totalCardsReviewed;
  if (data.totalQuizzesCompleted !== undefined) payload.total_quizzes_completed = data.totalQuizzesCompleted;
  if (data.currentStreak !== undefined) payload.current_streak = data.currentStreak;
  if (data.longestStreak !== undefined) payload.longest_streak = data.longestStreak;
  if (data.lastStudyDate !== undefined) payload.last_study_date = data.lastStudyDate;

  const raw = await apiCall<any>('/student-stats', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapStatsFromBackend(raw);
}

function mapStatsFromBackend(raw: any): StudentStats {
  return {
    totalStudyMinutes: raw.total_study_minutes ?? 0,
    totalSessions: raw.total_sessions ?? 0,
    totalCardsReviewed: raw.total_cards_reviewed ?? 0,
    totalQuizzesCompleted: raw.total_quizzes_completed ?? 0,
    currentStreak: raw.current_streak ?? 0,
    longestStreak: raw.longest_streak ?? 0,
    averageDailyMinutes: raw.average_daily_minutes ?? 0,
    lastStudyDate: raw.last_study_date ?? '',
    weeklyActivity: raw.weekly_activity ?? [0, 0, 0, 0, 0, 0, 0],
  };
}

// ── Course Progress ───────────────────────────────────────
// No dedicated endpoint. Progress is derived from reading-states,
// bkt-states, and content-tree. Return empty for now.
// The student views that need this data (DashboardView, etc.)
// can be enhanced to fetch from specific endpoints later.

export async function getAllCourseProgress(_studentId?: string): Promise<CourseProgress[]> {
  // TODO: Derive from GET /bkt-states + GET /reading-states + GET /content-tree
  return [];
}

export async function getCourseProgress(
  _courseId: string,
  _studentId?: string
): Promise<CourseProgress | null> {
  return null;
}

export async function updateCourseProgress(
  _courseId: string,
  _data: Partial<CourseProgress>,
  _studentId?: string
): Promise<CourseProgress> {
  throw new Error('Course progress is derived from backend data (bkt-states, reading-states)');
}

// ── Daily Activity ────────────────────────────────────────
// GET /daily-activities → custom list { data: [...] }
// apiCall unwraps .data, so result is directly the array.

export async function getDailyActivity(_studentId?: string): Promise<DailyActivity[]> {
  try {
    const raw = await apiCall<any>('/daily-activities');
    const items = extractItems<any>(raw);
    // If raw IS the array (custom list), use it directly
    const arr = Array.isArray(raw) ? raw : items;
    return arr.map(mapDailyActivityFromBackend);
  } catch (err: any) {
    console.warn('[studentApi] getDailyActivity error:', err.message);
    return [];
  }
}

function mapDailyActivityFromBackend(raw: any): DailyActivity {
  return {
    date: raw.date ?? raw.activity_date ?? '',
    studyMinutes: raw.study_minutes ?? raw.total_study_minutes ?? 0,
    sessionsCount: raw.sessions_count ?? raw.total_sessions ?? 0,
    cardsReviewed: raw.cards_reviewed ?? raw.total_cards_reviewed ?? 0,
    retentionPercent: raw.retention_percent ?? raw.retention ?? undefined,
  };
}

// ── Sessions ──────────────────────────────────────────────
// POST /study-sessions → create { session_type, course_id? }
// PUT  /study-sessions/:id → end { ended_at, duration_seconds, ... }
// GET  /study-sessions → list (if available)

export async function getSessions(_studentId?: string): Promise<StudySession[]> {
  try {
    const raw = await apiCall<any>('/study-sessions');
    const items = extractItems<any>(raw);
    const arr = Array.isArray(raw) ? raw : items;
    return arr.map(mapSessionFromBackend);
  } catch (err: any) {
    console.warn('[studentApi] getSessions error:', err.message);
    return [];
  }
}

export async function logSession(
  data: Omit<StudySession, 'studentId'>,
  _studentId?: string
): Promise<StudySession> {
  const payload: Record<string, any> = {
    session_type: data.type ?? 'mixed',
  };
  if (data.courseId) payload.course_id = data.courseId;
  if (data.topicId) payload.topic_id = data.topicId;

  const raw = await apiCall<any>('/study-sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapSessionFromBackend(raw);
}

export async function endSession(
  sessionId: string,
  data: {
    ended_at?: string;
    duration_seconds?: number;
    total_reviews?: number;
    correct_reviews?: number;
  }
): Promise<any> {
  return apiCall(`/study-sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

function mapSessionFromBackend(raw: any): StudySession {
  return {
    id: raw.id ?? '',
    studentId: raw.student_id ?? raw.user_id ?? '',
    courseId: raw.course_id ?? '',
    topicId: raw.topic_id ?? undefined,
    type: raw.session_type ?? raw.type ?? 'mixed',
    startedAt: raw.started_at ?? raw.created_at ?? '',
    endedAt: raw.ended_at ?? '',
    durationMinutes: Math.round((raw.duration_seconds ?? 0) / 60),
    cardsReviewed: raw.total_reviews ?? undefined,
    quizScore: undefined,
    notes: undefined,
  };
}

// ── Reviews ───────────────────────────────────────────────
// POST /reviews → { session_id, item_id, instrument_type, grade }
// GET  /reviews → custom list { data: [...] }

export async function getReviews(_studentId?: string): Promise<FlashcardReview[]> {
  try {
    const raw = await apiCall<any>('/reviews');
    const items = extractItems<any>(raw);
    const arr = Array.isArray(raw) ? raw : items;
    return arr.map(mapReviewFromBackend);
  } catch (err: any) {
    console.warn('[studentApi] getReviews error:', err.message);
    return [];
  }
}

export async function getReviewsByCourse(
  _courseId: string,
  _studentId?: string
): Promise<FlashcardReview[]> {
  // No course filter endpoint — return all and let caller filter
  return getReviews();
}

export async function saveReviews(
  reviews: FlashcardReview[],
  _studentId?: string
): Promise<{ saved: number }> {
  // Backend POST /reviews accepts ONE review at a time
  let saved = 0;
  for (const review of reviews) {
    try {
      await apiCall('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          session_id: (review as any).sessionId ?? null,
          item_id: String(review.cardId),
          instrument_type: 'flashcard',
          grade: Math.min(4, Math.max(1, review.rating)) as 1 | 2 | 3 | 4,
          response_time_ms: review.responseTimeMs ?? undefined,
        }),
      });
      saved++;
    } catch (err: any) {
      console.warn('[studentApi] saveReview error:', err.message);
    }
  }
  return { saved };
}

function mapReviewFromBackend(raw: any): FlashcardReview {
  return {
    cardId: raw.item_id ? Number(raw.item_id) : 0,
    topicId: raw.topic_id ?? '',
    courseId: raw.course_id ?? '',
    reviewedAt: raw.created_at ?? '',
    rating: raw.grade ?? 3,
    responseTimeMs: raw.response_time_ms ?? 0,
    ease: raw.ease ?? 2.5,
    interval: raw.interval ?? 1,
    repetitions: raw.repetitions ?? 0,
  };
}

// ── Quiz Attempts ─────────────────────────────────────────
// POST /quiz-attempts { quiz_question_id, answer, is_correct, session_id?, time_taken_ms? }

export async function submitQuizAttempt(data: {
  quiz_question_id: string;
  answer: string;
  is_correct: boolean;
  session_id?: string;
  time_taken_ms?: number;
}): Promise<any> {
  return apiCall('/quiz-attempts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── BKT States (Mastery) ──────────────────────────────────
// GET /bkt-states → custom list { data: [...] }
// POST /bkt-states → upsert

export async function getBktStates(options?: {
  subtopic_id?: string;
  keyword_id?: string;
}): Promise<any[]> {
  const params = new URLSearchParams();
  if (options?.subtopic_id) params.set('subtopic_id', options.subtopic_id);
  if (options?.keyword_id) params.set('keyword_id', options.keyword_id);
  const qs = params.toString() ? `?${params}` : '';
  try {
    const raw = await apiCall<any>(`/bkt-states${qs}`);
    return Array.isArray(raw) ? raw : extractItems(raw);
  } catch {
    return [];
  }
}

export async function upsertBktState(data: Record<string, any>): Promise<any> {
  return apiCall('/bkt-states', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── FSRS States (Flashcard Scheduling) ────────────────────
// GET /fsrs-states → custom list { data: [...] }
// POST /fsrs-states → upsert

export async function getFsrsStates(flashcardId?: string): Promise<any[]> {
  const qs = flashcardId ? `?flashcard_id=${flashcardId}` : '';
  try {
    const raw = await apiCall<any>(`/fsrs-states${qs}`);
    return Array.isArray(raw) ? raw : extractItems(raw);
  } catch {
    return [];
  }
}

export async function upsertFsrsState(data: Record<string, any>): Promise<any> {
  return apiCall('/fsrs-states', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Study Plans & Tasks -> use platformApi.ts (removed duplicates)
// getStudyPlans, createStudyPlan, updateStudyPlan, deleteStudyPlan,
// getStudyPlanTasks, createStudyPlanTask, updateStudyPlanTask, deleteStudyPlanTask

// ── Study Summaries (student-generated notes) ─────────────
// These were stored in the old Figma Make KV. The real backend
// handles student reading/annotation data through:
//   /reading-states, /text-annotations, /kw-student-notes, /video-notes
// (all managed by studentSummariesApi.ts).
// These functions return empty/null for backward compat.

export async function getStudySummary(
  _studentId: string,
  _courseId: string,
  _topicId: string
): Promise<StudySummary | null> {
  return null;
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
  _data: Partial<StudySummary>
): Promise<StudySummary> {
  // No-op: student annotations are now managed via /reading-states and /text-annotations
  // Return a minimal object so callers don't crash
  return {
    id: '',
    studentId: _studentId,
    courseId: _courseId,
    topicId: _topicId,
    courseName: '',
    topicTitle: '',
    content: '',
    annotations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    editTimeMinutes: 0,
    tags: [],
    bookmarked: false,
  };
}

export async function deleteStudySummary(
  _studentId: string,
  _courseId: string,
  _topicId: string
): Promise<void> {
  // No-op
}

// ── Keywords (student reads professor keywords) ───────────
// The real backend: GET /keywords?summary_id=xxx
// Students don't write keywords, they read them.

export async function getKeywords(
  courseId: string,
  _studentId?: string
): Promise<any> {
  // Old API expected courseId → no direct mapping.
  // Use summariesApi.getKeywords(summaryId) instead.
  return {};
}

export async function getTopicKeywords(
  _courseId: string,
  _topicId: string,
  _studentId?: string
): Promise<any> {
  return {};
}

export async function saveKeywords(
  _courseId: string,
  _topicId: string,
  _keywords: Record<string, any>,
  _studentId?: string
): Promise<any> {
  throw new Error('Keywords are professor-managed. Use kw-student-notes for student annotations.');
}

export async function saveCourseKeywords(
  _courseId: string,
  _keywords: Record<string, any>,
  _studentId?: string
): Promise<any> {
  throw new Error('Keywords are professor-managed. Use kw-student-notes for student annotations.');
}

// ── Seed Demo Data ──────────────────────────────────���─────
// No longer needed with real backend. Silently no-ops.

export async function seedDemoData(_studentId?: string): Promise<void> {
  console.log('[studentApi] seedDemoData is a no-op with real backend');
}

// ── AI Features ───────────────────────────────────────────
// These remain stubs — AI endpoints are not yet on the real backend.

export async function aiChat(
  _messages: Array<{ role: string; content: string }>,
  _context?: any
): Promise<{ reply: string }> {
  return { reply: 'AI chat no disponible aun en el backend real.' };
}

export async function aiGenerateFlashcards(
  _topic: string,
  _count = 5,
  _context?: any
): Promise<{ flashcards: any[] }> {
  return { flashcards: [] };
}

export async function aiGenerateQuiz(
  _topic: string,
  _count = 3,
  _difficulty = 'intermediate'
): Promise<{ questions: any[] }> {
  return { questions: [] };
}

export async function aiExplain(
  _concept: string,
  _context?: any
): Promise<{ explanation: string }> {
  return { explanation: 'Explicacion IA no disponible aun.' };
}

// ── Backward Compatibility Aliases ────────────────────────

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