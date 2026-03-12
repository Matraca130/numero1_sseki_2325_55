// ============================================================
// sessionAnalytics.ts — Shared helper for daily-activities + student-stats
//
// GAP 1 FIX: All 4 review consumers now call this helper,
//   not just ReviewSessionView.
//
// GAP 2+3 FIX: Uses READ-THEN-INCREMENT pattern.
//   1. GET /student-stats → read current accumulated values
//   2. POST /student-stats with ACCUMULATED + SESSION values
//   3. GET /daily-activities?from=today&to=today → read today's values
//   4. POST /daily-activities with ACCUMULATED + SESSION values
//
// This prevents the REPLACE bug where posting session-only values
// overwrote the accumulated totals (student-stats) or same-day
// data (daily-activities).
//
// Fire-and-forget: errors are logged but never thrown.
// Consumers call this AFTER submitBatch + closeSession succeed.
//
// SERIALIZATION (v4.5): Module-level promise chain ensures that
// if two sessions end simultaneously (e.g. two tabs), the second
// call waits for the first to complete before reading+incrementing.
// Without this, both would read the same total, increment by their
// own session values, and the second POST would overwrite the first.
// ============================================================

import { apiCall } from './api';

// ── Module-level mutex ──────────────────────────────────────
// Each call chains on the previous one. This guarantees serial
// execution of READ-THEN-INCREMENT even if called concurrently.
let pendingChain: Promise<void> = Promise.resolve();

export interface SessionAnalyticsInput {
  totalReviews: number;
  correctReviews: number;
  durationSeconds: number;
}

// ── Student Stats: read-then-increment ────────────────────

interface StudentStatsRow {
  total_reviews?: number;
  total_time_seconds?: number;
  total_sessions?: number;
  current_streak?: number;
  longest_streak?: number;
  last_study_date?: string;
}

async function incrementStudentStats(input: SessionAnalyticsInput): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. READ current accumulated stats
  let existing: StudentStatsRow | null = null;
  try {
    existing = await apiCall<StudentStatsRow | null>('/student-stats');
  } catch (err) {
    // First time — no row yet. We'll create one below.
    if (import.meta.env.DEV) {
      console.warn('[SessionAnalytics] student-stats GET failed (first time?):', err);
    }
  }

  // 2. Compute accumulated values
  const prevReviews = existing?.total_reviews ?? 0;
  const prevTime = existing?.total_time_seconds ?? 0;
  const prevSessions = existing?.total_sessions ?? 0;
  const prevLastDate = existing?.last_study_date ?? '';

  // Streak logic: if last study was yesterday → increment streak
  // If last study was today → keep streak (already counted)
  // Otherwise → reset to 1
  let currentStreak = existing?.current_streak ?? 0;
  const longestStreak = existing?.longest_streak ?? 0;

  if (prevLastDate === today) {
    // Already studied today, don't re-increment streak
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (prevLastDate === yesterdayStr) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
  }

  const newLongestStreak = Math.max(longestStreak, currentStreak);

  // 3. POST accumulated totals
  try {
    await apiCall('/student-stats', {
      method: 'POST',
      body: JSON.stringify({
        total_reviews: prevReviews + input.totalReviews,
        total_time_seconds: prevTime + input.durationSeconds,
        total_sessions: prevSessions + 1,
        current_streak: currentStreak,
        longest_streak: newLongestStreak,
        last_study_date: today,
      }),
    });
  } catch (err) {
    console.error('[SessionAnalytics] student-stats POST failed:', err);
  }
}

// ── Daily Activities: read-then-increment ─────────────────

interface DailyActivityRow {
  reviews_count?: number;
  correct_count?: number;
  time_spent_seconds?: number;
  sessions_count?: number;
}

async function incrementDailyActivities(input: SessionAnalyticsInput): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. READ today's existing activity (may be null if first session today)
  let existing: DailyActivityRow | null = null;
  try {
    const result = await apiCall<DailyActivityRow[] | DailyActivityRow | null>(
      `/daily-activities?from=${today}&to=${today}&limit=1`
    );
    // Backend returns array; take first item if present
    if (Array.isArray(result) && result.length > 0) {
      existing = result[0];
    } else if (result && !Array.isArray(result)) {
      existing = result;
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[SessionAnalytics] daily-activities GET failed:', err);
    }
  }

  // 2. Compute accumulated values for today
  const prevReviews = existing?.reviews_count ?? 0;
  const prevCorrect = existing?.correct_count ?? 0;
  const prevTime = existing?.time_spent_seconds ?? 0;
  const prevSessions = existing?.sessions_count ?? 0;

  // 3. POST accumulated daily totals
  try {
    await apiCall('/daily-activities', {
      method: 'POST',
      body: JSON.stringify({
        activity_date: today,
        reviews_count: prevReviews + input.totalReviews,
        correct_count: prevCorrect + input.correctReviews,
        time_spent_seconds: prevTime + input.durationSeconds,
        sessions_count: prevSessions + 1,
      }),
    });
  } catch (err) {
    console.error('[SessionAnalytics] daily-activities POST failed:', err);
  }
}

// ── Public entry point ────────────────────────────────────

/**
 * Post session analytics: student-stats + daily-activities.
 *
 * Uses READ-THEN-INCREMENT to avoid overwriting accumulated data.
 * Fire-and-forget: never throws.
 *
 * Call this AFTER submitBatch and closeSession succeed.
 * All 4 review consumers (ReviewSessionView, FlashcardReviewer,
 * useFlashcardEngine, useAdaptiveSession) should call this.
 */
export async function postSessionAnalytics(input: SessionAnalyticsInput): Promise<void> {
  // Serialize: chain on previous call to prevent concurrent read-then-increment
  const thisCall = pendingChain.then(async () => {
    try {
      // Run both in parallel — they write to different tables
      // (student-stats and daily-activities don't share data,
      //  so parallel within a single call is safe)
      await Promise.all([
        incrementStudentStats(input),
        incrementDailyActivities(input),
      ]);
      if (import.meta.env.DEV) {
        console.log(
          `[SessionAnalytics] Posted: ${input.totalReviews} reviews, ` +
          `${input.correctReviews} correct, ${input.durationSeconds}s`
        );
      }
    } catch (err) {
      // Should never reach here since individual functions catch internally
      console.error('[SessionAnalytics] Unexpected error:', err);
    }
  });
  // Update the chain head (swallow rejections so chain doesn't break)
  pendingChain = thisCall.catch(() => {});
  return thisCall;
}
