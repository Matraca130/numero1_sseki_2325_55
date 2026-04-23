// ============================================================
// Axon — study-time-math.ts  (extracted from useStudyTimeEstimates)
//
// Pure functions + constants used to estimate per-method study
// time from historical sessions, daily activity and stats.
//
// NO React, NO side effects. All functions here are referentially
// transparent so they can be memoized by callers.
//
// OUTLIER HANDLING:
//   - Discard sessions < 2 min (abandoned) or > 120 min (forgot to close)
//   - For ≥5 samples: 10% trimmed mean (robust to outliers)
//   - For <5 samples: median (robust to single outlier)
// ============================================================

import { METHOD_TIME_DEFAULTS } from '@/app/utils/constants';
import type { StudySessionRecord } from '@/app/services/platformApi';

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
  /** Human-readable source description (es-AR) */
  sourceLabel: string;
}

// ── Constants ────────────────────────────────────────────────

/** Static fallbacks — uses shared constants (DT-04 fix) */
export const STATIC_DEFAULTS: Record<string, number> = METHOD_TIME_DEFAULTS;

/** Maps wizard method IDs to backend session_type values */
export const METHOD_TO_SESSION_TYPE: Record<string, string> = {
  flashcard: 'flashcard',
  quiz: 'quiz',
  resumo: 'reading',
  // video and 3d have no direct mapping
};

/** Minimum sessions of a specific type for HIGH confidence */
export const HIGH_CONFIDENCE_THRESHOLD = 5;
/** Minimum sessions of a specific type for MEDIUM confidence */
export const MEDIUM_CONFIDENCE_THRESHOLD = 2;

/** Outlier bounds (minutes) */
export const MIN_SESSION_DURATION = 2;
export const MAX_SESSION_DURATION = 120;

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
export function median(sorted: number[]): number {
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
export function robustAverage(values: number[]): number {
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

export interface SessionTypeStats {
  sessionType: string;
  avg: number;
  sampleSize: number;
}

/**
 * Analyze completed sessions and produce per-session_type stats.
 */
export function analyzeSessionsByType(
  sessions: StudySessionRecord[],
): Map<string, SessionTypeStats> {
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
export function computeGlobalAvgFromDaily(
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
export function computeGlobalAvgFromStats(
  stats: { totalStudyMinutes: number; totalSessions: number } | null,
): number | null {
  if (!stats || stats.totalSessions < 3 || stats.totalStudyMinutes < 10) return null;
  const avg = stats.totalStudyMinutes / stats.totalSessions;
  if (avg < MIN_SESSION_DURATION || avg > MAX_SESSION_DURATION) return null;
  return avg;
}

// ── Main estimation function ─────────────────────────────────

export interface EstimationInput {
  sessions: StudySessionRecord[];
  dailyActivity: Array<{ studyMinutes: number; sessionsCount: number }>;
  stats: { totalStudyMinutes: number; totalSessions: number } | null;
}

export interface EstimationOutput {
  estimates: Map<string, MethodTimeEstimate>;
  totalSessionsAnalyzed: number;
  daysOfActivityAnalyzed: number;
  globalAvg: number | null;
}

export function buildMethodEstimates(input: EstimationInput): EstimationOutput {
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
        sourceLabel: `${typeData.sampleSize} sesiones reales`,
      };
    } else if (typeData && typeData.sampleSize >= MEDIUM_CONFIDENCE_THRESHOLD) {
      // MEDIUM: 2-4 real sessions of matching type
      estimate = {
        methodId,
        estimatedMinutes: Math.round(typeData.avg),
        confidence: 'medium',
        sampleSize: typeData.sampleSize,
        sourceLabel: `${typeData.sampleSize} sesiones`,
      };
    } else if (typeData && typeData.sampleSize === 1) {
      // LOW: Only 1 session — blend with static default (70% real, 30% static)
      const blended = typeData.avg * 0.7 + staticDefault * 0.3;
      estimate = {
        methodId,
        estimatedMinutes: Math.round(blended),
        confidence: 'low',
        sampleSize: 1,
        sourceLabel: '1 sesión + estimativa',
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

// ── Confidence derivation ────────────────────────────────────

/**
 * Derive an overall confidence level from the individual method estimates.
 * Pure function so it can be memoized by the hook.
 */
export function deriveOverallConfidence(
  estimates: Map<string, MethodTimeEstimate>,
): EstimateConfidence {
  const confidences = Array.from(estimates.values()).map(e => e.confidence);
  if (confidences.length === 0) return 'fallback';

  const hasHigh = confidences.some(c => c === 'high');
  const hasMedium = confidences.some(c => c === 'medium');
  const allFallback = confidences.every(c => c === 'fallback');

  if (allFallback) return 'fallback';
  if (hasHigh && !confidences.some(c => c === 'fallback')) return 'high';
  if (hasHigh || hasMedium) return 'medium';
  return 'low';
}

/**
 * Build a static fallback estimate for a method that isn't known.
 */
export function staticFallbackEstimate(methodId: string): MethodTimeEstimate {
  return {
    methodId,
    estimatedMinutes: STATIC_DEFAULTS[methodId] ?? 25,
    confidence: 'fallback',
    sampleSize: 0,
    sourceLabel: 'estimativa padrão',
  };
}
