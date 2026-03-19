// ============================================================
// Axon — StudyPlansContext
// Thin context wrapper around useStudyPlans hook.
// Provides a single shared instance across the component tree.
// Consumes TopicMasteryContext + StudyTimeEstimatesContext
// directly so reschedule data is always available regardless
// of which view the student is on.
// ============================================================
import React, { createContext, useContext, useMemo } from 'react';
import { useStudyPlans, type UseStudyPlansOptions } from '@/app/hooks/useStudyPlans';
import { useTopicMasteryContext } from '@/app/context/TopicMasteryContext';
import { useStudyTimeEstimatesContext } from '@/app/context/StudyTimeEstimatesContext';
import type { StudyPlan } from '@/app/context/AppContext';

interface StudyPlansContextValue {
  plans: StudyPlan[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createPlanFromWizard: (plan: StudyPlan) => Promise<void>;
  toggleTaskComplete: (planId: string, taskId: string) => Promise<void>;
  reorderTasks: (planId: string, orderedIds: string[]) => Promise<void>;
  updatePlanStatus: (planId: string, status: 'active' | 'completed' | 'archived') => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
}

const StudyPlansCtx = createContext<StudyPlansContextValue | null>(null);

export function StudyPlansProvider({ children }: { children: React.ReactNode }) {
  const { topicMastery } = useTopicMasteryContext();
  const { getEstimate } = useStudyTimeEstimatesContext();

  const opts: UseStudyPlansOptions | undefined =
    topicMastery.size > 0
      ? { topicMastery, getTimeEstimate: getEstimate }
      : undefined;

  const hook = useStudyPlans(opts);

  const value = useMemo<StudyPlansContextValue>(() => ({
    plans: hook.plans,
    loading: hook.loading,
    error: hook.error,
    refresh: hook.refresh,
    createPlanFromWizard: hook.createPlanFromWizard,
    toggleTaskComplete: hook.toggleTaskComplete,
    reorderTasks: hook.reorderTasks,
    updatePlanStatus: hook.updatePlanStatus,
    deletePlan: hook.deletePlan,
  }), [hook]);

  return <StudyPlansCtx.Provider value={value}>{children}</StudyPlansCtx.Provider>;
}

export function useStudyPlansContext(): StudyPlansContextValue {
  const ctx = useContext(StudyPlansCtx);
  if (!ctx) {
    throw new Error('useStudyPlansContext must be used within a StudyPlansProvider');
  }
  return ctx;
}
