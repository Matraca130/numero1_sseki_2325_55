// ============================================================
// Axon — useKeywordSuggestionsQuery
//
// Fetches keyword suggestions from sibling summaries (same topic)
// for the KeywordConnectionsPanel cross-summary feature.
//
// Strategy: uses EXISTING endpoints only (no new backend needed):
//   1. GET /summaries/:id         → resolve topic_id from current summary
//   2. GET /summaries?topic_id=x  → fetch sibling summaries
//   3. GET /keywords?summary_id=x → fetch keywords per sibling (parallel)
//
// Returns a flat array of keywords from other summaries in the
// same topic, enriched with summary_title for display.
//
// Performance: ~15ms first call (1+1+N parallel fetches), then
// cached for SUGGESTIONS_STALE (5 min). At Axon's scale (~3-5
// summaries per topic), the N parallel fetches are negligible.
//
// GUIDELINES compliance:
//   - React Query v5 (useQuery, NOT useState+useEffect)
//   - Query key from queryKeys.ts factory
//   - Stale time from staleTimes.ts
//   - Uses apiCall() + extractItems() standard helpers
//   - Flat routes with query params
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/app/lib/api';
import { extractItems } from '@/app/lib/api-helpers';
import { queryKeys } from './queryKeys';
import { SUGGESTIONS_STALE } from './staleTimes';
import type { Summary, SummaryKeyword } from '@/app/services/summariesApi';

// ── Types ─────────────────────────────────────────────────

export interface SuggestedKeyword {
  id: string;
  name: string;
  summary_id: string;
  definition: string | null;
  summary_title: string | null;
}

// ── Query function ────────────────────────────────────────

async function fetchKeywordSuggestions(
  summaryId: string,
): Promise<SuggestedKeyword[]> {
  // Step 1: Resolve topic_id from the current summary
  const summary = await apiCall<Summary>(`/summaries/${summaryId}`);
  if (!summary?.topic_id) return [];

  // Step 2: Get all summaries in the same topic
  const siblingResult = await apiCall<unknown>(`/summaries?topic_id=${summary.topic_id}`);
  const siblings = extractItems<Summary>(siblingResult)
    .filter(s => s.id !== summaryId && s.is_active);

  if (siblings.length === 0) return [];

  // Step 3: Fetch keywords from each sibling (parallel)
  const keywordBatches = await Promise.all(
    siblings.map(async (sib) => {
      try {
        const result = await apiCall<unknown>(`/keywords?summary_id=${sib.id}`);
        const keywords = extractItems<SummaryKeyword>(result)
          .filter(k => k.is_active);
        return keywords.map(k => ({
          id: k.id,
          name: k.name,
          summary_id: k.summary_id,
          definition: k.definition,
          summary_title: sib.title,
        }));
      } catch {
        // If one summary's keywords fail, skip it silently
        return [];
      }
    }),
  );

  // Step 4: Flatten and sort alphabetically
  return keywordBatches.flat().sort((a, b) => a.name.localeCompare(b.name));
}

// ── Hook ──────────────────────────────────────────────────

/**
 * Fetches keyword suggestions from sibling summaries in the same topic.
 *
 * @param summaryId  Current summary (its keywords are excluded from results)
 * @param enabled    External control — typically `searchMode && !searchQuery`
 *
 * Returns { data, isLoading, isError } with a flat SuggestedKeyword[].
 * Filtering out already-connected keywords should be done at render time
 * (connections can change while suggestions are cached).
 */
export function useKeywordSuggestionsQuery(
  summaryId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.kwSuggestions(summaryId ?? ''),
    queryFn: () => fetchKeywordSuggestions(summaryId!),
    enabled: !!summaryId && enabled,
    staleTime: SUGGESTIONS_STALE,
    // Don't refetch on window focus — suggestions are background data
    refetchOnWindowFocus: false,
  });
}
