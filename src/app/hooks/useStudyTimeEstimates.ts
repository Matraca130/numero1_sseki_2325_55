// ============================================================
// Axon — useStudyTimeEstimates hook  (Phase 4)
//
// Computes **real** per-method time estimates based on the
// student's historical study-sessions and daily-activity data,
// replacing the static avgMinutes in STUDY_METHODS.
//
// DATA SOURCES (priority order):
//   1. StudySessions (completed) — per-session_type actual duration
//   2. DailyActivities — global avg-min-per-session fallback
//   3. StudentStats — lifetime avg fallback
//   4. Static defaults — last resort
//
// METHOD → SESSION_TYPE MAPPING:
//   flashcard  → 'flashcard'
//   quiz       → 'quiz'
//   resumo     → 'reading'
//   video      → (no match — use global or static)
//   3d         → (no match — use global or static)
//
// OUTLIER HANDLING:
//   - Discard sessions < 2 min (abandoned) or > 120 min (forgot to close)
//   - For ≥5 samples: 10% trimmed mean (robust to outliers)
//   - For <5 samples: median (robust to single outlier)
//
// RETURNS:
//   methodEstimates — Map<methodId, MethodTimeEstimate>
//   totalHoursEstimate — total hours for given topics × methods
//   weeklyHoursEstimate — total ÷ weeks available (null if no deadline)
//   overallConfidence — 'high' | 'medium' | 'low' | 'fallback'
//   loading, error
// ============================================================

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { METHOD_TIME_DEFAULTS, getAxonToday } from '@/app/utils/constants';
import {
  getStudySessions,
  type StudySessionRecord,
} from '@/app/services/platformApi';

// ── Types ────────────────────────────────────────────────────

export type EstimateConfidence = 'high' | 'medium' | 'low' | 'fallback';

export interface MethodTimeEstimate {
  methodId: string;
  /** Estimated minutes per session for this method */
  estimatedMinutes: number;
  /** Confidence level of the estimate */
  confidence: EstimateConfidence;
  /** Number of real sessions this estimate is based on */
  sampleSize: number;
  /** Human-readable source description (pt-BR) */
  sourceLabel: string;
}

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

// ── Constants ────────────────────────────────────────────────

/** Static fallbacks — now uses shared constants (DT-04 fix) */
const STATIC_DEFAULTS: Record<string, number> = METHOD_TIME_DEFAULTS;

/** Maps wizard method IDs to backend session_type values */
const METHOD_TO_SESSION_TYPE: Record<string, string> = {
  flashcard: 'flashcard',
  quiz: 'quiz',
  resumo: 'reading',
  // video and 3d have no direct mapping
};

/** Minimum sessions of a specific type for HIGH confidence */
const HIGH_CONFIDENCE_THRESHOLD = 5;
/** Minimum sessions of a specific type for MEDIUM confidence */
const MEDIUM_CONFIDENCE_THRESHOLD = 2;

/** Outlier bounds (minutes) */
const MIN_SESSION_DURATION = 2;
const MAX_SESSION_DURATION = 120;

// ── Statistical helpers ──────────────────────────────────────

/**
 * Compute session duration in minutes from created_at/completed_at timestamps.
 * Returns null for invalid/incomplete sessions.
 */
export function sessionDurationMinutes(session: StudySessionRecord): number | null {
  if (!session.completed_at || !session.created_at) return null;
  const start = new Date(session.created_at).getTime();
  const end = new Date(session.completed_at).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  const minutes = (end - start) / (1000 * 60);
  // Outlier filter
  if (minutes < MIN_SESSION_DURATION || minutes > MAX_SESSION_DURATION) return null;
  return minutes;
}

/**
 * Compute the median of a sorted array of numbers.
 */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Robust central tendency:
 * - ≥5 samples: 10% trimmed mean (remove top & bottom 10%)
 * - <5 samples: median
 */
function robustAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length >= 5) {
    // Trimmed mean: remove bottom 10% and top 10%
    const trimCount = Math.max(1, Math.floor(sorted.length * 0.1));
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
    const sum = trimmed.reduce((a, b) => a + b, 0);
    return sum / trimmed.length;
  }

  return median(sorted);
}

// ── Core estimation engine ───────────────────────────────────

interface SessionTypeStats {
  sessionType: string;
  avg: number;
  sampleSize: number;
}

/**
 * Analyze completed sessions and produce per-session_type stats.
 */
function analyzeSessionsByType(sessions: StudySessionRecord[]): Map<string, SessionTypeStats> {
  // Group durations by session_type
  const groups = new Map<string, number[]>();

  for (const s of sessions) {
    const dur = sessionDurationMinutes(s);
    if (dur === null) continue;

    const type = s.session_type;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(dur);
  }

  // Compute robust average for each type
  const result = new Map<string, SessionTypeStats>();
  for (const [type, durations] of groups) {
    result.set(type, {
      sessionType: type,
      avg: robustAverage(durations),
      sampleSize: durations.length,
    });
  }

  return result;
}

/**
 * Compute global avg-minutes-per-session from daily activity data.
 * Only uses days where sessions_count > 0.
 */
function computeGlobalAvgFromDaily(
  dailyActivity: Array<{ studyMinutes: number; sessionsCount: number }>,
): { avgMinutesPerSession: number; daysUsed: number } | null {
  let totalMinutes = 0;
  let totalSessions = 0;
  let daysUsed = 0;

  for (const day of dailyActivity) {
    if (day.sessionsCount > 0 && day.studyMinutes > 0) {
      totalMinutes += day.studyMinutes;
      totalSessions += day.sessionsCount;
      daysUsed++;
    }
  }

  if (totalSessions === 0 || daysUsed < 3) return null; // need at least 3 days of data

  const avg = totalMinutes / totalSessions;
  // Sanity check: clamp to reasonable range
  if (avg < MIN_SESSION_DURATION || avg > MAX_SESSION_DURATION) return null;

  return { avgMinutesPerSession: avg, daysUsed };
}

/**
 * Compute global avg from student lifetime stats.
 */
function computeGlobalAvgFromStats(
  stats: { totalStudyMinutes: number; totalSessions: number } | null,
): number | null {
  if (!stats || stats.totalSessions < 3 || stats.totalStudyMinutes < 10) return null;
  const avg = stats.totalStudyMinutes / stats.totalSessions;
  if (avg < MIN_SESSION_DURATION || avg > MAX_SESSION_DURATION) return null;
  return avg;
}

// ── Main estimation function ─────────────────────────────────

interface EstimationInput {
  sessions: StudySessionRecord[];
  dailyActivity: Array<{ studyMinutes: number; sessionsCount: number }>;
  stats: { totalStudyMinutes: number; totalSessions: number } | null;
}

function buildMethodEstimates(input: EstimationInput): {
  estimates: Map<string, MethodTimeEstimate>;
  totalSessionsAnalyzed: number;
  daysOfActivityAnalyzed: number;
  globalAvg: number | null;
} {
  const { sessions, dailyActivity, stats } = input;

  // Step 1: Per-type session analysis
  const typeStats = analyzeSessionsByType(sessions);
  const totalSessionsAnalyzed = Array.from(typeStats.values())
    .reduce((sum, s) => sum + s.sampleSize, 0);

  // Step 2: Global fallbacks
  const dailyGlobal = computeGlobalAvgFromDaily(dailyActivity);
  const statsGlobal = computeGlobalAvgFromStats(stats);
  const globalAvg = dailyGlobal?.avgMinutesPerSession ?? statsGlobal ?? null;
  const daysOfActivityAnalyzed = dailyGlobal?.daysUsed ?? 0;

  // Step 3: Build per-method estimates
  const estimates = new Map<string, MethodTimeEstimate>();
  const allMethodIds = Object.keys(STATIC_DEFAULTS);

  for (const methodId of allMethodIds) {
    const sessionType = METHOD_TO_SESSION_TYPE[methodId];
    const typeData = sessionType ? typeStats.get(sessionType) : undefined;
    const staticDefault = STATIC_DEFAULTS[methodId] ?? 25;

    let estimate: MethodTimeEstimate;

    if (typeData && typeData.sampleSize >= HIGH_CONFIDENCE_THRESHOLD) {
      // HIGH: ≥5 real sessions of matching type
      estimate = {
        methodId,
        estimatedMinutes: Math.round(typeData.avg),
        confidence: 'high',
        sampleSize: typeData.sampleSize,
        sourceLabel: `${typeData.sampleSize} sessões reais`,
      };
    } else if (typeData && typeData.sampleSize >= MEDIUM_CONFIDENCE_THRESHOLD) {
      // MEDIUM: 2-4 real sessions of matching type
      estimate = {
        methodId,
        estimatedMinutes: Math.round(typeData.avg),
        confidence: 'medium',
        sampleSize: typeData.sampleSize,
        sourceLabel: `${typeData.sampleSize} sessões`,
      };
    } else if (typeData && typeData.sampleSize === 1) {
      // LOW: Only 1 session — blend with static default (70% real, 30% static)
      const blended = typeData.avg * 0.7 + staticDefault * 0.3;
      estimate = {
        methodId,
        estimatedMinutes: Math.round(blended),
        confidence: 'low',
        sampleSize: 1,
        sourceLabel: '1 sessão + estimativa',
      };
    } else if (globalAvg !== null) {
      // LOW: No specific sessions but global average available
      // Adjust global average by method's relative weight vs flashcard baseline
      const flashcardDefault = STATIC_DEFAULTS['flashcard']; // 20
      const ratio = staticDefault / flashcardDefault; // e.g. video = 35/20 = 1.75x
      const adjusted = globalAvg * ratio;
      estimate = {
        methodId,
        estimatedMinutes: Math.round(Math.min(adjusted, MAX_SESSION_DURATION)),
        confidence: 'low',
        sampleSize: 0,
        sourceLabel: 'média geral do aluno',
      };
    } else {
      // FALLBACK: No real data at all
      estimate = {
        methodId,
        estimatedMinutes: staticDefault,
        confidence: 'fallback',
        sampleSize: 0,
        sourceLabel: 'estimativa padrão',
      };
    }

    estimates.set(methodId, estimate);
  }

  return {
    estimates,
    totalSessionsAnalyzed,
    daysOfActivityAnalyzed,
    globalAvg,
  };
}

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

  // ── Compute estimates ──────────────────────────────────────
  const computed = useMemo(() => {
    return buildMethodEstimates({
      sessions,
      dailyActivity,
      stats,
    });
  }, [sessions, dailyActivity, stats]);

  // ── Derived values ─────────────────────────────────────────

  const overallConfidence = useMemo((): EstimateConfidence => {
    const confidences = Array.from(computed.estimates.values()).map(e => e.confidence);
    if (confidences.length === 0) return 'fallback';

    // Overall = worst confidence among methods that have data
    const hasHigh = confidences.some(c => c === 'high');
    const hasMedium = confidences.some(c => c === 'medium');
    const allFallback = confidences.every(c => c === 'fallback');

    if (allFallback) return 'fallback';
    if (hasHigh && !confidences.some(c => c === 'fallback')) return 'high';
    if (hasHigh || hasMedium) return 'medium';
    return 'low';
  }, [computed.estimates]);

  const hasRealData = computed.totalSessionsAnalyzed > 0 || computed.daysOfActivityAnalyzed >= 3;

  // ── getEstimate helper ─────────────────────────────────────
  const getEstimate = useCallback((methodId: string): MethodTimeEstimate => {
    const est = computed.estimates.get(methodId);
    if (est) return est;

    // Method not in our defaults — return static fallback
    return {
      methodId,
      estimatedMinutes: STATIC_DEFAULTS[methodId] ?? 25,
      confidence: 'fallback',
      sampleSize: 0,
      sourceLabel: 'estimativa padrão',
    };
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