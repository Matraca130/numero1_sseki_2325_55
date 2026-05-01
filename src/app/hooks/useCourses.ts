// ============================================================
// Axon — useCourses
//
// TanStack Query hook that lists active courses for the currently
// selected institution. Reads `public.courses` directly (per SPEC
// §0.1 #2 — courses ARE the M3 subjects source of truth, no new
// table is introduced).
//
// The query key includes `institution_id` so changing institution
// re-runs the fetch automatically. Disabled while no institution
// is selected (e.g. during initial auth bootstrap).
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';

/** Minimal course shape consumed by the M3 subject dropdown. */
export interface CourseOption {
  id: string;
  name: string;
  description: string | null;
}

export function useCourses() {
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id ?? null;

  return useQuery<CourseOption[], Error>({
    queryKey: ['courses', institutionId],
    enabled: Boolean(institutionId),
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, description')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as CourseOption[];
    },
  });
}
