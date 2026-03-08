// ============================================================
// Axon — useTopicProgressQuery
//
// Wraps getTopicProgressRaw() with React Query caching.
// Used by TopicSummariesView (L3) to fetch enriched summaries
// (summary + reading state + flashcard count) in 1 HTTP call.
//
// IMPORTANT: shares cache key ['topic-progress', topicId] with
// useTopicProgressRawQuery. Both hooks use getTopicProgressRaw
// as queryFn (same TopicProgressResponse shape). This hook uses
// `select` to derive EnrichedSummary[] from the cached response.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { getTopicProgressRaw } from '@/app/services/topicProgressApi';
import type { TopicProgressResponse, EnrichedSummary } from '@/app/services/topicProgressApi';

interface UseTopicProgressResult {
  enrichedSummaries: EnrichedSummary[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Transform raw response → EnrichedSummary[] (same logic as getTopicProgress) */
function toEnrichedSummaries(raw: TopicProgressResponse): EnrichedSummary[] {
  return raw.summaries.map((summary) => ({
    summary,
    readingState: raw.reading_states[summary.id] ?? null,
    flashcardCount: raw.flashcard_counts[summary.id] ?? 0,
  }));
}

/**
 * @param topicId - topic UUID to fetch progress for (null = disabled)
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useTopicProgressQuery(
  topicId: string | null,
): UseTopicProgressResult {
  const enabled = !!topicId && UUID_RE.test(topicId);

  const { data, isLoading, error, refetch } = useQuery<TopicProgressResponse, Error, EnrichedSummary[]>({
    queryKey: queryKeys.topicProgress(topicId ?? ''),
    queryFn: () => getTopicProgressRaw(topicId!),
    select: toEnrichedSummaries,
    enabled,
    staleTime: 2 * 60 * 1000, // 2 min — reading states change when student reads
  });

  return {
    enrichedSummaries: data ?? [],
    isLoading: enabled ? isLoading : false,
    error: error ?? null,
    refetch,
  };
}
