// ============================================================
// Axon — useStudyIntelligence Hook
//
// Fetches and caches topic difficulty metadata for a course.
// Uses React Query for caching + deduplication.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { fetchStudyIntelligence } from '@/app/services/studentApi';
import type { StudyIntelligenceResponse } from '@/app/types/student';

export function useStudyIntelligence(courseId: string | null) {
  return useQuery<StudyIntelligenceResponse>({
    queryKey: ['study-intelligence', courseId],
    queryFn: () => fetchStudyIntelligence(courseId!),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes cache
  });
}
