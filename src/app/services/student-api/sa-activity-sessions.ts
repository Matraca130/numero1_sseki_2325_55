// ============================================================
// Axon — Student API: Activity, Sessions, Reviews
// Extracted from studentApi.ts (zero functional changes)
// ============================================================

import { apiCall } from '@/app/lib/api';
import type {
  DailyActivity,
  StudySession,
  FlashcardReview,
} from '@/app/types/student';
import {
  mapDailyActivityFromBackend,
  mapSessionFromBackend,
  parallelWithLimit,
  _courseProgressCache,
} from './sa-infra';

// ════════════════════ DAILY ACTIVITY ════════════════════

export async function getDailyActivity(_studentId?: string): Promise<DailyActivity[]> {
  try {
    const raw = await apiCall<any>('/daily-activities');
    const items = Array.isArray(raw) ? raw : raw?.items || raw || [];
    return items.map(mapDailyActivityFromBackend);
  } catch {
    return [];
  }
}

// ══════════════════════ SESSIONS ══════════════════════

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

// ═════════════════ FLASHCARD REVIEWS ═════════════════

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
