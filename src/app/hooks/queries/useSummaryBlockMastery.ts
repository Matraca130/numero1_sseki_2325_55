// ============================================================
// Axon — useSummaryBlockMastery
//
// React Query hook that fetches per-block mastery levels for a
// given summary.  Returns Record<block_id, mastery_level>.
//
// Endpoint: GET /content/summaries/:id/block-mastery
// Fallback: empty object if the endpoint returns 404.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { apiCall } from '@/app/lib/api';
import { STUDENT_BKT_STALE } from './staleTimes';

// ── Query key ────────────────────────────────────────────────

const summaryBlockMasteryKey = (summaryId: string) =>
  ['summary-block-mastery', summaryId] as const;

// ── Fetcher ──────────────────────────────────────────────────

async function fetchBlockMastery(
  summaryId: string,
): Promise<Record<string, number>> {
  try {
    const res = await apiCall<Record<string, number>>(
      `/content/summaries/${summaryId}/block-mastery`,
    );
    return res ?? {};
  } catch {
    // Fallback: return empty object on 404 or any error
    return {};
  }
}

// ── Hook ─────────────────────────────────────────────────────

export function useSummaryBlockMastery(summaryId: string) {
  return useQuery({
    queryKey: summaryBlockMasteryKey(summaryId),
    queryFn: () => fetchBlockMastery(summaryId),
    enabled: !!summaryId,
    staleTime: STUDENT_BKT_STALE, // 5 min
  });
}
