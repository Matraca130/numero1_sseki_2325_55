// ============================================================
// Axon — useWeeklyReport hook
//
// Fetches AI-generated weekly study report from GET /ai/weekly-report.
// Provides generateReport() mutation via POST /ai/weekly-report.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/app/lib/api';

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
}

const WEEKLY_REPORT_KEY = ['weekly-report'] as const;

async function fetchWeeklyReport(): Promise<WeeklyReportData | null> {
  try {
    return await apiCall<WeeklyReportData>('/ai/weekly-report');
  } catch {
    return null;
  }
}

async function generateWeeklyReport(): Promise<WeeklyReportData> {
  return await apiCall<WeeklyReportData>('/ai/weekly-report', { method: 'POST' });
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
