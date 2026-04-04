// ============================================================
// Axon — useWeeklyReport hook
//
// Fetches AI-generated weekly study report from GET /ai/weekly-report.
// Provides generateReport() mutation via POST /ai/weekly-report.
//
// Backend contract:
//   GET  /ai/weekly-report?institution_id=xxx
//   POST /ai/weekly-report  { institutionId: xxx }
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/app/lib/api';
import { useAuth } from '@/app/context/AuthContext';

export interface WeeklyReportData {
  id?: string;
  weekStart: string;
  weekEnd: string;
  totalSessions: number;
  totalReviews: number;
  correctReviews: number;
  accuracyPercent: number;
  totalTimeSeconds: number;
  daysActive: number;
  streakAtReport: number;
  xpEarned: number;
  aiSummary: string;
  aiStrengths: string[];
  aiWeaknesses: string[];
  aiMasteryTrend: string;
  aiRecommendedFocus: { topicName: string; reason: string; suggestedMethod: string }[];
  aiModel: string;
  createdAt: string;
}

const WEEKLY_REPORT_KEY = ['weekly-report'] as const;

async function fetchWeeklyReport(institutionId: string): Promise<WeeklyReportData | null> {
  try {
    return await apiCall<WeeklyReportData>(
      `/ai/weekly-report?institution_id=${institutionId}`,
    );
  } catch {
    return null;
  }
}

async function generateWeeklyReport(institutionId: string): Promise<WeeklyReportData> {
  return await apiCall<WeeklyReportData>('/ai/weekly-report', {
    method: 'POST',
    body: JSON.stringify({ institutionId }),
  });
}

export function useWeeklyReport() {
  const queryClient = useQueryClient();
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id ?? null;

  const query = useQuery({
    queryKey: [...WEEKLY_REPORT_KEY, institutionId],
    queryFn: () => fetchWeeklyReport(institutionId!),
    enabled: !!institutionId,
    staleTime: 10 * 60 * 1000, // 10 min
    retry: 1,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateWeeklyReport(institutionId!),
    onSuccess: (data) => {
      queryClient.setQueryData([...WEEKLY_REPORT_KEY, institutionId], data);
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
