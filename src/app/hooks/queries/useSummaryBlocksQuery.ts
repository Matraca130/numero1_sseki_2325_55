// ============================================================
// Axon — useSummaryBlocksQuery
//
// Returns the full SummaryBlock[] for a summary, used by
// SummaryViewer to render the visual block layout.
//
// Shares the same cache key as the blocks-detection query in
// useSummaryReaderQueries (which uses `select` to derive a
// boolean). This avoids double-fetching: StudentSummaryReader
// populates the cache, SummaryViewer gets an instant cache hit.
//
// Supports an optional `prefetchedBlocks` prop — when provided,
// the query is disabled and `initialData` seeds the cache.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import * as summariesApi from '@/app/services/summariesApi';
import type { SummaryBlock } from '@/app/services/summariesApi';
import { extractItems } from '@/app/lib/api-helpers';
import { PROFESSOR_CONTENT_STALE } from './staleTimes';

export function useSummaryBlocksQuery(
  summaryId: string,
  prefetchedBlocks?: SummaryBlock[],
) {
  return useQuery({
    queryKey: queryKeys.summaryBlocks(summaryId),
    queryFn: async () => {
      const result = await summariesApi.getSummaryBlocks(summaryId);
      return extractItems<SummaryBlock>(result)
        .filter(b => b.is_active !== false)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    enabled: !!summaryId && !prefetchedBlocks,
    ...(prefetchedBlocks ? { initialData: prefetchedBlocks } : {}),
  });
}