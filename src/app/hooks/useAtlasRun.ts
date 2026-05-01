// ============================================================
// Axon — useAtlasRun
//
// Initial fetch of a single Atlas run from `public.atlas_runs_v1`.
// Used by RunProgress to render before the first Realtime UPDATE arrives.
//
// Spec: SPEC_UI_AXON_M2_M5_PLAN.md §2 M4 (lines 704-713).
// ============================================================
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/lib/supabase';
import type { AtlasRun } from '@/app/types/atlasRuns';

export function useAtlasRun(runId: string | undefined) {
  return useQuery<AtlasRun | null, Error>({
    queryKey: ['atlas-run', runId],
    enabled: Boolean(runId),
    queryFn: async () => {
      if (!runId) return null;
      const { data, error } = await supabase
        .from('atlas_runs_v1')
        .select('*')
        .eq('run_id', runId)
        .maybeSingle();
      if (error) throw error;
      return (data as AtlasRun | null) ?? null;
    },
    // Realtime drives further updates — don't keep refetching.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
