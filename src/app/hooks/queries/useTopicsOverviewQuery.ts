// ============================================================
// Axon — useTopicsOverviewQuery
//
// Wraps getTopicsOverview() with React Query caching.
// Used by SectionStudyPlanView (L2) to fetch summaries +
// keyword counts for all topics in a section with 1 HTTP call.
//
// Returns pre-built Maps matching the consumer's expected shape.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from './queryKeys';
import { getTopicsOverview } from '@/app/services/topicProgressApi';
import type { TopicsOverviewResponse } from '@/app/services/topicProgressApi';
import type { Summary } from '@/app/services/summariesApi';

interface UseTopicsOverviewResult {
  topicSummariesMap: Map<string, Summary[]>;
  topicKeywordCounts: Map<string, number>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * @param sectionId - unique section ID (used as cache key)
 * @param topicIds  - list of topic UUIDs to fetch overview for
 */
export function useTopicsOverviewQuery(
  sectionId: string | null,
  topicIds: string[],
): UseTopicsOverviewResult {
  const enabled = !!sectionId && topicIds.length > 0;

  const { data, isLoading, error } = useQuery<TopicsOverviewResponse>({
    queryKey: queryKeys.topicsOverview(sectionId ?? ''),
    queryFn: () => getTopicsOverview(topicIds),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min — section content rarely changes mid-session
  });

  // Convert response Record<string, T> → Map<string, T> (consumer expectation)
  const topicSummariesMap = useMemo(() => {
    if (!data) return new Map<string, Summary[]>();
    const map = new Map<string, Summary[]>();
    for (const [topicId, summaries] of Object.entries(data.summaries_by_topic)) {
      map.set(topicId, summaries as Summary[]);
    }
    return map;
  }, [data]);

  const topicKeywordCounts = useMemo(() => {
    if (!data) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const [topicId, count] of Object.entries(data.keyword_counts_by_topic)) {
      map.set(topicId, count);
    }
    return map;
  }, [data]);

  return {
    topicSummariesMap,
    topicKeywordCounts,
    isLoading: enabled ? isLoading : false,
    error: error ?? null,
  };
}
