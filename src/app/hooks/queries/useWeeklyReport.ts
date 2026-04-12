// ============================================================
// Axon — useWeeklyReport hook
//
// Fetches AI-generated weekly study report from GET /ai/weekly-report.
// Provides generateReport() mutation via POST /ai/weekly-report.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/app/lib/api';

// ── Rich sub-types (backend v2) ──────────────────────────────
export interface WeakTopic {
  topicName: string;
  masteryLevel: number;
  reason: string;
}

export interface StrongTopic {
  topicName: string;
  masteryLevel: number;
}

export interface LapsingCard {
  cardFront: string;
  keyword: string;
  lapses: number;
}

export interface RecommendedFocus {
  topicName: string;
  reason: string;
  suggestedMethod: string;
}

export type MasteryTrend = 'improving' | 'stable' | 'declining';

// ── Main report interface ────────────────────────────────────
export interface WeeklyReportData {
  weekStart: string;
  weekEnd: string;
  totalSessions: number;
  totalReviews: number;
  correctReviews: number;
  daysActive: number;
  streakAtReport: number;
  xpEarned: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  aiModel: string;
  // Rich fields — all optional for backward compat
  accuracyPercent?: number;
  weakTopics?: WeakTopic[];
  strongTopics?: StrongTopic[];
  lapsingCards?: LapsingCard[];
  aiMasteryTrend?: MasteryTrend;
  aiRecommendedFocus?: RecommendedFocus[];
  totalTimeSeconds?: number;
}

const WEEKLY_REPORT_KEY = ['weekly-report'] as const;

// ── Backend response shape (keys from mapReport in weekly-report.ts) ─
// The backend prefixes AI-generated fields with "ai" (aiSummary, aiStrengths, …)
// while the frontend interface uses unprefixed names (summary, strengths, …).
// This normalizer bridges that mismatch so the component works with both
// the current backend AND any future backend that drops the prefix.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeReport(raw: any): WeeklyReportData {
  return {
    weekStart:          raw.weekStart,
    weekEnd:            raw.weekEnd,
    totalSessions:      raw.totalSessions ?? 0,
    totalReviews:       raw.totalReviews ?? 0,
    correctReviews:     raw.correctReviews ?? 0,
    daysActive:         raw.daysActive ?? 0,
    streakAtReport:     raw.streakAtReport ?? 0,
    xpEarned:           raw.xpEarned ?? 0,
    // AI-generated text fields — accept both prefixed and unprefixed
    summary:            raw.summary ?? raw.aiSummary ?? '',
    strengths:          raw.strengths ?? raw.aiStrengths ?? [],
    weaknesses:         raw.weaknesses ?? raw.aiWeaknesses ?? [],
    recommendations:    raw.recommendations ?? raw.aiRecommendedFocus?.map(
      (r: RecommendedFocus) => `${r.topicName}: ${r.reason}`,
    ) ?? [],
    aiModel:            raw.aiModel ?? '',
    // Rich v2 fields
    accuracyPercent:    raw.accuracyPercent,
    totalTimeSeconds:   raw.totalTimeSeconds,
    aiMasteryTrend:     raw.aiMasteryTrend ?? raw.masteryTrend,
    weakTopics:         raw.weakTopics,
    strongTopics:       raw.strongTopics,
    lapsingCards:       raw.lapsingCards,
    aiRecommendedFocus: raw.aiRecommendedFocus,
  };
}

async function fetchWeeklyReport(): Promise<WeeklyReportData | null> {
  try {
    const raw = await apiCall<Record<string, unknown>>('/ai/weekly-report');
    return raw ? normalizeReport(raw) : null;
  } catch {
    return null;
  }
}

async function generateWeeklyReport(): Promise<WeeklyReportData> {
  const raw = await apiCall<Record<string, unknown>>('/ai/weekly-report', { method: 'POST' });
  return normalizeReport(raw);
}

export function useWeeklyReport() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: WEEKLY_REPORT_KEY,
    queryFn: fetchWeeklyReport,
    staleTime: 10 * 60 * 1000, // 10 min
    retry: 1,
  });

  const generateMutation = useMutation({
    mutationFn: generateWeeklyReport,
    onSuccess: (data) => {
      queryClient.setQueryData(WEEKLY_REPORT_KEY, data);
    },
  });

  return {
    report: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
  };
}
