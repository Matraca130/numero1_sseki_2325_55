// ============================================================
// Axon — Student API: Course Progress (Frontend Aggregation)
// Extracted from studentApi.ts (zero functional changes)
// ============================================================

import { apiCall } from '@/app/lib/api';
import type { CourseProgress } from '@/app/types/student';
import { isCacheValid, _courseProgressCache, CACHE_TTL_MS } from './sa-infra';

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
