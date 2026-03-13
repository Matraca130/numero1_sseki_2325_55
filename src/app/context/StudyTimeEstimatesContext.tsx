// ============================================================
// Axon — StudyTimeEstimatesContext
// Thin context wrapper around useStudyTimeEstimates hook.
// Provides a single shared instance across the component tree.
// ============================================================
import React, { createContext, useContext, useMemo } from 'react';
import { useStudyTimeEstimates, type UseStudyTimeEstimatesResult } from '@/app/hooks/useStudyTimeEstimates';

const StudyTimeEstimatesCtx = createContext<UseStudyTimeEstimatesResult | null>(null);

export function StudyTimeEstimatesProvider({ children }: { children: React.ReactNode }) {
  const hook = useStudyTimeEstimates();

  const value = useMemo<UseStudyTimeEstimatesResult>(() => hook, [
    hook.methodEstimates,
    hook.getEstimate,
    hook.computeTotalHours,
    hook.computeWeeklyHours,
    hook.overallConfidence,
    hook.hasRealData,
    hook.summary,
    hook.loading,
    hook.error,
  ]);

  return <StudyTimeEstimatesCtx.Provider value={value}>{children}</StudyTimeEstimatesCtx.Provider>;
}

export function useStudyTimeEstimatesContext(): UseStudyTimeEstimatesResult {
  const ctx = useContext(StudyTimeEstimatesCtx);
  if (!ctx) {
    throw new Error('useStudyTimeEstimatesContext must be used within a StudyTimeEstimatesProvider');
  }
  return ctx;
}
