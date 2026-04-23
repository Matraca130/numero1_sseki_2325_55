// ============================================================
// Axon — useStudyTimeEstimates hook  (Phase 4)
//
// Thin orchestrator on top of lib/study-time-math.ts.
//
// Computes **real** per-method time estimates based on the
// student's historical study-sessions and daily-activity data,
// replacing the static avgMinutes in STUDY_METHODS.
//
// DATA SOURCES (priority order, see lib/study-time-math.ts):
//   1. StudySessions (completed) — per-session_type actual duration
//   2. DailyActivities — global avg-min-per-session fallback
//   3. StudentStats — lifetime avg fallback
//   4. Static defaults — last resort
//
// This file only handles: data fetching, memoization, React wiring.
// All pure computations live in `lib/study-time-math.ts`.
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { getAxonToday } from '@/app/utils/constants';
import {
  getStudySessions,
  type StudySessionRecord,
} from '@/app/services/platformApi';
import {
  buildMethodEstimates,
  deriveOverallConfidence,
  staticFallbackEstimate,
  sessionDurationMinutes as sessionDurationMinutesImpl,
  type EstimateConfidence,
  type MethodTimeEstimate,
} from '@/app/lib/study-time-math';

// ── Types (public API — must stay identical) ─────────────────

export type { EstimateConfidence, MethodTimeEstimate };

export interface UseStudyTimeEstimatesResult {
  /** Per-method time estimates keyed by method ID */
  methodEstimates: Map<string, MethodTimeEstimate>;
  /** Get estimate for a method, with static fallback if not found */
  getEstimate: (methodId: string) => MethodTimeEstimate;
  /** Compute total hours for a set of topics × methods */
  computeTotalHours: (topicCount: number, methodIds: string[]) => number;
  /** Compute weekly hours needed given total and deadline */
  computeWeeklyHours: (topicCount: number, methodIds: string[], completionDate: string | null) => number | null;
  /** Overall confidence across all methods */
  overallConfidence: EstimateConfidence;
  /** Whether any real data was found at all */
  hasRealData: boolean;
  /** Summary stats for UI display */
  summary: {
    totalSessionsAnalyzed: number;
    daysOfActivityAnalyzed: number;
    avgMinutesPerSession: number | null;
  };
  /** Loading state */
  loading: boolean;
  /** Error (non-blocking) */
  error: string | null;
}

// ── Re-export for backward compatibility ─────────────────────
// Tests and other modules import `sessionDurationMinutes` from the
// hook module — keep the public surface intact.
export const sessionDurationMinutes = sessionDurationMinutesImpl;

// ── Hook ─────────────────────────────────────────────────────

export function useStudyTimeEstimates(): UseStudyTimeEstimatesResult {
  const { stats, dailyActivity, loading: studentLoading } = useStudentDataContext();
  const [sessions, setSessions] = useState<StudySessionRecord[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch study sessions ───────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    setError(null);
    try {
      const result = await getStudySessions();
      setSessions(result);
    } catch (err: any) {
      // Non-blocking: we can still use daily activity / stats fallbacks
      console.warn('[useStudyTimeEstimates] Sessions fetch failed (non-blocking):', err.message);
      setError(err.message);
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ── Compute estimates (delegates to pure lib) ──────────────
  const computed = useMemo(() => {
    return buildMethodEstimates({
      sessions,
      dailyActivity,
      stats,
    });
  }, [sessions, dailyActivity, stats]);

  // ── Derived values ─────────────────────────────────────────

  const overallConfidence = useMemo(
    () => deriveOverallConfidence(computed.estimates),
    [computed.estimates],
  );

  const hasRealData = computed.totalSessionsAnalyzed > 0 || computed.daysOfActivityAnalyzed >= 3;

  // ── getEstimate helper ─────────────────────────────────────
  const getEstimate = useCallback((methodId: string): MethodTimeEstimate => {
    const est = computed.estimates.get(methodId);
    if (est) return est;
    // Method not in our defaults — return static fallback
    return staticFallbackEstimate(methodId);
  }, [computed.estimates]);

  // ── computeTotalHours: total hours for topics × methods ────
  const computeTotalHours = useCallback((topicCount: number, methodIds: string[]): number => {
    if (topicCount === 0 || methodIds.length === 0) return 0;

    let totalMinutes = 0;
    for (const methodId of methodIds) {
      const est = getEstimate(methodId);
      totalMinutes += est.estimatedMinutes * topicCount;
    }

    return Math.ceil(totalMinutes / 60);
  }, [getEstimate]);

  // ── computeWeeklyHours: total ÷ available weeks ────────────
  const computeWeeklyHours = useCallback((
    topicCount: number,
    methodIds: string[],
    completionDate: string | null,
  ): number | null => {
    if (!completionDate) return null;

    const totalHours = computeTotalHours(topicCount, methodIds);
    if (totalHours === 0) return null;

    const today = getAxonToday(); // Axon's reference date
    const end = new Date(completionDate);
    const daysAvailable = Math.max(1, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const weeksAvailable = Math.max(1, daysAvailable / 7);

    return Math.ceil(totalHours / weeksAvailable);
  }, [computeTotalHours]);

  // ── Summary for UI ─────────────────────────────────────────
  const summary = useMemo(() => ({
    totalSessionsAnalyzed: computed.totalSessionsAnalyzed,
    daysOfActivityAnalyzed: computed.daysOfActivityAnalyzed,
    avgMinutesPerSession: computed.globalAvg !== null ? Math.round(computed.globalAvg) : null,
  }), [computed]);

  return {
    methodEstimates: computed.estimates,
    getEstimate,
    computeTotalHours,
    computeWeeklyHours,
    overallConfidence,
    hasRealData,
    summary,
    loading: studentLoading || sessionsLoading,
    error,
  };
}
