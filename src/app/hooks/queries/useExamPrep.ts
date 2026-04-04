// ============================================================
// Axon — useExamPrep hook
//
// Fetches exam preparation plan from GET /schedule/exam-prep/:examId.
// Returns prioritized topic list with retrievability and review dates.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/app/lib/api';

export interface ExamReviewPlan {
  topicName: string;
  difficulty: number;
  peakRetrievability: number;
  reviewDates: string[];
  priority: number;
}

const examPrepKey = (examId: string) => ['exam-prep', examId] as const;

async function fetchExamPrep(examId: string): Promise<ExamReviewPlan[]> {
  return await apiCall<ExamReviewPlan[]>(`/schedule/exam-prep/${examId}`);
}

export function useExamPrep(examId: string | null) {
  return useQuery({
    queryKey: examPrepKey(examId ?? ''),
    queryFn: () => fetchExamPrep(examId!),
    enabled: !!examId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
