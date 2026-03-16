// ============================================================
// Axon — useRecentSessions Hook
//
// Fetches the last N study sessions for the activity feed.
// Uses React Query for caching + deduplication.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { getStudySessions } from '@/app/services/studySessionApi';
import type { StudySessionRecord } from '@/app/services/studySessionApi';

export function useRecentSessions(limit = 10) {
  return useQuery<StudySessionRecord[]>({
    queryKey: ['study-sessions', 'recent', limit],
    queryFn: () => getStudySessions({ limit }),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}
