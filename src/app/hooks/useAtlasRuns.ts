// ============================================================
// Axon — useAtlasRuns
//
// Paginated history of Atlas runs from `public.atlas_runs_v1`.
// RLS scopes by user_id automatically; we still pass `.eq('user_id', user.id)`
// for clarity per spec (§2 M4 line 709).
//
// Returns the page of rows + a `hasMore` flag computed by requesting one
// extra row beyond the page boundary.
// ============================================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/lib/supabase';
import type { AtlasRun } from '@/app/types/atlasRuns';

export interface UseAtlasRunsOptions {
  userId: string | undefined;
  page: number;        // 0-indexed
  pageSize: number;    // typically 10
}

export interface UseAtlasRunsResult {
  rows: AtlasRun[];
  hasMore: boolean;
}

export function useAtlasRuns({ userId, page, pageSize }: UseAtlasRunsOptions) {
  return useQuery<UseAtlasRunsResult, Error>({
    queryKey: ['atlas-runs', userId, page, pageSize],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return { rows: [], hasMore: false };
      const from = page * pageSize;
      // Supabase .range(from, to) is INCLUSIVE on both ends. Requesting
      // range(0, pageSize) returns pageSize+1 rows; we render the first
      // pageSize and use the +1 to detect hasMore without a count(*) query.
      const to = from + pageSize;
      const { data, error } = await supabase
        .from('atlas_runs_v1')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      const all = (data as AtlasRun[] | null) ?? [];
      const hasMore = all.length > pageSize;
      return { rows: hasMore ? all.slice(0, pageSize) : all, hasMore };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
