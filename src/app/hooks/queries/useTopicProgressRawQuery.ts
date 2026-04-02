// ============================================================
// Axon — useTopicProgressRawQuery
//
// Wraps getTopicProgressRaw() with React Query caching.
// Used by StudentSummariesView (L3-alt) which needs the raw
// TopicProgressResponse (summaries array + reading_states map).
//
// Shares cache key ['topic-progress', topicId] with
// useTopicProgressQuery. Both hooks use getTopicProgressRaw as
// queryFn (same TopicProgressResponse shape in the cache).
// useTopicProgressQuery uses `select` to derive EnrichedSummary[].
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from './queryKeys';
import { getTopicProgressRaw } from '@/app/services/topicProgressApi';
import type { TopicProgressResponse } from '@/app/services/topicProgressApi';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';

interface UseTopicProgressRawResult {
  summaries: Summary[];
  readingStates: Record<string, ReadingState>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * @param topicId - topic UUID (null = disabled)
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useTopicProgressRawQuery(
  topicId: string | null,
): UseTopicProgressRawResult {
  const enabled = !!topicId && UUID_RE.test(topicId);

  const { data, isLoading, error, refetch } = useQuery<TopicProgressResponse>({
    queryKey: queryKeys.topicProgress(topicId ?? ''),
    queryFn: () => getTopicProgressRaw(topicId!),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 min
  });

  // Derive published + sorted summaries (same filter as the old useEffect)
  const summaries = useMemo(() => {
    if (!data) return [];
    return data.summaries
      .filter(s => s.status === 'published' && s.is_active !== false)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [data]);

  const readingStates = useMemo(() => {
    if (!data) return {} as Record<string, ReadingState>;
    return data.reading_states as Record<string, ReadingState>;
  }, [data]);

  return {
    summaries,
    readingStates,
    isLoading: enabled ? isLoading : false,
    error: error ?? null,
    refetch,
  };
}